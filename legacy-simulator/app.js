/**
 * POCKET TANKS HD — 29-WEAPON PHYSICS SIMULATOR & TESTING LAB
 * Native-accurate simulation learned directly from libengine.so and decrypted .wep scripts:
 * - Dynamic expanding explosions with ERASE_DIRECTION & DIRTFALL cascading soil
 * - THROW_TANK impulse physics (tanks flung into the air by blast shockwaves)
 * - Authentic BULLET_TRAIL with segmented decaying trail points
 * - Real trigger routines (Bungee Punch elastic tether, Danger Rope lasso, Mud Pie sand automata,
 *   Jackhammer multi-tier drilling, Beehive vector homing, Space Laser orbital ion strike)
 */

// ============================================================================
// 1. DATASET: 29 PLAYABLE WEAPONS (LEARNED FROM GAME CODE)
// ============================================================================

const WEAPONS = [
  {
    id: "single_shot",
    name: "Single Shot",
    pack: "Original",
    category: "Ballistic",
    icon: "🎯",
    cost: 10,
    trigger: "SingleShotTrigger",
    archetype: "Ballistic",
    desc: "The classic baseline weapon. Standard parabolic arc with medium explosive crater and balanced damage.",
    physics: "Radius = 24px, Damage = 35, Trail = 11, Dirtfall = True, Throw Tank = 4."
  },
  {
    id: "big_shot",
    name: "Big Shot",
    pack: "Original",
    category: "Ballistic",
    icon: "💣",
    cost: 20,
    trigger: "BigShotTrigger",
    archetype: "Ballistic",
    desc: "Heavy ballistic shell. Increased projectile mass, double blast radius, high shockwave impulse.",
    physics: "Radius = 48px, Damage = 45, Trail = 14, Dirtfall = True, Throw Tank = 9."
  },
  {
    id: "three_shot",
    name: "3 Shot",
    pack: "Original",
    category: "Cluster",
    icon: "🔺",
    cost: 30,
    trigger: "3ShotTrigger",
    archetype: "Cluster",
    desc: "Tri-projectile fan spread launched simultaneously from the barrel with ±4° angular dispersion.",
    physics: "3 Sub-projectiles: θ ± 4°, Radius = 18px each, Combined Damage = 65."
  },
  {
    id: "five_shot",
    name: "5 Shot",
    pack: "Original",
    category: "Cluster",
    icon: "🌟",
    cost: 50,
    trigger: "5ShotTrigger",
    archetype: "Cluster",
    desc: "Wide-spread 5-bullet volley blanketing the impact zone with multiple overlapping craters.",
    physics: "5 Sub-projectiles: θ ± {4°, 8°}, Radius = 16px each, Combined Damage = 90."
  },
  {
    id: "nuke",
    name: "Nuke",
    pack: "Nuke (Pack 3)",
    category: "Ballistic",
    icon: "☢️",
    cost: 100,
    trigger: "NukeTrigger",
    archetype: "Ballistic",
    desc: "Tactical nuclear shell. Produces a towering mushroom cloud, intense flash, and massive crater.",
    physics: "Radius = 75px, Damage = 85, Extreme Screen Shake, Throw Tank = 16."
  },
  {
    id: "mega_nuke",
    name: "Mega Nuke",
    pack: "Nuke (Pack 3)",
    category: "Ballistic",
    icon: "☣️",
    cost: 150,
    trigger: "MegaNukeTrigger",
    archetype: "Ballistic",
    desc: "Devastating high-yield warhead. Vaporizes massive chunks of terrain and obliterates target tanks.",
    physics: "Radius = 110px, Damage = 120, Flash Expansion, Throw Tank = 22."
  },
  {
    id: "jump_jets",
    name: "Jump Jets",
    pack: "Deluxe (Pack 2)",
    category: "Mobility",
    icon: "🚀",
    cost: 10,
    trigger: "JumpJetsTrigger",
    archetype: "Mobility",
    desc: "Applies kinematic thrust directly to your tank chassis. Escape deep pits and fly across hills.",
    physics: "Tank Impulse: v_tank = (Power / 4) · (cos θ, -sin θ)."
  },
  {
    id: "mud_pie",
    name: "Mud Pie",
    pack: "Deluxe (Pack 2)",
    category: "Dirt",
    icon: "🥧",
    cost: 10,
    trigger: "MudPieTrigger",
    archetype: "Dirt",
    desc: "Ejects a high-volume cluster of dense dirt granules that pile up into an impenetrable mountain.",
    physics: "Additive Granular Automata: +200 dirt granules, Dirtfall Cascade."
  },
  {
    id: "pin_cushion",
    name: "Pin Cushion",
    pack: "Deluxe (Pack 2)",
    category: "Cluster",
    icon: "🪡",
    cost: 100,
    trigger: "PinCushionTrigger",
    archetype: "Cluster",
    desc: "Airburst shell that fractures into 14 omnidirectional high-velocity spark zappers in mid-air.",
    physics: "Timed Airburst at Apex: 14 radial needles, v_rel = 6.0 px/frame."
  },
  {
    id: "beehive",
    name: "Beehive",
    pack: "Ambush (Pack 4)",
    category: "Homing",
    icon: "🐝",
    cost: 100,
    trigger: "BeehiveTrigger",
    archetype: "Homing",
    desc: "Deploys a suspended buzzing beehive. Once close to an enemy tank, a swarm of angry bees homes in.",
    physics: "HOMING_DISTANCE: 1000, HOMING_MAGNITUDE: 7, Proximity Swarm."
  },
  {
    id: "blast_off",
    name: "Blast Off",
    pack: "Ambush (Pack 4)",
    category: "Mobility",
    icon: "🔥",
    cost: 10,
    trigger: "BlastOffTrigger",
    archetype: "Mobility",
    desc: "Heavy thruster leap. Propels your tank with twice the velocity of Jump Jets and leaves a launch crater.",
    physics: "v_tank = (Power / 2.5) · (cos θ, -sin θ), Launch Crater = 22px."
  },
  {
    id: "bouncy_wall",
    name: "Bouncy Wall",
    pack: "Ambush (Pack 4)",
    category: "Exotic",
    icon: "🛡️",
    cost: 30,
    trigger: "BouncyWallTrigger",
    archetype: "Exotic",
    desc: "Erects a glowing elastic vertical barrier on the map that ricochets subsequent kinetic artillery shots.",
    physics: "Elastic Entity: inverts normal velocity (e = 0.95), Height = 80px."
  },
  {
    id: "comet",
    name: "Comet",
    pack: "Meteor (Pack 6)",
    category: "Ballistic",
    icon: "☄️",
    cost: 50,
    trigger: "CometTrigger",
    archetype: "Ballistic",
    desc: "Blazing celestial projectile with an elongated plasma tail and amplified kinetic impact velocity.",
    physics: "Gravity = 1.35x, Dense Plasma Trail, Damage = 55, Radius = 30px."
  },
  {
    id: "meteor_shower",
    name: "Meteor Shower",
    pack: "Meteor (Pack 6)",
    category: "Cluster",
    icon: "🌌",
    cost: 80,
    trigger: "MeteorShowerTrigger",
    archetype: "Cluster",
    desc: "High-altitude targeting beacon that calls down a barrage of 6 meteors raining from the stratosphere.",
    physics: "6 Angled Meteors spaced across sky over 1.2s, Radius = 22px each."
  },
  {
    id: "jackhammer",
    name: "Jackhammer",
    pack: "Original",
    category: "Digger",
    icon: "⛏️",
    cost: 40,
    trigger: "JackhammerTrigger",
    archetype: "Digger",
    desc: "Subterranean drill. Pierces solid rock vertically to dig an ultra-deep narrow pit under the target.",
    physics: "Multi-tier Downward Erase: Depth = 140px, Width = 14px, Damage = 40."
  },
  {
    id: "ground_hog",
    name: "Ground Hog",
    pack: "Original",
    category: "Digger",
    icon: "🦔",
    cost: 40,
    trigger: "GroundHogTrigger",
    archetype: "Digger",
    desc: "Burrowing mole bomb. Enters the soil and tunnels horizontally beneath hills before detonating.",
    physics: "Subsurface Raymarch: moves through dirt at 3.0 px/frame, Radius = 35px."
  },
  {
    id: "fireworks",
    name: "Fireworks",
    pack: "Fireworks (Pack 11)",
    category: "Cluster",
    icon: "🎆",
    cost: 45,
    trigger: "FireworksTrigger",
    archetype: "Cluster",
    desc: "Multi-tier celebratory rocket. Detonates in mid-air into 5 secondary shells which each explode in sparks.",
    physics: "Two-stage Burst: Primary split at Apex ➔ 5 secondary spark blasts."
  },
  {
    id: "golden_bullet",
    name: "Golden Bullet",
    pack: "Gold (Pack 13)",
    category: "Ballistic",
    icon: "🪙",
    cost: 100,
    trigger: "GoldenBulletTrigger",
    archetype: "Ballistic",
    desc: "Hyper-velocity precision bullet. Ricochets off ground surfaces up to 4 times with zero energy loss.",
    physics: "BOUNCE_COUNT: 4, Kinetic Velocity = 1.4x, Damage = 60."
  },
  {
    id: "railgun",
    name: "Railgun",
    pack: "Magic (Pack 17)",
    category: "Beam",
    icon: "⚡",
    cost: 60,
    trigger: "RailgunTrigger",
    archetype: "Beam",
    desc: "Instant magnetic hitscan beam. Punches straight through entire mountains and strikes targets instantly.",
    physics: "Instant Raycast: pierces terrain, Width = 6px, Damage = 55."
  },
  {
    id: "acid_bombs",
    name: "Acid Bombs",
    pack: "Acid (Pack 18)",
    category: "Elemental",
    icon: "🧪",
    cost: 50,
    trigger: "AcidBombsTrigger",
    archetype: "Elemental",
    desc: "Splits into 3 corrosive chemical puddles that bubble and steadily dissolve the ground downward.",
    physics: "Continuous Corrosive Dissolution: 1.5px/frame over 4 seconds, DoT = 4/tick."
  },
  {
    id: "space_laser",
    name: "Space Laser",
    pack: "Laser (Pack 20)",
    category: "Beam",
    icon: "🛰️",
    cost: 100,
    trigger: "SpaceLaserTrigger",
    archetype: "Beam",
    desc: "Orbital satellite strike. Fires a targeting flare, then a devastating vertical beam fires from space.",
    physics: "Orbital Ion Beam: vertical slice x = x_flare, Width = 80px, Damage = 75."
  },
  {
    id: "bonfire",
    name: "Bonfire",
    pack: "Fire (Pack 24)",
    category: "Elemental",
    icon: "🔥",
    cost: 30,
    trigger: "BonfireTrigger",
    archetype: "Elemental",
    desc: "Ignites a persistent blaze on the terrain. Any tank trapped in the flames takes continuous burn damage.",
    physics: "Thermal Hazard: Radius = 32px, 8 damage ticks/sec for 3.5 seconds."
  },
  {
    id: "plasma_orb",
    name: "Plasma Orb",
    pack: "Plasma (Pack 26)",
    category: "Beam",
    icon: "🔮",
    cost: 40,
    trigger: "PlasmaOrbTrigger",
    archetype: "Beam",
    desc: "Slow-drifting luminous plasma sphere that discharges radial shockwaves every 0.3 seconds in flight.",
    physics: "Drift Speed = 0.5x, Periodic Shockwave Pulse Frequency = 3.3 Hz."
  },
  {
    id: "tachyon_beam",
    name: "Tachyon Beam",
    pack: "Energy (Pack 27)",
    category: "Beam",
    icon: "🔦",
    cost: 75,
    trigger: "TachyonBeamTrigger",
    archetype: "Beam",
    desc: "Superluminal particle beam sweeping through terrain and disintegrating armor on contact.",
    physics: "Continuous Energy Stream: Width = 10px, Disintegration Vapor, Damage = 60."
  },
  {
    id: "gravity_well",
    name: "Gravity Well",
    pack: "Gravity (Pack 10)",
    category: "Exotic",
    icon: "🌀",
    cost: 60,
    trigger: "GravityWellTrigger",
    archetype: "Exotic",
    desc: "Spawns a swirling black hole singularity that actively pulls tanks and subsequent artillery toward its core.",
    physics: "Inverse-Square Gravitational Field: a = G·M / (r² + 100), Pull Radius = 160px."
  },
  {
    id: "quantum_cube",
    name: "Quantum Cube",
    pack: "Quantum (Pack 30)",
    category: "Exotic",
    icon: "🧊",
    cost: 50,
    trigger: "QuantumCubeTrigger",
    archetype: "Exotic",
    desc: "Strange geometric anomaly that distorts local spacetime, launching the enemy tank upward into the air.",
    physics: "Spacetime Warp Impulse: Inverts target velocity, levitates tank 80px."
  },
  {
    id: "wrecker",
    name: "Wrecker",
    pack: "Neutron (Pack 33)",
    category: "Ballistic",
    icon: "🎳",
    cost: 40,
    trigger: "WreckerTrigger",
    archetype: "Ballistic",
    desc: "Heavy solid iron wrecking ball that rolls smoothly down hills, crushing terrain obstacles in its path.",
    physics: "DRAW_ANIM: wreckerball.png, Contour Rolling Physics, Damage = 60."
  },
  {
    id: "bungee_punch",
    name: "Bungee Punch",
    pack: "Twenty (Pack 34)",
    category: "Mobility",
    icon: "🥊",
    cost: 30,
    trigger: "BungeePunchPointBlankTrigger",
    archetype: "Mobility",
    desc: "Massive spring-loaded boxing glove on an elastic tether that snaps back to your tank if it misses.",
    physics: "DRAW_ANIM: bungeepunch.png, Elastic Tether, Throw Tank = 12, Damage = 65."
  },
  {
    id: "danger_rope",
    name: "Danger Rope",
    pack: "Danger (Pack 41)",
    category: "Mobility",
    icon: "🪢",
    cost: 10,
    trigger: "DangerRopeTrigger",
    archetype: "Mobility",
    desc: "High-voltage electrified grappling lasso that snares the target tank and violently yanks it toward you.",
    physics: "Tension Physics: Snare connection drags enemy across terrain, Damage = 40."
  }
];

