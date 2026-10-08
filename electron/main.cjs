const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
let win;
function createWindow(){
  win=new BrowserWindow({
    width:400,height:700,minWidth:330,minHeight:430,
    backgroundColor:'#f7f6f2',title:'DriftList',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  win.loadFile(path.join(__dirname,'..','driftlist.html'));
}
ipcMain.handle('window:set-always-on-top',(_event,value)=>{if(win)win.setAlwaysOnTop(Boolean(value),'floating');return Boolean(value)});
ipcMain.handle('window:get-always-on-top',()=>win?.isAlwaysOnTop()||false);
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
