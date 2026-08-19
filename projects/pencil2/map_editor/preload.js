const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  scanRooms: () => ipcRenderer.invoke('scan-rooms'),
  loadRoom: (roomName) => ipcRenderer.invoke('load-room', roomName),
  saveRoom: (payload) => ipcRenderer.invoke('save-room', payload),
  selectBgImage: () => ipcRenderer.invoke('select-bg-image')
});
