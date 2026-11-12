/** Compact picker (react-color components/compact, MIT, Case Sandberg) */
import { el, field, hexChange, markActive, palette, partsCss, rgbChange, roving, setVar, swatch } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './compact.css?inline';

const COLORS = ['#4D4D4D', '#999999', '#FFFFFF', '#F44E3B', '#FE9200', '#FCDC00', '#DBDF00', '#A4DD00', '#68CCCA', '#73D8FF', '#AEA1FF', '#FDA1FF',
	'#333333', '#808080', '#cccccc', '#D33115', '#E27300', '#FCC400', '#B0BC00', '#68BC00', '#16A5A5', '#009CE0', '#7B64FF', '#FA28FF',
	'#000000', '#666666', '#B3B3B3', '#9F0500', '#C45100', '#FB9E00', '#808900', '#194D33', '#0C797D', '#0062B1', '#653294', '#AB149E'];

export default {
	css: partsCss + css,
	create(host) {
		const t = host.options.t;
		const colors = el('div', 'colors');
		for(const c of palette(host, COLORS)) {
			const b = swatch(c, { onPick: (hex) => host.change({ hex }, true) }, el('span', 'dot'));
			if(c.toLowerCase() === '#ffffff') b.classList.add('white');
			colors.append(b);
		}
		const focusable = roving(colors, t('Colours'));
		const active = el('div', 'active');
		const f = {
			hex: field({ label: t('hex'), cls: 'hex', onChange: (v, fin) => hexChange(host, v, fin) }),
			r: field({ label: 'r', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'r', v, fin) }),
			g: field({ label: 'g', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'g', v, fin) }),
			b: field({ label: 'b', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'b', v, fin) }),
		};
		const root = el('div', 'compact-picker', colors, el('div', 'fields', active, f.hex.el, f.r.el, f.g.el, f.b.el));
		return {
			el: root,
			update(st, empty) {
				focusable(markActive(colors, empty ? null : st.hex));
				setVar(active, '--cpp-active', st.hex);
				f.hex.set(st.hex);
				f.r.set(st.rgb.r);
				f.g.set(st.rgb.g);
				f.b.set(st.rgb.b);
			},
		};
	},
} satisfies PickerModule;
