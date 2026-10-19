# Pocket Tanks — Browser Edition

A playable browser adaptation built from the supplied APK dump, with a new responsive interface and an independent JavaScript artillery engine.

## Play

Open `index.html` directly in a modern browser. Everything needed for the game is local; there are no downloaded libraries, accounts or build steps.

For the most consistent audio and save behavior, run:

```sh
npm start
```

Then open **http://127.0.0.1:5173**. Node 18 or newer is sufficient; `npm install` is not needed. On Windows, `Start-Game.cmd` runs the same server. Keep that window open while playing.

## Included

- Solo battle against Scout, Ranger or Veteran, with ballistic aiming that accounts for wind and terrain.
- Local two-player pass-and-play matches, with independent controls, inventories and scores.
- Unlimited target practice with 36 selectable weapons.
- Classic 10-volley matches and quick 5-volley matches; points decide the winner.
- Optional weapon selection before a match, including a separate arsenal for each local player.
- Destructible bitmap terrain, settling soil, dirt-building weapons, blast knockback and four landscapes.
- Shells, spreads, bounces, rollers, digging blasts, tunneling explosions, fire, homing bees, airbursts, lasers, orbital strikes, nuclear clouds, meteor showers and jump jets.
- Original sound effects, music and tank artwork recovered from the supplied assets; original weapon icons retained as loading/error fallbacks.
- Painted Flow badges for all 36 weapons, shared across the arsenal, guide, loadout picker and preview pages, with distinct colorful silhouettes at desktop and phone sizes.
- Vivid native palette-band blasts, timed nuclear layers, 126 recovered animation frames, glowing trails, fire, impact debris and original weapon-specific impact sounds.
- Flow-painted dusk scenery, warm layered soil and animated sculpted fireballs, with the existing weapon-specific beams, nuclear plumes, debris and opaque smoke.
- Recognizable projectile silhouettes and trails for all 36 weapons: spinning discs/wheels, piston hammers, drills, worms, winged bees, ice crystals, lava pods, distinct bombs, icy comets and living fireballs. Jump Jets puts blue-white thrusters on the airborne tank.
- Painted transparent artwork for Heatseeker, Digger, Beehive, Comet and Fireball, adapted from the Flow concepts. Digger has a four-phase drill tip and Fireball has four flame poses; moving exhaust, icy trails and released bees remain animated.
- Individual impact reactions informed by the APK scripts: native palette colors, shrapnel, drilling faces, soil splashes, tiny stings, electrical sparks, burning liquid and molten rock. The existing Nuke and Mega Nuke appearance is preserved.
- Touch aiming, keyboard controls, pause, fullscreen, sound/music toggles and optional aim guide.
- A local save at the start of each turn. Reloading during a shot restores the beginning of that turn. Browser storage availability varies in private mode and with `file://` pages.
- A rebuilt game shell: compact match bar, one glass HUD language over the battlefield, a 10 px minimum type size, 20 px slider thumbs, 1–9 weapon shortcut badges, a **FIRE** button that shows the weapon it will launch, and a battlefield that keeps its proportions on every screen instead of squashing on phones. See `qa/UI_UX_OVERHAUL.md`.

## Controls

| Action | Control |
| --- | --- |
| Aim | Drag away from your tank, or use the angle slider |
| Angle | Left / right arrows (hold Shift for larger steps) |
| Power | Up / down arrows (hold Shift for larger steps) |
| Fire | Space or the fire button (it shows the loaded weapon) |
| Move | A / D; four moves per tank per match |
| Select loadout slot | 1–9, or click a weapon |
| Aim guide | G |
| Pause | P or Escape |
| Sound | M |
| Fullscreen | F |
| Instructions and music | H or ? |

The guide previews only the first part of a normal ballistic path. Special weapon behavior takes over after launch or impact. A laser uses angle only. There are no health bars: tanks persist until the final volley, enemy hits award points, and self hits deduct points.

## Implementation and limits

