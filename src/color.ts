/**
 * Colour model: parse, convert and format.
 *
 * Ported from react-color's helpers/color.js (MIT, Copyright (c) 2015 Case Sandberg), which used
 * tinycolor2 (MIT, Brian Grinstead); the conversions below follow tinycolor's so a picker moves
 * the way react-color's does. Ranges: r, g, b 0..255; h 0..360; s, l, v and a 0..1.
 */

export interface RGB { r: number; g: number; b: number; a: number }
export interface HSL { h: number; s: number; l: number; a: number }
export interface HSV { h: number; s: number; v: number; a: number }

/** What a picker reads: every model of one colour, hex as '#rrggbb' (lower case) */
export interface ColorState {
	hex: string;
	rgb: RGB;
	hsl: HSL;
	hsv: HSV;
	/** the last hue that meant something, kept while saturation is 0 (greys) */
	oldHue: number;
}

/** What a picker hands back: one of the models, partly or whole */
export type ColorInput =
	| { hex: string }
	| { r: number; g: number; b: number; a?: number }
	| { h: number; s: number; l: number; a?: number }
	| { h: number; s: number; v: number; a?: number };

export type ColorFormat = 'hex' | 'rgb' | 'hsl';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** RGB (floats 0..255) of a hue 0..1, saturation and lightness 0..1 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const hue2rgb = (p: number, q: number, t: number) => {
		if(t < 0) t += 1;
		if(t > 1) t -= 1;
		if(t < 1 / 6) return p + (q - p) * 6 * t;
		if(t < 1 / 2) return q;
		if(t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	if(s === 0) return [l * 255, l * 255, l * 255];
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

/** RGB (floats 0..255) of a hue 0..1, saturation and value 0..1 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
	h *= 6;
	const i = Math.floor(h);
	const f = h - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);
	const mod = ((i % 6) + 6) % 6;
	const r = [v, q, p, p, t, v][mod];
	const g = [t, v, v, q, p, p][mod];
	const b = [p, p, t, v, v, q][mod];
	return [r * 255, g * 255, b * 255];
}

/** HSL (h 0..360) of RGB 0..255 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;
	if(max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		if(max === r) h = (g - b) / d + (g < b ? 6 : 0);
		else if(max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h /= 6;
	}
	return [h * 360, s, l];
}

/** HSV (h 0..360) of RGB 0..255 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	const s = max === 0 ? 0 : d / max;
	let h = 0;
	if(max !== min) {
		if(max === r) h = (g - b) / d + (g < b ? 6 : 0);
		else if(max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h /= 6;
	}
	return [h * 360, s, max];
}

const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');

/** RGBA (r, g, b floats 0..255, a 0..1) of '#rgb', '#rgba', '#rrggbb' or '#rrggbbaa' (the '#' optional); null when not hex */
export function parseHex(value: string): RGB | null {
	const m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value.trim());
	if(!m) return null;
	let hex = m[1];
	if(hex.length < 6) hex = hex.split('').map((c) => c + c).join('');
	const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
	return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? Math.round((n(6) / 255) * 100) / 100 : 1 };
}

/** A number of a CSS colour function: '50%' of max, or a plain number */
function cssNumber(token: string, max: number): number | null {
	const t = token.trim().replace(/deg$/i, '').replace(/°$/, '');
	if(!/^[-+]?(\d+\.?\d*|\.\d+)%?$/.test(t)) return null;
	const n = parseFloat(t);
	return t.endsWith('%') ? (n / 100) * max : n;
}

/** RGBA of a CSS colour string: hex, rgb()/rgba(), hsl()/hsla() or 'transparent'; null when none of these */
export function parseColor(value: string): RGB | null {
	const s = value.trim().toLowerCase();
	if(s === '') return null;
	if(s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
	const hex = parseHex(s);
	if(hex) return hex;
	const m = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(s);
	if(!m) return null;
	const parts = m[2].split(/[\s,/]+/).filter((p) => p !== '');
	if(parts.length !== 3 && parts.length !== 4) return null;
	const alpha = parts.length === 4 ? cssNumber(parts[3], 1) : 1;
	if(alpha === null) return null;
	if(m[1].startsWith('rgb')) {
		const [r, g, b] = parts.slice(0, 3).map((p) => cssNumber(p, 255));
		if(r === null || g === null || b === null) return null;
		return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(alpha, 0, 1) };
	}
	const h = cssNumber(parts[0], 360);
	const sat = cssNumber(parts[1].endsWith('%') ? parts[1] : parts[1] + '%', 1);
	const light = cssNumber(parts[2].endsWith('%') ? parts[2] : parts[2] + '%', 1);
	if(h === null || sat === null || light === null) return null;
	const [r, g, b] = hslToRgb((((h % 360) + 360) % 360) / 360, clamp(sat, 0, 1), clamp(light, 0, 1));
	return { r, g, b, a: clamp(alpha, 0, 1) };
}

