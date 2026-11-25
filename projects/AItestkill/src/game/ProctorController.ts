import * as THREE from 'three';

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface TargetHitResult {
  seatIndex: number;
  seatLabel: string;
  distance: number;
}

const EYE_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.24;
const NORMAL_FOV = 65;
const FOCUS_FOV = 25;
const BASE_WALK_SPEED = 2.95;
const SPRINT_MULTIPLIER = 1.5;
const LISTEN_MULTIPLIER = 0.55;
const MOUSE_SENSITIVITY = 0.0021;
const MAX_PITCH = 1.15;

export class ProctorController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement;
  private readonly raycaster = new THREE.Raycaster();
  private readonly centerNdc = new THREE.Vector2(0, 0);
  private readonly keys = new Set<string>();
  private readonly obstacles: ObstacleBox[];
  private readonly bounds: RoomBounds;

  private yaw = Math.PI;
  private pitch = -0.14;
  private enabled = false;
  private focusSight = false;
  private focusHearing = false;
  private pointerLocked = false;

  private onPointerLockChangeCallback?: (locked: boolean) => void;
  private onFocusStateChangeCallback?: (sight: boolean, hearing: boolean) => void;
  private onToolHotkeyCallback?: (key: '1' | '2') => void;
  private onAccuseKeyCallback?: () => void;
  private onPrimaryActionCallback?: () => void;
  private onOperatorResetKeyCallback?: () => void;

  constructor(options: {
    camera: THREE.PerspectiveCamera;
    domElement: HTMLElement;
    obstacles: ObstacleBox[];
    bounds: RoomBounds;
    onPointerLockChange?: (locked: boolean) => void;
    onFocusStateChange?: (sight: boolean, hearing: boolean) => void;
    onToolHotkey?: (key: '1' | '2') => void;
    onAccuseKey?: () => void;
    onPrimaryAction?: () => void;
    onOperatorResetKey?: () => void;
  }) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.obstacles = options.obstacles;
    this.bounds = options.bounds;
    this.onPointerLockChangeCallback = options.onPointerLockChange;
    this.onFocusStateChangeCallback = options.onFocusStateChange;
    this.onToolHotkeyCallback = options.onToolHotkey;
    this.onAccuseKeyCallback = options.onAccuseKey;
    this.onPrimaryActionCallback = options.onPrimaryAction;
    this.onOperatorResetKeyCallback = options.onOperatorResetKey;

    this.camera.rotation.order = 'YXZ';
    this.resetPosition();
    this.attachEvents();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.setFocusStates(false, false);
      if (document.pointerLockElement === this.domElement) {
        document.exitPointerLock();
      }
    }
  }

  resetPosition(): void {
    this.camera.position.set(-1.1, EYE_HEIGHT, -5.35);
    this.yaw = Math.PI;
    this.pitch = -0.14;
    this.camera.fov = NORMAL_FOV;
    this.camera.updateProjectionMatrix();
    this.syncCameraRotation();
  }

  requestLock(): void {
    if (!this.enabled) {
      return;
    }
    try {
      const maybePromise = this.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
      }
    } catch {
      // Ignore user-cancelled pointer lock attempts.
    }
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  isSprinting(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  isFocusingSight(): boolean {
    return this.focusSight;
  }

  isFocusingHearing(): boolean {
    return this.focusHearing;
  }

  getForwardXZ(): { x: number; z: number } {
    return {
      x: -Math.sin(this.yaw),
      z: -Math.cos(this.yaw),
    };
  }

  getRightXZ(): { x: number; z: number } {
    return {
      x: Math.cos(this.yaw),
      z: -Math.sin(this.yaw),
    };
  }

  getForward3D(target: THREE.Vector3): THREE.Vector3 {
    return this.camera.getWorldDirection(target);
  }

  update(dt: number, targetMeshes: THREE.Object3D[]): TargetHitResult | null {
    const targetFov = this.focusSight ? FOCUS_FOV : NORMAL_FOV;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 12));
      this.camera.updateProjectionMatrix();
    }

    if (this.enabled && this.pointerLocked) {
      this.movePlayer(dt);
    }

    this.raycaster.setFromCamera(this.centerNdc, this.camera);
    this.raycaster.far = 9.0;
    const hits = this.raycaster.intersectObjects(targetMeshes, false);
    if (hits.length === 0) {
      return null;
    }

    const hit = hits[0];
    const seatIndex = hit.object.userData.seatIndex;
    const seatLabel = hit.object.userData.seatLabel;
    if (typeof seatIndex !== 'number' || typeof seatLabel !== 'string') {
      return null;
    }

    return {
      seatIndex,
      seatLabel,
      distance: hit.distance,
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.domElement.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private movePlayer(dt: number): void {
    let forwardInput = 0;
    let strafeInput = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forwardInput += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forwardInput -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafeInput += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafeInput -= 1;

    if (forwardInput === 0 && strafeInput === 0) {
      return;
    }

    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let moveX = forwardX * forwardInput + rightX * strafeInput;
    let moveZ = forwardZ * forwardInput + rightZ * strafeInput;
    const length = Math.hypot(moveX, moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    let speed = BASE_WALK_SPEED;
    if (this.focusHearing) {
      speed *= LISTEN_MULTIPLIER;
    } else if (this.isSprinting()) {
      speed *= SPRINT_MULTIPLIER;
    }

    const nextX = this.clampX(this.camera.position.x + moveX * speed * dt);
    if (!this.collides(nextX, this.camera.position.z)) {
      this.camera.position.x = nextX;
    }

    const nextZ = this.clampZ(this.camera.position.z + moveZ * speed * dt);
    if (!this.collides(this.camera.position.x, nextZ)) {
      this.camera.position.z = nextZ;
    }
  }

  private clampX(x: number): number {
    return Math.min(this.bounds.maxX - PLAYER_RADIUS, Math.max(this.bounds.minX + PLAYER_RADIUS, x));
  }

  private clampZ(z: number): number {
    return Math.min(this.bounds.maxZ - PLAYER_RADIUS, Math.max(this.bounds.minZ + PLAYER_RADIUS, z));
  }

  private collides(x: number, z: number): boolean {
    for (const box of this.obstacles) {
      if (
        x + PLAYER_RADIUS > box.minX &&
        x - PLAYER_RADIUS < box.maxX &&
        z + PLAYER_RADIUS > box.minZ &&
        z - PLAYER_RADIUS < box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  private syncCameraRotation(): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private setFocusStates(sight: boolean, hearing: boolean): void {
    if (this.focusSight === sight && this.focusHearing === hearing) {
      return;
    }
    this.focusSight = sight;
    this.focusHearing = hearing;
    this.onFocusStateChangeCallback?.(sight, hearing);
  }

  private attachEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this.handleMouseMove);
    this.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.domElement.addEventListener('contextmenu', this.handleContextMenu);
  }

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly handlePointerLockChange = (): void => {
    const locked = document.pointerLockElement === this.domElement;
    this.pointerLocked = locked;
    if (!locked) {
      this.keys.clear();
      this.setFocusStates(false, false);
    }
    this.onPointerLockChangeCallback?.(locked);
  };

  private readonly handleWindowBlur = (): void => {
    this.keys.clear();
    this.setFocusStates(false, false);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || !this.pointerLocked) {
      return;
    }
    const factor = this.focusSight ? MOUSE_SENSITIVITY * 0.55 : MOUSE_SENSITIVITY;
    this.yaw -= event.movementX * factor;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - event.movementY * factor,
      -MAX_PITCH,
      MAX_PITCH,
    );
    this.syncCameraRotation();
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (!this.enabled) {
      return;
    }
    if (!this.pointerLocked) {
      this.requestLock();
      return;
    }
    if (event.button === 2) {
      this.setFocusStates(true, this.focusHearing);
    } else if (event.button === 0) {
      this.onPrimaryActionCallback?.();
    }
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (event.button === 2) {
      this.setFocusStates(false, this.focusHearing);
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat && event.code === 'F9') {
      event.preventDefault();
      this.onOperatorResetKeyCallback?.();
      return;
    }

    if (!this.enabled) {
      return;
    }

    if (event.code === 'Space') {
      if (this.pointerLocked) {
        event.preventDefault();
      }
      this.setFocusStates(this.focusSight, true);
    }

    if (!event.repeat) {
      if (event.code === 'Digit1') {
        this.onToolHotkeyCallback?.('1');
      } else if (event.code === 'Digit2') {
        this.onToolHotkeyCallback?.('2');
      } else if (event.code === 'KeyE') {
        this.onAccuseKeyCallback?.();
      }
    }

    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    if (event.code === 'Space') {
      this.setFocusStates(this.focusSight, false);
    }
  };
}
