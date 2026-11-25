import * as THREE from 'three';
import type {
  CheaterArchetype,
  InnocentArchetype,
  StudentArchetype,
  StudentBehaviorState,
  StudentSeatInfo,
} from '../types/game';
import type { PaperTextureSet } from './PaperTextures';

export interface StudentRigInput {
  seatIndex: number;
  seatLabel: string;
  row: number;
  col: number;
  root: THREE.Group;
  upperBodyGroup: THREE.Group;
  deskGroup: THREE.Group;
  examPaperMesh: THREE.Mesh;
  omrCardMesh: THREE.Mesh;
  headGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  hitbox: THREE.Mesh;
  phaseOffset: number;
}

export interface SoundSourceInfo {
  position: THREE.Vector3;
  amplitude: number;
  kind: 'electronic' | 'organic';
}

export interface RfSourceInfo {
  position: THREE.Vector3;
  strength: number;
}

export interface SeatJudgmentInfo {
  isCheater: boolean;
  archetype: StudentArchetype;
  seatLabel: string;
  secondsSinceFirstClue: number | null;
}

export interface DebugStudentSnapshot {
  seatIndex: number;
  seatLabel: string;
  isCheater: boolean;
  archetype: StudentArchetype;
  state: StudentBehaviorState;
  omrLevel: number;
  problemSheetKind: 'blank' | 'sparse' | 'solved';
}

interface ManagedStudent extends StudentRigInput {
  seatInfo: StudentSeatInfo;
  state: StudentBehaviorState;
  stateTimer: number;
  cooldownTimer: number;
  firstClueTimeSec: number | null;
  proctorFrontExposureSec: number;
  glintTimer: number;
  dullReflectTimer: number;
  alreadyJudged: boolean;
  omrLevel: number;
  nextInnocentOmrSec: number;
  problemSheetKind: 'blank' | 'sparse' | 'solved';
  swappedIntoSmartGlasses: boolean;
  swappedOutSmartOnDesk: boolean;
  worldPos: THREE.Vector3;

  ledGlassesGroup: THREE.Group;
  whiteLedMesh: THREE.Mesh;
  whiteLedMat: THREE.MeshBasicMaterial;
  whiteLedHaloMesh: THREE.Mesh;
  whiteLedHaloMat: THREE.MeshBasicMaterial;

  swapSmartGlassesGroup: THREE.Group;
  hudGlowMesh: THREE.Mesh;
  hudGlowMat: THREE.MeshBasicMaterial;
  regularGlassesGroup: THREE.Group;
  metalGlassesGroup: THREE.Group;
  wristWatchMesh: THREE.Mesh;

  spareThinGlassesOnDesk: THREE.Group;
  spareSmartGlassesOnDesk: THREE.Group;

  cameraButtonMesh: THREE.Mesh;
  mouthMesh: THREE.Mesh;
  scannerPenMesh: THREE.Mesh;
  scanLineMesh: THREE.Mesh;
  pinholeGlintMesh: THREE.Mesh;
  dullReflectMesh: THREE.Mesh;
  deskCardMesh: THREE.Mesh;
  deskCardMat: THREE.MeshBasicMaterial;
}

const CHEATER_POOL: CheaterArchetype[] = [
  'led_camera_earpiece',
  'glasses_swapper',
  'button_camera_underdesk',
  'pen_scanner_camera',
];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createGlassesMeshGroup(color: number, thickFrame: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: thickFrame ? 0.35 : 0.45,
    metalness: color > 0x808080 ? 0.6 : 0.1,
  });

  const rimThickness = thickFrame ? 0.017 : 0.01;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.036, rimThickness, 0.014), mat);
  bridge.position.set(0, 0.148, -0.121);
  group.add(bridge);

  const rimWidth = 0.072;
  const rimHeight = 0.044;
  for (const gx of [-0.054, 0.054]) {
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(rimWidth, rimThickness, 0.014), mat);
    topBar.position.set(gx, 0.166, -0.121);
    group.add(topBar);

    const botBar = new THREE.Mesh(new THREE.BoxGeometry(rimWidth, rimThickness, 0.014), mat);
    botBar.position.set(gx, 0.127, -0.121);
    group.add(botBar);

    const sideSign = gx < 0 ? -1 : 1;
    const outerBar = new THREE.Mesh(new THREE.BoxGeometry(rimThickness, rimHeight, 0.014), mat);
    outerBar.position.set(gx + sideSign * (rimWidth / 2 - 0.005), 0.146, -0.121);
    group.add(outerBar);

    const temple = new THREE.Mesh(
      new THREE.BoxGeometry(thickFrame ? 0.018 : 0.009, thickFrame ? 0.028 : 0.012, 0.135),
      mat,
    );
    temple.position.set(gx + sideSign * 0.04, 0.15, -0.055);
    group.add(temple);
  }

  return group;
}

