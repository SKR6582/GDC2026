// ── 상태 ─────────────────────────────────────────────────
let currentRoomId = 1;
let gridW = 60;
let gridH = 20;
let mapData = [];
let bgImage = null;
let bgImageNatW = 0;
let bgImageNatH = 0;
let theme = 'DESK_WOOD';
let spawn = { x: 2, y: 10 };
let brushMode = 'tile';
let selectedType = 0;
let selectedCell = null;
let isDrawing = false;
let isSelecting = false;
let dirty = false;
let mapListEntries = [];

// DOM
const gridContainer = document.getElementById('grid-container');
const themeSelect = document.getElementById('theme-select');
const inputW = document.getElementById('input-w');
const inputH = document.getElementById('input-h');
const mapSelect = document.getElementById('map-select');
const mapFileInfo = document.getElementById('map-file-info');
const spawnInfo = document.getElementById('spawn-info');
const spawnXInput = document.getElementById('spawn-x');
const spawnYInput = document.getElementById('spawn-y');
const statusBar = document.getElementById('status-bar');
const noSelectionMsg = document.getElementById('no-selection-msg');
const selectionDetails = document.getElementById('selection-details');
const selectedCoords = document.getElementById('selected-coords');
const selectedTypename = document.getElementById('selected-typename');
const eventActionSelect = document.getElementById('event-action');
const eventTriggerSelect = document.getElementById('event-trigger');
const eventArgsFields = document.getElementById('event-args-fields');
const lambdaInput = document.getElementById('lambda-input');
const bgImageInput = document.getElementById('bg-image-input');
const btnSelectBg = document.getElementById('btn-select-bg');
const btnClearBg = document.getElementById('btn-clear-bg');
const bgImageFilename = document.getElementById('bg-image-filename');

// ── 유틸 ─────────────────────────────────────────────────
let statusTimer = null;
function setStatus(msg, type = 'info') {
  statusBar.textContent = msg;
  statusBar.className = `status-bar status-${type}`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { statusBar.className = 'status-bar'; }, 3500);
}

function markDirty() {
  dirty = true;
  const label = currentRoomId === 0 ? 'test_map.json' : `room_${currentRoomId}.json`;
  mapFileInfo.textContent = `${label} *`;
}

function markClean() {
  dirty = false;
  const label = currentRoomId === 0 ? 'test_map.json (레거시)' : `room_${currentRoomId}.json`;
  mapFileInfo.textContent = label;
}

function updateSpawnInfo() {
  spawnInfo.textContent = `시작: (${spawn.x}, ${spawn.y})`;
  spawnXInput.value = spawn.x;
  spawnYInput.value = spawn.y;
}

function getMapState() {
  return {
    room_id: currentRoomId,
    theme,
    bg_image: bgImage,
    spawn: { ...spawn },
    grid_w: gridW,
    grid_h: gridH,
    grid: mapData,
  };
}

function applyMapState(state) {
  currentRoomId = state.room_id;
  theme = state.theme;
  bgImage = state.bg_image;
  spawn = state.spawn ? { ...state.spawn } : { x: 0, y: 0 };
  mapData = state.grid;
  gridW = state.grid_w;
  gridH = state.grid_h;

  themeSelect.value = theme;
  inputW.value = gridW;
  inputH.value = gridH;

  // 드롭다운에 없는 방(아직 파일 없음)도 표시
  if (![...mapSelect.options].some((o) => parseInt(o.value, 10) === currentRoomId)) {
    const opt = document.createElement('option');
    opt.value = currentRoomId;
    opt.textContent = `Room ${currentRoomId} (새 맵)`;
    mapSelect.appendChild(opt);
  }
  mapSelect.value = currentRoomId;

  selectedCell = null;

  updateSpawnInfo();
  updateBackgroundUI();
  updateSelectionUI();
  renderGrid();
  markClean();
}

// ── 스폰 배치 ─────────────────────────────────────────────
function placeSpawnAt(x, y) {
  if (x < 0 || x >= gridW || y < 0 || y >= gridH) return;
  const old = { ...spawn };
  spawn = { x, y };
  updateSpawnInfo();
  markDirty();

  if (old.x !== x || old.y !== y) {
    refreshCellVisual(old.x, old.y);
    refreshCellVisual(x, y);
  }
  setStatus(`시작 위치: (${x}, ${y})`, 'success');
}

