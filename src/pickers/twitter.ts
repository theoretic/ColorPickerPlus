/** Twitter picker (react-color components/twitter, MIT, Case Sandberg) */
import { el, field, hexChange, markActive, palette, partsCss, roving, swatch } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './twitter.css?inline';

const COLORS = ['#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF'];

export default {
	css: partsCss + css,
	create(host) {
		const t = host.options.t;
		const colors = el('div', 'colors');
		for(const c of palette(host, COLORS)) colors.append(swatch(c, { onPick: (hex) => host.change({ hex }, true) }));
		const focusable = roving(colors, t('Colours'));
		const hex = field({ ariaLabel: t('hex'), cls: 'hex', onChange: (v, f) => hexChange(host, v, f) });
		const root = el('div', 'twitter-picker',
			el('div', 'triangle-shadow'), el('div', 'triangle'),
			el('div', 'body', colors, el('div', 'hash', '#'), hex.el));
		return {
			el: root,
			update(st, empty) {
				focusable(markActive(colors, empty ? null : st.hex));
				hex.set(st.hex.replace('#', ''));
			},
		};
	},
} satisfies PickerModule;
