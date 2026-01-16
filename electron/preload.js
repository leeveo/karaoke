const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('offlineKiosk', {
  version: '1.0.0',
  ready: true,
});
