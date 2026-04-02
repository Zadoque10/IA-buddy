const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('configAPI', {
  testState: (state) => ipcRenderer.send('test-state', state),
});
