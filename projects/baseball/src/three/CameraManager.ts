// ===== KBO 3D Baseball — Camera Manager =====
// TV 중계 스타일: 투수 등 뒤에서 홈 방향 → 타격 시 타자 뒤에서 공 추적
import * as THREE from 'three';

export type CameraMode = 'pitch' | 'batting' | 'homerun' | 'baserun' | 'overview';

export class CameraManager {
  camera: THREE.PerspectiveCamera;
  private targetPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private lerpSpeed = 3.0;
  private initialized = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500);
    this.setPitchView();
    // 초기 위치 즉시 세팅
    this.camera.position.copy(this.targetPos);
    this.currentLookAt.copy(this.targetLookAt);
    this.camera.lookAt(this.targetLookAt);
    this.initialized = true;
  }

  /**
   * 투구 시: 센터 카메라 — 투수 등 뒤 낮은 각도 (KBO TV 중계 각도)
   * 투수(Z=18.4) 뒤쪽(Z=24.5)에서 홈플레이트(Z=0) 방향을 바라봄
   */
  setPitchView(): void {
    // 투수 뒤, 약간 1루 쪽으로 치우침, 낮은 높이
    this.targetPos.set(1.5, 3.5, 24.5);
    this.targetLookAt.set(0, 0.6, -1.5);
    this.lerpSpeed = 2.5;
  }

  /**
   * 타격 시: 타자 뒤 시점 — 공이 날아가는 방향을 추적
   * (타자 뒤 약간 위에서 외야 방향)
   */
  setBattingView(): void {
    this.targetPos.set(0, 5, -6);
    this.targetLookAt.set(0, 3, 40);
    this.lerpSpeed = 3.5;
  }

  /**
   * 홈런 시: 사이드 + 위에서 공 포물선 추적
   */
  setHomerunView(): void {
    this.targetPos.set(-18, 12, 10);
    this.targetLookAt.set(0, 15, 60);
    this.lerpSpeed = 2.0;
  }

  /**
   * 주루 시: 1루-3루선 사이드 뷰
   */
  setBaserunView(): void {
    this.targetPos.set(35, 12, 20);
    this.targetLookAt.set(0, 0, 20);
    this.lerpSpeed = 3.0;
  }

  /**
   * 경기장 전체: 높은 곳에서 내려다봄
   */
  setOverview(): void {
    this.targetPos.set(0, 75, -20);
    this.targetLookAt.set(0, 0, 35);
    this.lerpSpeed = 1.5;
  }

  private time = 0;

  setMode(mode: CameraMode): void {
    switch (mode) {
      case 'pitch': this.setPitchView(); break;
      case 'batting': this.setBattingView(); break;
      case 'homerun': this.setHomerunView(); break;
      case 'baserun': this.setBaserunView(); break;
      case 'overview': this.setOverview(); break;
    }
  }

  update(dt: number): void {
    this.time += dt;
    const f = 1 - Math.exp(-this.lerpSpeed * dt);
    this.camera.position.lerp(this.targetPos, f);
    this.currentLookAt.lerp(this.targetLookAt, f);
    
    // Subtle organic broadcast sway (handheld effect)
    const swayX = Math.sin(this.time * 0.7) * 0.06;
    const swayY = Math.cos(this.time * 0.5) * 0.04;
    
    this.camera.lookAt(
      this.currentLookAt.x + swayX,
      this.currentLookAt.y + swayY,
      this.currentLookAt.z
    );
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
