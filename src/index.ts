/**
 * <color-picker-plus>: wraps a text input and opens one of react-color's pickers for it.
 *
 *   <color-picker-plus picker="sketch" alpha format="hex" allow-empty empty-label="Default"
 *       placeholder="#3b82f6" colors='["#ff0000","#00ff00"]' label="Accent" strings='{"Hue":"Тон"}'>
 *     <input type="text" name="accent" value="#ff6900">
 *   </color-picker-plus>
 *
 * The input stays in light DOM and holds the value, so a form posts it and the field works without
 * scripts. Only the picker named in `picker` is imported (assets/dist/pickers/<name>-*.js), when
 * the popover first opens (or at once with mode="inline"). Each change sets the input's value and
 * dispatches a bubbling `input` on it; letting go (pointer up, a click, a typed value) also
 * dispatches `change`. An empty value means "no colour" (the theme's default, say): the clear
 * button sets it when allow-empty is on.
 *
 * Original work, MIT. The pickers are ported from react-color (MIT, Copyright (c) 2015 Case Sandberg).
 */
import { type ColorFormat, type ColorInput, type ColorState, css as cssColor, format, parseColor, toState } from './color.ts';
import type { Picker, PickerHost, PickerModule, PickerOptions } from './types.ts';
import coreCss from './core.css?inline';

export const PICKERS = ['sketch', 'chrome', 'photoshop', 'compact', 'circle', 'twitter', 'block', 'github', 'swatches', 'material', 'hue', 'slider', 'alpha'] as const;
export type PickerName = (typeof PICKERS)[number];

const loaders = import.meta.glob<{ default: PickerModule }>('./pickers/*.ts');
const modules = new Map<string, Promise<PickerModule>>();
const sheets = new Map<string, CSSStyleSheet>();

/** The picker module of a name (imported once per page) */
export function loadPicker(name: string): Promise<PickerModule> {
	const key = (PICKERS as readonly string[]).includes(name) ? name : 'sketch';
	let p = modules.get(key);
	if(!p) {
		p = loaders[`./pickers/${key}.ts`]().then((m) => m.default);
		modules.set(key, p);
	}
	return p;
}

function sheet(key: string, text: string): CSSStyleSheet {
	let s = sheets.get(key);
	if(!s) {
		s = new CSSStyleSheet();
		s.replaceSync(text);
		sheets.set(key, s);
	}
	return s;
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, part = ''): HTMLElementTagNameMap[K] {
	const e = document.createElement(tag);
	e.className = cls;
	if(part) e.setAttribute('part', part);
	return e;
}

const FALLBACK = '#808080';

export class ColorPickerElement extends HTMLElement {
	static observedAttributes = ['picker', 'alpha', 'format', 'colors', 'mode', 'allow-empty', 'empty-label', 'placeholder', 'label', 'strings', 'disabled'];

	#root: ShadowRoot;
	#control = make('div', 'control', 'control');
	#button = make('button', 'swatch', 'swatch');
	#chip = make('span', 'chip');
	#clear = make('button', 'clear', 'clear');
	#panel = make('div', 'panel', 'panel');
	#mount = make('div', 'picker', 'picker');
	#input: HTMLInputElement | null = null;
	#state: ColorState = toState({ hex: FALLBACK })!;
	#empty = true;
	#initial: { state: ColorState; empty: boolean; value: string } | null = null;
	#committed = '';
	#emitting = false;
	#picker: Picker | null = null;
	#pickerName = '';
	#loading: Promise<void> | null = null;
	#strings: Record<string, string> = {};
	#reposition = () => this.#place();
	#onInput = () => this.#typed(false);
	#onChange = () => this.#typed(true);

