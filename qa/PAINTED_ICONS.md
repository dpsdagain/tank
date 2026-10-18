# Painted weapon icon verification — 17 October 2026

- Replaced the default badge artwork for all 36 implemented weapons using the three existing Flow icon boards. Source JPEGs are unmodified and bundled locally.
- `npm test`: 20 passing tests. The new coverage checks all 36 unique badge windows, valid source bounds, unchanged board hashes, decorative markup and retained original fallback icons.
- `npm run check`: nine JavaScript files, including the new shared icon catalog.
- In the browser, the guide contained exactly 36 painted badges. The document showed all three successful board-load markers. Default arsenal, classic/cluster, terrain and heavy badges were inspected over the real game UI.
- Desktop proof: `painted-icons-arsenal.png`, `painted-icons-guide.png`, `painted-icons-terrain.png` and `painted-icons-heavy.png`.
- Phone check at 390 × 844: 34-pixel badges remain recognizable in the five-column arsenal; the document width and scroll width both measured 375 CSS pixels. Proof: `painted-icons-phone.png`. The temporary viewport override was reset afterward.
- Current saved practice session stayed at score 103, shot 8, Napalm selected. No test shots were fired or save resets performed. The game reported no console errors during the icon checks.
- The shared component is also used by the loadout picker, flight gallery and impact reel. Artwork is enabled per board after loading; original icons stay visible when a board cannot load.
- The flight gallery rendered all 36 badge components and the impact reel rendered its six badges, with all three board-load markers and no console errors. Proof: `painted-icons-flight-gallery.png` and `painted-icons-effects.png`.
