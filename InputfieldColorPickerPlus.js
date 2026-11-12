/**
 * InputfieldColorPickerPlus loader
 *
 * A classic script (admin themes print only classic <script> tags): imports the ES module
 * assets/dist/color-picker-plus.js, which defines <color-picker-plus> for every field now and later (repeaters,
 * AJAX-loaded fields, modals: a custom element upgrades wherever it appears). Under AdminThemeBridge
 * the theme imports the same URL from data-bridge-module; the browser evaluates it once.
 *
 * Also: on a field's settings screen, picking a picker in the gallery switches the live preview
 * (which then loads that picker only).
 *
 * MIT.
 */
(function() {
	var current = document.currentScript;
	var src = current && current.src ? current.src : '';
	if(src && !window.customElements.get('color-picker-plus')) {
		import(src.replace(/InputfieldColorPickerPlus\.js(\?.*)?$/, 'assets/dist/color-picker-plus.js$1')).catch(function(err) {
			console.error('InputfieldColorPickerPlus: could not load the picker', err);
		});
	}
	document.addEventListener('change', function(e) {
		var t = e.target;
		if(!t || !t.matches || !t.matches('input[data-cpp-gallery]')) return;
		var preview = document.querySelector('color-picker-plus[data-cpp-preview]');
		if(preview) preview.setAttribute('picker', t.value);
	});
})();