// ── 이벤트 UI ─────────────────────────────────────────────
function populateEventActionSelect() {
  eventActionSelect.innerHTML = '';
  for (const [key, def] of Object.entries(EVENT_ACTIONS)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = def.label;
    eventActionSelect.appendChild(opt);
  }
}

function renderEventArgsFields(action) {
  eventArgsFields.innerHTML = '';
  const def = EVENT_ACTIONS[action];
  if (!def || !def.fields.length) return;

  for (const field of def.fields) {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'input-label';
    label.textContent = field.label;
    wrap.appendChild(label);

    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = 'full-input';
      for (const opt of field.options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        input.appendChild(o);
      }
    } else {
      input = document.createElement('input');
      input.type = field.type;
      input.placeholder = field.placeholder || '';
      input.className = 'full-input';
    }
    input.dataset.argKey = field.key;
    wrap.appendChild(input);
    eventArgsFields.appendChild(wrap);
  }
}

function readEventFromUI() {
  const action = eventActionSelect.value;
  if (action === 'none') return null;
  const def = EVENT_ACTIONS[action];
  const args = {};
  for (const field of def.fields) {
    const el = eventArgsFields.querySelector(`[data-arg-key="${field.key}"]`);
    if (!el) continue;
    args[field.key] = field.type === 'number' ? (parseInt(el.value, 10) || 0) : el.value;
    if (field.key === 'value' && field.type === 'select') args[field.key] = el.value === 'true';
  }
  return { trigger: eventTriggerSelect.value, action, args };
}

function fillEventUI(cell) {
  const normalized = normalizeCell(cell, cell.type);
  if (!normalized.event || normalized.event.action === 'none') {
    eventActionSelect.value = 'none';
    renderEventArgsFields('none');
    return;
  }
  const ev = normalized.event;
  eventActionSelect.value = ev.action === 'legacy_lambda' ? 'none' : ev.action;
  renderEventArgsFields(eventActionSelect.value);
  eventTriggerSelect.value = ev.trigger || defaultTriggerForType(cell.type);
  for (const [key, val] of Object.entries(ev.args || {})) {
    const el = eventArgsFields.querySelector(`[data-arg-key="${key}"]`);
    if (el) el.value = typeof val === 'boolean' ? String(val) : val;
  }
}

function applyEventToCell(cell, event) {
  if (event) {
    cell.event = event;
    delete cell.lambda;
  } else {
    delete cell.event;
    delete cell.lambda;
  }
}

function applyQuickPreset(preset) {
  if (!selectedCell) return;
  const { x, y } = selectedCell;
  const cell = mapData[y][x];
  const trigger = cell.type === 4 ? 'step' : 'interact';

  if (preset === 'none') {
    applyEventToCell(cell, null);
  } else if (preset === 'log') {
    const text = prompt('로그 메시지:', '메시지');
    if (text === null) return;
    applyEventToCell(cell, { trigger, action: 'log', args: { text } });
  } else if (preset === 'teleport') {
    const tx = prompt('텔레포트 X:', String(x));
    const ty = prompt('텔레포트 Y:', String(y));
    if (tx === null || ty === null) return;
    applyEventToCell(cell, { trigger: 'step', action: 'teleport', args: { x: parseInt(tx, 10), y: parseInt(ty, 10) } });
  } else if (preset === 'next_room') {
    applyEventToCell(cell, { trigger: 'step', action: 'next_room', args: { target: 'story' } });
  }

  markDirty();
  refreshCellVisual(x, y);
  fillEventUI(cell);
  setStatus(`(${x}, ${y}) 이벤트 적용`, 'success');
}

