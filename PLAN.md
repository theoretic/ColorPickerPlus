# ReactColorPicker: plan (OKed by the owner 2026-11-12; 1.0.0 built the same day)

A ProcessWire Inputfield that reproduces the pickers of
[react-color](https://github.com/casesandberg/react-color) (MIT, Case Sandberg) as a native web
component. Wanted first by the Bridge Customizer's colour fields: a hex value with an empty
"theme default" state.

## Choices to settle (recommendation first)

1. **Runtime: vanilla TypeScript port, no React.** Each react-color picker is re-written as
   plain DOM inside one custom element (shadow DOM), built with Vite like MapMarkerPlus.
   Alternative: bundle react-color + preact/compat. Rejected because react-color paints
   everything with inline `style=` attributes (reactcss), which BridgeCsp's `style-src` reports,
   it adds ~40 KB gzip, and Bridge loads no framework by default.
2. **Pickers: all thirteen**, on shared parts (saturation square, hue and alpha sliders,
   editable inputs, swatch, checkerboard): Sketch, Chrome, Photoshop, Compact, Circle, Twitter,
   Block, Github, Swatches, Material, Hue, Slider, Alpha. The field setting `picker` chooses one.
   Smaller alternative: Sketch, Chrome, Compact, Circle, Twitter, Swatches (the rest later).
3. **Shape: Inputfield only** (`InputfieldReactColorPicker`), usable as the input of a plain
   Text field (FieldtypeText's "Input type") and from module config screens. A dedicated
   Fieldtype is not planned.

## The input

- Value: `#rrggbb` lower case, or `''` when empty. With `alpha` on: `#rrggbbaa` (or `rgba()`
  via `format`). Server validates on `processInput()`; anything else becomes `''` with an error.
- Settings: `picker` (default `sketch`), `allowEmpty` (bool, default on), `emptyLabel`
  (default "Default"), `placeholder` (colour shown when empty, e.g. the theme's), `alpha`,
  `format` (`hex`, `rgb`, `hsl`), `presetColors` (one per line), `popover` (swatch button that
  opens the picker, default on; off = picker inline).
- Markup: wrapper keeps the upstream `Inputfield` classes; inside, a light-DOM
  `<input type='text' name=…>` (the form value, works without JS) wrapped by
  `<rcp-color-picker>`. The element dispatches bubbling `input` while dragging and `change` on
  commit, from the light-DOM input.
- Bridge: implements `BridgeComponent` (interface check copied as MapMarkerPlus does), so the
  legacy stack is not loaded for it; also works under AdminThemeUikit through a classic loader
  that `import()`s the ES module. No jQuery. No `style=` attributes and no `innerHTML` (Trusted
  Types): styles come from the component's own stylesheet and CSSOM `setProperty`.
- Keyboard and a11y: sliders are `role=slider` with arrows/PageUp/Home/End, swatches are buttons
  in a roving group, the popover is a `<dialog>`-like popover with Escape and focus return.
- Dark mode: follows Bridge tokens where present (`--background`, `--border`, `--ring`…), else
  its own light defaults.

## Repository and checks

- Own git repo here (`main`, LF, `.gitattributes`, `.editorconfig`), no remote, one commit per
  step. `LICENSE`: MIT with react-color's copyright notice kept beside ours.
- `npm run build` writes `assets/dist/` (committed), with a gzip budget.
- `tests/`: a PHP smoke (value validation, settings) and a Playwright check on the Bridge sandbox
  (each picker: pick, drag, keyboard, empty state, save and reload; no jQuery on the page). The
  module is put into the sandbox only while its checks run, as the Customizer is.

## Steps

1. Scaffold repo, licence, module class with settings and validation, smoke.
2. Colour model (hex/rgb/hsl/hsv, parse and format; replaces tinycolor2) with unit tests.
3. Shared parts: saturation, hue, alpha, editable inputs, swatch, checkerboard.
4. Pickers (the agreed set), element, popover, empty state.
5. PHP render, config screen, BridgeComponent, Uikit loader.
6. Playwright checks on the sandbox, README, CHANGELOG 1.0.0.
7. Tell the Customizer thread; it swaps its native swatch for this input.

## Decisions (owner, 2026-11-12)

1. No React: components and a TypeScript runtime.
2. All thirteen pickers, separated: in an Inputfield only the chosen picker loads; on the settings
   screen the others are screenshots (`assets/previews/`) and only the chosen one runs live.
3. Inputfield only.

## Status

1.0.0: all steps done (see CHANGELOG). Checks: `npm test`, `tests/smoke.php`,
`tests/browser-check.cjs` on the Bridge sandbox, BridgeCsp report-only via Bridge's
`tools/csp-check.js` (no finding from the picker).
