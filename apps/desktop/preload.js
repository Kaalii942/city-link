const { contextBridge, ipcRenderer } = require('electron');

// Expose safe EIPMS native channels to the React window context
contextBridge.exposeInMainWorld('eipms', {
  print: (options = {}) => ipcRenderer.invoke('print-spool', options),
  
  saveFileDialog: (options = {}) => ipcRenderer.invoke('save-file-dialog', options),
  
  notify: (title, body) => ipcRenderer.send('show-notification', { title, body })
});
