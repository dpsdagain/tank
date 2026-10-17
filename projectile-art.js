/* Projectile silhouettes and motion. All drawing is cosmetic; physics stays in PocketCore. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  // Share decoded artwork across the game and the six effect-reel renderers.
  const paintedCache = new Map();
  const styles = {
    single_shot: ['shell', '#ff5fb2', 'line', 2, 'Pointed shell · magenta tracer'],
    big_shot: ['heavyShell', '#ff6748', 'line', 4, 'Heavy red shell · thick wake'],
    '3_shot': ['dart', '#ff9de9', 'line', 1.8, 'Three pink darts'],
    '5_shot': ['dartFive', '#bc8cff', 'line', 1.5, 'Five violet darts'],
    sniper_rifle: ['needle', '#fff3b1', 'line', .8, 'Silver needle · fine white streak'],
    cannon_ball: ['iron', '#b1c6dc', 'none', 0, 'Spinning iron ball · bounce sparks'],
    chain_reaction: ['fuse', '#ffb747', 'fuse', 2, 'Linked fuse capsule · running sparks'],
    skipper: ['disc', '#6dffc0', 'dotted', 1.7, 'Spinning disc · skipping tracer'],
    roller: ['wheel', '#61e1ff', 'dotted', 1.3, 'Blue rim · rotating spokes'],
    heavy_roller: ['drum', '#ffcb72', 'dust', 2, 'Armored drum · twin rims'],
    napalm: ['canister', '#ff8b36', 'droplets', 2.5, 'Copper canister · leaking fire'],
    hail_storm: ['ice', '#9aeeff', 'frost', 2, 'Ice capsule → falling crystals'],
    dirtball: ['clod', '#be985e', 'dust', 2, 'Rotating clod · loose pebbles'],
    big_dirtball: ['boulder', '#c7a47c', 'dust', 3, 'Rocky soil boulder · dense dust'],
    dirt_slinger: ['fork', '#b6d26a', 'fork', 1.5, 'Forked pod · twin dust streams'],
    mud_pie: ['mud', '#be8051', 'mud', 2.2, 'Wobbling mud disc · sticky drops'],
    jackhammer: ['hammer', '#ffdb59', 'ticks', 1.5, 'Reciprocating yellow piston'],
    digger: ['drill', '#d2e3e7', 'dust', 1.6, 'Steel corkscrew · rotating helix'],
    ground_hog: ['auger', '#a8e66c', 'dust', 2.2, 'Chunky auger · soil ripples'],
    pile_driver: ['ram', '#ffae67', 'ticks', 2, 'Heavy ram · pumping striking face'],
    heatseeker: ['missile', '#ff6170', 'exhaust', 2.4, 'Sensor missile · steering exhaust'],
    homing_worm: ['worm', '#df8cda', 'none', 0, 'Undulating segmented body'],
    beehive: ['hive', '#ffcf57', 'pollen', 1.5, 'Honeycomb pod → winged bees'],
    pin_cushion: ['spikes', '#c5a0ff', 'dotted', 1.5, 'Spiked pod → twelve needles'],
    laser: ['beam', '#46ffde', 'line', 2, 'Thin cyan beam · white core'],
    super_laser: ['wideBeam', '#7bdcff', 'line', 8, 'Wide blue-white beam · outer bands'],
    lightning_strike: ['conductor', '#d6a4ff', 'electric', 2, 'Conductor · branching violet arcs'],
    space_laser: ['beacon', '#71fff2', 'signal', 1.5, 'Diamond beacon · orbiting ring'],
    nuke: ['bomb', '#b8d66b', 'smoke', 2, 'Olive finned bomb · dark trefoil'],
    mega_nuke: ['megaBomb', '#ffe05f', 'twin', 3, 'Heavy striped bomb · twin exhaust'],
    comet: ['comet', '#99eaff', 'comet', 5, 'Icy nucleus · long blue streamer'],
    meteor_shower: ['meteorMarker', '#ff8e57', 'meteor', 3, 'Red marker → burning rock shower'],
    fireball: ['fire', '#ff932f', 'fire', 5, 'Living flame · licking tail'],
    volcano: ['lavaPod', '#ff7143', 'lava', 2.5, 'Cracked lava pod → molten chunks'],
    jump_jets: ['jets', '#8beaff', 'none', 0, 'The tank flies on blue-white thrusters'],
    magic_wall: ['stone', '#8effe4', 'cubes', 1.5, 'Runed stone · orbiting cubes']
  };
  const catalog = Object.freeze(Object.fromEntries(Object.entries(styles).map(([id, s]) =>
    [id, Object.freeze({ shape: s[0], color: s[1], trail: s[2], width: s[3], label: s[4] })])));
  const dot = (c, x, y, r, fill) => { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  function line(c, points, color, width = 1.5) {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  }
  function poly(c, points, color, edge = '#101e29', width = 1.6) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = edge; c.lineWidth = width; c.stroke();
  }
  function oval(c, x, y, rx, ry, color, edge = '#17212b') {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = color; c.fill();
    if (edge) { c.strokeStyle = edge; c.lineWidth = 1.7; c.stroke(); }
  }
  function box(c, x, y, w, h, color, radius = 2) {
    c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = color; c.fill();
    c.strokeStyle = '#18242b'; c.lineWidth = 1.5; c.stroke();
  }
  function rock(c, radius, color, phase = 0) {
    poly(c, Array.from({ length: 11 }, (_, i) => {
      const a = i / 11 * TAU, r = radius * (1 + Math.sin(i * 3.7 + phase) * .16);
      return [Math.cos(a) * r, Math.sin(a) * r];
    }), color);
    poly(c, [[-radius * .6, -radius * .3], [0, -radius * .7], [radius * .3, -.5], [-radius * .2, radius * .1]], '#ffffff27', '#ffffff00', 0);
  }

  class ProjectileArt {
    constructor(options = {}) {
      this.reducedMotion = !!options.reducedMotion;
      this.paintedEnabled = options.paintedArt !== false;
      this.paintedData = root.PAINTED_SPRITES || { assets: {}, weapons: {} };
      this.paintedImages = {};
      if (typeof Image !== 'undefined') for (const [key, asset] of Object.entries(this.paintedData.assets)) {
        let img = paintedCache.get(asset.src);
        if (!img) {
          img = new Image(); img.decoding = 'async';
          paintedCache.set(asset.src, img);
          img.src = asset.src;
        }
        this.paintedImages[key] = img;
        if (options.onArtReady) {
          if (img.complete) queueMicrotask(options.onArtReady);
          else {
            img.addEventListener('load', options.onArtReady, { once: true });
            img.addEventListener('error', options.onArtReady, { once: true });
          }
        }
      }
    }
    style(id) { return catalog[id] || catalog.single_shot; }
    hasPaintedAsset(key) {
      const img = this.paintedImages[key];
      return !!(this.paintedData.assets[key] && img && img.complete && img.naturalWidth);
    }
    paintedAvailable(id) {
      const spec = this.paintedData.weapons[id];
      return this.paintedEnabled && !!spec && this.hasPaintedAsset(spec.asset) &&
        (!spec.tipAsset || this.hasPaintedAsset(spec.tipAsset));
    }
    paintedFrame(c, key, frameIndex, width, x = 0, y = 0, anchor = [.5, .5]) {
      const asset = this.paintedData.assets[key];
      const frame = asset.frames[frameIndex % asset.frames.length], r = frame.rect, b = frame.body;
      // Size/anchor against the solid body, while retaining the full soft alpha edge.
      // Source PNGs remain intact, including transparent gutters between frames.
      const ratio = width / b[2], ax = b[0] + b[2] * anchor[0], ay = b[1] + b[3] * anchor[1];
      c.drawImage(this.paintedImages[key], ...r,
        x + (r[0] - ax) * ratio, y + (r[1] - ay) * ratio, r[2] * ratio, r[3] * ratio);
    }
    drawPainted(c, p, motion) {
      const id = p.weapon.id;
      if (!this.paintedAvailable(id) || (id === 'beehive' && p.child)) return false;
      const spec = this.paintedData.weapons[id];
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      switch (id) {
        case 'heatseeker':
          poly(c, [[-16, -2.5], [-30 - Math.sin(motion * 25) * 3, 0], [-16, 2.5]], '#ffad45', '#ff6b36', .6);
          poly(c, [[-16, -1.2], [-25 - Math.sin(motion * 25) * 2, 0], [-16, 1.2]], '#fff2c4', '#fff2c4', .3);
          this.paintedFrame(c, spec.asset, 0, spec.width);
          break;
        case 'digger':
          this.paintedFrame(c, spec.asset, 0, spec.width, -10);
          this.paintedFrame(c, spec.tipAsset, Math.floor(motion * spec.fps), spec.tipWidth, -1, 0, [0, .5]);
          break;
        case 'beehive':
          c.rotate(Math.sin(motion * 5) * .08); c.scale(1, 1 + Math.sin(motion * 6) * .025);
          this.paintedFrame(c, spec.asset, 0, spec.width);
          break;
        case 'comet':
          this.paintedFrame(c, spec.asset, 0, spec.width);
          if (this.reducedMotion || Math.sin(motion * 6) > .6) {
            line(c, [[1, -4], [7, -4]], '#ecffff', .8);
            line(c, [[4, -7], [4, -1]], '#ecffff', .8);
          }
          break;
        case 'fireball':
          this.paintedFrame(c, spec.asset, Math.floor(motion * spec.fps), spec.width, 0, 0, [.74, .5]);
          break;
        default: return false;
      }
      return true;
    }
    trail(c, p, s) {
      const path = p.trail || [], n = path.length;
      if (n < 2 || s.trail === 'none') return;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      const from = ['comet', 'smoke', 'twin'].includes(s.trail) ? 1 : Math.max(1, n - 16);
      for (let i = from; i < n; i++) {
        const a = path[i - 1], b = path[i], f = (i - from + 1) / (n - from);
        c.globalAlpha = f * .65;
        if (['dust', 'mud', 'droplets', 'pollen', 'cubes', 'lava'].includes(s.trail)) {
          if (i % 2) continue;
          const fall = (1 - f) * (s.trail === 'droplets' || s.trail === 'mud' ? 13 : 4);
          const size = (s.trail === 'dust' ? 2.5 : 1.7) * f + .4;
          if (s.trail === 'cubes') { c.fillStyle = s.color; c.fillRect(b.x - size, b.y - size, size * 2, size * 2); }
          else dot(c, b.x, b.y + fall, size, s.color);
        } else if (s.trail === 'ticks') {
          if (i % 3 === 0) line(c, [[b.x - 2, b.y - 3], [b.x + 2, b.y + 3]], s.color, 1.5);
        } else if (s.trail === 'dotted' || s.trail === 'signal' || s.trail === 'fuse') {
          if (i % 2 === 0) dot(c, b.x, b.y, 1 + f, s.color);
        } else if (s.trail === 'electric') {
          const jitter = this.reducedMotion ? 2 : Math.sin(i * 3 + p.age * 12) * 4;
          line(c, [[a.x, a.y], [(a.x + b.x) / 2, (a.y + b.y) / 2 + jitter], [b.x, b.y]], s.color, 1.2);
        } else if (s.trail === 'fork' || s.trail === 'twin') {
          const offset = s.trail === 'twin' ? 4 : 3 * f;
          for (const side of [-1, 1]) line(c, [[a.x, a.y + side * offset], [b.x, b.y + side * offset]], s.color, Math.max(.4, s.width * f));
        } else {
          const smoke = s.trail === 'smoke' || s.trail === 'exhaust';
          line(c, [[a.x, a.y], [b.x, b.y]], smoke ? '#adb7c2' : s.color, Math.max(.3, s.width * f * (smoke ? 1.8 : 1)));
          if (['comet', 'fire', 'meteor'].includes(s.trail)) {
            c.globalAlpha = f * .9;
            line(c, [[a.x, a.y], [b.x, b.y]], s.trail === 'comet' ? '#efffff' : '#ffe6a0', Math.max(.4, f * 1.5));
          }
        }
      }
      const last = path[n - 1];
      c.globalAlpha = .65;
      if (s.trail === 'line' || s.trail === 'comet') line(c, [[last.x, last.y], [p.x, p.y]], s.color, s.width);
      c.restore();
    }
    draw(c, p, scale = 1) {
      const s = this.style(p.weapon.id), id = p.weapon.id;
      if (s.shape === 'jets') return;
      c.save();
      this.trail(c, p, s);
      const age = Number.isFinite(p.age) ? p.age : 0, a = Math.atan2(p.vy || 0, p.vx || 0);
      const motion = this.reducedMotion ? .4 : age;
      if (s.shape === 'worm') {
        const path = p.trail || [];
        for (let i = 6; i >= 1; i--) {
          const q = path[Math.max(0, path.length - 1 - i * 2)] || { x: p.x - Math.cos(a) * i * 5, y: p.y - Math.sin(a) * i * 5 };
          const wave = Math.sin(motion * 13 - i * .9) * 2.5;
          oval(c, q.x - Math.sin(a) * wave, q.y + Math.cos(a) * wave, (5 - i * .25) * scale, (4.7 - i * .3) * scale, i % 2 ? '#a75eaa' : s.color);
        }
      }
      c.translate(p.x, p.y); c.rotate(a); c.scale(scale, scale); c.lineCap = 'round'; c.lineJoin = 'round';
      if (this.drawPainted(c, p, motion)) { c.restore(); return; }
      const col = s.color, spin = motion * 8;
      switch (s.shape) {
        case 'shell': case 'heavyShell': {
          const heavy = s.shape === 'heavyShell', w = heavy ? 15 : 10, h = heavy ? 7 : 4.5;
          poly(c, [[-w, -h], [w * .35, -h], [w, 0], [w * .35, h], [-w, h]], col);
          box(c, -w + 2, -h, 3, h * 2, '#d9cba3', 0);
          line(c, [[-w + 6, -h + 2], [w * .3, -h + 2]], '#fff3ce', 1.3);
          break;
        }
        case 'dart': case 'dartFive':
          poly(c, [[-11, -5], [-3, -2], [12, 0], [-3, 2], [-11, 5], [-8, 0]], col);
          line(c, [[-4, 0], [8, 0]], '#fff8ff', 1.2);
          if (s.shape === 'dartFive') line(c, [[-8, -3], [-2, 0], [-8, 3]], '#fff0ff', 1);
          break;
        case 'needle': line(c, [[-15, 0], [13, 0]], '#233446', 4); line(c, [[-15, -1], [13, -1]], '#fff8d3', 1.8); break;
        case 'iron':
          oval(c, 0, 0, 10, 10, '#3e5062'); oval(c, -2, -2, 7.5, 7.5, '#7c94aa', null);
          oval(c, Math.cos(spin) * 4 - 2, Math.sin(spin) * 3 - 2, 3, 2, '#e8f6ff', null); break;
        case 'disc': {
          const h = 2.5 + Math.abs(Math.sin(spin)) * 3;
          oval(c, 0, 0, 14, h, '#244c46'); oval(c, 0, -1, 12, Math.max(1, h - 1), col, null);
          line(c, [[-8, -1], [9, -1]], '#ebffec', 1.5); dot(c, Math.sin(spin) * 8, -1, 1.5, '#18312d'); break;
        }
        case 'wheel': case 'drum': {
          const heavy = s.shape === 'drum', r = heavy ? 13 : 10;
          if (heavy) box(c, -9, -12, 21, 24, '#5f6f80', 4);
          oval(c, 0, 0, r, r, '#243542'); oval(c, 0, 0, r - 2, r - 2, col, null); oval(c, 0, 0, r - 4, r - 4, '#344b5b', null);
          for (let i = 0; i < 5; i++) { const t = spin * (p.vx < 0 ? -1 : 1) + i / 5 * TAU; line(c, [[0, 0], [Math.cos(t) * (r - 4), Math.sin(t) * (r - 4)]], '#e4faff', 1.5); }
          if (heavy) { c.strokeStyle = '#edb65b'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r + 2, 0, TAU); c.stroke(); }
          dot(c, 0, 0, 2, '#fff6d2'); break;
        }
        case 'fuse':
          for (let i = 0; i < 3; i++) { box(c, -13 + i * 8, -5, 7, 10, i % 2 ? '#7c4432' : col); dot(c, -10 + i * 8, -1, 1.4, '#ffe7a6'); }
          line(c, [[-14, 0], [-20, -4], [-24, -1]], '#ffca66', 1.5);
          dot(c, -16 - (Math.floor(motion * 12) % 3) * 3, -3, 2, '#fff4b5'); break;
        case 'canister':
          c.rotate(Math.sin(motion * 7) * .55); box(c, -12, -7, 24, 14, '#c76e36', 4);
          box(c, -12, -7, 4, 14, '#a7bac7'); box(c, 8, -7, 4, 14, '#a7bac7');
          poly(c, [[-4, 3], [-1, -5], [4, 3]], '#ffd56d'); line(c, [[-5, -4], [5, -4]], '#ffe2a2', 1); break;
        case 'ice':
          poly(c, p.child ? [[-7, 0], [-2, -5], [5, -3], [7, 2], [0, 6]] : [[-13, 0], [-5, -9], [9, -7], [14, 0], [6, 9], [-7, 6]], '#71cfe9', '#d7fcff');
          line(c, [[-7, 0], [0, -4], [6, 0], [0, 4], [0, -4]], '#ffffff', 1.3); break;
        case 'clod': case 'boulder':
          c.rotate(motion * 2); rock(c, s.shape === 'boulder' ? 15 : 10, s.shape === 'boulder' ? '#9e7d59' : '#a97845');
          for (let i = 0; i < 5; i++) oval(c, Math.cos(i * 2.3) * 6, Math.sin(i * 2.3) * 5, 2.5, 1.7, i % 2 ? '#d8bd88' : '#684f39', null); break;
        case 'fork':
          c.rotate(motion * 1.5); poly(c, [[-12, -7], [-3, -8], [3, -3], [12, -6], [13, 0], [2, 4], [-9, 10], [-12, 5], [-4, 0]], col);
          line(c, [[-8, -5], [1, 1], [9, -2]], '#eef5aa', 1.4); break;
        case 'mud':
          c.rotate(motion * .8); oval(c, 0, 0, 14 + Math.sin(spin), 5 + Math.sin(spin * .8), '#865134');
          oval(c, -2, -1.5, 10, 2.5, col, null); dot(c, 7, 3, 2.5, '#b9804e'); break;
        case 'hammer': case 'ram': {
          const ram = s.shape === 'ram', pump = (Math.sin(motion * 22) + 1) * 2;
          box(c, -13, ram ? -8 : -6, 16, ram ? 16 : 12, ram ? '#e98843' : col);
          box(c, 0, -3, 7 + pump, 6, '#c3d2d9', 1);
          box(c, 5 + pump, ram ? -10 : -7, ram ? 7 : 5, ram ? 20 : 14, '#8296a2', 1);
          line(c, [[-10, -3], [-4, -3]], '#fff2ad', 1.8); break;
        }
        case 'drill': case 'auger': {
          const auger = s.shape === 'auger';
          box(c, -14, -6, 15, 12, auger ? '#668342' : '#84949c');
          poly(c, [[-2, -7], [15, 0], [-2, 7]], '#d3e2e4');
          for (let i = 0; i < 4; i++) { const x = -1 + i * 3; line(c, [[x, -6 + i], [x + 3, Math.sin(spin + i) * (5 - i)]], auger ? '#7d9b49' : '#546a79', 2); }
          line(c, [[-11, -4], [-5, -4]], col, 2); break;
        }
        case 'missile':
          poly(c, [[-15, -8], [-7, -5], [6, -5], [15, 0], [6, 5], [-7, 5], [-15, 8], [-12, 0]], '#dd5260');
          line(c, [[-5, -3], [5, -3]], '#ffd6bb', 1.5);
          dot(c, 9, 0, 3, '#ffe5b5'); dot(c, 9, 0, 1.5 + Math.sin(motion * 7) * .5, '#fffcdf');
          poly(c, [[-13, -3], [-22 - Math.sin(spin) * 3, 0], [-13, 3]], '#ffe4a1', '#ffae56', 1); break;
        case 'worm':
          oval(c, 0, 0, 8, 6, col); dot(c, 4, -2.2, 1.8, '#fff3e5'); dot(c, 4.5, -2.2, .8, '#291b37');
          line(c, [[6, 1], [9, 1]], '#fff0bf', 1.6); break;
        case 'hive':
          if (p.child) {
            const flap = 2 + Math.abs(Math.sin(motion * 45)) * 5;
            oval(c, -1, -flap, 4, flap, '#dffbffb0', '#b8e5ed'); oval(c, -2, flap, 4, flap, '#dffbff90', '#b8e5ed');
            oval(c, 0, 0, 7, 4, '#ffc83d');
            for (let x = -3; x <= 2; x += 4) line(c, [[x, -3], [x, 3]], '#382e25', 2);
            dot(c, 6, -1, 1.5, '#1f2228'); line(c, [[-7, 0], [-10, 0]], '#ffe496', 1.3);
          } else {
            c.rotate(Math.sin(motion * 5) * .15);
            poly(c, [[-12, -6], [0, -12], [12, -6], [12, 6], [0, 12], [-12, 6]], '#bd7e26');
            for (let i = 0; i < 7; i++) { const t = i / 6 * TAU, x = i === 6 ? 0 : Math.cos(t) * 7, y = i === 6 ? 0 : Math.sin(t) * 7; poly(c, Array.from({length:6}, (_, k) => [x + Math.cos(k / 6 * TAU) * 3.3, y + Math.sin(k / 6 * TAU) * 3.3]), '#efbb47', '#724c23', 1); }
          } break;
        case 'spikes':
          if (p.child) { line(c, [[-12, 0], [10, 0]], '#302743', 3.5); line(c, [[-10, -1], [10, -1]], '#e8d9ff', 1.5); }
          else { c.rotate(motion * 3); poly(c, Array.from({length:24}, (_, i) => { const t = i / 24 * TAU, r = i % 2 ? 7 : 14; return [Math.cos(t) * r, Math.sin(t) * r]; }), col); dot(c, -1, -1, 4, '#66508c'); } break;
        case 'conductor':
          box(c, -8, -5, 15, 10, '#72558d'); line(c, [[-13, 0], [12, 0]], '#d7d7ed', 2);
          for (const side of [-1, 1]) { const j = Math.sin(motion * 12 + side) * 3; line(c, [[-13, 0], [-5, side * (8 + j)], [0, side * 4], [7, side * 10], [13, 0]], col, 1.7); }
          dot(c, 0, 0, 2.7, '#f8eaff'); break;
        case 'beacon':
          poly(c, [[-9, 0], [0, -12], [9, 0], [0, 12]], '#46a6ad', col);
          c.save(); c.rotate(motion * 2); c.strokeStyle = col; c.lineWidth = 1.3; c.beginPath(); c.ellipse(0, 0, 17, 6, .5, 0, TAU); c.stroke(); c.restore();
          line(c, [[-4, 0], [4, 0]], '#f3ffed', 1.3); line(c, [[0, -4], [0, 4]], '#f3ffed', 1.3); break;
        case 'bomb': case 'megaBomb': {
          const mega = s.shape === 'megaBomb', w = mega ? 20 : 15, h = mega ? 12 : 9;
          poly(c, [[-w, -h], [-w + 8, -h * .5], [-w + 8, h * .5], [-w, h], [-w + 3, 0]], '#7c8e56');
          oval(c, 1, 0, w - 3, h, mega ? '#d8bb42' : '#9caf60');
          if (mega) { box(c, -4, -h, 5, h * 2, '#303641', 0); box(c, 5, -h + 2, 3, h * 2 - 4, '#303641', 0); }
          else for (let i = 0; i < 3; i++) { const t = i / 3 * TAU; dot(c, Math.cos(t) * 3 + 2, Math.sin(t) * 3, 2.4, '#28352b'); }
          line(c, [[-5, -h + 3], [7, -h + 3]], '#fff4a4', 1.3);
          for (const dy of mega ? [-5, 5] : [0]) poly(c, [[-w + 3, dy - 2], [-w - 9 - Math.sin(spin) * 2, dy], [-w + 3, dy + 2]], '#ffe5a1', '#ff9c50', 1);
          break;
        }
        case 'comet':
          poly(c, [[-10, -3], [-3, -8], [7, -5], [11, 0], [4, 7], [-6, 5]], '#a1eafa', '#e6ffff');
          poly(c, [[-4, -4], [7, 0], [0, 4], [-6, 1]], '#ffffff', '#ffffff', .5); break;
        case 'meteorMarker':
          if (!p.child) { c.rotate(motion * 2); poly(c, [[-12, 0], [-3, -4], [0, -11], [4, -3], [12, 0], [4, 3], [0, 11], [-4, 3]], '#f29b56'); dot(c, 0, 0, 3, '#fff3b3'); }
          else { rock(c, 9, '#493b3c', .7); line(c, [[-5, -5], [0, -2], [-2, 2], [5, 5]], '#ff923a', 2); }
          break;
        case 'fire':
          for (let i = 0; i < 5; i++) { const wobble = Math.sin(motion * 18 + i) * 2; poly(c, [[-5, -7 + i * 3], [-20 - wobble, -9 + i * 4], [-9, -2 + i * 3], [3, -4 + i * 3]], i % 2 ? '#ffc550' : '#f76424', '#f38b2a', .6); }
          for (let i = 0; i < 7; i++) { const t = i / 7 * TAU, r = 5 + Math.sin(motion * 13 + i) * 1.5; dot(c, Math.cos(t) * 4, Math.sin(t) * 4, r, i % 2 ? '#ffad2d' : '#ff7024'); }
          oval(c, 2, 0, 6, 5, '#fff6b8', null); break;
        case 'lavaPod':
          c.rotate(motion * 2); rock(c, p.child ? 7 : 13, '#3b3335', 1.2);
          line(c, [[-8, -6], [-2, -2], [0, 6], [5, 3], [8, 6]], '#ff7440', p.child ? 1.5 : 2.7);
          line(c, [[-2, -2], [3, -5], [7, -3]], '#ffd17a', 1.3); break;
        case 'stone':
          c.rotate(motion * 2); box(c, -10, -10, 20, 20, '#667d8c');
          poly(c, [[-10, -10], [3, -14], [14, -6], [10, 10], [10, -10]], '#90a0ac');
          line(c, [[-5, 4], [-5, -4], [4, -4], [4, 0], [-1, 0], [-1, 5]], col, 2);
          for (let i = 0; i < 2; i++) { const t = motion * 3 + i * Math.PI; box(c, Math.cos(t) * 17 - 2, Math.sin(t) * 17 - 2, 4, 4, col, .5); } break;
        case 'beam': case 'wideBeam':
          line(c, [[-70, 0], [6, 0]], col, s.shape === 'wideBeam' ? 10 : 3);
          line(c, [[-70, 0], [6, 0]], '#efffff', s.shape === 'wideBeam' ? 3 : 1); break;
      }
      c.restore();
    }
    jets(c, tank, time = 0) {
      c.save(); c.translate(tank.x, tank.y);
      const pulse = this.reducedMotion ? 0 : Math.sin(time * 23) * 3;
      for (const x of [-12, 12]) {
        box(c, x - 4, -5, 8, 8, '#5d8093');
        poly(c, [[x - 5, 0], [x - 7, 14], [x, 36 + pulse], [x + 7, 14], [x + 5, 0]], '#258cce', '#60d5ff', 1);
        poly(c, [[x - 3, 0], [x, 25 + pulse], [x + 3, 0]], '#e8ffff', '#c7faff', .5);
      }
      c.restore();
    }
    burrow(c, e, surfaceY) {
      const t = e.age / e.life, y = Number.isFinite(surfaceY) ? surfaceY : e.y;
      c.save(); c.globalAlpha *= 1 - t;
      c.strokeStyle = e.id === 'homing_worm' ? '#e8a6e1' : '#dfc277'; c.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const x = e.x + (i - 1) * 9, lift = Math.sin((t + i * .15) * Math.PI) * 8;
        line(c, [[x - 4, y - 2], [x, y - 5 - lift], [x + 4, y - 2]], c.strokeStyle, 1.5);
      }
      c.restore();
    }
  }
  ProjectileArt.catalog = catalog;
  root.ProjectileArt = ProjectileArt;
  if (typeof module !== 'undefined' && module.exports) module.exports = ProjectileArt;
})(typeof globalThis !== 'undefined' ? globalThis : this);
