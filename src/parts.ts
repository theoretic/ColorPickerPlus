/**
 * Shared parts of the pickers: saturation square, hue and alpha sliders, editable fields,
 * swatches, checkerboard. Plain DOM; positions and colours go through CSS custom properties set
 * with the CSSOM (style.setProperty), never a style attribute in markup or innerHTML.
 *
 * Ported from react-color's components/common (MIT, Copyright (c) 2015 Case Sandberg).
 */
import { type ColorInput, type ColorState, contrasting, isTypedHex } from './color.ts';
import type { PickerHost } from './types.ts';

type Child = Node | string | null | false | undefined;

/** An element with classes and children */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', ...children: Child[]): HTMLElementTagNameMap[K] {
	const e = document.createElement(tag);
	if(cls) e.className = cls;
	for(const c of children) if(c) e.append(c);
	return e;
}

/** Set a custom property (or any property) through the CSSOM */
export function setVar(e: HTMLElement, name: string, value: string | number): void {
	e.style.setProperty(name, String(value));
}

const SVG = 'http://www.w3.org/2000/svg';

/** A 24x24 material icon from one path */
export function icon(d: string, cls = ''): SVGSVGElement {
	const svg = document.createElementNS(SVG, 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	if(cls) svg.setAttribute('class', cls);
	const path = document.createElementNS(SVG, 'path');
	path.setAttribute('d', d);
	svg.append(path);
	return svg;
}

export const ICON_CHECK = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';
export const ICON_UNFOLD = 'M12,18.17L8.83,15L7.41,16.41L12,21L16.59,16.41L15.17,15M12,5.83L15.17,9L16.59,7.59L12,3L7.41,7.59L8.83,9L12,5.83Z';

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Pointer dragging on an area: move(x, y) with x and y 0..1 of the area's box, end() when let go.
 * The pointer is captured, so a drag may leave the area (react-color listened on window).
 */
export function drag(area: HTMLElement, move: (x: number, y: number) => void, end: () => void): void {
	area.addEventListener('pointerdown', (e) => {
		if(e.button !== 0) return;
		e.preventDefault();
		area.focus({ preventScroll: true });
		area.setPointerCapture(e.pointerId);
		const at = (ev: PointerEvent) => {
			const r = area.getBoundingClientRect();
			move(r.width ? clamp((ev.clientX - r.left) / r.width) : 0, r.height ? clamp((ev.clientY - r.top) / r.height) : 0);
		};
		const onMove = (ev: PointerEvent) => at(ev);
		const onUp = () => {
			area.removeEventListener('pointermove', onMove);
			area.removeEventListener('pointerup', onUp);
			area.removeEventListener('pointercancel', onUp);
			end();
		};
		area.addEventListener('pointermove', onMove);
		area.addEventListener('pointerup', onUp);
		area.addEventListener('pointercancel', onUp);
		at(e);
	});
}

/** Arrow keys: dx, dy in steps (Shift: ten steps), Home/End, PageUp/PageDown; false when not one of them */
function keyStep(e: KeyboardEvent): { dx: number; dy: number; to?: 'min' | 'max' } | null {
	const n = e.shiftKey ? 10 : 1;
	switch(e.key) {
		case 'ArrowLeft': return { dx: -n, dy: 0 };
		case 'ArrowRight': return { dx: n, dy: 0 };
		case 'ArrowUp': return { dx: 0, dy: n };
		case 'ArrowDown': return { dx: 0, dy: -n };
		case 'PageUp': return { dx: 10, dy: 10 };
		case 'PageDown': return { dx: -10, dy: -10 };
		case 'Home': return { dx: 0, dy: 0, to: 'min' };
		case 'End': return { dx: 0, dy: 0, to: 'max' };
	}
	return null;
}

/** A 1D slider's ARIA */
function sliderAria(e: HTMLElement, label: string, min: number, max: number, vertical = false): void {
	e.tabIndex = 0;
	e.setAttribute('role', 'slider');
	e.setAttribute('aria-label', label);
	e.setAttribute('aria-valuemin', String(min));
	e.setAttribute('aria-valuemax', String(max));
	if(vertical) e.setAttribute('aria-orientation', 'vertical');
}

export interface Part {
	el: HTMLElement;
	update(state: ColorState): void;
}

/** Saturation (x) and value (y) square; pointer: 'circle' (Sketch), 'ring' (Chrome, Photoshop) */
export function saturation(host: PickerHost, pointer: 'circle' | 'ring' = 'circle'): Part {
	const dot = el('div', 'cpp-sat-' + pointer);
	const ptr = el('div', 'cpp-pointer', dot);
	const area = el('div', 'cpp-sat', el('div', 'cpp-sat-white'), el('div', 'cpp-sat-black'), ptr);
	area.tabIndex = 0;
	area.setAttribute('role', 'slider');
	area.setAttribute('aria-roledescription', host.options.t('2D slider'));
	area.setAttribute('aria-label', host.options.t('Saturation and brightness'));
	let last: ColorInput | null = null;
	const set = (s: number, v: number, final: boolean) => {
		const st = host.state();
		last = { h: st.hsv.h, s: clamp(s), v: clamp(v), a: st.hsv.a };
		host.change(last, final);
	};
	drag(area, (x, y) => set(x, 1 - y, false), () => last && host.change(last, true));
	area.addEventListener('keydown', (e) => {
		const k = keyStep(e);
		if(!k) return;
		e.preventDefault();
		const { hsv } = host.state();
		if(k.to) return set(hsv.s, k.to === 'min' ? 0 : 1, true);
		set(hsv.s + k.dx / 100, hsv.v + k.dy / 100, true);
	});
	return {
		el: area,
		update(st) {
			setVar(area, '--cpp-hue', round(st.hsl.h));
			setVar(ptr, 'left', round(st.hsv.s * 100) + '%');
			setVar(ptr, 'top', round(100 - st.hsv.v * 100) + '%');
			dot.classList.toggle('cpp-dark', st.hsl.l > 0.5);
			area.setAttribute('aria-valuetext', `${Math.round(st.hsv.s * 100)}%, ${Math.round(st.hsv.v * 100)}%`);
		},
	};
}

export interface SliderOptions {
	vertical?: boolean;
	/** pointer class: 'bar' (the default thin bar), 'chrome', 'round' (Hue and Alpha pickers), 'slider', 'triangles' (Photoshop) */
	pointer?: string;
	/** the hue's input (the Hue picker sets s 1, l .5) */
	input?: (h: number, st: ColorState) => ColorInput;
}

/** Hue slider, horizontal or vertical */
export function hue(host: PickerHost, o: SliderOptions = {}): Part {
	const vertical = !!o.vertical;
	const ptr = el('div', 'cpp-pointer', pointerEl(o.pointer));
	const track = el('div', 'cpp-track', ptr);
	const area = el('div', 'cpp-hue' + (vertical ? ' cpp-vertical' : ''), track);
	sliderAria(area, host.options.t('Hue'), 0, 359, vertical);
	const input = o.input || ((h: number, st: ColorState) => ({ h, s: st.hsl.s, l: st.hsl.l, a: st.hsl.a }));
	let last: ColorInput | null = null;
	const set = (h: number, final: boolean) => {
		last = input(clamp(h, 0, 359), host.state());
		host.change(last, final);
	};
	drag(track, (x, y) => set(vertical ? 360 - y * 360 : x * 360, false), () => last && host.change(last, true));
	area.addEventListener('keydown', (e) => {
		const k = keyStep(e);
		if(!k) return;
		e.preventDefault();
		const h = host.state().hsl.h;
		set(k.to ? (k.to === 'min' ? 0 : 359) : h + (k.dx || k.dy), true);
	});
	return {
		el: area,
		update(st) {
			const p = round((st.hsl.h * 100) / 360);
			setVar(ptr, vertical ? 'top' : 'left', (vertical ? round(100 - p) : p) + '%');
			area.setAttribute('aria-valuenow', String(Math.round(st.hsl.h)));
		},
	};
}

/** Alpha slider over a checkerboard */
export function alpha(host: PickerHost, o: SliderOptions = {}): Part {
	const vertical = !!o.vertical;
	const ptr = el('div', 'cpp-pointer', pointerEl(o.pointer));
	const track = el('div', 'cpp-track', ptr);
	const area = el('div', 'cpp-alpha' + (vertical ? ' cpp-vertical' : ''), el('div', 'cpp-checker'), el('div', 'cpp-alpha-gradient'), track);
	sliderAria(area, host.options.t('Alpha'), 0, 100, vertical);
	let last: ColorInput | null = null;
	const set = (a: number, final: boolean) => {
		const { hsl } = host.state();
		last = { h: hsl.h, s: hsl.s, l: hsl.l, a: round(clamp(a)) };
		host.change(last, final);
	};
	drag(track, (x, y) => set(vertical ? y : x, false), () => last && host.change(last, true));
	area.addEventListener('keydown', (e) => {
		const k = keyStep(e);
		if(!k) return;
		e.preventDefault();
		const a = host.state().rgb.a;
		set(k.to ? (k.to === 'min' ? 0 : 1) : a + (k.dx || k.dy) / 100, true);
	});
	return {
		el: area,
		update(st) {
			const { r, g, b, a } = st.rgb;
			setVar(area, '--cpp-rgb', `${r}, ${g}, ${b}`);
			setVar(ptr, vertical ? 'top' : 'left', round(a * 100) + '%');
			area.setAttribute('aria-valuenow', String(Math.round(a * 100)));
		},
	};
}

let fieldId = 0;

export interface FieldOptions {
	label?: string;
	/** label for screen readers when no label is shown */
	ariaLabel?: string;
	cls?: string;
	/** a typed value; final when the field is left or Enter pressed */
	onChange(value: string, final: boolean): void;
	/** ArrowUp/ArrowDown step (react-color's arrowOffset) */
	step?: number;
	/** dragging the label left and right changes the number 0..dragMax (Sketch) */
	dragMax?: number;
}

export interface Field {
	el: HTMLElement;
	input: HTMLInputElement;
	set(value: string | number): void;
}

/** react-color's EditableInput: a text field that does not overwrite what is being typed */
export function field(o: FieldOptions): Field {
	const input = el('input', 'cpp-input');
	input.type = 'text';
	input.spellcheck = false;
	input.autocomplete = 'off';
	input.id = 'cpp-f' + ++fieldId;
	const wrap = el('div', 'cpp-field' + (o.cls ? ' ' + o.cls : ''), input);
	if(o.ariaLabel) input.setAttribute('aria-label', o.ariaLabel);
	let label: HTMLLabelElement | null = null;
	if(o.label) {
		label = el('label', 'cpp-label', o.label);
		label.htmlFor = input.id;
		wrap.append(label);
	}
	let current = '';
	let pending: string | null = null;
	const focused = () => (input.getRootNode() as ShadowRoot | Document).activeElement === input;
	const num = (v: string) => Number(String(v).replace(/%/g, ''));
	input.addEventListener('input', () => o.onChange(input.value, false));
	input.addEventListener('change', () => o.onChange(input.value, true));
	input.addEventListener('keydown', (e) => {
		if(e.key === 'Enter') {
			e.preventDefault();
			o.onChange(input.value, true);
			return;
		}
		if(e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		const n = num(input.value);
		if(Number.isNaN(n)) return;
		e.preventDefault();
		const step = o.step || 1;
		const next = round(e.key === 'ArrowUp' ? n + step : n - step, 2);
		input.value = String(input.value).includes('%') ? next + '%' : String(next);
		o.onChange(input.value, true);
	});
	input.addEventListener('blur', () => {
		if(pending !== null) input.value = pending;
		pending = null;
	});
	if(label && o.dragMax !== undefined) {
		const max = o.dragMax;
		label.classList.add('cpp-drag');
		label.addEventListener('pointerdown', (e) => {
			if(e.button !== 0) return;
			e.preventDefault();
			label!.setPointerCapture(e.pointerId);
			let value = num(current);
			const onMove = (ev: PointerEvent) => {
				const next = Math.round(value + ev.movementX);
				if(next >= 0 && next <= max && !Number.isNaN(next)) {
					value = next;
					o.onChange(String(next), false);
				}
			};
			const onUp = () => {
				label!.removeEventListener('pointermove', onMove);
				label!.removeEventListener('pointerup', onUp);
				label!.removeEventListener('pointercancel', onUp);
				o.onChange(String(value), true);
			};
			label!.addEventListener('pointermove', onMove);
			label!.addEventListener('pointerup', onUp);
			label!.addEventListener('pointercancel', onUp);
		});
	}
	return {
		el: wrap,
		input,
		set(value) {
			const v = String(value).toUpperCase();
			current = v;
			if(focused()) pending = v;
			else input.value = v;
		},
	};
}

export interface SwatchOptions {
	cls?: string;
	title?: string;
	onPick(color: string): void;
}

/** A colour button */
export function swatch(color: string, o: SwatchOptions, ...children: Child[]): HTMLButtonElement {
	const b = el('button', 'cpp-swatch' + (o.cls ? ' ' + o.cls : ''), ...children);
	b.type = 'button';
	b.title = o.title || color;
	b.setAttribute('aria-label', o.title || color);
	b.dataset.color = color.toLowerCase();
	setVar(b, '--cpp-swatch', color);
	setVar(b, '--cpp-contrast', contrasting(color));
	if(color.toLowerCase() === 'transparent') b.append(el('span', 'cpp-checker'));
	b.addEventListener('click', () => o.onPick(color));
	return b;
}

/**
 * Arrow keys move focus between the buttons of a palette, Home and End to the ends; one tab stop
 * (the active swatch, else the first)
 */
export function roving(group: HTMLElement, label: string): (active: HTMLElement | null) => void {
	group.setAttribute('role', 'group');
	group.setAttribute('aria-label', label);
	const buttons = () => Array.from(group.querySelectorAll<HTMLButtonElement>('button.cpp-swatch'));
	group.addEventListener('keydown', (e) => {
		const list = buttons();
		const i = list.indexOf(e.target as HTMLButtonElement);
		if(i < 0) return;
		let j = -1;
		if(e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % list.length;
		else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + list.length) % list.length;
		else if(e.key === 'Home') j = 0;
		else if(e.key === 'End') j = list.length - 1;
		if(j < 0) return;
		e.preventDefault();
		list.forEach((b) => (b.tabIndex = -1));
		list[j].tabIndex = 0;
		list[j].focus();
	});
	return (active) => {
		const list = buttons();
		const focusedInside = list.some((b) => b === (group.getRootNode() as ShadowRoot).activeElement);
		if(focusedInside) return;
		list.forEach((b, i) => (b.tabIndex = (active ? b === active : i === 0) ? 0 : -1));
	};
}

/** Mark the swatch of a hex active (aria-pressed and class); the active one, or null */
export function markActive(group: HTMLElement, hex: string | null): HTMLElement | null {
	let found: HTMLElement | null = null;
	group.querySelectorAll<HTMLElement>('button.cpp-swatch').forEach((b) => {
		const on = hex !== null && b.dataset.color === hex;
		b.classList.toggle('cpp-active', on);
		b.setAttribute('aria-pressed', on ? 'true' : 'false');
		if(on && !found) found = b;
	});
	return found;
}

/** A field value as a number, or NaN */
export const toNumber = (v: string) => Number(String(v).replace(/[%°]/g, '').trim());

/** The palette a field set, or the picker's own */
export const palette = (host: PickerHost, defaults: string[]) => (host.options.colors.length ? host.options.colors : defaults);

import partsCss from './parts.css?inline';
export { partsCss };

/** An r, g or b field's change: the other two channels and alpha kept */
export function rgbChange(host: PickerHost, key: 'r' | 'g' | 'b', value: string, final: boolean): void {
	const n = toNumber(value);
	if(value.trim() === '' || Number.isNaN(n)) return;
	const { rgb } = host.state();
	host.change({ r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a, [key]: clamp(Math.round(n), 0, 255) }, final);
}

/** A hex field's change, applied only when it is a whole hex (3 or 6 digits, 8 with alpha) */
export function hexChange(host: PickerHost, value: string, final: boolean): void {
	const v = value.trim().replace(/^#/, '');
	if(isTypedHex(v, host.options.alpha)) host.change({ hex: '#' + v }, final);
}

/** A slider's pointer; Photoshop's is two triangles, each with a white inside */
function pointerEl(name = 'bar'): HTMLElement {
	if(name !== 'triangles') return el('div', 'cpp-ptr-' + name);
	return el('div', 'cpp-ptr-triangles', el('div', 'l', el('div', 'i')), el('div', 'r', el('div', 'i')));
}