/** RGBA floats of a picker's input; null when it holds nothing usable */
function inputToRgb(data: ColorInput): RGB | null {
	const d = data as Record<string, unknown>;
	const a = finite(d.a) ? clamp(d.a, 0, 1) : 1;
	if(typeof d.hex === 'string') return parseColor(d.hex);
	if(finite(d.r) && finite(d.g) && finite(d.b)) {
		return { r: clamp(d.r, 0, 255), g: clamp(d.g, 0, 255), b: clamp(d.b, 0, 255), a };
	}
	if(finite(d.h) && finite(d.s)) {
		const h = (((d.h % 360) + 360) % 360) / 360;
		const s = clamp(d.s, 0, 1);
		if(finite(d.v)) {
			const [r, g, b] = hsvToRgb(h, s, clamp(d.v, 0, 1));
			return { r, g, b, a };
		}
		if(finite(d.l)) {
			const [r, g, b] = hslToRgb(h, s, clamp(d.l, 0, 1));
			return { r, g, b, a };
		}
	}
	return null;
}

/**
 * The state of a picker's input (react-color's toState): hsl and hsv from the unrounded RGB, rgb
 * rounded; a grey keeps the previous hue so the hue slider does not jump to red
 */
export function toState(data: ColorInput, oldHue = 0): ColorState | null {
	const c = inputToRgb(data);
	if(!c) return null;
	const [hh, hs, hl] = rgbToHsl(c.r, c.g, c.b);
	const [vh, vs, vv] = rgbToHsv(c.r, c.g, c.b);
	const hsl: HSL = { h: hh, s: hs, l: hl, a: c.a };
	const hsv: HSV = { h: vh, s: vs, v: vv, a: c.a };
	if(hsl.s === 0) {
		hsl.h = oldHue;
		hsv.h = oldHue;
	}
	const rgb: RGB = { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: Math.round(c.a * 100) / 100 };
	const d = data as Record<string, unknown>;
	return {
		hex: '#' + hex2(c.r) + hex2(c.g) + hex2(c.b),
		rgb,
		hsl,
		hsv,
		oldHue: (finite(d.h) && d.h) || oldHue || hsl.h,
	};
}

/** The value a field stores: hex ('#rrggbb', '#rrggbbaa' with transparency), rgb() or hsl() */
export function format(state: ColorState, fmt: ColorFormat = 'hex', alpha = false): string {
	const a = alpha ? state.rgb.a : 1;
	if(fmt === 'rgb') {
		const { r, g, b } = state.rgb;
		return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
	}
	if(fmt === 'hsl') {
		const h = Math.round(state.hsl.h) % 360;
		const s = Math.round(state.hsl.s * 100);
		const l = Math.round(state.hsl.l * 100);
		return a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
	}
	return a < 1 ? state.hex + hex2(a * 255) : state.hex;
}

/** CSS colour of a state, transparency included */
export function css(state: ColorState): string {
	const { r, g, b, a } = state.rgb;
	return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : state.hex;
}

/** Black or white, whichever reads on the colour (YIQ, as react-color) */
export function contrasting(value: string): string {
	const c = parseColor(value);
	if(!c) return '#fff';
	if(c.a === 0) return 'rgba(0,0,0,0.4)';
	return (c.r * 299 + c.g * 587 + c.b * 114) / 1000 >= 128 ? '#000' : '#fff';
}

/** A hex a hex field may take while typing (react-color's isValidHex: 3 or 6 digits; 8 with alpha) */
export function isTypedHex(value: string, alpha = false): boolean {
	const h = value.trim().replace(/^#/, '');
	return /^[0-9a-f]+$/i.test(h) && (h.length === 3 || h.length === 6 || (alpha && h.length === 8));
}

/** Same colour? Compares lower-case hex, so '#FFF' equals '#ffffff' */
export function sameHex(a: string, b: string): boolean {
	const x = parseHex(a);
	const y = parseHex(b);
	return !!x && !!y && x.r === y.r && x.g === y.g && x.b === y.b;
}
