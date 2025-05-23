const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {  
  handleGetBasePath: (callback) => ipcRenderer.on('getBasePath', callback),
  getPathValue: (callback) => ipcRenderer.on('getPathValue', callback),
  getPathSaveValue: (callback) => ipcRenderer.on('getPathSaveValue', callback),
  runSignout: async () => {
		await ipcRenderer.invoke("runSignout");
	},
  handleGetPath: async () => {
		await ipcRenderer.invoke("getPath");
	},
  handleGetPathSave: async () => {
		await ipcRenderer.invoke("getPathSave");
	},
  openFolderPath: (folderPath) => ipcRenderer.send('openFolderPath', folderPath),  
  openFilePath: (filePath) => ipcRenderer.send('openFilePath', filePath), 
})
