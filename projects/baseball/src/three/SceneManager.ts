// ===== KBO 3D Baseball — Scene Manager (Integrates all 3D) =====
import * as THREE from 'three';
import { createStadium, createLighting } from './Stadium';
import { createFielders, createBatterModel, createBall, createRunnerModel, type PlayerMesh } from './PlayerModels';
import { BallAnimator, getBasePosition, animateRunner, type RunnerAnimState } from './BallPhysics';
import { CameraManager } from './CameraManager';
import type { GameEvent, BaseState, HitResult } from '../engine/types';
import { useGameStore } from '../store/gameStore';

interface FielderAnimState {
  mesh: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
}

interface JoggingFielder {
  mesh: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
}

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  cameraManager: CameraManager;
  ballAnimator: BallAnimator;

  private clock = new THREE.Clock();
  private homeFielders: PlayerMesh[] = [];
  private batter: PlayerMesh | null = null;
  private runners: Map<number, PlayerMesh> = new Map(); // base → mesh
  private runnerAnims: RunnerAnimState[] = [];
  private fielderAnim: FielderAnimState | null = null;
  
  // 야수 더그아웃 진출입 조깅 애니메이션 관리
  private joggingFielders: JoggingFielder[] = [];
  private currentVisualIsTop = true; // 현재 수비 방향 추적용

  // 디버깅 항공뷰 고정 모드
  private debugOverview = false;
  private currentBatterColor = 0x074CA1;

  private animFrameId = 0;
  private disposed = false;

  constructor(container: HTMLElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.8;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1e2e);
    this.scene.fog = new THREE.FogExp2(0x1a1e2e, 0.0015);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.cameraManager = new CameraManager(aspect);

    // Stadium
    createStadium(this.scene);
    createLighting(this.scene);

    // Ball
    const ball = createBall();
    this.scene.add(ball);
    this.ballAnimator = new BallAnimator(ball);

    // Batter (원정팀 공격)
    this.batter = createBatterModel(0x074CA1, false);
    this.scene.add(this.batter.group);

    // Default fielders (홈팀 수비) - 즉시 텔레포트 대신 시작하자마자 더그아웃에서 맹렬히 달려나오는 연출 적용!
    this.homeFielders = [];
    this.currentVisualIsTop = true;
    this.swapFielders(true);

    // Start render loop
    this.animate();
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    this.cameraManager.update(dt);
    this.ballAnimator.update(dt);

    // Fielder running animation (볼 인플레이 시 필딩 추적 질주)
    if (this.fielderAnim) {
      this.fielderAnim.t += dt / this.fielderAnim.duration;
      if (this.fielderAnim.t >= 1) {
        this.fielderAnim.t = 1;
        this.fielderAnim.mesh.position.copy(this.fielderAnim.to);
        this.fielderAnim = null;
      } else {
        this.fielderAnim.mesh.position.lerpVectors(this.fielderAnim.from, this.fielderAnim.to, this.fielderAnim.t);
        // 부드러운 달리기 홉 모션 가미
        this.fielderAnim.mesh.position.y = this.fielderAnim.to.y + Math.sin(this.fielderAnim.t * Math.PI * 6) * 0.12;
      }
    }

    // 야수들 더그아웃 진출입 조깅 애니메이션
    this.joggingFielders = this.joggingFielders.filter(jf => {
      jf.t += dt / jf.duration;
      if (jf.t >= 1) {
        jf.mesh.position.copy(jf.to);
        return false; // 애니메이션 제거
      }
      jf.mesh.position.lerpVectors(jf.from, jf.to, jf.t);
      // 부드러운 바운싱으로 현실감 넘치는 달리기 구현
      jf.mesh.position.y = jf.to.y + Math.abs(Math.sin(jf.t * Math.PI * 6)) * 0.22;
      return true;
    });

    // Runner animations
    this.runnerAnims = this.runnerAnims.filter(a => {
      return animateRunner(a, dt);
    });

    this.renderer.render(this.scene, this.cameraManager.camera);
  };

  /** 3D 모션 완료 후 동기화하여 다음 플레이 스케줄링 */
  private scheduleNextStep(): void {
    const state = useGameStore.getState();
    if (state.status !== 'playing') return;

    // 배속에 따른 자연스러운 대기 시간 구성 (실제 야구 경기감처럼 투수-타자가 호흡을 맞추는 여유)
    const delay = state.speed === 4 ? 350 : state.speed === 2 ? 1000 : 2500;
    setTimeout(() => {
      const currentState = useGameStore.getState();
      if (currentState.status === 'playing') {
        currentState.stepOnce();
      }
    }, delay);
  }

  /** 카메라 모드 설정 (디버깅 항공뷰 잠금 시 무시) */
  private setCameraMode(mode: import('./CameraManager').CameraMode): void {
    if (this.debugOverview) return; // 디버깅 항공뷰 고정 중에는 카메라 전환 억제
    this.cameraManager.setMode(mode);
  }

  /** 디버깅 항공뷰 토글 */
  toggleDebugView(): boolean {
    this.debugOverview = !this.debugOverview;
    if (this.debugOverview) {
      this.cameraManager.setMode('overview');
    } else {
      this.cameraManager.setMode('pitch');
    }
    return this.debugOverview;
  }

  /** 게임 이벤트에 따라 3D 씬 업데이트 (야수 수비 연계 및 송구 구현) */
  handleEvent(event: GameEvent): void {
    // 첫 이닝 첫 투구인 경우 강제 리셋 검증 (게임 리셋 대응)
    if (event.inning === 1 && event.isTop && event.count.outs === 0 && event.count.balls === 0 && event.count.strikes === 0) {
      this.currentVisualIsTop = true;
    }

    // 타자 모델의 색상 실시간 검증 및 갱신 (한화 공격 시 주황, 삼성 공격 시 파랑)
    if (event.currentBatter) {
      const expectedColor = event.currentBatter.team === 'samsung' ? 0x074CA1 : 0xFE6500;
      // batter가 없거나 색상이 다르면 재생성
      if (!this.batter || (this.batter && this.batter.group.children.length > 0 && this.currentBatterColor !== expectedColor)) {
        this.currentBatterColor = expectedColor;
        if (this.batter) {
          this.scene.remove(this.batter.group);
        }
        this.batter = createBatterModel(expectedColor, false);
        this.scene.add(this.batter.group);
      }
    }

    // A. 이닝이 교대되었는지 감지 (isTop이 바뀌었거나 아웃카운트가 초기화되었을 때)
    if (event.isTop !== this.currentVisualIsTop) {
      this.currentVisualIsTop = event.isTop;
      
      // 전광판/카메라를 전체 뷰로 잡고 이닝 교대 시네마틱 시작!
      this.setCameraMode('overview');
      this.swapFielders(event.isTop);

      // 타자 모델도 공격팀 색상으로 교체! (isTop=true → 삼성 파랑, isTop=false → 한화 주황)
      if (this.batter) {
        this.scene.remove(this.batter.group);
      }
      const batterColor = event.isTop ? 0x074CA1 : 0xFE6500;
      this.currentBatterColor = batterColor;
      this.batter = createBatterModel(batterColor, false);
      this.scene.add(this.batter.group);

      // 실제 KBO 중계와 똑같이 이닝 교대 중 광고가 흐르는 듯한 따뜻한 여백과 연습 투구 시간(4.5초) 제공
      setTimeout(() => {
        this.setCameraMode('pitch');
        this.scheduleNextStep();
      }, 4500);

      this.updateRunnersImmediately(event.baseState);
      return;
    }

    // 1. 홈런 처리
    if (event.hitResult === 'homerun') {
      this.setCameraMode('homerun');
      this.ballAnimator.animateHit('homerun', () => {
        setTimeout(() => {
          this.setCameraMode('pitch');
          this.scheduleNextStep();
        }, 3000);
      });
      this.animateRunnersFlow(event, 2.0);
      return;
    }

    // 2. 일반 타격 또는 아웃 (야구 공 송구 및 야수 추적 연계)
    if (event.type === 'hit' && event.hitResult) {
      const hitType = event.hitResult as HitResult;
      this.setCameraMode('batting');

      // 낙하 예상 지점 결정 (BallPhysics.ts 궤적과 동일한 목표점)
      let endPos = new THREE.Vector3(0, 0.1, 30);
      let flightDuration = 1.5;

      switch (hitType) {
        case 'single':
          endPos.set((Math.random() - 0.5) * 20, 0.1, 40);
          flightDuration = 1.4;
          break;
        case 'double':
          endPos.set((Math.random() - 0.5) * 35, 0.1, 60);
          flightDuration = 1.9;
          break;
        case 'triple':
          endPos.set((Math.random() - 0.5) * 45, 0.1, 75);
          flightDuration = 2.4;
          break;
        case 'fly_out':
        case 'sacrifice_fly':
          endPos.set((Math.random() - 0.5) * 30, 0.1, 55);
          flightDuration = 2.1;
          break;
        case 'ground_out':
        case 'double_play':
        case 'fielders_choice':
          endPos.set((Math.random() - 0.5) * 15, 0.1, 25);
          flightDuration = 0.9;
          break;
        case 'line_out':
          endPos.set((Math.random() - 0.5) * 20, 1.0, 25);
          flightDuration = 0.7;
          break;
      }

      // 수비수 중 낙하지점과 가장 가까운 야수 검색 (투수[8], 포수[0] 제외한 야수)
      let closestFielder: PlayerMesh | null = null;
      let minDist = 9999;

      for (let i = 1; i <= 7; i++) {
        const f = this.homeFielders[i];
        if (f) {
          const d = f.group.position.distanceTo(endPos);
          if (d < minDist) {
            minDist = d;
            closestFielder = f;
          }
        }
      }

      const originalFielderPos = closestFielder ? closestFielder.group.position.clone() : null;

      // 공 날아가는 동안 야수가 낙하지점으로 맹렬히 달리게 애니메이션 가동
      if (closestFielder && originalFielderPos) {
        this.fielderAnim = {
          mesh: closestFielder.group,
          from: originalFielderPos,
          to: endPos.clone(),
          t: 0,
          duration: flightDuration,
        };
      }

      // 주자들도 공 비행 시간 맞춰 주루 개시
      this.animateRunnersFlow(event, flightDuration);

      // 메인 타구 발사
      this.ballAnimator.animateHit(hitType, () => {
        // 공이 낙하지점에 떨어졌다! 야수가 포획하고 송구 프로세스 가동
        if (closestFielder && originalFielderPos) {
          
          if (hitType === 'ground_out' || hitType === 'fielders_choice') {
            // 땅볼 아웃: 공을 주워 1루수로 레이저 송구!
            const firstBasePos = getBasePosition(1);
            this.ballAnimator.animateThrow(endPos, firstBasePos, 0.5, 1.0, () => {
              // 1루수 캐치 성공 -> 타자 아웃!
              setTimeout(() => {
                this.setCameraMode('pitch');
                this.scheduleNextStep();
              }, 1200);
            });
          }
          else if (hitType === 'double_play') {
            // 더블 플레이: 유격수/2루수가 잡아 2루로 토스 -> 2루수 아웃 후 1루 송구!
            const secondBasePos = getBasePosition(2);
            const firstBasePos = getBasePosition(1);

            this.ballAnimator.animateThrow(endPos, secondBasePos, 0.4, 0.6, () => {
              // 2루 주자 포스 아웃! 즉시 1루수로 2차 롱송구!
              this.ballAnimator.animateThrow(secondBasePos, firstBasePos, 0.5, 1.0, () => {
                // 타자 주자도 아웃! 더블 플레이 완성!
                setTimeout(() => {
                  this.setCameraMode('pitch');
                  this.scheduleNextStep();
                }, 1200);
              });
            });
          }
          else if (hitType === 'fly_out' || hitType === 'line_out' || hitType === 'sacrifice_fly') {
            // 플라이 아웃: 공을 공중 포획! 추가 송구 없이 투수에게 안전 토스
            const pitcherPos = getBasePosition('home').clone().add(new THREE.Vector3(0, 0.4, 18.4));
            this.ballAnimator.animateThrow(endPos, pitcherPos, 0.8, 2.5, () => {
              setTimeout(() => {
                this.setCameraMode('pitch');
                this.scheduleNextStep();
              }, 1200);
            });
          }
          else {
            // 일반 안타 (single, double, triple): 외야 펜스 앞에서 컷오프(2루/3루) 송구!
            const cutOffBase = hitType === 'triple' ? 3 : 2;
            const cutOffPos = getBasePosition(cutOffBase);

            this.ballAnimator.animateThrow(endPos, cutOffPos, 0.7, 1.8, () => {
              // 공이 내야로 무사히 복귀
              setTimeout(() => {
                this.setCameraMode('pitch');
                this.scheduleNextStep();
              }, 1200);
            });
          }

          // 송구 완료 후 야수는 제자리로 복귀
          setTimeout(() => {
            if (closestFielder && originalFielderPos) {
              this.fielderAnim = {
                mesh: closestFielder.group,
                from: closestFielder.group.position.clone(),
                to: originalFielderPos,
                t: 0,
                duration: 1.2,
              };
            }
          }, 1500);

        } else {
          // 예외 복구
          setTimeout(() => {
            this.setCameraMode('pitch');
            this.scheduleNextStep();
          }, 1500);
        }
      });

    } else if (event.type === 'pitch' && event.pitchType) {
      this.setCameraMode('pitch');
      
      // 투구 애니메이션 발사
      this.ballAnimator.animatePitch(event.pitchType, event.speed || 140, () => {
        // 투구 완수 시점: 만약 인플레이 타구가 아닌 경우(스트라이크, 볼, 파울, HBP 등)
        // 3D 씬 모션 완료를 알리며 다음 스텝 동기 스케줄링
        if (event.pitchResult && event.pitchResult !== 'in_play') {
          setTimeout(() => {
            this.scheduleNextStep();
          }, 1000);
        }
      });
      
      this.updateRunnersImmediately(event.baseState);
    } else if (event.type === 'baserun') {
      this.setCameraMode('baserun');
      this.animateRunnersFlow(event, 2.0);
      setTimeout(() => {
        this.setCameraMode('pitch');
        this.scheduleNextStep();
      }, 2500);
    } else {
      this.updateRunnersImmediately(event.baseState);
      this.scheduleNextStep();
    }
  }

  /** 주자들이 실제 주행 선을 따라 부드럽게 달리게 동적 애니메이션 구성 */
  private animateRunnersFlow(event: GameEvent, duration: number): void {
    const nextState = event.baseState;
    const runnerColor = event.isTop ? 0x074CA1 : 0xFE6500;

    // 타자 주자 홈 -> 1루 (안타면 2루/3루 진루)
    if (event.hitResult && event.hitResult !== 'homerun') {
      const hitType = event.hitResult;
      const targetBase = (hitType === 'double') ? 2 : (hitType === 'triple') ? 3 : 1;
      
      const runnerMesh = createRunnerModel(runnerColor);
      runnerMesh.group.position.copy(getBasePosition('home'));
      this.scene.add(runnerMesh.group);

      const targetPos = getBasePosition(targetBase);
      this.runnerAnims.push({
        active: true,
        mesh: runnerMesh.group,
        from: getBasePosition('home'),
        to: targetPos,
        t: 0,
        duration: duration * (targetBase === 2 ? 1.5 : targetBase === 3 ? 2.0 : 1.0),
        callback: () => {
          if (hitType === 'ground_out' || hitType === 'double_play' || hitType === 'fly_out' || hitType === 'line_out') {
            this.scene.remove(runnerMesh.group);
          } else {
            this.runners.set(targetBase, runnerMesh);
          }
        }
      });
    }

    // 1루 주자 -> 2루/3루 진루 애니메이션
    if (this.runners.has(1)) {
      const mesh1 = this.runners.get(1)!;
      this.runners.delete(1);
      
      const toBase = nextState.second ? 2 : nextState.third ? 3 : null;
      if (toBase) {
        this.runnerAnims.push({
          active: true,
          mesh: mesh1.group,
          from: getBasePosition(1),
          to: getBasePosition(toBase),
          t: 0,
          duration: duration,
          callback: () => { this.runners.set(toBase, mesh1); }
        });
      } else {
        // 아웃 또는 득점
        const scored = !nextState.first && !nextState.second && !nextState.third; // 득점 상황
        this.runnerAnims.push({
          active: true,
          mesh: mesh1.group,
          from: getBasePosition(1),
          to: scored ? getBasePosition('home') : getBasePosition(2),
          t: 0,
          duration: duration,
          callback: () => { this.scene.remove(mesh1.group); }
        });
      }
    }

    // 2루 주자 -> 3루/홈 진루 애니메이션
    if (this.runners.has(2)) {
      const mesh2 = this.runners.get(2)!;
      this.runners.delete(2);

      if (nextState.third) {
        this.runnerAnims.push({
          active: true,
          mesh: mesh2.group,
          from: getBasePosition(2),
          to: getBasePosition(3),
          t: 0,
          duration: duration,
          callback: () => { this.runners.set(3, mesh2); }
        });
      } else {
        this.runnerAnims.push({
          active: true,
          mesh: mesh2.group,
          from: getBasePosition(2),
          to: getBasePosition('home'),
          t: 0,
          duration: duration,
          callback: () => { this.scene.remove(mesh2.group); }
        });
      }
    }

    // 3루 주자 -> 홈 플레이트 대시 (득점)
    if (this.runners.has(3)) {
      const mesh3 = this.runners.get(3)!;
      this.runners.delete(3);

      this.runnerAnims.push({
        active: true,
        mesh: mesh3.group,
        from: getBasePosition(3),
        to: getBasePosition('home'),
        t: 0,
        duration: duration * 0.9,
        callback: () => { this.scene.remove(mesh3.group); }
      });
    }
  }

  /** 주자 즉각 배치 (애니메이션 없는 보조 렌더) */
  private updateRunnersImmediately(baseState: BaseState): void {
    const bases = [
      { key: 1, runner: baseState.first },
      { key: 2, runner: baseState.second },
      { key: 3, runner: baseState.third },
    ] as const;

    // 제거
    for (const [base, mesh] of this.runners) {
      const stillOn = bases.find(b => b.key === base && b.runner);
      if (!stillOn) {
        this.scene.remove(mesh.group);
        this.runners.delete(base);
      }
    }

    // 배치
    for (const { key, runner } of bases) {
      if (runner) {
        if (!this.runners.has(key)) {
          const color = runner.batter.team === 'samsung' ? 0x074CA1 : 0xFE6500;
          const mesh = createRunnerModel(color);
          mesh.group.position.copy(getBasePosition(key));
          this.scene.add(mesh.group);
          this.runners.set(key, mesh);
        }
      }
    }
  }

  /** 이닝 전환 시 수비팀 색상 변경 및 더그아웃 조깅 적용 (텔레포트 방지) */
  swapFielders(isTop: boolean): void {
    // 1. 기존 야수들은 더그아웃 방향으로 부드럽게 달려가서 퇴장하게 처리!
    // 삼성이면 1루 더그아웃(우), 한화면 3루 더그아웃(좌)으로 복귀
    const oldDugout = isTop ? new THREE.Vector3(25, 0.1, 10) : new THREE.Vector3(-25, 0.1, 10);
    for (const f of this.homeFielders) {
      const currentPos = f.group.position.clone();
      const meshGroup = f.group;
      
      this.joggingFielders.push({
        mesh: meshGroup,
        from: currentPos,
        to: oldDugout.clone(),
        t: 0,
        duration: 2.0,
      });

      // 조깅이 끝나는 시점에 씬에서 안전하게 제거
      setTimeout(() => {
        this.scene.remove(meshGroup);
      }, 2000);
    }

    // 2. 새 수비수 생성하되, 즉시 텔레포트하지 않고 더그아웃에서 흩어져 달려나오도록 배치!
    const newColor = isTop ? 0xFE6500 : 0x074CA1; // 수비팀 색상
    const newFielders = createFielders(newColor, this.scene);
    const newDugout = isTop ? new THREE.Vector3(-25, 0.1, 10) : new THREE.Vector3(25, 0.1, 10);

    for (const f of newFielders) {
      const finalPos = f.group.position.clone();
      f.group.position.copy(newDugout); // 일단 더그아웃 위치로 스냅

      // 더그아웃에서 제자리로 조깅하여 흩어지게 예약
      this.joggingFielders.push({
        mesh: f.group,
        from: newDugout.clone(),
        to: finalPos,
        t: 0,
        duration: 2.5 + Math.random() * 0.6, // 약간의 개별 질주 편차를 줘서 더욱 인간적임
      });
    }

    this.homeFielders = newFielders;
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.cameraManager.resize(w / h);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
