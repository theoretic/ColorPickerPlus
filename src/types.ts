import type { ColorInput, ColorState } from './color.ts';

/** Options a picker reads from its element */
export interface PickerOptions {
	/** alpha slider and field shown (react-color's disableAlpha, inverted) */
	alpha: boolean;
	/** the field's own palette, or [] for the picker's default one */
	colors: string[];
	/** text of the Photoshop picker's header and the dialog's label */
	label: string;
	/** translated UI string (the PHP side passes them); the key is the English text */
	t(key: string): string;
}

/** What the element gives a picker */
export interface PickerHost {
	options: PickerOptions;
	/** the colour now */
	state(): ColorState;
	/** the colour when the popover opened (Photoshop's "current") */
	initial(): ColorState;
	/** set a colour; final = the user let go (pointer up, a click, a typed value): fires change */
	change(input: ColorInput, final: boolean): void;
	/** Photoshop's OK and Cancel */
	accept(): void;
	cancel(): void;
}

export interface Picker {
	el: HTMLElement;
	/** draw a state; empty = the field has no value (a palette shows nothing as active) */
	update(state: ColorState, empty: boolean): void;
}

/** The default export of each picker chunk */
export interface PickerModule {
	css: string;
	/** no card of its own: in a popover the element draws one around it */
	bare?: boolean;
	create(host: PickerHost): Picker;
}
