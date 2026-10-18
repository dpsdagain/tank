/* Inspection gallery. Paths here illustrate the shared production projectile renderer. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = new WeaponEffects(POCKET_NATIVE_FX, { reducedMotion: reduced, particleLimit: 120, onArtReady: () => renderVisible() });
  const sky = new Image(); sky.src = 'assets/art/flow-scenery.jpg';
  const backdrop = document.createElement('canvas'); backdrop.width = 600; backdrop.height = 240;
  let time = 1.2, previous = performance.now(), held = reduced, backdropReady = false;
  $('holdFlight').textContent = held ? 'Play flights' : 'Hold flight';
  const cards = POCKET_WEAPONS.map((weapon, index) => {
    const section = document.createElement('section'), style = ProjectileArt.catalog[weapon.id];
    section.className = 'flight-card'; section.dataset.weapon = weapon.id;
    section.innerHTML = `<canvas width="600" height="240" role="img" aria-label="${weapon.name} flight animation"></canvas><div class="flight-caption">${WeaponIcons.html(weapon)}<div><h2>${weapon.name}</h2><p>${style.label}</p></div><span class="flight-number">${String(index + 1).padStart(2, '0')}</span></div>`;
    $('flightGrid').append(section);
    return { weapon, section, ctx: section.querySelector('canvas').getContext('2d'), visible: index < 9, shown: true };
  });
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) { const card = cards.find(c => c.section === entry.target); card.visible = entry.isIntersecting; if (card.visible && card.shown) draw(card); }
    }, { rootMargin: '100px' });
    cards.forEach(c => observer.observe(c.section));
  } else cards.forEach(c => { c.visible = true; });
  function makeBackdrop() {
    const c = backdrop.getContext('2d'), gradient = c.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, '#101a33'); gradient.addColorStop(1, '#456274'); c.fillStyle = gradient; c.fillRect(0, 0, 600, 240);
    if (sky.complete && sky.naturalWidth) c.drawImage(sky, 0, 0, 600, 335);
    c.fillStyle = '#263f48'; c.beginPath(); c.moveTo(0, 200);
    for (let x = 0; x <= 600; x += 8) c.lineTo(x, 182 + Math.sin(x * .014) * 7);
    c.lineTo(600, 240); c.lineTo(0, 240); c.fill();
    c.fillStyle = '#4b3932'; c.fillRect(0, 195, 600, 45); c.fillStyle = '#93ca65'; c.fillRect(0, 192, 600, 3);
    c.strokeStyle = '#91704f55'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 217); c.bezierCurveTo(200, 207, 350, 230, 600, 214); c.stroke();
    backdropReady = true;
  }
  sky.onload = () => { makeBackdrop(); renderVisible(); };
  function sample(t, lane = 0) {
    const u = Math.max(0, Math.min(1, t / 2.4));
    return { x: 95 + u * 410, y: 157 - Math.sin(u * Math.PI) * 87 + lane * u };
  }
  function projectile(weapon, lane = 0) {
    const t = time % 2.4, p = sample(t, lane), next = sample(Math.min(2.4, t + .015), lane);
    return { weapon, ...p, vx: (next.x - p.x) / .015 || 170, vy: (next.y - p.y) / .015,
      age: t, trail: Array.from({ length: 24 }, (_, i) => sample(Math.max(0, t - (23 - i) * .026), lane)) };
  }
  function drawShot(c, p) {
    const scale = Number($('flightScale').value);
    c.save(); c.translate(p.x, p.y); c.scale(scale, scale); c.translate(-p.x, -p.y); fx.drawProjectile(c, p); c.restore();
  }
  function child(c, weapon, x, y, vx, vy, rolling = false) {
    drawShot(c, { weapon, x, y, vx, vy, child: true, rolling, age: time,
      trail: Array.from({ length: 20 }, (_, i) => ({ x: x - vx * (19 - i) * .012, y: y - vy * (19 - i) * .012 })) });
  }
  function tank(c, x, y) {
    c.fillStyle = '#b7d681'; c.beginPath(); c.roundRect(x - 19, y - 16, 38, 12, 4); c.fill();
    c.fillStyle = '#233b3a'; c.beginPath(); c.roundRect(x - 22, y - 6, 44, 8, 4); c.fill();
    c.strokeStyle = '#d7f4a4'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 23, y - 26); c.stroke();
  }
  function draw(card) {
    if (!backdropReady) makeBackdrop();
    const c = card.ctx, w = card.weapon, id = w.id, secondary = $('flightStage').value === 'secondary';
    c.clearRect(0, 0, 600, 240); c.drawImage(backdrop, 0, 0); fx.time = time;
    c.font = 'bold 11px Lato,Arial'; c.fillStyle = '#c7dbd9';
    c.fillText(secondary ? 'SECONDARY STAGE' : 'IN FLIGHT', 19, 25);
    c.textAlign = 'right'; c.fillStyle = '#b9d796'; c.fillText(`${$('flightScale').value}× PREVIEW`, 581, 25); c.textAlign = 'left';
    if (w.behavior === 'laser') {
      tank(c, 80, 191);
      fx.drawEffect(c, { kind: 'beam', id, behavior: 'laser', x: 102, y: 164, ex: 500, ey: 100, age: held ? .12 : time % .6, life: .65 });
    } else if (id === 'jump_jets') {
      const p = sample(time % 2.4); fx.flight.jets(c, { x: p.x, y: p.y + 12 }, time); tank(c, p.x, p.y + 12);
    } else if (secondary && ['beehive', 'pin_cushion'].includes(id)) {
      const bees = id === 'beehive', n = bees ? 9 : 12;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + (bees ? Math.sin(time * 2) * .4 : 0);
        child(c, w, 315 + Math.cos(a) * 90, 109 + Math.sin(a) * 54, Math.cos(a) * 150, Math.sin(a) * 110);
      }
    } else if (secondary && ['hail_storm', 'meteor_shower'].includes(id)) {
      const hail = id === 'hail_storm', n = hail ? 18 : 7;
      for (let i = 0; i < n; i++) child(c, w, 80 + (i % 9) * 51 + (hail ? 0 : i * 10), 65 + (i * 31 + time * 45) % 100, -65, hail ? 230 : 180);
    } else if (secondary && w.behavior === 'roller') {
      child(c, w, 100 + (time % 2.4) / 2.4 * 400, 181, 110, 0, true);
    } else if (secondary && ['tunnel', 'drill'].includes(w.behavior)) {
      const p = projectile(w); p.y = w.behavior === 'drill' ? 196 : 207; p.vx = w.behavior === 'drill' ? 0 : 120; p.vy = w.behavior === 'drill' ? 130 : 0; p.trail = []; drawShot(c, p);
      fx.flight.burrow(c, { x: p.x, y: 192, id, age: (time % .4), life: .42 }, 192);
    } else if (secondary && id === 'volcano') {
      for (let i = 0; i < 15; i++) { const a = -Math.PI + .2 + i * .195; child(c, w, 300 + Math.cos(a) * 120, 178 + Math.sin(a) * 90, Math.cos(a) * 160, Math.sin(a) * 190); }
    } else if (secondary && id === 'napalm') {
      for (let i = 0; i < 8; i++) fx.drawEffect(c, { kind: 'flame', id, x: 180 + i * 33, y: 191, radius: 20, age: (time + i * .1) % 1.3, life: 1.6 });
    } else if (secondary && ['lightning_strike', 'space_laser'].includes(id)) {
      fx.drawEffect(c, { kind: id === 'space_laser' ? 'beam' : 'lightning', id, behavior: w.behavior, x: 340, y: 0, ex: 340, ey: 192, age: .15, life: .65 });
    } else if (secondary && id === 'magic_wall') {
      for (let row = 0; row < 7; row++) for (let col = 0; col < 3; col++) {
        c.fillStyle = (row + col) % 2 ? '#7d959e' : '#627c88'; c.fillRect(279 + col * 15 + row % 2, 175 - row * 19, 14, 18);
        c.strokeStyle = '#91edcf'; c.strokeRect(279 + col * 15 + row % 2, 175 - row * 19, 14, 18);
      }
    } else if (id === '3_shot' || id === '5_shot') {
      const n = id === '3_shot' ? 3 : 5;
      for (let i = 0; i < n; i++) drawShot(c, projectile(w, (i - (n - 1) / 2) * 22));
    } else drawShot(c, projectile(w));
  }
  function renderVisible() { cards.filter(c => c.shown && c.visible).forEach(draw); }
  function filter() {
    const q = $('flightSearch').value.trim().toLowerCase(), family = $('flightFamily').value;
    let count = 0;
    for (const card of cards) {
      card.shown = (family === 'all' || (family === 'painted' ? !!PAINTED_SPRITES.weapons[card.weapon.id] : card.weapon.category === family)) &&
        `${card.weapon.name} ${ProjectileArt.catalog[card.weapon.id].label}`.toLowerCase().includes(q);
      card.section.hidden = !card.shown; if (card.shown) count++;
    }
    $('flightCount').textContent = `${count} / 36 WEAPONS`; $('flightEmpty').hidden = count !== 0; renderVisible();
  }
  $('holdFlight').onclick = () => { held = !held; if (held) time = 1.2; $('holdFlight').textContent = held ? 'Play flights' : 'Hold flight'; renderVisible(); };
  $('flightSearch').oninput = filter; $('flightFamily').onchange = filter;
  $('flightStage').onchange = renderVisible; $('flightScale').onchange = renderVisible;
  $('flightArtMode').onchange = () => { fx.flight.paintedEnabled = $('flightArtMode').value === 'painted'; renderVisible(); };
  if (new URLSearchParams(location.search).get('art') === 'painted') $('flightFamily').value = 'painted';
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .05); previous = now;
    if (!held && !document.hidden) { time += dt; renderVisible(); }
    requestAnimationFrame(frame);
  }
  makeBackdrop(); filter(); requestAnimationFrame(frame);
})();
