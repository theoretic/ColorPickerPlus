/** Material picker (react-color components/material, MIT, Case Sandberg) */
import { el, field, hexChange, partsCss, rgbChange, setVar } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './material.css?inline';

export default {
	css: partsCss + css,
	create(host) {
		const t = host.options.t;
		const f = {
			hex: field({ label: t('hex'), cls: 'hex', onChange: (v, fin) => hexChange(host, v, fin) }),
			r: field({ label: 'r', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'r', v, fin) }),
			g: field({ label: 'g', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'g', v, fin) }),
			b: field({ label: 'b', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'b', v, fin) }),
		};
		const root = el('div', 'material-picker', f.hex.el, el('div', 'split', f.r.el, f.g.el, f.b.el));
		return {
			el: root,
			update(st) {
				setVar(root, '--cpp-hex', st.hex);
				f.hex.set(st.hex);
				f.r.set(st.rgb.r);
				f.g.set(st.rgb.g);
				f.b.set(st.rgb.b);
			},
		};
	},
} satisfies PickerModule;
