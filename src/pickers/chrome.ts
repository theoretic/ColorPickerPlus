/** Chrome picker (react-color components/chrome, MIT, Case Sandberg) */
import { ICON_UNFOLD, alpha, el, field, hexChange, hue, icon, partsCss, rgbChange, saturation, setVar, toNumber } from '../parts.ts';
import { css as cssColor } from '../color.ts';
import type { PickerModule } from '../types.ts';
import css from './chrome.css?inline';

type View = 'hex' | 'rgb' | 'hsl';

export default {
	css: partsCss + css,
	create(host) {
		const t = host.options.t;
		const withAlpha = host.options.alpha;
		const sat = saturation(host, 'ring');
		const h = hue(host, { pointer: 'chrome' });
		const a = alpha(host, { pointer: 'chrome' });
		const active = el('div', 'active');
		const alphaChange = (v: string, f: boolean) => {
			const n = toNumber(v);
			if(v.trim() === '' || Number.isNaN(n)) return;
			const { hsl } = host.state();
			host.change({ h: hsl.h, s: hsl.s, l: hsl.l, a: Math.round(Math.min(1, Math.max(0, n)) * 100) / 100 }, f);
		};
		const hslChange = (key: 'h' | 's' | 'l', v: string, f: boolean) => {
			const n = toNumber(v);
			if(v.trim() === '' || Number.isNaN(n)) return;
			const { hsl } = host.state();
			const next = { h: hsl.h, s: hsl.s, l: hsl.l, a: hsl.a };
			next[key] = key === 'h' ? Math.min(359, Math.max(0, n)) : Math.min(100, Math.max(0, n)) / 100;
			host.change(next, f);
		};
		const f = {
			hex: field({ label: t('hex'), onChange: (v, fin) => hexChange(host, v, fin) }),
			r: field({ label: 'r', onChange: (v, fin) => rgbChange(host, 'r', v, fin) }),
			g: field({ label: 'g', onChange: (v, fin) => rgbChange(host, 'g', v, fin) }),
			b: field({ label: 'b', onChange: (v, fin) => rgbChange(host, 'b', v, fin) }),
			ra: field({ label: 'a', step: 0.01, onChange: alphaChange }),
			h: field({ label: 'h', onChange: (v, fin) => hslChange('h', v, fin) }),
			s: field({ label: 's', onChange: (v, fin) => hslChange('s', v, fin) }),
			l: field({ label: 'l', onChange: (v, fin) => hslChange('l', v, fin) }),
			ha: field({ label: 'a', step: 0.01, onChange: alphaChange }),
		};
		const views: Record<View, HTMLElement> = {
			hex: el('div', 'view', f.hex.el),
			rgb: el('div', 'view', f.r.el, f.g.el, f.b.el, withAlpha && f.ra.el),
			hsl: el('div', 'view', f.h.el, f.s.el, f.l.el, withAlpha && f.ha.el),
		};
		let view: View = 'hex';
		const toggle = el('button', 'toggle', icon(ICON_UNFOLD, 'cpp-icon'));
		toggle.type = 'button';
		toggle.setAttribute('aria-label', t('Switch between hex, RGB and HSL'));
		const show = () => {
			for(const k of Object.keys(views) as View[]) views[k].hidden = k !== view;
		};
		toggle.addEventListener('click', () => {
			const opaque = host.state().hsl.a === 1;
			view = view === 'hex' ? 'rgb' : view === 'rgb' ? 'hsl' : opaque ? 'hex' : 'rgb';
			show();
		});
		show();
		const root = el('div', 'chrome-picker' + (withAlpha ? '' : ' no-alpha'),
			el('div', 'saturation', sat.el),
			el('div', 'body',
				el('div', 'controls',
					el('div', 'color', el('div', 'swatch', active, el('div', 'cpp-checker'))),
					el('div', 'toggles', el('div', 'hue', h.el), withAlpha && el('div', 'alpha', a.el))),
				el('div', 'fields', el('div', 'views', views.hex, views.rgb, views.hsl), el('div', 'toggle-wrap', toggle))));
		return {
			el: root,
			update(st) {
				if(st.hsl.a !== 1 && view === 'hex') {
					view = 'rgb';
					show();
				}
				sat.update(st);
				h.update(st);
				a.update(st);
				setVar(active, '--cpp-active', cssColor(st));
				f.hex.set(st.hex);
				f.r.set(st.rgb.r);
				f.g.set(st.rgb.g);
				f.b.set(st.rgb.b);
				f.ra.set(st.rgb.a);
				f.h.set(Math.round(st.hsl.h));
				f.s.set(Math.round(st.hsl.s * 100) + '%');
				f.l.set(Math.round(st.hsl.l * 100) + '%');
				f.ha.set(st.rgb.a);
			},
		};
	},
} satisfies PickerModule;
