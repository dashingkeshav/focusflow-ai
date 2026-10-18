const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXTENSION_DIR = path.join(ROOT_DIR, 'extension');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const DOWNLOADS_DIR = path.join(ROOT_DIR, 'frontend', 'public', 'downloads');

const REQUIRED_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'classifier.js',
  'overlay.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'blocked.html',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'icons/focusflow-icon.svg',
];

console.log('--- FocusFlow AI Chrome Extension Packager ---');

// 1. Verify required files
console.log('1. Verifying extension files...');
for (const relPath of REQUIRED_FILES) {
  const fullPath = path.join(EXTENSION_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`ERROR: Missing required extension file: ${relPath}`);
    process.exit(1);
  }
}

// 2. Validate manifest.json
console.log('2. Validating manifest.json...');
try {
  const manifestRaw = fs.readFileSync(path.join(EXTENSION_DIR, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  if (manifest.manifest_version !== 3) {
    throw new Error(`Expected manifest_version 3, got ${manifest.manifest_version}`);
  }
  if (!manifest.background || !manifest.background.service_worker) {
    throw new Error('Missing background service worker');
  }
  console.log(`   Manifest valid: ${manifest.name} v${manifest.version}`);
} catch (err) {
  console.error('ERROR: manifest.json is invalid:', err.message);
  process.exit(1);
}

// Ensure target directories exist
if (!fs.existsSync(RELEASE_DIR)) fs.mkdirSync(RELEASE_DIR, { recursive: true });
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

const releaseZip = path.join(RELEASE_DIR, 'FocusFlow-Chrome-Extension.zip');
const publicZip = path.join(DOWNLOADS_DIR, 'FocusFlow-Chrome-Extension.zip');

// Clean up existing zip files
if (fs.existsSync(releaseZip)) fs.unlinkSync(releaseZip);
if (fs.existsSync(publicZip)) fs.unlinkSync(publicZip);

console.log('3. Creating zip archive...');

// Use PowerShell to pack contents of extension directory directly into zip root
// Using .NET ZipFile to ensure proper forward-slash paths and clean packaging
const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem;
$sourcePath = '${EXTENSION_DIR.replace(/\\/g, '\\\\')}';
$zipPath = '${releaseZip.replace(/\\/g, '\\\\')}';
[System.IO.Compression.ZipFile]::CreateFromDirectory($sourcePath, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false);
`;

try {
  execSync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ')}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('ERROR: Failed to create zip with PowerShell:', err);
  process.exit(1);
}

if (!fs.existsSync(releaseZip)) {
  console.error('ERROR: Zip file was not created at', releaseZip);
  process.exit(1);
}

// Copy to frontend downloads directory
console.log('4. Copying to public downloads directory...');
fs.copyFileSync(releaseZip, publicZip);

// Verify archive entries
console.log('5. Verifying zip contents...');
const verifyPs = `
Add-Type -AssemblyName System.IO.Compression.FileSystem;
$zip = [System.IO.Compression.ZipFile]::OpenRead('${releaseZip.replace(/\\/g, '\\\\')}');
$zip.Entries | ForEach-Object { $_.FullName };
$zip.Dispose();
`;
const entries = execSync(`powershell -NoProfile -Command "${verifyPs.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/);

console.log(`   Archive created with ${entries.length} entries.`);
const hasManifest = entries.includes('manifest.json');
const hasBackground = entries.includes('background.js');
const hasContent = entries.includes('content.js');
const hasPopup = entries.includes('popup.html');

if (!hasManifest || !hasBackground || !hasContent || !hasPopup) {
  console.error('ERROR: Archive missing root files:', { hasManifest, hasBackground, hasContent, hasPopup });
  process.exit(1);
}

const stats = fs.statSync(releaseZip);
console.log(`SUCCESS: Package ready!`);
console.log(`  - Release:   ${releaseZip} (${(stats.size / 1024).toFixed(1)} KB)`);
console.log(`  - Downloads: ${publicZip} (${(stats.size / 1024).toFixed(1)} KB)`);
