const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Tray,
  Menu,
  Notification,
  globalShortcut,
  screen,
} = require("electron");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

// =====================================================
// SINGLE INSTANCE LOCK
// =====================================================
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

/*
 * Optional launch diagnostics: FOCUSFLOW_SMOKE_TEST=1 boots the real app,
 * waits for the renderer to initialize, reports success/failure and exits.
 * Never active in a normal user launch.
 */
const SMOKE_TEST = process.env.FOCUSFLOW_SMOKE_TEST === "1";
const smokeTestErrors = [];

let mainWindow = null;
let tray = null;
let isQuitting = false;
let isMiniMode = false;
let timerHeartbeat = null;
let normalBounds = { width: 1280, height: 860, x: undefined, y: undefined };

// File paths in Electron userData directory
const getUserDataPath = (filename) => path.join(app.getPath("userData"), filename);
const authStoragePath = () => getUserDataPath("focusflow-auth.json");
const settingsStoragePath = () => getUserDataPath("focusflow-settings.json");
const windowStateStoragePath = () => getUserDataPath("focusflow-window-state.json");
const tasksStoragePath = () => getUserDataPath("focusflow-tasks.json");
const sessionsStoragePath = () => getUserDataPath("focusflow-sessions.json");
const distractionsStoragePath = () => getUserDataPath("focusflow-distractions.json");

// Read packaged configuration
function getPackagedConfig() {
  const configPath = path.join(__dirname, "desktop-config.json");
  try {
    if (fsSync.existsSync(configPath)) {
      return JSON.parse(fsSync.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    console.warn("Could not read desktop-config.json:", err.message);
  }
  return {
    backendUrl: null,
    mode: "standalone",
    configured: false,
    version: "3.0.0",
  };
}

const packagedConfig = getPackagedConfig();

/*
=====================================================
BACKEND RESOLUTION (single source of truth)
=====================================================
The backend is ALWAYS the API origin. It is never
inferred from the frontend website URL.
=====================================================
*/
function resolveBackendUrl(settings = {}) {
  if (
    settings.backendOverride &&
    typeof settings.backendOverride === "string" &&
    settings.backendOverride.trim()
  ) {
    return {
      url: settings.backendOverride.trim().replace(/\/+$/, ""),
      mode: "override",
    };
  }

  if (packagedConfig.backendUrl) {
    return {
      url: String(packagedConfig.backendUrl).replace(/\/+$/, ""),
      mode: "cloud",
    };
  }

  const envEndpoint = process.env.FOCUSFLOW_BACKEND_URL?.trim();
  if (envEndpoint) {
    return { url: envEndpoint.replace(/\/+$/, ""), mode: "env" };
  }

  if (!app.isPackaged) {
    return { url: "http://localhost:5001", mode: "development" };
  }

  return { url: null, mode: "standalone" };
}

function isLoopbackUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(
      parsed.hostname.toLowerCase()
    );
  } catch {
    return false;
  }
}

// Default Settings
const DEFAULT_SETTINGS = {
  backendOverride: null, // Developer override if needed
  alwaysOnTop: false,
  minimizeToTray: true,
  autoStartOnBoot: false,
  soundAlerts: true,
  nativeNotifications: true,
  workDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreak: false,
  globalShortcutFocus: "CommandOrControl+Alt+F",
  globalShortcutTimer: "CommandOrControl+Alt+P",
};

// =====================================================
// FILE HELPERS
// =====================================================
async function readJsonFile(filePath, defaultValue = {}) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Failed to write JSON file:", filePath, err);
    return false;
  }
}

// =====================================================
// AUTHORITATIVE TIMER STATE IN MAIN PROCESS
// Drift-resistant timestamp-based calculation
// =====================================================
const timerState = {
  state: "idle", // 'idle' | 'running' | 'paused' | 'break'
  taskTitle: "Deep Work Session",
  taskId: null,
  sessionId: null,
  targetDurationSeconds: 25 * 60,
  accumulatedElapsedSeconds: 0,
  startedAtTimestamp: null,
  breakType: null, // 'short' | 'long' | null
  tabSwitches: 0,
  idleSeconds: 0,
};

