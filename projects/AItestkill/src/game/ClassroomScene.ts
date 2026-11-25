import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import type { CheaterArchetype, InnocentArchetype, StudentSeatInfo } from '../types/game';
import { createPaperTextureSet, type PaperTextureSet } from './PaperTextures';
import {
  ProctorController,
  type ObstacleBox,
  type RoomBounds,
  type TargetHitResult,
} from './ProctorController';
import { calculateCatchScore, calculateWrongPenalty } from './ScoreCalculator';
import { SensorySystem } from './SensorySystem';
import { StudentController, type StudentRigInput } from './StudentController';

const ROOM_BOUNDS: RoomBounds = {
  minX: -6.5,
  maxX: 6.5,
  minZ: -6.9,
  maxZ: 6.9,
};

const COL_POSITIONS = [-4.4, -2.2, 0.0, 2.2, 4.4];
const ROW_POSITIONS = [-3.8, -2.0, -0.2, 1.6, 3.4, 5.2];
const COL_LETTERS = ['A', 'B', 'C', 'D', 'E'];

const SHIRT_COLORS = [0x2f435a, 0x3b4d3b, 0x52423a, 0x454558, 0x2c353d, 0x4b3b47];
const HAIR_COLORS = [0x1c1917, 0x29201b, 0x3a2b20, 0x17171a];
const SKIN_COLORS = [0xe8c3a5, 0xdfbaa0, 0xf0cfb5];

const ACCUSE_MAX_DISTANCE = 3.6;
const LOCK_REQUIRED_SECONDS = 0.5;

function createSeatTagTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBlackboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1b3d2f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.25)';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2026 제1고사장 부정행위 집중 감독', canvas.width / 2, 108);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '26px sans-serif';
    ctx.fillText('전자기기 및 스마트 안경 소지 금지  |  이상 징후 발견 시 즉시 적발', canvas.width / 2, 178);
    ctx.fillText('좌석 배열: A1 ~ E6 (총 30명 응시)', canvas.width / 2, 232);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class ClassroomScene {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controller: ProctorController;
  private readonly studentController: StudentController;
  private readonly paperTextures: PaperTextureSet;
  private readonly sensorySystem = new SensorySystem();
  private readonly targetHitboxes: THREE.Object3D[] = [];
  private readonly obstacles: ObstacleBox[] = [];
  private readonly spotlightBeam: THREE.SpotLight;
  private readonly tmpVec3 = new THREE.Vector3();

  private readonly clockCanvas: HTMLCanvasElement;
  private readonly clockContext: CanvasRenderingContext2D | null;
  private readonly clockTexture: THREE.CanvasTexture;
  private lastClockSecond = -1;

  private currentTarget: TargetHitResult | null = null;
  private lockedSeatIndex: number | null = null;
  private lockTimerSec = 0;

  private animationFrameId = 0;
  private lastTimestamp = 0;
  private disposed = false;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdbe4ee);
    this.scene.fog = new THREE.Fog(0xdbe4ee, 14, 28);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.08, 60);

    this.spotlightBeam = new THREE.SpotLight(0xe0f2fe, 0, 8.5, Math.PI / 7, 0.35, 1.2);
    const beamTarget = new THREE.Object3D();
    beamTarget.position.set(0, 0, -5);
    this.camera.add(this.spotlightBeam);
    this.camera.add(beamTarget);
    this.spotlightBeam.target = beamTarget;
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.clockCanvas = document.createElement('canvas');
    this.clockCanvas.width = 512;
    this.clockCanvas.height = 192;
    this.clockContext = this.clockCanvas.getContext('2d');
    this.clockTexture = new THREE.CanvasTexture(this.clockCanvas);
    this.clockTexture.colorSpace = THREE.SRGBColorSpace;

    this.buildLighting();
    this.buildRoomShell();
    this.paperTextures = createPaperTextureSet();
    const rigs = this.buildDesksAndStudents();
    this.studentController = new StudentController(rigs, this.paperTextures);
    this.studentController.resetRoster(8);
    this.drawWallClock(useGameStore.getState().remainingSeconds);

    this.controller = new ProctorController({
      camera: this.camera,
      domElement: this.renderer.domElement,
      obstacles: this.obstacles,
      bounds: ROOM_BOUNDS,
      onPointerLockChange: (locked) => {
        useGameStore.getState().setPointerLocked(locked);
      },
      onFocusStateChange: (sight, hearing) => {
        useGameStore.getState().setFocusStates(sight, hearing);
      },
      onToolHotkey: (key) => {
        const current = useGameStore.getState().activeTool;
        if (key === '1') {
          useGameStore.getState().setActiveTool(current === 'rf_detector' ? 'none' : 'rf_detector');
        } else if (key === '2') {
          useGameStore.getState().setActiveTool(current === 'spotlight' ? 'none' : 'spotlight');
        }
      },
      onAccuseKey: () => {
        this.handleAccuse();
      },
      onPrimaryAction: () => {
        this.handlePrimaryAction();
      },
      onOperatorResetKey: () => {
        this.handleOperatorReset();
      },
    });

    window.addEventListener('resize', this.handleResize);
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  startSessionRun(totalCheaters = 8): void {
    this.studentController.resetRoster(totalCheaters);
    this.sensorySystem.reset();
    this.currentTarget = null;
    this.lockedSeatIndex = null;
    this.lockTimerSec = 0;
    this.spotlightBeam.intensity = 0;
    this.controller.resetPosition();
    this.controller.setEnabled(true);
    this.controller.requestLock();
  }

  stopSessionRun(): void {
    this.spotlightBeam.intensity = 0;
    this.lockedSeatIndex = null;
    this.lockTimerSec = 0;
    this.controller.setEnabled(false);
  }

  requestPointerLock(): void {
    this.controller.requestLock();
  }

  getSeatRoster(): StudentSeatInfo[] {
    return this.studentController.getSeatRoster();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.controller.dispose();

    this.paperTextures.dispose();
    this.clockTexture.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private handleOperatorReset(): void {
    this.stopSessionRun();
    this.sensorySystem.reset();
    useGameStore.getState().resetToIdle();
  }

  private handlePrimaryAction(): void {
    const store = useGameStore.getState();
    if (store.phase !== 'playing' || !this.controller.isPointerLocked()) {
      return;
    }
    if (store.activeTool !== 'spotlight') {
      return;
    }

    if (this.sensorySystem.tryFireSpotlight()) {
      this.studentController.triggerSpotlightCone(
        this.camera.position,
        this.controller.getForward3D(this.tmpVec3),
        6.8,
        Math.cos(Math.PI / 7),
      );
    } else {
      store.showFeedback({
        kind: 'info',
        seatLabel: null,
        title: '스팟 라이트 대기 중',
        reason: '배터리 35% 이상 및 쿨타임 종료 후 사용할 수 있습니다.',
        scoreDelta: 0,
      });
    }
  }

  private handleAccuse(): void {
    const store = useGameStore.getState();
    if (store.phase !== 'playing' || !this.controller.isPointerLocked()) {
      return;
    }

    const target = this.currentTarget;
    if (!target) {
      store.showFeedback({
        kind: 'info',
        seatLabel: null,
        title: '조준 대상 없음',
        reason: '적발할 수험생을 조준한 상태에서 우클릭으로 0.5초간 집중 응시하세요.',
        scoreDelta: 0,
      });
      return;
    }

    if (!this.studentController.canAccuseSeat(target.seatIndex)) {
      store.showFeedback({
        kind: 'info',
        seatLabel: target.seatLabel,
        title: '이미 판정된 좌석',
        reason: '이 좌석은 이미 확인이 완료되었습니다.',
        scoreDelta: 0,
      });
      return;
    }

    if (target.distance > ACCUSE_MAX_DISTANCE) {
      store.showFeedback({
        kind: 'info',
        seatLabel: target.seatLabel,
        title: '적발 거리 초과',
        reason: `${ACCUSE_MAX_DISTANCE.toFixed(1)}m 이내로 접근한 뒤 집중 응시로 확인하세요.`,
        scoreDelta: 0,
      });
      return;
    }

    if (!this.controller.isFocusingSight() || this.lockTimerSec < LOCK_REQUIRED_SECONDS) {
      store.showFeedback({
        kind: 'info',
        seatLabel: target.seatLabel,
        title: '집중 응시 확인 필요',
        reason: '마우스 우클릭을 0.5초 유지해 단서를 확정한 뒤 E 키를 누르세요.',
        scoreDelta: 0,
      });
      return;
    }

    const elapsedExamSec = Math.max(0, store.durationSeconds - store.remainingSeconds);
    const judgment = this.studentController.judgeSeat(target.seatIndex, elapsedExamSec);
    if (!judgment) {
      return;
    }

    this.lockedSeatIndex = null;
    this.lockTimerSec = 0;

    if (judgment.isCheater) {
      const nextCombo = store.combo + 1;
      const scored = calculateCatchScore(
        judgment.archetype as CheaterArchetype,
        nextCombo,
        judgment.secondsSinceFirstClue,
      );
      const nextCaught = store.recordCatch({
        seatLabel: judgment.seatLabel,
        archetype: judgment.archetype,
        baseWithCombo: scored.baseWithCombo,
        speedBonus: scored.speedBonus,
        reason: scored.reason,
        elapsedSec: elapsedExamSec,
      });

      if (nextCaught >= store.totalCheaters) {
        this.stopSessionRun();
        store.endRun('all_caught');
      }
      return;
    }

    const wrong = calculateWrongPenalty(judgment.archetype as InnocentArchetype);
    const remainingHearts = store.recordWrongCatch({
      seatLabel: judgment.seatLabel,
      archetype: judgment.archetype,
      penalty: wrong.penalty,
      reason: wrong.reason,
      elapsedSec: elapsedExamSec,
    });

    if (remainingHearts <= 0) {
      this.stopSessionRun();
      store.endRun('out_of_hearts');
    }
  }

  private buildLighting(): void {
    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x94a3b8, 0.95);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.15);
    sun.position.set(-10, 7.5, -1.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.45);
    fillLight.position.set(8, 5, 6);
    this.scene.add(fillLight);
  }

  private buildRoomShell(): void {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xcbc4b5, roughness: 0.85 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xedeae2, roughness: 0.9 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.95 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 15.2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 15.2), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3.6;
    this.scene.add(ceiling);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 3.6), wallMat);
    frontWall.position.set(0, 1.8, -7.6);
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 3.6), wallMat);
    backWall.rotation.y = Math.PI;
    backWall.position.set(0, 1.8, 7.6);
    this.scene.add(backWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 3.6), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(6.8, 1.8, 0);
    this.scene.add(rightWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 3.6), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-6.8, 1.8, 0);
    this.scene.add(leftWall);

    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const windowGlassMat = new THREE.MeshBasicMaterial({ color: 0xdbeafe });
    for (const wz of [-4.2, -1.4, 1.4, 4.2]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 2.1), windowFrameMat);
      frame.position.set(-6.75, 2.0, wz);
      this.scene.add(frame);

      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.4), windowGlassMat);
      pane.rotation.y = Math.PI / 2;
      pane.position.set(-6.7, 2.0, wz);
      this.scene.add(pane);
    }

    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const lx of [-3.2, 0, 3.2]) {
      for (const lz of [-3.6, 0.6, 4.8]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.35), panelMat);
        panel.position.set(lx, 3.57, lz);
        this.scene.add(panel);
      }
    }

    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.9, 1.75, 0.08), trimMat);
    boardFrame.position.set(0, 1.95, -7.54);
    this.scene.add(boardFrame);

    const boardSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(4.7, 1.55),
      new THREE.MeshBasicMaterial({ map: createBlackboardTexture() }),
    );
    boardSurface.position.set(0, 1.95, -7.49);
    this.scene.add(boardSurface);

    const clockBody = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.56, 0.08), trimMat);
    clockBody.position.set(3.55, 2.6, -7.54);
    this.scene.add(clockBody);

    const clockFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.34, 0.46),
      new THREE.MeshBasicMaterial({ map: this.clockTexture }),
    );
    clockFace.position.set(3.55, 2.6, -7.49);
    this.scene.add(clockFace);

    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x7c5838, roughness: 0.72 });
    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.96, 0.7), podiumMat);
    podium.position.set(0, 0.48, -5.85);
    podium.castShadow = true;
    podium.receiveShadow = true;
    this.scene.add(podium);

    this.obstacles.push({
      minX: -0.78,
      maxX: 0.78,
      minZ: -6.24,
      maxZ: -5.46,
    });
  }

  private buildDesksAndStudents(): StudentRigInput[] {
    const deskTopMat = new THREE.MeshStandardMaterial({ color: 0xc29b6c, roughness: 0.65 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.55, metalness: 0.2 });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    const deskTopGeo = new THREE.BoxGeometry(0.88, 0.04, 0.58);
    const legGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04);
    const chairSeatGeo = new THREE.BoxGeometry(0.44, 0.04, 0.42);
    const chairBackGeo = new THREE.BoxGeometry(0.44, 0.42, 0.04);
    const examPaperGeo = new THREE.PlaneGeometry(0.30, 0.40);
    const omrCardGeo = new THREE.PlaneGeometry(0.15, 0.36);
    const hitboxGeo = new THREE.BoxGeometry(0.82, 1.12, 0.92);

    const rigs: StudentRigInput[] = [];
    let seatIndex = 0;

    for (let row = 0; row < ROW_POSITIONS.length; row += 1) {
      for (let col = 0; col < COL_POSITIONS.length; col += 1) {
        const x = COL_POSITIONS[col];
        const z = ROW_POSITIONS[row];
        const seatLabel = `${COL_LETTERS[col]}${row + 1}`;

        const deskGroup = new THREE.Group();
        deskGroup.position.set(x, 0, z);

        const top = new THREE.Mesh(deskTopGeo, deskTopMat);
        top.position.y = 0.74;
        top.castShadow = true;
        top.receiveShadow = true;
        deskGroup.add(top);

        for (const [lx, lz] of [
          [-0.4, -0.25],
          [0.4, -0.25],
          [-0.4, 0.25],
          [0.4, 0.25],
        ]) {
          const leg = new THREE.Mesh(legGeo, metalMat);
          leg.position.set(lx, 0.36, lz);
          leg.castShadow = true;
          deskGroup.add(leg);
        }

        const examPaperMesh = new THREE.Mesh(
          examPaperGeo,
          new THREE.MeshStandardMaterial({
            map: this.paperTextures.problemBlank,
            color: 0xffffff,
            roughness: 0.86,
          }),
        );
        examPaperMesh.rotation.x = -Math.PI / 2;
        examPaperMesh.position.set(0.08, 0.764, 0.03);
        deskGroup.add(examPaperMesh);

        const omrCardMesh = new THREE.Mesh(
          omrCardGeo,
          new THREE.MeshStandardMaterial({
            map: this.paperTextures.omrLevels[0],
            color: 0xffffff,
            roughness: 0.82,
          }),
        );
        omrCardMesh.rotation.x = -Math.PI / 2;
        omrCardMesh.position.set(-0.19, 0.765, 0.04);
        deskGroup.add(omrCardMesh);

        const tag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.16, 0.08),
          new THREE.MeshBasicMaterial({ map: createSeatTagTexture(seatLabel) }),
        );
        tag.rotation.x = -Math.PI / 2;
        tag.position.set(0.33, 0.764, -0.22);
        deskGroup.add(tag);

        const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
        chairSeat.position.set(0, 0.44, 0.44);
        chairSeat.castShadow = true;
        deskGroup.add(chairSeat);

        const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
        chairBack.position.set(0, 0.67, 0.64);
        chairBack.castShadow = true;
        deskGroup.add(chairBack);

        this.scene.add(deskGroup);

        this.obstacles.push({
          minX: x - 0.45,
          maxX: x + 0.45,
          minZ: z - 0.31,
          maxZ: z + 0.68,
        });

        const rig = this.createStudentRig(
          seatIndex,
          seatLabel,
          row,
          col,
          x,
          z,
          deskGroup,
          examPaperMesh,
          omrCardMesh,
          hitboxGeo,
          hitboxMat,
        );
        this.scene.add(rig.root);
        rigs.push(rig);
        this.targetHitboxes.push(rig.hitbox);

        seatIndex += 1;
      }
    }

    return rigs;
  }

  private createStudentRig(
    seatIndex: number,
    seatLabel: string,
    row: number,
    col: number,
    x: number,
    z: number,
    deskGroup: THREE.Group,
    examPaperMesh: THREE.Mesh,
    omrCardMesh: THREE.Mesh,
    hitboxGeo: THREE.BoxGeometry,
    hitboxMat: THREE.MeshBasicMaterial,
  ): StudentRigInput {
    const shirtColor = SHIRT_COLORS[(seatIndex * 5 + col) % SHIRT_COLORS.length];
    const hairColor = HAIR_COLORS[(seatIndex * 3 + row) % HAIR_COLORS.length];
    const skinColor = SKIN_COLORS[seatIndex % SKIN_COLORS.length];

    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const penMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

    const root = new THREE.Group();
    root.position.set(x, 0, z + 0.44);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.24), pantsMat);
    pelvis.position.set(0, 0.52, -0.02);
    root.add(pelvis);

    const upperBodyGroup = new THREE.Group();
    upperBodyGroup.position.set(0, 0.56, 0);
    root.add(upperBodyGroup);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.22), shirtMat);
    torso.position.set(0, 0.26, 0.0);
    torso.castShadow = true;
    upperBodyGroup.add(torso);

    const buttonGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10);
    const buttonMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45 });
    for (const by of [0.33, 0.23]) {
      const btn = new THREE.Mesh(buttonGeo, buttonMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, by, -0.114);
      upperBodyGroup.add(btn);
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.51, -0.01);
    headGroup.rotation.x = 0.26;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skinMat);
    head.position.y = 0.13;
    head.castShadow = true;
    headGroup.add(head);

    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.08, 0.235), hairMat);
    hairTop.position.set(0, 0.24, 0.005);
    headGroup.add(hairTop);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.18, 0.07), hairMat);
    hairBack.position.set(0, 0.15, 0.09);
    headGroup.add(hairBack);

    const eyeGeo = new THREE.BoxGeometry(0.026, 0.022, 0.012);
    for (const ex of [-0.048, 0.048]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 0.145, -0.112);
      headGroup.add(eye);
    }

    upperBodyGroup.add(headGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-0.22, 0.43, -0.02);
    const rightUpper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.09), shirtMat);
    rightUpper.position.set(0, -0.1, -0.12);
    rightUpper.rotation.x = 0.85;
    rightArmGroup.add(rightUpper);
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.08), skinMat);
    rightHand.position.set(0.04, -0.19, -0.28);
    rightArmGroup.add(rightHand);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.005, 0.14, 8), penMat);
    pen.rotation.x = Math.PI / 3;
    pen.position.set(0.04, -0.17, -0.32);
    rightArmGroup.add(pen);
    upperBodyGroup.add(rightArmGroup);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(0.22, 0.43, -0.02);
    const leftUpper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.09), shirtMat);
    leftUpper.position.set(0, -0.1, -0.12);
    leftUpper.rotation.x = 0.85;
    leftArmGroup.add(leftUpper);
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.08), skinMat);
    leftHand.position.set(-0.04, -0.19, -0.27);
    leftArmGroup.add(leftHand);
    upperBodyGroup.add(leftArmGroup);

    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitbox.position.set(0, 0.88, -0.20);
    hitbox.userData.seatIndex = seatIndex;
    hitbox.userData.seatLabel = seatLabel;
    root.add(hitbox);

    return {
      seatIndex,
      seatLabel,
      row,
      col,
      root,
      upperBodyGroup,
      deskGroup,
      examPaperMesh,
      omrCardMesh,
      headGroup,
      rightArmGroup,
      leftArmGroup,
      hitbox,
      phaseOffset: seatIndex * 0.73,
    };
  }

  private drawWallClock(remainingSeconds: number): void {
    const totalSec = Math.max(0, Math.ceil(remainingSeconds));
    if (totalSec === this.lastClockSecond || !this.clockContext) {
      return;
    }
    this.lastClockSecond = totalSec;

    const minutes = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const seconds = String(totalSec % 60).padStart(2, '0');

    const ctx = this.clockContext;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.clockCanvas.width, this.clockCanvas.height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, this.clockCanvas.width - 8, this.clockCanvas.height - 8);

    ctx.fillStyle = totalSec <= 30 ? '#f87171' : '#38bdf8';
    ctx.font = 'bold 104px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${minutes}:${seconds}`, this.clockCanvas.width / 2, this.clockCanvas.height / 2 + 4);

    this.clockTexture.needsUpdate = true;
  }

  private readonly handleResize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private readonly loop = (timestamp: number): void => {
    if (this.disposed) {
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;

    const store = useGameStore.getState();
    if (store.phase === 'playing') {
      const nextRemaining = Math.max(0, store.remainingSeconds - dt);
      store.setRemainingSeconds(nextRemaining);
      this.drawWallClock(nextRemaining);
      if (nextRemaining <= 0) {
        this.stopSessionRun();
        store.endRun('time_up');
        this.renderer.render(this.scene, this.camera);
        this.animationFrameId = requestAnimationFrame(this.loop);
        return;
      }

      const elapsedExamSec = Math.max(0, store.durationSeconds - nextRemaining);
      this.studentController.update(
        dt,
        elapsedExamSec,
        this.camera.position,
        this.controller.isSprinting(),
        this.controller.isFocusingSight(),
        true,
      );

      const sensoryResult = this.sensorySystem.update({
        dt,
        proctorPos: this.camera.position,
        forwardXZ: this.controller.getForwardXZ(),
        rightXZ: this.controller.getRightXZ(),
        isFocusingHearing: this.controller.isFocusingHearing(),
        activeTool: store.activeTool,
        soundSources: this.studentController.getSoundSources(),
        rfSources: this.studentController.getRfSources(),
      });
      store.setSensory(sensoryResult.state);
      if (sensoryResult.rfDepleted) {
        store.setActiveTool('none');
        store.showFeedback({
          kind: 'info',
          seatLabel: null,
          title: '전파 감지기 배터리 소진',
          reason: '장비를 해제하면 배터리가 자동으로 충전됩니다.',
          scoreDelta: 0,
        });
      }

      this.spotlightBeam.intensity = this.sensorySystem.isBeamActive() ? 5.5 : 0;

      const target = this.controller.update(dt, this.targetHitboxes);
      this.currentTarget = target;

      if (
        target &&
        target.distance <= ACCUSE_MAX_DISTANCE &&
        this.studentController.canAccuseSeat(target.seatIndex) &&
        this.controller.isFocusingSight()
      ) {
        if (this.lockedSeatIndex !== target.seatIndex) {
          this.lockedSeatIndex = target.seatIndex;
          this.lockTimerSec = 0;
        }
        this.lockTimerSec = Math.min(LOCK_REQUIRED_SECONDS, this.lockTimerSec + dt);
      } else {
        this.lockedSeatIndex = null;
        this.lockTimerSec = 0;
      }

      store.setTargetLock(
        target?.seatLabel ?? null,
        target?.distance ?? null,
        this.lockTimerSec / LOCK_REQUIRED_SECONDS,
        this.lockTimerSec >= LOCK_REQUIRED_SECONDS,
      );
    } else {
      this.drawWallClock(store.remainingSeconds);
      this.studentController.update(
        dt,
        timestamp / 1000,
        this.camera.position,
        false,
        false,
        false,
      );
      this.controller.update(dt, this.targetHitboxes);
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
