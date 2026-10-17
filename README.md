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
- Original weapon icons, sound effects, music and tank artwork recovered from the supplied assets.
- Vivid native palette-band blasts, timed nuclear layers, 126 recovered animation frames, glowing trails, fire, impact debris and original weapon-specific impact sounds.
- Flow-painted dusk scenery, warm layered soil and animated sculpted fireballs, with the existing weapon-specific beams, nuclear plumes, debris and opaque smoke.
- Recognizable projectile silhouettes and trails for all 36 weapons: spinning discs/wheels, piston hammers, drills, worms, winged bees, ice crystals, lava pods, distinct bombs, icy comets and living fireballs. Jump Jets puts blue-white thrusters on the airborne tank.
- Painted transparent artwork for Heatseeker, Digger, Beehive, Comet and Fireball, adapted from the Flow concepts. Digger has a four-phase drill tip and Fireball has four flame poses; moving exhaust, icy trails and released bees remain animated.
- Touch aiming, keyboard controls, pause, fullscreen, sound/music toggles and optional aim guide.
- A local save at the start of each turn. Reloading during a shot restores the beginning of that turn. Browser storage availability varies in private mode and with `file://` pages.

## Controls

| Action | Control |
| --- | --- |
| Aim | Drag away from your tank, or use the angle slider |
| Angle | Left / right arrows (hold Shift for larger steps) |
| Power | Up / down arrows (hold Shift for larger steps) |
| Fire | Space or the orange fire button |
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

Open **http://127.0.0.1:5173/effects-preview.html** (or the local `effects-preview.html`) to watch the effects reel. Use **Hold impact** to inspect six weapon effects side by side.

Open **http://127.0.0.1:5173/flight-preview.html** to compare all 36 flight identities. Search/filter, hold a flight, switch between enlarged and game-size artwork, and inspect the secondary stages. The gallery uses illustrative paths with the production renderer; actual matches use the real physics. The weapon guide links to the flight gallery, which also links to the impact reel. Small game canvases enlarge projectile bodies for readability without changing collision geometry.

Open **http://127.0.0.1:5173/flight-preview.html?art=painted** for the five painted designs. Switch the artwork selector to compare them with the original silhouettes. The painted artwork is enabled by default in actual games, with a Canvas fallback while images load or if an asset is unavailable. Details and exact generation prompts are in `assets/projectiles/painted/`.

The local server exposes only the browser files and `assets/`. APKs, signing files and decompiled sources are outside its public routes. It binds to the local machine only.

## Verify

```sh
npm test
npm run check
```

The 19 tests cover deterministic terrain, progressive crater opening, wind-aware aiming, scoring, all 36 weapons resolving, complete matches, inventory consumption, movement, saves, native effect recipes, effect event identity, bounded particles, clean Flow frame selection and canvas-state restoration. Flight checks cover distinct silhouettes, left/right/vertical/zero velocity, secondary projectiles, reduced motion, phone readability scaling and all 36 real shots resolving through the integrated renderer. Painted artwork checks verify RGBA sources and hashes, source windows, velocity alignment, stable frame anchors, all four flame/drill poses, image-loading fallbacks and preservation of released bee artwork.

## Assets and packaging

See `ASSET_NOTES.md` for provenance. `python tools/export_assets.py` regenerates the base asset set and `python tools/export_native_fx.py` regenerates the recovered visual recipes, animation atlases and impact sounds (requires Pillow and the supplied source dump). `python tools/package_game.py` creates `dist/pocket-tanks-browser.zip`, containing only the playable browser build, effects reel, server and documentation.

The earlier simulator is preserved in `legacy-simulator/`. Original APK/decompiled inputs remain in place.
