const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_IMAGE = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\464cdadf-a9a5-4df1-afc1-b8c5861956af\\.user_uploaded\\media_1792133650014.png';
const TEMP_OUTPUT_DIR = path.join(ROOT_DIR, 'scripts', 'temp-icons');

console.log('=== FocusFlow AI Brand Asset Generator ===');
if (!fs.existsSync(SOURCE_IMAGE)) {
  console.error(`ERROR: Source image not found at ${SOURCE_IMAGE}`);
  process.exit(1);
}

if (!fs.existsSync(TEMP_OUTPUT_DIR)) {
  fs.mkdirSync(TEMP_OUTPUT_DIR, { recursive: true });
}

// 1. Run PowerShell script to generate master 1024x1024 and resized PNGs
console.log('1. Generating high-res master and multi-size PNGs via PowerShell...');
const psScriptPath = path.join(ROOT_DIR, 'scripts', 'generate-pngs.ps1');
execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}" -SourceImage "${SOURCE_IMAGE}" -OutputDir "${TEMP_OUTPUT_DIR}"`, { stdio: 'inherit' });

// Function to construct standard Windows ICO file from PNG buffers
function buildIco(sizes) {
  const images = sizes.map(sz => {
    const pngPath = path.join(TEMP_OUTPUT_DIR, `focusflow_${sz}.png`);
    if (!fs.existsSync(pngPath)) {
      throw new Error(`Missing PNG: ${pngPath}`);
    }
    return {
      size: sz,
      buffer: fs.readFileSync(pngPath),
    };
  });

  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(img => img.buffer)]);
}

console.log('2. Building multi-resolution ICO file (16, 32, 48, 64, 128, 256)...');
const icoBuffer = buildIco([16, 32, 48, 64, 128, 256]);

// Destination file mappings
const fileCopies = [
  // Brand files
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_1024.jpg'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'brand-simplified-icon.jpg') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_1024.jpg'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'brand-main.jpg') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_1024.png'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'brand-master.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_512.png'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'icon-512.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_256.png'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'icon-256.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_128.png'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'icon-128.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_48.png'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'icon-48.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_32.png'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'icon-32.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_16.png'), to: path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'icon-16.png') },

  // Chrome Tab / Favicons in Frontend
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_32.png'), to: path.join(ROOT_DIR, 'frontend', 'app', 'icon.png') },

  // Extension icons
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_16.png'), to: path.join(ROOT_DIR, 'extension', 'icons', 'icon16.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_48.png'), to: path.join(ROOT_DIR, 'extension', 'icons', 'icon48.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_128.png'), to: path.join(ROOT_DIR, 'extension', 'icons', 'icon128.png') },

  // Windows Desktop icons
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_128.png'), to: path.join(ROOT_DIR, 'desktop', 'focusflow-icon.png') },
  { from: path.join(TEMP_OUTPUT_DIR, 'focusflow_256.png'), to: path.join(ROOT_DIR, 'desktop', 'focusflow-256.png') },
];

console.log('3. Writing image files across repositories...');
for (const item of fileCopies) {
  const dir = path.dirname(item.to);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(item.from, item.to);
  console.log(`  ✓ Written: ${path.relative(ROOT_DIR, item.to)}`);
}

// Write .ico files
const icoTargets = [
  path.join(ROOT_DIR, 'frontend', 'app', 'favicon.ico'),
  path.join(ROOT_DIR, 'frontend', 'public', 'favicon.ico'),
  path.join(ROOT_DIR, 'desktop', 'focusflow.ico'),
];

console.log('4. Writing multi-resolution .ico files...');
for (const target of icoTargets) {
  fs.writeFileSync(target, icoBuffer);
  console.log(`  ✓ Written: ${path.relative(ROOT_DIR, target)} (${icoBuffer.length} bytes)`);
}

// Generate an SVG wrapper embedding the 512px crisp PNG for SVG consumers
const png512Base64 = fs.readFileSync(path.join(TEMP_OUTPUT_DIR, 'focusflow_512.png')).toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="112" fill="#07070a"/>
  <image href="data:image/png;base64,${png512Base64}" width="512" height="512" />
</svg>
`;

const svgTargets = [
  path.join(ROOT_DIR, 'frontend', 'public', 'icon.svg'),
  path.join(ROOT_DIR, 'frontend', 'app', 'icon.svg'),
  path.join(ROOT_DIR, 'frontend', 'public', 'brand', 'brand-icon.svg'),
  path.join(ROOT_DIR, 'desktop', 'focusflow-icon.svg'),
  path.join(ROOT_DIR, 'extension', 'icons', 'focusflow-icon.svg'),
];

console.log('5. Writing SVG files...');
for (const svgTarget of svgTargets) {
  fs.writeFileSync(svgTarget, svgContent, 'utf8');
  console.log(`  ✓ Written: ${path.relative(ROOT_DIR, svgTarget)}`);
}

// Clean up temp-icons
try {
  fs.rmSync(TEMP_OUTPUT_DIR, { recursive: true, force: true });
} catch {}

console.log('=== All brand assets successfully generated! ===');