// ============================================================================
// 2. SYNTHESIZED PROCEDURAL WEB AUDIO ENGINE
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot(type = "ballistic") {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === "laser" || type === "beam") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.16);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } else if (type === "jet") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.linearRampToValueAtTime(360, t + 0.35);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } else {
      // Classic cannon boom (sine sub-bass thump + noise crackle)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  playExplosion(intensity = 1.0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const k = Math.min(3.2, Math.max(0.5, intensity));
    const dur = 0.22 + 0.28 * k;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(90 + 40 * k, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + dur);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + dur);
    sub.connect(subGain).connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + dur);

    const punch = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punch.type = "triangle";
    punch.frequency.setValueAtTime(180 + 50 * k, t);
    punch.frequency.exponentialRampToValueAtTime(45, t + dur * 0.45);
    punchGain.gain.setValueAtTime(0.28, t);
    punchGain.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.45);
    punch.connect(punchGain).connect(this.ctx.destination);
    punch.start(t);
    punch.stop(t + dur * 0.5);

    const crackLen = Math.floor(this.ctx.sampleRate * Math.min(0.18, 0.07 + 0.03 * k));
    const crackBuf = this.ctx.createBuffer(1, crackLen, this.ctx.sampleRate);
    const crackData = crackBuf.getChannelData(0);
    for (let i = 0; i < crackLen; i++) {
      const env = 1 - i / crackLen;
      crackData[i] = (Math.random() * 2 - 1) * env * env;
    }
    const crack = this.ctx.createBufferSource();
    crack.buffer = crackBuf;
    const hip = this.ctx.createBiquadFilter();
    hip.type = "highpass";
    hip.frequency.value = 900;
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.38 * Math.min(1.6, k), t);
    crackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    crack.connect(hip).connect(crackGain).connect(this.ctx.destination);
    crack.start(t);

    const rumbleLen = Math.floor(this.ctx.sampleRate * dur);
    const rumbleBuf = this.ctx.createBuffer(1, rumbleLen, this.ctx.sampleRate);
    const rumbleData = rumbleBuf.getChannelData(0);
    for (let i = 0; i < rumbleLen; i++) rumbleData[i] = Math.random() * 2 - 1;
    const rumble = this.ctx.createBufferSource();
    rumble.buffer = rumbleBuf;
    const low = this.ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(700 + 280 * k, t);
    low.frequency.exponentialRampToValueAtTime(70, t + dur);
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.42 * Math.min(1.7, k), t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, t + dur);
    rumble.connect(low).connect(rumbleGain).connect(this.ctx.destination);
    rumble.start(t);
  }

  playHit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(1040, t + 0.12);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

const audio = new SoundEngine();

// ============================================================================
// COLOR UTILITIES
// ============================================================================

