<?php namespace ProcessWire;

/**
 * Adds the test page /cpp-test/ (template cpp_test) to a Bridge sandbox: one Text field per
 * picker with InputfieldColorPickerPlus as its input (Sketch with alpha in rgb(), Chrome in hsl(),
 * Circle inline, Photoshop not empty), or removes it all again with --remove.
 *
 * Usage: php tests/sandbox-fixture.php <bridge repo> <sandbox root> [--remove]
 * Behind the Bridge sandbox guard (tools/lib/sandbox-guard.php): a sandbox database only.
 * Prints CPP_ID=<page id> for tests/browser-check.cjs.
 *
 * MIT.
 */

if(count($argv) < 3) exit("Usage: php tests/sandbox-fixture.php <bridge repo> <sandbox root> [--remove]\n");
require rtrim($argv[1], '/\\') . '/tools/lib/sandbox-guard.php';
$root = bridgeSandboxRoot($argv[2]);
$remove = in_array('--remove', $argv, true);
if(empty($_SERVER['DOCUMENT_ROOT'])) $_SERVER['DOCUMENT_ROOT'] = $root;
include "$root/index.php";
/** @var Config $config */
bridgeSandboxBooted($config, $root);
$fields = wire('fields');
$templates = wire('templates');
$fieldgroups = wire('fieldgroups');
$pages = wire('pages');

$specs = array();
foreach(InputfieldColorPickerPlus::pickers() as $name => $label) {
	$specs["cpp_$name"] = array('label' => "$label picker", 'picker' => $name);
}
$specs['cpp_sketch'] += array('alpha' => 1, 'format' => 'rgb', 'emptyLabel' => 'Theme default', 'emptyColor' => '#2563eb');
$specs['cpp_chrome'] += array('format' => 'hsl');
$specs['cpp_circle'] += array('mode' => 'inline');
$specs['cpp_photoshop'] += array('allowEmpty' => 0);
$values = array('cpp_sketch' => '', 'cpp_photoshop' => '#7b1fa2', 'cpp_alpha' => '#2196f399');

if($remove) {
	$page = $pages->get('/cpp-test/');
	if($page->id) $pages->delete($page, true);
	$tpl = $templates->get('cpp_test');
	if($tpl) {
		$fg = $tpl->fieldgroup;
		$templates->delete($tpl);
		if($fg) $fieldgroups->delete($fg);
	}
	foreach(array_keys($specs) as $name) {
		$f = $fields->get($name);
		if($f) $fields->delete($f);
	}
	echo "removed /cpp-test/, template cpp_test and the cpp_* fields\n";
	exit(0);
}

$fg = $fieldgroups->get('cpp_test');
if(!$fg) {
	$fg = new Fieldgroup();
	$fg->name = 'cpp_test';
	$fg->add($fields->get('title'));
	$fieldgroups->save($fg);
}
foreach($specs as $name => $spec) {
	$f = $fields->get($name);
	if(!$f) {
		$f = new Field();
		$f->type = wire('modules')->get('FieldtypeText');
		$f->name = $name;
	}
	$f->label = $spec['label'];
	$f->set('inputfieldClass', 'InputfieldColorPickerPlus');
	foreach(array('picker', 'mode', 'alpha', 'format', 'allowEmpty', 'emptyLabel', 'emptyColor') as $k) {
		if(isset($spec[$k])) $f->set($k, $spec[$k]);
	}
	$f->set('columnWidth', 50);
	$fields->save($f);
	if(!$fg->hasField($f)) $fg->add($f);
}
$fg->save();
$tpl = $templates->get('cpp_test');
if(!$tpl) {
	$tpl = new Template();
	$tpl->name = 'cpp_test';
	$tpl->fieldgroup = $fg;
	$templates->save($tpl);
}
$page = $pages->get('/cpp-test/');
if(!$page->id) {
	$page = new Page();
	$page->template = $tpl;
	$page->parent = $pages->get('/');
	$page->name = 'cpp-test';
	$page->title = 'Colour picker test';
	$page->addStatus(Page::statusHidden);
}
foreach($values as $k => $v) $page->set($k, $v);
foreach(array_keys($specs) as $name) if(!isset($values[$name])) $page->set($name, '#4a90e2');
$pages->save($page);
echo "CPP_ID={$page->id}\nCPP_FIELD_ID=" . $fields->get('cpp_sketch')->id . "\n";
