const fs = require('fs');
const path = require('path');
const sharp = require(path.resolve(__dirname, '../frontend/node_modules/sharp'));

const srcPath = 'C:/Users/Admin/.gemini/antigravity-ide/brain/6a6e57f2-bdb4-4979-b1dd-7cebde06c92b/.user_uploaded/media_1792157484766.png';
const brandDir = path.resolve(__dirname, '../frontend/public/brand');
const publicDir = path.resolve(__dirname, '../frontend/public');

async function buildAssets() {
  console.log('Copying master logo from:', srcPath);
  if (!fs.existsSync(brandDir)) {
    fs.mkdirSync(brandDir, { recursive: true });
  }

  // 1. Copy untouched original
  fs.copyFileSync(srcPath, path.join(brandDir, 'focusflow-logo-master.png'));
  fs.copyFileSync(srcPath, path.join(brandDir, 'focusflow-logo-original.png'));
  fs.copyFileSync(srcPath, path.join(brandDir, 'brand-master.png'));

  // 2. Trimmed full logo (preserves 100% original pixel data within trimmed bounds)
  console.log('Generating trimmed logo...');
  const trimmedBuf = await sharp(srcPath).trim().png().toBuffer();
  fs.writeFileSync(path.join(brandDir, 'focusflow-logo.png'), trimmedBuf);
  fs.writeFileSync(path.join(brandDir, 'brand-logo.png'), trimmedBuf);

  // 3. Extract emblem (left mark)
  console.log('Extracting emblem mark...');
  const emblemAreaBuf = await sharp(srcPath)
    .extract({ left: 0, top: 0, width: 245, height: 344 })
    .png()
    .toBuffer();

  const emblemTrimmed = await sharp(emblemAreaBuf)
    .trim()
    .toBuffer({ resolveWithObject: true });

  console.log('Emblem trimmed bounds:', emblemTrimmed.info);

  // Create a perfectly square 512x512 emblem icon with clean transparent padding
  const emblemSquare = await sharp(emblemTrimmed.data)
    .resize(450, 450, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .extend({
      top: 31,
      bottom: 31,
      left: 31,
      right: 31,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(brandDir, 'focusflow-icon.png'), emblemSquare);
  fs.writeFileSync(path.join(brandDir, 'icon-512.png'), emblemSquare);
  fs.writeFileSync(path.join(brandDir, 'brand-simplified-icon.png'), emblemSquare);

  // High quality dark-backed version for jpg fallbacks if any
  const emblemJpg = await sharp(emblemSquare)
    .flatten({ background: '#0a0a0c' })
    .jpeg({ quality: 95 })
    .toBuffer();
  fs.writeFileSync(path.join(brandDir, 'brand-simplified-icon.jpg'), emblemJpg);

  // Generate resolutions: 256, 128, 64, 48, 32, 16
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = {};
  for (const s of sizes) {
    const buf = await sharp(emblemSquare).resize(s, s).png().toBuffer();
    pngBuffers[s] = buf;
    fs.writeFileSync(path.join(brandDir, `icon-${s}.png`), buf);
  }

  // Create standard multi-resolution ICO file
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const numImages = icoSizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  let offset = 6 + numImages * 16;
  const dirEntries = [];
  const imageBuffers = [];

  for (const s of icoSizes) {
    const imgBuf = pngBuffers[s];
    imageBuffers.push(imgBuf);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // width
    entry.writeUInt8(s === 256 ? 0 : s, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(imgBuf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    dirEntries.push(entry);
    offset += imgBuf.length;
  }

  const icoBuf = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  console.log('Saved public/favicon.ico (size:', icoBuf.length, ')');

  // Also create icon.svg containing crisp emblem
  const b64 = emblemSquare.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image width="512" height="512" href="data:image/png;base64,${b64}"/>
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);
  fs.writeFileSync(path.join(brandDir, 'brand-icon.svg'), svg);
  console.log('Saved icon.svg');

  // Also copy to extension/icons
  const extIconsDir = path.resolve(__dirname, '../extension/icons');
  if (fs.existsSync(extIconsDir)) {
    fs.copyFileSync(path.join(brandDir, 'icon-16.png'), path.join(extIconsDir, 'icon16.png'));
    fs.copyFileSync(path.join(brandDir, 'icon-48.png'), path.join(extIconsDir, 'icon48.png'));
    fs.copyFileSync(path.join(brandDir, 'icon-128.png'), path.join(extIconsDir, 'icon128.png'));
    fs.copyFileSync(path.join(publicDir, 'icon.svg'), path.join(extIconsDir, 'focusflow-icon.svg'));
    console.log('Synced extension/icons');
  }

  // Also copy to desktop/
  const desktopDir = path.resolve(__dirname, '../desktop');
  if (fs.existsSync(desktopDir)) {
    fs.copyFileSync(path.join(brandDir, 'icon-256.png'), path.join(desktopDir, 'focusflow-256.png'));
    fs.copyFileSync(path.join(brandDir, 'focusflow-icon.png'), path.join(desktopDir, 'focusflow-icon.png'));
    fs.copyFileSync(path.join(publicDir, 'icon.svg'), path.join(desktopDir, 'focusflow-icon.svg'));
    fs.copyFileSync(path.join(publicDir, 'favicon.ico'), path.join(desktopDir, 'focusflow.ico'));
    console.log('Synced desktop/ icons');
  }

  console.log('All brand assets successfully built!');
}

buildAssets().catch(console.error);
