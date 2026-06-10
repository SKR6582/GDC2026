// ===== KBO 3D Baseball — Stadium Builder =====
import * as THREE from 'three';

export function createStadium(scene: THREE.Scene): void {
  // === Outfield grass (큰 원형, 센터는 홈플레이트가 아닌 전체 구장 중심) ===
  const grassGeo = new THREE.CircleGeometry(110, 64);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.9 });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, 0, 40); // 필드 중심을 Z축으로 이동
  scene.add(grass);

  // === Infield dirt (다이아몬드 형태) ===
  const dirtShape = new THREE.Shape();
  // 다이아몬드 네 꼭지점 (Lay flat rotation.x = -Math.PI/2에 맞추어 음의 Y축으로 정의 -> 양의 Z축으로 프로젝션)
  dirtShape.moveTo(0, 0);             // 홈플레이트
  dirtShape.lineTo(19.4, -19.4);      // 1루
  dirtShape.lineTo(0, -38.8);         // 2루
  dirtShape.lineTo(-19.4, -19.4);     // 3루
  dirtShape.closePath();

  const dirtGeo = new THREE.ShapeGeometry(dirtShape);
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.95 });
  const dirt = new THREE.Mesh(dirtGeo, dirtMat);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.01;
  scene.add(dirt);

  // === Mound (마운드 언덕) ===
  const moundGeo = new THREE.CylinderGeometry(2.5, 3, 0.4, 16);
  const moundMat = new THREE.MeshStandardMaterial({ color: 0xb8956a, roughness: 0.9 });
  const mound = new THREE.Mesh(moundGeo, moundMat);
  mound.position.set(0, 0.2, 18.4); // 60.5 feet = 18.4m
  scene.add(mound);

  // === Mound rubber (투수판) ===
  const rubberGeo = new THREE.BoxGeometry(0.6, 0.05, 0.15);
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const rubber = new THREE.Mesh(rubberGeo, rubberMat);
  rubber.position.set(0, 0.42, 18.4);
  scene.add(rubber);

  // === Bases ===
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x333333 });
  const baseSize = 0.38;

  // Home plate (오각형 플레이트 시뮬레이션)
  const homeGeo = new THREE.BoxGeometry(baseSize * 1.2, 0.05, baseSize * 1.2);
  const home = new THREE.Mesh(homeGeo, baseMat);
  home.position.set(0, 0.03, 0);
  home.name = 'base_home';
  scene.add(home);

  // 1st base
  const firstGeo = new THREE.BoxGeometry(baseSize, 0.05, baseSize);
  const first = new THREE.Mesh(firstGeo, baseMat);
  first.position.set(19.4, 0.03, 19.4);
  first.rotation.y = Math.PI / 4;
  first.name = 'base_first';
  scene.add(first);

  // 2nd base
  const second = new THREE.Mesh(firstGeo.clone(), baseMat);
  second.position.set(0, 0.03, 38.8);
  second.rotation.y = Math.PI / 4;
  second.name = 'base_second';
  scene.add(second);

  // 3rd base
  const third = new THREE.Mesh(firstGeo.clone(), baseMat);
  third.position.set(-19.4, 0.03, 19.4);
  third.rotation.y = Math.PI / 4;
  third.name = 'base_third';
  scene.add(third);

  // === Foul Lines ===
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });

  // 1루 파울 라인 (홈 -> 1루 -> 우측 펜스)
  const foul1Pts = [new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(70, 0.02, 70)];
  const foul1Geo = new THREE.BufferGeometry().setFromPoints(foul1Pts);
  scene.add(new THREE.Line(foul1Geo, lineMat));

  // 3루 파울 라인 (홈 -> 3루 -> 좌측 펜스)
  const foul3Pts = [new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(-70, 0.02, 70)];
  const foul3Geo = new THREE.BufferGeometry().setFromPoints(foul3Pts);
  scene.add(new THREE.Line(foul3Geo, lineMat));

  // === Outfield Fence (외야 펜스 — 홈플레이트 중심 95m~105m 곡선) ===
  const fenceShape: THREE.Vector3[] = [];
  const rBase = 98; // 외야 펜스 거리
  for (let a = Math.PI / 4; a <= 3 * Math.PI / 4; a += 0.02) {
    const angleOffset = Math.sin((a - Math.PI/4) * 2) * 5; // 좌우 중간 펜스 굴곡
    const r = rBase + angleOffset;
    // 홈플레이트(0,0) 기준 외야 곡선
    fenceShape.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }

  // Fence wall
  for (let i = 0; i < fenceShape.length - 1; i++) {
    const wallGeo = new THREE.BoxGeometry(
      fenceShape[i].distanceTo(fenceShape[i + 1]) + 0.1,
      4.5, 0.4,
    );
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a3a5c, roughness: 0.7 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    const mid = fenceShape[i].clone().add(fenceShape[i + 1]).multiplyScalar(0.5);
    wall.position.set(mid.x, 2.25, mid.z);
    wall.lookAt(fenceShape[i + 1].x, 2.25, fenceShape[i + 1].z);
    scene.add(wall);
  }

  // === Stands (관중석 — 홈플레이트 뒷쪽 관람석 및 내외야 관중석) ===
  const seatGeo = new THREE.BoxGeometry(1.5, 0.8, 1.0);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x444455 });
  const seatCount = 450;
  const seats = new THREE.InstancedMesh(seatGeo, seatMat, seatCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < seatCount; i++) {
    // 홈 뒤부터 좌우로 넓게 퍼지는 둥근 관중석 배치
    const angle = -Math.PI / 4 + (Math.PI * 1.5 * i) / seatCount;
    const row = Math.floor(i / 90);
    const r = 105 + row * 4;
    const h = 3 + row * 2.5;

    dummy.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
    dummy.lookAt(0, 0, 40); // 필드 중앙 바라보기
    dummy.updateMatrix();
    seats.setMatrixAt(i, dummy.matrix);

    const colors = [0x074CA1, 0xFE6500, 0x444455, 0x074CA1, 0xFE6500];
    seats.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  }
  scene.add(seats);

  // === Batter's boxes ===
  const boxMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const boxWidth = 1.2;
  const boxDepth = 1.8;
  for (const side of [1, -1]) {
    const pts = [
      new THREE.Vector3(side * 0.7, 0.02, -boxDepth / 2),
      new THREE.Vector3(side * (0.7 + boxWidth), 0.02, -boxDepth / 2),
      new THREE.Vector3(side * (0.7 + boxWidth), 0.02, boxDepth / 2),
      new THREE.Vector3(side * 0.7, 0.02, boxDepth / 2),
      new THREE.Vector3(side * 0.7, 0.02, -boxDepth / 2),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), boxMat));
  }
}

