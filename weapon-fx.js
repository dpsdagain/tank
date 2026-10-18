/* Layered weapon effects driven by the APK's exported draw recipes and palettes. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  // The Flow export is opaque. Only clean fire frames are used with screen
  // compositing; the native/procedural smoke remains an opaque, separate layer.
  const FLOW_FIRE = { src: 'assets/vfx/flow-explosion.jpg', frames: 7, cell: 256, columns: 4, smooth: true, blend: 'screen' };
  const FLOW_FAMILIES = new Set(['shell', 'triple', 'five', 'bounce', 'chain', 'skip', 'roller', 'homing', 'bees', 'burst', 'napalm', 'nuke', 'meteors', 'volcano']);
  const FALLBACK = {
    shell: '#ff3868', triple: '#ff39eb', five: '#bf51ff', sniper: '#f4ff77', bounce: '#ffb52c',
    chain: '#ff5629', skip: '#31ff92', roller: '#16d8ff', napalm: '#ff5b12', hail: '#43eaff',
    drill: '#ffb31c', tunnel: '#73ff31', homing: '#ff356d', bees: '#ffde19', burst: '#d83fff',
    laser: '#00fff2', lightning: '#b362ff', orbital: '#3dbeff', nuke: '#ff8a00',
    meteors: '#ff6417', volcano: '#ff370e', dirt: '#c58c48', wall: '#b3d44f', jump: '#20c9ff'
  };
  function disk(ctx, x, y, radius, color) {
    if (!(radius > 0)) return;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
  }
  function blob(ctx, x, y, radius, seed, color, lobes = 11) {
    if (!(radius > 0)) return;
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const a = i / 80 * TAU;
      const r = radius * (1 + Math.sin(a * lobes + seed) * .065 + Math.sin(a * 5 - seed) * .04);
      const xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath(); ctx.fill();
  }

  class WeaponEffects {
    constructor(data, options = {}) {
      this.data = data; this.reducedMotion = !!options.reducedMotion;
      this.flight = root.ProjectileArt ? new root.ProjectileArt(options) : null;
      this.impacts = root.WeaponImpactArt ? new root.WeaponImpactArt(this) : null;
      this.flowArt = options.flowArt !== false;
      this.atlases = { ...data.atlases, ...(this.flowArt ? { flowFire: FLOW_FIRE } : {}) };
      this.particleLimit = options.particleLimit || 1100;
      this.particles = []; this.effects = []; this.scorches = []; this.time = 0;
      this.shake = 0; this.flash = 0; this.flashColor = '#ffb73c';
      this.images = {}; this.tracked = new WeakMap(); this.textures = {}; this.glows = {};
      if (typeof Image !== 'undefined') for (const [key, atlas] of Object.entries(this.atlases)) {
        const img = new Image(); img.src = atlas.src; this.images[key] = img;
      }
      if (typeof document !== 'undefined') this.makeTextures();
    }
    reset() { this.particles = []; this.effects = []; this.scorches = []; this.shake = 0; this.flash = 0; this.tracked = new WeakMap(); }
    makeTextures() {
      for (const [name, tint] of Object.entries({ smoke: [35, 31, 44], dust: [111, 70, 41], glow: [255, 135, 18] })) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        for (let i = 0; i < 9; i++) {
          const angle = i * 2.399, r = 18 + (i % 3) * 4;
          const x = 64 + Math.cos(angle) * r, y = 64 + Math.sin(angle) * r;
          const gradient = ctx.createRadialGradient(x, y, 3, x, y, 34);
          gradient.addColorStop(0, `rgba(${tint},.7)`); gradient.addColorStop(.5, `rgba(${tint},.42)`); gradient.addColorStop(1, `rgba(${tint},0)`);
          ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
        }
        this.textures[name] = canvas;
      }
    }
    profile(id) { return this.data.profiles?.[id] || { behavior: 'shell', explosions: [] }; }
    glow(ctx, x, y, radius, color, alpha) {
      if (typeof document === 'undefined' || !color.startsWith('#')) return;
      if (!this.glows[color]) {
        const tile = document.createElement('canvas'); tile.width = tile.height = 128;
        const c = tile.getContext('2d'), g = c.createRadialGradient(64,64,0,64,64,64);
        g.addColorStop(0,color); g.addColorStop(.3,color+'bb'); g.addColorStop(.65,color+'44'); g.addColorStop(1,color+'00');
        c.fillStyle=g;c.fillRect(0,0,128,128);this.glows[color]=tile;
      }
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha*=alpha;
      ctx.drawImage(this.glows[color],x-radius,y-radius,radius*2,radius*2);ctx.restore();
    }
    color(id, bullet = false) {
      const p = this.profile(id);
      if (!bullet && p.behavior !== 'nuke') { const impact = this.impacts?.color(id); if (impact) return impact; }
      const index = bullet ? p.bulletColor : p.explosions?.[0]?.color ?? p.impactColor;
      if (Number.isFinite(index) && index >= 16 && this.data.palette[index]) return this.data.palette[index];
      return FALLBACK[p.behavior] || '#ff572e';
    }
    sprite(ctx, key, frame, x, y, width, height = width, angle = 0, alpha = 1) {
      const atlas = this.atlases[key], image = this.images[key];
      if (!atlas || !image?.complete || !image.naturalWidth || width <= 0 || height <= 0) return false;
      frame = clamp(Math.floor(frame), 0, atlas.frames - 1);
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha *= clamp(alpha, 0, 1);
      ctx.imageSmoothingEnabled = !!atlas.smooth;
      if (atlas.blend) ctx.globalCompositeOperation = atlas.blend;
      ctx.drawImage(image, frame % atlas.columns * atlas.cell, Math.floor(frame / atlas.columns) * atlas.cell,
        atlas.cell, atlas.cell, -width / 2, -height / 2, width, height);
      ctx.restore(); return true;
    }
    addParticle(p) {
      if (this.particles.length >= this.particleLimit) return;
      const life = p.life || .7;
      this.particles.push({ vx: 0, vy: 0, size: 2, gravity: 230, drag: 1.5, rotation: Math.random() * TAU,
        spin: (Math.random() - .5) * 7, kind: 'spark', color: '#ffbb24', ...p, life, max: life, px: p.x, py: p.y });
    }
    spray(x, y, count, color, speed, kind = 'spark', radius = 20) {
      count = Math.min(count, this.particleLimit - this.particles.length);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU, v = speed * (.2 + Math.random() * .85);
        this.addParticle({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * .22,
          kind, color: i % 5 === 0 && kind === 'spark' ? '#fff8ab' : color,
          size: kind === 'debris' ? 2 + Math.random() * 5 : kind === 'smoke' ? radius * (.2 + Math.random() * .4) : 1 + Math.random() * 2.5,
          life: kind === 'smoke' ? 1.2 + Math.random() * 1.1 : .4 + Math.random() * 1.0,
          gravity: kind === 'smoke' ? -18 : kind === 'debris' ? 400 : 150, drag: kind === 'smoke' ? 3 : 1.1 });
      }
    }
    event(event) {
      const id = event.weaponId || event.weapon?.id || 'single_shot', profile = this.profile(id);
      const color = this.color(id), behavior = profile.behavior;
      const e = { ...event, id, behavior, color, age: 0, seed: Math.random() * 20 };
      if (this.impacts?.event(e, event)) return;
      switch (event.type) {
        case 'fire':
          this.effects.push({ ...e, kind: 'muzzle', radius: 31, life: .22 });
          this.spray(e.x, e.y, 24, '#fff19b', 200); break;
        case 'explosion': {
          const nuclear = behavior === 'nuke', fire = ['napalm', 'meteors', 'volcano'].includes(behavior) || id === 'fireball' || id === 'comet';
          const radius = Math.max(12, event.radius), small = radius < 27;
          const recipe = profile.explosions || [];
          // Repeated drill/chain/napalm hits each get their own short blast, not a replay of the whole trigger.
          const stages = ['chain', 'drill', 'tunnel'].includes(behavior) ? recipe.slice(0, 1) : recipe.slice(0, 6);
          if (!stages.length && profile.impactColor >= 16) stages.push({radius:1,delay:0,color:profile.impactColor,bands:profile.impactBands,direction:profile.impactDirection});
          const delay = stages.reduce((max, s) => Math.max(max, s.delay), 0);
          const flowImpact = this.flowArt && FLOW_FAMILIES.has(behavior);
          this.effects.push({ ...e, radius, kind: 'blast', life: nuclear ? 1.65 : Math.max(.85, delay + .7), stages, fire, flowImpact });
          this.effects.push({ ...e, radius, kind: 'shock', life: nuclear ? .95 : .55 });
          if (['drill', 'tunnel'].includes(behavior)) this.effects.push({ ...e, kind: 'burrow', life: .42 });
          if (nuclear) this.effects.push({ ...e, radius, kind: 'mushroom', life: 2.8 });
          if (fire || nuclear) this.effects.push({ ...e, radius, kind: 'nativeFire', life: nuclear ? 1.7 : .95, flowImpact });
          this.scorches.push({ x: e.x, y: e.y, radius, age: 0, life: 9, color });
          if (this.scorches.length > 25) this.scorches.shift();
          this.spray(e.x, e.y, Math.min(130, 18 + radius), nuclear ? '#ffb72a' : color, 110 + radius * 2.4);
          this.spray(e.x, e.y, Math.min(40, 5 + radius * .28), '#996b3e', 130 + radius * 1.5, 'debris');
          this.spray(e.x, e.y - 8, small ? 3 : nuclear ? 18 : 8, color, 36 + radius * .3, 'smoke', radius);
          this.shake = Math.max(this.shake, nuclear ? 17 : Math.min(10, radius * .1));
          if (radius > 70) { this.flash = Math.max(this.flash, nuclear ? .23 : .08); this.flashColor = '#ffd46a'; }
          break;
        }
        case 'beam': case 'lightning':
          this.effects.push({ ...e, kind: event.type, life: behavior === 'orbital' ? 1 : .65 });
          if (behavior === 'orbital') this.effects.push({ ...e, x: e.ex, y: e.ey, kind: 'beacon', life: .7, radius: 24 });
          this.spray(e.ex, e.ey, 65, FALLBACK[behavior] || '#20ffff', 240);
          this.shake = Math.max(this.shake, 4); break;
        case 'flame':
          this.effects.push({ ...e, kind: 'flame', life: 1.6, radius: 22 + Math.random() * 12 });
          this.spray(e.x, e.y, 8, '#ff990d', 80); break;
        case 'beacon':
          this.effects.push({ ...e, kind: 'beacon', life: 1.2, radius: 30 }); break;
        case 'dirt':
          this.spray(e.x, e.y, 90, '#bb9154', 220, 'debris');
          this.spray(e.x, e.y - 15, 12, color, 70, 'smoke', 70);
          if (id === 'magic_wall') this.effects.push({ ...e, kind: 'wallRise', life: .8 });
          break;
        case 'bounce':
          this.spray(e.x, e.y, 18, '#ffe76a', 160); break;
        case 'jet':
          this.effects.push({ ...e, kind: 'jetLaunch', life: .45, radius: 40 });
          this.spray(e.x, e.y, 70, '#3bdfff', 240); break;
      }
    }
    update(dt, projectiles = [], terrain = null) {
      this.terrain = terrain;
      this.time += dt; this.shake = Math.max(0, this.shake - dt * 26); this.flash = Math.max(0, this.flash - dt * 2.2);
      for (const p of this.particles) {
        p.life -= dt; p.px = p.x; p.py = p.y;
        p.vx *= Math.exp(-p.drag * dt); p.vy += p.gravity * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rotation += p.spin * dt;
        if (p.kind === 'smoke') p.size += dt * 20;
        if (p.kind === 'debris' && !p.bounced && terrain?.solid(p.x, p.y) && p.vy > 0) { p.vy *= -.28; p.vx *= .5; p.bounced = true; }
      }
      this.particles = this.particles.filter(p => p.life > 0 && p.y < 660);
      for (const effect of this.effects) effect.age += dt;
      this.effects = this.effects.filter(e => e.age < e.life);
      for (const mark of this.scorches) mark.age += dt;
      this.scorches = this.scorches.filter(mark => mark.age < mark.life);
      for (const p of projectiles) {
        const profile = this.profile(p.weapon.id), behavior = profile.behavior;
        const last = this.tracked.get(p) || 0;
        if (p.age - last < 1 / 35) continue;
        this.tracked.set(p, p.age);
        const style = this.flight?.style(p.weapon.id), trail = style?.trail;
        const fire = ['fire', 'lava', 'meteor', 'droplets', 'twin'].includes(trail);
        if (fire) {
          this.addParticle({ x: p.x, y: p.y, vx: -p.vx * .08, vy: -p.vy * .08,
            size: p.child ? 1.5 : 2.3, life: .3, color: '#ffb445', gravity: trail === 'droplets' ? 170 : 25 });
        }
        if (trail === 'smoke' || trail === 'exhaust' || (trail === 'meteor' && p.child)) {
          this.addParticle({ x: p.x, y: p.y, vx: -p.vx * .05, vy: -p.vy * .05, gravity: -15, drag: 3,
            size: p.child ? 4 : 5, kind: 'smoke', life: .4, color: '#342a37' });
        }
        if (['dust', 'mud'].includes(trail) || p.rolling) {
          this.addParticle({ x: p.x, y: p.y + 3, vx: -p.vx * .07, vy: -12,
            size: p.rolling ? 2.5 : 1.8, life: .38, color: '#b5956b', kind: 'debris', gravity: 120 });
        }
        if (trail === 'comet' || trail === 'frost' || trail === 'pollen') {
          this.addParticle({ x: p.x, y: p.y, vx: -p.vx * .04, vy: -p.vy * .04,
            size: 1.4, life: .3, color: style.color, gravity: 5 });
        }
        // The native emitters use several color/speed layers; preserve their character with a capped budget.
        const emitter = this.data.emitters?.[profile.emitter];
        if (emitter) {
          const node = emitter[Math.floor(this.time * 30) % emitter.length];
          const a = Math.random() * TAU, speed = Number(node.particleHighSpeed_PPS || 80) * .4;
          this.addParticle({ x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
            color: `rgb(${node.r},${node.g},${node.b})`, life: .4, size: 2, gravity: 12 });
        }
      }
    }
    drawScorches(ctx) {
      ctx.save();
      for (const mark of this.scorches) {
        const alpha = Math.min(1, (mark.life - mark.age) / 3);
        ctx.globalAlpha = alpha * .22; ctx.strokeStyle = '#0a0710'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(mark.x, mark.y, mark.radius * .95, .12, Math.PI - .12); ctx.stroke();
        if (mark.age < 2) {
          ctx.globalAlpha = alpha * (1 - mark.age / 2) * .9; ctx.strokeStyle = mark.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(mark.x, mark.y, mark.radius * .9, .2, Math.PI - .2); ctx.stroke();
        }
      }
      ctx.restore();
    }
    drawParticles(ctx, smoke) {
      ctx.save();
      for (const p of this.particles) {
        if ((p.kind === 'smoke') !== smoke) continue;
        const progress = 1 - p.life / p.max;
        ctx.globalAlpha = Math.min(1, p.life / .25) * (p.kind === 'smoke' ? .68 : 1);
        if (p.kind === 'smoke') {
          if (this.textures.smoke) ctx.drawImage(this.textures.smoke, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
          else disk(ctx, p.x, p.y, p.size * .6, '#292135');
          this.sprite(ctx,'smoke',progress*8,p.x,p.y,p.size*1.5,p.size*1.5,p.rotation,.2);
        } else if (this.impacts?.drawParticle(ctx, p, progress)) {
          // Source-specific chips, soil clods and metal streaks have their own shapes.
        } else if (p.kind === 'debris') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .7); ctx.restore();
        } else {
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size * (1 - progress * .65); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .025, p.y - p.vy * .025); ctx.stroke();
          if (p.size > 2 && progress < .5) disk(ctx, p.x, p.y, p.size * .45, '#fff7c9');
        }
      }
      ctx.restore();
    }
    drawBlast(ctx, e) {
      if (e.flowImpact && this.drawFlowBlast(ctx, e)) return;
      const r = e.radius, age = e.age;
      const progress = clamp(age / .18, 0, 1), hold = age < .55;
      const fade = clamp((e.life - age) / .35, 0, 1);
      ctx.globalAlpha *= fade;
      // Opaque palette bands form a crisp expanding body, as in EXPLOSION_OUT.
      const palette = this.data.palette;
      const stages = e.stages.length ? e.stages : [{ radius: 1, color: null, delay: 0, direction: -1, bands: 9 }];
      const baseRadius = Math.max(1, ...stages.map(s => s.radius));
      for (const stage of stages) {
        const local = age - stage.delay;
        if (local < 0) continue;
        const size = r * stage.radius / baseRadius * clamp(local / .19, 0, 1) * 1.1;
        if (size < .5) continue;
        const bandCount = clamp(stage.bands || 10, 5, 16);
        for (let band = 0; band < bandCount; band++) {
          const ratio = 1 - band / bandCount;
          const idx = clamp((stage.color || 0) + (stage.direction || -1) * band, 0, 255);
          let color = stage.color === null ? [e.color, '#ffac24', '#ffe554', '#fff6c5'][Math.min(3, Math.floor(band / bandCount * 4))] : palette[idx];
          // Native dark rings stay dark. Bright edge and center preserve their hard silhouette.
          if (stage.color !== null) disk(ctx,e.x,e.y,size*ratio,color);
          else blob(ctx,e.x,e.y,size*ratio,e.seed+age*5,color,9);
        }
        if (local < .22) disk(ctx, e.x, e.y, size * .25 * (1 - local / .3), '#fff8cd');
      }
      if (hold && e.behavior !== 'nuke') {
        ctx.globalAlpha *= .85;
        ctx.strokeStyle = '#fff7c1'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, r * progress * 1.12, .2, 2.5); ctx.stroke();
      }
    }
    drawFlowBlast(ctx, e) {
      const image = this.images.flowFire;
      if (!image?.complete || !image.naturalWidth) return false;
      // Uneven timing gives the peak room to read. Never sample the clipped
      // eighth cell, the gray smoke cells, or the marked final cell.
      const ends = [.04, .095, .165, .245, .375, .495, .72];
      const frame = ends.findIndex(end => e.age < end);
      if (frame < 0) return true;
      const size = e.radius * (e.behavior === 'nuke' ? 3.9 : 3.7);
      const fade = clamp((.72 - e.age) / .18, 0, 1);
      return this.sprite(ctx, 'flowFire', frame, e.x, e.y - e.radius * .12, size, size, 0, fade);
    }
    drawMushroom(ctx, e) {
      const age = e.age, rise = clamp((age - .12) / 1.5, 0, 1), r = e.radius;
      if (age < .12) return;
      const y = e.y - r * (1 + rise * 1.25), width = r * (.42 + rise * .8);
      const fade = clamp((e.life - age) / .8, 0, 1);
      ctx.globalAlpha *= fade;
      for (let i = 0; i < 8; i++) {
        const yy = e.y - i / 8 * (e.y - y), rr = r * (.18 + i * .025);
        blob(ctx, e.x + Math.sin(i * 2 + e.seed) * r * .07, yy, rr, i, '#362337', 7);
        blob(ctx, e.x - rr * .15, yy, rr * .64, i + 1, i > 3 ? '#b33521' : '#ed5f13', 7);
        blob(ctx, e.x - rr * .25, yy, rr * .26, i + 2, '#ffb826', 7);
      }
      for (let i = -4; i <= 4; i++) {
        const xx = e.x + i * width * .21, yy = y + Math.abs(i) ** 1.4 * width * .07;
        const rr = width * (.34 - Math.abs(i) * .025);
        blob(ctx, xx, yy, rr, e.seed + i, '#492737', 9);
        blob(ctx, xx - rr * .06, yy - rr * .1, rr * .85, e.seed + i, '#b93919', 9);
        blob(ctx, xx - rr * .13, yy - rr * .22, rr * .65, e.seed + i, '#ff9418', 8);
        blob(ctx, xx - rr * .15, yy - rr * .33, rr * .35, e.seed + i, '#ffe880', 7);
      }
      ctx.strokeStyle = '#ffc538'; ctx.globalAlpha *= .55; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(e.x, y + width * .14, width * 1.08, width * .17, 0, 0, TAU); ctx.stroke();
    }
    drawEffect(ctx, e) {
      const age = e.age, t = age / e.life;
      ctx.save();
      if (this.impacts?.draw(ctx, e)) { ctx.restore(); return; }
      if (e.kind === 'blast') {
        this.glow(ctx,e.x,e.y,e.radius*2.4,e.flowImpact?'#ff930f':e.color,clamp((e.life-age)*.6,0,e.flowImpact ? .23 : .5));
        this.drawBlast(ctx, e);
      }
      else if (e.kind === 'mushroom') this.drawMushroom(ctx, e);
      else if (e.kind === 'shock') {
        const size = e.radius * (1 + t * 1.5);
        ctx.globalAlpha = (1 - t) ** 1.4; ctx.strokeStyle = e.color; ctx.lineWidth = Math.max(1, 5 * (1 - t));
        ctx.beginPath(); ctx.ellipse(e.x, e.y, size, size * .34, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#fff6a9'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(e.x, e.y, size * .94, size * .3, 0, 0, TAU); ctx.stroke();
      } else if (e.kind === 'nativeFire') {
        if (!e.flowImpact || !this.images.flowFire?.complete || !this.images.flowFire.naturalWidth)
          this.sprite(ctx, 'fireball', t * 29, e.x, e.y - e.radius * .13, e.radius * 3.4, e.radius * 3.4, 0, clamp((1 - t) * 2, 0, 1));
      } else if (e.kind === 'burrow') {
        this.flight?.burrow(ctx, e, this.terrain?.ground(e.x));
      } else if (e.kind === 'wallRise') {
        ctx.globalAlpha = (1 - t) * .65;
        for (let row = 0; row < Math.min(10, 1 + Math.floor(t * 15)); row++) {
          for (let col = 0; col < 3; col++) {
            ctx.strokeStyle = '#a0ffe3'; ctx.lineWidth = 1;
            ctx.strokeRect(e.x - 21 + col * 14 + (row % 2) * 2, e.y + 75 - row * 16, 13, 15);
          }
        }
      } else if (e.kind === 'jetLaunch') {
        ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#8eeaff'; ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, 12 + t * 35, 3 + t * 8, 0, 0, TAU); ctx.stroke();
      } else if (e.kind === 'muzzle') {
        ctx.globalAlpha = 1 - t;
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + e.seed, length = (i % 2 ? 12 : 31) * (1 - t);
          ctx.strokeStyle = i % 2 ? '#fff9c9' : '#ffaf28'; ctx.lineWidth = i % 2 ? 2 : 4;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * length, e.y + Math.sin(a) * length); ctx.stroke();
        }
        disk(ctx, e.x, e.y, 11 * (1 - t), '#fff8bc');
      } else if (e.kind === 'beam' || e.kind === 'lightning') {
        const color = FALLBACK[e.behavior] || '#00ffed';
        const width = e.behavior === 'orbital' ? 24 : e.id === 'super_laser' ? 16 : 9;
        ctx.globalAlpha = clamp((1 - t) * 3, 0, 1);
        for (const [stroke, line, alpha] of [[color, width * 3, .12], [color, width * 1.6, .32], [color, width, 1], ['#eaffff', width * .4, 1], ['#ffffff', width * .12, 1]]) {
          ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(.3, line * (1 - t * .5)); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e.x, e.y);
          if (e.kind === 'lightning') {
            const length = Math.hypot(e.ex - e.x, e.ey - e.y), steps = Math.ceil(length / 24);
            for (let i = 1; i < steps; i++) {
              const f = i / steps, jitter = Math.sin(i * 39 + Math.floor(this.time * 22)) * 22;
              ctx.lineTo(e.x + (e.ex - e.x) * f + jitter, e.y + (e.ey - e.y) * f);
            }
          }
          ctx.lineTo(e.ex, e.ey); ctx.stroke(); ctx.restore();
        }
        disk(ctx, e.ex, e.ey, 10 + Math.sin(age * 45) * 3, '#e9ffff');
      } else if (e.kind === 'flame') {
        const frame = Math.floor(age * 24) % 24, height = e.radius * (1.4 - t * .5);
        ctx.globalAlpha = Math.min(1, (1 - t) * 2);
        if (!this.sprite(ctx, 'flame', frame, e.x, e.y - height * .5, height * 1.1, height * 1.7)) {
          blob(ctx, e.x, e.y - height * .4, height * .4, age * 9, '#ff6e0d');
          blob(ctx, e.x, e.y - height * .2, height * .25, age * 7, '#fff19d');
        }
      } else if (e.kind === 'beacon') {
        ctx.strokeStyle = FALLBACK[e.behavior] || e.color; ctx.lineWidth = 2; ctx.globalAlpha = 1 - t;
        for (let i = 0; i < 3; i++) { const r = 12 + ((t + i / 3) % 1) * 40; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(e.x - 10, e.y); ctx.lineTo(e.x + 10, e.y); ctx.moveTo(e.x, e.y - 10); ctx.lineTo(e.x, e.y + 10); ctx.stroke();
      }
      ctx.restore();
    }
    drawProjectile(ctx, p) {
      if (this.flight) {
        const width = ctx.canvas?.clientWidth;
        const scale = width > 0 && ctx.canvas.width >= 1000 ? Math.min(2, Math.max(1, 700 / width)) : 1;
        this.flight.draw(ctx, p, scale); return;
      }
      const profile = this.profile(p.weapon.id), behavior = profile.behavior, color = this.color(p.weapon.id, true);
      const a = Math.atan2(p.vy, p.vx), hot = ['nuke', 'meteors', 'volcano', 'homing'].includes(behavior) || ['fireball', 'comet'].includes(p.weapon.id);
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 1; i < p.trail.length; i++) {
        const f = i / p.trail.length;
        ctx.strokeStyle = hot ? '#ff8521' : color; ctx.lineWidth = hot ? 7 * f : 4 * f;
        ctx.globalAlpha = f * .8; ctx.beginPath(); ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y); ctx.lineTo(p.trail[i].x, p.trail[i].y); ctx.stroke();
        ctx.strokeStyle = '#fffcd6'; ctx.lineWidth = 1.2 * f; ctx.globalAlpha = f; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const frame = p.age * (profile.animationFPS || 30);
      let drawn = false;
      if (!p.child && ['nuke', 'homing'].includes(behavior)) drawn = this.sprite(ctx, 'missile', frame % 8, p.x, p.y, 27, 36, a + Math.PI / 2);
      else if (hot) drawn = this.sprite(ctx, behavior === 'meteors' ? 'meteor' : 'comet', frame % (behavior === 'meteors' ? 30 : 25), p.x, p.y, p.child ? 23 : 36, p.child ? 23 : 36, a);
      if (!drawn) {
        disk(ctx, p.x, p.y, p.child ? 4 : 6, color);
        disk(ctx, p.x - 1, p.y - 1, p.child ? 1.8 : 2.5, '#ffffff');
      }
      if (behavior === 'bees' && p.child) { ctx.strokeStyle = '#fff6ac'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 7, 3, Math.sin(this.time * 70), 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    draw(ctx) {
      this.drawParticles(ctx, true);
      for (const effect of this.effects) this.drawEffect(ctx, effect);
      this.drawParticles(ctx, false);
    }
    drawJets(ctx, tank) { this.flight?.jets(ctx, tank, this.time); }
  }
  root.WeaponEffects = WeaponEffects;
  if (typeof module !== 'undefined' && module.exports) module.exports = WeaponEffects;
})(typeof globalThis !== 'undefined' ? globalThis : this);