function createDeskGlassesProp(color: number, thickFrame: boolean): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: thickFrame ? 0.35 : 0.5,
  });
  const rimThickness = thickFrame ? 0.014 : 0.008;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.11, rimThickness, 0.016), mat);
  group.add(bridge);

  for (const sx of [-0.05, 0.05]) {
    const temple = new THREE.Mesh(
      new THREE.BoxGeometry(thickFrame ? 0.015 : 0.009, rimThickness, 0.11),
      mat,
    );
    temple.position.set(sx, 0, 0.055);
    group.add(temple);
  }

  return group;
}

function isCheaterActiveState(state: StudentBehaviorState): boolean {
  return (
    state === 'cheat_capture' ||
    state === 'cheat_receive' ||
    state === 'cheat_mark'
  );
}

export class StudentController {
  private readonly students: ManagedStudent[] = [];
  private readonly paperTextures: PaperTextureSet;

  constructor(rigs: StudentRigInput[], paperTextures: PaperTextureSet) {
    this.paperTextures = paperTextures;
    for (const rig of rigs) {
      this.students.push(this.decorateRig(rig));
    }
  }

  resetRoster(totalCheaters = 8): void {
    const count = Math.min(this.students.length, Math.max(1, totalCheaters));
    const indices = shuffleArray(this.students.map((_, index) => index));
    const cheaterIndices = indices.slice(0, count);
    const innocentIndices = indices.slice(count);
    const cheaterSet = new Set(cheaterIndices);

    const cheaterTypes: CheaterArchetype[] = [];
    for (let i = 0; i < count; i += 1) {
      cheaterTypes.push(CHEATER_POOL[i % CHEATER_POOL.length]);
    }
    const shuffledCheaterTypes = shuffleArray(cheaterTypes);

    const innocentRoles: InnocentArchetype[] = [];
    const trapPool: InnocentArchetype[] = [
      'regular_glasses',
      'regular_glasses',
      'nervous_clicker',
      'nervous_clicker',
      'metal_accessory',
      'metal_accessory',
      'mental_solver',
    ];
    for (let i = 0; i < innocentIndices.length; i += 1) {
      innocentRoles.push(i < trapPool.length ? trapPool[i] : 'focused_writer');
    }
    const shuffledInnocentRoles = shuffleArray(innocentRoles);

    let cheaterCursor = 0;
    let innocentCursor = 0;
    const immediateSet = new Set(shuffleArray(cheaterIndices).slice(0, Math.min(2, count)));

    for (let i = 0; i < this.students.length; i += 1) {
      const student = this.students[i];
      const isCheater = cheaterSet.has(i);
      const archetype: StudentArchetype = isCheater
        ? shuffledCheaterTypes[cheaterCursor++]
        : shuffledInnocentRoles[innocentCursor++];

      student.seatInfo = {
        seatIndex: student.seatIndex,
        seatLabel: student.seatLabel,
        row: student.row,
        col: student.col,
        isCheater,
        archetype,
        caught: false,
      };
      student.state = 'idle_writing';
      student.stateTimer = 0;
      student.cooldownTimer = isCheater
        ? immediateSet.has(i)
          ? 0.8 + Math.random() * 1.0
          : 3.5 + Math.random() * 5.0
        : 3.0 + Math.random() * 7.0;
      student.firstClueTimeSec = null;
      student.proctorFrontExposureSec = 0;
      student.glintTimer = 0;
      student.dullReflectTimer = 0;
      student.alreadyJudged = false;
      student.omrLevel = 0;
      student.nextInnocentOmrSec = 38 + Math.random() * 20;
      student.swappedIntoSmartGlasses = false;
      student.swappedOutSmartOnDesk = false;
      student.root.visible = true;
      student.deskCardMesh.visible = false;

      if (isCheater) {
        student.problemSheetKind = 'blank';
        this.setExamPaperTexture(student, this.paperTextures.problemBlank);
      } else if (archetype === 'mental_solver') {
        student.problemSheetKind = 'sparse';
        this.setExamPaperTexture(student, this.paperTextures.problemSparse);
      } else {
        student.problemSheetKind = 'solved';
        this.setExamPaperTexture(
          student,
          this.paperTextures.problemSolved[i % this.paperTextures.problemSolved.length],
        );
      }
      this.setOmrLevel(student, 0);

      this.configureArchetypeVisuals(student);
    }
  }