// ── 배경 ─────────────────────────────────────────────────
function updateBackground() {
  if (bgImage) {
    gridContainer.style.backgroundImage = `url('../assets/images/${bgImage}')`;
    gridContainer.style.backgroundSize = '100% 100%';
    gridContainer.style.backgroundRepeat = 'no-repeat';
    gridContainer.classList.remove('desk-theme-wood', 'desk-theme-white', 'desk-theme-dark');
  } else {
    gridContainer.style.backgroundImage = '';
    gridContainer.className = 'grid-container';
    if (theme === 'DESK_WOOD') gridContainer.classList.add('desk-theme-wood');
    else if (theme === 'DESK_WHITE') gridContainer.classList.add('desk-theme-white');
    else gridContainer.classList.add('desk-theme-dark');
  }
}

function updateBackgroundUI() {
  if (bgImage) {
    bgImageFilename.textContent = bgImage;
    btnClearBg.classList.remove('hidden');
    loadBgImageDimensions();
  } else {
    bgImageFilename.textContent = '배경 없음';
    btnClearBg.classList.add('hidden');
    bgImageNatW = 0;
    bgImageNatH = 0;
    updateBackground();
    renderGrid();
  }
}

function loadBgImageDimensions() {
  const img = new Image();
  img.onload = () => {
    bgImageNatW = img.naturalWidth;
    bgImageNatH = img.naturalHeight;
    updateBackground();
    renderGrid();
  };
  img.onerror = () => { bgImageNatW = 0; bgImageNatH = 0; updateBackground(); renderGrid(); };
  img.src = `../assets/images/${bgImage}?t=${Date.now()}`;
}

// ── 그리드 ───────────────────────────────────────────────
function renderGrid() {
  gridContainer.innerHTML = '';

  if (bgImage && bgImageNatW > 0 && bgImageNatH > 0) {
    gridContainer.style.width = `${bgImageNatW}px`;
    gridContainer.style.height = `${bgImageNatH}px`;
    gridContainer.style.gridTemplateColumns = `repeat(${gridW}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${gridH}, 1fr)`;
  } else {
    gridContainer.style.width = '';
    gridContainer.style.height = '';
    gridContainer.style.gridTemplateColumns = `repeat(${gridW}, 48px)`;
    gridContainer.style.gridTemplateRows = `repeat(${gridH}, 48px)`;
  }

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const cell = mapData[y][x];
      const el = document.createElement('div');
      el.className = `grid-cell type-${cell.type}`;
      el.dataset.x = x;
      el.dataset.y = y;
      if (cellHasInteraction(cell)) el.classList.add('has-event');
      if (spawn.x === x && spawn.y === y) el.classList.add('is-spawn');
      if (selectedCell?.x === x && selectedCell?.y === y) el.classList.add('selected');

      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (e.button === 0) {
          isDrawing = true;
          paintCell(x, y);
        } else if (e.button === 2) {
          isSelecting = true;
          selectCell(x, y);
        }
      });
      el.addEventListener('mouseenter', () => {
        if (isDrawing) paintCell(x, y);
        else if (isSelecting) selectCell(x, y);
      });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      gridContainer.appendChild(el);
    }
  }
}

function paintCell(x, y) {
  if (brushMode === 'spawn') {
    placeSpawnAt(x, y);
    return;
  }

  const prev = mapData[y][x];
  if (selectedType === 0 || selectedType === 1) {
    mapData[y][x] = { type: selectedType };
  } else {
    mapData[y][x] = { type: selectedType, ...(prev.event ? { event: { ...prev.event, args: { ...prev.event.args } } } : {}) };
  }

  markDirty();
  refreshCellVisual(x, y);
  if (selectedCell?.x === x && selectedCell?.y === y) updateSelectionUI();
}

function refreshCellVisual(x, y) {
  const el = gridContainer.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
  if (!el) return;
  const cell = mapData[y][x];
  el.className = 'grid-cell';
  el.classList.add(`type-${cell.type}`);
  if (cellHasInteraction(cell)) el.classList.add('has-event');
  if (spawn.x === x && spawn.y === y) el.classList.add('is-spawn');
  if (selectedCell?.x === x && selectedCell?.y === y) el.classList.add('selected');
}

function selectCell(x, y) {
  selectedCell = { x, y };
  renderGrid();
  updateSelectionUI();
}

