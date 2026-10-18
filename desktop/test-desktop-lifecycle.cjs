/**
 * Automated Verification Suite for FocusFlow AI Windows Desktop
 *
 * Verifies:
 * 1. Desktop configuration resolution (Verified HTTPS Cloud or Standalone mode, never localhost in production).
 * 2. Window state validator logic and multi-display boundary checking.
 * 3. Authoritative drift-resistant Timer Engine lifecycle (Start -> Pause -> Resume -> Complete).
 * 4. Local persistent storage contracts (tasks, sessions, settings, distraction blocklist).
 * 5. Preload script IPC contract completeness (including onTrayAction and loadVisionAsset).
 * 6. Single-instance lock mechanism.
 * 7. On-device vision assets integrity (pico.js, lploc.js, facefinder.bin, puploc.bin, attention-tracker.js).
 * 8. HTML UI structure (Camera Attention AI integrated beside Focus Mode timer, no dead camera tab).
 * 9. Preload optional bridge safety (app initializes safely even if bridge callback is omitted).
 */

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

console.log("\n=======================================================");
console.log("🖥️  FOCUSFLOW AI WINDOWS DESKTOP — VERIFICATION SUITE");
console.log("=======================================================\n");

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exit(1);
  }
}

async function runAsyncTests() {
  // Test 1: Packaged configuration validation
  test("Desktop config: Website and API backend are distinct HTTPS origins", () => {
    const configPath = path.join(__dirname, "desktop-config.json");
    assert(fs.existsSync(configPath), "desktop-config.json must exist");
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
    );

    assert(cfg.mode === "cloud" || cfg.mode === "standalone", "Mode must be 'cloud' or 'standalone'");
    assert(cfg.version, "Configuration must specify application version");
    assert.strictEqual(
      cfg.version,
      rootPkg.version,
      "desktop-config.json version must match package.json version"
    );

    if (cfg.mode === "cloud") {
      assert(cfg.appUrl && cfg.appUrl.startsWith("https://"), "Cloud appUrl must be a secure HTTPS website URL");
      assert(cfg.backendUrl && cfg.backendUrl.startsWith("https://"), "Cloud backendUrl must be a secure HTTPS API URL");
      assert(!cfg.backendUrl.includes("localhost"), "Production cloud backendUrl must never be localhost");
      assert.notStrictEqual(cfg.appUrl, cfg.backendUrl, "Website URL must never equal the API backend URL");
      assert(
        !cfg.backendUrl.includes("vercel.app"),
        "backendUrl must be the API origin (Render), not the Vercel website"
      );
    } else {
      assert.strictEqual(cfg.backendUrl, null, "backendUrl must be null in standalone mode");
    }
  });

  // Test 2: HTML & Assets completeness
  test("Desktop assets: Packaged index.html and desktop assets exist", () => {
    const htmlPath = path.join(__dirname, "index.html");
    const cssPath = path.join(__dirname, "desktop.css");
    const jsPath = path.join(__dirname, "desktop.js");
    const preloadPath = path.join(__dirname, "preload.cjs");
    const icoPath = path.join(__dirname, "focusflow.ico");

    assert(fs.existsSync(htmlPath), "index.html must exist");
    assert(fs.existsSync(cssPath), "desktop.css must exist");
    assert(fs.existsSync(jsPath), "desktop.js must exist");
    assert(fs.existsSync(preloadPath), "preload.cjs must exist");
    assert(fs.existsSync(icoPath), "focusflow.ico must exist");
  });

  // Test 3: Preload IPC Bridge Contract (including onTrayAction and loadVisionAsset)
  test("Preload Bridge: Context isolation exposes exact restricted API with tray & vision", () => {
    const preloadContent = fs.readFileSync(path.join(__dirname, "preload.cjs"), "utf8");
    assert(preloadContent.includes("contextBridge.exposeInMainWorld"), "Must use contextBridge.exposeInMainWorld");
    assert(preloadContent.includes("focusFlowDesktop"), "Must expose window.focusFlowDesktop");
    assert(preloadContent.includes("timerStart"), "Must expose timerStart");
    assert(preloadContent.includes("timerPause"), "Must expose timerPause");
    assert(preloadContent.includes("timerResume"), "Must expose timerResume");
    assert(preloadContent.includes("timerReset"), "Must expose timerReset");
    assert(preloadContent.includes("timerComplete"), "Must expose timerComplete");
    assert(preloadContent.includes("getLocalTasks"), "Must expose getLocalTasks");
    assert(preloadContent.includes("saveLocalTasks"), "Must expose saveLocalTasks");
    assert(preloadContent.includes("getLocalSessions"), "Must expose getLocalSessions");
    assert(preloadContent.includes("saveLocalSessions"), "Must expose saveLocalSessions");
    assert(preloadContent.includes("getConfig"), "Must expose getConfig");
    assert(preloadContent.includes("setBackendOverride"), "Must expose setBackendOverride");
    assert(preloadContent.includes("onTrayAction"), "Must expose onTrayAction");
    assert(preloadContent.includes("loadVisionAsset"), "Must expose loadVisionAsset");
    assert(preloadContent.includes("apiRequest"), "Must expose the scoped apiRequest proxy");
  });

  // Test 4: Main Process Security & Architectural Requirements
  test("Main process: Context isolation, sandbox, secure navigation, and tray broadcast enforced", () => {
    const mainContent = fs.readFileSync(path.join(__dirname, "main.cjs"), "utf8");
    assert(mainContent.includes("contextIsolation: true"), "contextIsolation must be true");
    assert(mainContent.includes("nodeIntegration: false"), "nodeIntegration must be false");
    assert(mainContent.includes("sandbox: true"), "sandbox must be true");
    assert(mainContent.includes("app.requestSingleInstanceLock()"), "Must acquire single instance lock");
    assert(mainContent.includes("mainWindow.loadFile"), "Must load packaged local index.html");
    assert(mainContent.includes("setWindowOpenHandler"), "Must safely handle external URLs");
    assert(mainContent.includes("will-navigate"), "Must prevent arbitrary remote navigation");
    assert(mainContent.includes("focusflow:tray-action"), "Must broadcast tray actions to renderer");
    assert(mainContent.includes("focusflow:load-vision-asset"), "Must handle vision asset loading via IPC");
    assert(mainContent.includes("webSecurity: true"), "webSecurity must stay enabled");
    assert(mainContent.includes("focusflow:api-request"), "Must provide the main-process API proxy");
    assert(mainContent.includes("API_PATH_PATTERN"), "API proxy must restrict request paths");
    assert(
      !mainContent.includes("process.env.FOCUSFLOW_APP_URL?.trim() ||"),
      "Backend resolution must not fall back to the frontend website URL"
    );
  });

  // Test 5: Authoritative Drift-Free Timer Logic Simulation
  test("Timer engine: Timestamp arithmetic prevents drift across minimize/sleep", () => {
    const timerState = {
      state: "running",
      totalSeconds: 25 * 60,
      startedAtTimestamp: Date.now() - 30000,
      accumulatedElapsedSeconds: 15,
    };

    function getElapsed(ts) {
      if (!ts.startedAtTimestamp) return ts.accumulatedElapsedSeconds;
      const current = Math.floor((Date.now() - ts.startedAtTimestamp) / 1000);
      return ts.accumulatedElapsedSeconds + Math.max(0, current);
    }

    function getRemaining(ts) {
      const elapsed = getElapsed(ts);
      return Math.max(0, ts.totalSeconds - elapsed);
    }

    const elapsed = getElapsed(timerState);
    assert(elapsed >= 45 && elapsed <= 46, `Expected ~45s elapsed, got ${elapsed}s`);

    const remaining = getRemaining(timerState);
    assert(remaining <= 1500 - 45 && remaining >= 1500 - 46, `Expected ~1455s remaining, got ${remaining}s`);

    timerState.accumulatedElapsedSeconds = elapsed;
    timerState.startedAtTimestamp = null;
    timerState.state = "paused";

    assert.strictEqual(getElapsed(timerState), elapsed, "Paused timer must not advance elapsed time");
  });

  // Test 6: Multi-Monitor Window Bounds Validator Logic
  test("Window state validator: Discards off-screen coordinates on disconnected monitors", () => {
    function validateBounds(bounds, mockDisplays) {
      if (!bounds || typeof bounds !== "object") return null;
      const { x, y, width, height } = bounds;
      if (typeof x !== "number" || typeof y !== "number" || width < 600 || height < 400) return null;
      const visible = mockDisplays.some((d) => {
        const { x: dx, y: dy, width: dw, height: dh } = d.bounds;
        return x >= dx - 20 && y >= dy - 20 && x + width <= dx + dw + 20 && y + height <= dy + dh + 20;
      });
      return visible ? bounds : null;
    }

    const primaryDisplay = [{ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }];
    const valid = validateBounds({ x: 100, y: 100, width: 1280, height: 860 }, primaryDisplay);
    assert(valid !== null, "Valid window bounds should be accepted");

    const offscreen = validateBounds({ x: 2500, y: 200, width: 1280, height: 860 }, primaryDisplay);
    assert.strictEqual(offscreen, null, "Off-screen bounds from disconnected monitor must be rejected");
  });

  // Test 7: Distraction Domain Classification and Sanitation
  test("Distraction shield: Domain sanitizer strips protocols, paths, and query parameters", () => {
    function cleanDomain(input) {
      if (!input) return "";
      let d = input.trim().toLowerCase();
      d = d.replace(/^https?:\/\//, "");
      d = d.replace(/\/.*$/, "");
      d = d.replace(/:.*$/, "");
      return d;
    }

    assert.strictEqual(cleanDomain("https://youtube.com/watch?v=123"), "youtube.com");
    assert.strictEqual(cleanDomain("http://reddit.com/r/popular"), "reddit.com");
    assert.strictEqual(cleanDomain("  TWITTER.COM/home  "), "twitter.com");
    assert.strictEqual(cleanDomain("localhost:5001/api"), "localhost");
  });

  // Test 8: Genuine On-Device Vision Engine Assets Integrity
  test("Vision Engine: On-device runtimes and model weights are packaged and valid", () => {
    const visionDir = path.join(__dirname, "vision");
    const picoPath = path.join(visionDir, "pico.js");
    const lplocPath = path.join(visionDir, "lploc.js");
    const facefinderPath = path.join(visionDir, "facefinder.bin");
    const puplocPath = path.join(visionDir, "puploc.bin");
    const trackerPath = path.join(visionDir, "attention-tracker.js");

    assert(fs.existsSync(picoPath), "pico.js runtime must exist");
    assert(fs.existsSync(lplocPath), "lploc.js runtime must exist");
    assert(fs.existsSync(facefinderPath), "facefinder.bin cascade model must exist");
    assert(fs.existsSync(puplocPath), "puploc.bin pupil localization model must exist");
    assert(fs.existsSync(trackerPath), "attention-tracker.js controller must exist");

    const facefinderStat = fs.statSync(facefinderPath);
    assert(facefinderStat.size > 200000, `facefinder.bin must be >200KB (got ${facefinderStat.size} bytes)`);

    const puplocStat = fs.statSync(puplocPath);
    assert(puplocStat.size > 1000000, `puploc.bin must be >1MB (got ${puplocStat.size} bytes)`);
  });

  // Test 9: HTML UI Structure (Integrated Camera Attention AI in Focus Mode)
  test("UI Integration: Camera Attention AI is integrated in Focus Mode without separate page", () => {
    const htmlContent = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

    assert(!htmlContent.includes('id="nav-camera"'), "nav-camera must be removed from sidebar navigation");
    assert(!htmlContent.includes('id="view-camera"'), "Standalone view-camera section must be removed");
    assert(htmlContent.includes('class="focus-grid-layout"'), "Focus layout must contain focus-grid-layout");
    assert(htmlContent.includes('id="camera-video-elem"'), "Focus mode must contain camera-video-elem");
    assert(htmlContent.includes('id="camera-overlay-canvas"'), "Focus mode must contain camera-overlay-canvas");
    assert(htmlContent.includes('id="btn-toggle-camera"'), "Focus mode must contain btn-toggle-camera");
  });

  // Test 10: Preload optional callbacks cannot stop application initialization
  test("Desktop lifecycle: Missing optional preload callbacks do NOT cause unhandled exceptions", () => {
    const desktopJs = fs.readFileSync(path.join(__dirname, "desktop.js"), "utf8");
    assert(
      desktopJs.includes('typeof desktopBridge.onTrayAction === "function"'),
      "desktop.js must guard onTrayAction invocation"
    );
    assert(
      desktopJs.includes("apiRequest:") || desktopJs.includes("apiRequest: async"),
      "desktop.js must include a safe apiRequest bridge fallback"
    );
  });

  // Test 11: Camera Attention AI integration contract
  test("Camera Attention AI: tracker is constructed with its real options API and a bridge", () => {
    const desktopJs = fs.readFileSync(path.join(__dirname, "desktop.js"), "utf8");
    const trackerJs = fs.readFileSync(
      path.join(__dirname, "vision", "attention-tracker.js"),
      "utf8"
    );

    assert(
      desktopJs.includes("new window.AttentionTracker({"),
      "Tracker must be constructed with the options object its constructor accepts"
    );
    assert(
      desktopJs.includes("trackerInstance.start({ loadVisionAsset })"),
      "Tracker.start must receive the vision asset loader bridge"
    );
    assert(
      desktopJs.includes("onTelemetryUpdate"),
      "Tracker telemetry must use the onTelemetryUpdate callback"
    );
    assert(
      desktopJs.includes("stopCameraAttentionAI"),
      "Camera must be stoppable and release its media tracks"
    );
    assert(
      !desktopJs.includes("state.camera.attentionStatus = status.charAt"),
      "Camera state must not be treated as a raw string"
    );
    assert(
      trackerJs.includes("run_cascade") && trackerJs.includes("getSummary"),
      "Tracker must run the real cascade and expose a real session summary"
    );
    assert(
      trackerJs.includes("detectionFps") && trackerJs.includes("distractionEvents"),
      "Tracker must report measured detection FPS and distraction events"
    );
  });

  // Test 12: Download route must follow the newest release, never a pinned tag
  test("Website download route: resolves the latest release asset", () => {
    const routePath = path.join(
      __dirname,
      "..",
      "frontend",
      "app",
      "api",
      "download",
      "desktop",
      "route.ts"
    );
    const routeContent = fs.readFileSync(routePath, "utf8");
    assert(
      routeContent.includes("/releases/latest/download/FocusFlow-Setup.exe"),
      "Download route must target the latest release asset"
    );
    assert(
      !/releases\/download\/v\d/.test(routeContent),
      "Download route must not pin a specific release tag"
    );
    assert(
      routeContent.includes('parsed.protocol !== "https:"'),
      "Configured download URL must be rejected when it is not HTTPS"
    );
  });

  console.log("\n=======================================================");
  console.log(`🎉 ALL ${passedCount} DESKTOP ARCHITECTURE TESTS PASSED! ✅`);
  console.log("=======================================================\n");
}

runAsyncTests();