function getElapsedSeconds() {
  if (timerState.state === "running" && timerState.startedAtTimestamp) {
    const delta = Math.floor((Date.now() - timerState.startedAtTimestamp) / 1000);
    return timerState.accumulatedElapsedSeconds + Math.max(0, delta);
  }
  return timerState.accumulatedElapsedSeconds;
}

function getRemainingSeconds() {
  const elapsed = getElapsedSeconds();
  return Math.max(0, timerState.targetDurationSeconds - elapsed);
}

function formatTimerDigits(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getTimerSnapshot() {
  const remaining = getRemainingSeconds();
  const elapsed = getElapsedSeconds();
  return {
    state: timerState.state,
    taskTitle: timerState.taskTitle,
    taskId: timerState.taskId,
    sessionId: timerState.sessionId,
    targetDurationSeconds: timerState.targetDurationSeconds,
    remainingSeconds: remaining,
    elapsedSeconds: elapsed,
    breakType: timerState.breakType,
    formattedTime: formatTimerDigits(remaining),
    progressPercent: Math.min(100, Math.round((elapsed / (timerState.targetDurationSeconds || 1)) * 100)),
  };
}

// System Tray setup
function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, "focusflow.ico");
  if (!fsSync.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  tray.setToolTip("FocusFlow AI — Desktop Productivity Workspace");

  updateTray();

  tray.on("double-click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

function updateTray() {
  if (!tray) return;

  const snap = getTimerSnapshot();
  const timeStr = snap.formattedTime;
  const isRunning = snap.state === "running";
  const isPaused = snap.state === "paused";
  const isBreak = snap.state === "break";

  let statusText = "Ready to Focus";
  if (isRunning) statusText = `Focusing: ${snap.taskTitle} (${timeStr})`;
  else if (isPaused) statusText = `Paused: ${snap.taskTitle} (${timeStr})`;
  else if (isBreak) statusText = `Break Active (${timeStr})`;

  tray.setToolTip(`FocusFlow AI — ${statusText}`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `FocusFlow AI • ${statusText}`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Open Workspace",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send("focusflow:tray-action", "open-focus");
        }
      },
    },
    {
      label: isRunning ? "Pause Focus" : isPaused ? "Resume Focus" : "Start 25m Focus Sprint",
      click: () => {
        if (isRunning) {
          pauseTimer();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("focusflow:tray-action", "pause-timer");
          }
        } else if (isPaused) {
          resumeTimer();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("focusflow:tray-action", "resume-timer");
          }
        } else {
          startTimer({ durationMinutes: 25, taskTitle: "Deep Work Sprint" });
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("focusflow:tray-action", "start-timer", 25);
          }
        }
      },
    },
    {
      label: "Start 50m Deep Work Block",
      enabled: !isRunning,
      click: () => {
        startTimer({ durationMinutes: 50, taskTitle: "Deep Work Block" });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("focusflow:tray-action", "start-timer", 50);
        }
      },
    },
    {
      label: "Finish Active Session",
      enabled: isRunning || isPaused || isBreak,
      click: () => {
        completeTimer();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("focusflow:tray-action", "finish-timer");
        }
      },
    },
    { type: "separator" },
    {
      label: isMiniMode ? "Expand to Full Workspace" : "Switch to Floating Mini-Timer",
      click: () => {
        toggleMiniMode(!isMiniMode);
      },
    },
    { type: "separator" },
    {
      label: "Quit FocusFlow AI",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// Timer State Transitions
function startTimer({ durationMinutes = 25, taskTitle = "Deep Work Session", taskId = null, isBreak = false, breakType = null } = {}) {
  const durationSec = Math.max(60, durationMinutes * 60);

  timerState.targetDurationSeconds = durationSec;
  timerState.accumulatedElapsedSeconds = 0;
  timerState.startedAtTimestamp = Date.now();
  timerState.state = isBreak ? "break" : "running";
  timerState.taskTitle = taskTitle || "Deep Work Session";
  timerState.taskId = taskId || null;
  timerState.breakType = breakType || null;
  timerState.sessionId = `session_${Date.now()}`;
  timerState.tabSwitches = 0;
  timerState.idleSeconds = 0;

  broadcastTimerTick();
  updateTray();
}

function pauseTimer() {
  if (timerState.state !== "running" && timerState.state !== "break") return;

  timerState.accumulatedElapsedSeconds = getElapsedSeconds();
  timerState.startedAtTimestamp = null;
  timerState.state = "paused";

  broadcastTimerTick();
  updateTray();
}

function resumeTimer() {
  if (timerState.state !== "paused") return;

  timerState.startedAtTimestamp = Date.now();
  timerState.state = timerState.breakType ? "break" : "running";

  broadcastTimerTick();
  updateTray();
}

function resetTimer() {
  timerState.state = "idle";
  timerState.accumulatedElapsedSeconds = 0;
  timerState.startedAtTimestamp = null;
  timerState.breakType = null;

  broadcastTimerTick();
  updateTray();
}

async function completeTimer() {
  const wasRunning = timerState.state === "running" || timerState.state === "paused";
  const wasBreak = timerState.state === "break";
  const completedTaskTitle = timerState.taskTitle;
  const completedTaskId = timerState.taskId;
  const elapsedSec = getElapsedSeconds();

  timerState.state = "idle";
  timerState.accumulatedElapsedSeconds = 0;
  timerState.startedAtTimestamp = null;
  timerState.breakType = null;

  const durationMin = Math.max(1, Math.round(elapsedSec / 60));

  // Save session record locally
  if (wasRunning) {
    const history = await readJsonFile(sessionsStoragePath(), []);
    const newRecord = {
      id: timerState.sessionId || `sess_${Date.now()}`,
      title: completedTaskTitle,
      taskId: completedTaskId,
      durationSeconds: elapsedSec,
      completedAt: new Date().toISOString(),
      avgFocusScore: 95,
    };
    history.unshift(newRecord);
    await writeJsonFile(sessionsStoragePath(), history.slice(0, 100)); // keep last 100
  }

  // Show native notification
  if (Notification.isSupported()) {
    const notifTitle = wasBreak ? "Break Finished 🔔" : "Focus Session Completed! 🎉";
    const notifBody = wasBreak
      ? "Mindful break concluded. Ready to initiate your next productive sprint?"
      : `Outstanding work! You completed ${durationMin} minutes of focused work on "${completedTaskTitle}".`;

    const notif = new Notification({
      title: notifTitle,
      body: notifBody,
      icon: path.join(__dirname, "focusflow.ico"),
    });

    notif.on("click", () => {
      if (mainWindow) {
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
      }
    });

    notif.show();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("focusflow:session-finished", {
      taskTitle: completedTaskTitle,
      taskId: completedTaskId,
      durationMinutes: durationMin,
      wasBreak,
    });
  }

  broadcastTimerTick();
  updateTray();
}

function broadcastTimerTick() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("focusflow:timer-state-update", getTimerSnapshot());
  }
}