function hexToRgb(hex) {
  const bigint = parseInt(hex.replace('#',''), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function interpolateColor(c1, c2, t) {
  return `rgb(${Math.floor(c1[0] + (c2[0] - c1[0]) * t)}, ${Math.floor(c1[1] + (c2[1] - c1[1]) * t)}, ${Math.floor(c1[2] + (c2[2] - c1[2]) * t)})`;
}

const DIRT_PALETTE = ["#4ade80", "#a3e635", "#ca8a04", "#a16207", "#854d0e", "#713f12", "#451a03"];
const DEBRIS_PALETTE = ["#ca8a04", "#a16207", "#854d0e", "#713f12", "#451a03", "#1c0d02"];

// ============================================================================
// 3. DESTRUCTIBLE & ADDITIVE 2D TERRAIN ENGINE (WITH DIRTFALL & COLOR BANDS)
// ============================================================================

class TerrainEngine {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.heights = new Float32Array(width);
    this.fallingDirt = []; // Granular sand particles
    this.activeCraters = []; // Dynamic expanding crater animations
    this.generate();
  }

  generate() {
    const f1 = 0.0035 + Math.random() * 0.0015;
    const f2 = 0.0085 + Math.random() * 0.0035;
    const f3 = 0.0190 + Math.random() * 0.0050;
    const baseH = this.height * 0.62;

    for (let x = 0; x < this.width; x++) {
      const y = baseH
        + Math.sin(x * f1) * 75
        + Math.sin(x * f2 + 1.4) * 38
        + Math.cos(x * f3 + 2.8) * 16;
      this.heights[x] = Math.max(120, Math.min(this.height - 40, y));
    }
    this.fallingDirt = [];
    this.activeCraters = [];
  }

  getHeight(x) {
    const ix = Math.floor(Math.max(0, Math.min(this.width - 1, x)));
    return this.heights[ix];
  }

  // Dynamic expanding explosion with ERASE_DIRECTION & DIRTFALL
  triggerCrater(cx, cy, targetRadius, dirtfall = true) {
    this.activeCraters.push({
      cx, cy,
      currentRadius: 4,
      maxRadius: targetRadius,
      dirtfall,
      life: 0
    });
  }

  updateCraters() {
    for (let i = this.activeCraters.length - 1; i >= 0; i--) {
      const c = this.activeCraters[i];
      c.currentRadius += (c.maxRadius - c.currentRadius) * 0.35;
      c.life++;

      // Carve into terrain
      const r = c.currentRadius;
      const x0 = Math.floor(Math.max(0, c.cx - r));
      const x1 = Math.floor(Math.min(this.width - 1, c.cx + r));

      for (let x = x0; x <= x1; x++) {
        const dx = x - c.cx;
        const dyMax = Math.sqrt(Math.max(0, r * r - dx * dx));
        const bottom = c.cy + dyMax;
        if (bottom > this.heights[x]) {
          this.heights[x] = Math.min(this.height - 10, bottom);
        }
      }

      if (c.currentRadius >= c.maxRadius - 1.0) {
        // Trigger cascading dirtfall from rim edges
        if (c.dirtfall) {
          this.addDirt(c.cx - c.maxRadius * 0.7, c.cy - 10, 10, 16, DEBRIS_PALETTE);
          this.addDirt(c.cx + c.maxRadius * 0.7, c.cy - 10, 10, 16, DEBRIS_PALETTE);
        }
        this.activeCraters.splice(i, 1);
      }
    }
  }

  drillVertical(cx, cy, depth, width = 14) {
    const x0 = Math.floor(Math.max(0, cx - width / 2));
    const x1 = Math.floor(Math.min(this.width - 1, cx + width / 2));
    for (let x = x0; x <= x1; x++) {
      this.heights[x] = Math.min(this.height - 10, this.heights[x] + depth);
    }
  }

  addDirt(cx, cy, count = 60, spread = 35, palette = DIRT_PALETTE) {
    for (let i = 0; i < count; i++) {
      this.fallingDirt.push({
        x: cx + (Math.random() - 0.5) * spread,
        y: cy + (Math.random() - 0.5) * 12 - 20,
        vx: (Math.random() - 0.5) * 2.8,
        vy: -Math.random() * 3.5 - 1.0,
        settled: false,
        w: 2 + Math.random() * 3.4,
        h: 1.8 + Math.random() * 2.6,
        rot: Math.random() * Math.PI,
        rv: (Math.random() - 0.5) * 0.22,
        color: palette[(Math.random() * palette.length) | 0]
      });
    }
  }

  updateDirt() {
    this.updateCraters();

    for (let i = this.fallingDirt.length - 1; i >= 0; i--) {
      const d = this.fallingDirt[i];
      if (d.settled) continue;

      d.vy += 0.28; // gravity
      d.x += d.vx;
      d.y += d.vy;
      if (d.rot != null) d.rot += d.rv || 0;

      const ix = Math.floor(d.x);
      if (ix >= 0 && ix < this.width) {
        if (d.y >= this.heights[ix]) {
          // Deposit grain into heightmap
          this.heights[ix] = Math.max(70, this.heights[ix] - 1.25);
          // Angle of repose smoothing
          if (ix > 0 && this.heights[ix] < this.heights[ix - 1] - 3) {
            this.heights[ix - 1] = Math.max(70, this.heights[ix - 1] - 0.65);
          }
          if (ix < this.width - 1 && this.heights[ix] < this.heights[ix + 1] - 3) {
            this.heights[ix + 1] = Math.max(70, this.heights[ix + 1] - 0.65);
          }
          this.fallingDirt.splice(i, 1);
        }
      } else {
        this.fallingDirt.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();

    // Layered authentic terrain gradient (Green Grass -> Dark Brown Earth -> Deep Bedrock)
    const grad = ctx.createLinearGradient(0, 140, 0, this.height);
    grad.addColorStop(0, "#16a34a");
    grad.addColorStop(0.08, "#15803d");
    grad.addColorStop(0.28, "#854d0e");
    grad.addColorStop(0.65, "#451a03");
    grad.addColorStop(1, "#1c0d02");

    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.heights[0]);
    for (let x = 1; x < this.width; x++) {
      ctx.lineTo(x, this.heights[x]);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Vibrant Grass Surface Highlight
    ctx.beginPath();
    ctx.moveTo(0, this.heights[0]);
    for (let x = 1; x < this.width; x++) {
      ctx.lineTo(x, this.heights[x]);
    }
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Render Cascading Dirt Granules
    for (const d of this.fallingDirt) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot || 0);
      ctx.fillStyle = d.color || "#ca8a04";
      const w = d.w || 3.5;
      const h = d.h || 3.5;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    ctx.restore();
  }
}

// ============================================================================
// 4. AUTHENTIC TANK ENTITY PHYSICS (WITH RECOIL & THROW IMPULSES)
// ============================================================================

class Tank {
  constructor(x, color, isPlayer = true) {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.isPlayer = isPlayer;
    this.width = 34;
    this.height = 18;
    this.hp = 100;
    this.maxHp = 100;
    this.inAir = false;
    this.barrelLength = 24;
    this.recoil = 0;
  }

  update(terrain) {
    const groundY = terrain.getHeight(this.x);

    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - 0.5);
    }

    // Kinematic airborne flight / knockback impulse
    if (this.inAir || this.y < groundY - 2) {
      this.vy += 0.36; // gravity
      this.x += this.vx;
      this.y += this.vy;
      this.inAir = true;

      // Ground collision
      if (this.y >= groundY - 2) {
        this.y = groundY - 2;
        this.vy = 0;
        this.vx *= 0.65;
        if (Math.abs(this.vx) < 0.25) {
          this.vx = 0;
          this.inAir = false;
        }
      }
    } else {
      this.y = groundY - 2;
      this.vy = 0;
      this.vx = 0;
    }

    this.x = Math.max(25, Math.min(terrain.width - 25, this.x));
  }

  applyImpulse(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.inAir = true;
  }

  triggerRecoil() {
    this.recoil = 6.0;
  }

  render(ctx, angleDeg = 45) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Tread Base (Tread Plates + Wheels)
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-this.width / 2, -4, this.width, 8, 3);
    ctx.fill();

    // Wheels
    ctx.fillStyle = "#475569";
    for (let i = -12; i <= 12; i += 8) {
      ctx.beginPath();
      ctx.arc(i, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chassis Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-this.width / 2 + 3, -14, this.width - 6, 10, 3);
    ctx.fill();

    // Turret Dome
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(0, -12, 7, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, -12, 5, Math.PI, 0);
    ctx.fill();

    // Recoil-compensated Barrel
    const rad = (angleDeg * Math.PI) / 180;
    const len = this.barrelLength - this.recoil;
    const bx = Math.cos(rad) * len;
    const by = -Math.sin(rad) * len;

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 5.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(bx, -12 + by);
    ctx.stroke();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(bx, -12 + by);
    ctx.stroke();

    // Muzzle Cap
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(bx - 2, -14 + by, 4, 4);

    // HP Bar
    const hpWidth = 40;
    const hpHeight = 5;
    const hpPct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(-hpWidth / 2, -28, hpWidth, hpHeight);
    ctx.fillStyle = hpPct > 0.4 ? "#22c55e" : "#ef4444";
    ctx.fillRect(-hpWidth / 2, -28, hpWidth * hpPct, hpHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-hpWidth / 2, -28, hpWidth, hpHeight);

    ctx.restore();
  }

  getBarrelMuzzle(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: this.x + Math.cos(rad) * (this.barrelLength + 2),
      y: this.y - 12 - Math.sin(rad) * (this.barrelLength + 2)
    };
  }
}

// ============================================================================
// 5. SPRITE VFX — textured particles, fireball frames, dirt debris, flash
// ============================================================================

const FX = {
  ready: false,
  fireHot: null,
  fireMid: null,
  fireCool: null,
  fireBlue: null,
  smoke: null,
  spark: null,
  flash: null,
  ring: null,
  fireball: []
};

