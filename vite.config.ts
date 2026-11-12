import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * Builds assets/dist/ (committed, so sites need no node):
 *
 *   color-picker-plus.js                 the <color-picker-plus> element, colour model and popover
 *   pickers/<name>-*.js    one chunk per picker, imported only when a field uses that picker
 *   pickers/parts-*.js     shared parts (saturation, hue, alpha, inputs, swatches)
 *
 * A multi-entry app build rather than lib mode (lib mode does not minify ES whitespace); base './'
 * and no modulepreload helper keep every chunk URL relative to color-picker-plus.js, wherever the module lives.
 * CSS is imported as strings (?inline) and adopted by each shadow root, so no <style> or style=
 * attribute reaches the page (CSP style-src, Trusted Types).
 */
export default defineConfig({
	base: './',
	publicDir: false,
	build: {
		outDir: 'assets/dist',
		emptyOutDir: true,
		target: 'es2022',
		minify: 'terser',
		terserOptions: {
			compress: { passes: 2, module: true, pure_getters: true },
			format: { comments: false },
		},
		modulePreload: false,
		rollupOptions: {
			input: { 'color-picker-plus': fileURLToPath(new URL('./src/index.ts', import.meta.url)) },
			preserveEntrySignatures: 'allow-extension',
			output: {
				format: 'es',
				entryFileNames: '[name].js',
				chunkFileNames: 'pickers/[name]-[hash].js',
			},
		},
	},
});
