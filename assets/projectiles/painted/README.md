# Painted projectile artwork

Five production flight designs adapted from the user's Google Flow concept boards. The boards remain in `flow-concepts/2026-10-17/weapon-flights/` in the source workspace. These transparent derivatives were generated with the built-in imagegen tool, using those boards as references; they are not Flow exports. Exact prompts and references are in [PROMPTS.md](PROMPTS.md).

| Weapon | Artwork | Animation |
| --- | --- | --- |
| Heatseeker | `heatseeker.png` | Painted red sensor missile; live exhaust and velocity orientation |
| Digger | `digger-parts.png`, `digger-tip-4.png` | Separate motor and four-phase drill tip, 16 frames per second |
| Beehive | `beehive.png` | Painted amber hive with gentle wobble; released bees retain animated wings |
| Comet | `comet.png` | Painted icy nucleus with a live blue/white history trail and glint |
| Fireball | `fireball-4.png` | Four painted flame poses, 12 frames per second, anchored at the leading core |

All six PNGs have real RGBA transparency. Source PNGs are copied unchanged from imagegen output. There is no baked scenery, label, chroma-key removal or screen compositing. `asset-inspection.json` records dimensions, alpha statistics, source windows and SHA-256 hashes. The source windows retain soft alpha edges while body bounds determine stable display sizes and pivots.

`manifest.js` loads before `projectile-art.js`. The renderer shares decoded images across instances, draws the five painted bodies by default, and uses the original Canvas silhouette while an image loads or if loading fails. Digger switches only when both parts are ready. The other 31 flight designs retain their existing Canvas artwork. Position, velocity, collision, homing, splits, damage and terrain remain in the existing physics engine.

`python tools/inspect_painted_projectiles.py` inspects alpha and regenerates metadata; it never rewrites image pixels. It requires Pillow for inspection only. The game itself has no new runtime dependency or external service calls and works with local files.

Open `flight-preview.html?art=painted` to see the five designs together. The artwork selector compares painted and original renderers; size and secondary-stage controls remain available. The game uses the same projectile renderer.
