const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('robotAPI', {
  onStateChange: (cb) => ipcRenderer.on('state-change', (_, data) => cb(data)),
  close: () => ipcRenderer.send('close-app'),
  setIgnoreMouse: (v) => ipcRenderer.send('set-ignore-mouse', v),
  contextMenu: () => ipcRenderer.send('show-context-menu'),
});
