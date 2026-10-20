# Theme refresh — "night battery"

The game shell used an olive/military-green palette (`#12160f` base, `#cdea92` lime accent).
Against the dusk battlefield art — navy sky, amber sun, brown soil — the whole page read as a
flat, slightly green wash, and every control sat on the same value. This pass re-skins the
chrome so the UI and the artwork speak the same language.

## The new palette

| Role | Token | Value | Used for |
| --- | --- | --- | --- |
| Page | `--bg` | `#0a0f1c` | Deep midnight indigo behind everything |
| Surface | `--panel` / `--panel-2` / `--panel-3` | `#141d31` → `#243252` | Chips, cards, dialogs, arsenal |
| Hairline | `--line` / `--line-soft` | `#2a3a5c` / `#212f4c` | Borders and separators |
| Primary | `--accent` | `#f5b95e` | Active states, CTA buttons, focus rings, slider fill |
| Primary soft / deep | `--accent-soft` / `--accent-deep` | `#d99a45` / `#9a6f2c` | Icons, meters, subtle markers |
| Cool secondary | `--sky` | `#63c9e8` | Player swatch, sky-cool labels |
| Opponent | `--coral` | `#ef8f72` | Rival swatch, rival chip |
| HUD glass | `--glass` / `--glass-line` | `rgba(9,16,30,.62)` / `rgba(178,205,255,.18)` | Overlays painted on the canvas |

The lime tokens (`--lime`, `--lime-soft`, `--lime-deep`) and the `.button-lime` class were
retired; `--accent*` and `.button-accent` replace them in `index.css`, `index.html`,
`effects-preview.html` and `flight-preview.html`.

## What changed visually

- **Chrome** — every olive surface (header, match bar, arsenal, console, dialogs, footers,
  `kbd` chips, form fields) moved to layered navy gradients with hairline borders.
- **Hierarchy** — the amber accent now marks exactly one thing at a time: the active nav
  tab, the selected weapon, the active turn card, the CTA. The hot-orange **FIRE** button
  stays the warmest object on screen, so the primary action still wins.
- **Depth** — the page background gained two low-opacity radial washes (cool blue top-right,
  warm ember bottom-left), the header carries a thin amber-to-cyan light seam, and panels
  gained soft drop shadows instead of flat fills.
- **Battlefield** — the frame now emits a faint blue bloom; the canvas HUD glass is cooler
  and more transparent, so it reads as glass over the dusk sky.
- **Battlefield art** — the neon grass rim was softened (`150,186,82`), the grass blades
  warmed (`#c3d67f`), the player tank changed from olive to steel blue (`#a7d3ea`/`#3d6f8d`)
  and the tracks are slate instead of olive, so the green no longer fights the amber sky.
- **Galleries** — `effects-preview.html` and `flight-preview.html` were retinted from their
  green-teal accents to the same navy/amber scheme, since they already load `index.css`.

## Verification

`tools/inspect.cjs` over the DevTools protocol, against `npm start`:

- 1440×900, 820×1180 and 390×844: no horizontal overflow, no console errors.
- Fire → impact → opponent turn: score, volley counter and turn banner all update.
- Dialogs (match setup, arsenal catalog), the flight gallery and the impact reel all render
  in the new scheme.

`npm test` (24 tests) and `npm run check` still pass.

Screenshots: `qa/theme-before.png`, `qa/theme-after.png`, `qa/theme-after-phone.png`,
`qa/theme-after-catalog.png`, `qa/theme-after-flight-gallery.png`.
