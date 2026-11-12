/** Alpha picker (react-color components/alpha, MIT, Case Sandberg): the transparency of the colour */
import { alpha, el, partsCss } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './alpha.css?inline';

export default {
	css: partsCss + css,
	bare: true,
	create(host) {
		const a = alpha(host, { pointer: 'round' });
		return { el: el('div', 'alpha-picker', a.el), update: (st) => a.update(st) };
	},
} satisfies PickerModule;