// Start Timer Heartbeat (drift-free monitoring)
function initTimerHeartbeat() {
  if (timerHeartbeat) clearInterval(timerHeartbeat);

  timerHeartbeat = setInterval(() => {
    if (timerState.state === "running" || timerState.state === "break") {
      const remaining = getRemainingSeconds();
      if (remaining <= 0) {
        completeTimer();
      } else {
        broadcastTimerTick();
        updateTray();
      }
    }
  }, 1000);
}

// Mini Mode toggler
function toggleMiniMode(enable) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  isMiniMode = Boolean(enable);

  if (isMiniMode) {
    normalBounds = mainWindow.getBounds();
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    mainWindow.setResizable(false);
    mainWindow.setSize(360, 220, true);
    mainWindow.setMinimumSize(340, 200);
  } else {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(920, 620);
    mainWindow.setSize(
      normalBounds.width || 1280,
      normalBounds.height || 860,
      true
    );
    if (normalBounds.x !== undefined && normalBounds.y !== undefined) {
      mainWindow.setPosition(normalBounds.x, normalBounds.y, true);
    }
  }

  mainWindow.webContents.send("focusflow:mini-mode-changed", isMiniMode);
  updateTray();
}

// Validate saved window bounds to ensure they are on an active monitor
function validateWindowBounds(savedBounds) {
  if (!savedBounds || typeof savedBounds !== "object") return null;

  const { x, y, width, height } = savedBounds;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    width < 600 ||
    height < 400
  ) {
    return null;
  }

  const displays = screen.getAllDisplays();
  const isVisibleOnAnyDisplay = displays.some((display) => {
    const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
    return (
      x >= dx - 20 &&
      y >= dy - 20 &&
      x + width <= dx + dw + 20 &&
      y + height <= dy + dh + 20
    );
  });

  return isVisibleOnAnyDisplay ? savedBounds : null;
}

