const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../game-core.js');
require('../weapons.js');
const weapons = globalThis.POCKET_WEAPONS;
function finishShot(battle) {
  const initial = battle.shots;
  for (let i = 0; i < 5000 && battle.shots === initial; i++) battle.update(C.STEP);
  assert.equal(battle.shots, initial + 1, `${battle.weapon.name} must resolve its turn`);
  assert.ok(['aim', 'over'].includes(battle.phase));
}

test('every shipped weapon icon and description exists', () => {
  assert.equal(weapons.length, 36);
  assert.equal(new Set(weapons.map(w => w.id)).size, 36);
  for (const w of weapons) {
    assert.ok(w.description, w.name);
    assert.ok(fs.existsSync(path.join(__dirname, '../assets/icons', w.icon + '.png')), w.icon);
  }
});

test('terrain generation is repeatable, craters remove material, dirt adds it', () => {
  const a = new C.Terrain(42), b = new C.Terrain(42);
  assert.deepEqual(a.cells, b.cells);
  const x = 600, y = a.ground(x), before = a.cells.reduce((s, v) => s + v, 0);
  a.circle(x, y + 10, 60); const after = a.cells.reduce((s, v) => s + v, 0);
  assert.ok(after < before - 500);
  a.settle(); assert.ok(a.ground(x) > y);
  a.circle(x, a.ground(x) - 20, 60, true);
  assert.ok(a.ground(x) < y);
  for (const type of ['valley', 'cliff', 'flat']) {
    const terrain = new C.Terrain(44, type);
    assert.ok([...terrain.surface].every(y => y > 0 && y < C.H));
  }
});

test('aim solver accounts for opposing wind and terrain', () => {
  for (const wind of [-9, 0, 9]) {
    const battle = new C.Battle(weapons, { seed: 42, terrain: 'flat', wind: false });
    const [tank, target] = battle.tanks;
    const aim = C.solveAim(battle.terrain, tank, target, wind, 0);
    const hit = C.trace(battle.terrain, tank, aim.angle, aim.power, wind);
    assert.ok(Math.abs(hit.x - target.x) < 25, `Missed with wind ${wind}: ${hit.x}`);
  }
});

test('enemy hits award points, self hits deduct points, tanks persist', () => {
  const b = new C.Battle(weapons, { seed: 1 });
  const [a, target] = b.tanks;
  b.explode(target.x, target.y - 11, 35, 60, 0, '#fff', false);
  assert.equal(a.score, 60); assert.equal(target.score, 0);
  b.explode(a.x, a.y - 11, 35, 60, 0, '#fff', false);
  assert.equal(a.score, 0); assert.equal(b.tanks.length, 2);
});

test('all 36 weapons resolve, including cascades, homing, dirt and movement', () => {
  for (const weapon of weapons) {
    const b = new C.Battle(weapons, { mode: 'practice', terrain: 'flat', wind: false, seed: 123 });
    assert.ok(b.select(weapon.id));
    b.tank.power = 65; assert.ok(b.fire()); assert.equal(b.fire(), false);
    finishShot(b); assert.equal(b.active, 0);
    assert.ok(b.tanks.every(t => Number.isFinite(t.x) && Number.isFinite(t.y)));
  }
});

test('local match consumes each inventory and ends after ten volleys', () => {
  const b = new C.Battle(weapons, { mode: 'local', rounds: 10, seed: 99, terrain: 'flat', wind: false });
  for (let shot = 0; shot < 20; shot++) {
    assert.equal(b.active, shot % 2);
    assert.ok(b.select(b.tank.inventory[0]));
    const remaining = b.tank.inventory.length;
    assert.ok(b.fire()); assert.equal(b.tank.inventory.length, remaining - 1);
    finishShot(b);
  }
  assert.equal(b.phase, 'over'); assert.equal(b.shots, 20);
  assert.equal(b.tanks[0].inventory.length, 0); assert.equal(b.tanks[1].inventory.length, 0);
  assert.equal(b.fire(), false);
});

test('limited movement, spent weapons and snapshots preserve game rules', () => {
  const b = new C.Battle(weapons, { rounds: 5, seed: 3, wind: false });
  for (let i = 0; i < 4; i++) assert.ok(b.move(1));
  assert.equal(b.move(1), false); assert.equal(b.tank.moves, 0);
  const used = b.tank.selected; assert.ok(b.fire()); finishShot(b);
  const data = JSON.parse(JSON.stringify(b.snapshot()));
  const restored = C.Battle.restore(weapons, data);
  assert.equal(restored.active, b.active); assert.equal(restored.shots, b.shots);
  assert.deepEqual(restored.tanks.map(t => t.inventory), b.tanks.map(t => t.inventory));
  assert.equal(restored.tanks[0].inventory.includes(used), false);
  assert.deepEqual(restored.terrain.surface, b.terrain.surface);
  assert.throws(() => C.Battle.restore(weapons, { ...data, version: 90 }));
  assert.throws(() => C.Battle.restore(weapons, { ...data, heights: [] }));
});

test('dirt buries tanks and a close heatseeker can hit its target', () => {
  const b = new C.Battle(weapons, { mode: 'practice', terrain: 'flat', wind: false, seed: 42 });
  const target = b.tanks[1], y = target.y;
  b.terrain.circle(target.x, target.y - 30, 60, true);
  for (let i = 0; i < 60; i++) b.update();
  assert.equal(target.y, y, 'Added soil must not lift the tank');
  assert.ok(b.terrain.ground(target.x) < y - 40);
  const heat = new C.Battle(weapons, { mode: 'practice', terrain: 'flat', wind: false, seed: 42 });
  heat.select('heatseeker');
  Object.assign(heat.tank, C.solveAim(heat.terrain, heat.tank, heat.tanks[1], 0, 0));
  heat.fire(); finishShot(heat);
  assert.ok(heat.tanks[0].score > 0, 'The approaching shell should steer into the target');
});
