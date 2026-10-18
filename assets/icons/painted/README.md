# Painted weapon badges

All 36 weapon icons now use the saved Google Flow icon concepts. These are the existing Nano Banana 2.1 concept boards from `flow-concepts/2026-10-17/weapon-icons/`, reused without generating or modifying image pixels.

| Production file | Original Flow board | Weapons |
| --- | --- | --- |
| `classic.jpg` | `01-classic-cluster-kinetic.jpg` | Single Shot through Hail Storm, 12 badges |
| `terrain.jpg` | `02-earth-homing-swarms.jpg` | Dirtball through Pin Cushion, 12 badges |
| `energy.jpg` | `03-energy-cosmic-heavy.jpg` | Laser through Magic Wall, 12 badges |

The three JPEGs are byte-for-byte copies, 1376 × 768. Their SHA-256 hashes are recorded in `catalog.js` and verified by the tests. They are opaque illustrated boards, not transparent PNGs.

`catalog.js` maps each weapon to a square badge window. `icons.css` displays that window as a normal CSS background, excluding board labels and neighboring cells. Source files remain intact. Rounded dark badges and colored rims are part of the Flow artwork. The same component is used in the arsenal, guide, loadout picker, flight gallery and impact reel.

Each board is loaded once and enables its own painted badges after loading. Original APK icons remain local loading/error fallbacks. The images are decorative beside existing weapon names, so screen readers do not repeat labels. Mobile badge sizes and the existing selected/spent states are preserved.

No image editing, external request, runtime pixel extraction, extra library or generation service is required. Original concept notes remain in `flow-concepts/2026-10-17/weapon-icons/prompts.md` in the source workspace.