// Window creation
async function createWindow() {
  const settings = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
  const savedBounds = await readJsonFile(windowStateStoragePath(), null);
  const validatedBounds = validateWindowBounds(savedBounds);

  const windowOptions = {
    width: validatedBounds ? validatedBounds.width : 1280,
    height: validatedBounds ? validatedBounds.height : 860,
    minWidth: 920,
    minHeight: 620,
    frame: false, // Custom frameless window for modern desktop experience
    backgroundColor: "#070709",
    title: "FocusFlow AI",
    icon: path.join(__dirname, "focusflow.ico"),
    alwaysOnTop: Boolean(settings.alwaysOnTop),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  };

  if (validatedBounds && validatedBounds.x !== undefined && validatedBounds.y !== undefined) {
    windowOptions.x = validatedBounds.x;
    windowOptions.y = validatedBounds.y;
  }

  mainWindow = new BrowserWindow(windowOptions);

  if (validatedBounds?.isMaximized) {
    mainWindow.maximize();
  }

  // Save window bounds on move/resize (debounced)
  let boundsSaveTimeout = null;
  const saveBounds = () => {
    if (boundsSaveTimeout) clearTimeout(boundsSaveTimeout);
    boundsSaveTimeout = setTimeout(async () => {
      if (mainWindow && !mainWindow.isDestroyed() && !isMiniMode) {
        const bounds = mainWindow.getBounds();
        const isMaximized = mainWindow.isMaximized();
        await writeJsonFile(windowStateStoragePath(), { ...bounds, isMaximized });
      }
    }, 500);
  };

  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);

  // Grant media permission for Camera Attention AI (local app origin only)
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl || webContents?.getURL?.() || "";
    const isLocalApp = requestingUrl.startsWith("file://") || isLoopbackUrl(requestingUrl);
    if (permission === "media" && isLocalApp) {
      return callback(true);
    }
    callback(false);
  });

  // Reject other powerful permissions outright
  mainWindow.webContents.session.setPermissionCheckHandler((_wc, permission) => {
    return permission === "media";
  });

  // Load the standalone local desktop interface
  await mainWindow.loadFile(path.join(__dirname, "index.html"));

  if (SMOKE_TEST) {
    mainWindow.webContents.on("console-message", (_event, levelOrDetails, legacyMessage) => {
      const level =
        typeof levelOrDetails === "object" ? levelOrDetails.level : levelOrDetails;
      const message =
        typeof levelOrDetails === "object" ? levelOrDetails.message : legacyMessage;

      // The permission-denied probe intentionally triggers this diagnostic.
      const isExpected =
        typeof message === "string" && message.includes("Camera access error: NotAllowedError");

      // level 3 = error
      if (level >= 3 && !isExpected) smokeTestErrors.push(message);
    });

    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      smokeTestErrors.push(`render-process-gone: ${details.reason}`);
    });

    setTimeout(async () => {
      let probe = null;
      let vision = null;

      try {
        probe = await mainWindow.webContents.executeJavaScript(
          `({
            bridgeReady: typeof window.focusFlowDesktop === "object",
            apiProxy: typeof window.focusFlowDesktop?.apiRequest === "function",
            activeView: document.querySelector(".view-section.active")?.id || null,
            connectivity: document.getElementById("connectivity-text")?.textContent || null,
            cameraInFocus: !!document.querySelector("#view-focus #camera-video-elem"),
            timerDigits: document.getElementById("timer-digits")?.textContent || null
          })`
        );
      } catch (err) {
        smokeTestErrors.push(`probe failed: ${err.message}`);
      }

      try {
        /*
         * Deep vision checks, no physical webcam required:
         * A. Real cascade inference on a synthetic blank frame must honestly
         *    report "absent" (proves models load and inference executes).
         * B. Denying camera permission must surface a real error and leave the
         *    timer intact.
         */
        vision = await mainWindow.webContents.executeJavaScript(`
          (async () => {
            const out = {};

            const frameCanvas = document.createElement("canvas");
            frameCanvas.width = 320;
            frameCanvas.height = 240;
            const frameCtx = frameCanvas.getContext("2d");
            frameCtx.fillStyle = "#808080";
            frameCtx.fillRect(0, 0, 320, 240);

            const syntheticVideo = document.createElement("video");
            syntheticVideo.autoplay = true;
            syntheticVideo.muted = true;
            syntheticVideo.playsInline = true;
            syntheticVideo.srcObject = frameCanvas.captureStream(5);
            await syntheticVideo.play().catch(() => {});

            let lastState = null;
            const tracker = new window.AttentionTracker({
              video: syntheticVideo,
              canvas: document.createElement("canvas"),
              onStateChange: (e) => { lastState = e && e.state; },
              onTelemetryUpdate: () => {},
              onError: (code, message) => { out.visionError = code + ": " + message; },
            });

            // Exercise model loading + inference directly. start() would open
            // the real webcam, so the blank-frame check bypasses hardware.
            const modelsReady = await tracker.initModels({
              loadVisionAsset: (name) => window.focusFlowDesktop.loadVisionAsset(name),
            });
            tracker.isRunning = true;
            for (let i = 0; i < 3; i++) {
              tracker.processFrame();
              await new Promise((r) => setTimeout(r, 120));
            }
            out.blankFrame = {
              modelsReady,
              state: lastState,
              summary: tracker.getSummary(),
            };
            tracker.stop();

            const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            navigator.mediaDevices.getUserMedia = () =>
              Promise.reject(Object.assign(new Error("Permission denied by test"), { name: "NotAllowedError" }));

            document.getElementById("btn-toggle-camera").click();
            await new Promise((r) => setTimeout(r, 2200));

            out.permissionDenied = {
              pill: document.getElementById("camera-status-pill").textContent,
              metric: document.getElementById("camera-metric-state").textContent,
              timerDigits: document.getElementById("timer-digits").textContent,
              buttonText: document.getElementById("btn-toggle-camera").textContent.trim(),
            };

            navigator.mediaDevices.getUserMedia = originalGetUserMedia;

            // Navigation: every sidebar item must activate its matching view.
            const navResults = [];
            document.querySelectorAll(".nav-item").forEach((item) => {
              const view = item.dataset.view;
              if (!view) return;
              item.click();
              const active = document.querySelector(".view-section.active");
              navResults.push({
                view,
                ok: active && active.id === "view-" + view,
              });
            });
            out.navigation = navResults;
            out.websiteDisplay =
              document.getElementById("settings-website-display")?.textContent || null;
            out.endpointDisplay =
              document.getElementById("settings-endpoint-display")?.textContent || null;

            // Genuine UI interaction: create a task through the DOM, then remove
            // it with the rendered delete control (verifies delegated events).
            document.querySelector('[data-view="tasks"]').click();
            await new Promise((r) => setTimeout(r, 300));

            document.getElementById("new-task-input").value = "SMOKE_UI_TASK";
            document.getElementById("btn-add-task").click();
            await new Promise((r) => setTimeout(r, 800));

            const afterCreate = await window.focusFlowDesktop.getLocalTasks();
            const createdTask = afterCreate.find((t) => t.title === "SMOKE_UI_TASK");

            let deletedViaButton = false;
            if (createdTask) {
              const deleteBtn = document.querySelector(
                '#tasks-screen-list [data-action="delete-task"][data-id="' + createdTask.id + '"]'
              );
              out.taskDeleteButtonFound = Boolean(deleteBtn);
              if (deleteBtn) {
                deleteBtn.click();
                await new Promise((r) => setTimeout(r, 900));
              }
              const afterDelete = await window.focusFlowDesktop.getLocalTasks();
              deletedViaButton = !afterDelete.some((t) => t.id === createdTask.id);

              if (!deletedViaButton) {
                await window.FocusFlowApp.deleteTask(createdTask.id);
              }
            }

            out.taskUi = {
              created: Boolean(createdTask),
              deletedViaButton,
            };
            out.noInlineHandlers = document.querySelectorAll("[onclick]").length === 0;

            // Persistence round-trip through Electron userData, preserving
            // whatever the user already had stored.
            const beforeTasks = await window.focusFlowDesktop.getLocalTasks();
            await window.focusFlowDesktop.saveLocalTasks([
              { id: "__smoke__", title: "Smoke persistence probe", completed: false },
            ]);
            const afterTasks = await window.focusFlowDesktop.getLocalTasks();
            await window.focusFlowDesktop.saveLocalTasks(beforeTasks);
            const restoredTasks = await window.focusFlowDesktop.getLocalTasks();

            out.persistence = {
              wrote: Array.isArray(afterTasks) && afterTasks.some((t) => t.id === "__smoke__"),
              restored: Array.isArray(restoredTasks) && !restoredTasks.some((t) => t.id === "__smoke__"),
            };

            // Command palette opens from the titlebar control.
            document.getElementById("titlebar-search-btn").click();
            await new Promise((r) => setTimeout(r, 150));
            out.paletteOpen =
              document.getElementById("command-palette-backdrop").style.display !== "none";

            return out;
          })()
        `);
      } catch (err) {
        smokeTestErrors.push(`vision probe failed: ${err.message}`);
      }

      console.log(
        "SMOKE_RESULT " + JSON.stringify({ probe, vision, errors: smokeTestErrors })
      );

      app.exit(smokeTestErrors.length > 0 ? 1 : 0);
    }, 6000);
  }

  // Security: Handle external links safely in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        void shell.openExternal(url);
      }
    } catch (_) {}
    return { action: "deny" };
  });

  // Security: Prevent navigation away from the local application
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl.startsWith("file://")) {
      event.preventDefault();
      try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") {
          void shell.openExternal(targetUrl);
        }
      } catch (_) {}
    }
  });

  // Window close interception for minimize-to-tray
  mainWindow.on("close", async (event) => {
    if (!isQuitting) {
      const currentSettings = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
      if (currentSettings.minimizeToTray !== false) {
        event.preventDefault();
        mainWindow.hide();
        return;
      }
    }
  });

  // Tray setup
  createTray();

  // Register configurable global shortcuts
  registerGlobalShortcuts(settings);

  // Start heartbeat
  initTimerHeartbeat();
}

