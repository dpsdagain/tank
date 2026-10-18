/* Pocket Tanks Browser Edition — canvas renderer, audio and game UI. */
(() => {
  'use strict';
  const C = PocketCore, weapons = POCKET_WEAPONS, $ = id => document.getElementById(id);
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d', { alpha: false });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const descriptions = {
    single_shot: 'The original. A clean arc and a satisfying explosion.',
    big_shot: 'More crater, fewer points. Great for reshaping the battlefield.',
    '3_shot': 'Three shells, three arcs. Give your aim a little room to breathe.',
    '5_shot': 'Five chances to make a point. Or several.',
    sniper_rifle: 'A tiny blast with a big reward. Precision is everything.',
    cannon_ball: 'A heavy shell that bounces before it makes an entrance.',
    chain_reaction: 'One impact starts a row of explosive consequences.',
    skipper: 'Skips across the hillside before settling the argument.',
    roller: 'Lands, rolls toward your rival, and gets down to business.',
    heavy_roller: 'A bigger, heavier answer to a well-defended hillside.',
    napalm: 'A lingering carpet of fire. Especially good in a hollow.',
    hail_storm: 'Mark the spot. Let a freezing barrage do the rest.',
    dirtball: 'Build a hill where there wasn’t one. Bury a problem.',
    big_dirtball: 'A whole lot of landscape, delivered to your doorstep.',
    dirt_slinger: 'A generous helping of dirt. Sometimes up is the wrong way.',
    mud_pie: 'A messy mound of earth that changes the next shot.',
    jackhammer: 'Six pounding blasts. Send the other tank downstairs.',
    digger: 'Drills a deep pocket into the landscape. Mind the drop.',
    ground_hog: 'Burrows sideways beneath the surface, blasting as it goes.',
    pile_driver: 'A narrow series of blasts with a very deep ambition.',
    heatseeker: 'Curves toward your opponent after launch. Give it some sky.',
    homing_worm: 'An underground trail of explosions toward the other tank.',
    beehive: 'One hive. Nine homing bees. A very unhappy opponent.',
    pin_cushion: 'An airburst of twelve shells, spreading at the top of its arc.',
    laser: 'Straight line. Instant impact. Aim directly at the target.',
    super_laser: 'A wider beam and a bigger blast. Still perfectly straight.',
    lightning_strike: 'Your shell marks the spot. The sky takes it from there.',
    space_laser: 'Call in an orbital beam at your shell’s landing point.',
    nuke: 'A serious crater and a spectacular cloud. Stand well back.',
    mega_nuke: 'For when your plan involves removing most of a hillside.',
    comet: 'A blazing shell with a long tail and a heavy landing.',
    meteor_shower: 'Seven visitors from above. None of them subtle.',
    fireball: 'A bright, blazing arc with an explosive finish.',
    volcano: 'An impact becomes an eruption of molten shells.',
    jump_jets: 'Launch your own tank. Angle and power choose the escape route.',
    magic_wall: 'Raise a tall wall of earth at the impact point.'
  };
  const notes = [
    'Close counts. A bigger crater doesn’t always mean more points.',
    'The wind has a vote. Aim a little into it when the breeze picks up.',
    'Save a digging weapon. The best escape from a hole is through it.',
    'A volley gives both tanks a shot. Most points after the last one wins.',
    'Mind the splash. Hitting your own tank takes points off your score.',
    'Lasers fly straight. Everything else has a different idea of gravity.'
  ];
  const landscapeNames = { hills: 'VERDANT RIDGE', valley: 'QUIET HOLLOW', cliff: 'THE DIVIDE', flat: 'OPEN COUNTRY' };
  const cpuNames = { easy: 'SCOUT', normal: 'RANGER', hard: 'VETERAN' };
  const SAVE = 'pocket-tanks-battle-v1', PREFS = 'pocket-tanks-preferences-v1';
  const safeRead = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const prefs = { sound: true, music: false, guide: true, ...safeRead(PREFS) };
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch {} };

  class Sounds {
    constructor() {
      this.unlocked = false; this.lastExplosion = 0; this.active = new Set();
      this.music = new Audio('assets/audio/ingame.m4a'); this.music.loop = true; this.music.volume = .17;
    }
    unlock() { this.unlocked = true; this.syncMusic(); }
    syncMusic() {
      if (prefs.sound && prefs.music && this.unlocked && !document.hidden && !paused) this.music.play().catch(() => {});
      else this.music.pause();
    }
    play(name, volume = .35) {
      if (!prefs.sound || !this.unlocked || this.active.size > 9) return;
      if (name.startsWith('exp')) {
        if (performance.now() - this.lastExplosion < 100) return;
        this.lastExplosion = performance.now();
      }
      const a = new Audio(`assets/audio/${name}.ogg`); a.volume = volume;
      this.active.add(a); const done = () => this.active.delete(a);
      a.addEventListener('ended', done, { once: true }); a.addEventListener('error', done, { once: true });
      a.play().catch(done);
    }
  }
  let battle, paused = false, ai = null, loadouts = [], pendingOptions = null, drafting = false, draftSide = 0, draftPicks = [[], []];
  let noticeTimer, noteIndex = 0, dragging = false, accumulator = 0;
  const sounds = new Sounds();
  function notify(message) {
    $('notification').textContent = message; $('notification').classList.add('visible');
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notification').classList.remove('visible'), 2900);
  }
  function canPlay() { return battle && battle.phase === 'aim' && !paused && !(battle.options.mode === 'cpu' && battle.active === 1) && !document.querySelector('dialog[open]'); }
  function playerNames() { return battle.options.mode === 'local' ? ['PLAYER 1', 'PLAYER 2'] : ['YOU', battle.practice ? 'TARGET' : cpuNames[battle.options.difficulty]]; }
  function saveBattle() {
    if (!battle || battle.phase !== 'aim') return;
    try {
      localStorage.setItem(SAVE, JSON.stringify({ ...battle.snapshot(), loadouts }));
      $('saveIndicator').innerHTML = '<span class="status-dot"></span> SAVED LOCALLY';
    } catch { $('saveIndicator').textContent = 'SESSION ONLY'; }
  }
  function formatScore(n) { return n < 0 ? '−' + String(Math.abs(n)).padStart(2, '0') : String(n).padStart(3, '0'); }

  class Renderer {
    constructor() {
      this.sky = document.createElement('canvas'); this.sky.width = C.W; this.sky.height = C.H;
      this.land = document.createElement('canvas'); this.land.width = C.W / 2; this.land.height = C.H / 2;
      this.landCtx = this.land.getContext('2d'); this.landImage = this.landCtx.createImageData(this.land.width, this.land.height);
      this.fx = new WeaponEffects(POCKET_NATIVE_FX, { reducedMotion, particleLimit: matchMedia('(max-width:650px)').matches ? 650 : 1100 }); this.labels = []; this.clock = 0;
      this.tankSprite = new Image(); this.tankSprite.src = 'assets/graytank0001.png';
      this.scenery = new Image();
      this.scenery.onload = () => { if (battle) this.makeSky(); };
      this.scenery.src = 'assets/art/flow-scenery.jpg';
      this.grain = document.createElement('canvas'); this.grain.width = 160; this.grain.height = 90;
      const g = this.grain.getContext('2d'), pixels = g.createImageData(160, 90), rng = C.random(33);
      for (let i = 0; i < pixels.data.length; i += 4) { pixels.data[i] = 255; pixels.data[i + 1] = 255; pixels.data[i + 2] = 210; pixels.data[i + 3] = rng() * 12; }
      g.putImageData(pixels, 0, 0);
    }
    reset() { this.fx.reset(); this.labels = []; this.makeSky(); }
    makeSky() {
      const c = this.sky.getContext('2d'), rng = C.random(battle.options.seed + 73);
      if (this.scenery.complete && this.scenery.naturalWidth) {
        const scale = Math.max(C.W / this.scenery.naturalWidth, C.H / this.scenery.naturalHeight);
        const w = this.scenery.naturalWidth * scale, h = this.scenery.naturalHeight * scale;
        c.imageSmoothingEnabled = true;
        c.drawImage(this.scenery, (C.W - w) / 2, (C.H - h) / 2, w, h);
        return;
      }
      const sky = c.createLinearGradient(0, 0, 0, 510); sky.addColorStop(0, '#121e3b'); sky.addColorStop(.5, '#334567'); sky.addColorStop(1, '#ce7d58');
      c.fillStyle = sky; c.fillRect(0, 0, C.W, C.H);
      const glow = c.createRadialGradient(870, 175, 30, 870, 175, 170); glow.addColorStop(0, '#ff9b4266'); glow.addColorStop(1, '#ff9b4200');
      c.fillStyle = glow; c.fillRect(650, 0, 450, 400);
      c.fillStyle = '#ffbd62'; c.beginPath(); c.arc(870, 171, 46, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffe3a066'; c.lineWidth = 1; c.beginPath(); c.arc(870, 171, 56, 0, Math.PI * 2); c.stroke();
      // Long quiet clouds and three layers of distant hills.
      for (let i = 0; i < 15; i++) {
        const x = rng() * C.W, y = 115 + rng() * 140, w = 80 + rng() * 200;
        const cloud = c.createLinearGradient(x, y, x + w, y); cloud.addColorStop(0, '#c4d5f000'); cloud.addColorStop(.5, '#c4d5f03c'); cloud.addColorStop(1, '#c4d5f000');
        c.fillStyle = cloud; c.fillRect(x, y, w, 2 + rng() * 4);
      }
      for (let layer = 0; layer < 3; layer++) {
        const base = 331 + layer * 30, phase = rng() * 10;
        c.beginPath(); c.moveTo(0, C.H);
        for (let x = 0; x <= C.W; x += 4) {
          const y = base + Math.sin(x * .006 + phase) * (38 - layer * 6) + Math.sin(x * .014 + phase) * 15;
          c.lineTo(x, y);
        }
        c.lineTo(C.W, C.H); c.closePath(); c.fillStyle = ['#465874', '#305968', '#234e4c'][layer]; c.fill();
        if (layer === 1) {
          c.fillStyle = '#315c64';
          for (let i = 0; i < 85; i++) {
            const x = rng() * C.W, y = base + Math.sin(x * .006 + phase) * 32 + Math.sin(x * .014 + phase) * 15;
            const h = 5 + rng() * 13; c.beginPath(); c.moveTo(x - h * .2, y); c.lineTo(x, y - h); c.lineTo(x + h * .2, y); c.fill();
          }
        }
      }
      // Tiny birds establish scale without cluttering the shot.
      c.strokeStyle = '#a7bdd9aa'; c.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        const x = 345 + i * 19, y = 185 + Math.sin(i) * 12;
        c.beginPath(); c.moveTo(x - 5, y + 2); c.quadraticCurveTo(x - 2, y - 3, x, y); c.quadraticCurveTo(x + 3, y - 3, x + 6, y + 1); c.stroke();
      }
      c.globalAlpha = .3; c.drawImage(this.grain, 0, 0, C.W, C.H); c.globalAlpha = 1;
    }
    updateLand() {
      const terrain = battle.terrain, pixels = this.landImage.data, cols = terrain.cols;
      for (let y = 0; y < terrain.rows; y++) for (let x = 0; x < cols; x++) {
        const index = y * cols + x, offset = index * 4;
        if (!terrain.cells[index]) { pixels[offset + 3] = 0; continue; }
        const depth = y * 2 - terrain.surface[x], shade = ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0) % 13 - 6;
        let r, g, b;
        if (depth < 4) { r = 139; g = 215; b = 66; }
        else if (depth < 10) { r = 69; g = 126; b = 52; }
        else if (depth < 17) { r = 100; g = 77; b = 49; }
        else {
          const t = C.clamp((y * 2 - 330) / 270, 0, 1);
          r = 91 - t * 49; g = 65 - t * 30; b = 53 - t * 19;
          // Thin geological seams carry through the craters.
          const seam = (y + Math.round(Math.sin(x * .018) * 7)) % 25;
          if (seam < 2) { r += 23; g += 16; b += 8; }
          else if (seam === 3) { r -= 12; g -= 10; b -= 7; }
        }
        pixels[offset] = r + shade; pixels[offset + 1] = g + shade; pixels[offset + 2] = b + shade; pixels[offset + 3] = 255;
      }
      this.landCtx.putImageData(this.landImage, 0, 0); terrain.dirty = false;
    }
    event(e) {
      this.fx.event(e);
      if (e.type === 'score') this.labels.push({ ...e, life: 2, max: 2 });
      if (e.type === 'fire') sounds.play('fire', .55);
      if (e.type === 'bounce') sounds.play('bounce', .25);
      if (e.type === 'explosion') {
        const profile = POCKET_NATIVE_FX.profiles[e.weaponId];
        const original = this.fx.impacts?.sound(e.weaponId) || profile?.explosions?.find(stage => stage.sound && stage.sound !== 'NONE')?.sound;
        const stem = original?.replaceAll('\\', '/').split('/').pop().replace(/\.[^.]+$/, '').toLowerCase();
        const sound = POCKET_NATIVE_FX.sounds.includes(stem) ? stem : e.radius > 75 ? 'exphuge' : e.radius < 25 ? 'expshort' : 'expmedium2';
        sounds.play(sound, C.clamp(e.radius / 100, .25, .75));
      }
    }
    update(dt) {
      this.clock += dt; this.fx.update(dt, battle.projectiles, battle.terrain);
      for (const label of this.labels) { label.life -= dt; label.y -= dt * 18; }
      this.labels = this.labels.filter(label => label.life > 0);
    }
    drawTank(tank) {
      if (battle.lastShot?.weaponId === 'jump_jets' && battle.phase === 'flight' &&
          tank.side === battle.lastShot.side && tank.y < battle.terrain.ground(tank.x) - 2) this.fx.drawJets(ctx, tank);
      const color = tank.side ? '#cf866c' : '#a9cc6f', dark = tank.side ? '#845642' : '#536a3e';
      const slope = C.clamp(Math.atan2(battle.terrain.ground(tank.x + 13) - battle.terrain.ground(tank.x - 13), 26), -.42, .42);
      const buried = tank.y > battle.terrain.ground(tank.x) + 15;
      ctx.save(); ctx.translate(tank.x, tank.y - 2);
      if (buried) ctx.globalAlpha = .42;
      ctx.fillStyle = '#202a3250'; ctx.beginPath(); ctx.ellipse(0, 4, 28, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.rotate(slope); ctx.fillStyle = '#374136'; ctx.beginPath(); ctx.roundRect(-24, -9, 48, 12, 6); ctx.fill();
      ctx.fillStyle = '#79816b';
      for (let i = -16; i <= 16; i += 8) { ctx.beginPath(); ctx.arc(i, -3, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#353e33'; ctx.fillRect(i - 1, -4, 2, 2); ctx.fillStyle = '#79816b'; }
      const body = ctx.createLinearGradient(0, -22, 0, -5); body.addColorStop(0, color); body.addColorStop(1, dark);
      ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-23, -9); ctx.lineTo(-17, -19); ctx.lineTo(15, -19); ctx.lineTo(23, -9); ctx.closePath(); ctx.fill();
      if (this.tankSprite.complete && this.tankSprite.naturalWidth) { ctx.globalAlpha = .22; ctx.drawImage(this.tankSprite, -23, -19, 46, 19); ctx.globalAlpha = 1; }
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-16, -17); ctx.lineTo(15, -17); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, -18, 11, 8, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(-1, -19, 9, 7, 0, Math.PI, 0); ctx.fill();
      const a = C.rad(tank.angle), length = 31 - tank.recoil;
      ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(Math.cos(a) * length, -19 - Math.sin(a) * length); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(Math.cos(a) * length, -20 - Math.sin(a) * length); ctx.stroke();
      if (tank.side === battle.active && battle.phase === 'aim') {
        const bounce = reducedMotion ? 0 : Math.sin(this.clock * 3) * 2;
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-5, -55 + bounce); ctx.lineTo(5, -55 + bounce); ctx.lineTo(0, -49 + bounce); ctx.fill();
      }
      ctx.font = 'bold 10px Lato, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ecedce';
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#334128'; ctx.shadowBlur = 4; ctx.fillText(buried ? 'BURIED' : playerNames()[tank.side], 0, buried ? battle.terrain.ground(tank.x) - tank.y - 14 : 28); ctx.shadowBlur = 0;
      ctx.restore();
    }
    drawGuide() {
      if (!prefs.guide || battle.phase !== 'aim' || battle.active === 1 && battle.options.mode === 'cpu') return;
      const tank = battle.tank, weapon = battle.weapon, m = C.muzzle(tank);
      ctx.save(); ctx.fillStyle = '#fff8d3'; ctx.strokeStyle = '#eff2cd'; ctx.globalAlpha = .7;
      if (weapon.behavior === 'laser') {
        ctx.setLineDash([3, 8]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + Math.cos(C.rad(tank.angle)) * 170, m.y - Math.sin(C.rad(tank.angle)) * 170); ctx.stroke();
      } else {
        const p = C.ballistic(tank, tank.angle, tank.power);
        for (let i = 0; i < 12; i++) {
          for (let j = 0; j < 8; j++) C.advance(p, C.STEP, battle.wind);
          if (p.x < 0 || p.x > C.W || battle.terrain.solid(p.x, p.y)) break;
          ctx.globalAlpha = .8 * (1 - i / 14); ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 - i * .06, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
    draw() {
      if (!battle) return;
      if (battle.terrain.dirty) this.updateLand();
      ctx.save();
      ctx.fillStyle = '#101a30'; ctx.fillRect(0, 0, C.W, C.H);
      if (!reducedMotion && this.fx.shake) ctx.translate((Math.random() - .5) * this.fx.shake, (Math.random() - .5) * this.fx.shake);
      ctx.drawImage(this.sky, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(this.land, 0, 0, C.W, C.H);
      // Sparse blades and stones make the surface readable at a glance.
      ctx.strokeStyle = '#a7ef6b'; ctx.lineWidth = 1;
      for (let x = 9; x < C.W; x += 19) {
        const y = battle.terrain.ground(x);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 4 - (x % 5)); ctx.stroke();
      }
      this.fx.drawScorches(ctx); this.drawGuide(); battle.tanks.forEach(t => this.drawTank(t));
      for (const p of battle.projectiles) {
        this.fx.drawProjectile(ctx, p);
        if (p.y < -10) {
          this.fx.drawProjectile(ctx, { ...p, x: C.clamp(p.x, 24, C.W - 24), y: 20, trail: [] });
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(p.x, 38); ctx.lineTo(p.x - 3, 43); ctx.lineTo(p.x + 3, 43); ctx.fill();
        }
      }
      this.fx.draw(ctx);
      ctx.globalAlpha = 1;
      for (const l of this.labels) {
        ctx.globalAlpha = Math.min(1, l.life); ctx.font = 'bold 25px Lato, sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#263320'; ctx.shadowBlur = 6;
        ctx.fillStyle = l.points > 0 ? '#f0ffbd' : '#ffd0ae'; ctx.fillText((l.points > 0 ? '+' : '−') + Math.abs(l.points), l.x, l.y);
        if (l.direct) { ctx.font = 'bold 8px Lato, sans-serif'; ctx.fillText('DIRECT HIT', l.x, l.y - 20); }
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      if (!reducedMotion && this.fx.flash) { ctx.globalAlpha = this.fx.flash; ctx.fillStyle = this.fx.flashColor; ctx.fillRect(0, 0, C.W, C.H); ctx.globalAlpha = 1; }
      ctx.restore();
    }
  }
  const renderer = new Renderer();

  function syncControls() {
    const tank = battle.tank;
    $('angleInput').value = tank.angle; $('powerInput').value = tank.power;
    $('angleOutput').innerHTML = `${Math.round(tank.angle)}<span>°</span>`;
    $('powerOutput').innerHTML = `${Math.round(tank.power)}<span>%</span>`;
    $('angleInput').style.setProperty('--fill', tank.angle / 180 * 100 + '%');
    $('powerInput').style.setProperty('--fill', tank.power + '%');
  }
  function sync() {
    const names = playerNames(), human = !(battle.options.mode === 'cpu' && battle.active === 1), ready = battle.phase === 'aim' && human && !paused;
    $('modeLabel').textContent = { cpu: 'YOU VS. COMPUTER', local: 'LOCAL TWO PLAYERS', practice: 'TARGET PRACTICE' }[battle.options.mode];
    $('roundsLabel').textContent = battle.practice ? 'UNLIMITED SHOTS' : `${battle.options.rounds} VOLLEYS`;
    document.querySelectorAll('.nav-mode').forEach(button => button.classList.toggle('active', button.dataset.mode === battle.options.mode));
    $('p1Name').textContent = names[0]; $('p2Name').textContent = names[1];
    $('p1Score').textContent = formatScore(battle.tanks[0].score); $('p2Score').textContent = formatScore(battle.tanks[1].score);
    $('p1Status').textContent = battle.active === 0 ? (battle.phase === 'aim' ? 'YOUR TURN' : 'SHOT IN PLAY') : 'HOLDING POSITION';
    $('p2Status').textContent = battle.practice ? 'PRACTICE DUMMY' : battle.active === 1 ? (battle.phase === 'aim' ? 'LINING UP A SHOT' : 'SHOT IN PLAY') : battle.options.mode === 'local' ? 'HOLDING POSITION' : `COMPUTER · ${battle.options.difficulty.toUpperCase()}`;
    $('playerCard').classList.toggle('is-active', battle.active === 0); $('opponentCard').classList.toggle('is-active', battle.active === 1);
    $('volleyLabel').textContent = battle.practice ? 'SHOT' : 'VOLLEY';
    $('volleyNumber').innerHTML = `${String(battle.round).padStart(2, '0')} <span>/ ${battle.practice ? '∞' : battle.options.rounds}</span>`;
    $('volleyProgress').innerHTML = battle.practice ? '' : Array.from({ length: battle.options.rounds }, (_, i) => `<i class="${i < battle.round - 1 ? 'done' : i === battle.round - 1 ? 'current' : ''}"></i>`).join('');
    $('windValue').textContent = battle.wind === 0 ? 'CALM' : `${String(Math.abs(battle.wind)).padStart(2, '0')} ${battle.wind < 0 ? '←' : '→'}`;
    $('landscapeName').textContent = landscapeNames[battle.options.terrain]; $('landscapeSeed').textContent = `SECTOR ${String(battle.options.seed % 100).padStart(2, '0')}`;
    $('fireBtn').disabled = !ready; $('fireLabel').textContent = battle.phase === 'over' ? 'MATCH COMPLETE' : !human ? `${names[1]}’S TURN` : battle.phase === 'aim' ? 'FIRE SHOT' : 'SHOT IN PLAY';
    $('angleInput').disabled = !ready; $('powerInput').disabled = !ready;
    $('moveLeftBtn').disabled = !ready || battle.tank.moves <= 0; $('moveRightBtn').disabled = !ready || battle.tank.moves <= 0;
    $('movesLabel').textContent = `${battle.tank.moves} move${battle.tank.moves === 1 ? '' : 's'} left`;
    $('aimBtn').setAttribute('aria-pressed', String(prefs.guide));
    $('turnBanner').classList.toggle('firing', battle.phase !== 'aim');
    $('turnMessage').textContent = battle.practice ? 'Try something unexpected.' : !human ? `${names[1]} is finding an angle…` : battle.options.mode === 'local' ? `${names[battle.active]}, the hillside is yours.` : 'Your move. Make it count.';
    $('restartPracticeBtn').hidden = !battle.practice; $('aimHint').hidden = battle.practice;
    syncControls(); renderInventory();
  }
  function renderInventory() {
    const tank = battle.tank, isCPU = battle.options.mode === 'cpu' && battle.active === 1;
    const all = battle.practice ? practiceSlots() : loadouts[battle.active];
    $('weaponCount').textContent = battle.practice ? '∞' : tank.inventory.length;
    $('inventoryHint').textContent = battle.practice ? 'Your favorites. Find all 36 in the guide below.' : isCPU ? 'The other side has a few ideas, too.' : 'One shot. One weapon. Choose wisely.';
    $('inventory').innerHTML = all.map(id => {
      const w = weapons.find(w => w.id === id), used = !battle.practice && !tank.inventory.includes(id);
      if (!w) return '';
      return `<button class="weapon-button ${tank.selected === id ? 'selected' : ''} ${used ? 'used' : ''}" data-weapon="${w.id}" aria-pressed="${tank.selected === id}" aria-label="${esc(w.name)}${used ? ', already fired' : ''}" ${used || isCPU || battle.phase !== 'aim' || paused ? 'disabled' : ''} title="${esc(descriptions[w.id])}">${WeaponIcons.html(w)}<span>${esc(w.name)}<small>${used ? 'SPENT' : w.category.toUpperCase()}</small></span></button>`;
    }).join('');
    const w = battle.weapon, stat = C.stats(w);
    $('selectedName').textContent = w.name; $('selectedCategory').textContent = `${w.category.toUpperCase()} / ${w.pack.toUpperCase()}`;
    $('selectedDescription').textContent = descriptions[w.id]; $('damageValue').textContent = stat.damage ? stat.damage + (['triple', 'five', 'chain', 'drill', 'napalm', 'hail', 'bees', 'meteors', 'volcano', 'burst', 'tunnel'].includes(w.behavior) ? ' / HIT' : '') : 'UTILITY';
    $('blastMeter').style.setProperty('--blast', Math.min(100, stat.radius / 137 * 100) + '%');
  }
  function practiceSlots() {
    const favorites = ['single_shot', 'big_shot', '3_shot', 'napalm', 'jackhammer', 'nuke', 'beehive', 'meteor_shower', 'laser', 'dirtball'];
    if (!favorites.includes(battle.tank.selected)) favorites[9] = battle.tank.selected;
    return favorites;
  }
  function start(options = {}, restore = null) {
    ai = null; paused = false; accumulator = 0;
    noteIndex = 0; $('fieldNote').textContent = notes[0]; $('noteNumber').textContent = '01 / 06';
    battle = restore ? C.Battle.restore(weapons, restore) : new C.Battle(weapons, options);
    loadouts = restore?.loadouts || battle.tanks.map(t => [...t.inventory]);
    if (!Array.isArray(loadouts) || loadouts.length !== 2) loadouts = battle.tanks.map(t => [...t.inventory]);
    $('pauseScreen').hidden = true; $('pauseBtn').setAttribute('aria-label', 'Pause game');
    renderer.reset(); sync(); saveBattle(); prepareAI();
  }
  function fire() {
    if (!canPlay()) return;
    sounds.unlock(); battle.fire(); sync();
  }
  function prepareAI() {
    if (battle.options.mode !== 'cpu' || battle.active !== 1 || battle.phase !== 'aim') { ai = null; return; }
    const choices = battle.tank.inventory.map(id => weapons.find(w => w.id === id));
    const useful = choices.filter(w => !['jump', 'wall', 'dirt'].includes(w.behavior));
    const weapon = (useful.length ? useful : choices)[Math.floor(battle.rng() * (useful.length || choices.length))];
    if (!weapon) return;
    battle.select(weapon.id);
    let aim;
    if (weapon.behavior === 'laser') {
      const tank = battle.tank, target = battle.tanks[0];
      aim = { angle: C.clamp(Math.atan2(tank.y - target.y, target.x - tank.x) * 180 / Math.PI, 0, 180), power: 70 };
    } else aim = C.solveAim(battle.terrain, battle.tank, battle.tanks[0], battle.wind, { easy: 17, normal: 8, hard: 2 }[battle.options.difficulty], battle.rng);
    ai = { ...aim, start: battle.time, fromAngle: battle.tank.angle, fromPower: battle.tank.power };
    sync();
  }
  function processEvents() {
    const events = battle.events.splice(0);
    for (const e of events) {
      renderer.event(e);
      if (e.type === 'score') sync();
      if (e.type === 'turnEnd') {
        noteIndex = (noteIndex + 1) % notes.length; $('fieldNote').textContent = notes[noteIndex]; $('noteNumber').textContent = `0${noteIndex + 1} / 06`;
        if (e.score) notify(`${e.score > 0 ? '+' : '−'}${Math.abs(e.score)} points. ${e.score > 50 ? 'That made an impression.' : e.score < 0 ? 'Careful with the splash.' : 'Every point counts.'}`);
      }
      if (e.type === 'turnStart') { sync(); saveBattle(); prepareAI(); }
      if (e.type === 'gameOver') { sync(); showResults(); }
    }
  }
  function showResults() {
    try { localStorage.removeItem(SAVE); } catch {}
    const [a, b] = battle.tanks, names = playerNames(), tie = a.score === b.score;
    $('resultTitle').textContent = tie ? 'A very even hillside.' : a.score > b.score ? 'You made your point.' : 'A rematch is in order.';
    if (battle.options.mode === 'local' && !tie) $('resultTitle').textContent = `${names[a.score > b.score ? 0 : 1]} takes the hill.`;
    $('resultSubtitle').textContent = tie ? 'A draw. There’s only one way to settle this.' : `${Math.abs(a.score - b.score)} points between you. ${a.score > b.score ? 'Nicely aimed.' : 'The next hillside is yours.'}`;
    $('finalP1Name').textContent = names[0]; $('finalP2Name').textContent = names[1];
    $('finalP1Score').textContent = formatScore(a.score); $('finalP2Score').textContent = formatScore(b.score);
    $('saveIndicator').textContent = 'MATCH COMPLETE';
    $('resultDialog').showModal();
  }
  function showMatch(mode = battle.options.mode) {
    const f = $('matchForm'); f.elements.mode.value = mode; f.elements.terrain.value = battle.options.terrain;
    f.elements.difficulty.value = battle.options.difficulty; f.elements.rounds.value = String(battle.options.rounds); f.elements.wind.checked = battle.options.wind;
    updateForm(); $('matchDialog').showModal(); sounds.play('click', .25);
  }
  function updateForm() {
    const mode = $('matchForm').elements.mode.value;
    $('difficultyField').hidden = mode !== 'cpu'; $('roundsField').hidden = mode === 'practice'; $('draftField').hidden = mode === 'practice';
  }
  function openCatalog(draft = false) {
    drafting = draft; $('weaponSearch').value = ''; $('categoryFilter').value = 'all';
    $('draftFooter').hidden = !draft;
    $('catalogEyebrow').textContent = draft ? 'A LITTLE STRATEGY BEFORE THE CHAOS' : 'A TOOL FOR EVERY KIND OF TROUBLE';
    $('catalogTitle').textContent = draft ? 'Choose your possibilities.' : 'Meet the arsenal.';
    $('catalogLead').textContent = draft ? draftInstruction() : battle.practice ? 'Select any weapon to try it on the hillside.' : 'Inspect all 36. Select a weapon in your loadout to equip it.';
    renderCatalog(); $('catalogDialog').showModal();
  }
  function draftInstruction() { return `${pendingOptions.mode === 'local' ? 'Player ' + (draftSide + 1) : 'Your arsenal'}: pick ${pendingOptions.rounds} weapons, one for each volley.`; }
  function renderCatalog() {
    const search = $('weaponSearch').value.trim().toLowerCase(), category = $('categoryFilter').value;
    const filtered = weapons.filter(w => (!search || `${w.name} ${w.category} ${w.pack}`.toLowerCase().includes(search)) && (category === 'all' || category === w.category));
    $('catalogGrid').innerHTML = filtered.map(w => {
      const chosen = drafting ? draftPicks[draftSide].includes(w.id) : battle.tank.selected === w.id;
      const available = battle.practice || battle.tank.inventory.includes(w.id);
      return `<button class="catalog-card ${chosen ? 'is-picked' : ''}" data-catalog-weapon="${w.id}" aria-pressed="${chosen}"><span class="catalog-card-head">${WeaponIcons.html(w)}<span><strong>${esc(w.name)}</strong><small>${w.category.toUpperCase()}</small></span></span><p>${esc(descriptions[w.id])}</p><span class="availability">${drafting ? chosen ? '✓ SELECTED' : 'ADD TO ARSENAL' : battle.practice ? 'TRY THIS WEAPON ↗' : available ? 'IN YOUR LOADOUT · EQUIP ↗' : 'AVAILABLE IN TARGET PRACTICE'}</span></button>`;
    }).join('') || '<p class="empty-catalog">No weapons found. Try another name or type.</p>';
    if (drafting) {
      $('draftCount').textContent = `${draftPicks[draftSide].length} / ${pendingOptions.rounds} weapons selected`;
      $('startDraftBtn').disabled = draftPicks[draftSide].length !== pendingOptions.rounds;
      $('startDraftBtn').innerHTML = (pendingOptions.mode === 'local' && draftSide === 0 ? 'Player 2’s arsenal' : 'Start battle') + icon('arrow');
    }
  }
  function completeDraft() {
    if (draftPicks[draftSide].length !== pendingOptions.rounds) return;
    if (pendingOptions.mode === 'local' && draftSide === 0) {
      draftSide = 1; $('catalogLead').textContent = draftInstruction(); $('weaponSearch').value = ''; $('categoryFilter').value = 'all'; renderCatalog(); $('catalogDialog').scrollTop = 0; return;
    }
    const options = pendingOptions, picks = draftPicks.map(p => [...p]);
    $('catalogDialog').close(); drafting = false; start(options);
    battle.tanks[0].inventory = picks[0]; battle.tanks[0].selected = picks[0][0];
    if (options.mode === 'local') { battle.tanks[1].inventory = picks[1]; battle.tanks[1].selected = picks[1][0]; }
    loadouts = battle.tanks.map(t => [...t.inventory]); sync(); saveBattle();
  }
  function togglePause(force) {
    paused = typeof force === 'boolean' ? force : !paused;
    $('pauseScreen').hidden = !paused; $('pauseBtn').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
    sounds.syncMusic(); sync();
  }
  function toggleSound() {
    sounds.unlock(); prefs.sound = !prefs.sound; savePrefs(); syncSound(); sounds.syncMusic();
  }
  function syncSound() {
    $('soundBtn').innerHTML = icon(prefs.sound ? 'sound' : 'mute'); $('soundBtn').setAttribute('aria-pressed', String(prefs.sound));
    $('soundBtn').setAttribute('aria-label', prefs.sound ? 'Mute sound' : 'Enable sound'); $('musicCheckbox').checked = prefs.music;
  }
  function move(direction) { if (canPlay() && battle.move(direction)) { sounds.play('click', .2); sync(); saveBattle(); } }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.querySelector('.battle-station').requestFullscreen) await document.querySelector('.battle-station').requestFullscreen();
      else notify('Fullscreen isn’t available in this browser. Landscape mode gives you more room.');
    } catch { notify('Fullscreen isn’t available here. Try opening the game in a browser tab.'); }
  }

  $('fireBtn').addEventListener('click', fire);
  ['angle', 'power'].forEach(key => $(key + 'Input').addEventListener('input', e => {
    if (!canPlay()) return;
    battle.tank[key] = Number(e.target.value); syncControls();
  }));
  ['angleInput', 'powerInput'].forEach(id => $(id).addEventListener('change', saveBattle));
  $('inventory').addEventListener('click', e => {
    const button = e.target.closest('[data-weapon]');
    if (button && canPlay() && battle.select(button.dataset.weapon)) { sounds.play('select', .2); sync(); saveBattle(); }
  });
  $('newMatchBtn').addEventListener('click', () => showMatch()); $('settingsBtn').addEventListener('click', () => showMatch());
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => showMatch(button.dataset.mode)));
  $('helpBtn').addEventListener('click', () => $('helpDialog').showModal());
  $('soundBtn').addEventListener('click', toggleSound);
  $('musicCheckbox').addEventListener('change', e => { prefs.music = e.target.checked; sounds.unlock(); sounds.syncMusic(); savePrefs(); });
  $('aimBtn').addEventListener('click', () => { prefs.guide = !prefs.guide; savePrefs(); sync(); });
  $('pauseBtn').addEventListener('click', () => togglePause()); $('resumeBtn').addEventListener('click', () => togglePause(false));
  $('fullscreenBtn').addEventListener('click', fullscreen);
  $('moveLeftBtn').addEventListener('click', () => move(-1)); $('moveRightBtn').addEventListener('click', () => move(1));
  $('restartPracticeBtn').addEventListener('click', () => { const selected = battle.tank.selected; start({ ...battle.options, seed: Date.now() >>> 0 }); battle.select(selected); sync(); saveBattle(); notify('Fresh ground. Same possibilities.'); });
  $('catalogBtn').addEventListener('click', () => openCatalog());
  $('weaponSearch').addEventListener('input', renderCatalog); $('categoryFilter').addEventListener('change', renderCatalog);
  $('catalogGrid').addEventListener('click', e => {
    const button = e.target.closest('[data-catalog-weapon]'); if (!button) return;
    const id = button.dataset.catalogWeapon;
    if (drafting) {
      const picks = draftPicks[draftSide], index = picks.indexOf(id);
      if (index >= 0) picks.splice(index, 1);
      else if (picks.length < pendingOptions.rounds) picks.push(id);
      else { notify(`Your arsenal is full. Remove a weapon to swap it.`); return; }
      sounds.play('select', .2); renderCatalog();
    } else if (battle.phase === 'aim' && !(battle.options.mode === 'cpu' && battle.active === 1) && battle.select(id)) {
      sounds.play('select', .2); $('catalogDialog').close(); sync(); saveBattle();
    } else notify(battle.options.mode === 'cpu' && battle.active === 1 ? 'Wait for your turn to equip a weapon.' : battle.phase !== 'aim' ? 'Let this shot finish first.' : 'Try this weapon in Target practice, or pick it for your next match.');
  });
  $('randomDraftBtn').addEventListener('click', () => { draftPicks[draftSide] = C.shuffle(weapons.map(w => w.id)).slice(0, pendingOptions.rounds); renderCatalog(); });
  $('startDraftBtn').addEventListener('click', completeDraft);
  $('matchForm').addEventListener('change', updateForm);
  $('matchForm').addEventListener('submit', e => {
    e.preventDefault(); sounds.unlock();
    const f = e.target, options = { mode: f.elements.mode.value, terrain: f.elements.terrain.value, difficulty: f.elements.difficulty.value, rounds: Number(f.elements.rounds.value), wind: f.elements.wind.checked, seed: Date.now() >>> 0 };
    $('matchDialog').close();
    if (f.elements.draft.checked && options.mode !== 'practice') { pendingOptions = options; draftSide = 0; draftPicks = [[], []]; openCatalog(true); }
    else { start(options); notify(options.mode === 'local' ? 'Player 1, take your shot.' : options.mode === 'practice' ? 'All 36 weapons. Make yourself at home.' : 'Fresh ground. Your move.'); }
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', e => { if (e.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); });
    dialog.addEventListener('close', () => { if (dialog === $('catalogDialog')) drafting = false; canvas.focus({ preventScroll: true }); });
  });
  $('rematchBtn').addEventListener('click', () => { $('resultDialog').close(); start({ ...battle.options, seed: Date.now() >>> 0 }); });
  $('resultSettingsBtn').addEventListener('click', () => { $('resultDialog').close(); showMatch(); });
  document.addEventListener('pointerdown', () => sounds.unlock(), { once: true });
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) e.preventDefault();
    if (e.repeat && [' ', 'p', 'm', 'g', 'f'].includes(key)) return;
    sounds.unlock();
    if (key === ' ') fire();
    if (key === 'p' || key === 'escape') togglePause();
    if (key === 'm') toggleSound();
    if (key === 'g') { prefs.guide = !prefs.guide; savePrefs(); sync(); }
    if (key === 'f') fullscreen();
    if (key === '?' || key === 'h') $('helpDialog').showModal();
    if (key === 'a') move(-1); if (key === 'd') move(1);
    if (canPlay()) {
      const step = e.shiftKey ? 5 : 1;
      if (key === 'arrowleft') battle.tank.angle = C.clamp(battle.tank.angle + step, 0, 180);
      if (key === 'arrowright') battle.tank.angle = C.clamp(battle.tank.angle - step, 0, 180);
      if (key === 'arrowup') battle.tank.power = C.clamp(battle.tank.power + step, 1, 100);
      if (key === 'arrowdown') battle.tank.power = C.clamp(battle.tank.power - step, 1, 100);
      if (key.startsWith('arrow')) { syncControls(); saveBattle(); }
      if (/^[1-9]$/.test(key)) { const choices = battle.practice ? practiceSlots() : loadouts[battle.active]; battle.select(choices[Number(key) - 1]); sync(); saveBattle(); }
    }
  });
  function pointerAim(e) {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * C.W, y = (e.clientY - r.top) / r.height * C.H;
    const dx = x - battle.tank.x, dy = battle.tank.y - 18 - y;
    battle.tank.angle = C.clamp(Math.round(Math.atan2(dy, dx) * 180 / Math.PI), 0, 180);
    battle.tank.power = C.clamp(Math.round(Math.hypot(dx, dy) / 4.7), 5, 100); syncControls();
  }
  canvas.addEventListener('pointerdown', e => { if (!canPlay()) return; dragging = true; canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true }); pointerAim(e); });
  canvas.addEventListener('pointermove', e => { if (dragging && canPlay()) pointerAim(e); });
  canvas.addEventListener('pointerup', () => { if (dragging) saveBattle(); dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  document.addEventListener('visibilitychange', () => { accumulator = 0; sounds.syncMusic(); });
  window.addEventListener('pagehide', saveBattle);

  let previous = performance.now();
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .05); previous = now;
    const blocked = paused || document.hidden || document.querySelector('dialog[open]');
    if (!blocked && battle) {
      accumulator += dt;
      while (accumulator >= C.STEP) {
        battle.update(C.STEP); accumulator -= C.STEP;
        if (ai && battle.phase === 'aim' && battle.active === 1) {
          const t = C.clamp((battle.time - ai.start) / 1.1, 0, 1), smooth = t * t * (3 - 2 * t);
          battle.tank.angle = Math.round(ai.fromAngle + (ai.angle - ai.fromAngle) * smooth);
          battle.tank.power = Math.round(ai.fromPower + (ai.power - ai.fromPower) * smooth);
          if (battle.time > ai.start + 1.5) { ai = null; battle.fire(); sync(); }
          else syncControls();
        }
        processEvents();
      }
      renderer.update(dt);
    } else accumulator = 0;
    renderer.draw(); requestAnimationFrame(frame);
  }
  syncSound();
  const saved = safeRead(SAVE);
  try { if (saved) start({}, saved); else start({ seed: 48173 }); }
  catch { start({ seed: 48173 }); }
  requestAnimationFrame(frame);
})();