This is a browser recreation, not an execution or translation of the native ARM engine. Weapon behavior and visual effects are independently implemented and tuned for the browser. The APK contains 407 weapon entries; **36 are implemented here**. The complete native trigger language, every pack, native online multiplayer and native replays are not implemented. The UI’s “two players” mode uses one shared device.

`game-core.js` owns the fixed-step physics, bitmap terrain, scoring, inventories and turn state. `browser-game.js` owns the battlefield, audio, input, computer turns and interface. `weapon-fx.js` renders weapon effects using recovered recipes and palette data in `native-effects.js`; `projectile-art.js` supplies the 36 flight identities, moving parts and trails. `weapons.js` contains the weapon catalog. The app works without a server because it uses ordinary scripts and local media, rather than module fetches.

`assets/vfx/impact-art.js` supplies the individual impact presentation from the expanded native audit. The existing nuclear drawing path remains in `weapon-fx.js`.

Open **http://127.0.0.1:5173/effects-preview.html** (or the local `effects-preview.html`) to inspect all 36 impact reactions. Search/filter, use **Hold impact**, and choose contact, burst, reaction, follow-up or aftermath. Each preview starts at contact and uses the production effects, actual secondary projectiles and destructible terrain. Only visible cards simulate and draw.

Open **http://127.0.0.1:5173/flight-preview.html** to compare all 36 flight identities. Search/filter, hold a flight, switch between enlarged and game-size artwork, and inspect the secondary stages. The gallery uses illustrative paths with the production renderer; actual matches use the real physics. The weapon guide links to the flight gallery, which also links to the impact reel. Small game canvases enlarge projectile bodies for readability without changing collision geometry.

Open **http://127.0.0.1:5173/flight-preview.html?art=painted** for the five painted designs. Switch the artwork selector to compare them with the original silhouettes. The painted artwork is enabled by default in actual games, with a Canvas fallback while images load or if an asset is unavailable. Details and exact generation prompts are in `assets/projectiles/painted/`.

The local server exposes only the browser files and `assets/`. APKs, signing files and decompiled sources are outside its public routes. It binds to the local machine only.

## Verify

```sh
npm test
npm run check
```

The 24 tests cover deterministic terrain, progressive crater opening, wind-aware aiming, scoring, all 36 weapons resolving, complete matches, inventory consumption, movement, saves, native recipes, effect identity, bounded particles and canvas-state restoration. Flight checks cover distinct silhouettes, every direction, secondary projectiles, reduced motion, phone scaling and all 36 real shots resolving through the renderer. Painted artwork and icon checks cover source hashes, frames, all 36 badge windows and loading fallbacks. Impact checks cover the expanded source audit, all 36 drawing signatures, native shrapnel/terrain/child effects, airburst context and unchanged nuclear drawing commands at six ages for each Nuke.

## Assets and packaging

See `ASSET_NOTES.md` for provenance. `python tools/export_assets.py` regenerates the base asset set and `python tools/export_native_fx.py` regenerates the recovered visual recipes, animation atlases and impact sounds (requires Pillow and the supplied source dump). `python tools/package_game.py` creates `dist/pocket-tanks-browser.zip`, containing only the playable browser build, effects reel, server and documentation.

`python tools/inspect_native_impacts.py` follows all reachable native impact block types for the 36 weapons, including shrapnel, cruisers, fire and terrain tools. It writes the complete audit in `qa/` and the compact runtime evidence in `assets/vfx/native-impact-recipes.js`. `qa/IMPACT_REACTIONS.md` records how those cues map to the browser presentation. Native command counts, damage and movement are still interpreted by the independent browser engine, not executed as native code.

`node tools/inspect.cjs <url> <width> <height> <png> <script.js>` drives headless Chrome over the DevTools protocol. It reports console errors, evaluates a script in the page and captures a clipped region, which is how the responsive layout and the canvas HUD were checked. `qa/UI_UX_OVERHAUL.md` records what changed and why.

The impact revision is also packaged as `dist/pocket-tanks-browser-impact-update.zip`. Rebuild it with `python tools/package_game.py --output pocket-tanks-browser-impact-update.zip`.

The earlier simulator is preserved in `legacy-simulator/`. Original APK/decompiled inputs remain in place.
