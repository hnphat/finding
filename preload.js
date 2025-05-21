const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {  
  handleGetBasePath: (callback) => ipcRenderer.on('getBasePath', callback),
  getPathValue: (callback) => ipcRenderer.on('getPathValue', callback),
  runSignout: async () => {
		await ipcRenderer.invoke("runSignout");
	},
  handleGetPath: async () => {
		await ipcRenderer.invoke("getPath");
	},
  openFolderPath: (folderPath) => ipcRenderer.send('openFolderPath', folderPath),  
})