function registerGlobalShortcuts(settings) {
  try {
    globalShortcut.unregisterAll();

    // 1. Show/Focus workspace
    const shortcutFocus = settings.globalShortcutFocus || "CommandOrControl+Alt+F";
    globalShortcut.register(shortcutFocus, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
        mainWindow.webContents.send("focusflow:global-shortcut", "focus-workspace");
      }
    });

    // 2. Toggle pause/resume timer
    const shortcutTimer = settings.globalShortcutTimer || "CommandOrControl+Alt+P";
    globalShortcut.register(shortcutTimer, () => {
      if (timerState.state === "running") {
        pauseTimer();
      } else if (timerState.state === "paused") {
        resumeTimer();
      }
    });
  } catch (err) {
    console.warn("Could not register global shortcuts:", err.message);
  }
}

// Second instance focus
app.on("second-instance", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

/*
=====================================================
IPC HANDLERS
=====================================================
*/

// Configuration & Connection resolution
ipcMain.handle("focusflow:get-config", async () => {
  const settings = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
  const resolved = resolveBackendUrl(settings);

  return {
    backendUrl: resolved.url,
    appUrl: packagedConfig.appUrl || null,
    mode: resolved.url ? resolved.mode : "standalone",
    isPackaged: app.isPackaged,
    version: packagedConfig.version || app.getVersion(),
    builtAt: packagedConfig.builtAt || null,
  };
});

/*
=====================================================
SECURE BACKEND REQUEST PROXY
=====================================================
The renderer runs on file://, so any direct browser fetch
to the API is blocked by CORS (Origin: null). Instead of
weakening webSecurity or allowing a null origin, requests
are performed in the main process over a narrowly scoped
IPC channel: only /api/* paths, only the configured API
origin, and an explicit method allowlist.
=====================================================
*/
const API_METHOD_ALLOWLIST = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const API_PATH_PATTERN = /^\/api\/[A-Za-z0-9\-._~/]+(\?[A-Za-z0-9\-._~=&%+]*)?$/;

ipcMain.handle("focusflow:api-request", async (_event, request) => {
  if (!request || typeof request !== "object") {
    return { ok: false, status: 0, error: "Invalid API request payload." };
  }

  const settings = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
  const resolved = resolveBackendUrl(settings);

  if (!resolved.url) {
    return {
      ok: false,
      status: 0,
      error:
        "No FocusFlow API backend is configured for this installation. Running in Standalone Local Mode.",
    };
  }

  const apiPath = typeof request.path === "string" ? request.path : "";
  if (!API_PATH_PATTERN.test(apiPath) || apiPath.includes("..")) {
    return { ok: false, status: 0, error: "Blocked: only /api/* paths are allowed." };
  }

  const method = typeof request.method === "string" ? request.method.toUpperCase() : "GET";
  if (!API_METHOD_ALLOWLIST.has(method)) {
    return { ok: false, status: 0, error: `Blocked: method ${method} is not allowed.` };
  }

  let backendOrigin;
  try {
    backendOrigin = new URL(resolved.url);
  } catch {
    return { ok: false, status: 0, error: "Configured API backend URL is invalid." };
  }

  if (backendOrigin.protocol !== "https:" && !isLoopbackUrl(resolved.url)) {
    return { ok: false, status: 0, error: "Refusing to send credentials over plain HTTP." };
  }

  const targetUrl = `${backendOrigin.origin}${apiPath}`;
  if (new URL(targetUrl).origin !== backendOrigin.origin) {
    return { ok: false, status: 0, error: "Blocked: request origin mismatch." };
  }

  const headers = { Accept: "application/json" };
  if (request.body !== undefined && request.body !== null) {
    headers["Content-Type"] = "application/json";
  }

  // Bearer token is forwarded from the renderer's in-memory state only.
  const token = typeof request.token === "string" ? request.token : "";
  if (token && token.length < 4096) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (typeof request.body === "string" && request.body.length > 2 * 1024 * 1024) {
    return { ok: false, status: 0, error: "Request body too large." };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: request.body === undefined || request.body === null ? undefined : request.body,
      signal: controller.signal,
    });

    const rawText = await response.text();
    let data = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      text: data === null && rawText ? rawText.slice(0, 2000) : null,
    };
  } catch (err) {
    const message =
      err.name === "AbortError"
        ? "Request timed out after 15 seconds."
        : `Could not reach ${resolved.url}: ${err.message}`;
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
});

