/** Slider picker (react-color components/slider, MIT, Case Sandberg): hue plus five lightness steps */
import { el, hue, partsCss, setVar } from '../parts.ts';
import type { PickerModule } from '../types.ts';
import css from './slider.css?inline';

const OFFSETS = [0.8, 0.65, 0.5, 0.35, 0.2];

export default {
	css: partsCss + css,
	bare: true,
	create(host) {
		const h = hue(host, { pointer: 'slider' });
		const swatches = el('div', 'swatches');
		swatches.setAttribute('role', 'group');
		swatches.setAttribute('aria-label', host.options.t('Lightness'));
		const buttons = OFFSETS.map((l) => {
			const b = el('button', 'swatch');
			b.type = 'button';
			b.setAttribute('aria-label', Math.round(l * 100) + '%');
			b.addEventListener('click', () => host.change({ h: host.state().hsl.h, s: 0.5, l, a: 1 }, true));
			swatches.append(el('div', 'cell', b));
			return b;
		});
		return {
			el: el('div', 'slider-picker', el('div', 'hue', h.el), swatches),
			update(st, empty) {
				h.update(st);
				buttons.forEach((b, i) => {
					const l = OFFSETS[i];
					const on = !empty && Math.abs(st.hsl.l - l) < 0.1 && Math.abs(st.hsl.s - 0.5) < 0.1;
					setVar(b, '--rcp-swatch', `hsl(${Math.round(st.hsl.h)}, 50%, ${l * 100}%)`);
					b.classList.toggle('active', on);
					b.setAttribute('aria-pressed', on ? 'true' : 'false');
				});
			},
		};
	},
} satisfies PickerModule;
