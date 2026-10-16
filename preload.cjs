const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('driftDesktop',{
  setAlwaysOnTop:value=>ipcRenderer.invoke('window:set-always-on-top',value),
  getAlwaysOnTop:()=>ipcRenderer.invoke('window:get-always-on-top')
});
