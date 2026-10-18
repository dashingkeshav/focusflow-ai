const fs = require("node:fs");
const path = require("node:path");

console.log("=================================================");
console.log("🔨 Preparing FocusFlow AI Windows Desktop Package");
console.log("=================================================");

const desktopDir = __dirname;
const rootPackage = JSON.parse(
  fs.readFileSync(path.join(desktopDir, "..", "package.json"), "utf8")
);
const appVersion = rootPackage.version;

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

/*
=====================================================
TWO DISTINCT ENDPOINTS — NEVER INTERCHANGEABLE
=====================================================
FOCUSFLOW_APP_URL      → public frontend website (Vercel)
FOCUSFLOW_BACKEND_URL  → public API base URL (Render)
=====================================================
*/
const DEFAULT_APP_URL = "https://focusflow-ai-livid.vercel.app";
const DEFAULT_BACKEND_URL = "https://focusflow-ai-api.onrender.com";

const isReleaseBuild =
  process.env.CI === "true" ||
  Boolean(process.env.GITHUB_ACTIONS) ||
  process.argv.includes("--release");

function normalizePublicUrl(rawValue, label, { required }) {
  const value = (rawValue || "").trim();

  if (!value) {
    if (required) {
      throw new Error(
        `${label} is required for a production release build. ` +
          `Set ${label} to the public HTTPS URL (never localhost).`
      );
    }
    return null;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid absolute URL: ${value}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use http or https. Got: ${parsed.protocol}`);
  }

  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";

  if (isReleaseBuild && (parsed.protocol !== "https:" || isLoopback)) {
    throw new Error(
      `${label} must be a public HTTPS URL for release builds. Got: ${value}`
    );
  }

  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error(`${label} must be an origin without a path. Got: ${value}`);
  }

  return parsed.origin;
}

if (process.env.FOCUSFLOW_STANDALONE === "true") {
  const configData = {
    appUrl: normalizePublicUrl(
      process.env.FOCUSFLOW_APP_URL || DEFAULT_APP_URL,
      "FOCUSFLOW_APP_URL",
      { required: false }
    ),
    backendUrl: null,
    mode: "standalone",
    configured: false,
    builtAt: new Date().toISOString(),
    version: appVersion,
  };

  fs.writeFileSync(
    path.join(desktopDir, "desktop-config.json"),
    JSON.stringify(configData, null, 2),
    "utf8"
  );

  console.log("ℹ️ FOCUSFLOW_STANDALONE=true explicitly requested.");
  console.log("📦 Packaging in Standalone Local Desktop Mode (no cloud API).");
  console.log("=================================================");
  process.exit(0);
}

const appUrl = normalizePublicUrl(
  process.env.FOCUSFLOW_APP_URL || DEFAULT_APP_URL,
  "FOCUSFLOW_APP_URL",
  { required: isReleaseBuild }
);

const backendUrl = normalizePublicUrl(
  process.env.FOCUSFLOW_BACKEND_URL || DEFAULT_BACKEND_URL,
  "FOCUSFLOW_BACKEND_URL",
  { required: isReleaseBuild }
);

if (!backendUrl) {
  throw new Error(
    "FOCUSFLOW_BACKEND_URL is required. This must be the public Render API origin " +
      "(for example https://focusflow-ai-api.onrender.com), not the frontend website URL."
  );
}

if (appUrl && appUrl === backendUrl) {
  throw new Error(
    "FOCUSFLOW_APP_URL and FOCUSFLOW_BACKEND_URL must be different origins. " +
      "The website URL must never be used as the API backend."
  );
}

const configData = {
  appUrl,
  backendUrl,
  mode: "cloud",
  configured: true,
  builtAt: new Date().toISOString(),
  version: appVersion,
};

fs.writeFileSync(
  path.join(desktopDir, "desktop-config.json"),
  JSON.stringify(configData, null, 2),
  "utf8"
);

console.log(`✅ Website (FOCUSFLOW_APP_URL):     ${appUrl}`);
console.log(`✅ API backend (FOCUSFLOW_BACKEND_URL): ${backendUrl}`);
console.log(`✅ Desktop version:                ${appVersion}`);
console.log("✅ Standalone desktop interface assets verified.");
console.log("📦 Ready for electron-builder packaging.");
console.log("=================================================");
