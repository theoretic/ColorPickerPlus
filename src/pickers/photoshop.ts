/** Photoshop picker (react-color components/photoshop, MIT, Case Sandberg) */
import { el, field, hexChange, hue, partsCss, rgbChange, saturation, setVar, toNumber } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './photoshop.css?inline';

export default {
	css: partsCss + css,
	create(host) {
		const t = host.options.t;
		const sat = saturation(host, 'ring');
		const h = hue(host, { vertical: true, pointer: 'triangles' });
		const hsvChange = (key: 'h' | 's' | 'v', v: string, f: boolean) => {
			const n = toNumber(v);
			if(v.trim() === '' || Number.isNaN(n)) return;
			const { hsv } = host.state();
			const next = { h: hsv.h, s: hsv.s, v: hsv.v };
			next[key] = key === 'h' ? Math.min(359, Math.max(0, n)) : Math.min(100, Math.max(0, n)) / 100;
			host.change(next, f);
		};
		const f = {
			h: field({ label: 'h', cls: 'rgb', onChange: (v, fin) => hsvChange('h', v, fin) }),
			s: field({ label: 's', cls: 'rgb', onChange: (v, fin) => hsvChange('s', v, fin) }),
			v: field({ label: 'v', cls: 'rgb', onChange: (v, fin) => hsvChange('v', v, fin) }),
			r: field({ label: 'r', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'r', v, fin) }),
			g: field({ label: 'g', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'g', v, fin) }),
			b: field({ label: 'b', cls: 'rgb', onChange: (v, fin) => rgbChange(host, 'b', v, fin) }),
			hex: field({ label: '#', ariaLabel: t('hex'), cls: 'hex', onChange: (v, fin) => hexChange(host, v, fin) }),
		};
		const button = (label: string, cls: string, action: () => void) => {
			const b = el('button', 'button ' + cls, label);
			b.type = 'button';
			b.addEventListener('click', action);
			return b;
		};
		const fresh = el('div', 'new');
		const current = el('div', 'current');
		const root = el('div', 'photoshop-picker',
			el('div', 'head', host.options.label || t('Color Picker')),
			el('div', 'body',
				el('div', 'saturation', sat.el),
				el('div', 'hue', h.el),
				el('div', 'controls',
					el('div', 'top',
						el('div', 'previews',
							el('div', 'plabel', t('new')),
							el('div', 'swatches', fresh, current),
							el('div', 'plabel', t('current'))),
						el('div', 'actions',
							button(t('OK'), 'active', () => host.accept()),
							button(t('Cancel'), '', () => host.cancel()),
							el('div', 'fields',
								f.h.el, f.s.el, f.v.el, el('div', 'divider'),
								f.r.el, f.g.el, f.b.el, el('div', 'divider'),
								f.hex.el,
								el('div', 'symbols', el('div', '', '°'), el('div', '', '%'), el('div', '', '%'))))))));
		return {
			el: root,
			update(st) {
				sat.update(st);
				h.update(st);
				setVar(fresh, '--rcp-new', `rgb(${st.rgb.r}, ${st.rgb.g}, ${st.rgb.b})`);
				setVar(current, '--rcp-current', host.initial().hex);
				f.h.set(Math.round(st.hsv.h));
				f.s.set(Math.round(st.hsv.s * 100));
				f.v.set(Math.round(st.hsv.v * 100));
				f.r.set(st.rgb.r);
				f.g.set(st.rgb.g);
				f.b.set(st.rgb.b);
				f.hex.set(st.hex.replace('#', ''));
			},
		};
	},
} satisfies PickerModule;
