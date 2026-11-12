/** Sketch picker (react-color components/sketch, MIT, Case Sandberg) */
import { alpha, el, field, hexChange, hue, markActive, palette, partsCss, rgbChange, roving, saturation, setVar, swatch, toNumber } from '../parts.ts';
import { css as cssColor } from '../color.ts';
import type { PickerModule } from '../types.ts';
import css from './sketch.css?inline';

const PRESETS = ['#D0021B', '#F5A623', '#F8E71C', '#8B572A', '#7ED321', '#417505', '#BD10E0', '#9013FE',
	'#4A90E2', '#50E3C2', '#B8E986', '#000000', '#4A4A4A', '#9B9B9B', '#FFFFFF'];

export default {
	css: partsCss + css,
	create(host) {
		const t = host.options.t;
		const sat = saturation(host, 'circle');
		const h = hue(host);
		const a = alpha(host);
		const active = el('div', 'active');
		const fields = {
			hex: field({ label: t('hex'), cls: 'double', onChange: (v, f) => hexChange(host, v, f) }),
			r: field({ label: 'r', cls: 'single', dragMax: 255, onChange: (v, f) => rgbChange(host, 'r', v, f) }),
			g: field({ label: 'g', cls: 'single', dragMax: 255, onChange: (v, f) => rgbChange(host, 'g', v, f) }),
			b: field({ label: 'b', cls: 'single', dragMax: 255, onChange: (v, f) => rgbChange(host, 'b', v, f) }),
			a: field({
				label: 'a', cls: 'single alpha', dragMax: 100, onChange: (v, f) => {
					const n = toNumber(v);
					if(v.trim() === '' || Number.isNaN(n)) return;
					const { hsl } = host.state();
					host.change({ h: hsl.h, s: hsl.s, l: hsl.l, a: Math.min(100, Math.max(0, n)) / 100 }, f);
				},
			}),
		};
		const presets = el('div', 'presets');
		for(const c of palette(host, PRESETS)) presets.append(el('div', 'preset', swatch(c, { onPick: (hex) => host.change({ hex }, true) })));
		const focusable = roving(presets, t('Preset colours'));
		const root = el('div', 'sketch-picker' + (host.options.alpha ? '' : ' no-alpha'),
			el('div', 'saturation', sat.el),
			el('div', 'controls',
				el('div', 'sliders', el('div', 'hue', h.el), host.options.alpha && el('div', 'alpha', a.el)),
				el('div', 'color', el('div', 'rcp-checker'), active)),
			el('div', 'fields', fields.hex.el, fields.r.el, fields.g.el, fields.b.el, host.options.alpha && fields.a.el),
			presets.childElementCount ? presets : null);
		return {
			el: root,
			update(st, empty) {
				sat.update(st);
				h.update(st);
				a.update(st);
				setVar(active, '--rcp-active', cssColor(st));
				fields.hex.set(st.hex.replace('#', ''));
				fields.r.set(st.rgb.r);
				fields.g.set(st.rgb.g);
				fields.b.set(st.rgb.b);
				fields.a.set(Math.round(st.rgb.a * 100));
				focusable(markActive(presets, empty ? null : st.hex));
			},
		};
	},
} satisfies PickerModule;
