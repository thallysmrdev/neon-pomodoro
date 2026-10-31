const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: (options) => ipcRenderer.send('window:minimize', options),
  closeWindow: () => ipcRenderer.send('window:close'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:set-always-on-top', flag),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  setMiniMode: (isMini) => ipcRenderer.invoke('window:set-mini-mode', isMini),
  updateTimerState: (state) => ipcRenderer.send('timer:update', state),
  onTrayAction: (callback) => {
    const handler = (event, action) => callback(action);
    ipcRenderer.on('tray:action', handler);
    return () => ipcRenderer.removeListener('tray:action', handler);
  },
  onMiniModeChange: (callback) => {
    const handler = (event, val) => callback(val);
    ipcRenderer.on('window:mini-mode-changed', handler);
    return () => ipcRenderer.removeListener('window:mini-mode-changed', handler);
  },
  // Spotify / Windows Media Controller
  getMediaState: () => ipcRenderer.invoke('media:get-state'),
  controlMedia: (action) => ipcRenderer.send('media:control', action),
  onMediaUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('media:update', handler);
    return () => ipcRenderer.removeListener('media:update', handler);
  },
  isElectron: true,
});
