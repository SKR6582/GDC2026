const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const MAPS_ROOT = path.join(__dirname, '..', 'assets', 'maps');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#181412',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  if (!fs.existsSync(MAPS_ROOT)) {
    fs.mkdirSync(MAPS_ROOT, { recursive: true });
  }

  // 1. 맵 목록 스캔
  ipcMain.handle('scan-rooms', async () => {
    try {
      const entries = fs.readdirSync(MAPS_ROOT, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort();
    } catch (err) {
      console.error('Scan error:', err);
      return [];
    }
  });

  // 2. 맵 데이터 로드
  ipcMain.handle('load-room', async (event, roomName) => {
    const roomFolder = path.join(MAPS_ROOT, roomName);
    const mapFile = path.join(roomFolder, 'map.json');
    if (fs.existsSync(mapFile)) {
      const content = fs.readFileSync(mapFile, 'utf8');
      const data = JSON.parse(content);
      // 배경 이미지 존재 여부 확인
      const bgPath = path.join(roomFolder, data.background_image || 'background.png');
      data._has_bg = fs.existsSync(bgPath);
      data._bg_abs_path = data._has_bg ? bgPath : null;
      return { success: true, data };
    }
    return { success: false, error: 'File not found' };
  });

  // 3. 맵 데이터 저장
  ipcMain.handle('save-room', async (event, { roomName, mapData, bgSourcePath }) => {
    try {
      const roomFolder = path.join(MAPS_ROOT, roomName);
      if (!fs.existsSync(roomFolder)) {
        fs.mkdirSync(roomFolder, { recursive: true });
      }

      // 배경 이미지가 지정되어 있으면 폴더로 복사
      if (bgSourcePath && fs.existsSync(bgSourcePath)) {
        const ext = path.extname(bgSourcePath);
        const destBg = path.join(roomFolder, `background${ext}`);
        fs.copyFileSync(bgSourcePath, destBg);
        mapData.background_image = `background${ext}`;
      }

      const mapFile = path.join(roomFolder, 'map.json');
      fs.writeFileSync(mapFile, JSON.stringify(mapData, null, 2), 'utf8');
      return { success: true, message: `[${roomName}] 저장 완료!` };
    } catch (err) {
      console.error('Save error:', err);
      return { success: false, error: err.message };
    }
  });

  // 4. 배경 이미지 파일 선택 다이얼로그
  ipcMain.handle('select-bg-image', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
