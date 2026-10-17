# Painted projectile verification — 17 October 2026

Implemented Heatseeker, Digger, Beehive, Comet and Fireball with the production projectile renderer, using six original RGBA generated images. The corresponding Flow boards were references; production transparent sprites were generated with the built-in imagegen tool. See `assets/projectiles/painted/PROMPTS.md`.

## Automated checks

- `npm test`: 19 passing tests, including every actual weapon flight and secondary behavior resolving through the integrated renderer. The five painted body branches use decoded-image stand-ins to inspect Canvas calls in Node.
- `npm run check`: eight JavaScript files checked, including the sprite manifest.
- Source inspection confirms real alpha, transparent gutters, unclipped solid bodies and valid source windows. SHA-256 tests protect unmodified PNG sources.
- Painted body checks cover left/right/down/zero velocity, finite destination geometry, stable frame pivots, all four drill/flame poses, reduced-motion holds and Canvas-state restoration.
- Missing assets, disabled painted artwork, partially loaded Digger parts and released bees exercise the original geometry fallback.

## Browser checks

- The five-design gallery loads in the in-app browser at `flight-preview.html?art=painted`, with painted artwork enabled by default. All five composite cleanly over the scenery without rectangular backgrounds.
- Desktop at 1360 × 1000: all five are visible together. See `painted-projectiles-desktop.png`.
- The original-art comparison changes the bodies while preserving the inspection path. See `painted-projectiles-original-comparison.png`.
- Secondary view preserves Beehive's nine winged bees and Digger's downward orientation. See `painted-projectiles-secondary.png`.
- Narrow viewport at 390 × 844, game-size 1× artwork: Comet, Fireball and Beehive remain distinct; document width and scroll width are both 375 CSS pixels, with no horizontal overflow. See `painted-projectiles-phone.png`. Actual small game canvases additionally enlarge bodies using the existing readability rule.
- An isolated `localhost:5173` practice session fires the painted Fireball through the real game engine and returns control for another shot. See `painted-fireball-live.png`. No console errors were reported in that session. The user's `127.0.0.1:5173` save was not used for test shots.

Screenshots are actual browser captures. The gallery paths are illustrative; live matches use the existing physics. Node checks exercise all 36 real flights; browser visual inspection covers the five-design gallery plus a live Fireball shot.