function makeRadialBlob(size, stops) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [t, col] of stops) g.addColorStop(t, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function tintImage(img, r, g, b) {
  const c = document.createElement("canvas");
  c.width = img.width || img.naturalWidth || 64;
  c.height = img.height || img.naturalHeight || 64;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = `rgb(${r},${g},${b})`;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function initFxFallback() {
  FX.fireHot = makeRadialBlob(64, [
    [0, "rgba(255,255,255,1)"],
    [0.22, "rgba(255,240,180,0.95)"],
    [0.55, "rgba(255,170,40,0.55)"],
    [1, "rgba(255,80,0,0)"]
  ]);
  FX.fireMid = makeRadialBlob(64, [
    [0, "rgba(255,230,120,1)"],
    [0.35, "rgba(255,140,20,0.85)"],
    [1, "rgba(180,20,0,0)"]
  ]);
  FX.fireCool = makeRadialBlob(64, [
    [0, "rgba(255,120,30,0.95)"],
    [0.45, "rgba(180,30,8,0.55)"],
    [1, "rgba(40,0,0,0)"]
  ]);
  FX.fireBlue = makeRadialBlob(64, [
    [0, "rgba(255,255,255,1)"],
    [0.3, "rgba(140,220,255,0.9)"],
    [1, "rgba(30,80,220,0)"]
  ]);
  FX.smoke = makeRadialBlob(96, [
    [0, "rgba(90,86,80,0.55)"],
    [0.45, "rgba(50,48,46,0.28)"],
    [1, "rgba(20,20,20,0)"]
  ]);
  FX.spark = makeRadialBlob(32, [
    [0, "rgba(255,255,230,1)"],
    [0.25, "rgba(255,210,80,0.9)"],
    [1, "rgba(255,80,0,0)"]
  ]);
  FX.flash = makeRadialBlob(160, [
    [0, "rgba(255,255,255,1)"],
    [0.18, "rgba(255,230,160,0.7)"],
    [0.55, "rgba(255,160,40,0.2)"],
    [1, "rgba(255,80,0,0)"]
  ]);
  FX.ring = makeRadialBlob(160, [
    [0, "rgba(255,240,200,0)"],
    [0.72, "rgba(255,230,180,0)"],
    [0.82, "rgba(255,236,200,0.9)"],
    [0.92, "rgba(255,200,120,0.25)"],
    [1, "rgba(255,180,80,0)"]
  ]);
  FX.fireball = new Array(12).fill(FX.fireHot);
  FX.ready = true;
}

function loadFxImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

function loadFxPngs() {
  const names = [
    ["fireHot", "fx/fire_hot.png"],
    ["fireMid", "fx/fire_mid.png"],
    ["fireCool", "fx/fire_cool.png"],
    ["smoke", "fx/smoke.png"],
    ["spark", "fx/spark.png"],
    ["flash", "fx/flash.png"],
    ["ring", "fx/shock_ring.png"]
  ];
  const framePaths = Array.from({ length: 12 }, (_, i) =>
    `fx/fireball_${String(i).padStart(2, "0")}.png`
  );
  Promise.all([
    ...names.map(([, src]) => loadFxImage(src)),
    ...framePaths.map(loadFxImage)
  ]).then((imgs) => {
    names.forEach(([key], i) => {
      FX[key] = imgs[i];
    });
    FX.fireball = imgs.slice(names.length);
    FX.fireBlue = tintImage(FX.fireHot, 90, 190, 255);
    FX.ready = true;
  }).catch(() => {
    // Keep the synchronous canvas fallback.
  });
}

initFxFallback();
loadFxPngs();
window.FX = FX;

function pickFireSprite(colorHint) {
  if (colorHint) {
    const c = colorHint.toLowerCase();
    if (c.includes("38bd") || c.includes("0284") || c.includes("818c") || c.includes("06b6")) {
      return FX.fireBlue;
    }
  }
  const r = Math.random();
  if (r < 0.35) return FX.fireHot;
  if (r < 0.75) return FX.fireMid;
  return FX.fireCool;
}

function drawSprite(ctx, img, x, y, w, h, rot, alpha) {
  if (!img || alpha <= 0.01 || w <= 0.5 || h <= 0.5) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

class ParticleEngine {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.flashes = [];
  }

  addParticle(p) {
    const type = p.type || "fire";
    let sprite = p.sprite;
    if (!sprite) {
      if (type === "smoke") sprite = FX.smoke;
      else if (type === "spark") sprite = FX.spark;
      else if (type === "flash") sprite = FX.flash;
      else if (type === "debris") sprite = null;
      else sprite = pickFireSprite(p.startColor || p.finishColor);
    }
    this.particles.push({
      x: p.x,
      y: p.y,
      vx: p.vx || 0,
      vy: p.vy || 0,
      type,
      sprite,
      life: p.life || 50,
      maxLife: p.life || 50,
      startSize: p.startSize ?? 8,
      finishSize: p.finishSize ?? 0,
      radialAcc: p.radialAcc,
      tangentialAcc: p.tangentialAcc,
      gravity: p.gravity ?? (type === "debris" ? 0.26 : type === "spark" ? 0.14 : type === "smoke" ? -0.012 : 0),
      rot: p.rot || Math.random() * Math.PI * 2,
      rotv: p.rotv ?? (Math.random() - 0.5) * 0.18,
      stretch: p.stretch || 1,
      color: p.color || p.startColor || "#854d0e",
      dw: p.dw || 4,
      dh: p.dh || 3,
      alphaMul: p.alphaMul ?? 1
    });
  }

  addSpark(x, y, vx, vy, color = "#f97316", life = 30, size = 3) {
    this.addParticle({
      x, y, vx, vy,
      type: "spark",
      sprite: FX.spark,
      startColor: color,
      startSize: size * 3.2,
      finishSize: size * 0.4,
      life,
      stretch: 2.4,
      radialAcc: 0.97,
      rot: Math.atan2(vy, vx) + Math.PI / 2,
      rotv: 0
    });
  }

  addExplosion(cx, cy, count = 45, colorScheme = ["#facc15", "#f97316", "#ef4444", "#ffffff"], scale = 1.0) {
    const n = Math.max(8, Math.round(count));
    const hint = colorScheme[0] || "#f97316";
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.2 + Math.random() * 6.8) * Math.min(1.7, scale);
      this.addParticle({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: "fire",
        sprite: pickFireSprite(hint),
        startColor: hint,
        startSize: (10 + Math.random() * 16) * Math.min(1.5, scale),
        finishSize: 2,
        life: 18 + Math.random() * 22,
        radialAcc: 0.93
      });
    }
  }

  addShockwave(cx, cy, maxRadius) {
    this.shockwaves.push({
      cx, cy,
      radius: Math.max(14, maxRadius * 0.28),
      maxRadius,
      alpha: 0.85
    });
  }

  addFlash(cx, cy, size, intensity = 1) {
    this.flashes.push({
      cx, cy,
      size,
      life: 7,
      maxLife: 7,
      intensity
    });
  }

  spawnExplosionParticles(cx, cy, radius) {
    const fireN = Math.round(22 + radius * 0.85);
    for (let i = 0; i < fireN; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * (radius * 0.13);
      const hot = Math.random();
      this.addParticle({
        x: cx + Math.cos(angle) * Math.random() * radius * 0.18,
        y: cy + Math.sin(angle) * Math.random() * radius * 0.18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 1.1,
        type: "fire",
        sprite: hot < 0.3 ? FX.fireHot : hot < 0.7 ? FX.fireMid : FX.fireCool,
        startSize: 22 + Math.random() * 28 + radius * 0.22,
        finishSize: 6,
        life: 18 + Math.random() * 20,
        radialAcc: 0.91,
        tangentialAcc: (Math.random() - 0.5) * 0.08
      });
    }

    const sparkN = Math.round(8 + radius * 0.28);
    for (let i = 0; i < sparkN; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * (radius * 0.22);
      this.addSpark(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 1.5,
        "#ffe08a",
        16 + Math.random() * 18,
        2.5 + Math.random() * 2.2
      );
    }

    const debrisN = Math.round(5 + radius * 0.14);
    for (let i = 0; i < debrisN; i++) {
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const speed = 2.2 + Math.random() * (radius * 0.18);
      this.addParticle({
        x: cx + (Math.random() - 0.5) * radius * 0.45,
        y: cy - Math.random() * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: "debris",
        color: DEBRIS_PALETTE[(Math.random() * DEBRIS_PALETTE.length) | 0],
        dw: 2 + Math.random() * 3.2,
        dh: 1.6 + Math.random() * 2.4,
        startSize: 4,
        finishSize: 4,
        life: 38 + Math.random() * 28,
        gravity: 0.28,
        rotv: (Math.random() - 0.5) * 0.35
      });
    }

    const emberN = Math.round(6 + radius * 0.12);
    for (let i = 0; i < emberN; i++) {
      this.addParticle({
        x: cx + (Math.random() - 0.5) * radius * 0.7,
        y: cy + (Math.random() - 0.5) * radius * 0.3,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.4 - Math.random() * 1.4,
        type: "fire",
        sprite: FX.fireHot,
        startSize: 6 + Math.random() * 8,
        finishSize: 1,
        life: 34 + Math.random() * 28,
        radialAcc: 0.99,
        gravity: -0.02
      });
    }
  }

  addSmoke(cx, cy, radius) {
    const n = 1 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.4;
      this.addParticle({
        x: cx + (Math.random() - 0.5) * radius * 0.7,
        y: cy + (Math.random() - 0.5) * radius * 0.35,
        vx: Math.cos(angle) * speed,
        vy: -0.7 - Math.random() * 1.6,
        type: "smoke",
        sprite: FX.smoke,
        startSize: radius * (0.45 + Math.random() * 0.35),
        finishSize: radius * (0.95 + Math.random() * 0.5),
        life: 40 + Math.random() * 46,
        radialAcc: 0.985,
        alphaMul: 0.32,
        rotv: (Math.random() - 0.5) * 0.04
      });
    }
  }

  addMushroom(cx, cy, radius) {
    const stem = Math.round(8 + radius * 0.1);
    for (let i = 0; i < stem; i++) {
      this.addParticle({
        x: cx + (Math.random() - 0.5) * radius * 0.22,
        y: cy - i * (radius * 0.07),
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1.4 - Math.random() * 1.2,
        type: "smoke",
        sprite: FX.smoke,
        startSize: radius * (0.28 + Math.random() * 0.18),
        finishSize: radius * (0.55 + Math.random() * 0.25),
        life: 50 + Math.random() * 30,
        alphaMul: 0.28,
        gravity: -0.03
      });
    }
    const cap = Math.round(6 + radius * 0.08);
    for (let i = 0; i < cap; i++) {
      const ang = Math.random() * Math.PI * 2;
      this.addParticle({
        x: cx + Math.cos(ang) * radius * 0.25,
        y: cy - radius * (0.7 + Math.random() * 0.25),
        vx: Math.cos(ang) * (0.4 + Math.random() * 0.8),
        vy: -0.5 - Math.random() * 0.7,
        type: "smoke",
        sprite: FX.smoke,
        startSize: radius * (0.5 + Math.random() * 0.3),
        finishSize: radius * (1.1 + Math.random() * 0.4),
        life: 55 + Math.random() * 35,
        alphaMul: 0.3
      });
    }
    for (let i = 0; i < 10; i++) {
      this.addParticle({
        x: cx + (Math.random() - 0.5) * radius * 0.3,
        y: cy - radius * 0.55,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -1.2 - Math.random(),
        type: "fire",
        sprite: FX.fireMid,
        startSize: 14 + Math.random() * 16,
        finishSize: 4,
        life: 22 + Math.random() * 16,
        radialAcc: 0.94
      });
    }
  }

  addFloatingText(x, y, text, color = "#facc15") {
    this.floatingTexts.push({
      x, y, text, color, life: 60, maxLife: 60, vy: -1.3
    });
  }

  update() {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.18 + 1.8;
      sw.alpha -= 0.045;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) this.shockwaves.splice(i, 1);
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].life--;
      if (this.flashes[i].life <= 0) this.flashes.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;

      if (p.radialAcc) {
        p.vx *= p.radialAcc;
        p.vy *= p.radialAcc;
      }
      if (p.tangentialAcc) {
        const speed = Math.hypot(p.vx, p.vy);
        const angle = Math.atan2(p.vy, p.vx) + p.tangentialAcc;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }
      if (p.gravity) p.vy += p.gravity;
      if (p.type === "smoke") p.vx += (Math.random() - 0.5) * 0.16;

      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotv;

      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.life--;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  renderFlash(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const f of this.flashes) {
      const t = f.life / f.maxLife;
      const s = f.size * (1.15 - t * 0.2);
      drawSprite(ctx, FX.flash, f.cx, f.cy, s, s, 0, t * f.intensity);
    }
    for (const sw of this.shockwaves) {
      const s = sw.radius * 2;
      drawSprite(ctx, FX.ring, sw.cx, sw.cy, s, s, 0, Math.max(0, sw.alpha));
    }
    ctx.restore();
  }

  render(ctx) {
    ctx.save();

    ctx.globalCompositeOperation = "source-over";
    for (const p of this.particles) {
      if (p.type !== "smoke") continue;
      const t = 1.0 - p.life / p.maxLife;
      const size = p.startSize + (p.finishSize - p.startSize) * t;
      const alpha = (1.0 - t) * (p.alphaMul || 0.5);
      drawSprite(ctx, p.sprite || FX.smoke, p.x, p.y, size, size, p.rot, alpha);
    }

    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      if (p.type !== "fire") continue;
      const t = 1.0 - p.life / p.maxLife;
      const size = p.startSize + (p.finishSize - p.startSize) * t;
      const alpha = (1.0 - t * t) * (p.alphaMul || 1);
      drawSprite(ctx, p.sprite || FX.fireMid, p.x, p.y, size, size, p.rot, alpha);
    }

    for (const p of this.particles) {
      if (p.type !== "spark") continue;
      const t = 1.0 - p.life / p.maxLife;
      const size = p.startSize + (p.finishSize - p.startSize) * t;
      const ang = Math.hypot(p.vx, p.vy) > 0.2 ? Math.atan2(p.vy, p.vx) + Math.PI / 2 : p.rot;
      drawSprite(ctx, FX.spark, p.x, p.y, size, size * (p.stretch || 2.2), ang, 1.0 - t);
    }

    ctx.globalCompositeOperation = "source-over";
    for (const p of this.particles) {
      if (p.type !== "debris") continue;
      const fade = p.life < 12 ? p.life / 12 : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.dw / 2, -p.dh / 2, p.dw, p.dh);
      ctx.restore();
    }

    ctx.globalAlpha = 1.0;
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    for (const t of this.floatingTexts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#000000";
      ctx.fillText(t.text, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}

class ExplosionRenderer {
  constructor(simulator, terrain, particles) {
    this.simulator = simulator;
    this.explosions = [];
    this.terrain = terrain;
    this.particles = particles;
  }

  add(cx, cy, radius, dirtfall = true) {
    const big = radius >= 70;
    this.explosions.push({
      cx,
      cy,
      maxRadius: radius,
      life: 0,
      maxLife: big ? 92 : 54,
      eraseDelay: 5,
      erasing: false,
      dirtfall,
      mushroom: big,
      spin: (Math.random() - 0.5) * 0.08
    });

    this.particles.addFlash(cx, cy, radius * 2.6, big ? 0.85 : 0.7);
    this.particles.addShockwave(cx, cy, radius * 2.0);
    this.particles.spawnExplosionParticles(cx, cy, radius);
    if (big) this.particles.addMushroom(cx, cy, radius);

    this.simulator.screenShake = Math.max(
      this.simulator.screenShake,
      Math.min(18, radius * 0.22)
    );
    if (big) {
      this.simulator.worldFlash = Math.max(this.simulator.worldFlash || 0, 0.14);
    }
  }

  update() {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.life++;

      if (e.life >= e.eraseDelay && !e.erasing) {
        e.erasing = true;
        this.terrain.triggerCrater(e.cx, e.cy, e.maxRadius, e.dirtfall);
      }

      if (e.life > 12 && e.life < 32 && e.life % 3 === 0) {
        this.particles.addSmoke(e.cx, e.cy - e.life * 0.28, e.maxRadius * 0.85);
      }

      if (e.mushroom && e.life === 10) {
        this.particles.addSmoke(e.cx, e.cy - e.maxRadius * 0.55, e.maxRadius * 1.15);
      }

      if (e.life > e.maxLife) this.explosions.splice(i, 1);
    }
  }

  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of this.explosions) {
      const frames = FX.fireball;
      const lastHot = Math.min(8, frames.length - 1);
      const fi = Math.min(lastHot, Math.floor(e.life / 2.4));
      const grow = 1.05 + 0.55 * Math.min(1, e.life / 10);
      const size = Math.max(72, e.maxRadius * 2.75) * grow;
      let alpha;
      if (e.life < 5) alpha = 1;
      else alpha = Math.max(0, 1 - (e.life - 5) / (e.mushroom ? 42 : 28));
      const lift = e.mushroom ? Math.min(18, e.life * 0.32) : 0;
      const img = frames[fi] || FX.fireHot;
      drawSprite(ctx, img, e.cx, e.cy - lift, size, size, e.life * e.spin, alpha);
      drawSprite(
        ctx,
        img,
        e.cx,
        e.cy - lift * 0.6,
        size * 0.72,
        size * 0.72,
        -e.life * e.spin * 1.4,
        alpha * 0.55
      );
    }
    ctx.restore();
  }
}