	constructor() {
		super();
		this.#root = this.attachShadow({ mode: 'open', delegatesFocus: false });
		this.#root.adoptedStyleSheets = [sheet('core', coreCss)];
		this.#button.type = 'button';
		this.#button.append(this.#chip);
		this.#clear.type = 'button';
		this.#clear.textContent = '×';
		this.#control.append(this.#button, document.createElement('slot'), this.#clear);
		this.#panel.append(this.#mount);
		this.#root.append(this.#control, this.#panel);
		this.#button.addEventListener('pointerenter', () => void loadPicker(this.pickerName));
		this.#button.addEventListener('focus', () => void loadPicker(this.pickerName));
		this.#clear.addEventListener('click', () => this.clear());
		this.#panel.addEventListener('beforetoggle', (e) => {
			if((e as ToggleEvent).newState === 'open') this.#opening();
		});
		this.#panel.addEventListener('toggle', (e) => {
			const open = (e as ToggleEvent).newState === 'open';
			if(open) {
				this.#place();
				window.addEventListener('scroll', this.#reposition, true);
				window.addEventListener('resize', this.#reposition);
			} else {
				window.removeEventListener('scroll', this.#reposition, true);
				window.removeEventListener('resize', this.#reposition);
				this.#initial = null;
			}
		});
	}

	connectedCallback(): void {
		this.#strings = this.#json('strings', {}) as Record<string, string>;
		const input = this.querySelector('input');
		if(input !== this.#input) {
			this.#input?.removeEventListener('input', this.#onInput);
			this.#input?.removeEventListener('change', this.#onChange);
			this.#input = input;
			input?.addEventListener('input', this.#onInput);
			input?.addEventListener('change', this.#onChange);
		}
		this.#read(input ? input.value : '');
		this.#committed = this.value;
		this.#layout();
	}

	disconnectedCallback(): void {
		window.removeEventListener('scroll', this.#reposition, true);
		window.removeEventListener('resize', this.#reposition);
	}

	attributeChangedCallback(name: string, old: string | null, value: string | null): void {
		if(old === value || !this.isConnected) return;
		if(name === 'strings') this.#strings = this.#json('strings', {}) as Record<string, string>;
		if(name === 'placeholder' && this.#empty) this.#read('');
		if(name === 'picker' || name === 'alpha' || name === 'colors' || name === 'mode' || name === 'strings') {
			this.#picker = null;
			this.#pickerName = '';
			this.#mount.replaceChildren();
		}
		this.#layout();
	}

	/** The picker's name ('sketch' when the attribute names none of the thirteen) */
	get pickerName(): PickerName {
		const p = (this.getAttribute('picker') || '').toLowerCase();
		return (PICKERS as readonly string[]).includes(p) ? (p as PickerName) : 'sketch';
	}

	get alpha(): boolean {
		return this.hasAttribute('alpha') || this.pickerName === 'alpha';
	}

	get format(): ColorFormat {
		const f = this.getAttribute('format');
		return f === 'rgb' || f === 'hsl' ? f : 'hex';
	}

	get inline(): boolean {
		return this.getAttribute('mode') === 'inline';
	}

	get allowEmpty(): boolean {
		return this.hasAttribute('allow-empty');
	}

	/** The input's value: the formatted colour, or '' */
	get value(): string {
		return this.#input ? this.#input.value : '';
	}

	/** Set a value without events (as a page script would set the input's) */
	set value(v: string) {
		if(this.#input) this.#input.value = v;
		this.#read(v);
		this.#committed = this.value;
		this.#render();
	}

	/** The state the picker shows (the placeholder's colour while empty) */
	get state(): ColorState {
		return this.#state;
	}

	/** Empty the field: '' and the input's input and change events */
	clear(): void {
		if(!this.allowEmpty || !this.#input) return;
		this.#read('');
		this.#write('');
		this.#commit();
		this.#render();
		this.#input.focus();
	}

	/** Open the popover (loads the picker) */
	open(): void {
		if(!this.inline && !this.hasAttribute('disabled')) this.#panel.showPopover();
	}

	close(): void {
		if(this.#panel.matches(':popover-open')) this.#panel.hidePopover();
	}

	/** Load and show the picker now; resolves when it is drawn */
	ready(): Promise<void> {
		return this.#ensurePicker();
	}

	t = (key: string): string => this.#strings[key] ?? key;

	#json(name: string, fallback: unknown): unknown {
		const raw = this.getAttribute(name);
		if(!raw) return fallback;
		try {
			return JSON.parse(raw);
		} catch {
			return fallback;
		}
	}

	#colors(): string[] {
		const raw = this.getAttribute('colors') || '';
		const list = raw.trim().startsWith('[') ? this.#json('colors', []) : raw.split(/[\s,]+/);
		return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string' && parseColor(c) !== null) : [];
	}

	/** Read a value into the state; '' or an invalid value is empty, shown as the placeholder's colour */
	#read(v: string): void {
		const c = parseColor(v);
		if(c && v.trim() !== '') {
			this.#state = toState(c, this.#state.oldHue)!;
			this.#empty = false;
		} else {
			const ph = parseColor(this.getAttribute('placeholder') || '') || parseColor(FALLBACK)!;
			this.#state = toState(ph, this.#state.oldHue)!;
			this.#empty = true;
		}
		if(!this.alpha) this.#opaque();
	}

	#opaque(): void {
		this.#state.rgb.a = 1;
		this.#state.hsl.a = 1;
		this.#state.hsv.a = 1;
	}

	/** Typing in the input: a whole colour moves the picker; change() puts it in the field's format */
	#typed(final: boolean): void {
		if(this.#emitting || !this.#input) return;
		const v = this.#input.value.trim();
		const c = v === '' ? null : parseColor(v);
		if(c) {
			this.#state = toState(c, this.#state.oldHue)!;
			if(!this.alpha) this.#opaque();
			this.#empty = false;
			if(final) this.#input.value = format(this.#state, this.format, this.alpha);
		} else if(v === '' && this.allowEmpty) {
			this.#read('');
		} else if(final) {
			// not a colour: back to the last value
			this.#input.value = this.#empty ? '' : format(this.#state, this.format, this.alpha);
		}
		if(final) this.#committed = this.#input.value;
		this.#render();
	}

	#write(v: string): void {
		if(!this.#input || this.#input.value === v) return;
		this.#input.value = v;
		this.#emit('input');
	}

	#commit(): void {
		if(!this.#input || this.#input.value === this.#committed) return;
		this.#committed = this.#input.value;
		this.#emit('change');
	}

	#emit(type: string): void {
		this.#emitting = true;
		try {
			this.#input!.dispatchEvent(new Event(type, { bubbles: true }));
		} finally {
			this.#emitting = false;
		}
	}

	/** A picker's change */
	#change(data: ColorInput, final: boolean): void {
		const d = data as { h?: number };
		const st = toState(data, d.h || this.#state.oldHue);
		if(!st) return;
		this.#state = st;
		if(!this.alpha) this.#opaque();
		this.#empty = false;
		this.#write(format(this.#state, this.format, this.alpha));
		if(final) this.#commit();
		this.#render();
	}

	#host(): PickerHost {
		const options: PickerOptions = {
			alpha: this.alpha,
			colors: this.#colors(),
			label: this.getAttribute('label') || '',
			t: this.t,
		};
		return {
			options,
			state: () => this.#state,
			initial: () => this.#initial?.state ?? this.#state,
			change: (data, final) => this.#change(data, final),
			accept: () => {
				this.#commit();
				this.#initial = { state: this.#state, empty: this.#empty, value: this.value };
				this.close();
				if(!this.inline) this.#button.focus();
				this.#render();
			},
			cancel: () => {
				const init = this.#initial;
				if(init) {
					this.#state = init.state;
					this.#empty = init.empty;
					this.#write(init.value);
					this.#commit();
				}
				this.close();
				if(!this.inline) this.#button.focus();
				this.#render();
			},
		};
	}

	#ensurePicker(): Promise<void> {
		const name = this.pickerName;
		if(this.#picker && this.#pickerName === name) return Promise.resolve();
		if(this.#loading) return this.#loading;
		this.#loading = loadPicker(name).then((mod) => {
			this.#loading = null;
			if(this.pickerName !== name) return this.#ensurePicker();
			this.#root.adoptedStyleSheets = [sheet('core', coreCss), sheet(name, mod.css)];
			this.#picker = mod.create(this.#host());
			this.#pickerName = name;
			this.#mount.classList.toggle('bare', !!mod.bare);
			this.#mount.replaceChildren(this.#picker.el);
			if(!this.#initial) this.#initial = { state: this.#state, empty: this.#empty, value: this.value };
			this.#render();
			if(this.#panel.matches(':popover-open')) {
				this.#place();
				this.#focusPicker();
			}
		}).catch((err) => {
			this.#loading = null;
			console.error('color-picker-plus: picker ' + name + ' failed to load', err);
		});
		return this.#loading;
	}

	#opening(): void {
		this.#initial = { state: this.#state, empty: this.#empty, value: this.value };
		if(this.#picker && this.#pickerName === this.pickerName) {
			this.#render();
			requestAnimationFrame(() => this.#focusPicker());
		} else {
			void this.#ensurePicker();
		}
	}

	#focusPicker(): void {
		const target = this.#mount.querySelector<HTMLElement>('.cpp-active, [tabindex="0"], input, button');
		target?.focus({ preventScroll: true });
	}

	/** Popover below the swatch, or above when there is no room; inside the viewport */
	#place(): void {
		if(this.inline || !this.#panel.matches(':popover-open')) return;
		const gap = 12;
		const a = this.#button.getBoundingClientRect();
		const p = this.#panel.getBoundingClientRect();
		const vw = document.documentElement.clientWidth;
		const vh = window.innerHeight;
		let top = a.bottom + gap;
		let placement = 'below';
		if(top + p.height > vh - 8 && a.top - gap - p.height >= 8) {
			top = a.top - gap - p.height;
			placement = 'above';
		}
		const centred = this.pickerName === 'block';
		let left = centred ? a.left + a.width / 2 - p.width / 2 : a.left + a.width / 2 - 21;
		left = Math.max(8, Math.min(left, vw - p.width - 8));
		this.setAttribute('placement', placement);
		this.#panel.style.setProperty('left', Math.round(left) + 'px');
		this.#panel.style.setProperty('top', Math.round(Math.max(8, top)) + 'px');
	}

	#layout(): void {
		const inline = this.inline;
		const label = this.getAttribute('label') || '';
		const disabled = this.hasAttribute('disabled');
		if(inline) {
			if(this.#panel.matches(':popover-open')) this.#panel.hidePopover();
			this.#panel.removeAttribute('popover');
			this.#panel.removeAttribute('role');
			this.#panel.classList.add('inline');
			this.setAttribute('placement', 'inline');
			this.#button.hidden = true;
			void this.#ensurePicker();
		} else {
			this.#panel.setAttribute('popover', 'auto');
			this.#panel.setAttribute('role', 'dialog');
			this.#panel.classList.remove('inline');
			this.#button.hidden = false;
			this.#button.popoverTargetElement = this.#panel;
			this.#button.popoverTargetAction = 'toggle';
		}
		this.#panel.setAttribute('aria-label', label || this.t('Colour picker'));
		this.#button.setAttribute('aria-label', label ? `${this.t('Pick a colour')}: ${label}` : this.t('Pick a colour'));
		const emptyLabel = this.getAttribute('empty-label') || this.t('Default');
		this.#clear.setAttribute('aria-label', emptyLabel);
		this.#clear.title = emptyLabel;
		this.#button.disabled = disabled;
		this.#clear.disabled = disabled;
		this.#render();
	}

	#render(): void {
		this.#control.classList.toggle('empty', this.#empty);
		this.#chip.style.setProperty('--cpp-chip', cssColor(this.#state));
		this.#chip.title = this.#empty ? this.getAttribute('empty-label') || this.t('Default') : this.value;
		this.#clear.hidden = !this.allowEmpty || this.#empty;
		this.toggleAttribute('empty', this.#empty);
		this.#picker?.update(this.#state, this.#empty);
	}
}

if(!customElements.get('color-picker-plus')) customElements.define('color-picker-plus', ColorPickerElement);

declare global {
	interface HTMLElementTagNameMap {
		'color-picker-plus': ColorPickerElement;
	}
}
