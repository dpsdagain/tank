# Asset provenance

The supplied project identifies the original game as **Pocket Tanks HD 3.0.0**, package `com.blitwise.ptankshd`, by Michael P. Welch / BlitWise. Its readme credits the music to Eliran Ben-Ishai (Chronoton / DNA-Groove).

The browser adaptation uses these existing local inputs:

- `t5_work/decrypted_weaps/*.txt`: names, descriptions, pack names, icon identifiers and reference explosion parameters for the 36 implemented weapons. These text files were already present in the workspace.
- `decompiled/resources/assets/icons128.bbk` + `icons128.dat`: 36 original weapon icons, exported to PNG in `assets/icons/`.
- `hdmultires_art.bbk` + `.dat`: the original logo, preserved as `assets/logo.png`.
- `native_art.bbk` + `.dat`: grayscale tank sprite, used as a texture layer on the rendered tanks.
- `weapdata/cannon.ogg`, weapon explosion sounds and `sfx/`: original launch, impact, selection, button and bounce sounds.
- `music/ingame.m4a`: optional original soundtrack, disabled by default.
- `fonts/Lato-Bold.ttf`: bundled font, used locally without external font services.

`tools/export_assets.py` reads the bitmap bank metadata, decodes its existing reversible format, and exports the relevant images using their native color masks and palette. It does not alter APKs, purchases, account state or native executable files.

The destructible terrain, tank geometry, aim guide, particles, smoke, beams, interface and browser physics are generated in code. The default scenery and fireball artwork now use the Flow assets described below; the procedural sky remains a loading/error fallback. The implementation has 36 distinct selectable weapons across shared behavior families. Native weapon script metadata is preserved for reference; runtime tuning is explicitly separate in `game-core.js`.

## Native weapon effects revision

`tools/export_native_fx.py` additionally reads the original `TRIGGER`, `BULLET` and `EXPLOSION` blocks, the weapon emitter XML, and the game palette (palette 1 in `native_art.bbk`). `native-effects.js` preserves the source palette, draw direction, color-band count, explosion-stage delays, emitter colors and speeds, animation identifiers and sound references.

Examples carried into the renderer include Single Shot's color 235 (`#ff007b`) with 12 descending color bands, Big Shot's color 28 (`#ff3838`), and Nuke/Mega Nuke's orange/yellow/black/gray layers at 0, 200, 400 and 600 milliseconds. The browser renderer scales these visual recipes to its existing physics radii. For behavior-driven triggers that do not reduce to a simple explosion list, it uses the weapon's source impact color where available and its browser behavior family for the remaining effect.

126 original frames from `weapons.bbk`/`weapons.dat` are packaged into six atlases in `assets/vfx/`: fireball (30), meteor (30), comet (25), missile (8), flame (24) and smoke (9). These are rendered directly; native smoke frames are layered over procedural volumetric smoke. Native `exphuge`, `explong`, `expmedium`, `expmedium2`, `expshort` and `expshort2` impact sounds are bundled.

`weapon-fx.js` supplies the shared palette-band blasts, original animated sprites, sparks, smoke, debris, beams, shockwaves and layered nuclear plume. `effects-preview.html` uses this same renderer for its live weapon reel. The source recipes inform this recreation; it does not execute the original ARM rendering code.

Game assets remain the property of their respective owners. This project records provenance; it does not change the assets’ ownership or grant redistribution rights.

## Flow artwork integration — 17 October 2026

The user requested artwork generation in their Google Flow project, then integration into the playable game. The model displayed by Flow was Nano Banana 2.1. Exact generation prompts and original exports are retained in `flow-concepts/2026-10-17/` in the source workspace.

- `assets/art/flow-scenery.jpg` is a byte-for-byte copy of `scenery-layer.jpg` (1376 × 768). It is drawn behind live, destructible terrain. Its original visible Flow mark is preserved; terrain can expose it after large craters.
- `assets/vfx/flow-explosion.jpg` is a byte-for-byte copy of the 1024 × 1024, four-by-four `explosion-sheet.jpg`. Only the first seven clean fire frames are sampled. The eighth frame touches its cell edge; the later smoke and marked final cell are not used as animation frames. The source sheet remains intact.
- The JPEG has no alpha channel. The fire is deliberately rendered with Canvas `screen` blending, rather than treated as transparent artwork. Dark smoke, dirt and sparks are rendered separately by the existing effects engine. Lasers, lightning, dirt weapons, drills and nuclear mushroom geometry retain their own effects. If either new image fails to load, the game falls back to its procedural scenery/native blasts.

No runtime image extraction, pixel reads, external requests or image libraries are needed. The playable ZIP contains both artwork files and these provenance notes.

## Projectile identity revision

