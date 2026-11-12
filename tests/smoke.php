<?php namespace ProcessWire;

/**
 * Smoke test of InputfieldColorPickerPlus on a Bridge sandbox (installed there).
 *
 * Usage: php tests/smoke.php <bridge repo> <sandbox root>
 * Behind the Bridge sandbox guard. Exit code = failed checks.
 *
 * MIT.
 */

if(count($argv) < 3) exit("Usage: php tests/smoke.php <bridge repo> <sandbox root>\n");
require rtrim($argv[1], '/\\') . '/tools/lib/sandbox-guard.php';
$root = bridgeSandboxRoot($argv[2]);
if(empty($_SERVER['DOCUMENT_ROOT'])) $_SERVER['DOCUMENT_ROOT'] = $root;
ob_start();
include "$root/index.php";
ob_end_clean();
/** @var Config $config */
bridgeSandboxBooted($config, $root);
$dir = dirname(__DIR__) . '/';
$failed = 0;
function check($name, $ok, $info = '') {
	global $failed;
	if(!$ok) $failed++;
	echo ($ok ? 'ok   ' : 'FAIL ') . $name . ($ok || $info === '' ? '' : "  [$info]") . "\n";
}

$modules = wire('modules');
check('module installed', $modules->isInstalled('InputfieldColorPickerPlus'));
$info = InputfieldColorPickerPlus::getModuleInfo();
check('version matches the CHANGELOG', strpos((string) file_get_contents($dir . 'CHANGELOG.md'), '## ' . $info['version']) !== false, $info['version']);
check('version matches package.json', json_decode(file_get_contents($dir . 'package.json'), true)['version'] === $info['version']);

// normalize(): the server's copy of the client's formats
$n = function($v, $f = 'hex', $a = false) { return InputfieldColorPickerPlus::normalize($v, $f, $a); };
check('hex lower case', $n('#4A90E2') === '#4a90e2');
check('hex 3', $n('#fff') === '#ffffff');
check('empty stays empty', $n('  ') === '');
check('not a colour is null', $n('nope') === null && $n('#12345') === null && $n('rgb(1,2)') === null);
check('rgb()', $n('#4a90e2', 'rgb') === 'rgb(74, 144, 226)');
check('rgba() with alpha', $n('#2196f399', 'rgb', true) === 'rgba(33, 150, 243, 0.6)', (string) $n('#2196f399', 'rgb', true));
check('alpha dropped without alpha', $n('rgba(255, 0, 0, 0.5)') === '#ff0000');
check('hex with alpha', $n('rgba(255, 0, 0, 0.5)', 'hex', true) === '#ff000080', (string) $n('rgba(255, 0, 0, 0.5)', 'hex', true));
check('hsl()', $n('#ff0000', 'hsl') === 'hsl(0, 100%, 50%)' && $n('hsl(120, 100%, 25%)') === '#008000', (string) $n('hsl(120, 100%, 25%)'));
check('hsla()', $n('hsla(210, 50%, 50%, .25)', 'hsl', true) === 'hsla(210, 50%, 50%, 0.25)', (string) $n('hsla(210, 50%, 50%, .25)', 'hsl', true));

// the thirteen pickers: a source file, a built chunk and a screenshot each
$pickers = array_keys(InputfieldColorPickerPlus::pickers());
check('thirteen pickers', count($pickers) === 13);
$dist = glob($dir . 'assets/dist/pickers/*.js');
foreach($pickers as $p) {
	$chunk = preg_grep('!/' . $p . '-[\w-]+\.js$!', $dist);
	check("picker $p: source, one chunk, preview", is_file($dir . "src/pickers/$p.ts") && count($chunk) === 1 && is_file($dir . "assets/previews/$p.png"));
}
check('color-picker-plus.js built', is_file($dir . 'assets/dist/color-picker-plus.js'));
$bc = $modules->get('InputfieldColorPickerPlus')->getBridgeComponent();
check('Bridge component: tag and module', $bc['tag'] === 'color-picker-plus' && is_file($dir . preg_replace('/\?.*$/', '', $bc['module'])));
check('implements BridgeComponent when Bridge is there', !interface_exists('ProcessWire\BridgeComponent', false) || $modules->get('InputfieldColorPickerPlus') instanceof BridgeComponent);
check('is a text input for FieldtypeText', $modules->get('InputfieldColorPickerPlus') instanceof InputfieldHasTextValue);

// render()
$f = $modules->get('InputfieldColorPickerPlus');
$f->attr('name', 'accent');
$f->label = 'Accent <b>';
$f->val('#ff6900');
$f->picker = 'chrome';
$f->alpha = 1;
$f->emptyColor = '#2563EB';
$f->colors = "#ff0000\nnot a colour\n#00ff00";
$out = $f->render();
check('render: element wraps the input', (bool) preg_match('!^<color-picker-plus [^>]*><input [^>]*name="accent"[^>]*/></color-picker-plus>$!', $out), $out);
check('render: picker, alpha, placeholder, palette', strpos($out, "picker='chrome'") !== false && strpos($out, ' alpha') !== false &&
	strpos($out, "placeholder='#2563eb'") !== false && strpos($out, "colors='[&quot;#ff0000&quot;,&quot;#00ff00&quot;]'") !== false, $out);
check('render: label escaped', strpos($out, 'Accent &lt;b&gt;') !== false);
check('render: no style attribute, no script', stripos($out, 'style=') === false && stripos($out, '<script') === false);
check('render: unknown picker falls back to sketch', (function() use($modules) {
	$g = $modules->get('InputfieldColorPickerPlus');
	$g->attr('name', 'x');
	$g->picker = 'nope';
	return strpos($g->render(), "picker='sketch'") !== false;
})());

// processInput()
$post = function($value, array $settings = array()) use($modules) {
	$g = $modules->get('InputfieldColorPickerPlus');
	$g->attr('name', 'c');
	$g->val('#111111');
	foreach($settings as $k => $v) $g->set($k, $v);
	$data = array('c' => $value);
	$in = new WireInputData($data);
	$g->processInput($in);
	return array((string) $g->val(), count($g->getErrors(true)));
};
check('processInput: hex normalised', $post('#ABC') === array('#aabbcc', 0));
check('processInput: format rgb', $post('#ff0000', array('format' => 'rgb')) === array('rgb(255, 0, 0)', 0));
check('processInput: invalid keeps old value and errors', $post('red-ish') === array('#111111', 1));
check('processInput: empty allowed', $post('') === array('', 0));
check('processInput: empty refused when not allowed', $post('', array('allowEmpty' => 0)) === array('#111111', 1));
check('processInput: alpha kept only with alpha', $post('#ff000080') === array('#ff0000', 0) && $post('#ff000080', array('alpha' => 1)) === array('#ff000080', 0));

// renderValue()
$f->val('#ff6900');
$rv = $f->renderValue();
check('renderValue: swatch without style attribute', strpos($rv, "fill='#ff6900'") !== false && stripos($rv, 'style=') === false, $rv);

// settings
$wrapper = $f->getConfigInputfields();
check('settings: gallery, preview, own settings', $wrapper->getChildByName('_cppGallery') && $wrapper->getChildByName('_cppPreview') &&
	$wrapper->getChildByName('picker') && $wrapper->getChildByName('format') && $wrapper->getChildByName('emptyColor'));
check('settings: text-only settings removed', !$wrapper->getChildByName('pattern') && !$wrapper->getChildByName('maxlength'));
check('settings: 13 gallery radios', substr_count($wrapper->getChildByName('_cppGallery')->value, 'data-cpp-gallery') === 13);

exit($failed);
