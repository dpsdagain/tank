# Weapon flight animation plan

Status: implemented in `projectile-art.js`, integrated through `WeaponEffects` and the main game. Inspect all 36 entries at http://127.0.0.1:5173/flight-preview.html. Canvas geometry supplies the artwork and moving parts; the existing Flow scenery/impact assets are retained.

Scope: all 36 weapons currently shipped in `weapons.js`. This is a design for the browser recreation, not a claim that the original APK uses these projectile shapes.

## What the revision replaces

The old `WeaponEffects.drawProjectile()` primarily chose a glowing disk, a shared missile atlas, or shared comet/meteor atlases. The new renderer assigns silhouettes, moving parts and trails by weapon identity, and supplies distinct secondary artwork for bees, needles, ice, meteor and lava fragments. Lasers retain beam rendering; Jump Jets has continuous thrusters on the actual flying tank.

## Full flight list

| ID | Weapon | Projectile and motion | Recognition cue / transition |
| --- | --- | --- | --- |
| single_shot | Single Shot | Small pointed shell, oriented along its arc; thin magenta tracer. | Clean, compact, one projectile. |
| big_shot | Big Shot | Wide, blunt red shell with a bright nose and thick short wake. | Much larger body than Single Shot. |
| 3_shot | 3 Shot | Three small pink darts, each with a thin tracer. | Clearly separated three-projectile fan. |
| 5_shot | 5 Shot | Five violet darts with short individual trails. | Wider five-projectile fan, readable by count. |
| sniper_rifle | Sniper Rifle | Slender silver needle with a narrow white streak. | Tiny pointed head, little glow; no change to gameplay speed. |
| cannon_ball | Cannon Ball | Dark iron sphere with a rotating metallic highlight. | Heavy solid ball, minimal trail; a spark at each real bounce. |
| chain_reaction | Chain Reaction | Segmented orange fuse capsule with sparks stepping along its casing. | Animated linked sections, followed by the actual chain blasts. |
| skipper | Skipper | Thin mint-edged disc that visibly spins. | Flat silhouette; dotted trail and a bright skim at each real skip. |
| roller | Roller | Small blue-rimmed wheel with rotating spokes. | Wheel rotation continues when the existing rolling state begins. |
| heavy_roller | Heavy Roller | Broad armored drum with two luminous rims. | Wider and heavier than Roller, with denser ground dust. |
| napalm | Napalm | Tumbling copper canister leaking glowing droplets. | Liquid-fire trail; burning ground begins on contact. |
| hail_storm | Hail Storm | Faceted ice capsule with a frost ribbon. | After its marker lands, the actual falling children become small ice crystals. |
| dirtball | Dirtball | Rough brown soil clod, slowly rotating and shedding pebbles. | Earth particles rather than flame. |
| big_dirtball | Big Dirtball | Large rocky clod with visible embedded stones. | Oversized irregular silhouette and a denser dust tail. |
| dirt_slinger | Dirt Slinger | Fork-shaped seed pod with two separate dusty wisps. | A recognizable Y silhouette; the wisps are cosmetic, not extra damaging shots. |
| mud_pie | Mud Pie | Wobbling flattened mud disc, shedding sticky droplets. | Soft, squashed shape rather than a round rock. |
| jackhammer | Jackhammer | Compact yellow hammer capsule with a reciprocating piston. | Rhythmic mechanical pumping; pulses align with actual digging events after contact. |
| digger | Digger | Steel corkscrew projectile with a rotating drill tip. | Sharp helical nose and soil chips at entry. |
| ground_hog | Ground Hog | Low, chunky auger with a spinning nose. | After entry, surface dust/ripples align with actual tunneling events. |
| pile_driver | Pile Driver | Heavy orange ram with a broad flat striking face. | A pumping piston and stacked downward impact pulses after contact. |
| heatseeker | Heatseeker | Red finned missile with a pulsing sensor nose. | Curved exhaust follows its real steering; sensor brightens while tracking. |
| homing_worm | Homing Worm | Flexible purple segmented body whose sections follow the recent path. | Worm-like undulation; underground cues follow the real scheduled blasts. |
| beehive | Beehive | Amber honeycomb pod with a subtle internal flutter. | On contact it releases the actual nine striped bees, each with flapping wings. |
| pin_cushion | Pin Cushion | Rotating violet spiked ball. | At its real apex split, twelve slim needles fan outward. |
| laser | Laser | Razor-thin cyan beam with a white core and a brief pulse. | Straight instantaneous line, not a ballistic shell. |
| super_laser | Super Laser | Broad blue-white beam with distinct outer bands. | Much wider than Laser, with a stronger endpoint flare. |
| lightning_strike | Lightning Strike | Violet conductor capsule surrounded by short branching arcs. | Electrical flicker instead of fire; its marker calls the existing sky bolt. |
| space_laser | Space Laser | Cyan diamond beacon with a rotating orbit ring. | Crosshair pulses on landing before the existing vertical orbital beam. |
| nuke | Nuke | Olive bomb with tail fins and a bold dark trefoil-like marking. | Large bomb silhouette, restrained exhaust, slow body roll. |
| mega_nuke | Mega Nuke | Oversized black-and-yellow bomb with twin exhaust pulses. | Broad shoulders, twin wake, much bigger than Nuke. |
| comet | Comet | Bright white-blue nucleus with a very long flowing tail. | Smooth icy head and long continuous streamer. |
| meteor_shower | Meteor Shower | A small red meteor marker with a sparkling wake. | Its actual seven falling children become jagged dark rocks with short orange fire tails. |
| fireball | Fireball | A living orange flame mass with cycling flame lobes and embers. | No metal casing or rock center; the flame itself is the projectile. |
| volcano | Volcano | Cracked black lava pod with pulsing orange seams. | Molten droplets; after impact, its actual eruption children become glowing lava chunks. |
| jump_jets | Jump Jets | Blue-white thrusters beneath the airborne tank, with an expanding exhaust cone. | The tank flies; there is no separate projectile. |
| magic_wall | Magic Wall | Tumbling stone block with a cyan rune and tiny orbiting cubes. | Square silhouette; the existing wall is revealed as stacked rising blocks. |

