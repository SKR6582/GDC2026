// ===== KBO 3D Baseball — Player Models =====
import * as THREE from 'three';

export interface PlayerMesh {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  cap: THREE.Mesh;
}

/** 캡슐형 선수 모델 생성 */
export function createPlayer(color: number, accentColor: number, name?: string): PlayerMesh {
  const group = new THREE.Group();

  // Body (uniform) — 크게
  const bodyGeo = new THREE.CapsuleGeometry(0.55, 1.4, 8, 16);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.2;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.38, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.7 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.35;
  group.add(head);

  // Cap
  const capGeo = new THREE.CylinderGeometry(0.40, 0.44, 0.15, 16);
  const capMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 2.65;
  group.add(cap);

  // Cap visor
  const visorGeo = new THREE.BoxGeometry(0.3, 0.04, 0.2);
  const visor = new THREE.Mesh(visorGeo, capMat);
  visor.position.set(0, 2.55, 0.35);
  group.add(visor);

  if (name) {
    group.userData.playerName = name;
  }

  group.castShadow = true;
  return { group, body, head, cap };
}

/** 투수 모델 (마운드 위) */
export function createPitcherModel(color: number): PlayerMesh {
  const player = createPlayer(color, color);
  player.group.position.set(0, 0.4, 18.4); // 마운드 위
  player.group.rotation.y = Math.PI; // 홈(Z=0) 방향을 봄
  return player;
}

/** 타자 모델 (좌/우타석) */
export function createBatterModel(color: number, isLeft: boolean): PlayerMesh {
  const player = createPlayer(color, color);
  const x = isLeft ? 1.2 : -1.2;
  player.group.position.set(x, 0, 0); // 홈플레이트 옆
  player.group.rotation.y = isLeft ? -Math.PI / 4 : Math.PI / 4;

  // Bat
  const batGeo = new THREE.CylinderGeometry(0.04, 0.07, 1.3, 8);
  const batMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.4 });
  const bat = new THREE.Mesh(batGeo, batMat);
  bat.position.set(isLeft ? -0.5 : 0.5, 1.8, 0.3);
  bat.rotation.z = isLeft ? 0.4 : -0.4;
  player.group.add(bat);

  return player;
}

/** 포수 모델 */
export function createCatcherModel(color: number): PlayerMesh {
  const player = createPlayer(color, color);
  player.group.position.set(0, 0, -1.5);
  player.group.scale.y = 0.85; // 앉은 자세
  return player;
}

/** 주자 모델 (베이스 위치) */
export function createRunnerModel(color: number): PlayerMesh {
  return createPlayer(color, color);
}

/** 야수 배치 (9개 포지션 — Z축 정렬) */
export function createFielders(color: number, scene: THREE.Scene): PlayerMesh[] {
  const positions: [number, number, number][] = [
    [0, 0, -1.5],       // C (포수)
    [19.4, 0, 19.4],    // 1B
    [13.7, 0, 29.0],    // 2B (수비 포지션)
    [-13.7, 0, 29.0],   // SS (유격수 수비 포지션)
    [-19.4, 0, 19.4],   // 3B
    [-38, 0, 55],       // LF
    [0, 0, 75],         // CF
    [38, 0, 55],        // RF
    [0, 0.4, 18.4],     // P (투수)
  ];

  const fielders: PlayerMesh[] = [];
  for (const [x, y, z] of positions) {
    const player = createPlayer(color, color);
    player.group.position.set(x, y, z);
    // 홈 방향(Z=0)을 바라보게 회전
    player.group.rotation.y = Math.PI;
    scene.add(player.group);
    fielders.push(player);
  }
  return fielders;
}

// ===== 공 =====
export function createBall(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.12, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x222222,
  });
  const ball = new THREE.Mesh(geo, mat);
  ball.castShadow = true;
  ball.name = 'baseball';
  return ball;
}