  getSeatRoster(): StudentSeatInfo[] {
    return this.students.map((s) => ({ ...s.seatInfo }));
  }

  getDebugStudentStates(): DebugStudentSnapshot[] {
    return this.students.map((s) => ({
      seatIndex: s.seatIndex,
      seatLabel: s.seatLabel,
      isCheater: s.seatInfo.isCheater,
      archetype: s.seatInfo.archetype,
      state: s.state,
      omrLevel: s.omrLevel,
      problemSheetKind: s.problemSheetKind,
    }));
  }

  getSeatInfo(seatIndex: number): StudentSeatInfo | null {
    const student = this.students[seatIndex];
    return student ? { ...student.seatInfo } : null;
  }

  canAccuseSeat(seatIndex: number): boolean {
    const student = this.students[seatIndex];
    if (!student) {
      return false;
    }
    return !student.seatInfo.caught && !student.alreadyJudged;
  }

  judgeSeat(seatIndex: number, elapsedExamSec: number): SeatJudgmentInfo | null {
    const student = this.students[seatIndex];
    if (!student || student.seatInfo.caught || student.alreadyJudged) {
      return null;
    }

    if (student.seatInfo.isCheater) {
      student.seatInfo.caught = true;
      student.state = 'caught_removed';
      student.root.visible = false;
      student.deskCardMat.color.setHex(0xdc2626);
      student.deskCardMesh.visible = true;

      return {
        isCheater: true,
        archetype: student.seatInfo.archetype,
        seatLabel: student.seatLabel,
        secondsSinceFirstClue:
          student.firstClueTimeSec === null
            ? null
            : Math.max(0, elapsedExamSec - student.firstClueTimeSec),
      };
    }

    student.alreadyJudged = true;
    student.deskCardMat.color.setHex(0xd97706);
    student.deskCardMesh.visible = true;

    return {
      isCheater: false,
      archetype: student.seatInfo.archetype,
      seatLabel: student.seatLabel,
      secondsSinceFirstClue: null,
    };
  }

  update(
    dt: number,
    elapsedExamSec: number,
    proctorPos: THREE.Vector3,
    proctorSprinting: boolean,
    isFocusingSight: boolean,
    isPlaying: boolean,
  ): void {
    let activeCheaterCount = 0;
    let activeTrapCount = 0;
    for (const s of this.students) {
      if (isCheaterActiveState(s.state)) {
        activeCheaterCount += 1;
      } else if (s.state === 'trap_acting') {
        activeTrapCount += 1;
      }
    }

    for (const s of this.students) {
      if (s.state === 'caught_removed') {
        continue;
      }

      if (s.glintTimer > 0) {
        s.glintTimer = Math.max(0, s.glintTimer - dt);
      }
      if (s.dullReflectTimer > 0) {
        s.dullReflectTimer = Math.max(0, s.dullReflectTimer - dt);
      }

      if (isPlaying) {
        if (s.seatInfo.isCheater) {
          activeCheaterCount = this.stepCheaterState(
            s,
            dt,
            elapsedExamSec,
            proctorPos,
            proctorSprinting,
            activeCheaterCount,
          );
        } else {
          if (s.omrLevel < 4 && elapsedExamSec >= s.nextInnocentOmrSec) {
            this.setOmrLevel(s, s.omrLevel + 1);
            s.nextInnocentOmrSec += 45 + Math.random() * 15;
          }
          activeTrapCount = this.stepInnocentState(s, dt, activeTrapCount);
        }
      }

      this.applyStudentAnimation(s, elapsedExamSec, proctorPos, isFocusingSight);
    }
  }

  getSoundSources(): SoundSourceInfo[] {
    const sources: SoundSourceInfo[] = [];
    for (const s of this.students) {
      if (s.state === 'caught_removed') {
        continue;
      }
      const arch = s.seatInfo.archetype;
      if (s.state === 'cheat_receive') {
        if (arch === 'led_camera_earpiece') {
          sources.push({ position: s.worldPos, amplitude: 0.82, kind: 'electronic' });
        } else if (arch === 'button_camera_underdesk') {
          sources.push({ position: s.worldPos, amplitude: 0.78, kind: 'organic' });
        } else if (arch === 'glasses_swapper') {
          sources.push({ position: s.worldPos, amplitude: 0.34, kind: 'electronic' });
        } else if (arch === 'pen_scanner_camera') {
          sources.push({ position: s.worldPos, amplitude: 0.45, kind: 'electronic' });
        }
      } else if (s.state === 'cheat_capture' && arch === 'pen_scanner_camera') {
        sources.push({ position: s.worldPos, amplitude: 0.66, kind: 'electronic' });
      } else if (s.state === 'trap_acting' && arch === 'nervous_clicker') {
        sources.push({ position: s.worldPos, amplitude: 0.85, kind: 'organic' });
      }
    }
    return sources;
  }