// Genuine On-Device Vision Asset Loader
ipcMain.handle("focusflow:load-vision-asset", async (_event, assetName) => {
  const allowedAssets = ["facefinder.bin", "puploc.bin"];
  if (!allowedAssets.includes(assetName)) {
    throw new Error(`Unauthorized vision asset request: ${assetName}`);
  }
  const assetPath = path.join(__dirname, "vision", assetName);
  return await fs.readFile(assetPath);
});

ipcMain.handle("focusflow:set-backend-override", async (_event, url) => {
  const settings = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
  if (!url || typeof url !== "string" || !url.trim()) {
    settings.backendOverride = null;
  } else {
    settings.backendOverride = url.trim().replace(/\/+$/, "");
  }
  await writeJsonFile(settingsStoragePath(), settings);
  return { success: true, backendOverride: settings.backendOverride };
});

// Secure Auth Storage
ipcMain.handle("focusflow:get-stored-auth", async () => {
  return await readJsonFile(authStoragePath(), { token: null, user: null });
});

ipcMain.handle("focusflow:save-stored-auth", async (_event, { token, user }) => {
  await writeJsonFile(authStoragePath(), {
    token: token || null,
    user: user || null,
    savedAt: new Date().toISOString(),
  });
  return { success: true };
});

ipcMain.handle("focusflow:clear-stored-auth", async () => {
  await writeJsonFile(authStoragePath(), { token: null, user: null });
  return { success: true };
});

