const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listMaps: () => ipcRenderer.invoke('list-maps'),
  loadMap: (roomId) => ipcRenderer.invoke('load-map', roomId),
  saveMap: (roomId, mapData) => ipcRenderer.invoke('save-map', roomId, mapData),
  createMap: (roomId, width, height) => ipcRenderer.invoke('create-map', roomId, width, height),
  deleteMap: (roomId) => ipcRenderer.invoke('delete-map', roomId),
  copyBgImage: (srcPath) => ipcRenderer.invoke('copy-bg-image', srcPath),
});