function updateSelectionUI() {
  if (!selectedCell) {
    noSelectionMsg.classList.remove('hidden');
    selectionDetails.classList.add('hidden');
    return;
  }
  noSelectionMsg.classList.add('hidden');
  selectionDetails.classList.remove('hidden');
  const { x, y } = selectedCell;
  selectedCoords.textContent = `(${x}, ${y})`;
  selectedTypename.textContent = TILE_TYPES[mapData[y][x].type] || '?';
  fillEventUI(mapData[y][x]);
}

// ── 크기 ─────────────────────────────────────────────────
function resizeGridSilent(newW, newH) {
  const dw = newW - gridW;
  const dh = newH - gridH;
  if (dh > 0) for (let i = 0; i < dh; i++) mapData.push(Array.from({ length: gridW }, () => emptyCell()));
  else if (dh < 0) mapData = mapData.slice(0, newH);
  if (dw > 0) for (let y = 0; y < newH; y++) for (let i = 0; i < dw; i++) mapData[y].push(emptyCell());
  else if (dw < 0) for (let y = 0; y < newH; y++) mapData[y] = mapData[y].slice(0, newW);

  gridW = newW;
  gridH = newH;
  if (spawn.x >= gridW) spawn.x = gridW - 1;
  if (spawn.y >= gridH) spawn.y = gridH - 1;
  updateSpawnInfo();
  selectedCell = null;
  markDirty();
  updateSelectionUI();
  renderGrid();
}

let _sizeTimer = null;
function applySizeChangeLive() {
  clearTimeout(_sizeTimer);
  _sizeTimer = setTimeout(() => {
    const w = parseInt(inputW.value, 10);
    const h = parseInt(inputH.value, 10);
    if (isNaN(w) || w < 1 || w > 150 || isNaN(h) || h < 1 || h > 100) return;
    if (w === gridW && h === gridH) return;
    resizeGridSilent(w, h);
  }, 400);
}

// ── 맵 전환 ───────────────────────────────────────────────
async function refreshMapList(selectRoomId = null) {
  const result = await window.electronAPI.listMaps();
  if (!result.success) return;

  mapListEntries = result.maps;
  mapSelect.innerHTML = '';

  for (const entry of result.maps) {
    const opt = document.createElement('option');
    opt.value = entry.roomId;
    opt.textContent = entry.legacy
      ? entry.filename
      : `Room ${entry.roomId}`;
    mapSelect.appendChild(opt);
  }

  if (selectRoomId != null) mapSelect.value = selectRoomId;
}

async function confirmAndSwitch(targetId) {
  if (targetId < 1 && targetId !== 0) return false;
  if (dirty) {
    const saveFirst = confirm('저장하지 않은 변경이 있습니다.\n확인=저장 후 이동 / 취소=이동 안 함');
    if (!saveFirst) return false;
    await saveMapData();
    if (dirty) return false;
  }
  return true;
}

async function loadMapData(roomId, skipConfirm = false) {
  const id = roomId != null ? parseInt(roomId, 10) : parseInt(mapSelect.value, 10);
  if (!skipConfirm && dirty) {
    if (!(await confirmAndSwitch(id))) return;
  }

  try {
    const result = await window.electronAPI.loadMap(id);
    if (!result.success) {
      setStatus(`로드 실패: ${result.error}`, 'error');
      return;
    }
    const state = normalizeMapData(result.data, id || 1);
    state.room_id = id;
    applyMapState(state);
    await refreshMapList(id);
    setStatus(`Room ${id === 0 ? 'legacy' : id} 편집 중`, 'success');
  } catch (e) {
    setStatus('맵 로드 오류', 'error');
  }
}

async function switchMapDelta(delta) {
  const base = currentRoomId === 0 ? 1 : currentRoomId;
  const target = base + delta;
  if (target < 1) {
    setStatus('첫 번째 맵입니다', 'warn');
    return;
  }
  await loadMapData(target);
}

async function saveMapData() {
  spawn.x = parseInt(spawnXInput.value, 10) || 0;
  spawn.y = parseInt(spawnYInput.value, 10) || 0;
  theme = themeSelect.value;

  const state = getMapState();
  const validation = validateMap(state);
  if (!validation.valid) {
    alert('저장 불가:\n' + validation.errors.join('\n'));
    return;
  }
  if (validation.warnings.length && !confirm('경고:\n' + validation.warnings.join('\n') + '\n\n저장할까요?')) return;

  const result = await window.electronAPI.saveMap(currentRoomId, mapToPayload(state));
  if (result.success) {
    markClean();
    setStatus('저장됨', 'success');
    await refreshMapList(currentRoomId);
  } else {
    setStatus(result.error, 'error');
  }
}