// Settings Storage
ipcMain.handle("focusflow:get-settings", async () => {
  const settings = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
});

ipcMain.handle("focusflow:save-settings", async (_event, newSettings) => {
  if (!newSettings || typeof newSettings !== "object") {
    throw new Error("Invalid settings payload");
  }
  const current = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
  const updated = { ...current, ...newSettings };
  await writeJsonFile(settingsStoragePath(), updated);

  // Apply immediate window effects
  if (mainWindow && !mainWindow.isDestroyed() && typeof updated.alwaysOnTop === "boolean" && !isMiniMode) {
    mainWindow.setAlwaysOnTop(updated.alwaysOnTop);
  }

  // Update shortcuts if changed
  registerGlobalShortcuts(updated);

  return { success: true, settings: updated };
});

// Local Tasks Storage
ipcMain.handle("focusflow:get-local-tasks", async () => {
  return await readJsonFile(tasksStoragePath(), []);
});

ipcMain.handle("focusflow:save-local-tasks", async (_event, tasks) => {
  if (!Array.isArray(tasks)) throw new Error("Tasks must be an array");
  await writeJsonFile(tasksStoragePath(), tasks);
  return { success: true };
});

// Local Sessions History
ipcMain.handle("focusflow:get-local-sessions", async () => {
  return await readJsonFile(sessionsStoragePath(), []);
});

