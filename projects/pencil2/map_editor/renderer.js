// 맵 에디터 상태 관리
let mapState = {
  name: "New Room",
  width: 16,
  height: 11,
  tile_size: 48,
  tiles: [],
  player_spawn: { x: 2, y: 5 },
  monsters: [],
  portals: [],
  puzzles: [],
  interacts: [],
  background_image: "background.png"
};

let currentTool = { mode: "tile", val: 0 };
let bgImageObj = null;
let bgSourcePath = null;
let bgSettings = { scale: 1.0, ox: 0, oy: 0, alpha: 0.9 };

// 뷰포트 팬 & 줌 상태
let viewport = {
  zoom: 1.0,
  minZoom: 0.25,
  maxZoom: 3.5,
  panX: 40,
  panY: 40,
  isPanning: false,
  lastMouseX: 0,
  lastMouseY: 0,
  spacePressed: false
};

const canvasContainer = document.getElementById("canvas-wrapper");
const canvas = document.getElementById("editor-canvas");
const ctx = canvas.getContext("2d");
let isMouseDown = false;
let mouseButton = 0; // 0: 좌클릭, 1: 휠클릭, 2: 우클릭

// 초기화
window.addEventListener("DOMContentLoaded", async () => {
  resizeContainerCanvas();
  window.addEventListener("resize", resizeContainerCanvas);
  
  initGrid(16, 11);
  setupEvents();
  await refreshRoomList();
});

function resizeContainerCanvas() {
  canvas.width = canvasContainer.clientWidth;
  canvas.height = canvasContainer.clientHeight;
  render();
}

function initGrid(w, h) {
  mapState.width = w;
  mapState.height = h;
  mapState.tiles = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      row.push((x === 0 || x === w - 1 || y === 0 || y === h - 1) ? 1 : 0);
    }
    mapState.tiles.push(row);
  }
  centerMapInViewport();
  render();
}

function centerMapInViewport() {
  const mapW = mapState.width * mapState.tile_size * viewport.zoom;
  const mapH = mapState.height * mapState.tile_size * viewport.zoom;
  viewport.panX = Math.max(20, (canvas.width - mapW) / 2);
  viewport.panY = Math.max(20, (canvas.height - mapH) / 2);
}

// 화면 좌표 -> 타일 좌표 변환
function screenToTile(screenX, screenY) {
  const rect = canvas.getBoundingClientRect();
  const mouseCanvasX = screenX - rect.left;
  const mouseCanvasY = screenY - rect.top;
  
  const worldX = (mouseCanvasX - viewport.panX) / viewport.zoom;
  const worldY = (mouseCanvasY - viewport.panY) / viewport.zoom;
  
  return {
    tx: Math.floor(worldX / mapState.tile_size),
    ty: Math.floor(worldY / mapState.tile_size),
    worldX,
    worldY
  };
}

