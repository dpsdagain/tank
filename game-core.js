/* Deterministic artillery physics shared by the browser and the Node tests. */
(function (root) {
  'use strict';
  const W = 1200, H = 600, SCALE = 2, G = 200, STEP = 1 / 120;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const rad = a => a * Math.PI / 180;
  function random(seed) {
    let state = seed >>> 0;
    return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(items, rng = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }

  class Terrain {
    constructor(seed = 1, type = 'hills') {
      this.cols = W / SCALE; this.rows = H / SCALE;
      this.cells = new Uint8Array(this.cols * this.rows);
      this.surface = new Float32Array(this.cols);
      this.seed = seed; this.type = type; this.dirty = true;
      this.generate();
    }
    generate() {
      const rng = random(this.seed), phase = rng() * 6.28;
      for (let x = 0; x < this.cols; x++) {
        const u = x / this.cols;
        let y = 424 + Math.sin(u * 7.4 + phase) * 28 + Math.sin(u * 16 + phase) * 12;
        if (this.type === 'hills') y -= Math.sin(u * Math.PI) * 78;
        if (this.type === 'valley') y += Math.sin(u * Math.PI) * 65 - 50;
        if (this.type === 'cliff') y += Math.tanh((u - .5) * 11) * 85;
        if (this.type === 'flat') y = 442 + Math.sin(u * 15 + phase) * 3;
        y = clamp(Math.round(y / SCALE), 110, this.rows - 30);
        for (let cy = 0; cy < this.rows; cy++) this.cells[cy * this.cols + x] = cy >= y ? 1 : 0;
      }
      this.refresh();
    }
    refresh() {
      for (let x = 0; x < this.cols; x++) {
        let y = 0;
        while (y < this.rows - 1 && !this.cells[y * this.cols + x]) y++;
        this.surface[x] = y * SCALE;
      }
      this.dirty = true;
    }
    ground(x) { return this.surface[clamp(Math.floor(x / SCALE), 0, this.cols - 1)]; }
    solid(x, y) {
      if (y >= H - 4) return true;
      if (x < 0 || x >= W || y < 0) return false;
      return !!this.cells[Math.floor(y / SCALE) * this.cols + Math.floor(x / SCALE)];
    }
    circle(cx, cy, radius, fill = false) {
      let changed = 0;
      const x0 = clamp(Math.floor((cx - radius) / SCALE), 0, this.cols - 1);
      const x1 = clamp(Math.ceil((cx + radius) / SCALE), 0, this.cols - 1);
      const y0 = clamp(Math.floor((cy - radius) / SCALE), 24, this.rows - 3);
      const y1 = clamp(Math.ceil((cy + radius) / SCALE), 24, this.rows - 3);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if ((x * SCALE - cx) ** 2 + (y * SCALE - cy) ** 2 > radius * radius) continue;
        const index = y * this.cols + x, value = fill ? 1 : 0;
        if (this.cells[index] !== value) { this.cells[index] = value; changed++; }
      }
      if (changed) this.refresh();
      return changed;
    }
    settle() {
      let changed = false;
      for (let x = 0; x < this.cols; x++) {
        let write = this.rows - 1;
        for (let y = this.rows - 1; y >= 0; y--) if (this.cells[y * this.cols + x]) {
          if (y !== write) { this.cells[write * this.cols + x] = 1; this.cells[y * this.cols + x] = 0; changed = true; }
          write--;
        }
      }
      if (changed) this.refresh();
      return changed;
    }
    flatten(cx, width = 28) {
      const y = this.ground(cx);
      for (let x = Math.floor((cx - width) / SCALE); x < (cx + width) / SCALE; x++) {
        if (x < 0 || x >= this.cols) continue;
        for (let row = 0; row < this.rows; row++) this.cells[row * this.cols + x] = row * SCALE >= y ? 1 : 0;
      }
      this.refresh();
    }
    restore(heights) {
      if (!Array.isArray(heights) || heights.length !== this.cols || heights.some(y => !Number.isFinite(y) || y < 0 || y >= H)) throw new Error('Invalid saved terrain');
      for (let x = 0; x < this.cols; x++) for (let y = 0; y < this.rows; y++) this.cells[y * this.cols + x] = y * SCALE >= heights[x] ? 1 : 0;
      this.refresh();
    }
  }

  const TUNING = {
    single_shot: [34, 60], big_shot: [72, 30], '3_shot': [29, 35], '5_shot': [25, 28],
    sniper_rifle: [13, 100], cannon_ball: [47, 70], chain_reaction: [28, 24],
    skipper: [26, 30], roller: [35, 65], heavy_roller: [54, 80],
    napalm: [18, 8], hail_storm: [19, 10], dirtball: [44, 0], big_dirtball: [74, 0],
    dirt_slinger: [60, 0], mud_pie: [55, 0], jackhammer: [23, 16], digger: [29, 20],
    ground_hog: [24, 14], pile_driver: [32, 18], heatseeker: [32, 50], homing_worm: [23, 16],
    beehive: [18, 11], pin_cushion: [22, 18], laser: [17, 70], super_laser: [32, 90],
    lightning_strike: [43, 80], space_laser: [46, 80], nuke: [96, 80], mega_nuke: [137, 100],
    comet: [55, 65], meteor_shower: [36, 26], fireball: [52, 65], volcano: [24, 14],
    jump_jets: [0, 0], magic_wall: [25, 0]
  };
  function stats(weapon) { const s = TUNING[weapon.id] || [34, 60]; return { radius: s[0], damage: s[1] }; }
  function muzzle(tank, angle = tank.angle) {
    return { x: tank.x + Math.cos(rad(angle)) * 31, y: tank.y - 18 - Math.sin(rad(angle)) * 31 };
  }
  function ballistic(tank, angle, power) {
    const m = muzzle(tank, angle), speed = power * 6;
    return { ...m, vx: Math.cos(rad(angle)) * speed, vy: -Math.sin(rad(angle)) * speed };
  }
  function advance(p, dt, wind = 0, gravity = G) { p.vx += wind * 2.2 * dt; p.vy += gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  function trace(terrain, tank, angle, power, wind = 0, maxTime = 12) {
    const p = ballistic(tank, angle, power), points = [{ x: p.x, y: p.y }];
    for (let time = 0; time < maxTime; time += STEP) {
      advance(p, STEP, wind);
      if (Math.round(time / STEP) % 12 === 0) points.push({ x: p.x, y: p.y });
      if (p.x < 0 || p.x > W || p.y > H || terrain.solid(p.x, p.y)) return { x: p.x, y: p.y, points, time };
    }
    return { x: p.x, y: p.y, points, time: maxTime };
  }
  function solveAim(terrain, tank, target, wind = 0, error = 0, rng = Math.random) {
    const left = target.x < tank.x;
    let best = { angle: left ? 135 : 45, power: 65, distance: Infinity };
    for (let angle = 28; angle <= 78; angle += 4) for (let power = 30; power <= 98; power += 2) {
      const a = left ? 180 - angle : angle;
      const hit = trace(terrain, tank, a, power, wind);
      const distance = Math.hypot(hit.x - target.x, hit.y - target.y);
      if (distance < best.distance) best = { angle: a, power, distance };
    }
    return { angle: clamp(Math.round(best.angle + (rng() - .5) * error * .35), 0, 180),
      power: clamp(Math.round(best.power + (rng() - .5) * error), 1, 100) };
  }

  class Battle {
    constructor(weapons, options = {}) {
      this.weapons = weapons; this.options = { mode: 'cpu', rounds: 10, difficulty: 'normal', terrain: 'hills', seed: Date.now() >>> 0, wind: true, ...options };
      this.rng = random(this.options.seed);
      this.terrain = new Terrain(this.options.seed, this.options.terrain);
      this.tanks = [this.makeTank(188, 0), this.makeTank(1010, 1)];
      this.tanks.forEach(t => { this.terrain.flatten(t.x); t.y = this.terrain.ground(t.x); });
      this.active = 0; this.shots = 0; this.phase = 'aim'; this.time = 0;
      this.projectiles = []; this.events = []; this.effects = []; this.queue = [];
      this.wind = this.options.wind ? Math.round((this.rng() - .5) * 12) : 0;
      this.turnScore = 0; this.lastShot = null; this.idle = 0; this.shotTime = 0;
      const essentials = ['single_shot', 'big_shot', '3_shot', 'napalm', 'jackhammer', 'nuke'];
      this.tanks.forEach(t => {
        const pool = shuffle(weapons.filter(w => !['jump', 'wall', 'dirt'].includes(w.behavior)), this.rng);
        const selected = shuffle([...essentials, ...pool.map(w => w.id).filter(id => !essentials.includes(id))].slice(0, this.options.rounds), this.rng);
        t.inventory = selected;
        t.selected = t.inventory.includes('single_shot') ? 'single_shot' : t.inventory[0];
      });
    }
    makeTank(x, side) { return { x, y: 400, vx: 0, vy: 0, angle: side ? 135 : 45, power: 68, score: 0, moves: 4, inventory: [], selected: 'single_shot', side, recoil: 0 }; }
    get tank() { return this.tanks[this.active]; }
    get practice() { return this.options.mode === 'practice'; }
    get round() { return this.practice ? this.shots + 1 : Math.min(this.options.rounds, Math.floor(this.shots / 2) + 1); }
    get weapon() { return this.weapons.find(w => w.id === this.tank.selected) || this.weapons[0]; }
    emit(type, data = {}) { this.events.push({ type, weaponId: this.lastShot?.weaponId || this.tank.selected, ...data }); }
    select(id) {
      if (this.phase !== 'aim' || (!this.practice && !this.tank.inventory.includes(id)) || !this.weapons.some(w => w.id === id)) return false;
      this.tank.selected = id; return true;
    }
    move(direction) {
      if (this.phase !== 'aim' || this.tank.moves <= 0) return false;
      const tank = this.tank, target = this.tanks[1 - this.active];
      const next = clamp(tank.x + direction * 42, 40, W - 40);
      if (Math.abs(next - target.x) < 65) return false;
      tank.x = next; tank.y = this.terrain.ground(next); tank.moves--;
      this.emit('move'); return true;
    }
    schedule(delay, action) { this.queue.push({ at: this.time + delay, action }); }
    fire() {
      if (this.phase !== 'aim') return false;
      const weapon = this.weapon, tank = this.tank, s = stats(weapon);
      this.phase = 'flight'; this.turnScore = 0; this.idle = 0; this.shotTime = 0;
      this.lastShot = { side: this.active, angle: tank.angle, power: tank.power, weapon: weapon.name, weaponId: weapon.id };
      if (!this.practice) tank.inventory.splice(tank.inventory.indexOf(weapon.id), 1);
      tank.recoil = 8;
      this.emit('fire', { ...muzzle(tank), weapon });
      const shot = (angle = tank.angle, power = tank.power, extra = {}) => this.spawn({ ...ballistic(tank, angle, power), weapon, ...s, owner: this.active, color: weapon.color, ...extra });
      switch (weapon.behavior) {
        case 'triple': [-4, 0, 4].forEach(offset => shot(tank.angle + offset)); break;
        case 'five': [-8, -4, 0, 4, 8].forEach(offset => shot(tank.angle + offset)); break;
        case 'laser': this.fireLaser(weapon); break;
        case 'jump':
          tank.vx = Math.cos(rad(tank.angle)) * tank.power * 2.8;
          tank.vy = -Math.sin(rad(tank.angle)) * tank.power * 4;
          this.emit('jet', { x: tank.x, y: tank.y }); break;
        default: shot();
      }
      return true;
    }
    spawn(p) { this.projectiles.push({ age: 0, trail: [], bounces: 0, ...p }); }
    fireLaser(weapon) {
      const tank = this.tank, origin = muzzle(tank), a = rad(tank.angle), s = stats(weapon);
      let end = { ...origin };
      for (let d = 0; d < W * 2; d += 3) {
        end = { x: origin.x + Math.cos(a) * d, y: origin.y - Math.sin(a) * d };
        if (end.x < 0 || end.x > W || end.y < 0 || end.y > H) break;
        const hit = this.tanks.some((t, i) => i !== this.active && Math.hypot(t.x - end.x, t.y - 13 - end.y) < 18);
        if (hit || this.terrain.solid(end.x, end.y)) { this.explode(end.x, end.y, s.radius, s.damage, this.active, weapon.color); break; }
      }
      this.emit('beam', { x: origin.x, y: origin.y, ex: end.x, ey: end.y, color: weapon.color });
      this.schedule(.6, () => {});
    }
    explode(x, y, radius, damage, owner, color = '#ffb65d', kick = true, impact = {}) {
      if (x < -radius || x > W + radius) return;
      if (this.phase === 'flight') {
        // ERASE_DIRECTION: EXPLOSION_OUT — the crater opens with the expanding blast.
        for (let step = 1; step <= 6; step++) this.schedule(step * .035, () => this.terrain.circle(x, y, radius * step / 6));
      } else this.terrain.circle(x, y, radius);
      if (radius >= 75) this.visualHold = Math.max(this.visualHold || 0, this.time + 1.45);
      this.emit('explosion', { x, y, radius, color, ...impact });
      for (const tank of this.tanks) {
        const distance = Math.max(0, Math.hypot(tank.x - x, tank.y - 11 - y) - 13);
        if (distance > radius) continue;
        const strength = 1 - distance / Math.max(1, radius);
        const points = Math.round(damage * strength);
        if (points) {
          const signed = tank.side === owner ? -points : points;
          this.tanks[owner].score += signed; this.turnScore += signed;
          this.emit('score', { x: tank.x, y: tank.y - 45, points: signed, direct: strength > .8 });
        }
        if (kick) { tank.vx += (tank.x > x ? 1 : -1) * strength * Math.min(90, radius * 1.1); tank.vy -= strength * Math.min(130, radius * 1.6); }
      }
    }
    impact(p) {
      const { x, y, radius: r, damage: d, owner, color, weapon } = p;
      if (p.child) { this.explode(x, y, r, d, owner, color, true, {child:true,vx:p.vx,vy:p.vy}); return; }
      switch (weapon.behavior) {
        case 'dirt':
          this.terrain.circle(x, y - r * .35, r, true);
          this.emit('dirt', { x, y, radius: r, color: '#bda47d' }); break;
        case 'wall':
          for (let yy = y; yy > y - 160; yy -= 12) this.terrain.circle(x, yy, 23, true);
          this.emit('dirt', { x, y: y - 80, radius: 45, color }); break;
        case 'drill':
          for (let i = 0; i < 6; i++) this.schedule(i * .16, () => this.explode(x, clamp(y + i * 19, 0, H - 28), r, d, owner, color, false));
          break;
        case 'tunnel': {
          const target = this.tanks[1 - owner], direction = Math.sign(target.x - x) || 1;
          for (let i = 0; i < 12; i++) this.schedule(i * .1, () => {
            const xx = x + direction * i * 16;
            const yy = weapon.id === 'homing_worm' ? y + (target.y - y) * i / 12 : y + Math.sin(i / 3) * 30;
            this.explode(xx, yy, r, d, owner, color, false);
          }); break;
        }
        case 'chain':
          for (let i = 0; i < 7; i++) this.schedule(i * .12, () => this.explode(x + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 27, y, r + i, d, owner, color));
          break;
        case 'napalm':
          for (let i = 0; i < 28; i++) {
            const xx = clamp(x + (this.rng() - .5) * 130, 2, W - 2);
            this.schedule(i * .075, () => { const yy = this.terrain.ground(xx); this.explode(xx, yy - 5, r, d, owner, color, false); this.emit('flame', { x: xx, y: yy - 5, color }); });
          } break;
        case 'hail': case 'meteors': {
          const hail = weapon.behavior === 'hail', count = hail ? 18 : 7;
          this.emit('beacon', { x, y, color });
          for (let i = 0; i < count; i++) this.schedule(.2 + i * .1, () => this.spawn({
            x: clamp(x + (this.rng() - .5) * (hail ? 150 : 200) + 80, 10, W - 10), y: -30,
            vx: -80, vy: hail ? 430 : 350, radius: r, damage: d, owner, weapon, color, child: true
          })); break;
        }
        case 'bees':
          this.emit('beacon', { x, y: y - 60, color });
          for (let i = 0; i < 9; i++) this.schedule(i * .07, () => this.spawn({
            x, y: y - 75, vx: (this.rng() - .5) * 230, vy: -140 - this.rng() * 60,
            owner, weapon, radius: r, damage: d, color, child: true, homing: true
          })); break;
        case 'volcano':
          this.explode(x, y, 36, 20, owner, color);
          for (let i = 0; i < 15; i++) this.schedule(i * .08, () => this.spawn({
            x, y: y - 12, vx: (this.rng() - .5) * 320, vy: -160 - this.rng() * 190,
            owner, weapon, radius: r, damage: d, color, child: true
          })); break;
        case 'lightning': case 'orbital':
          this.emit(weapon.behavior === 'lightning' ? 'lightning' : 'beam', { x, y: -20, ex: x, ey: y, color });
          this.schedule(.12, () => this.explode(x, y, r, d, owner, color)); break;
        case 'roller': {
          const target = this.tanks[1 - owner];
          const direction = Math.sign(target.x - x) || 1;
          this.spawn({ ...p, child: true, rolling: true, vx: direction * 110, vy: 0, age: 0, trail: [], x, y: this.terrain.ground(x) - 6 }); break;
        }
        default:
          this.explode(x, y, r, d, owner, color);
          if (weapon.behavior === 'nuke') this.emit('nuke', { x, y, radius: r });
      }
    }
    update(dt = STEP) {
      this.time += dt;
      if (this.phase === 'flight') this.shotTime += dt;
      const due = this.queue.filter(q => q.at <= this.time);
      this.queue = this.queue.filter(q => q.at > this.time);
      due.forEach(q => q.action());
      for (const tank of this.tanks) {
        tank.recoil = Math.max(0, tank.recoil - dt * 30);
        const ground = this.terrain.ground(tank.x);
        if (tank.y < ground - 1 || tank.vy < 0 || Math.abs(tank.vx) > 1) {
          tank.vy += G * dt; tank.x = clamp(tank.x + tank.vx * dt, 30, W - 30); tank.y += tank.vy * dt;
          const newGround = this.terrain.ground(tank.x);
          if (tank.y >= newGround && tank.vy >= 0) { tank.y = newGround; tank.vy = 0; tank.vx *= .78; }
        } else {
          // Added soil buries a stationary tank; it must not teleport to the top.
          if (tank.y <= ground + 4) tank.y = ground;
          tank.vx = 0; tank.vy = 0;
        }
      }
      const alive = [];
      for (const p of this.projectiles) {
        p.age += dt;
        if (p.age > 12 || p.x < -30 || p.x > W + 30 || p.y > H + 30) continue;
        if (p.rolling) {
          p.x += p.vx * dt; p.y = this.terrain.ground(p.x) - 5;
          if (p.age > 2 || this.tanks.some(t => Math.abs(t.x - p.x) < 17)) { this.explode(p.x, p.y, p.radius, p.damage, p.owner, p.color); continue; }
          alive.push(p); continue;
        }
        const targetDistance = Math.hypot(this.tanks[1 - p.owner].x - p.x, this.tanks[1 - p.owner].y - p.y);
        if (p.homing || (p.weapon.behavior === 'homing' && p.age > .6 && targetDistance < 380)) {
          const target = this.tanks[1 - p.owner], dx = target.x - p.x, dy = target.y - 13 - p.y, len = Math.hypot(dx, dy) || 1;
          const force = p.child ? 4 : 3.5, speed = p.child ? 260 : 380;
          p.vx += (dx / len * speed - p.vx) * dt * force; p.vy += (dy / len * speed - p.vy) * dt * force;
          p.x += p.vx * dt; p.y += p.vy * dt;
        } else advance(p, dt, this.wind);
        if (p.weapon.behavior === 'burst' && !p.child && p.vy >= 0) {
          for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; this.schedule(i * .005, () => this.spawn({ ...p, x: p.x, y: p.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, child: true, age: 0, trail: [] })); }
          this.emit('explosion', { x: p.x, y: p.y, radius: 22, color: p.color, airburst:true }); continue;
        }
        if (Math.floor(p.age / dt) % 3 === 0) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 24) p.trail.shift(); }
        const hitTank = this.tanks.some((t, i) => (i !== p.owner || p.age > .35) && Math.hypot(t.x - p.x, t.y - 12 - p.y) < 17);
        if (hitTank || this.terrain.solid(p.x, p.y)) {
          if (['bounce', 'skip'].includes(p.weapon.behavior) && !hitTank && p.bounces < (p.weapon.behavior === 'skip' ? 4 : 2)) {
            p.bounces++; p.y = this.terrain.ground(p.x) - 4; p.vy = -Math.abs(p.vy) * .58 - 30; p.vx *= .8;
            this.emit('bounce', { x: p.x, y: p.y }); alive.push(p);
          } else this.impact(p);
        } else alive.push(p);
      }
      this.projectiles = alive;
      if (this.phase === 'flight') {
        if (this.projectiles.length || this.queue.length || this.time < (this.visualHold || 0) || this.tanks.some(t => Math.abs(t.vy) > 2)) this.idle = 0;
        else this.idle += dt;
        if (this.idle > .45 || this.shotTime > 18) {
          this.projectiles = []; this.queue = []; this.terrain.settle(); this.phase = 'settling'; this.idle = 0;
        }
      } else if (this.phase === 'settling') {
        this.idle += dt;
        if (this.idle > .65 && this.tanks.every(t => Math.abs(t.vy) < 2)) this.finishTurn();
      }
    }
    finishTurn() {
      this.shots++; this.phase = 'aim';
      this.emit('turnEnd', { score: this.turnScore, side: this.active });
      if (!this.practice) {
        if (this.shots >= this.options.rounds * 2) { this.phase = 'over'; this.emit('gameOver'); return; }
        this.active = 1 - this.active;
        if (!this.tank.inventory.includes(this.tank.selected)) this.tank.selected = this.tank.inventory[0];
      }
      if (this.options.wind && this.shots % 2 === 0) this.wind = clamp(this.wind + Math.round((this.rng() - .5) * 5), -12, 12);
      this.emit('turnStart', { side: this.active });
    }
    snapshot() {
      return { version: 1, options: this.options, tanks: this.tanks, active: this.active, shots: this.shots,
        wind: this.wind, heights: Array.from(this.terrain.surface) };
    }
    static restore(weapons, data) {
      if (data.version !== 1 || !['cpu', 'local', 'practice'].includes(data.options?.mode) || ![5, 10].includes(data.options.rounds) || ![0, 1].includes(data.active) || !Number.isInteger(data.shots) || data.shots < 0 || data.shots >= data.options.rounds * 2 && data.options.mode !== 'practice') throw new Error('Invalid save');
      const battle = new Battle(weapons, data.options), ids = weapons.map(w => w.id);
      if (!Array.isArray(data.tanks) || data.tanks.length !== 2) throw new Error('Invalid tanks');
      data.tanks.forEach((tank, i) => {
        if (!['x', 'y', 'angle', 'power', 'score', 'moves'].every(k => Number.isFinite(tank[k])) || tank.x < 0 || tank.x >= W || tank.angle < 0 || tank.angle > 180 || tank.power < 1 || tank.power > 100 || !Array.isArray(tank.inventory) || tank.inventory.some(id => !ids.includes(id))) throw new Error('Invalid tank');
        battle.tanks[i] = { ...tank, side: i, vx: 0, vy: 0, recoil: 0 };
      });
      battle.terrain.restore(data.heights); battle.active = data.active; battle.shots = data.shots;
      battle.wind = clamp(Number(data.wind) || 0, -12, 12);
      return battle;
    }
  }
  const api = { W, H, G, STEP, SCALE, clamp, rad, random, shuffle, Terrain, Battle, stats, muzzle, ballistic, advance, trace, solveAim };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PocketCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
