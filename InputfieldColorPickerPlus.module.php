<?php namespace ProcessWire;

/**
 * Bridge (AdminThemeBridge, docs/contract.md section 2) is optional. Its BridgeComponent interface
 * is loaded from the theme when the theme is there, so the theme sees a component; without it this
 * is an empty interface of our own. Never a stand-in "BridgeComponent": AdminThemeBridge declares
 * it with an interface_exists() guard and a stand-in would win over the real one.
 */
if(!interface_exists('ProcessWire\BridgeComponent', false)) {
	$dirs = array(dirname(__DIR__) . '/AdminThemeBridge/');
	$config = function_exists('ProcessWire\wire') ? wire('config') : null;
	if($config) {
		$dirs[] = (string) $config->paths('AdminThemeBridge');
		$dirs[] = $config->paths->siteModules . 'AdminThemeBridge/';
	}
	foreach($dirs as $dir) {
		if($dir === '' || !is_file(rtrim($dir, '/') . '/BridgeComponent.php')) continue;
		require_once(realpath(rtrim($dir, '/') . '/BridgeComponent.php'));
		break;
	}
}
if(interface_exists('ProcessWire\BridgeComponent', false)) {
	interface InputfieldColorPickerPlusBridge extends BridgeComponent {}
} else {
	interface InputfieldColorPickerPlusBridge {}
}

/**
 * Colour picker Inputfield: the pickers of react-color as a native web component
 *
 * A text input (the value: '#rrggbb', '#rrggbbaa', rgb() or hsl(), or '' for "no colour") inside
 * <color-picker-plus>, which opens one of react-color's thirteen pickers. Only the picker the field
 * uses is downloaded. No React, no jQuery: assets/dist/color-picker-plus.js is a plain ES module.
 *
 * Usable as the input of a Text field (FieldtypeText, "Input module"), and anywhere an Inputfield
 * goes (module config screens, forms built in code):
 *
 *   $f = $modules->get('InputfieldColorPickerPlus');
 *   $f->attr('name', 'accent');
 *   $f->val('#ff6900');
 *   $f->picker = 'chrome';       // see pickers()
 *   $f->emptyColor = '#2563eb';  // what "empty" stands for, shown while the field is empty
 *
 * Copyright (c) 2026 Ergo; MIT. The pickers are ported from react-color, Copyright (c) 2015 Case
 * Sandberg, MIT (see LICENSE).
 *
 * @property string $picker One of pickers() (default 'sketch')
 * @property string $mode 'popover' (a swatch button opens the picker, default) or 'inline' (always open)
 * @property bool|int $alpha Transparency allowed (always on for the Alpha picker)
 * @property string $format Stored format: 'hex' (default), 'rgb' or 'hsl'
 * @property bool|int $allowEmpty The field may be emptied with its clear button (default true)
 * @property string $emptyLabel What empty means, e.g. "Theme default" (default: "Default")
 * @property string $emptyColor Colour the swatch and the picker show while the field is empty
 * @property string $colors The palette of the palette pickers, one colour per line (blank: the picker's own)
 *
 */
class InputfieldColorPickerPlus extends InputfieldText implements InputfieldHasTextValue, InputfieldColorPickerPlusBridge {

	const version = '1.0.0';

	public static function getModuleInfo() {
		return array(
			'title' => 'ColorPickerPlus Inputfield',
			'version' => self::version,
			'summary' => 'Colour input with the pickers of react-color (Sketch, Chrome, Photoshop, Compact, Circle, Twitter and more), without React or jQuery.',
			'icon' => 'tint',
			'author' => 'Ergo',
			'href' => 'https://github.com/casesandberg/react-color',
			'requires' => 'ProcessWire>=3.0.200, PHP>=7.4',
		);
	}

	/**
	 * Bridge component descriptor: the theme imports the module from the wrapper's
	 * data-bridge-module (also for AJAX-loaded fields); the classic loader imports the same URL
	 * under other admin themes, and the browser evaluates it once
	 *
	 * @return array
	 *
	 */
	public function getBridgeComponent() {
		return array(
			'tag' => 'color-picker-plus',
			'module' => 'assets/dist/color-picker-plus.js?v=' . rawurlencode(self::version),
			'version' => '1',
		);
	}