## Rendering rules

- Shape, movement and trail should each contribute to recognition. Color alone is insufficient.
- Keep small projectiles readable against both the sky and earth: a dark silhouette around a bright core, with restrained bloom.
- Orient rigid projectiles using their actual velocity. Animate wheel spin, fins, flames, droplets and segmented bodies locally without changing collision paths, homing strength, launch speed, damage, child counts or timing.
- Trails follow real position history. Earth-entry and split effects align with actual state changes/events. Cosmetic particles never pretend to be damaging subprojectiles.
- Keep ground-stage behavior separate from flight. Do not draw a flying shell for Laser, Super Laser or Jump Jets.
- Cache artwork and cap decorative particles for phones. Reduced-motion mode keeps useful identity cues while reducing flicker and secondary motion.

## Optional future Flow artwork

The implemented projectile silhouettes are Canvas geometry. Flow could supply painted refinements in the style of the accepted scenery and explosions, starting with individual hero assets for the missile, iron ball, spinning disc, wheel, fire canister, ice capsule, soil clod, drill, worm, hive, lava pod and stone block. Keep trails, beam pulses, rotation, wheel spin, wings and physics-driven motion in code.

Do not request a single 36-weapon collage as the production atlas: extraction, consistent scale and frame registration would be difficult. Generate and inspect individual assets or small related sets. Verify real alpha transparency, clean padding and common anchors before packaging an animation atlas; the previous Flow JPEG exports did not contain alpha.

Suggested first comparison set: Single Shot, Cannon Ball, Skipper, Napalm, Heatseeker, Beehive, Comet and Fireball. These deliberately cover very different silhouettes and trails, so a side-by-side reel can reveal whether the new visual language works before all 36 are implemented.
