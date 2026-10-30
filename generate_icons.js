const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) | 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t)
  ];
}

// Distance to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function renderSaveWiseIcon(size) {
  const width = size;
  const height = size;
  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLen);

  const scale = size / 512;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0;

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const nx = x / width;
      const ny = y / height;

      // Base Background Gradient (#0a192f to #064e3b)
      const gradT = (nx + ny) / 2;
      let r = Math.round(10 * (1 - gradT) + 6 * gradT);
      let g = Math.round(25 * (1 - gradT) + 78 * gradT);
      let b = Math.round(47 * (1 - gradT) + 59 * gradT);
      let a = 255;

      // Rounded squircle mask check
      const cornerR = 90 * scale;
      const pad = 20 * scale;
      const innerW = width - pad * 2;
      const innerH = height - pad * 2;

      const qx = Math.max(0, Math.abs(x - cx) - (innerW / 2 - cornerR));
      const qy = Math.max(0, Math.abs(y - cy) - (innerH / 2 - cornerR));
      const distFromCorner = Math.hypot(qx, qy);
      if (distFromCorner > cornerR) {
        // Outside squircle
        rawData[px] = 0;
        rawData[px + 1] = 0;
        rawData[px + 2] = 0;
        rawData[px + 3] = 0;
        continue;
      }

      // Shield region check (curved shield)
      // Normalize to 512 space
      const sx = x / scale;
      const sy = y / scale;

      const dxShield = Math.abs(sx - 256);
      let inShield = false;
      let inInnerShield = false;

      if (sy >= 92 && sy <= 420) {
        // Outer shield boundaries
        let maxDx = 0;
        if (sy < 130) {
          maxDx = 144 - (130 - sy) * 0.4;
        } else if (sy < 260) {
          maxDx = 144;
        } else {
          // taper to 0 at sy = 416
          const tTaper = (sy - 260) / 156;
          maxDx = 144 * (1 - tTaper * tTaper);
        }

        if (dxShield <= maxDx) {
          inShield = true;
          // Inner shield with 20px inset
          if (sy >= 112 && sy <= 390 && dxShield <= Math.max(0, maxDx - 22)) {
            inInnerShield = true;
          }
        }
      }

      if (inShield) {
        if (!inInnerShield) {
          // Emerald shield rim (#10b981 to #047857)
          const sT = (sy - 92) / 328;
          r = Math.round(16 * (1 - sT) + 4 * sT);
          g = Math.round(185 * (1 - sT) + 120 * sT);
          b = Math.round(129 * (1 - sT) + 87 * sT);
        } else {
          // Dark Navy Vault interior
          r = 11;
          g = 30;
          b = 44;
        }
      }

      // Golden Wisdom Coin at (256, 198) with radius 34 in 512 space
      const distCoin = Math.hypot(sx - 256, sy - 198);
      if (distCoin <= 34) {
        const coinT = (sx - 222 + sy - 164) / 68;
        r = Math.round(254 * (1 - coinT) + 217 * coinT);
        g = Math.round(240 * (1 - coinT) + 119 * coinT);
        b = Math.round(138 * (1 - coinT) + 6 * coinT);

        // Coin inner rim
        if (Math.abs(distCoin - 26) < 2) {
          r = 255;
          g = 255;
          b = 255;
        }
        // Dollar sign bar & curves in center of coin
        if (Math.abs(sx - 256) <= 2 && distCoin <= 20) {
          r = 120;
          g = 53;
          b = 15;
        } else if (distCoin <= 14 && Math.abs(sy - 198) <= 8 && (dxShield <= 8)) {
          // dollar 'S' body approximation
          if ((sy < 198 && sx < 256) || (sy > 198 && sx > 256) || Math.abs(sy - 198) <= 2 || Math.abs(sy - 192) <= 2 || Math.abs(sy - 204) <= 2) {
            r = 120;
            g = 53;
            b = 15;
          }
        }
      }

      // Upward Growth Trendline Polyline (182,310 -> 232,242 -> 282,286 -> 352,176)
      const d1 = distToSegment(sx, sy, 182, 310, 232, 242);
      const d2 = distToSegment(sx, sy, 232, 242, 282, 286);
      const d3 = distToSegment(sx, sy, 282, 286, 352, 176);
      // Arrowhead (320,172 -> 352,172) & (352,172 -> 352,204)
      const d4 = distToSegment(sx, sy, 320, 172, 352, 172);
      const d5 = distToSegment(sx, sy, 352, 172, 352, 204);

      const minDist = Math.min(d1, d2, d3, d4, d5);
      const strokeW = 9;

      if (minDist <= strokeW + 2) {
        // Glowing white line
        if (minDist <= strokeW) {
          r = 255;
          g = 255;
          b = 255;
        } else {
          // Antialiasing edge
          const alphaFactor = 1 - (minDist - strokeW) / 2;
          r = Math.round(r * (1 - alphaFactor) + 255 * alphaFactor);
          g = Math.round(g * (1 - alphaFactor) + 255 * alphaFactor);
          b = Math.round(b * (1 - alphaFactor) + 255 * alphaFactor);
        }
      }

      // Star sparkle at top right (390, 115)
      const dStarX = Math.abs(sx - 390);
      const dStarY = Math.abs(sy - 115);
      if ((dStarX <= 18 && dStarY <= 3) || (dStarY <= 18 && dStarX <= 3)) {
        r = 251;
        g = 191;
        b = 36;
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(rawData);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate to www/icons and android mipmap/assets
const targets = [
  { path: path.join(__dirname, 'www', 'icons', 'icon-192.png'), size: 192 },
  { path: path.join(__dirname, 'www', 'icons', 'icon-512.png'), size: 512 },
  { path: path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'icons', 'icon-192.png'), size: 192 },
  { path: path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'icons', 'icon-512.png'), size: 512 },
  { path: path.join(__dirname, 'android', 'app', 'src', 'main', 'res', 'mipmap', 'ic_launcher.png'), size: 192 }
];

targets.forEach(t => {
  fs.mkdirSync(path.dirname(t.path), { recursive: true });
  fs.writeFileSync(t.path, renderSaveWiseIcon(t.size));
  console.log(`Generated logo icon: ${t.path} (${t.size}x${t.size})`);
});
