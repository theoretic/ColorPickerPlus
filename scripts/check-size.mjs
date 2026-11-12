// Gzip budgets of assets/dist: the element, each picker chunk, and the shared chunk(s).
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../assets/dist/', import.meta.url);
const budgets = { entry: 7 * 1024, picker: 4 * 1024, shared: 6 * 1024 };
const pickers = ['sketch', 'chrome', 'photoshop', 'compact', 'circle', 'twitter', 'block', 'github', 'swatches', 'material', 'hue', 'slider', 'alpha'];
let failed = 0;
const check = (file, kind) => {
	const size = gzipSync(readFileSync(new URL(file, dist))).length;
	const ok = size <= budgets[kind];
	if(!ok) failed++;
	console.log(`${ok ? 'ok  ' : 'OVER'} ${file.padEnd(34)} ${String(size).padStart(6)} B gzip (${kind} budget ${budgets[kind]})`);
};
check('color-picker-plus.js', 'entry');
for(const f of readdirSync(new URL('pickers/', dist)).sort()) {
	const name = f.replace(/-[\w-]{8}\.js$/, '');
	check('pickers/' + f, pickers.includes(name) ? 'picker' : 'shared');
}
process.exit(failed ? 1 : 0);