	public function __construct() {
		parent::__construct();
		$this->set('picker', 'sketch');
		$this->set('mode', 'popover');
		$this->set('alpha', 0);
		$this->set('format', 'hex');
		$this->set('allowEmpty', 1);
		$this->set('emptyLabel', '');
		$this->set('emptyColor', '');
		$this->set('colors', '');
	}

	/**
	 * The thirteen pickers: name => label
	 *
	 * @return array
	 *
	 */
	public static function pickers() {
		return array(
			'sketch' => 'Sketch',
			'chrome' => 'Chrome',
			'photoshop' => 'Photoshop',
			'compact' => 'Compact',
			'circle' => 'Circle',
			'twitter' => 'Twitter',
			'block' => 'Block',
			'github' => 'Github',
			'swatches' => 'Swatches',
			'material' => 'Material',
			'hue' => 'Hue',
			'slider' => 'Slider',
			'alpha' => 'Alpha',
		);
	}

	/**
	 * The picker's name, 'sketch' when the setting names none of them
	 *
	 * @return string
	 *
	 */
	public function pickerName() {
		$p = strtolower((string) $this->get('picker'));
		return isset(self::pickers()[$p]) ? $p : 'sketch';
	}

	/**
	 * Transparency allowed?
	 *
	 * @return bool
	 *
	 */
	public function hasAlpha() {
		return (bool) $this->get('alpha') || $this->pickerName() === 'alpha';
	}

	/**
	 * The stored format
	 *
	 * @return string
	 *
	 */
	public function formatName() {
		$f = (string) $this->get('format');
		return in_array($f, array('rgb', 'hsl'), true) ? $f : 'hex';
	}