async function createNewMap() {
  const roomId = parseInt(prompt('새 맵 방 번호:', String(currentRoomId + 1)), 10);
  if (!roomId || roomId < 1) return;

  if (dirty && !confirm('현재 맵 변경사항을 버리고 새 맵을 만드시겠습니까?')) return;

  const result = await window.electronAPI.createMap(roomId, parseInt(inputW.value, 10) || 60, parseInt(inputH.value, 10) || 20);
  if (!result.success) {
    setStatus(result.error, 'error');
    return;
  }
  await refreshMapList(roomId);
  const state = normalizeMapData(result.data, roomId);
  state.room_id = roomId;
  applyMapState(state);
  setStatus(`room_${roomId}.json 생성`, 'success');
}

async function importGridAligner() {
  try {
    const imported = parseGridAlignerJson(await navigator.clipboard.readText());
    if (imported.grid_w) inputW.value = imported.grid_w;
    if (imported.grid_h) inputH.value = imported.grid_h;
    if (imported.grid_w || imported.grid_h) applySizeChangeLive();
    if (imported.bg_image) { bgImage = imported.bg_image; updateBackgroundUI(); markDirty(); }
    setStatus('aligner 설정 적용', 'success');
  } catch (e) {
    setStatus('클립보드 JSON 오류', 'error');
  }
}

// ── 이벤트 바인딩 ─────────────────────────────────────────
window.addEventListener('mouseup', () => { isDrawing = false; isSelecting = false; });

window.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveMapData(); }
  if (e.key === '[') switchMapDelta(-1);
  if (e.key === ']') switchMapDelta(1);
});

document.querySelectorAll('.palette-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.palette-item.active')?.classList.remove('active');
    btn.classList.add('active');
    brushMode = btn.dataset.mode;
    if (brushMode === 'tile') selectedType = parseInt(btn.dataset.type, 10);
    setStatus(brushMode === 'spawn' ? '스폰 브러시: 클릭으로 시작 위치 지정' : `브러시: ${btn.textContent.trim()}`, 'info');
  });
});

document.querySelectorAll('.btn-chip').forEach((btn) => {
  btn.addEventListener('click', () => applyQuickPreset(btn.dataset.preset));
});

document.getElementById('btn-prev-map').addEventListener('click', () => switchMapDelta(-1));
document.getElementById('btn-next-map').addEventListener('click', () => switchMapDelta(1));
document.getElementById('btn-save-map').addEventListener('click', saveMapData);
document.getElementById('btn-new-map').addEventListener('click', createNewMap);
mapSelect.addEventListener('change', () => loadMapData(parseInt(mapSelect.value, 10)));

themeSelect.addEventListener('change', () => { theme = themeSelect.value; updateBackground(); markDirty(); });
inputW.addEventListener('input', applySizeChangeLive);
inputH.addEventListener('input', applySizeChangeLive);

btnSelectBg.addEventListener('click', () => bgImageInput.click());
btnClearBg.addEventListener('click', () => { bgImage = null; bgImageInput.value = ''; updateBackgroundUI(); markDirty(); });
bgImageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file?.path) return;
  const r = await window.electronAPI.copyBgImage(file.path);
  if (r.success) { bgImage = r.filename; updateBackgroundUI(); markDirty(); setStatus('배경 적용', 'success'); }
});
document.getElementById('btn-import-aligner').addEventListener('click', importGridAligner);
document.getElementById('btn-reset-map').addEventListener('click', () => {
  if (!confirm('맵을 모두 길 타일로 비울까요?')) return;
  mapData = Array.from({ length: gridH }, () => Array.from({ length: gridW }, () => emptyCell()));
  selectedCell = null;
  markDirty();
  updateSelectionUI();
  renderGrid();
});

populateEventActionSelect();

(async () => {
  await refreshMapList(1);
  await loadMapData(1, true);
})();
