const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("focusFlowDesktop", {
  // Runtime Configuration & Backend resolution
  getConfig: () => ipcRenderer.invoke("focusflow:get-config"),
  setBackendOverride: (url) => ipcRenderer.invoke("focusflow:set-backend-override", url),

  // Secure Auth Persistence
  getStoredAuth: () => ipcRenderer.invoke("focusflow:get-stored-auth"),
  saveStoredAuth: (token, user) => ipcRenderer.invoke("focusflow:save-stored-auth", { token, user }),
  clearStoredAuth: () => ipcRenderer.invoke("focusflow:clear-stored-auth"),

  // Desktop Settings
  getSettings: () => ipcRenderer.invoke("focusflow:get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("focusflow:save-settings", settings),

  // Local Data Stores (userData persistent)
  getLocalTasks: () => ipcRenderer.invoke("focusflow:get-local-tasks"),
  saveLocalTasks: (tasks) => ipcRenderer.invoke("focusflow:save-local-tasks", tasks),
  getLocalSessions: () => ipcRenderer.invoke("focusflow:get-local-sessions"),
  saveLocalSessions: (sessions) => ipcRenderer.invoke("focusflow:save-local-sessions", sessions),
  getLocalDistractions: () => ipcRenderer.invoke("focusflow:get-local-distractions"),
  saveLocalDistractions: (data) => ipcRenderer.invoke("focusflow:save-local-distractions", data),

  // Authoritative Focus Timer Engine
  timerGetState: () => ipcRenderer.invoke("focusflow:timer-get-state"),
  timerStart: (payload) => ipcRenderer.invoke("focusflow:timer-start", payload),
  timerPause: () => ipcRenderer.invoke("focusflow:timer-pause"),
  timerResume: () => ipcRenderer.invoke("focusflow:timer-resume"),
  timerReset: () => ipcRenderer.invoke("focusflow:timer-reset"),
  timerComplete: () => ipcRenderer.invoke("focusflow:timer-complete"),

  // Windows Desktop Features
  showNotification: (options) => ipcRenderer.invoke("focusflow:show-notification", options),
  toggleMiniMode: (enable) => ipcRenderer.invoke("focusflow:toggle-mini-mode", enable),
  setAlwaysOnTop: (enable) => ipcRenderer.invoke("focusflow:set-always-on-top", enable),
  getAutoStart: () => ipcRenderer.invoke("focusflow:get-auto-start"),
  setAutoStart: (enable) => ipcRenderer.invoke("focusflow:set-auto-start", enable),

  // Window Controls
  windowMinimize: () => ipcRenderer.invoke("focusflow:window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("focusflow:window-maximize"),
  windowClose: () => ipcRenderer.invoke("focusflow:window-close"),
  isWindowMaximized: () => ipcRenderer.invoke("focusflow:is-window-maximized"),

  // Safe external URL opening
  openExternal: (url) => ipcRenderer.invoke("focusflow:open-external", url),

  // Event Listeners from Main Process (with unsubscribe cleanup)
  onTimerTick: (callback) => {
    const handler = (_event, snap) => callback(snap);
    ipcRenderer.on("focusflow:timer-state-update", handler);
    return () => ipcRenderer.removeListener("focusflow:timer-state-update", handler);
  },
  onSessionFinished: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("focusflow:session-finished", handler);
    return () => ipcRenderer.removeListener("focusflow:session-finished", handler);
  },
  onMiniModeToggled: (callback) => {
    const handler = (_event, isMini) => callback(isMini);
    ipcRenderer.on("focusflow:mini-mode-changed", handler);
    return () => ipcRenderer.removeListener("focusflow:mini-mode-changed", handler);
  },
  onGlobalShortcut: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("focusflow:global-shortcut", handler);
    return () => ipcRenderer.removeListener("focusflow:global-shortcut", handler);
  },
});
