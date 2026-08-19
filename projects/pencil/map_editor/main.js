const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { createDefaultMap, normalizeMapData } = require('./map-utils');

const MAPS_DIR = path.join(__dirname, '..', 'assets', 'data', 'maps');
const LEGACY_MAP_PATH = path.join(__dirname, '..', 'assets', 'data', 'test_map.json');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

function ensureMapsDir() {
  if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true });
  }
}

function mapPathForRoom(roomId) {
  return path.join(MAPS_DIR, `room_${roomId}.json`);
}

function parseRoomIdFromFilename(filename) {
  const match = filename.match(/^room_(\d+)\.json$/);
  return match ? parseInt(match[1], 10) : null;
}

function listMapEntries() {
  ensureMapsDir();
  const entries = [];

  const files = fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files.sort()) {
    const roomId = parseRoomIdFromFilename(file);
    if (roomId != null) {
      entries.push({ roomId, filename: file, path: path.join(MAPS_DIR, file) });
    }
  }

  if (fs.existsSync(LEGACY_MAP_PATH)) {
    entries.push({
      roomId: 0,
      filename: 'test_map.json (레거시)',
      path: LEGACY_MAP_PATH,
      legacy: true,
    });
  }

  return entries;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

ipcMain.handle('list-maps', async () => {
  try {
    return { success: true, maps: listMapEntries() };
  } catch (error) {
    console.error('list-maps failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-map', async (_event, roomId) => {
  try {
    let filePath;
    if (roomId === 0 || roomId === 'legacy') {
      filePath = LEGACY_MAP_PATH;
    } else {
      filePath = mapPathForRoom(roomId);
    }

    if (!fs.existsSync(filePath)) {
      const newMap = createDefaultMap(roomId || 1);
      return { success: true, data: newMap, created: true };
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const fallbackRoom = roomId === 0 || roomId === 'legacy' ? 1 : parseInt(roomId, 10) || 1;
    const data = normalizeMapData(raw, fallbackRoom);
    return { success: true, data, created: false };
  } catch (error) {
    console.error('load-map failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-map', async (_event, roomId, mapData) => {
  try {
    ensureMapsDir();
    const filePath = roomId === 0 ? LEGACY_MAP_PATH : mapPathForRoom(roomId);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(mapData, null, 4), 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('save-map failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-map', async (_event, roomId, width, height) => {
  try {
    const id = parseInt(roomId, 10);
    if (!id || id < 1) {
      return { success: false, error: '방 번호는 1 이상이어야 합니다.' };
    }

    const filePath = mapPathForRoom(id);
    if (fs.existsSync(filePath)) {
      return { success: false, error: `room_${id}.json 파일이 이미 존재합니다.` };
    }

    const w = Math.min(Math.max(parseInt(width, 10) || 60, 1), 150);
    const h = Math.min(Math.max(parseInt(height, 10) || 20, 1), 100);
    const data = createDefaultMap(id, w, h);

    ensureMapsDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    return { success: true, data };
  } catch (error) {
    console.error('create-map failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-map', async (_event, roomId) => {
  try {
    const id = parseInt(roomId, 10);
    if (!id || id < 1) {
      return { success: false, error: '삭제할 수 없는 맵입니다.' };
    }

    const filePath = mapPathForRoom(id);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '파일이 존재하지 않습니다.' };
    }

    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['취소', '삭제'],
      defaultId: 0,
      cancelId: 0,
      title: '맵 삭제',
      message: `room_${id}.json을 삭제하시겠습니까?`,
    });

    if (result.response !== 1) {
      return { success: false, cancelled: true };
    }

    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('delete-map failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('copy-bg-image', async (_event, srcPath) => {
  try {
    const filename = path.basename(srcPath);
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }
    const destPath = path.join(IMAGES_DIR, filename);
    fs.copyFileSync(srcPath, destPath);
    return { success: true, filename };
  } catch (error) {
    console.error('copy-bg-image failed:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
