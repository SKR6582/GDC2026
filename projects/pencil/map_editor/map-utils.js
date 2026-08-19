/**
 * map-utils.js — 맵 스키마 검증, 이벤트 정의, 레거시 lambda 마이그레이션
 */

const MAP_VERSION = 1;

const TILE_TYPES = {
  0: '길 (Path)',
  1: '지우개 벽 (Eraser Wall)',
  2: '화초 장식 (Deco)',
  3: '상호작용 상자 (Box)',
  4: '포탈 발판 (Portal)',
};

const EVENT_ACTIONS = {
  none: {
    label: '없음',
    defaultTrigger: 'interact',
    fields: [],
  },
  log: {
    label: '로그 메시지',
    defaultTrigger: 'interact',
    fields: [{ key: 'text', label: '메시지', type: 'text', placeholder: '표시할 텍스트' }],
  },
  teleport: {
    label: '텔레포트',
    defaultTrigger: 'step',
    fields: [
      { key: 'x', label: 'X', type: 'number', placeholder: '0' },
      { key: 'y', label: 'Y', type: 'number', placeholder: '0' },
    ],
  },
  dialogue: {
    label: '대화 시작',
    defaultTrigger: 'interact',
    fields: [{ key: 'story_id', label: '스토리 ID', type: 'text', placeholder: 'note_01' }],
  },
  next_room: {
    label: '다음 방',
    defaultTrigger: 'step',
    fields: [
      {
        key: 'target',
        label: '전환',
        type: 'select',
        options: [
          { value: 'story', label: '스토리 씬' },
          { value: 'explore', label: '탐험 씬' },
        ],
      },
    ],
  },
  set_flag: {
    label: '플래그 설정',
    defaultTrigger: 'interact',
    fields: [
      { key: 'key', label: '키', type: 'text', placeholder: 'got_key' },
      {
        key: 'value',
        label: '값',
        type: 'select',
        options: [
          { value: 'true', label: 'true' },
          { value: 'false', label: 'false' },
        ],
      },
    ],
  },
};

const THEMES = ['DESK_WOOD', 'DESK_WHITE', 'DESK_DARK'];

function emptyCell() {
  return { type: 0 };
}

function defaultTriggerForType(type) {
  return type === 4 ? 'step' : 'interact';
}

function migrateLambdaToEvent(lambdaStr, cellType) {
  if (!lambdaStr || lambdaStr === 'None') return null;

  const teleportMatch = lambdaStr.match(/teleport_player\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (teleportMatch) {
    return {
      trigger: defaultTriggerForType(cellType),
      action: 'teleport',
      args: { x: parseInt(teleportMatch[1], 10), y: parseInt(teleportMatch[2], 10) },
    };
  }

  const logMatch = lambdaStr.match(/log_message\s*\(\s*['"](.+?)['"]\s*\)/);
  if (logMatch) {
    return {
      trigger: defaultTriggerForType(cellType),
      action: 'log',
      args: { text: logMatch[1] },
    };
  }

  return {
    trigger: defaultTriggerForType(cellType),
    action: 'legacy_lambda',
    args: { code: lambdaStr },
  };
}

function normalizeCell(cell, cellType) {
  const type = cell?.type ?? cellType ?? 0;
  const normalized = { type };

  if (cell?.event && cell.event.action && cell.event.action !== 'none') {
    normalized.event = {
      trigger: cell.event.trigger || defaultTriggerForType(type),
      action: cell.event.action,
      args: { ...(cell.event.args || {}) },
    };
    return normalized;
  }

  if (cell?.lambda && cell.lambda !== 'None') {
    const migrated = migrateLambdaToEvent(cell.lambda, type);
    if (migrated) {
      normalized.event = migrated;
    }
    return normalized;
  }

  return normalized;
}

function cellHasInteraction(cell) {
  if (!cell) return false;
  if (cell.event && cell.event.action && cell.event.action !== 'none') return true;
  return !!(cell.lambda && cell.lambda !== 'None');
}

function cellToExport(cell) {
  const normalized = normalizeCell(cell, cell.type);
  const exported = { type: normalized.type };

  if (normalized.event) {
    if (normalized.event.action === 'legacy_lambda') {
      exported.lambda = normalized.event.args.code;
    } else if (normalized.event.action !== 'none') {
      exported.event = normalized.event;
    }
  }

  return exported;
}

function createEmptyGrid(width, height) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => emptyCell())
  );
}

function createDefaultMap(roomId = 1, width = 60, height = 20) {
  const grid = createEmptyGrid(width, height);

  for (let x = 0; x < width; x++) {
    grid[0][x] = { type: 1 };
    grid[height - 1][x] = { type: 1 };
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = { type: 1 };
    grid[y][width - 1] = { type: 1 };
  }

  const spawnX = 2;
  const spawnY = Math.floor(height / 2);
  grid[spawnY][spawnX] = { type: 0 };

  grid[5][10] = {
    type: 3,
    event: { trigger: 'interact', action: 'log', args: { text: '보물 상자를 열었습니다!' } },
  };
  grid[height - 2][width - 3] = {
    type: 4,
    event: { trigger: 'step', action: 'next_room', args: { target: 'story' } },
  };

  return {
    version: MAP_VERSION,
    room_id: roomId,
    theme: 'DESK_WOOD',
    bg_image: null,
    spawn: { x: spawnX, y: spawnY },
    grid_w: width,
    grid_h: height,
    grid,
  };
}

function normalizeMapData(raw, fallbackRoomId = 1) {
  let grid;
  let meta = {};

  if (raw && !Array.isArray(raw) && raw.grid) {
    grid = raw.grid;
    meta = {
      version: raw.version ?? MAP_VERSION,
      room_id: raw.room_id ?? fallbackRoomId,
      theme: raw.theme ?? 'DESK_WOOD',
      bg_image: raw.bg_image === 'None' || !raw.bg_image ? null : raw.bg_image,
      spawn: raw.spawn ?? null,
      grid_w: raw.grid_w,
      grid_h: raw.grid_h,
    };
  } else if (Array.isArray(raw)) {
    grid = raw;
    meta = {
      version: MAP_VERSION,
      room_id: fallbackRoomId,
      theme: 'DESK_WOOD',
      bg_image: null,
      spawn: null,
    };
  } else {
    return createDefaultMap(fallbackRoomId);
  }

  const gridH = grid.length;
  const gridW = gridH > 0 ? grid[0].length : 0;
  const normalizedGrid = [];

  for (let y = 0; y < gridH; y++) {
    const row = [];
    const rowLen = grid[y]?.length ?? 0;
    for (let x = 0; x < gridW; x++) {
      const cell = x < rowLen ? grid[y][x] : { type: 0 };
      row.push(normalizeCell(cell, cell?.type ?? 0));
    }
    normalizedGrid.push(row);
  }

  let spawn = meta.spawn;
  if (!spawn) {
    outer: for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (normalizedGrid[y][x].type === 0) {
          spawn = { x, y };
          break outer;
        }
      }
    }
  }

  return {
    version: meta.version,
    room_id: meta.room_id,
    theme: THEMES.includes(meta.theme) ? meta.theme : 'DESK_WOOD',
    bg_image: meta.bg_image,
    spawn: spawn ?? { x: 0, y: 0 },
    grid_w: gridW,
    grid_h: gridH,
    grid: normalizedGrid,
  };
}

