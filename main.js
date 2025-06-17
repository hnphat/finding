require('dotenv').config();
const { app, BrowserWindow, globalShortcut, ipcMain, dialog} = require('electron');
const exec = require('child_process').exec;
const {shell} = require('electron');
const path = require('path');
const fs = require('fs');
//-----------------logger
// error, warn, info, verbose, debug, silly
const log = require('electron-log');
let basePath = "";
if (process.env.PRODUCTION == 1) {
  basePath = path.join(__dirname, '..', '..');
} else {
  basePath = __dirname;
}
if (process.env.PRODUCTION == 1) {
  log.transports.file.resolvePathFn = () => path.join(__dirname, '..', '..', '/logsmain.log');
} else {
  log.transports.file.resolvePathFn = () => path.join(__dirname, '/logsmain.log');
}
//-------------------------------------
// Thêm thư mục popler
if (process.env.PRODUCTION == 1) {  
    // check if directory exists    
    let srcPoppler = path.join(__dirname, '..', '..', 'poppler');  
    let targetDir = path.join("C:/snapshot", "finding", 'node_modules','pdf-poppler');
    if (fs.existsSync(targetDir)) {
      // Không thực hiện copy nếu thư mục đã tồn tại
    } else {
      let temppath = path.join(__dirname, '..', '..', 'cmd/servercopy.bat');
      let cmd = "start /min " + temppath + " " + srcPoppler + " " + targetDir;
      exec(cmd, function(error, stdout, stderr){   
        if (error) {
          console.log(error);
          log.error(error); // error, warn, info, verbose, debug, silly     
          return;
        }
        console.log(stdout.toString());
        log.info(stdout.toString()); // error, warn, info, verbose, debug, silly     
      }); 
    }    
  } //else {
    // let tenThuMucUngDung = path.basename(__dirname);
    // let srcPoppler = path.join(__dirname, 'poppler');
    // let targetDir = path.join("C:/snapshot", tenThuMucUngDung, 'node_modules');
    // let temppath = path.join(__dirname, 'cmd/servercopy.bat');
    //   let cmd = "start /min " + temppath + " " + srcPoppler + " " + targetDir;
    //     exec(cmd, function(error, stdout, stderr){   
    //       if (error) {
    //         console.log(error);
    //         log.error(error); // error, warn, info, verbose, debug, silly     
    //         return;
    //       }
    //       console.log(stdout.toString());
    //       log.info(stdout.toString()); // error, warn, info, verbose, debug, silly     
    //     });
 //}
// ----------------------------
const createWindow = () => {    
    const win = new BrowserWindow({
      show: false,
      // autoHideMenuBar: true, // Show menu when press alt
      webPreferences: {
        nodeIntegration: true,
        preload: path.join(__dirname, 'preload.js'),
      },      
      icon: basePath + '/assets/icon.png',
    })
    win.setMenu(null); //Remove menu   
    win.maximize();
    win.show();
    win.loadFile('index.html');   
    globalShortcut.register('Control+Shift+A', () => { // Alt+CommandOrControl+I
      if (process.env.DEBUG == 1) {
        win.webContents.openDevTools();
      }
    })    
    win.webContents.on('did-finish-load', () => {
      let appconfig = {};
      appconfig.basepath = path.join(__dirname, '..', '..'); 
      appconfig.host = process.env.IPSERVER;    
      appconfig.port = process.env.PORT;  
      appconfig.phienban = process.env.PHIENBAN;
      appconfig.production = process.env.PRODUCTION;
      win.webContents.send('getBasePath', appconfig);
    })

    ipcMain.handle("getPath", async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        // console.log(result.filePaths[0]);
        win.webContents.send('getPathValue', result.filePaths[0]);
      }
      win.webContents.send('getPathValue', ""); 
    });

    ipcMain.handle("getPathSave", async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        // console.log(result.filePaths[0]);
        win.webContents.send('getPathSaveValue', result.filePaths[0]);
      }
      win.webContents.send('getPathSaveValue', ""); 
    });

    ipcMain.on('openFolderPath', (event, folderPath) => {
      shell.openPath(folderPath);
    });  

    ipcMain.on('openFilePath', (event, filePath) => {
      shell.openPath(filePath);
    });  
}

app.whenReady().then(() => {
  if (process.env.SERVER == 1 && process.env.CLIENT == 0) { // Chỉ chạy server
    let temppath = __dirname + "/server-win.exe";
    if (process.env.PRODUCTION == 1) {
      temppath = path.join(__dirname, '..', '..', 'server-win.exe');
    }
    let cmd = "start /min " + temppath;
    cmd = "start " + temppath;
    exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
      if (error) {
        console.log(error);
        log.error(error); // error, warn, info, verbose, debug, silly                           
        return;
      }       
    });

    if (process.platform !== 'darwin') {
      if (process.env.PRODUCTION == 1) {
        let temppath = path.join(__dirname, '..', '..', 'cmd/killclient.bat');
        let cmd = "start /min " + temppath;
        exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
          if (error) {
            console.log(error);
            log.error(error); // error, warn, info, verbose, debug, silly     
            return;
          }        
        });
        app.quit();
      } else {       
        let temppath = path.join(__dirname, "cmd/killclient.bat");
        let cmd = "start /min " + temppath;
        exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
          if (error) {
            console.log(error);
            log.error(error); // error, warn, info, verbose, debug, silly     
            return;
          }         
        });
        app.quit();
      }   
    }
  } 

  if (process.env.SERVER == 1 && process.env.CLIENT == 1) { // Chạy server và client
    let temppath = __dirname + "/server-win.exe";
    if (process.env.PRODUCTION == 1) {
      temppath = path.join(__dirname, '..', '..', 'server-win.exe');
    }
    let cmd = "start /min " + temppath;
    exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
      if (error) {
        console.log(error);
        log.error(error); // error, warn, info, verbose, debug, silly     
        return;
      }      
    });
  } 
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  })
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (process.env.PRODUCTION == 1) {         
          let temppath = path.join(__dirname, '..', '..', 'cmd/killall.bat');
          let cmd = "start /min " + temppath;
          exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
            if (error) {
              console.log(error);
              log.error(error); // error, warn, info, verbose, debug, silly     
              return;
            }               
          });
          app.quit();
        } else {          
          let temppath = path.join(__dirname, "cmd/killall.bat");
          let cmd = "start /min " + temppath;
          exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
            if (error) {
              console.log(error);
              log.error(error); // error, warn, info, verbose, debug, silly     
              return;
            }             
          });
          app.quit();
        }        
    }  
});

ipcMain.handle("runSignout", () => {
  if (process.platform !== 'darwin') { 
    if (process.env.PRODUCTION == 1) {
      let temppath = path.join(__dirname, '..', '..', 'cmd/killall.bat');
      let cmd = "start /min " + temppath;
      exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
        if (error) {
          console.log(error);
          log.error(error); // error, warn, info, verbose, debug, silly     
          return;
        }           
      });
      app.quit();
    } else {      
      let temppath = path.join(__dirname, "cmd/killall.bat");
      let cmd = "start /min " + temppath;
      exec(cmd, function(error, stdout, stderr){   // Tham số thứ 2 kèm theo là tuỳ chọn
        if (error) {
          console.log(error);
          log.error(error); // error, warn, info, verbose, debug, silly     
          return;
        }          
      });
      app.quit();
    }      
  }
});


    