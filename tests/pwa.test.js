import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PwaManager } from '../src/pwa/pwaManager.js';

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(buf.subarray(0, 8).equals(pngSig), `${path.basename(filePath)} must have valid PNG signature`);
  const chunkType = buf.subarray(12, 16).toString('ascii');
  assert.equal(chunkType, 'IHDR', `${path.basename(filePath)} first chunk must be IHDR`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

test('PWA Manifest & Icons: manifest.webmanifest is valid and all required PNG/SVG icons exist with exact dimensions', () => {
  const manifestPath = path.resolve('public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'public/manifest.webmanifest exists');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.short_name, 'ARGONIA');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'manifest has icons array');

  const has192 = manifest.icons.some((i) => i.sizes === '192x192' && i.type === 'image/png');
  const has512 = manifest.icons.some((i) => i.sizes === '512x512' && i.type === 'image/png' && i.purpose === 'any');
  const hasMaskable = manifest.icons.some((i) => i.sizes === '512x512' && i.type === 'image/png' && i.purpose === 'maskable');
  assert.ok(has192, 'manifest includes 192x192 PNG icon');
  assert.ok(has512, 'manifest includes 512x512 any PNG icon');
  assert.ok(hasMaskable, 'manifest includes 512x512 maskable PNG icon');

  for (const icon of manifest.icons) {
    const iconFile = path.resolve('public', icon.src);
    assert.ok(fs.existsSync(iconFile), `Icon file ${icon.src} exists on disk`);
    if (icon.type === 'image/png') {
      const [expW, expH] = icon.sizes.split('x').map(Number);
      const { width, height } = readPngDimensions(iconFile);
      assert.equal(width, expW, `${icon.src} width must be ${expW}`);
      assert.equal(height, expH, `${icon.src} height must be ${expH}`);
    }
  }

  const appleTouchPath = path.resolve('public/icons/apple-touch-icon.png');
  assert.ok(fs.existsSync(appleTouchPath), 'apple-touch-icon.png exists');
  const appleDims = readPngDimensions(appleTouchPath);
  assert.equal(appleDims.width, 180);
  assert.equal(appleDims.height, 180);
});

test('PWA Service Worker & HTML Integration: sw.js, index.html meta tags, and PwaManager work cleanly', () => {
  const swPath = path.resolve('public/sw.js');
  assert.ok(fs.existsSync(swPath), 'public/sw.js exists');
  const swCode = fs.readFileSync(swPath, 'utf8');
  assert.ok(swCode.includes("addEventListener('install'"), 'sw.js handles install event');
  assert.ok(swCode.includes("addEventListener('activate'"), 'sw.js handles activate event');
  assert.ok(swCode.includes("addEventListener('fetch'"), 'sw.js handles fetch event');

  const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert.ok(html.includes('rel="manifest" href="./manifest.webmanifest"'), 'index.html links manifest.webmanifest');
  assert.ok(html.includes('name="theme-color"'), 'index.html includes theme-color meta');
  assert.ok(html.includes('rel="apple-touch-icon"'), 'index.html links apple-touch-icon');
  assert.ok(html.includes('id="btn-title-install-pwa"'), 'index.html includes title PWA install button');
  assert.ok(html.includes('id="btn-hub-install-pwa"'), 'index.html includes hub PWA install button');

  const pwa = new PwaManager();
  assert.equal(pwa.isStandalone(), false);
  assert.doesNotThrow(() => pwa.init());
});