`projectile-art.js` draws the 36 flight identities using original Canvas geometry. These silhouettes are newly authored browser artwork: shells, needles, iron spheres, discs, wheels, liquid canisters, ice, soil clods, mechanical pistons, augers, segmented worms, honeycomb/bee bodies, bombs, electrical beacons, lava, runed stones and jet exhaust. The existing Flow scenery and impact artwork remain in use; no new generated media was required for this revision.

Trails follow actual projectile history; animated geometry uses age/velocity without mutating the projectile. The existing child, rolling, homing, split and tunneling events drive the secondary cues. Continuous jet exhaust follows the actual airborne tank. The app enlarges silhouettes on small game canvases for visibility while keeping the original collision and damage calculations. `flight-preview.html` provides an illustrative comparison gallery using this same renderer.

## Painted projectile integration — 17 October 2026

The user approved integrating the first five designs from the Flow flight concept boards: Heatseeker, Digger, Beehive, Comet and Fireball. Those original Flow boards contain labels and backgrounds and remain reference artwork. The six production PNGs in `assets/projectiles/painted/` were generated with the built-in imagegen tool using the corresponding Flow boards as references, with true alpha transparency requested explicitly. Digger's additional four-phase tip sheet references its generated parts sheet. These derivative PNGs are imagegen output, not downloads from Flow. Exact prompts and references are retained in `assets/projectiles/painted/PROMPTS.md`.

All six RGBA PNGs are retained byte for byte. `tools/inspect_painted_projectiles.py` reads alpha to record per-frame draw windows and solid body bounds without editing source pixels. `asset-inspection.json` includes dimensions, alpha statistics and SHA-256 hashes. A generated `manifest.js` gives the runtime source windows, world sizes and animation rates. No pixel readback, background-removal library or external service is used at runtime.

`projectile-art.js` now renders these five bodies with normal alpha compositing, rotates them with actual velocity, attaches live exhaust/trails and animates Digger's tip and Fireball's four flame poses. Beehive's split projectiles retain their existing animated bee bodies. The original silhouettes remain loading/error fallbacks and are available for comparison in the gallery. Images are shared across renderer instances. This revision changes flight presentation only; the existing physics, impact effects and all other 31 flight identities remain in use.

## Painted icon integration — 17 October 2026

All 36 weapon badges now use the existing Flow icon concepts from `flow-concepts/2026-10-17/weapon-icons/`. The three original Nano Banana 2.1 boards are copied byte for byte into `assets/icons/painted/` as `classic.jpg`, `terrain.jpg` and `energy.jpg`. No new images were generated for this revision. Their SHA-256 hashes and display windows are recorded in `catalog.js`.

The shared `WeaponIcons` component displays only each illustrated badge window using CSS background positioning; board labels and neighboring cells remain outside that window. It does not edit, crop/export or remove backgrounds from source image files. The arsenal, guide, drafting picker, flight gallery and impact reel all use this component. The original recovered PNG icons remain in place as loading/error fallbacks. These decorative badges accompany existing accessible weapon names. Full details are in `assets/icons/painted/README.md`.

## Weapon impact correction — 18 October 2026

The earlier general Flow fire overlay masked native impact colors and structures on many weapons. `tools/inspect_native_impacts.py` now walks the reachable native block graph for all 36 weapons, including `SHRAPNEL`, `CRUISER`, `FIRE`, `SUPERBALL`, `DIRTBALL`, `DIRTSLINGER`, `DIRTMOVER`, `ZAPPER`, `MAGICWALL` and nested bullet/trigger references. The earlier exporter only collected a small subset of block types. Full source evidence is retained in `qa/native-impact-audit.json`, with a readable overview in `qa/native-impact-audit.txt`; compact evidence is packaged in `assets/vfx/native-impact-recipes.js`.

`assets/vfx/impact-art.js` interprets these source cues as browser presentation. Classic palette bursts retain their native indices; sniper/cannon/laser hits use shrapnel or endpoint sparks, terrain weapons use soil or digging effects, bee hits use small stings, and elemental/cosmic weapons use their own particle shapes and reaction structures. Only Fireball and the preserved nuclear effects use the general painted Flow fire. Available native impact sounds are selected from the expanded graph. The renderer adds interpretation for readability; it does not execute the native trigger language or claim exact APK parity.

Nuke and Mega Nuke remain on the existing renderer, with unchanged nuclear recipes, sounds, Flow fire treatment, mushroom geometry, shockwave and effect lifetimes. Drawing-command fixtures captured before this correction verify both nuclear effects at six ages each. This revision changes presentation and adds child/airburst metadata to impact events; it retains the existing damage, projectile counts, weapon tuning, movement and terrain rules. The impact gallery now compares all 36 reactions using real browser secondary projectiles and terrain in isolated simulations.
