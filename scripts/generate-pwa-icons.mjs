/**
 * ARGONIA: Crown of the Spire — PWA Icon Generator
 * Pure Node.js (zero external dependencies) antialiased RGBA PNG & SVG generator
 * Creates:
 *  - public/icons/icon-192.png (192x192)
 *  - public/icons/icon-512.png (512x512)
 *  - public/icons/icon-maskable-512.png (512x512 with safe zone padding)
 *  - public/icons/apple-touch-icon.png (180x180)
 *  - public/icons/icon.svg (vector icon)
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ICONS_DIR = path.resolve('public/icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

// Precompute CRC32 table for PNG chunks
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type None
    const srcOffset = y * width * 4;
    rgba.copy(raw, rowStart + 1, srcOffset, srcOffset + width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ]);
}

// Signed distance to a regular hexagon centered at (0,0) with circumradius R (pointy-top)
function sdHexagonPointy(px, py, r) {
  // Rotate 30 degrees so flat-top formula applies to pointy-top
  const rx = Math.abs(px * 0.86602540378 + py * 0.5);
  const ry = Math.abs(-px * 0.5 + py * 0.86602540378);
  const kx = -0.86602540378;
  const ky = 0.5;
  const kz = 0.57735026919;
  let x = rx;
  let y = ry;
  const dot = Math.min(kx * x + ky * y, 0.0);
  x -= 2.0 * dot * kx;
  y -= 2.0 * dot * ky;
  const inR = r * 0.86602540378;
  const clampedX = Math.max(-kz * inR, Math.min(kz * inR, x));
  x -= clampedX;
  y -= inR;
  return Math.hypot(x, y) * Math.sign(y);
}

// Signed distance to a 2D triangle (p0, p1, p2)
function sdTriangle(px, py, x0, y0, x1, y1, x2, y2) {
  const e0x = x1 - x0, e0y = y1 - y0;
  const e1x = x2 - x1, e1y = y2 - y1;
  const e2x = x0 - x2, e2y = y0 - y2;
  const v0x = px - x0, v0y = py - y0;
  const v1x = px - x1, v1y = py - y1;
  const v2x = px - x2, v2y = py - y2;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const t0 = clamp01((v0x * e0x + v0y * e0y) / (e0x * e0x + e0y * e0y));
  const t1 = clamp01((v1x * e1x + v1y * e1y) / (e1x * e1x + e1y * e1y));
  const t2 = clamp01((v2x * e2x + v2y * e2y) / (e2x * e2x + e2y * e2y));

  const pq0x = v0x - e0x * t0, pq0y = v0y - e0y * t0;
  const pq1x = v1x - e1x * t1, pq1y = v1y - e1y * t1;
  const pq2x = v2x - e2x * t2, pq2y = v2y - e2y * t2;

  const s = Math.sign(e0x * e2y - e0y * e2x);
  const d0 = pq0x * pq0x + pq0y * pq0y;
  const d1 = pq1x * pq1x + pq1y * pq1y;
  const d2 = pq2x * pq2x + pq2y * pq2y;
  const minD = Math.min(d0, d1, d2);

  const c0 = s * (v0x * e0y - v0y * e0x);
  const c1 = s * (v1x * e1y - v1y * e1x);
  const c2 = s * (v2x * e2y - v2y * e2x);
  const minC = Math.min(c0, c1, c2);

  return -Math.sqrt(minD) * Math.sign(minC);
}

// Signed distance to a rounded box centered at (0,0) with half-size b and corner radius r
function sdRoundedBox(px, py, b, r) {
  const qx = Math.abs(px) - b + r;
  const qy = Math.abs(py) - b + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function renderArgoniaIcon(size, { maskable = false, rounded = true } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.78 : 0.92;
  const aa = 1.5 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Normalized coordinates in [-1, 1]
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;

      // Background rounded card or full bleed for maskable
      let alpha = 1.0;
      if (!maskable && rounded) {
        const dBox = sdRoundedBox(nx, ny, 0.96, 0.22);
        alpha = 1.0 - smoothstep(-aa, aa, dBox);
      }

      if (alpha <= 0) {
        continue;
      }

      // Deep obsidian radial background gradient
      const radial = Math.hypot(nx, ny);
      let r = lerp(28, 12, Math.min(1, radial * 0.9));
      let g = lerp(24, 10, Math.min(1, radial * 0.9));
      let b = lerp(20, 8, Math.min(1, radial * 0.9));

      // Scaled coordinates for emblem
      const sx = nx / scale;
      const sy = ny / scale;

      // Outer hexagon shield
      const dOuterHex = sdHexagonPointy(sx, sy, 0.82);
      const outerFillMask = 1.0 - smoothstep(-aa, aa, dOuterHex);
      const outerStrokeMask = 1.0 - smoothstep(0.0, aa * 1.4, Math.abs(dOuterHex + 0.035) - 0.035);

      if (outerFillMask > 0) {
        const hexGrad = clamp((sy + 0.8) / 1.6);
        const hr = lerp(34, 16, hexGrad);
        const hg = lerp(29, 14, hexGrad);
        const hb = lerp(23, 12, hexGrad);
        r = lerp(r, hr, outerFillMask);
        g = lerp(g, hg, outerFillMask);
        b = lerp(b, hb, outerFillMask);
      }

      // Brass/Gold outer hexagon border
      if (outerStrokeMask > 0) {
        const shine = clamp(1.0 - (sy + 0.85) * 0.55);
        const br = lerp(180, 243, shine);
        const bg = lerp(136, 204, shine);
        const bb = lerp(64, 104, shine);
        r = lerp(r, br, outerStrokeMask);
        g = lerp(g, bg, outerStrokeMask);
        b = lerp(b, bb, outerStrokeMask);
      }

      // Inner hexagon sanctum ring
      const dInnerHex = sdHexagonPointy(sx, sy, 0.52);
      const innerFillMask = 1.0 - smoothstep(-aa, aa, dInnerHex);
      const innerStrokeMask = 1.0 - smoothstep(0.0, aa * 1.3, Math.abs(dInnerHex + 0.018) - 0.018);

      if (innerFillMask > 0) {
        // Subtle golden-amber inner glow
        r = lerp(r, 62, innerFillMask * 0.45);
        g = lerp(g, 48, innerFillMask * 0.45);
        b = lerp(b, 24, innerFillMask * 0.45);
      }

      if (innerStrokeMask > 0) {
        r = lerp(r, 243, innerStrokeMask * 0.9);
        g = lerp(g, 204, innerStrokeMask * 0.9);
        b = lerp(b, 104, innerStrokeMask * 0.9);
      }

      // Spire Crown central triangular blade + side crown prongs
      const dCenterSpire = sdTriangle(sx, sy, 0.0, -0.42, 0.28, 0.22, -0.28, 0.22);
      const dLeftProng = sdTriangle(sx, sy, -0.34, -0.18, -0.10, 0.22, -0.34, 0.22);
      const dRightProng = sdTriangle(sx, sy, 0.34, -0.18, 0.34, 0.22, 0.10, 0.22);
      const dCrown = Math.min(dCenterSpire, dLeftProng, dRightProng);
      const crownMask = 1.0 - smoothstep(-aa, aa, dCrown);

      if (crownMask > 0) {
        const crownGrad = clamp(1.0 - (sy + 0.42) / 0.7);
        const cr = lerp(208, 253, crownGrad);
        const cg = lerp(158, 224, crownGrad);
        const cb = lerp(70, 115, crownGrad);
        r = lerp(r, cr, crownMask);
        g = lerp(g, cg, crownMask);
        b = lerp(b, cb, crownMask);
      }

      // Argon crystal core jewel inside the spire
      const dCrystal = Math.hypot(sx, sy - 0.05) - 0.085;
      const crystalMask = 1.0 - smoothstep(-aa, aa, dCrystal);
      if (crystalMask > 0) {
        r = lerp(r, 94, crystalMask);
        g = lerp(g, 194, crystalMask);
        b = lerp(b, 230, crystalMask);
      }

      const idx = (y * size + x) * 4;
      buf[idx] = Math.round(Math.max(0, Math.min(255, r)));
      buf[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
      buf[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
      buf[idx + 3] = Math.round(Math.max(0, Math.min(255, alpha * 255)));
    }
  }

  return encodePNG(size, size, buf);
}

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

// Generate PNG icons
fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), renderArgoniaIcon(192, { maskable: false, rounded: true }));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), renderArgoniaIcon(512, { maskable: false, rounded: true }));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-512.png'), renderArgoniaIcon(512, { maskable: true, rounded: false }));
fs.writeFileSync(path.join(ICONS_DIR, 'apple-touch-icon.png'), renderArgoniaIcon(180, { maskable: false, rounded: false }));

// Generate matching SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#1c1814"/>
      <stop offset="100%" stop-color="#0b0a08"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="55%" stop-color="#f3cc68"/>
      <stop offset="100%" stop-color="#b48840"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <polygon points="256,46 438,151 438,361 256,466 74,361 74,151" fill="#161310" stroke="url(#gold)" stroke-width="18" stroke-linejoin="round"/>
  <polygon points="256,120 374,188 374,324 256,392 138,324 138,188" fill="rgba(243,204,104,0.16)" stroke="#f3cc68" stroke-width="9" stroke-linejoin="round"/>
  <polygon points="172,210 232,306 172,306" fill="url(#gold)"/>
  <polygon points="340,210 340,306 280,306" fill="url(#gold)"/>
  <polygon points="256,148 326,306 186,306" fill="url(#gold)"/>
  <circle cx="256" cy="264" r="20" fill="#5ec2e6"/>
</svg>
`;
fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), svgContent, 'utf8');

console.log('Generated Argonia PWA icons in public/icons/');