function setupEvents() {
  // 팔레트 버튼 이벤트
  document.querySelectorAll(".palette-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".palette-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTool = {
        mode: btn.dataset.tool,
        val: isNaN(btn.dataset.val) ? btn.dataset.val : parseInt(btn.dataset.val)
      };
      updateStatus(0, 0);
    });
  });

  // 그리드 크기 적용
  document.getElementById("btn-apply-grid").addEventListener("click", () => {
    const w = parseInt(document.getElementById("grid-w").value);
    const h = parseInt(document.getElementById("grid-h").value);
    const ts = parseInt(document.getElementById("tile-size").value);
    mapState.tile_size = ts;
    initGrid(w, h);
  });

  // 뷰포트 줌 버튼들
  document.getElementById("btn-zoom-in").addEventListener("click", () => {
    applyZoom(viewport.zoom * 1.2, canvas.width / 2, canvas.height / 2);
  });
  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    applyZoom(viewport.zoom / 1.2, canvas.width / 2, canvas.height / 2);
  });
  document.getElementById("btn-zoom-reset").addEventListener("click", () => {
    viewport.zoom = 1.0;
    centerMapInViewport();
    render();
  });

  // 배경 이미지 정렬 컨트롤
  document.getElementById("bg-scale").addEventListener("input", (e) => {
    bgSettings.scale = parseFloat(e.target.value);
    document.getElementById("val-bg-scale").innerText = bgSettings.scale.toFixed(2);
    render();
  });
  document.getElementById("bg-ox").addEventListener("input", (e) => {
    bgSettings.ox = parseInt(e.target.value);
    document.getElementById("val-bg-ox").innerText = bgSettings.ox;
    render();
  });
  document.getElementById("bg-oy").addEventListener("input", (e) => {
    bgSettings.oy = parseInt(e.target.value);
    document.getElementById("val-bg-oy").innerText = bgSettings.oy;
    render();
  });
  document.getElementById("bg-alpha").addEventListener("input", (e) => {
    bgSettings.alpha = parseFloat(e.target.value);
    document.getElementById("val-bg-alpha").innerText = bgSettings.alpha.toFixed(2);
    render();
  });

  // 배경 파일 선택
  document.getElementById("btn-select-bg").addEventListener("click", async () => {
    if (window.api && window.api.selectBgImage) {
      const filePath = await window.api.selectBgImage();
      if (filePath) {
        bgSourcePath = filePath;
        bgImageObj = new Image();
        bgImageObj.src = `file://${filePath}`;
        bgImageObj.onload = () => render();
      }
    }
  });

  // 룸 불러오기 / 저장 / 신규
  document.getElementById("btn-load-room").addEventListener("click", loadSelectedRoom);
  document.getElementById("btn-new-room").addEventListener("click", () => {
    const roomName = prompt("새 룸 폴더명을 입력하세요 (예: room_5):", "room_5");
    if (roomName) {
      initGrid(16, 11);
      document.getElementById("room-select").innerHTML += `<option value="${roomName}">${roomName}</option>`;
      document.getElementById("room-select").value = roomName;
    }
  });
  document.getElementById("btn-save-room").addEventListener("click", saveCurrentRoom);

  // 스페이스바 키로 패닝 모드 토글
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !viewport.spacePressed && e.target.tagName !== "INPUT") {
      viewport.spacePressed = true;
      canvas.style.cursor = "grab";
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      viewport.spacePressed = false;
      canvas.style.cursor = "crosshair";
    }
  });

  // 휠 스크롤 줌 인 / 줌 아웃
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const rect = canvas.getBoundingClientRect();
    applyZoom(viewport.zoom * zoomFactor, e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  // 캔버스 마우스 다운
  canvas.addEventListener("mousedown", (e) => {
    mouseButton = e.button;
    isMouseDown = true;
    viewport.lastMouseX = e.clientX;
    viewport.lastMouseY = e.clientY;

    // 휠 클릭(1) 또는 스페이스바 누른 상태의 좌클릭은 화면 패닝
    if (e.button === 1 || (e.button === 0 && viewport.spacePressed)) {
      viewport.isPanning = true;
      canvas.style.cursor = "grabbing";
      return;
    }

    if (e.button === 0) {
      // 일반 좌클릭 페인팅
      handleCanvasClick(e);
    } else if (e.button === 2) {
      // 우클릭 삭제
      handleCanvasErase(e);
    }
  });

  window.addEventListener("mouseup", () => {
    isMouseDown = false;
    if (viewport.isPanning) {
      viewport.isPanning = false;
      canvas.style.cursor = viewport.spacePressed ? "grab" : "crosshair";
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    const { tx, ty } = screenToTile(e.clientX, e.clientY);
    updateStatus(tx, ty);

    if (viewport.isPanning) {
      const dx = e.clientX - viewport.lastMouseX;
      const dy = e.clientY - viewport.lastMouseY;
      viewport.panX += dx;
      viewport.panY += dy;
      viewport.lastMouseX = e.clientX;
      viewport.lastMouseY = e.clientY;
      render();
      return;
    }

    if (isMouseDown) {
      if (mouseButton === 0 && !viewport.spacePressed) {
        handleCanvasClick(e);
      } else if (mouseButton === 2) {
        handleCanvasErase(e);
      }
    }
  });

  // 우클릭 컨텍스트 메뉴 방지
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

function applyZoom(newZoom, centerX, centerY) {
  const clampedZoom = Math.max(viewport.minZoom, Math.min(viewport.maxZoom, newZoom));
  if (clampedZoom === viewport.zoom) return;

  // 마우스 커서 위치를 중심으로 줌 인/아웃 되도록 패닝 위치 보정
  const scaleChange = clampedZoom / viewport.zoom;
  viewport.panX = centerX - (centerX - viewport.panX) * scaleChange;
  viewport.panY = centerY - (centerY - viewport.panY) * scaleChange;
  viewport.zoom = clampedZoom;

  document.getElementById("btn-zoom-reset").innerText = `${Math.round(viewport.zoom * 100)}%`;
  render();
}

function handleCanvasClick(e) {
  const { tx, ty } = screenToTile(e.clientX, e.clientY);
  if (tx < 0 || tx >= mapState.width || ty < 0 || ty >= mapState.height) return;

  if (currentTool.mode === "tile") {
    mapState.tiles[ty][tx] = currentTool.val;
    if (currentTool.val === 4) {
      const targetRoom = document.getElementById("prop-portal-target").value || "room_2";
      const reqItem = document.getElementById("prop-portal-item").value || null;
      mapState.portals = mapState.portals.filter(p => !(p.x === tx && p.y === ty));
      const pEntry = { x: tx, y: ty, target_room: targetRoom };
      if (reqItem) pEntry.requires_item = reqItem;
      mapState.portals.push(pEntry);
    }
  } else if (currentTool.mode === "spawn") {
    mapState.player_spawn = { x: tx, y: ty };
  } else if (currentTool.mode === "entity") {
    const val = currentTool.val;
    if (val === "puzzle") {
      mapState.puzzles = mapState.puzzles.filter(p => !(p.x === tx && p.y === ty));
      mapState.puzzles.push({
        id: `puzzle_${tx}_${ty}`,
        x: tx,
        y: ty,
        question: "삼각자의 남은 한 각은? (90°, 60°, ?°)",
        options: ["30°", "45°", "60°", "90°"],
        correct_index: 0
      });
    } else {
      mapState.monsters = mapState.monsters.filter(m => !(m.x === tx && m.y === ty));
      mapState.monsters.push({ type: val, x: tx, y: ty });
    }
  }
  render();
}

function handleCanvasErase(e) {
  const { tx, ty } = screenToTile(e.clientX, e.clientY);
  if (tx < 0 || tx >= mapState.width || ty < 0 || ty >= mapState.height) return;

  mapState.monsters = mapState.monsters.filter(m => !(m.x === tx && m.y === ty));
  mapState.portals = mapState.portals.filter(p => !(p.x === tx && p.y === ty));
  mapState.puzzles = mapState.puzzles.filter(p => !(p.x === tx && p.y === ty));
  mapState.tiles[ty][tx] = 0;
  render();
}

function updateStatus(tx, ty) {
  const zoomPct = Math.round(viewport.zoom * 100);
  document.getElementById("status-bar").innerText = `타일: [${tx}, ${ty}] | 줌: ${zoomPct}% | 툴: ${currentTool.mode} (${currentTool.val})`;
}

async function refreshRoomList() {
  if (window.api && window.api.scanRooms) {
    const rooms = await window.api.scanRooms();
    const select = document.getElementById("room-select");
    select.innerHTML = rooms.map(r => `<option value="${r}">${r}</option>`).join("");
    if (rooms.length > 0) {
      await loadSelectedRoom();
    }
  }
}

async function loadSelectedRoom() {
  const select = document.getElementById("room-select");
  const roomName = select.value;
  if (!roomName || !window.api) return;

  const res = await window.api.loadRoom(roomName);
  if (res.success) {
    mapState = res.data;
    document.getElementById("grid-w").value = mapState.width;
    document.getElementById("grid-h").value = mapState.height;
    document.getElementById("tile-size").value = mapState.tile_size;

    if (mapState._has_bg && mapState._bg_abs_path) {
      bgImageObj = new Image();
      bgImageObj.src = `file://${mapState._bg_abs_path}?t=${Date.now()}`;
      bgImageObj.onload = () => render();
    } else {
      bgImageObj = null;
    }
    centerMapInViewport();
    render();
  }
}

async function saveCurrentRoom() {
  const select = document.getElementById("room-select");
  const roomName = select.value || "room_1";
  if (!window.api) return;

  const res = await window.api.saveRoom({
    roomName,
    mapData: mapState,
    bgSourcePath
  });
  alert(res.success ? `성공: ${res.message}` : `저장 실패: ${res.error}`);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ts = mapState.tile_size;

  ctx.save();
  // 뷰포트 트랜스폼 적용 (팬 & 줌)
  ctx.translate(viewport.panX, viewport.panY);
  ctx.scale(viewport.zoom, viewport.zoom);

  const mapW = mapState.width * ts;
  const mapH = mapState.height * ts;

  // 1. 배경 이미지 렌더링 (Aligner 프리뷰)
  if (bgImageObj && bgImageObj.complete) {
    ctx.save();
    ctx.globalAlpha = bgSettings.alpha;
    const bw = bgImageObj.width * bgSettings.scale;
    const bh = bgImageObj.height * bgSettings.scale;
    ctx.drawImage(bgImageObj, bgSettings.ox, bgSettings.oy, bw, bh);
    ctx.restore();
  } else {
    // 기본 나무 책상 색상
    ctx.fillStyle = "#b8895c";
    ctx.fillRect(0, 0, mapW, mapH);
  }

  // 2. 타일 레이어 렌더링
  for (let y = 0; y < mapState.height; y++) {
    for (let x = 0; x < mapState.width; x++) {
      const tile = mapState.tiles[y] ? mapState.tiles[y][x] : 0;
      const px = x * ts;
      const py = y * ts;

      if (tile === 1) { // 벽
        ctx.fillStyle = "#4a3428";
        ctx.fillRect(px, py, ts, ts);
        ctx.strokeStyle = "#30221a";
        ctx.strokeRect(px, py, ts, ts);
      } else if (tile === 4) { // 포탈
        ctx.fillStyle = "rgba(156, 60, 240, 0.6)";
        ctx.beginPath();
        ctx.arc(px + ts / 2, py + ts / 2, ts / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 5) { // 잠긴 문
        ctx.fillStyle = "rgba(184, 42, 42, 0.8)";
        ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
      }

      // 그리드 가이드라인
      ctx.strokeStyle = "rgba(140, 100, 65, 0.4)";
      ctx.strokeRect(px, py, ts, ts);
    }
  }

  // 3. 플레이어 스폰 (연필깎이)
  if (mapState.player_spawn) {
    const sp = mapState.player_spawn;
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(sp.x * ts + 8, sp.y * ts + 8, ts - 16, ts - 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("SPAWN", sp.x * ts + 4, sp.y * ts + ts / 2 + 4);
  }

  // 4. 몬스터 렌더링
  mapState.monsters.forEach(m => {
    const mx = m.x * ts;
    const my = m.y * ts;
    ctx.beginPath();
    ctx.arc(mx + ts / 2, my + ts / 2, ts / 2 - 6, 0, Math.PI * 2);
    
    if (m.type === "pencil") ctx.fillStyle = "#eab308";
    else if (m.type === "lead") ctx.fillStyle = "#64748b";
    else if (m.type === "spring") ctx.fillStyle = "#d97706";
    else if (m.type === "highlighter") ctx.fillStyle = "#ec4899";
    else if (m.type === "eraser") ctx.fillStyle = "#06b6d4";
    else if (m.type === "boss") ctx.fillStyle = "#8b5cf6";
    
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.fillText(m.type.slice(0, 4), mx + 6, my + ts / 2 + 3);
  });

  // 5. 퍼즐 오브젝트
  mapState.puzzles.forEach(p => {
    const px = p.x * ts;
    const py = p.y * ts;
    ctx.fillStyle = "#e5a93c";
    ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
    ctx.fillStyle = "#000";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("?", px + ts / 2 - 4, py + ts / 2 + 5);
  });

  // 맵 외곽 테두리 강조
  ctx.strokeStyle = "#e5a93c";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, mapW, mapH);

  ctx.restore();
}
