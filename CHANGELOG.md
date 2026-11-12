# Changelog

## 1.0.0 (2026-11-12)

First release.

- `InputfieldReactColorPicker`: a text input inside `<rcp-color-picker>`, with the thirteen pickers
  of react-color 2.19.3 ported to plain TypeScript and DOM (no React, no jQuery): Sketch, Chrome,
  Photoshop, Compact, Circle, Twitter, Block, Github, Swatches, Material, Hue, Slider, Alpha.
- Only the picker a field uses is downloaded (`assets/dist/pickers/<name>-*.js`, 0.2–1.8 KB gzip
  each, plus 3.8 KB of shared parts), when its popover first opens or at once for an inline picker.
  The element and colour model (`rcp.js`) are 6 KB gzip.
- Values: `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` or `hsl()`/`hsla()`, or empty ("no colour",
  with a label such as "Theme default" and the colour it stands for). The server normalises and
  rejects what is not a colour (`InputfieldReactColorPicker::normalize()`).
- Field settings: a gallery of screenshots of the thirteen pickers; only the chosen one runs live,
  below it. Popover or inline, transparency, stored format, empty value, palette.
- AdminThemeBridge: a Bridge component (`BridgeComponent`, tag `rcp-color-picker`); no style
  attributes, no inline scripts, no `innerHTML` (CSP and Trusted Types under BridgeCsp); follows
  the Bridge colour tokens in both schemes. Other admin themes load it through a classic loader.
- Keyboard: the saturation square and the sliders are sliders (arrows, Shift for steps of ten,
  Home/End), palettes are one tab stop with arrow keys, Escape closes the popover.
