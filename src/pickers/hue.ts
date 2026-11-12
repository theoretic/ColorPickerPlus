/** Hue picker (react-color components/hue, MIT, Case Sandberg): a full-saturation hue only */
import { el, hue, partsCss } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './hue.css?inline';

export default {
	css: partsCss + css,
	bare: true,
	create(host) {
		const h = hue(host, { pointer: 'round', input: (hh) => ({ h: hh, s: 1, l: 0.5, a: 1 }) });
		return { el: el('div', 'hue-picker', h.el), update: (st) => h.update(st) };
	},
} satisfies PickerModule;
