# Hairline scene figures

The fixed engine and standalone bench come from `lucasmarkes/hairline`, commit `a2217852fed6d1a4f20bc7d43d4fad1a3de117b8` (MIT, copyright 2026 Lucas Marques). The full license is preserved in `LICENSE.txt`, the figure sources, standalone HTML, and SVG snapshots.

- `empty-plot.js`: adapted from `packages/hairline/src/figures/plot.ts`. An empty chart with seven tabs that lift briefly when brushed.
- `empty-roster.js`: Milkstone composition using Hairline's rounded-solid and opaque open-tray construction. Three empty roster wells rise gently by distance from the selected well.
- `empty-loupe.js`: adapted from `packages/hairline/src/figures/loupe.ts`. A stand loupe follows the pointer over a blank ruled sheet.
- `empty-tray.js`: existing Milkstone empty tray figure, rebuilt on the same fixed engine and bench with an explicit tour.

Each source is at most 200 lines and is assembled with the unmodified upstream `skills/hairline-create/build.mjs`. The light, dark, and milk SVG files capture the rest pose using Milkstone's matching stroke palette. Standalone HTML retains Hairline's fixed bench; in-page interaction uses the project wrapper and its theme tokens.
