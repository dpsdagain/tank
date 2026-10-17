# Browser game verification

Verified on 17 October 2026.

## Automated

`npm test`: **11 passed, 0 failed**, including the native weapon effects revision described in `NATIVE_EFFECTS.md`.

The checks exercise all 36 weapon turns, a complete 20-shot local match, deterministic terrain, craters, additive soil, wind-aware aiming, score rewards and penalties, finite tank positions, inventories, movement limits and save restoration. Additional regression checks cover soil burying a tank without lifting it and a heatseeker steering into its target.

`npm run check`: JavaScript syntax validation passes.

## In-browser

- Solo player fired; computer aimed, returned a shot, earned points and passed control back for volley 2.
- Reload preserved the second volley, score and spent weapon.
- Target practice launched; weapon catalog search found Mega Nuke, equipped it, fired it and awarded 96 points.
- Local match setup selected five volleys; both players independently drafted five weapons. Player 1 fired and Player 2 received control with a separate five-weapon inventory.
- Keyboard angle adjustment updated the value; pause disabled controls and resume restored them.
- Phone viewport (390 × 844) displayed working controls without horizontal page overflow; loaded weapon images had no failures.
- Browser console checks showed no errors or warnings during the tested flows.

Screenshots are in this directory. The final preview is left at a fresh solo battle.

The full native engine and the remaining APK weapon entries are outside this browser implementation. Physics checks verify the browser model, not binary parity with the ARM engine.
