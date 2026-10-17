# Weapon flight identity verification — 17 October 2026

Implemented all 36 flight identities in `projectile-art.js` and integrated them through `WeaponEffects.drawProjectile()`. The same renderer supplies the production game, impact reel and new flight gallery.

## Behavior

- Shells, needles, iron balls, spinning discs, rotating wheels/drums, fuse capsules, fire canisters, ice, soil clods, mud, pistons, drills, worms, hives/bees, spikes/needles, conductors, beacons, bombs, icy comets, fiery meteors, living flames, lava and runed stone have distinct silhouettes and motion.
- Existing projectile positions, trails, velocities, child states and rolling states drive the artwork. Laser/Super Laser remain beams. Jump Jets has continuous blue-white exhaust attached to the actual airborne tank.
- Tunneling/drilling surface cues align with existing explosion events; wall construction highlights align with the wall's existing dirt event.
- Decorative trails and particles remain capped. The reduced-motion pose suppresses wing/disc/piston flicker while retaining identity. Small game canvases enlarge body geometry by up to 2× for readability; collisions and damage use the unchanged game engine.
- No new generated media, runtime downloads or image processing are needed. Existing Flow scenery/impacts are retained.

## Checks

- `npm test`: **15 passing tests**. New coverage checks all 36 catalog entries, materially distinct drawing geometry, canvas state restoration, nonmutation of physics projectiles, left/right/vertical/zero velocity, parent/child art, reduced motion and phone readability scaling.
- All 36 actual `PocketCore.Battle` shots resolve through the integrated renderer, including the real bee, needle, hail, meteor and lava children and both rolling weapons. Roller fixtures use a landing away from the target so rolling is exercised before collision.
- `npm run check`: all seven runtime JavaScript files pass syntax checks.
- Browser gallery checks: all 36 entries present; family filters and empty search state work; primary and secondary stages inspected, including the hive/bee transition and separate Nuke/Mega Nuke/Comet/Meteor designs. Console: no errors or warnings.
- A 390 × 844 phone viewport was checked. The gallery's content width and scroll width both measured 375 px, with no horizontal overflow. Temporary viewport override was reset.
- The saved main game was refreshed at an aim phase: score 103, practice shot 8 and Napalm selection were retained. Console: no errors or warnings.

Screenshots: `weapon-flights-special.jpg`, `weapon-flights-secondary.jpg`, `weapon-flights-heavy.jpg`, `weapon-flights-phone.jpg`.

The gallery paths illustrate the artwork and are labeled as such; they are not a ballistic prediction. Physical mobile-device frame rates have not been measured.
