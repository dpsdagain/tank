# Weapon impact audit and correction — 18 October 2026

The supplied decrypted APK weapon scripts were read again for all 36 browser weapons. The previous exporter did not follow several native block types, and a shared painted orange fireball obscured the remaining palette differences. The new graph audit is reproducible with `python tools/inspect_native_impacts.py`. Full commands and fields are in `native-impact-audit.json`; its compact overview is in `native-impact-audit.txt`.

| Weapon | APK impact evidence | Browser presentation |
| --- | --- | --- |
| Single Shot | Palette 235, 12 outward bands | Compact magenta ring/body with short rays |
| Big Shot | Palette 28, radius 50, 12 bands | Large red pressure burst and broad shock skirt |
| 3 Shot | Three bullets; palette 75 | Three separate yellow bursts at actual hit positions |
| 5 Shot | Five bullets; palette 139 | Five compact orange bursts at actual hit positions |
| Sniper Rifle | SHRAPNEL, sniper emitter, expshort2 | Pinpoint white flash and fine streaks |
| Cannon Ball | Bounces, then SHRAPNEL/cannonShrapnel | Metallic ricochet sparks and radial steel fragments |
| Chain Reaction | Repeated offset red-orange explosions, 150 ms delays | Short red-orange pulses at actual scheduled blast positions |
| Skipper | Bounce count 3; palette 75 | Glancing skim sparks, then a flattened yellow burst |
| Roller | CRUISER, palette 93 | Rolling stage, then purple ground detonation |
| Heavy Roller | Larger CRUISER explosion, palette 235 | Heavy magenta detonation with broad twin pressure rings |
| Napalm | FIRE blocks, 3500 ms burn, small damage radius | Burning liquid, low flames and persistent ground fire |
| Hail Storm | SUPERBALL pellets, GAS blending, bounce impulse | Browser ice/pellet flashes, chips and falling secondary pellets |
| Dirtball | DIRTBALL, radius 50, brown low/high colors | Soil plume, round new mound and falling clods |
| Big Dirtball | DIRTBALL, radius 80, larger spike count | Dense earth plume and larger mound |
| Dirt Slinger | DIRTSLINGER, width 90/height 70 | Wide fan of soil around the browser's existing fill |
| Mud Pie | Repeated spread bullets creating dirtballs | Low muddy splash and heavy drops around the existing fill |
| Jackhammer | Five repeated bullet/impact stages, palette 235 | Compact magenta pounding pulses at browser impact stages |
| Digger | DIRTMOVER, blue/white colors, narrow width | Blue-white digging face, helical lines and soil chips |
| Ground Hog | HIT_AIR tunneling bullet, palette 236 | Magenta horizontal underground pulses |
| Pile Driver | Six descending explosions, palette 127 | Pale magenta descending compression rings |
| Heatseeker | Palette 26, radius 40 | Red missile burst with casing sparks |
| Homing Worm | HIT_AIR tunnel bullet, palette 92 | Purple tunneling pulses and soil traces |
| Beehive | Hive spread, tiny BeeExplosion radius 3/palette 139 | Hive-shell opening cue, actual flying bees, small orange stings |
| Pin Cushion | Orange impact bursts and ZAPPER sparks | Orange apex release and compact needle/zap pops |
| Laser | SHRAPNEL/laser emitter, expshort2 | Narrow cyan-white endpoint sparks |
| Super Laser | SuperLaser shrapnel and dust emitters | Wider cyan endpoint flare and heavier sparks |
| Lightning Strike | Zigzag bullet triggers, cyan palette 107 | Branching violet/cyan bolt and electrical ground discharge |
| Space Laser | Beam frames, small dig explosions, fog vapor | Vertical beam burn, layered rings and rising vapor |
| Nuke | Orange/yellow/dark stages at 0/200/400/600 ms | Existing nuclear effect retained unchanged |
| Mega Nuke | Same timed stages at larger native radii | Existing large nuclear effect retained unchanged |
| Comet | Six secondary comets; yellow palette 75; blue dust | Blue-white six-shard cosmetic flare and small yellow core |
| Meteor Shower | Meteor shrapnel emitter plus orange palette blast | Falling rocks, hot impact core and radial rock/metal streaks |
| Fireball | Animated fireball explosion, damage shrapnel emitter | Animated billowing painted fire with native fallback and embers |
| Volcano | Vent emitter, fire objects, rock/shrapnel stages | Upward lava fountain and actual molten secondary projectiles |
| Jump Jets | JUMPJETS event, no shell explosion | Blue launch exhaust; thrusters follow the airborne tank |
| Magic Wall | MAGICWALL, brown/green colors and sparks | Actual rising terrain wall with green construction edges/sparks |

## Scope

This is source-informed browser presentation, not native ARM execution or full trigger-language parity. The existing browser physics, damage, terrain tuning and child counts stay in place. For example, the Comet shard flare is cosmetic; the original APK's six secondary comet projectiles are recorded as evidence, not silently added as damaging shots. Hail, dirt spreading and digging retain their existing browser behavior. Child-hit and airburst flags were added to visual events to choose the appropriate effect and avoid scorch marks in mid-air.

Nuclear drawing-command baselines were captured before editing the impact renderer. Nuke and Mega Nuke are verified at 0.08, 0.20, 0.40, 0.60, 1.10 and 2.00 seconds. No nuclear palette data, stage timing, mushroom geometry, fire treatment or sound path was changed.

## Verification

- Automated: all 24 tests pass, covering all 36 real weapon flights/secondary stages, distinct impact drawing signatures, finite geometry, restored Canvas state, source graph branches, bounded particles, child/airburst context and the nuclear baselines.
- Syntax: 12 JavaScript files checked by `npm run check`.
- The expanded impact gallery uses isolated `PocketCore.Battle` instances, the production effects renderer and actual destructible terrain. It starts at contact for comparison; lasers and jets show their firing action. Offscreen cards do not continuously simulate or draw.
- Browser proof: `impact-reactions-terrain.png`, `impact-reactions-digging.png`, `impact-reactions-nuclear.png`, `impact-reactions-elemental.png` and `impact-reactions-followup.png`. These show native colors, different structures and genuine secondary/terrain behavior at selectable times.
- All six family filters were inspected: Classic 7, Cluster 4, Terrain 9, Elemental 5, Special 7 and Heavy 4, covering all 36 cards. Additional proof: `impact-reactions-classic.png` and `impact-reactions-special.png`. No browser console errors were reported.
- Phone viewport at 390 × 844: content width and scroll width both measured 375 CSS pixels; laser, super laser and space laser remain distinguishable. Proof: `impact-reactions-phone.png`. The temporary viewport override was reset.
- The main game was refreshed at the start of an aiming turn. Before and after: score 103, shot 9, Napalm selected. No test shot or save reset was performed in the user's match.
- The verified archive for this revision is `dist/pocket-tanks-browser-impact-update.zip`. The previous standard ZIP could not be overwritten during this run and remains the earlier icon build. The packager now accepts `--output` for a different filename. New effect scripts, consumers and nested nuclear fixtures are included and checked against the source files.
