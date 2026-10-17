# Weapon effects revision

The previous renderer used a single soft radial gradient for almost every explosion. Its pastel colors, short trails and sparse round particles did not preserve the visual structure in the native scripts.

The revision reads the supplied native weapon lists and bitmap banks and implements:

- Original indexed game colors and 12-band expanding circular blasts.
- Nuclear draw stages at 0/200/400/600 ms, scaled to the existing browser blast radius.
- 126 recovered animation frames for native fireballs, meteors, comets, missiles, flames and smoke.
- Weapon identity on every physics event, including scheduled and child impacts.
- Strong trails, heated cores, layered beams and lightning, debris, sparks, smoke, ground shockwaves, lingering fire and nuclear plumes.
- Craters opening in six steps over 210 ms, alongside the expanding effect.
- Native impact sounds selected from the visual recipe, with large-blast timing retained long enough to see the impact.
- A darker, more saturated battlefield, readable contrasting HUD and luminous grass edge.
- A shared effects reel at `effects-preview.html`; its animation is the same implementation used in the game.

`node --test tests/game.test.cjs tests/effects.test.cjs`: 11 passing checks. Tests include native colors and nuclear timing, original atlas presence, progressive carving, weapon identity, all families rendering finite coordinates, particle limits and the existing match rules.

Browser checks cover the live reel, nuclear shots in actual target practice on desktop and phone layouts, and console errors. The phone viewport was 390 × 844 with 375 px content width, no horizontal overflow and no console errors. The gameplay test runs on port 5174, separate from the user's saved game on 5173.
