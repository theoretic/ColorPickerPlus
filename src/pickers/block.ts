/** Block picker (react-color components/block, MIT, Case Sandberg) */
import { el, field, hexChange, markActive, palette, partsCss, roving, setVar, swatch } from '../parts.ts';
import { contrasting } from '../color.ts';
import type { PickerModule } from '../types.ts';
import css from './block.css?inline';

const COLORS = ['#D9E3F0', '#F47373', '#697689', '#37D67A', '#2CCCE4', '#555555', '#dce775', '#ff8a65', '#ba68c8'];

export default {
	css: partsCss + css,
	create(host) {
		const t = host.options.t;
		const colors = el('div', 'colors');
		for(const c of palette(host, COLORS)) colors.append(swatch(c, { onPick: (hex) => host.change({ hex }, true) }));
		const focusable = roving(colors, t('Colours'));
		const label = el('div', 'label');
		const head = el('div', 'head', label);
		const hex = field({ ariaLabel: t('hex'), cls: 'hex', onChange: (v, f) => hexChange(host, v, f) });
		const root = el('div', 'block-picker', el('div', 'triangle'), head, el('div', 'body', colors, hex.el));
		return {
			el: root,
			update(st, empty) {
				setVar(root, '--rcp-head', st.hex);
				setVar(root, '--rcp-head-fg', contrasting(st.hex));
				label.textContent = st.hex;
				focusable(markActive(colors, empty ? null : st.hex));
				hex.set(st.hex);
			},
		};
	},
} satisfies PickerModule;
