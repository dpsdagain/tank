// Minimal Chrome DevTools Protocol driver for UI inspection.
// usage: node tools/inspect.cjs <url> <width> <height> [outfile] [evalScript]
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const [, , url = 'http://127.0.0.1:5173/', width = '1440', height = '900', out = '', script = '', clip = '', scale = '1'] = process.argv;
const port = 9200 + Math.floor(Math.random() * 500);
const userDir = path.join(os.tmpdir(), `pt-inspect-${process.pid}`);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions',
  `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
  `--window-size=${width},${height}`, 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const tabs = await res.json();
      const page = tabs.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const events = [];
    let id = 0;
    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      else if (msg.method) events.push(msg);
    };
    ws.onerror = reject;
    ws.onopen = () => resolve({
      events,
      send(method, params = {}) {
        return new Promise(res => {
          const mid = ++id;
          pending.set(mid, res);
          ws.send(JSON.stringify({ id: mid, method, params }));
        });
      },
      close() { ws.close(); }
    });
  });
}

(async () => {
  const cdp = await connect(await endpoint());
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: Number(width), height: Number(height), deviceScaleFactor: Number(scale), mobile: Number(width) < 700
  });
  await cdp.send('Page.navigate', { url });
  await sleep(2600);
  if (script) {
    let expression = script;
    if (fs.existsSync(script)) expression = fs.readFileSync(script, 'utf8').replace(/^\uFEFF/, '');
    const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) console.log('EXCEPTION: ' + JSON.stringify(res.result.exceptionDetails, null, 2));
    const value = res.result?.result?.value;
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  }
  if (out && out !== 'none') {
    const shotArgs = { format: 'png', captureBeyondViewport: false };
    if (clip) {
      const [x, y, w, h] = clip.split(',').map(Number);
      shotArgs.clip = { x, y, width: w, height: h, scale: 1 };
      shotArgs.captureBeyondViewport = true;
    }
    const shot = await cdp.send('Page.captureScreenshot', shotArgs);
    fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log('screenshot: ' + out);
  }
  cdp.close();
  const problems = cdp.events.filter(e =>
    (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)) ||
    e.method === 'Runtime.exceptionThrown');
  if (problems.length) {
    console.log('--- console problems ---');
    for (const p of problems) {
      const text = p.params.entry?.text || p.params.exceptionDetails?.exception?.description || p.params.exceptionDetails?.text;
      console.log((p.params.entry?.level || 'exception') + ': ' + text);
    }
  } else console.log('--- console clean ---');
  chrome.kill();
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(0);
})().catch(err => { console.error(err); chrome.kill(); process.exit(1); });