  getRfSources(): RfSourceInfo[] {
    const sources: RfSourceInfo[] = [];
    for (const s of this.students) {
      if (!s.seatInfo.isCheater || !isCheaterActiveState(s.state)) {
        continue;
      }
      let strength = 1.0;
      if (s.seatInfo.archetype === 'led_camera_earpiece') strength = 1.65;
      else if (s.seatInfo.archetype === 'glasses_swapper') strength = 1.45;
      else if (s.seatInfo.archetype === 'button_camera_underdesk') strength = 1.25;
      else if (s.seatInfo.archetype === 'pen_scanner_camera') strength = 0.95;
      sources.push({ position: s.worldPos, strength });
    }
    return sources;
  }

  triggerSpotlightCone(
    origin: THREE.Vector3,
    forwardDir: THREE.Vector3,
    maxDist: number,
    cosHalfAngle: number,
  ): void {
    const toStudent = new THREE.Vector3();
    for (const s of this.students) {
      if (s.state === 'caught_removed') {
        continue;
      }
      toStudent.subVectors(s.worldPos, origin);
      const dist = toStudent.length();
      if (dist > maxDist || dist < 0.35) {
        continue;
      }
      toStudent.divideScalar(dist);
      if (toStudent.dot(forwardDir) < cosHalfAngle) {
        continue;
      }

      const arch = s.seatInfo.archetype;
      if (
        arch === 'led_camera_earpiece' ||
        arch === 'button_camera_underdesk' ||
        arch === 'pen_scanner_camera'
      ) {
        s.glintTimer = 0.44;
      } else if (
        arch === 'glasses_swapper' ||
        arch === 'metal_accessory' ||
        arch === 'regular_glasses'
      ) {
        s.dullReflectTimer = 0.36;
      }

      if (s.seatInfo.isCheater && isCheaterActiveState(s.state) && dist < 3.4) {
        s.proctorFrontExposureSec += 0.9;
      }
    }
  }

  private stepCheaterState(
    s: ManagedStudent,
    dt: number,
    elapsedExamSec: number,
    proctorPos: THREE.Vector3,
    proctorSprinting: boolean,
    activeCheaterCount: number,
  ): number {
    const dx = proctorPos.x - s.worldPos.x;
    const dz = proctorPos.z - s.worldPos.z;
    const dist = Math.hypot(dx, dz);

    if (s.state === 'cheat_capture' || s.state === 'cheat_receive') {
      const inFront = dz < -0.15;
      if ((proctorSprinting && dist < 3.2) || (inFront && dist < 2.2)) {
        s.proctorFrontExposureSec += dt;
      } else {
        s.proctorFrontExposureSec = Math.max(0, s.proctorFrontExposureSec - dt * 0.7);
      }

      if (
        s.proctorFrontExposureSec >= 1.55 ||
        (proctorSprinting && dist < 2.8 && s.proctorFrontExposureSec >= 0.35)
      ) {
        s.state = 'alert_flinch';
        s.stateTimer = 1.2;
        s.proctorFrontExposureSec = 0;
        if (s.seatInfo.archetype === 'glasses_swapper' && s.swappedIntoSmartGlasses) {
          s.swappedIntoSmartGlasses = false;
          s.swappedOutSmartOnDesk = true;
          this.syncSwapperGlasses(s);
        }
        return Math.max(0, activeCheaterCount - 1);
      }
    }

    if (s.state === 'cheat_capture') {
      s.stateTimer -= dt;
      if (s.stateTimer <= 0) {
        s.state = 'cheat_receive';
        s.stateTimer = 3.0;
      }
      return activeCheaterCount;
    }

    if (s.state === 'cheat_receive') {
      s.stateTimer -= dt;
      if (s.stateTimer <= 0) {
        s.state = 'cheat_mark';
        s.stateTimer = 2.6;
      }
      return activeCheaterCount;
    }

    if (s.state === 'cheat_mark') {
      s.stateTimer -= dt;
      if (s.stateTimer <= 0) {
        this.setOmrLevel(s, Math.min(4, s.omrLevel + 1));
        s.state = 'idle_writing';
        s.cooldownTimer = 5.2 + Math.random() * 1.8;
        s.proctorFrontExposureSec = 0;
        return Math.max(0, activeCheaterCount - 1);
      }
      return activeCheaterCount;
    }

    if (s.state === 'alert_flinch') {
      s.stateTimer -= dt;
      if (s.stateTimer <= 0) {
        s.state = 'alert_hiding';
        s.stateTimer = 3.2;
      }
      return activeCheaterCount;
    }

    if (s.state === 'alert_hiding') {
      s.stateTimer -= dt;
      if (s.stateTimer <= 0) {
        s.state = 'idle_writing';
        s.cooldownTimer = 3.5 + Math.random() * 1.5;
      }
      return activeCheaterCount;
    }

    s.cooldownTimer -= dt;
    if (s.cooldownTimer <= 0) {
      if (activeCheaterCount < 3) {
        s.state = 'cheat_capture';
        s.stateTimer = 2.6;
        s.proctorFrontExposureSec = 0;
        if (s.firstClueTimeSec === null) {
          s.firstClueTimeSec = elapsedExamSec;
        }
        if (s.seatInfo.archetype === 'glasses_swapper') {
          s.swappedIntoSmartGlasses = true;
          s.swappedOutSmartOnDesk = false;
          this.syncSwapperGlasses(s);
        }
        return activeCheaterCount + 1;
      }
      s.cooldownTimer = 1.2 + Math.random() * 1.6;
    }
    return activeCheaterCount;
  }

