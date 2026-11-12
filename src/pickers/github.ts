/** Github picker (react-color components/github, MIT, Case Sandberg) */
import { el, markActive, palette, partsCss, roving, swatch } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './github.css?inline';

const COLORS = ['#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB',
	'#EB9694', '#FAD0C3', '#FEF3BD', '#C1E1C5', '#BEDADC', '#C4DEF6', '#BED3F3', '#D4C4FB'];

export default {
	css: partsCss + css,
	create(host) {
		const colors = el('div', 'colors');
		for(const c of palette(host, COLORS)) colors.append(swatch(c, { onPick: (hex) => host.change({ hex }, true) }));
		const focusable = roving(colors, host.options.t('Colours'));
		const root = el('div', 'github-picker', el('div', 'triangle-shadow'), el('div', 'triangle'), colors);
		return {
			el: root,
			update(st, empty) {
				focusable(markActive(colors, empty ? null : st.hex));
			},
		};
	},
} satisfies PickerModule;
