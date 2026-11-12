<?php namespace ProcessWire;

/**
 * ColorPickerPlus
 *
 * The module this repository is listed under: installing it installs InputfieldColorPickerPlus,
 * the colour input (the pickers of react-color as a native web component), and uninstalling it
 * uninstalls that too. It has no settings of its own; each field sets its picker on its Input tab.
 *
 * Copyright (c) 2026 Ergo; MIT. The pickers are ported from react-color, Copyright (c) 2015 Case
 * Sandberg, MIT (see LICENSE).
 *
 */
class ColorPickerPlus extends WireData implements Module {

	public static function getModuleInfo() {
		return array(
			'title' => 'ColorPickerPlus',
			'version' => '1.0.0',
			'summary' => 'Colour input with the 13 pickers of react-color (Sketch, Chrome, Photoshop, Compact, Circle, Twitter and more), without React or jQuery.',
			'icon' => 'tint',
			'author' => 'Ergo',
			'href' => 'https://github.com/theoretic/ColorPickerPlus',
			'installs' => 'InputfieldColorPickerPlus',
			'requires' => 'ProcessWire>=3.0.200, PHP>=7.4',
		);
	}
}