	/**
	 * RGBA of a colour string: '#rgb', '#rgba', '#rrggbb', '#rrggbbaa', rgb()/rgba(), hsl()/hsla()
	 *
	 * @param string $value
	 * @return array|null array(r, g, b, a) with r, g, b 0..255 (floats) and a 0..1, or null
	 *
	 */
	public static function parseColor($value) {
		$s = strtolower(trim((string) $value));
		if($s === '') return null;
		if(preg_match('/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/D', $s, $m)) {
			$hex = $m[1];
			if(strlen($hex) < 6) {
				$long = '';
				foreach(str_split($hex) as $c) $long .= $c . $c;
				$hex = $long;
			}
			$a = strlen($hex) === 8 ? round(hexdec(substr($hex, 6, 2)) / 255, 2) : 1;
			return array(hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2)), $a);
		}
		if(!preg_match('/^(rgba?|hsla?)\(([^)]*)\)$/D', $s, $m)) return null;
		$parts = preg_split('![\s,/]+!', trim($m[2]), -1, PREG_SPLIT_NO_EMPTY);
		if(count($parts) !== 3 && count($parts) !== 4) return null;
		$num = function($t, $max) {
			$t = preg_replace('/(deg|°)$/u', '', trim($t));
			if(!preg_match('/^[-+]?(\d+\.?\d*|\.\d+)%?$/D', $t)) return null;
			$n = (float) $t;
			return substr($t, -1) === '%' ? $n / 100 * $max : $n;
		};
		$a = count($parts) === 4 ? $num($parts[3], 1) : 1;
		if($a === null) return null;
		$a = max(0, min(1, $a));
		if(strpos($m[1], 'rgb') === 0) {
			$rgb = array();
			foreach(array_slice($parts, 0, 3) as $p) {
				$n = $num($p, 255);
				if($n === null) return null;
				$rgb[] = max(0, min(255, $n));
			}
			return array($rgb[0], $rgb[1], $rgb[2], $a);
		}
		$h = $num($parts[0], 360);
		$sat = $num(substr($parts[1], -1) === '%' ? $parts[1] : $parts[1] . '%', 1);
		$light = $num(substr($parts[2], -1) === '%' ? $parts[2] : $parts[2] . '%', 1);
		if($h === null || $sat === null || $light === null) return null;
		list($r, $g, $b) = self::hslToRgb(fmod(fmod($h, 360) + 360, 360) / 360, max(0, min(1, $sat)), max(0, min(1, $light)));
		return array($r, $g, $b, $a);
	}

	/**
	 * RGB 0..255 of hue, saturation and lightness 0..1
	 *
	 * @param float $h
	 * @param float $s
	 * @param float $l
	 * @return array
	 *
	 */
	protected static function hslToRgb($h, $s, $l) {
		if($s == 0) return array($l * 255, $l * 255, $l * 255);
		$q = $l < 0.5 ? $l * (1 + $s) : $l + $s - $l * $s;
		$p = 2 * $l - $q;
		$f = function($t) use($p, $q) {
			if($t < 0) $t += 1;
			if($t > 1) $t -= 1;
			if($t < 1 / 6) return $p + ($q - $p) * 6 * $t;
			if($t < 1 / 2) return $q;
			if($t < 2 / 3) return $p + ($q - $p) * (2 / 3 - $t) * 6;
			return $p;
		};
		return array($f($h + 1 / 3) * 255, $f($h) * 255, $f($h - 1 / 3) * 255);
	}

	/**
	 * A colour in a stored format, as the client writes it; null when the value is not a colour
	 *
	 * @param string $value
	 * @param string $format 'hex', 'rgb' or 'hsl'
	 * @param bool $alpha Keep transparency (else the colour is made opaque)
	 * @return string|null '' for an empty value
	 *
	 */
	public static function normalize($value, $format = 'hex', $alpha = false) {
		if(trim((string) $value) === '') return '';
		$c = self::parseColor($value);
		if(!$c) return null;
		list($r, $g, $b, $a) = $c;
		$a = $alpha ? round($a, 2) : 1;
		$ri = (int) round($r);
		$gi = (int) round($g);
		$bi = (int) round($b);
		if($format === 'rgb') {
			return $a < 1 ? "rgba($ri, $gi, $bi, " . self::num($a) . ")" : "rgb($ri, $gi, $bi)";
		}
		if($format === 'hsl') {
			$rf = $r / 255;
			$gf = $g / 255;
			$bf = $b / 255;
			$max = max($rf, $gf, $bf);
			$min = min($rf, $gf, $bf);
			$l = ($max + $min) / 2;
			$h = 0;
			$s = 0;
			if($max != $min) {
				$d = $max - $min;
				$s = $l > 0.5 ? $d / (2 - $max - $min) : $d / ($max + $min);
				if($max == $rf) $h = ($gf - $bf) / $d + ($gf < $bf ? 6 : 0);
				else if($max == $gf) $h = ($bf - $rf) / $d + 2;
				else $h = ($rf - $gf) / $d + 4;
				$h /= 6;
			}
			$hh = ((int) round($h * 360)) % 360;
			$ss = (int) round($s * 100);
			$ll = (int) round($l * 100);
			return $a < 1 ? "hsla($hh, $ss%, $ll%, " . self::num($a) . ")" : "hsl($hh, $ss%, $ll%)";
		}
		$hex = sprintf('#%02x%02x%02x', $ri, $gi, $bi);
		return $a < 1 ? $hex . sprintf('%02x', (int) round($a * 255)) : $hex;
	}

	/**
	 * A number as JavaScript prints it (0.5, 1, 0.25)
	 *
	 * @param float $n
	 * @return string
	 *
	 */
	protected static function num($n) {
		$s = rtrim(rtrim(number_format((float) $n, 2, '.', ''), '0'), '.');
		return $s === '' ? '0' : $s;
	}

	/**
	 * The palette setting as a list of valid colours
	 *
	 * @return array
	 *
	 */
	public function colorList() {
		$out = array();
		foreach(preg_split('/[\r\n,]+/', (string) $this->get('colors')) as $c) {
			$c = trim($c);
			if($c !== '' && self::parseColor($c)) $out[] = $c;
		}
		return $out;
	}

	/**
	 * UI strings the client shows, translated (key: the English text the client asks for)
	 *
	 * @return array
	 *
	 */
	public function clientStrings() {
		return array(
			'Pick a colour' => $this->_('Pick a colour'),
			'Colour picker' => $this->_('Colour picker'),
			'Default' => $this->_('Default'),
			'Saturation and brightness' => $this->_('Saturation and brightness'),
			'2D slider' => $this->_('2D slider'),
			'Hue' => $this->_('Hue'),
			'Alpha' => $this->_('Transparency'),
			'Lightness' => $this->_('Lightness'),
			'Colours' => $this->_('Colours'),
			'Preset colours' => $this->_('Preset colours'),
			'hex' => $this->_x('hex', 'colour field label'),
			'Switch between hex, RGB and HSL' => $this->_('Switch between hex, RGB and HSL'),
			'Color Picker' => $this->_('Colour picker'),
			'new' => $this->_x('new', 'Photoshop picker preview'),
			'current' => $this->_x('current', 'Photoshop picker preview'),
			'OK' => $this->_('OK'),
			'Cancel' => $this->_('Cancel'),
		);
	}

	/**
	 * Add the classic loader (other admin themes; under Bridge it finds the module already loading)
	 *
	 * @param Inputfield|null $parent
	 * @param bool $renderValueMode
	 * @return bool
	 *
	 */
	public function renderReady(?Inputfield $parent = null, $renderValueMode = false) {
		$result = parent::renderReady($parent, $renderValueMode);
		self::addAssets($this->wire());
		return $result;
	}

	/**
	 * Add the loader script and the stylesheet (the settings gallery) with the version in their URLs
	 *
	 * @param ProcessWire $wire
	 *
	 */
	public static function addAssets(ProcessWire $wire) {
		$config = $wire->config;
		$url = $config->urls('InputfieldColorPickerPlus');
		$v = '?v=' . rawurlencode(self::version);
		$config->scripts->add($url . 'InputfieldColorPickerPlus.js' . $v);
		$config->styles->add($url . 'InputfieldColorPickerPlus.css' . $v);
	}

	/**
	 * The <color-picker-plus> attributes of this field
	 *
	 * @return array
	 *
	 */
	public function elementAttrs() {
		$attrs = array(
			'picker' => $this->pickerName(),
			'format' => $this->formatName(),
			'label' => (string) $this->label,
			'empty-label' => (string) $this->get('emptyLabel') !== '' ? (string) $this->get('emptyLabel') : $this->_('Default'),
			'strings' => json_encode($this->clientStrings(), JSON_UNESCAPED_UNICODE),
		);
		if($this->get('mode') === 'inline') $attrs['mode'] = 'inline';
		if($this->hasAlpha()) $attrs['alpha'] = '';
		if($this->get('allowEmpty') && !$this->required) $attrs['allow-empty'] = '';
		$empty = self::normalize((string) $this->get('emptyColor'), 'hex', true);
		if($empty) $attrs['placeholder'] = $empty;
		$colors = $this->colorList();
		if(count($colors)) $attrs['colors'] = json_encode($colors);
		if($this->attr('disabled')) $attrs['disabled'] = '';
		return $attrs;
	}

	/**
	 * Attributes as a string, values entity-encoded
	 *
	 * @param array $attrs
	 * @return string
	 *
	 */
	protected function attrString(array $attrs) {
		$e = $this->wire()->sanitizer;
		$out = '';
		foreach($attrs as $k => $v) $out .= ' ' . $k . ($v === '' ? '' : "='" . $e->entities((string) $v) . "'");
		return $out;
	}

	/**
	 * The text input inside <color-picker-plus>
	 *
	 * @return string
	 *
	 */
	public function ___render() {
		$this->attr('type', 'text');
		$this->attr('autocomplete', 'off');
		$this->attr('spellcheck', 'false');
		if(!$this->attr('size')) $this->attr('size', $this->formatName() === 'hex' ? 10 : 22);
		$this->attr('maxlength', 40);
		$emptyLabel = (string) $this->get('emptyLabel') !== '' ? (string) $this->get('emptyLabel') : '';
		if(!$this->attr('placeholder') && $emptyLabel !== '') $this->attr('placeholder', $emptyLabel);
		$this->addClass('InputfieldColorPickerPlusInput');
		$input = parent::___render();
		return "<color-picker-plus" . $this->attrString($this->elementAttrs()) . ">$input</color-picker-plus>";
	}

	/**
	 * A swatch and the value (an SVG rectangle: no style attribute, CSP style-src stays strict)
	 *
	 * @return string
	 *
	 */
	public function ___renderValue() {
		$e = $this->wire()->sanitizer;
		$value = (string) $this->val();
		if($value === '') {
			$label = (string) $this->get('emptyLabel') !== '' ? (string) $this->get('emptyLabel') : $this->_('Default');
			return "<span class='InputfieldColorPickerPlusValue'>" . $e->entities($label) . "</span>";
		}
		$c = self::parseColor($value);
		$fill = $c ? sprintf('#%02x%02x%02x', (int) round($c[0]), (int) round($c[1]), (int) round($c[2])) : '#000000';
		$opacity = $c ? self::num($c[3]) : '1';
		return "<span class='InputfieldColorPickerPlusValue'>" .
			"<svg width='16' height='16' viewBox='0 0 16 16' aria-hidden='true'><rect x='.5' y='.5' width='15' height='15' rx='3' fill='$fill' fill-opacity='$opacity' stroke='rgba(0,0,0,.2)'/></svg> " .
			$e->entities($value) . "</span>";
	}

	/**
	 * Store the colour in the field's format; a value that is not a colour keeps the old one and errors
	 *
	 * @param WireInputData $input
	 * @return $this
	 *
	 */
	public function ___processInput(WireInputData $input) {
		$name = $this->attr('name');
		$raw = $input->$name;
		if($raw === null) return $this;
		$raw = is_string($raw) ? $raw : '';
		$value = self::normalize($raw, $this->formatName(), $this->hasAlpha());
		if($value === null) {
			$this->error(sprintf($this->_('Not a colour: %s'), $this->wire()->sanitizer->text($raw)));
			return $this;
		}
		if($value === '' && !$this->get('allowEmpty') && !$this->required) {
			$this->error($this->_('Pick a colour: this field cannot be empty.'));
			return $this;
		}
		$old = (string) $this->attr('value');
		if($value !== $old) {
			$this->attr('value', $value);
			$this->trackChange('value', $old, $value);
		}
		return $this;
	}

	/**
	 * Field settings: the picker (a gallery of screenshots; only the chosen picker is loaded live,
	 * below it), how it opens, transparency, format, empty state, palette
	 *
	 * @return InputfieldWrapper
	 *
	 */
	public function ___getConfigInputfields() {
		$inputfields = parent::___getConfigInputfields();
		$modules = $this->wire()->modules;
		$e = $this->wire()->sanitizer;
		// the text input's own settings that make no sense for a colour
		foreach(array('minlength', 'maxlength', 'showCount', 'size', 'pattern', 'stripTags', 'noTrim', 'placeholder', 'initValue') as $name) {
			$f = $inputfields->getChildByName($name);
			if($f) $f->getParent()->remove($f);
		}
		self::addAssets($this->wire());

		/** @var InputfieldFieldset $fs */
		$fs = $modules->get('InputfieldFieldset');
		$fs->attr('name', '_cppPicker');
		$fs->label = $this->_('Colour picker');
		$fs->icon = 'tint';
		$inputfields->prepend($fs);

		// the gallery: radios named "picker" after a hidden "picker" input, so the checked radio is
		// the posted value (the last of a name wins) and the hidden one carries it into the field
		/** @var InputfieldHidden $f */
		$f = $modules->get('InputfieldHidden');
		$f->attr('name', 'picker');
		$f->attr('value', $this->pickerName());
		$fs->add($f);
		$items = '';
		foreach(self::pickers() as $name => $label) {
			$checked = $name === $this->pickerName() ? ' checked' : '';
			$src = $this->wire()->config->urls('InputfieldColorPickerPlus') . "assets/previews/$name.png?v=" . rawurlencode(self::version);
			$items .= "<label class='cpp-gallery-item'><span class='cpp-gallery-name'>" .
				"<input type='radio' name='picker' value='$name' data-cpp-gallery$checked>" . $e->entities($label) . "</span>" .
				"<span class='cpp-gallery-shot'><img src='" . $e->entities($src) . "' alt='' loading='lazy'></span></label>";
		}
		/** @var InputfieldMarkup $f */
		$f = $modules->get('InputfieldMarkup');
		$f->attr('name', '_cppGallery');
		$f->label = $this->_('Picker');
		$f->description = $this->_('Screenshots of the thirteen pickers of react-color. The chosen one is shown live below; only that one is loaded on the page.');
		$f->value = "<div class='cpp-gallery' role='radiogroup'>$items</div>";
		$fs->add($f);

		/** @var InputfieldMarkup $f */
		$f = $modules->get('InputfieldMarkup');
		$f->attr('name', '_cppPreview');
		$f->label = $this->_('Try it');
		$attrs = $this->elementAttrs();
		$attrs['mode'] = 'inline';
		$attrs['data-cpp-preview'] = '';
		$f->value = "<color-picker-plus" . $this->attrString($attrs) . "><input type='text' class='uk-input' size='22' aria-label='" .
			$e->entities($this->_('Preview')) . "' value='#4a90e2' form='cpp-none'></color-picker-plus>";
		$f->notes = $this->_('Settings other than the picker show here after saving.');
		$fs->add($f);

		/** @var InputfieldRadios $f */
		$f = $modules->get('InputfieldRadios');
		$f->attr('name', 'mode');
		$f->label = $this->_('Opens');
		$f->addOption('popover', $this->_('From a swatch button, in a popover'));
		$f->addOption('inline', $this->_('Always open, under the field'));
		$f->attr('value', $this->get('mode') === 'inline' ? 'inline' : 'popover');
		$f->optionColumns = 1;
		$f->columnWidth = 50;
		$fs->add($f);

		/** @var InputfieldRadios $f */
		$f = $modules->get('InputfieldRadios');
		$f->attr('name', 'format');
		$f->label = $this->_('Stored as');
		$f->addOption('hex', $this->_('Hex: #rrggbb (#rrggbbaa with transparency)'));
		$f->addOption('rgb', $this->_('rgb() / rgba()'));
		$f->addOption('hsl', $this->_('hsl() / hsla()'));
		$f->attr('value', $this->formatName());
		$f->columnWidth = 50;
		$fs->add($f);

		/** @var InputfieldCheckbox $f */
		$f = $modules->get('InputfieldCheckbox');
		$f->attr('name', 'alpha');
		$f->label = $this->_('Transparency');
		$f->label2 = $this->_('Allow transparent colours (alpha)');
		$f->description = $this->_('The Sketch and Chrome pickers show an alpha slider; the Alpha picker always does.');
		if($this->get('alpha')) $f->attr('checked', 'checked');
		$f->columnWidth = 50;
		$fs->add($f);

		/** @var InputfieldCheckbox $f */
		$f = $modules->get('InputfieldCheckbox');
		$f->attr('name', 'allowEmpty');
		$f->label = $this->_('Empty value');
		$f->label2 = $this->_('Allow no colour (a clear button empties the field)');
		if($this->get('allowEmpty')) $f->attr('checked', 'checked');
		$f->columnWidth = 50;
		$fs->add($f);

		/** @var InputfieldText $f */
		$f = $modules->get('InputfieldText');
		$f->attr('name', 'emptyLabel');
		$f->label = $this->_('What empty means');
		$f->description = $this->_('Shown in the empty field and on the clear button, e.g. "Theme default".');
		$f->attr('placeholder', $this->_('Default'));
		$f->attr('value', (string) $this->get('emptyLabel'));
		$f->columnWidth = 50;
		$f->showIf = 'allowEmpty=1';
		$fs->add($f);

		/** @var InputfieldText $f */
		$f = $modules->get('InputfieldText');
		$f->attr('name', 'emptyColor');
		$f->label = $this->_('Colour shown while empty');
		$f->description = $this->_('The colour "empty" stands for (hex), shown struck through in the swatch.');
		$f->attr('value', (string) $this->get('emptyColor'));
		$f->attr('pattern', '^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$');
		$f->columnWidth = 50;
		$f->showIf = 'allowEmpty=1';
		$fs->add($f);

		/** @var InputfieldTextarea $f */
		$f = $modules->get('InputfieldTextarea');
		$f->attr('name', 'colors');
		$f->label = $this->_('Palette');
		$f->description = $this->_('Colours of the palette pickers (Sketch presets, Compact, Circle, Twitter, Block, Github, Swatches), one per line. Blank: the picker\'s own palette.');
		$f->attr('value', (string) $this->get('colors'));
		$f->attr('rows', 4);
		$f->collapsed = Inputfield::collapsedBlank;
		$fs->add($f);

		return $inputfields;
	}

	/**
	 * Settings when used on a module config screen or in code
	 *
	 * @return array
	 *
	 */
	public function ___getConfigAllowContext($field) {
		$a = parent::___getConfigAllowContext($field);
		return array_merge($a, array('picker', 'mode', 'alpha', 'format', 'allowEmpty', 'emptyLabel', 'emptyColor', 'colors'));
	}
}