  private stepInnocentState(
    s: ManagedStudent,
    dt: number,
    activeTrapCount: number,
  ): number {
    if (s.seatInfo.archetype === 'focused_writer') {
      return activeTrapCount;
    }

    if (s.state === 'trap_acting') {
      s.stateTimer -= dt;
      if (s.stateTimer <= 0) {
        s.state = 'idle_writing';
        s.cooldownTimer = 7.5 + Math.random() * 5.0;
        return Math.max(0, activeTrapCount - 1);
      }
      return activeTrapCount;
    }

    s.cooldownTimer -= dt;
    if (s.cooldownTimer <= 0) {
      if (activeTrapCount < 2) {
        s.state = 'trap_acting';
        s.stateTimer = 4.2 + Math.random() * 1.6;
        return activeTrapCount + 1;
      }
      s.cooldownTimer = 2.0 + Math.random() * 2.5;
    }
    return activeTrapCount;
  }

  private applyStudentAnimation(
    s: ManagedStudent,
    elapsed: number,
    proctorPos: THREE.Vector3,
    isFocusingSight: boolean,
  ): void {
    const t = elapsed + s.phaseOffset;
    const dist = s.worldPos.distanceTo(proctorPos);

    let upperBodyX = -0.16;
    let upperBodyY = 0;
    let headX = -0.26 + Math.sin(t * 1.2) * 0.02;
    let headY = 0;
    let headZ = 0;
    let rightArmX = Math.cos(t * 3.4) * 0.03;
    let rightArmY = -0.58 + Math.sin(t * 5.0) * 0.05;
    let rightArmZ = 0;
    let leftArmX = 0;
    let leftArmY = 0;
    let leftArmZ = 0;

    let whiteLedOpacity = 0;
    let hudOpacity = 0;
    let scanLineOpacity = 0;
    let mouthScaleY = 0.35;

    const arch = s.seatInfo.archetype;

    if (s.state === 'alert_flinch') {
      upperBodyX = 0.08;
      upperBodyY = Math.sin(t * 28.0) * 0.08;
      headX = 0.04;
      rightArmX = 0.28;
      rightArmY = -0.15;
      leftArmX = 0.22;
    } else if (s.state === 'cheat_capture') {
      if (arch === 'led_camera_earpiece') {
        upperBodyX = 0.06;
        headX = -0.34;
        rightArmX = 1.32;
        rightArmY = -0.52;
        rightArmZ = -0.12;
        const flashCycle = (2.6 - s.stateTimer) % 1.1;
        const isFlashOn = flashCycle > 0.25 && flashCycle < 0.58;
        whiteLedOpacity = isFlashOn ? 1.0 : 0.12;
      } else if (arch === 'glasses_swapper') {
        const swapWindow = 2.6 - s.stateTimer;
        if (swapWindow < 0.95) {
          upperBodyX = -0.24;
          rightArmX = -0.45;
          leftArmX = -0.45;
        } else {
          upperBodyX = 0.03;
          headX = -0.05;
          rightArmX = 1.22;
          rightArmY = -0.5;
        }
      } else if (arch === 'button_camera_underdesk') {
        upperBodyX = -0.04;
        headX = -0.16;
        leftArmX = -0.78;
        leftArmZ = -0.12;
        rightArmX = 0.62;
        rightArmY = -0.78;
      } else if (arch === 'pen_scanner_camera') {
        upperBodyX = -0.08;
        headX = -0.3;
        rightArmX = 0.04;
        rightArmY = -0.62 + Math.sin(t * 2.8) * 0.24;
        scanLineOpacity = dist < 4.5 ? (isFocusingSight ? 0.9 : 0.48) : 0;
      }
    } else if (s.state === 'cheat_receive') {
      if (arch === 'led_camera_earpiece') {
        upperBodyX = -0.02;
        headX = -0.1;
        headZ = 0.09;
        rightArmX = 1.38;
        rightArmY = -0.44;
        rightArmZ = -0.16;
      } else if (arch === 'glasses_swapper') {
        upperBodyX = 0.04;
        headX = 0.08;
        headY = Math.sin(t * 2.2) * 0.1;
        rightArmX = 1.25;
        rightArmY = -0.55 + Math.sin(t * 14.0) * 0.04;
        if (dist < 5.0) {
          const closeness = THREE.MathUtils.clamp((5.0 - dist) / 2.6, 0.2, 1);
          hudOpacity = isFocusingSight ? Math.min(0.95, closeness * 1.15) : closeness * 0.52;
        }
      } else if (arch === 'button_camera_underdesk') {
        upperBodyX = -0.06 + Math.abs(Math.sin(t * 8.0)) * 0.04;
        headX = -0.14;
        leftArmX = -0.78;
        leftArmZ = -0.12;
        mouthScaleY = 0.5 + Math.abs(Math.sin(t * 14.0)) * 1.4;
      } else if (arch === 'pen_scanner_camera') {
        upperBodyX = -0.04;
        headX = -0.22;
        rightArmX = 0.18;
        rightArmY = -0.35;
      }
    } else if (s.state === 'cheat_mark') {
      upperBodyX = -0.2;
      headX = -0.34;
      rightArmX = Math.cos(t * 16.0) * 0.04;
      rightArmY = 0.02 + Math.sin(t * 12.0) * 0.08;
    } else if (s.state === 'trap_acting') {
      if (arch === 'regular_glasses') {
        upperBodyX = -0.1;
        headX = -0.12;
        rightArmX = 1.18;
        rightArmY = -0.74;
      } else if (arch === 'nervous_clicker') {
        rightArmX = Math.sin(t * 24.0) * 0.08;
        rightArmY = -0.45;
      } else if (arch === 'metal_accessory') {
        upperBodyX = -0.1;
        headX = -0.12;
        headY = -0.22;
        leftArmX = 0.78;
        leftArmY = 0.28;
      } else if (arch === 'mental_solver') {
        upperBodyX = -0.03;
        headX = 0.1;
        leftArmX = 1.05;
        leftArmY = 0.42;
      }
    }

    s.upperBodyGroup.rotation.x = THREE.MathUtils.lerp(s.upperBodyGroup.rotation.x, upperBodyX, 0.2);
    s.upperBodyGroup.rotation.y = THREE.MathUtils.lerp(s.upperBodyGroup.rotation.y, upperBodyY, 0.2);
    s.headGroup.rotation.x = THREE.MathUtils.lerp(s.headGroup.rotation.x, headX, 0.2);
    s.headGroup.rotation.y = THREE.MathUtils.lerp(s.headGroup.rotation.y, headY, 0.2);
    s.headGroup.rotation.z = THREE.MathUtils.lerp(s.headGroup.rotation.z, headZ, 0.2);

    s.rightArmGroup.rotation.x = THREE.MathUtils.lerp(s.rightArmGroup.rotation.x, rightArmX, 0.22);
    s.rightArmGroup.rotation.y = THREE.MathUtils.lerp(s.rightArmGroup.rotation.y, rightArmY, 0.22);
    s.rightArmGroup.rotation.z = THREE.MathUtils.lerp(s.rightArmGroup.rotation.z, rightArmZ, 0.22);

    s.leftArmGroup.rotation.x = THREE.MathUtils.lerp(s.leftArmGroup.rotation.x, leftArmX, 0.22);
    s.leftArmGroup.rotation.y = THREE.MathUtils.lerp(s.leftArmGroup.rotation.y, leftArmY, 0.22);
    s.leftArmGroup.rotation.z = THREE.MathUtils.lerp(s.leftArmGroup.rotation.z, leftArmZ, 0.22);

    s.whiteLedMat.opacity = whiteLedOpacity;
    s.whiteLedMesh.visible = whiteLedOpacity > 0.05;
    s.whiteLedHaloMat.opacity = whiteLedOpacity > 0.5 ? 0.65 : 0;
    s.whiteLedHaloMesh.visible = whiteLedOpacity > 0.5;
    if (s.whiteLedHaloMesh.visible) {
      s.whiteLedHaloMesh.lookAt(proctorPos);
    }

    s.hudGlowMat.opacity = hudOpacity;
    s.hudGlowMesh.visible = hudOpacity > 0.02;

    (s.scanLineMesh.material as THREE.MeshBasicMaterial).opacity = scanLineOpacity;
    s.scanLineMesh.visible = scanLineOpacity > 0.02;
    s.mouthMesh.scale.y = mouthScaleY;

    s.pinholeGlintMesh.visible = s.glintTimer > 0;
    if (s.glintTimer > 0) {
      s.pinholeGlintMesh.lookAt(proctorPos);
    }

    s.dullReflectMesh.visible = s.dullReflectTimer > 0;
    if (s.dullReflectTimer > 0) {
      s.dullReflectMesh.lookAt(proctorPos);
    }
  }

