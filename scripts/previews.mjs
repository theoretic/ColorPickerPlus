// Screenshots of each picker for the field settings gallery: assets/previews/<name>.png
// (the gallery shows these; only the selected picker is loaded live).
//   PW=<path to playwright-core> node scripts/previews.mjs [--sheet]
// --sheet also writes tests/output/sheet-light.png and sheet-dark.png (every picker open, for review).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const pw = require(process.env.PW || 'playwright-core');
const PICKERS = ['sketch', 'chrome', 'photoshop', 'compact', 'circle', 'twitter', 'block', 'github', 'swatches', 'material', 'hue', 'slider', 'alpha'];
const out = (p) => fileURLToPath(new URL('../' + p, import.meta.url));

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}/tests/demo.html`;
const browser = await pw.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
	const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
	mkdirSync(out('assets/previews'), { recursive: true });
	for(const name of PICKERS) {
		await page.goto(`${base}?picker=${name}&inline=1`);
		await page.evaluate(() => window.demoReady);
		const picker = page.locator('color-picker-plus .picker > *').first();
		await picker.waitFor();
		await picker.screenshot({ path: out(`assets/previews/${name}.png`), omitBackground: true });
		console.log('preview', name);
	}
	if(process.argv.includes('--sheet')) {
		mkdirSync(out('tests/output'), { recursive: true });
		for(const scheme of ['light', 'dark']) {
			await page.goto(`${base}?inline=1${scheme === 'dark' ? '&dark=1' : ''}`);
			await page.evaluate(() => window.demoReady);
			await page.screenshot({ path: out(`tests/output/sheet-${scheme}.png`), fullPage: true });
			console.log('sheet', scheme);
		}
	}
} finally {
	await browser.close();
	server.close();
}
