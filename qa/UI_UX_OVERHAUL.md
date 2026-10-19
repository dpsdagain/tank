# UI/UX overhaul — browser edition

A full pass over the game shell: layout, hierarchy, legibility, touch ergonomics and
the battlefield render itself. `index.html`, `index.css` and `browser-game.js` changed;
`game-core.js` (physics, terrain, scoring) and every weapon/effect module are untouched.

## Problems that were fixed

| # | Problem | Fix |
| --- | --- | --- |
| 1 | A 110 px marketing hero pushed the battlefield below the fold on a 900 px screen | The hero became a 60 px **match bar** that carries real state: mode, volley count, rival and difficulty, plus a **Change setup** control |
| 2 | Body and label text ran at 6–8 px in eleven places | A type scale with a **10 px floor** for micro labels and 12–13 px for body copy |
| 3 | Two visual languages over the canvas — opaque cream player chips beside dark glass HUD chips | One **glass** treatment (`--glass` / `--glass-line`) for every canvas overlay: player cards, volley, turn banner, field tools and the wind pill |
| 4 | The arsenal panel had an ~80 px void in the middle (`margin-top:auto` on the detail block) | The selected-weapon card moved directly under the grid; only the guide button pins to the bottom |
| 5 | The **FIRE** button did not say what it was firing | The button now carries the **selected weapon's painted icon and name**, and its `aria-label` names the weapon |
| 6 | The phone scoreboard overflowed the viewport (opponent score clipped) | The cards flex and shrink, the status line ellipsizes, and the swatch is dropped below 400 px |
| 7 | Keyboard shortcuts were undocumented in the running UI | Each weapon shows its **1–9 shortcut badge**; the footer lists the shortcuts; the help dialog explains them |
| 8 | Range sliders had 4 px tracks and 12 px thumbs | 8 px tracks, **20 px thumbs**, five angle ticks and three power ticks; the value sits beside its label |
| 9 | The mobile battlefield was **35 % vertically squashed** | The renderer maps the fixed 1200×600 world with a uniform transform; extra frame height becomes **sky above the world** instead of a squashed landscape |
| 10 | The canvas was a fixed 1200×600 bitmap, so it looked soft on HiDPI screens | The backing store now matches the CSS box × device pixel ratio (capped at 2×) |
| 11 | Tank names and score popups were unreadable on a phone | Canvas lettering is **screen-constant** (`Renderer.px`) while the world still scales |
| 12 | The landscape dropdown was truncated in the match dialog | The dialog has a fixed width and the form row was widened |
| 13 | The turn banner sat on top of the tank labels on a phone | The banner moved under the scoreboard; the field tools moved clear of the opponent card |
| 14 | The wind reading was low-contrast text in a corner | The wind indicator is now a glass pill with a larger value |

## Structure

```
header        brand · mode nav · help/sound · New match
match bar     title · mode chip · volley chip · rival chip · Change setup
game layout   battle station (1fr)  |  arsenal panel (320 px)
                battlefield  — canvas + glass HUD
                firing console — angle | power | FIRE (weapon icon + name)
                under console — reposition cluster · aim hint
              arsenal panel
                heading · inventory grid · selected weapon card · guide button
footer        field note (rotating tip) · keyboard shortcuts · save indicator
```

## Responsive behaviour

| Width | Layout |
| --- | --- |
| ≥ 1500 px | 344 px arsenal, roomier console |
| 1240–1500 px | 320 px arsenal |
| 1000–1240 px | 280 px arsenal, tighter console |
| 720–1000 px | Arsenal moves below the battlefield; inventory reflows with `auto-fill/minmax(146px,1fr)` |
| ≤ 720 px | Segmented mode nav, icon-only change-setup button, stacked console, 5-column weapon grid, 1.55:1 battlefield frame |
| ≤ 400 px | 4-column weapon grid, compact HUD |

## Canvas view transform

`browser-game.js` keeps a `view` object (`scale`, `ox`, `oy`, `dpr`) recomputed by
`fitCanvas()` on load, on window resize, on orientation change and through a
`ResizeObserver` on the canvas.

- `scale = frameWidth / 1200` — the full world width is always visible, so a tank is never cropped.
- `oy = frameHeight - 600 * scale` — the world is bottom-anchored, so the ground stays at the bottom of the frame.
- The band above the world is filled with a gradient sampled from the sky's top row, so the seam is invisible.
- `pointerAim()` converts pointer coordinates through the same transform, so dragging to aim still works.
- `Renderer.px(size)` converts a screen-pixel size into world units for canvas lettering.

The physics and collision code are unchanged: they still work in the 1200×600 world space.

## Verification

`tools/inspect.cjs` drives headless Chrome over the DevTools protocol for layout checks.

```sh
node tools/inspect.cjs http://127.0.0.1:5173/ 390 844 out.png script.js
```

It reports console errors and warnings, can evaluate a script in the page, and can capture a
clipped, scaled region for pixel-level inspection of the HUD.

Checked at 1440×900, 820×1180 and 390×844: no horizontal overflow, no console errors, and the
flow through Battle → Target practice → Two players → fire → pause → weapon guide.
`npm test` (24 tests) and `npm run check` still pass.
