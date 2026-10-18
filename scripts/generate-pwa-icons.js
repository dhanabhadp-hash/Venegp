import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPNG(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure public dir exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Write public/icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#27272a" stroke-width="4"/>

  <!-- Hospital Cross & Calendar Base Badge -->
  <g transform="translate(106, 86)">
    <!-- Calendar Card Outer -->
    <rect x="0" y="40" width="300" height="270" rx="36" fill="#18181b" stroke="#3f3f46" stroke-width="6"/>
    <!-- Calendar Header Bar -->
    <path d="M0 76 Q0 40 36 40 L264 40 Q300 40 300 76 L300 110 L0 110 Z" fill="url(#emeraldGrad)"/>

    <!-- Calendar Rings -->
    <rect x="65" y="16" width="16" height="46" rx="8" fill="#e4e4e7"/>
    <rect x="219" y="16" width="16" height="46" rx="8" fill="#e4e4e7"/>

    <!-- Medical Hospital Cross Emblem in center -->
    <g transform="translate(150, 205)">
      <!-- Soft circle back -->
      <circle r="64" fill="#09090b" stroke="#27272a" stroke-width="4"/>
      <!-- Cross horizontal -->
      <rect x="-42" y="-14" width="84" height="28" rx="8" fill="url(#emeraldGrad)"/>
      <!-- Cross vertical -->
      <rect x="-14" y="-42" width="28" height="84" rx="8" fill="url(#emeraldGrad)"/>
      <!-- Inner core dot -->
      <circle r="7" fill="#ffffff"/>
    </g>
  </g>

  <!-- Synchronize / LINE Active Signal Pulse -->
  <circle cx="386" cy="126" r="28" fill="#10b981" filter="url(#glow)"/>
  <circle cx="386" cy="126" r="14" fill="#ffffff"/>

  <!-- Brand Typography -->
  <text x="256" y="432" font-family="'JetBrains Mono', 'Prompt', sans-serif" font-size="38" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="4">DUTYSYNC</text>
  <text x="256" y="470" font-family="'Prompt', sans-serif" font-size="20" font-weight="500" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">รพ.สบปราบ • เภสัชกรรม</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
console.log('Created public/icon.svg');

// Helper to draw brand icon on pixel buffer
function drawBrandIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const scale = w / 512;

  // Maskable needs safe zone (80% inside center)
  const contentScale = isMaskable ? scale * 0.76 : scale;

  // Background
  const bgDark = [12, 12, 15, 255]; // #0c0c0f
  const bgBorder = [39, 39, 42, 255]; // #27272a
  const emerald = [16, 185, 129, 255]; // #10b981
  const white = [255, 255, 255, 255];
  const grayLight = [228, 228, 231, 255]; // #e4e4e7
  const grayCard = [24, 24, 27, 255]; // #18181b

  // Base background
  if (!isMaskable) {
    // Rounded corner for standard icon
    const cornerRadius = 112 * scale;
    const dx = Math.max(Math.abs(x - cx) - (w / 2 - cornerRadius), 0);
    const dy = Math.max(Math.abs(y - cy) - (h / 2 - cornerRadius), 0);
    if (Math.hypot(dx, dy) > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent outer
    }
  }

  // Position relative to content center
  const relX = (x - cx) / contentScale;
  const relY = (y - cy) / contentScale;

  // Calendar Card Bounds: width 300 (-150 to 150), height 270 (-115 to 155)
  const inCard = relX >= -150 && relX <= 150 && relY >= -115 && relY <= 155;
  const inHeader = relX >= -150 && relX <= 150 && relY >= -115 && relY <= -55;

  // Rings at x=-85 and x=69, y=-135 to -95
  const inRing1 = Math.abs(relX - (-85)) <= 8 && Math.abs(relY - (-115)) <= 22;
  const inRing2 = Math.abs(relX - 69) <= 8 && Math.abs(relY - (-115)) <= 22;

  // Medical Cross centered at relX=0, relY=35
  const crossX = relX;
  const crossY = relY - 35;
  const distCrossCenter = Math.hypot(crossX, crossY);
  const inCrossH = Math.abs(crossX) <= 42 && Math.abs(crossY) <= 14;
  const inCrossV = Math.abs(crossX) <= 14 && Math.abs(crossY) <= 42;
  const inCrossDot = distCrossCenter <= 7;

  // Notification dot at top right
  const notifX = relX - 130;
  const notifY = relY - (-110);
  const distNotif = Math.hypot(notifX, notifY);

  if (inRing1 || inRing2) {
    return grayLight;
  }
  if (distNotif <= 12) {
    return white;
  }
  if (distNotif <= 26) {
    return emerald;
  }
  if (inCrossDot) {
    return white;
  }
  if (inCrossH || inCrossV) {
    return emerald;
  }
  if (distCrossCenter <= 62) {
    return [10, 10, 12, 255];
  }
  if (inHeader) {
    return emerald;
  }
  if (inCard) {
    return grayCard;
  }

  // Subtle border card
  const inCardBorder = relX >= -156 && relX <= 156 && relY >= -121 && relY <= 161;
  if (inCardBorder) {
    return bgBorder;
  }

  return bgDark;
}

// Generate PNGs
const iconsToGenerate = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon-32x32.png', size: 32, maskable: false },
];

for (const icon of iconsToGenerate) {
  const pngBuf = createPNG(icon.size, icon.size, (x, y, w, h) =>
    drawBrandIcon(x, y, w, h, icon.maskable)
  );
  fs.writeFileSync(path.join(publicDir, icon.file), pngBuf);
  console.log(`Generated public/${icon.file} (${icon.size}x${icon.size})`);
}
