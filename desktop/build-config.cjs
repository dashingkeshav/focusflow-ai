const fs = require("node:fs");
const path = require("node:path");

console.log("=================================================");
console.log("🔨 Preparing FocusFlow AI Windows Desktop Package");
console.log("=================================================");

const desktopDir = __dirname;
const requiredFiles = [
  "index.html",
  "desktop.css",
  "desktop.js",
  "main.cjs",
  "preload.cjs",
  "package.json",
  "focusflow.ico",
  "focusflow-icon.png",
];

for (const file of requiredFiles) {
  const filePath = path.join(desktopDir, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required desktop resource: ${file}`);
  }
}

// Check configured backend URL from environment variables
// Supports FOCUSFLOW_BACKEND_URL or FOCUSFLOW_APP_URL
const rawEndpoint =
  process.env.FOCUSFLOW_BACKEND_URL?.trim() ||
  process.env.FOCUSFLOW_APP_URL?.trim() ||
  "";

let backendUrl = null;
let mode = "standalone";
let configured = false;

if (rawEndpoint) {
  // Validate protocol
  try {
    const parsed = new URL(rawEndpoint);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      backendUrl = rawEndpoint.replace(/\/+$/, "");
      mode = "cloud";
      configured = true;
    }
  } catch (err) {
    console.warn("⚠️ Invalid endpoint URL specified in environment:", rawEndpoint);
  }
}

const configData = {
  backendUrl,
  mode,
  configured,
  builtAt: new Date().toISOString(),
  version: "3.0.0",
};

const configPath = path.join(desktopDir, "desktop-config.json");
fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");

if (configured) {
  console.log(`✅ Production Cloud Backend configured: ${backendUrl}`);
} else {
  console.log("ℹ️ No production remote backend endpoint specified.");
  console.log("📦 Packaging in Standalone Local Desktop Mode (no dependency on localhost:5001).");
}
console.log("✅ Standalone desktop interface assets verified.");
console.log("📦 Ready for electron-builder packaging.");
console.log("=================================================");