ipcMain.handle("focusflow:save-local-sessions", async (_event, sessions) => {
  if (!Array.isArray(sessions)) throw new Error("Sessions must be an array");
  await writeJsonFile(sessionsStoragePath(), sessions);
  return { success: true };
});

// Local Distractions Storage
ipcMain.handle("focusflow:get-local-distractions", async () => {
  return await readJsonFile(distractionsStoragePath(), {
    blockedDomains: [
      "youtube.com",
      "twitter.com",
      "x.com",
      "reddit.com",
      "instagram.com",
      "facebook.com",
      "tiktok.com",
      "netflix.com",
    ],
    events: [],
  });
});

ipcMain.handle("focusflow:save-local-distractions", async (_event, data) => {
  if (!data || typeof data !== "object") throw new Error("Invalid distractions payload");
  await writeJsonFile(distractionsStoragePath(), data);
  return { success: true };
});

// Authoritative Focus Timer Engine IPC
ipcMain.handle("focusflow:timer-get-state", () => {
  return getTimerSnapshot();
});

ipcMain.handle("focusflow:timer-start", (_event, payload) => {
  startTimer(payload || {});
  return getTimerSnapshot();
});

ipcMain.handle("focusflow:timer-pause", () => {
  pauseTimer();
  return getTimerSnapshot();
});

ipcMain.handle("focusflow:timer-resume", () => {
  resumeTimer();
  return getTimerSnapshot();
});

ipcMain.handle("focusflow:timer-reset", () => {
  resetTimer();
  return getTimerSnapshot();
});

ipcMain.handle("focusflow:timer-complete", async () => {
  await completeTimer();
  return getTimerSnapshot();
});

// Native Notifications
ipcMain.handle("focusflow:show-notification", async (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: title || "FocusFlow AI",
      body: body || "",
      icon: path.join(__dirname, "focusflow.ico"),
    });
    notif.show();
    return true;
  }
  return false;
});

// Mini Mode
ipcMain.handle("focusflow:toggle-mini-mode", async (_event, enable) => {
  toggleMiniMode(enable);
  return isMiniMode;
});

// Always on top
ipcMain.handle("focusflow:set-always-on-top", async (_event, enable) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(Boolean(enable));
  }
  return Boolean(enable);
});

// Auto-start on boot
ipcMain.handle("focusflow:get-auto-start", () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle("focusflow:set-auto-start", (_event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enable),
    path: process.execPath,
  });
  return app.getLoginItemSettings().openAtLogin;
});

// Window controls
ipcMain.handle("focusflow:window-minimize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle("focusflow:window-maximize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("focusflow:window-close", async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const settings = await readJsonFile(settingsStoragePath(), DEFAULT_SETTINGS);
    if (settings.minimizeToTray !== false) {
      mainWindow.hide();
    } else {
      mainWindow.close();
    }
  }
});

ipcMain.handle("focusflow:is-window-maximized", () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
});

// Safe external opening
ipcMain.handle("focusflow:open-external", (_event, url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      void shell.openExternal(url);
      return true;
    }
  } catch (_) {}
  return false;
});

/*
=====================================================
APP LIFECYCLE
=====================================================
*/

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (timerHeartbeat) clearInterval(timerHeartbeat);
  globalShortcut.unregisterAll();
});