export function createLighting(scene: THREE.Scene): void {
  // Strong ambient for overall brightness
  const ambient = new THREE.AmbientLight(0xc0c8e0, 2.0);
  scene.add(ambient);

  // Main directional light (태양/주조명 역할)
  const sun = new THREE.DirectionalLight(0xfff8f0, 2.5);
  sun.position.set(20, 70, 45);
  sun.target.position.set(0, 0, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);
  scene.add(sun.target);

  // Stadium floodlights (6개 — 밝게)
  const floodPositions = [
    [65, 60, 65], [-65, 60, 65], [65, 60, -10],
    [-65, 60, -10], [0, 70, 95], [0, 50, -40],
  ];
  for (const [x, y, z] of floodPositions) {
    const light = new THREE.SpotLight(0xfff5e6, 4.0, 250, Math.PI / 3, 0.4);
    light.position.set(x, y, z);
    light.target.position.set(0, 0, 38);
    light.castShadow = false;
    scene.add(light);
    scene.add(light.target);
  }

  // Hemisphere
  const hemi = new THREE.HemisphereLight(0xaaccff, 0x44aa44, 1.2);
  scene.add(hemi);

  // Fill light
  const fill = new THREE.DirectionalLight(0x88aa88, 0.5);
  fill.position.set(0, -5, 30);
  scene.add(fill);
}
