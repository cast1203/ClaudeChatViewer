const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 창 제어
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // 파일 관련
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  loadZip: (path) => ipcRenderer.invoke('load-zip', path),
  loadFolder: (path) => ipcRenderer.invoke('load-folder', path),
  loadJson: (path) => ipcRenderer.invoke('load-json', path),
  
  // 카테고리 관련
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (data) => ipcRenderer.invoke('add-category', data),
  updateCategory: (data) => ipcRenderer.invoke('update-category', data),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),
  
  // 태그 관련
  getTags: () => ipcRenderer.invoke('get-tags'),
  addTag: (data) => ipcRenderer.invoke('add-tag', data),
  updateTag: (data) => ipcRenderer.invoke('update-tag', data),
  deleteTag: (id) => ipcRenderer.invoke('delete-tag', id),
  
  // 대화-카테고리/태그 연결
  getConversationCategories: (convId) => ipcRenderer.invoke('get-conversation-categories', convId),
  getConversationTags: (convId) => ipcRenderer.invoke('get-conversation-tags', convId),
  setConversationCategory: (data) => ipcRenderer.invoke('set-conversation-category', data),
  addConversationTag: (data) => ipcRenderer.invoke('add-conversation-tag', data),
  removeConversationTag: (data) => ipcRenderer.invoke('remove-conversation-tag', data),
  getAllConversationMetadata: () => ipcRenderer.invoke('get-all-conversation-metadata'),
  
  // Ollama API
  ollamaGetModels: (baseUrl) => ipcRenderer.invoke('ollama-get-models', baseUrl),
  ollamaTestConnection: (baseUrl) => ipcRenderer.invoke('ollama-test-connection', baseUrl),
  ollamaClassify: (data) => ipcRenderer.invoke('ollama-classify', data),
  
  // 설정 관련
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (data) => ipcRenderer.invoke('set-setting', data),
  saveLastOpened: (data) => ipcRenderer.invoke('save-last-opened', data),
  getLastOpened: () => ipcRenderer.invoke('get-last-opened')
});