// ============================================================================
// 6. MAIN SIMULATOR CONTROLLER & NATIVE WEAPON DISPATCH
// ============================================================================

class WeaponSimulator {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.terrain = new TerrainEngine(this.width, this.height);
    this.particles = new ParticleEngine();
    this.explosionRenderer = new ExplosionRenderer(this, this.terrain, this.particles);
    this.playerTank = new Tank(140, "#0088ff", true);
    this.targetTank = new Tank(840, "#ee2222", false);

    this.currentWeapon = WEAPONS[0];
    this.angle = 45;
    this.power = 65;
    this.wind = 0.0;
    this.slowMo = false;
    this.screenShake = 0;
    this.worldFlash = 0;

    this.projectiles = [];
    this.activeFields = []; // Hazards, elastic walls, rope lassos, beams

    this.telemetry = {
      vx: 0,
      vy: 0,
      time: 0,
      apex: 0,
      startTime: 0
    };

    this.initUI();
    this.initLoop();
  }

  initUI() {
    const angleInput = document.getElementById("angleInput");
    const angleDisplay = document.getElementById("angleDisplay");
    angleInput.addEventListener("input", (e) => {
      this.angle = parseFloat(e.target.value);
      angleDisplay.textContent = `${this.angle}°`;
    });

    document.querySelectorAll(".quick-angles .btn-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.angle = parseFloat(btn.dataset.angle);
        angleInput.value = this.angle;
        angleDisplay.textContent = `${this.angle}°`;
      });
    });

    const powerInput = document.getElementById("powerInput");
    const powerDisplay = document.getElementById("powerDisplay");
    powerInput.addEventListener("input", (e) => {
      this.power = parseFloat(e.target.value);
      powerDisplay.textContent = `${this.power}`;
    });

    document.querySelectorAll(".quick-powers .btn-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.power = parseFloat(btn.dataset.power);
        powerInput.value = this.power;
        powerDisplay.textContent = `${this.power}`;
      });
    });

    document.getElementById("fireBtn").addEventListener("click", () => this.fire());
    document.getElementById("resetTerrainBtn").addEventListener("click", () => {
      this.terrain.generate();
      this.activeFields = [];
      this.showToast("🎲 Terrain Regenerated");
    });

    document.getElementById("randomWindBtn").addEventListener("click", () => {
      this.wind = (Math.random() * 6 - 3).toFixed(1);
      document.getElementById("hudWind").textContent = `${this.wind > 0 ? "+" : ""}${this.wind} MPH`;
      this.showToast(`🌪️ Wind shifted to ${this.wind} MPH`);
    });

    document.getElementById("resetTargetBtn").addEventListener("click", () => {
      this.targetTank.hp = 100;
      this.targetTank.x = 750 + Math.random() * 150;
      this.updateHUD();
      this.showToast("🎯 Target Tank Reset");
    });

    document.getElementById("slowMoBtn").addEventListener("click", () => {
      this.slowMo = !this.slowMo;
      document.getElementById("slowMoLabel").textContent = `Slow-Mo: ${this.slowMo ? "ON (0.4x)" : "OFF"}`;
      this.showToast(this.slowMo ? "⏱️ Slow Motion (0.4x)" : "⚡ Real-time Speed");
    });

    document.getElementById("soundToggleBtn").addEventListener("click", () => {
      audio.enabled = !audio.enabled;
      document.getElementById("soundIcon").textContent = audio.enabled ? "🔊" : "🔇";
      document.getElementById("soundStatus").textContent = audio.enabled ? "ON" : "OFF";
    });

    this.renderWeaponGrid();
    this.initFilters();
  }

  showToast(msg) {
    const toast = document.getElementById("simToast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  selectWeapon(w) {
    this.currentWeapon = w;
    document.getElementById("hudWeaponName").textContent = w.name;
    document.getElementById("hudWeaponPack").textContent = `Pack: ${w.pack} | ${w.archetype}`;

    document.querySelectorAll(".weapon-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.id === w.id);
    });

    this.showToast(`Selected: ${w.name}`);
  }

  renderWeaponGrid() {
    const container = document.getElementById("weaponsGrid");
    container.innerHTML = "";

    for (const w of WEAPONS) {
      const card = document.createElement("div");
      card.className = `weapon-card ${w.id === this.currentWeapon.id ? "selected" : ""}`;
      card.dataset.id = w.id;
      card.dataset.category = w.category;

      let badgeClass = "archetype-badge";
      if (w.archetype === "Digger") badgeClass += " digger";
      else if (w.archetype === "Elemental") badgeClass += " elemental";
      else if (w.archetype === "Beam") badgeClass += " beam";
      else if (w.archetype === "Mobility") badgeClass += " mobility";

      card.innerHTML = `
        <div class="weapon-card-header">
          <div class="weapon-title-group">
            <div class="weapon-icon">${w.icon}</div>
            <div>
              <div class="weapon-name">${w.name}</div>
              <div class="weapon-pack">${w.pack}</div>
            </div>
          </div>
          <span class="${badgeClass}">${w.archetype}</span>
        </div>
        <div class="weapon-desc">${w.desc}</div>
        <div class="weapon-physics-info">
          <strong>Engine Params:</strong> ${w.physics}
        </div>
        <div class="weapon-card-footer">
          <span class="weapon-trigger-name"><code>${w.trigger}</code></span>
          <button class="btn btn-primary btn-load">⚡ Load & Fire</button>
        </div>
      `;

      card.addEventListener("click", (e) => {
        this.selectWeapon(w);
        if (e.target.classList.contains("btn-load")) {
          this.fire();
        }
      });

      container.appendChild(card);
    }
  }

  initFilters() {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const f = btn.dataset.filter;

        document.querySelectorAll(".weapon-card").forEach((card) => {
          if (f === "all" || card.dataset.category === f) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  // ==========================================================================
  // WEAPON FIRING & TRIGGER DISPATCH
  // ==========================================================================

  fire() {
    const muzzle = this.playerTank.getBarrelMuzzle(this.angle);
    const rad = (this.angle * Math.PI) / 180;
    const speed = (this.power / 100) * 14.5;
    const vx0 = Math.cos(rad) * speed;
    const vy0 = -Math.sin(rad) * speed;

    this.playerTank.triggerRecoil();

    this.telemetry.vx = vx0 * 60;
    this.telemetry.vy = vy0 * 60;
    this.telemetry.time = 0;
    this.telemetry.apex = muzzle.y;
    this.telemetry.startTime = performance.now();

    const w = this.currentWeapon;

    this.particles.addFlash(muzzle.x, muzzle.y, 46, 0.85);
    for (let i = 0; i < 12; i++) {
        const spread = rad + (Math.random() - 0.5) * 0.55;
        const spd = 3.5 + Math.random() * 8;
        this.particles.addSpark(
          muzzle.x, muzzle.y,
          Math.cos(spread) * spd,
          -Math.sin(spread) * spd,
          "#ffe08a",
          8 + Math.random() * 12,
          2.2 + Math.random() * 1.6
        );
    }

    switch (w.id) {
      case "jump_jets":
        audio.playShoot("jet");
        this.playerTank.applyImpulse((this.power / 4) * Math.cos(rad) * 0.28, -(this.power / 4) * Math.sin(rad) * 0.28);
        this.particles.addExplosion(muzzle.x, muzzle.y, 25, ["#38bdf8", "#0284c7"], 0.6);
        this.showToast("🚀 Jump Jets Engaged!");
        return;

      case "blast_off":
        audio.playShoot("jet");
        this.playerTank.applyImpulse((this.power / 2.5) * Math.cos(rad) * 0.32, -(this.power / 2.5) * Math.sin(rad) * 0.32);
        this.explosionRenderer.add(this.playerTank.x, this.playerTank.y + 8, 22, false);
        audio.playExplosion(0.9);
        this.showToast("🔥 Blast Off Launched!");
        return;

      case "railgun":
      case "tachyon_beam":
        audio.playShoot("beam");
        this.fireHitscanBeam(muzzle.x, muzzle.y, rad, w.id === "railgun" ? 5 : 9, w.id === "railgun" ? "#38bdf8" : "#c084fc");
        return;

      case "space_laser":
        audio.playShoot("ballistic");
        this.spawnProjectile(muzzle.x, muzzle.y, vx0, vy0, "space_flare");
        return;

      case "three_shot":
        audio.playShoot("ballistic");
        for (let off of [-0.07, 0, 0.07]) {
          const vrad = rad + off;
          this.spawnProjectile(muzzle.x, muzzle.y, Math.cos(vrad) * speed, -Math.sin(vrad) * speed, "standard", 18, 22, 4);
        }
        return;

      case "five_shot":
        audio.playShoot("ballistic");
        for (let off of [-0.14, -0.07, 0, 0.07, 0.14]) {
          const vrad = rad + off;
          this.spawnProjectile(muzzle.x, muzzle.y, Math.cos(vrad) * speed, -Math.sin(vrad) * speed, "standard", 16, 18, 3);
        }
        return;

      case "meteor_shower":
        audio.playShoot("ballistic");
        this.spawnProjectile(muzzle.x, muzzle.y, vx0, vy0, "meteor_beacon");
        return;

      case "bouncy_wall":
        audio.playShoot("ballistic");
        this.spawnProjectile(muzzle.x, muzzle.y, vx0, vy0, "wall_deployer");
        return;

      case "bungee_punch":
        audio.playShoot("ballistic");
        this.spawnProjectile(muzzle.x, muzzle.y, vx0, vy0, "bungee_punch");
        return;

      case "danger_rope":
        audio.playShoot("beam");
        this.fireDangerRope(muzzle.x, muzzle.y, rad);
        return;

      default:
        audio.playShoot(w.category === "Beam" ? "laser" : "ballistic");
        this.spawnProjectile(muzzle.x, muzzle.y, vx0, vy0, w.id);
        break;
    }
  }

  spawnProjectile(x, y, vx, vy, type, radius = 24, dmg = 35, throwTank = 5) {
    this.projectiles.push({
      x, y, vx, vy, type,
      radius, dmg, throwTank,
      startX: x, startY: y,
      trail: [], // BULLET_TRAIL history
      life: 0,
      bounces: 0
    });
  }

  fireHitscanBeam(x0, y0, rad, width, color) {
    const cos = Math.cos(rad);
    const sin = -Math.sin(rad);
    let hitX = x0 + cos * 1000;
    let hitY = y0 + sin * 1000;
    let hitTank = false;

    for (let s = 0; s < 1000; s += 3) {
      const rx = x0 + cos * s;
      const ry = y0 + sin * s;

      if (Math.hypot(rx - this.targetTank.x, ry - this.targetTank.y) < 18) {
        hitX = rx;
        hitY = ry;
        hitTank = true;
        break;
      }
      if (ry >= this.terrain.getHeight(rx)) {
        hitX = rx;
        hitY = ry;
        break;
      }
    }

    // Carve terrain along beam path
    for (let s = 0; s < Math.hypot(hitX - x0, hitY - y0); s += 5) {
      const rx = x0 + cos * s;
      const ry = y0 + sin * s;
      this.terrain.triggerCrater(rx, ry, width, false);
    }

    if (hitTank) {
      this.damageTarget(55, 6.0);
    }

    this.explosionRenderer.add(hitX, hitY, 35, false);
    audio.playExplosion(1.2);

    this.activeFields.push({
      type: "beam_flash",
      x1: x0, y1: y0, x2: hitX, y2: hitY,
      color, width, life: 14
    });
  }

  fireDangerRope(x0, y0, rad) {
    const hitX = this.targetTank.x;
    const hitY = this.targetTank.y;

    const pullVx = (this.playerTank.x - this.targetTank.x) * 0.06;
    const pullVy = -7.5;
    this.targetTank.applyImpulse(pullVx, pullVy);
    this.damageTarget(40, 8.0);
    audio.playExplosion(0.8);

    this.activeFields.push({
      type: "rope_line",
      x1: x0, y1: y0, x2: hitX, y2: hitY,
      life: 28
    });
    this.showToast("🪢 Danger Rope Lassoed & Dragged Target!");
  }

  // ==========================================================================
  // SIMULATION UPDATE LOOP
  // ==========================================================================

  update() {
    const dt = this.slowMo ? 0.4 : 1.0;
    const windForce = parseFloat(this.wind) * 0.008;

    this.terrain.updateDirt();
    this.playerTank.update(this.terrain);
    this.targetTank.update(this.terrain);
    this.particles.update();
    this.explosionRenderer.update();

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 0.4);
    }

    // Active Fields / Hazards
    for (let i = this.activeFields.length - 1; i >= 0; i--) {
      const f = this.activeFields[i];
      f.life -= dt;

      if (f.type === "gravity_well") {
        const dist = Math.hypot(f.x - this.targetTank.x, f.y - this.targetTank.y);
        if (dist < 180 && dist > 10) {
          const force = 140 / (dist + 20);
          this.targetTank.vx += ((f.x - this.targetTank.x) / dist) * force * dt;
          this.targetTank.vy += ((f.y - this.targetTank.y) / dist) * force * dt;
          this.targetTank.inAir = true;
        }
        this.particles.addSpark(f.x + (Math.random() - 0.5) * 45, f.y + (Math.random() - 0.5) * 45, (f.x - Math.random() * 45) * 0.05, (f.y - Math.random() * 45) * 0.05, "#8b5cf6", 18, 2);
      } else if (f.type === "bonfire" || f.type === "acid_pool") {
        const dist = Math.hypot(f.x - this.targetTank.x, f.y - this.targetTank.y);
        if (dist < f.radius && Math.random() < 0.16) {
          this.damageTarget(4, 0);
        }
        if (f.type === "acid_pool" && Math.random() < 0.35) {
          this.terrain.triggerCrater(f.x + (Math.random() - 0.5) * f.radius, f.y + 2, 6, false);
        }
      }

      if (f.life <= 0) {
        this.activeFields.splice(i, 1);
      }
    }

    // Update Projectiles (BULLET_TRAIL + Collision)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;

      // Update BULLET_TRAIL history
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 14) p.trail.pop();

      // Telemetry
      this.telemetry.apex = Math.min(this.telemetry.apex, p.y);
      this.telemetry.time = ((performance.now() - this.telemetry.startTime) / 1000).toFixed(2);
      this.telemetry.vx = (p.vx * 60).toFixed(1);
      this.telemetry.vy = (p.vy * 60).toFixed(1);

      // Trailing sparks
      if (p.type === "comet") {
        this.particles.addSpark(p.x, p.y, -p.vx * 0.25, -p.vy * 0.25, "#fbbf24", 22, 4);
      } else if (p.type === "plasma_orb" && Math.random() < 0.3) {
        this.particles.addExplosion(p.x, p.y, 8, ["#38bdf8", "#818cf8"], 0.4);
      }

      // Physics integration
      if (p.type === "beehive" && p.life > 18) {
        const dx = this.targetTank.x - p.x;
        const dy = this.targetTank.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          p.vx += (dx / dist) * 0.55 * dt;
          p.vy += (dy / dist) * 0.55 * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
        }
      } else {
        const grav = p.type === "comet" ? 0.44 : 0.32;
        p.vy += grav * dt;
        p.vx += windForce * dt;
      }

      // Check Active Force Fields
      for (const f of this.activeFields) {
        if (f.type === "gravity_well") {
          const dx = f.x - p.x;
          const dy = f.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 180 && dist > 10) {
            p.vx += (dx / dist) * (180 / (dist + 20)) * dt;
            p.vy += (dy / dist) * (180 / (dist + 20)) * dt;
          }
        } else if (f.type === "bouncy_wall") {
          if (Math.abs(p.x - f.x) < 8 && p.y >= f.y && p.y <= f.y + f.height) {
            p.vx = -p.vx * 0.92;
            this.explosionRenderer.add(p.x, p.y, 14, false);
            audio.playShoot("laser");
          }
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Tank & Ground Hit Testing
      const hitTarget = Math.hypot(p.x - this.targetTank.x, p.y - this.targetTank.y) < 20;
      const groundY = this.terrain.getHeight(p.x);
      const hitGround = p.y >= groundY;

      if (hitTarget || hitGround) {
        this.detonateWeapon(p, hitTarget);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.x < -120 || p.x > this.width + 120 || p.y > this.height + 120) {
        this.projectiles.splice(i, 1);
      }
    }

    this.updateHUD();
  }

  // ==========================================================================
  // DETONATION LOGIC (NATIVE PARAMETERS FROM .WEP FILES)
  // ==========================================================================

  detonateWeapon(p, hitTank) {
    const cx = p.x;
    const cy = p.y;

    // THROW_TANK physics: shockwave impulse on tanks
    const distToTarget = Math.hypot(cx - this.targetTank.x, cy - this.targetTank.y);
    if (distToTarget < p.radius + 35) {
      const throwMag = p.throwTank || 6.0;
      const angle = Math.atan2(this.targetTank.y - cy, this.targetTank.x - cx);
      this.targetTank.applyImpulse(Math.cos(angle) * throwMag * 0.6, -Math.abs(Math.sin(angle)) * throwMag * 0.8);
    }

    switch (p.type) {
      case "single_shot":
      case "standard":
        this.explosionRenderer.add(cx, cy, 24, true);
        audio.playExplosion(1.0);
        if (hitTank) this.damageTarget(35, 4.0);
        break;

      case "big_shot":
        this.explosionRenderer.add(cx, cy, 48, true);
        audio.playExplosion(1.6);
        if (hitTank) this.damageTarget(45, 8.0);
        break;

      case "nuke":
        this.explosionRenderer.add(cx, cy, 75, true);
        audio.playExplosion(2.5);
        if (hitTank) this.damageTarget(85, 14.0);
        break;

      case "mega_nuke":
        this.explosionRenderer.add(cx, cy, 110, true);
        audio.playExplosion(3.2);
        if (hitTank) this.damageTarget(120, 20.0);
        break;

      case "mud_pie":
        this.terrain.addDirt(cx, cy, 200, 48);
        this.explosionRenderer.add(cx, cy, 30, false);
        audio.playExplosion(0.8);
        this.showToast("🥧 Mud Pie Deployed Dirt Mound!");
        break;

      case "pin_cushion":
        audio.playExplosion(1.0);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
          const spd = 4.5 + Math.random() * 2.2;
          this.spawnProjectile(cx, cy, Math.cos(a) * spd, Math.sin(a) * spd, "spark_needle", 8, 12, 2);
        }
        break;

      case "jackhammer":
        this.terrain.drillVertical(cx, cy, 140, 16);
        this.explosionRenderer.add(cx, cy, 45, false);
        audio.playExplosion(1.3);
        if (hitTank) this.damageTarget(40, 6.0);
        this.showToast("⛏️ Jackhammer Drilled Pit!");
        break;

      case "ground_hog":
        this.explosionRenderer.add(cx + 40, cy, 35, true);
        audio.playExplosion(1.4);
        if (hitTank) this.damageTarget(50, 7.0);
        break;

      case "golden_bullet":
        if (p.bounces < 3) {
          p.bounces++;
          p.vy = -p.vy * 0.95;
          this.particles.addExplosion(cx, cy, 18, ["#eab308", "#fde047"], 0.6);
          audio.playShoot("laser");
          this.projectiles.push(p);
          return;
        } else {
          this.explosionRenderer.add(cx, cy, 22, true);
          audio.playExplosion(1.0);
          if (hitTank) this.damageTarget(60, 6.0);
        }
        break;

      case "acid_bombs":
        audio.playExplosion(0.9);
        for (let i = -1; i <= 1; i++) {
          this.activeFields.push({
            type: "acid_pool",
            x: cx + i * 22,
            y: cy,
            radius: 22,
            life: 220
          });
        }
        this.showToast("🧪 Acid Pools Dissolving Terrain!");
        break;

      case "bonfire":
        audio.playExplosion(1.0);
        this.activeFields.push({
          type: "bonfire",
          x: cx,
          y: cy,
          radius: 34,
          life: 240
        });
        this.showToast("🔥 Bonfire Area Active!");
        break;

      case "gravity_well":
        audio.playExplosion(1.5);
        this.activeFields.push({
          type: "gravity_well",
          x: cx,
          y: cy,
          life: 300
        });
        this.showToast("🌀 Gravity Singularity Active!");
        break;

      case "quantum_cube":
        audio.playShoot("laser");
        this.targetTank.applyImpulse((Math.random() - 0.5) * 8, -13);
        this.explosionRenderer.add(this.targetTank.x, this.targetTank.y, 45, false);
        this.damageTarget(35, 10.0);
        this.showToast("🧊 Quantum Warp Displaced Target!");
        break;

      case "wrecker":
        this.explosionRenderer.add(cx, cy, 34, true);
        audio.playExplosion(1.3);
        if (hitTank) this.damageTarget(60, 9.0);
        break;

      case "bungee_punch":
        audio.playExplosion(1.1);
        this.explosionRenderer.add(cx, cy, 40, false);
        if (hitTank) {
          this.targetTank.applyImpulse(9, -7);
          this.damageTarget(65, 12.0);
          this.showToast("🥊 Direct Bungee Punch Hit!");
        } else {
          this.showToast("🥊 Bungee Punch Snapped Back!");
        }
        break;

      case "wall_deployer":
        this.activeFields.push({
          type: "bouncy_wall",
          x: cx,
          y: cy - 80,
          height: 80,
          life: 420
        });
        this.explosionRenderer.add(cx, cy, 25, false);
        audio.playShoot("laser");
        this.showToast("🛡️ Bouncy Elastic Wall Erected!");
        break;

      case "space_flare":
        this.explosionRenderer.add(cx, cy, 22, false);
        this.showToast("🛰️ Orbital Beacon Locked — Space Laser Firing!");
        setTimeout(() => {
          this.fireHitscanBeam(cx, 0, (90 * Math.PI) / 180, 20, "#ef4444");
        }, 500);
        break;

      case "meteor_beacon":
        this.showToast("🌌 Meteor Shower Incoming!");
        for (let m = 0; m < 6; m++) {
          setTimeout(() => {
            const startX = cx + (m - 2.5) * 45;
            this.spawnProjectile(startX - 100, 0, 4.8, 9.8, "comet", 22, 25, 4);
            audio.playShoot("ballistic");
          }, m * 200);
        }
        break;

      default:
        this.explosionRenderer.add(cx, cy, p.radius, true);
        audio.playExplosion(1.0);
        if (hitTank) this.damageTarget(p.dmg, p.throwTank);
        break;
    }
  }

  damageTarget(pts, throwMag = 4.0) {
    this.targetTank.hp = Math.max(0, this.targetTank.hp - pts);
    this.particles.addFloatingText(this.targetTank.x, this.targetTank.y - 32, `-${pts} HP`, pts > 50 ? "#ef4444" : "#facc15");
    document.getElementById("hudLastDmg").textContent = `${pts} PTS`;
    audio.playHit();
  }

  updateHUD() {
    document.getElementById("hudTargetHP").textContent = `${this.targetTank.hp} / 100`;
    document.getElementById("hudTargetHP").className = `hud-val ${this.targetTank.hp > 40 ? "green" : "orange"}`;

    document.getElementById("telVx").textContent = `${this.telemetry.vx} px/s`;
    document.getElementById("telVy").textContent = `${this.telemetry.vy} px/s`;
    document.getElementById("telTime").textContent = `${this.telemetry.time} s`;
    document.getElementById("telApex").textContent = `${Math.round(this.height - this.telemetry.apex)} px`;
    document.getElementById("telParticles").textContent = `${this.particles.particles.length + this.terrain.fallingDirt.length}`;
  }

  // ==========================================================================
  // RENDERING ENGINE
  // ==========================================================================

  renderTrajectoryPreview() {
    const muzzle = this.playerTank.getBarrelMuzzle(this.angle);
    const rad = (this.angle * Math.PI) / 180;
    const speed = (this.power / 100) * 14.5;
    let px = muzzle.x;
    let py = muzzle.y;
    let pvx = Math.cos(rad) * speed;
    let pvy = -Math.sin(rad) * speed;
    const windForce = parseFloat(this.wind) * 0.008;

    this.ctx.save();
    this.ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
    this.ctx.lineWidth = 2.0;
    this.ctx.setLineDash([4, 6]);

    this.ctx.beginPath();
    this.ctx.moveTo(px, py);

    for (let t = 0; t < 65; t++) {
      pvy += 0.32;
      pvx += windForce;
      px += pvx;
      py += pvy;

      if (py >= this.terrain.getHeight(px) || px < 0 || px > this.width) {
        this.ctx.lineTo(px, py);
        break;
      }
      this.ctx.lineTo(px, py);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  render() {
    this.ctx.save();

    // Screen Shake displacement
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake * 2;
      const sy = (Math.random() - 0.5) * this.screenShake * 2;
      this.ctx.translate(sx, sy);
    }

    // Authentic Night Sky Gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.7);
    skyGrad.addColorStop(0, "#050614");
    skyGrad.addColorStop(0.5, "#0b112c");
    skyGrad.addColorStop(1, "#1e1b4b");
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Stars / Atmosphere
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 37) % this.width;
      const sy = (i * 29) % (this.height * 0.5);
      this.ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Trajectory Aiming Line
    this.renderTrajectoryPreview();

    // Render Active Force Fields / Beams / Ropes
    for (const f of this.activeFields) {
      if (f.type === "gravity_well") {
        this.ctx.save();
        this.ctx.strokeStyle = "#8b5cf6";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, 25 + Math.sin(Date.now() * 0.01) * 5, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fillStyle = "rgba(139, 92, 246, 0.18)";
        this.ctx.fill();
        this.ctx.restore();
      } else if (f.type === "bouncy_wall") {
        this.ctx.save();
        this.ctx.strokeStyle = "#06b6d4";
        this.ctx.lineWidth = 4.5;
        this.ctx.shadowColor = "#06b6d4";
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.moveTo(f.x, f.y);
        this.ctx.lineTo(f.x, f.y + f.height);
        this.ctx.stroke();
        this.ctx.restore();
      } else if (f.type === "beam_flash") {
        this.ctx.save();
        this.ctx.strokeStyle = f.color;
        this.ctx.lineWidth = f.width;
        this.ctx.shadowColor = f.color;
        this.ctx.shadowBlur = 18;
        this.ctx.beginPath();
        this.ctx.moveTo(f.x1, f.y1);
        this.ctx.lineTo(f.x2, f.y2);
        this.ctx.stroke();
        this.ctx.restore();
      } else if (f.type === "rope_line") {
        this.ctx.save();
        this.ctx.strokeStyle = "#eab308";
        this.ctx.lineWidth = 3.0;
        this.ctx.setLineDash([6, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(f.x1, f.y1);
        this.ctx.lineTo(f.x2, f.y2);
        this.ctx.stroke();
        this.ctx.restore();
      } else if (f.type === "muzzle_flash") {
         this.ctx.save();
         this.ctx.globalCompositeOperation = 'lighter';
         this.ctx.translate(f.x, f.y);
         this.ctx.rotate(-f.angle);
         
         const flashAlpha = f.life / 6;
         const grad = this.ctx.createLinearGradient(0, 0, 60, 0);
         grad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
         grad.addColorStop(0.3, `rgba(255, 200, 0, ${flashAlpha * 0.8})`);
         grad.addColorStop(1, `rgba(255, 50, 0, 0)`);
         
         this.ctx.fillStyle = grad;
         this.ctx.beginPath();
         this.ctx.moveTo(0, -10);
         this.ctx.lineTo(60, 0);
         this.ctx.lineTo(0, 10);
         this.ctx.closePath();
         this.ctx.fill();
         this.ctx.restore();
      }
    }

    // Render Terrain
    this.terrain.render(this.ctx);

    // Render Tanks
    this.playerTank.render(this.ctx, this.angle);
    this.targetTank.render(this.ctx, 135);

    this.particles.renderFlash(this.ctx);
    this.explosionRenderer.render(this.ctx);

    // Render Projectiles & BULLET_TRAIL
    for (const p of this.projectiles) {
      this.ctx.save();

      // Render decaying trail segment points
      this.ctx.globalCompositeOperation = 'lighter';
      for (let t = 0; t < p.trail.length; t++) {
        const pt = p.trail[t];
        const alpha = 1.0 - (t / p.trail.length);
        const trailSize = Math.max(1.5, 4 * alpha);
        
        const trGrad = this.ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, trailSize*2);
        trGrad.addColorStop(0, p.type === "comet" ? `rgba(251, 191, 36, ${alpha})` : `rgba(203, 213, 225, ${alpha})`);
        trGrad.addColorStop(1, 'rgba(0,0,0,0)');
        
        this.ctx.fillStyle = trGrad;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, trailSize*2, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Projectile Core Sprite
      this.ctx.globalCompositeOperation = 'lighter';
      
      let coreColor = '#ffffff';
      let haloColor = 'rgba(255, 200, 0, 0.6)';
      
      if (p.type === "comet") {
        coreColor = '#f97316';
        haloColor = 'rgba(255, 50, 0, 0.8)';
      } else if (p.type === "golden_bullet") {
        coreColor = '#eab308';
        haloColor = 'rgba(255, 200, 50, 0.8)';
      } else if (p.type === "wrecker") {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = "#334155";
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
        continue;
      } else if (p.type === "bungee_punch") {
        this.ctx.globalCompositeOperation = 'source-over';
        // Elastic tether from barrel to glove
        this.ctx.strokeStyle = "#94a3b8";
        this.ctx.lineWidth = 2.0;
        this.ctx.beginPath();
        this.ctx.moveTo(p.startX, p.startY);
        this.ctx.lineTo(p.x, p.y);
        this.ctx.stroke();

        this.ctx.fillStyle = "#ef4444";
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
        continue;
      }
      
      // Radial glow
      const pg = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
      pg.addColorStop(0, coreColor);
      pg.addColorStop(0.4, haloColor);
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      
      this.ctx.fillStyle = pg;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Render Particles and Floating Text
    this.particles.render(this.ctx);

    if (this.worldFlash > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.fillStyle = `rgba(255, 220, 150, ${this.worldFlash})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
      this.worldFlash *= 0.62;
      if (this.worldFlash < 0.02) this.worldFlash = 0;
    }

    this.ctx.restore();
  }

  initLoop() {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Instantiate simulator once DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  window.simulator = new WeaponSimulator();
});