  private syncSwapperGlasses(s: ManagedStudent): void {
    const isSwapper = s.seatInfo.archetype === 'glasses_swapper';
    if (!isSwapper) {
      s.swapSmartGlassesGroup.visible = false;
      s.spareThinGlassesOnDesk.visible = false;
      s.spareSmartGlassesOnDesk.visible = false;
      return;
    }

    s.swapSmartGlassesGroup.visible = s.swappedIntoSmartGlasses;
    s.regularGlassesGroup.visible = !s.swappedIntoSmartGlasses;
    s.spareThinGlassesOnDesk.visible = s.swappedIntoSmartGlasses;
    s.spareSmartGlassesOnDesk.visible = s.swappedOutSmartOnDesk;
  }

  private configureArchetypeVisuals(s: ManagedStudent): void {
    const arch = s.seatInfo.archetype;

    s.ledGlassesGroup.visible = arch === 'led_camera_earpiece';
    s.whiteLedMesh.visible = false;
    s.whiteLedHaloMesh.visible = false;

    s.swapSmartGlassesGroup.visible = false;
    s.hudGlowMesh.visible = false;
    s.spareThinGlassesOnDesk.visible = false;
    s.spareSmartGlassesOnDesk.visible = false;

    s.regularGlassesGroup.visible =
      arch === 'regular_glasses' || arch === 'glasses_swapper';
    s.metalGlassesGroup.visible = arch === 'metal_accessory';
    s.wristWatchMesh.visible = arch === 'metal_accessory';
    s.cameraButtonMesh.visible = arch === 'button_camera_underdesk';
    s.mouthMesh.visible = arch === 'button_camera_underdesk';
    s.scannerPenMesh.visible = arch === 'pen_scanner_camera';
    s.scanLineMesh.visible = false;
    s.pinholeGlintMesh.visible = false;
    s.dullReflectMesh.visible = false;

    if (arch === 'led_camera_earpiece') {
      s.pinholeGlintMesh.position.set(0.08, 0.67, -0.15);
    } else if (arch === 'button_camera_underdesk') {
      s.pinholeGlintMesh.position.set(0, 0.23, -0.145);
    } else if (arch === 'pen_scanner_camera') {
      s.pinholeGlintMesh.position.set(-0.14, 0.31, -0.3);
    }

    s.dullReflectMesh.position.set(-0.04, 0.66, -0.145);
  }

