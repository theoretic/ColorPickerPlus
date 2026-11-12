/**
 * InputfieldReactColorPicker loader
 *
 * A classic script (admin themes print only classic <script> tags): imports the ES module
 * assets/dist/rcp.js, which defines <rcp-color-picker> for every field now and later (repeaters,
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
	if(src && !window.customElements.get('rcp-color-picker')) {
		import(src.replace(/InputfieldReactColorPicker\.js(\?.*)?$/, 'assets/dist/rcp.js$1')).catch(function(err) {
			console.error('InputfieldReactColorPicker: could not load the picker', err);
		});
	}
	document.addEventListener('change', function(e) {
		var t = e.target;
		if(!t || !t.matches || !t.matches('input[data-rcp-gallery]')) return;
		var preview = document.querySelector('rcp-color-picker[data-rcp-preview]');
		if(preview) preview.setAttribute('picker', t.value);
	});
})();
