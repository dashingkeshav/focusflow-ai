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
  path.join("vision", "pico.js"),
  path.join("vision", "lploc.js"),
  path.join("vision", "facefinder.bin"),
  path.join("vision", "puploc.bin"),
  path.join("vision", "attention-tracker.js"),
];

for (const file of requiredFiles) {
  const filePath = path.join(desktopDir, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required desktop resource: ${file}`);
  }
}

// Verified default production endpoint
const VERIFIED_PRODUCTION_ENDPOINT = "https://focusflow-ai-livid.vercel.app";

// Check configured backend URL from environment variables
// Supports FOCUSFLOW_BACKEND_URL or FOCUSFLOW_APP_URL
const rawEndpoint =
  process.env.FOCUSFLOW_BACKEND_URL?.trim() ||
  process.env.FOCUSFLOW_APP_URL?.trim() ||
  VERIFIED_PRODUCTION_ENDPOINT;

let backendUrl = null;
let mode = "standalone";
let configured = false;

if (process.env.FOCUSFLOW_STANDALONE === "true") {
  console.log("ℹ️ FOCUSFLOW_STANDALONE=true explicitly requested.");
  backendUrl = null;
  mode = "standalone";
  configured = false;
} else if (rawEndpoint) {
  try {
    const parsed = new URL(rawEndpoint);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      backendUrl = rawEndpoint.replace(/\/+$/, "");
      mode = "cloud";
      configured = true;
    } else {
      throw new Error(`Invalid protocol: ${parsed.protocol}`);
    }
  } catch (err) {
    throw new Error(`Invalid endpoint URL specified in environment: ${rawEndpoint} (${err.message})`);
  }
}

// Fail packaging if release build is configured with localhost or empty endpoint in production
const isReleaseBuild = process.env.CI || process.env.GITHUB_ACTIONS || process.argv.includes("--release");
if (isReleaseBuild) {
  if (!backendUrl || !backendUrl.startsWith("https://") || backendUrl.includes("localhost") || backendUrl.includes("127.0.0.1")) {
    throw new Error(`Production release packaging requires a verified HTTPS cloud endpoint. Got: ${backendUrl}`);
  }
}

const configData = {
  backendUrl,
  mode,
  configured,
  builtAt: new Date().toISOString(),
  version: "3.0.2",
};

const configPath = path.join(desktopDir, "desktop-config.json");
fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");

if (configured) {
  console.log(`✅ Production Cloud Backend configured: ${backendUrl}`);
} else {
  console.log("ℹ️ No production remote backend endpoint specified.");
  console.log("📦 Packaging in Standalone Local Desktop Mode.");
}
console.log("✅ Standalone desktop interface assets verified.");
console.log("📦 Ready for electron-builder packaging.");
console.log("=================================================");