function mapToPayload(mapState) {
  const grid = mapState.grid.map((row) => row.map((cell) => cellToExport(cell)));

  return {
    version: MAP_VERSION,
    room_id: mapState.room_id,
    theme: mapState.theme,
    bg_image: mapState.bg_image,
    spawn: mapState.spawn,
    grid_w: mapState.grid_w,
    grid_h: mapState.grid_h,
    grid,
  };
}

function validateMap(mapState) {
  const errors = [];
  const warnings = [];

  if (!mapState.grid || mapState.grid.length === 0) {
    errors.push('그리드가 비어 있습니다.');
    return { valid: false, errors, warnings };
  }

  const h = mapState.grid.length;
  const w = mapState.grid[0].length;

  for (let y = 0; y < h; y++) {
    if (mapState.grid[y].length !== w) {
      errors.push(`행 ${y}의 열 수가 다릅니다 (${mapState.grid[y].length} ≠ ${w}).`);
    }
  }

  if (mapState.spawn) {
    const { x, y } = mapState.spawn;
    if (x < 0 || x >= w || y < 0 || y >= h) {
      errors.push(`스폰 좌표 (${x}, ${y})가 맵 범위를 벗어났습니다.`);
    } else if (mapState.grid[y][x].type === 1) {
      warnings.push(`스폰 좌표 (${x}, ${y})가 벽 위에 있습니다.`);
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = mapState.grid[y][x];
      const type = cell.type ?? 0;

      if (type < 0 || type > 4) {
        errors.push(`(${x}, ${y}) 타일 타입이 유효하지 않습니다: ${type}`);
      }

      if ((type === 3 || type === 4) && !cellHasInteraction(cell)) {
        warnings.push(`(${x}, ${y}) ${TILE_TYPES[type]}에 이벤트가 없습니다.`);
      }

      if (cell.event?.action === 'teleport') {
        const tx = cell.event.args?.x;
        const ty = cell.event.args?.y;
        if (tx == null || ty == null || tx < 0 || tx >= w || ty < 0 || ty >= h) {
          errors.push(`(${x}, ${y}) 텔레포트 목표가 맵 범위를 벗어났습니다.`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function parseGridAlignerJson(text) {
  const data = JSON.parse(text);
  const result = {};

  if (data.grid_w) result.grid_w = parseInt(data.grid_w, 10);
  if (data.grid_h) result.grid_h = parseInt(data.grid_h, 10);
  if (data.bg_image && data.bg_image !== 'None') result.bg_image = data.bg_image;

  return result;
}

function eventSummary(cell) {
  if (!cellHasInteraction(cell)) return '';
  const cellNorm = normalizeCell(cell, cell.type);
  const ev = cellNorm.event;
  if (!ev) return 'legacy';

  if (ev.action === 'legacy_lambda') return 'legacy λ';
  const actionLabel = EVENT_ACTIONS[ev.action]?.label || ev.action;
  return actionLabel;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MAP_VERSION,
    TILE_TYPES,
    EVENT_ACTIONS,
    THEMES,
    emptyCell,
    defaultTriggerForType,
    migrateLambdaToEvent,
    normalizeCell,
    cellHasInteraction,
    cellToExport,
    createEmptyGrid,
    createDefaultMap,
    normalizeMapData,
    mapToPayload,
    validateMap,
    parseGridAlignerJson,
    eventSummary,
  };
}
