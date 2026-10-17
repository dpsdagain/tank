const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const publicFiles = new Set(['index.html', 'index.css', 'browser-game.js', 'game-core.js', 'weapons.js', 'native-effects.js', 'projectile-art.js', 'weapon-fx.js', 'effects-preview.html', 'flight-preview.html', 'flight-preview.js']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.ttf': 'font/ttf' };
const port = Number(process.env.PORT || process.argv[2]) || 5173;
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, ''); }
  catch { res.writeHead(400).end(); return; }
  if (!pathname) pathname = 'index.html';
  const filename = path.resolve(root, pathname);
  const relative = path.relative(root, filename);
  // Serve only the browser build. APKs, keystores and decompiled files stay private.
  if (relative.startsWith('..') || path.isAbsolute(relative) || !(publicFiles.has(pathname) || pathname.startsWith('assets/'))) { res.writeHead(404).end('Not found'); return; }
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', stat.size);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = fs.createReadStream(filename); stream.on('error', () => res.destroy()); stream.pipe(res);
  });
}).listen(port, '127.0.0.1', () => console.log(`Pocket Tanks is ready at http://localhost:${port}`));
