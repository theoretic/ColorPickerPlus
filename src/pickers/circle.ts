/** Circle picker (react-color components/circle, MIT, Case Sandberg) */
import { el, markActive, palette, partsCss, roving, swatch } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './circle.css?inline';

// material-colors 500 shades
const COLORS = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688',
	'#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b'];

export default {
	css: partsCss + css,
	bare: true,
	create(host) {
		const root = el('div', 'circle-picker');
		for(const c of palette(host, COLORS)) {
			root.append(el('div', 'circle', swatch(c, { onPick: (hex) => host.change({ hex }, true) })));
		}
		const focusable = roving(root, host.options.t('Colours'));
		return {
			el: root,
			update(st, empty) {
				focusable(markActive(root, empty ? null : st.hex));
			},
		};
	},
} satisfies PickerModule;
