// ===== KBO 3D Baseball — Ball Physics & Animations =====
import * as THREE from 'three';
import type { PitchType, HitResult } from '../engine/types';

const BASE_POSITIONS = {
  home: new THREE.Vector3(0, 0.1, 0),
  first: new THREE.Vector3(19.4, 0.1, 19.4),
  second: new THREE.Vector3(0, 0.1, 38.8),
  third: new THREE.Vector3(-19.4, 0.1, 19.4),
  mound: new THREE.Vector3(0, 0.6, 18.4),
};

interface AnimState {
  active: boolean;
  t: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  controlPoints: THREE.Vector3[];
  callback?: () => void;
}

export class BallAnimator {
  ball: THREE.Mesh;
  anim: AnimState;

  constructor(ball: THREE.Mesh) {
    this.ball = ball;
    this.anim = { active: false, t: 0, duration: 0, startPos: new THREE.Vector3(), endPos: new THREE.Vector3(), controlPoints: [] };
    this.ball.visible = false;
  }

  /** 투구 애니메이션 */
  animatePitch(pitchType: PitchType, speed: number, onComplete?: () => void): void {
    const start = BASE_POSITIONS.mound.clone().add(new THREE.Vector3(0, 0.8, 0));
    const end = BASE_POSITIONS.home.clone().add(new THREE.Vector3(0, 0.8, 0));
    const duration = Math.max(0.3, 1.2 - (speed - 120) * 0.01);

    // 구종별 제어점 (곡선)
    const mid = start.clone().lerp(end, 0.5);
    switch (pitchType) {
      case '커브':
        mid.y += 2.5; mid.x += 0.3;
        break;
      case '슬라이더':
        mid.x += 1.5;
        break;
      case '체인지업':
        mid.y += 0.5;
        break;
      case '포크볼':
        mid.y -= 0.8;
        break;
      case '커터':
        mid.x -= 0.8;
        break;
      case '싱커':
        mid.y -= 0.5; mid.x += 0.3;
        break;
      default: // 직구, 투심
        mid.y += 0.1;
        break;
    }

    this.anim = {
      active: true, t: 0, duration, startPos: start, endPos: end,
      controlPoints: [mid], callback: onComplete,
    };
    this.ball.visible = true;
    this.ball.position.copy(start);
  }

  /** 타구 애니메이션 */
  animateHit(hitResult: HitResult, onComplete?: () => void): void {
    const start = BASE_POSITIONS.home.clone().add(new THREE.Vector3(0, 0.8, 0));
    let end: THREE.Vector3;
    let mid: THREE.Vector3;
    let duration: number;

    switch (hitResult) {
      case 'homerun':
        end = new THREE.Vector3((Math.random() - 0.5) * 30, 0, 85 + Math.random() * 10);
        mid = start.clone().lerp(end, 0.4);
        mid.y = 25 + Math.random() * 10;
        duration = 2.5;
        break;
      case 'triple':
        end = new THREE.Vector3((Math.random() - 0.5) * 50, 0.1, 65);
        mid = start.clone().lerp(end, 0.4);
        mid.y = 8;
        duration = 2.0;
        break;
      case 'double':
        end = new THREE.Vector3((Math.random() - 0.5) * 40, 0.1, 50);
        mid = start.clone().lerp(end, 0.4);
        mid.y = 5;
        duration = 1.8;
        break;
      case 'single':
        end = new THREE.Vector3((Math.random() - 0.5) * 25, 0.1, 30 + Math.random() * 15);
        mid = start.clone().lerp(end, 0.4);
        mid.y = 2 + Math.random() * 3;
        duration = 1.2;
        break;
      case 'fly_out':
      case 'sacrifice_fly':
        end = new THREE.Vector3((Math.random() - 0.5) * 30, 0.1, 40 + Math.random() * 20);
        mid = start.clone().lerp(end, 0.4);
        mid.y = 15 + Math.random() * 8;
        duration = 2.0;
        break;
      case 'ground_out':
      case 'double_play':
      case 'fielders_choice':
        end = new THREE.Vector3((Math.random() - 0.5) * 15, 0.1, 15 + Math.random() * 10);
        mid = start.clone().lerp(end, 0.5);
        mid.y = 0.5;
        duration = 0.8;
        break;
      case 'line_out':
        end = new THREE.Vector3((Math.random() - 0.5) * 20, 1, 25);
        mid = start.clone().lerp(end, 0.5);
        mid.y = 1.5;
        duration = 0.6;
        break;
      default:
        end = start.clone();
        mid = start.clone();
        duration = 0.3;
    }

    this.anim = {
      active: true, t: 0, duration, startPos: start, endPos: end,
      controlPoints: [mid], callback: onComplete,
    };
    this.ball.visible = true;
  }

  /** 야수 송구 애니메이션 */
  animateThrow(start: THREE.Vector3, end: THREE.Vector3, duration: number, height: number, onComplete?: () => void): void {
    const mid = start.clone().lerp(end, 0.5);
    mid.y = Math.max(start.y, end.y) + height;
    this.anim = {
      active: true, t: 0, duration, startPos: start, endPos: end,
      controlPoints: [mid], callback: onComplete,
    };
    this.ball.visible = true;
  }

  /** 프레임 업데이트 */
  update(dt: number): void {
    if (!this.anim.active) return;

    this.anim.t += dt / this.anim.duration;
    if (this.anim.t >= 1) {
      this.anim.t = 1;
      this.anim.active = false;
      this.ball.position.copy(this.anim.endPos);
      setTimeout(() => { this.ball.visible = false; }, 500);
      this.anim.callback?.();
      return;
    }

    // Quadratic Bezier
    const t = this.anim.t;
    const p0 = this.anim.startPos;
    const p1 = this.anim.controlPoints[0];
    const p2 = this.anim.endPos;
    const it = 1 - t;

    this.ball.position.set(
      it * it * p0.x + 2 * it * t * p1.x + t * t * p2.x,
      it * it * p0.y + 2 * it * t * p1.y + t * t * p2.y,
      it * it * p0.z + 2 * it * t * p1.z + t * t * p2.z,
    );
  }

  hide(): void {
    this.ball.visible = false;
    this.anim.active = false;
  }
}

// ===== Runner Animation =====
export interface RunnerAnimState {
  active: boolean;
  mesh: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
  callback?: () => void;
}

export function getBasePosition(base: 'home' | 1 | 2 | 3): THREE.Vector3 {
  if (base === 'home') return BASE_POSITIONS.home.clone();
  if (base === 1) return BASE_POSITIONS.first.clone();
  if (base === 2) return BASE_POSITIONS.second.clone();
  return BASE_POSITIONS.third.clone();
}

export function animateRunner(anim: RunnerAnimState, dt: number): boolean {
  if (!anim.active) return false;
  anim.t += dt / anim.duration;
  if (anim.t >= 1) {
    anim.t = 1;
    anim.active = false;
    anim.mesh.position.copy(anim.to);
    anim.callback?.();
    return false;
  }

  // Lerp with slight bounce
  const t = anim.t;
  anim.mesh.position.lerpVectors(anim.from, anim.to, t);
  anim.mesh.position.y += Math.sin(t * Math.PI) * 0.15; // 달리기 바운스
  return true;
}
