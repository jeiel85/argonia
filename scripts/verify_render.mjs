import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';

const PORT = 4173;
const DIST = path.resolve('dist');
const SCREENSHOT_PATH = 'C:\\Users\\jeiel\\.gemini\\antigravity\\brain\\806d0e72-5533-4da1-a7a6-7af2121fcd5f\\verify_blender_ingame.png';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(DIST, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    const indexPath = path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexPath).pipe(res);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);

  const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const args = [
    '--headless=new',
    '--disable-gpu=false',
    '--window-size=1280,720',
    `--screenshot=${SCREENSHOT_PATH}`,
    `http://127.0.0.1:${PORT}/?autostart=1`,
  ];

  console.log('Launching headless Edge for screenshot verification...');
  // Give it 3 seconds to let 3D models load and canvas render
  setTimeout(() => {
    execFile(edgeExe, args, (err, stdout, stderr) => {
      if (err) console.error('Edge error:', err);
      if (stdout) console.log('Edge stdout:', stdout);
      if (stderr) console.error('Edge stderr:', stderr);

      if (fs.existsSync(SCREENSHOT_PATH)) {
        const stats = fs.statSync(SCREENSHOT_PATH);
        console.log(`Screenshot saved successfully: ${SCREENSHOT_PATH} (${stats.size} bytes)`);
      } else {
        console.warn('Screenshot file was not created');
      }

      server.close(() => {
        console.log('Server stopped cleanly.');
        process.exit(0);
      });
    });
  }, 1500);
});