  private setExamPaperTexture(s: ManagedStudent, texture: THREE.Texture): void {
    const mat = s.examPaperMesh.material as THREE.MeshStandardMaterial;
    mat.map = texture;
    mat.needsUpdate = true;
  }

  private setOmrLevel(s: ManagedStudent, level: number): void {
    const clamped = Math.min(4, Math.max(0, level));
    s.omrLevel = clamped;
    const mat = s.omrCardMesh.material as THREE.MeshStandardMaterial;
    mat.map = this.paperTextures.omrLevels[clamped];
    mat.needsUpdate = true;
  }

  private decorateRig(rig: StudentRigInput): ManagedStudent {
    const worldPos = new THREE.Vector3();
    rig.root.getWorldPosition(worldPos);
    worldPos.y = 1.05;
    worldPos.z -= 0.08;

    const ledGlassesGroup = createGlassesMeshGroup(0x0f172a, true);
    const whiteLedMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
    });
    const whiteLedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), whiteLedMat);
    whiteLedMesh.position.set(0.084, 0.163, -0.129);
    ledGlassesGroup.add(whiteLedMesh);

    const whiteLedHaloMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const whiteLedHaloMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.052), whiteLedHaloMat);
    whiteLedHaloMesh.position.set(0.084, 0.163, -0.132);
    ledGlassesGroup.add(whiteLedHaloMesh);

    const earpiece = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.022, 0.028),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }),
    );
    earpiece.position.set(-0.116, 0.132, 0.0);
    ledGlassesGroup.add(earpiece);
    rig.headGroup.add(ledGlassesGroup);

    const swapSmartGlassesGroup = createGlassesMeshGroup(0x09090b, true);
    const hudGlowMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const hudGlowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.036), hudGlowMat);
    hudGlowMesh.position.set(-0.054, 0.146, -0.118);
    swapSmartGlassesGroup.add(hudGlowMesh);
    rig.headGroup.add(swapSmartGlassesGroup);

    const regularGlassesGroup = createGlassesMeshGroup(0x334155, false);
    rig.headGroup.add(regularGlassesGroup);

    const metalGlassesGroup = createGlassesMeshGroup(0xd1d5db, false);
    rig.headGroup.add(metalGlassesGroup);

    const wristWatchMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.076, 0.026, 0.084),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.7, roughness: 0.3 }),
    );
    wristWatchMesh.position.set(-0.04, -0.17, -0.22);
    rig.leftArmGroup.add(wristWatchMesh);

    const spareThinGlassesOnDesk = createDeskGlassesProp(0x475569, false);
    spareThinGlassesOnDesk.position.set(-0.27, 0.77, -0.17);
    spareThinGlassesOnDesk.rotation.y = 0.35;
    rig.deskGroup.add(spareThinGlassesOnDesk);

    const spareSmartGlassesOnDesk = createDeskGlassesProp(0x09090b, true);
    spareSmartGlassesOnDesk.position.set(-0.27, 0.772, -0.17);
    spareSmartGlassesOnDesk.rotation.y = -0.25;
    rig.deskGroup.add(spareSmartGlassesOnDesk);

    const cameraButtonMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.018, 12),
      new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.15, metalness: 0.55 }),
    );
    cameraButtonMesh.rotation.x = Math.PI / 2;
    cameraButtonMesh.position.set(0, 0.23, -0.12);
    rig.upperBodyGroup.add(cameraButtonMesh);

    const mouthMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.012, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x7c2d12 }),
    );
    mouthMesh.position.set(0, 0.068, -0.112);
    rig.headGroup.add(mouthMesh);

    const scannerPenMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.009, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.65, roughness: 0.3 }),
    );
    scannerPenMesh.rotation.x = Math.PI / 3;
    scannerPenMesh.position.set(0.04, -0.16, -0.32);
    rig.rightArmGroup.add(scannerPenMesh);

    const scanLineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    });
    const scanLineMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.02), scanLineMat);
    scanLineMesh.rotation.x = -Math.PI / 2;
    scanLineMesh.position.set(0.08, 0.77, 0.03);
    rig.deskGroup.add(scanLineMesh);

    const glintMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const pinholeGlintMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.048, 0.048), glintMat);
    pinholeGlintMesh.rotation.z = Math.PI / 4;
    rig.upperBodyGroup.add(pinholeGlintMesh);

    const dullMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.7,
    });
    const dullReflectMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.03), dullMat);
    rig.upperBodyGroup.add(dullReflectMesh);

    const deskCardMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const deskCardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.11), deskCardMat);
    deskCardMesh.position.set(-0.28, 0.768, 0.15);
    deskCardMesh.visible = false;
    rig.deskGroup.add(deskCardMesh);

    return {
      ...rig,
      seatInfo: {
        seatIndex: rig.seatIndex,
        seatLabel: rig.seatLabel,
        row: rig.row,
        col: rig.col,
        isCheater: false,
        archetype: 'focused_writer',
        caught: false,
      },
      state: 'idle_writing',
      stateTimer: 0,
      cooldownTimer: 4,
      firstClueTimeSec: null,
      proctorFrontExposureSec: 0,
      glintTimer: 0,
      dullReflectTimer: 0,
      alreadyJudged: false,
      omrLevel: 0,
      nextInnocentOmrSec: 45,
      problemSheetKind: 'blank',
      swappedIntoSmartGlasses: false,
      swappedOutSmartOnDesk: false,
      worldPos,
      ledGlassesGroup,
      whiteLedMesh,
      whiteLedMat,
      whiteLedHaloMesh,
      whiteLedHaloMat,
      swapSmartGlassesGroup,
      hudGlowMesh,
      hudGlowMat,
      regularGlassesGroup,
      metalGlassesGroup,
      wristWatchMesh,
      spareThinGlassesOnDesk,
      spareSmartGlassesOnDesk,
      cameraButtonMesh,
      mouthMesh,
      scannerPenMesh,
      scanLineMesh,
      pinholeGlintMesh,
      dullReflectMesh,
      deskCardMesh,
      deskCardMat,
    };
  }
}
