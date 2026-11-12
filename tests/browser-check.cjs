'use strict';
// Browser checks of InputfieldReactColorPicker on a Bridge sandbox (tests/sandbox-fixture.php first).
//   BRIDGE=<bridge repo> [BASE=http://localhost:8089] [RCP_ID=..] [RCP_FIELD_ID=..] [PW=<playwright-core>]
//   node tests/browser-check.cjs [--json]
// Logs in as the sandbox user "bridge" (tools/lib/sandbox.cjs reads sandbox/<site>/.credentials).
// Exit code = failed checks.
const path = require('path');
const BRIDGE = process.env.BRIDGE || path.resolve(__dirname, '../../../bridge');
const sandbox = require(path.join(BRIDGE, 'tools/lib/sandbox.cjs'));
const pw = require(process.env.PW || 'playwright-core');
const ADMIN = sandbox.adminUrl();
const RCP_ID = process.env.RCP_ID;
const FIELD_ID = process.env.RCP_FIELD_ID;
if(!RCP_ID || !FIELD_ID) {
	console.error('Set RCP_ID and RCP_FIELD_ID (printed by tests/sandbox-fixture.php)');
	process.exit(2);
}
const results = [];
const check = (name, ok, info) => results.push({ ok: !!ok, name, info: info === undefined ? '' : String(info).slice(0, 300) });

(async () => {
	const browser = await pw.chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
	const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
	const page = await ctx.newPage();
	const errors = [];
	const chunks = new Set();
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => { if(m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
	page.on('request', (r) => {
		const m = /\/assets\/dist\/pickers\/([a-z]+)-[\w-]+\.js/.exec(r.url());
		if(m) chunks.add(m[1]);
	});
	page.on('dialog', (d) => d.accept());
	const open = async (p) => {
		chunks.clear();
		await page.goto(ADMIN + p, { waitUntil: 'networkidle' });
		if(await page.locator('#login_name').count()) {
			await page.fill('#login_name', 'bridge');
			await page.fill('#login_pass', sandbox.password());
			await Promise.all([page.waitForNavigation(), page.click('#Inputfield_login_submit')]);
			chunks.clear();
			await page.goto(ADMIN + p, { waitUntil: 'networkidle' });
		}
		if(await page.locator('#login_name').count()) throw new Error('login failed');
		await page.waitForFunction(() => !!customElements.get('rcp-color-picker'));
		await page.waitForTimeout(300);
	};
	const picker = (name) => page.locator(`rcp-color-picker:has(input[name="rcp_${name}"])`);
	const value = (name) => page.inputValue(`input[name="rcp_${name}"]`);
	const loaded = () => [...chunks].filter((c) => c !== 'parts').sort().join(',');
	const edit = `page/edit/?id=${RCP_ID}`;

	try {
		// A: the edit screen loads the element; only the inline picker's chunk until a popover opens
		await open(edit);
		check('A 13 colour fields render as rcp-color-picker', (await page.locator('rcp-color-picker').count()) === 13);
		check('A only the inline picker (circle) loaded on page load', loaded() === 'circle', loaded());
		check('A wrapper keeps the Inputfield classes', await page.locator('.Inputfield.InputfieldReactColorPicker #Inputfield_rcp_sketch').count() === 1);
		check('A jQuery state (info)', true, await page.evaluate(() => (window.jQuery ? 'jQuery loaded (legacy stack on this screen)' : 'no jQuery')));

		// B: Sketch popover, preset click -> rgb() value, input and change events
		await page.evaluate(() => {
			window.__rcp = [];
			const i = document.querySelector('input[name="rcp_sketch"]');
			['input', 'change'].forEach((t) => i.addEventListener(t, () => window.__rcp.push(t + ':' + i.value)));
		});
		check('B Sketch starts empty, swatch struck through', (await value('sketch')) === '' && await picker('sketch').evaluate((e) => e.hasAttribute('empty')));
		await picker('sketch').locator('button.swatch').click();
		await page.waitForTimeout(400);
		check('B popover opens and loads sketch only now', await picker('sketch').evaluate((e) => e.shadowRoot.querySelector('.panel').matches(':popover-open')) && chunks.has('sketch') && !chunks.has('chrome'), loaded());
		await picker('sketch').locator('.preset button').first().click();
		check('B preset sets rgb() value', (await value('sketch')) === 'rgb(208, 2, 27)', await value('sketch'));
		check('B input and change dispatched', JSON.stringify(await page.evaluate(() => window.__rcp)) === JSON.stringify(['input:rgb(208, 2, 27)', 'change:rgb(208, 2, 27)']), JSON.stringify(await page.evaluate(() => window.__rcp)));
		// keyboard on the saturation square
		await picker('sketch').locator('.rcp-sat').focus();
		await page.keyboard.press('ArrowLeft');
		check('B saturation square moves with the keyboard', (await value('sketch')) !== 'rgb(208, 2, 27)', await value('sketch'));
		// drag on the alpha slider
		const box = await picker('sketch').locator('.rcp-alpha .rcp-track').boundingBox();
		await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 4 });
		await page.mouse.up();
		check('B alpha drag gives rgba()', /^rgba\(\d+, \d+, \d+, 0\.[45]\d?\)$/.test(await value('sketch')), await value('sketch'));
		await page.keyboard.press('Escape');
		check('B Escape closes the popover', !(await picker('sketch').evaluate((e) => e.shadowRoot.querySelector('.panel').matches(':popover-open'))));
		// clear
		await picker('sketch').locator('button.clear').click();
		check('B clear empties the field', (await value('sketch')) === '');

		// C: typed values are normalised to the field's format (Chrome stores hsl())
		await page.fill('input[name="rcp_chrome"]', '#ff0000');
		await page.press('input[name="rcp_chrome"]', 'Tab');
		check('C typed hex becomes hsl()', (await value('chrome')) === 'hsl(0, 100%, 50%)', await value('chrome'));
		await page.fill('input[name="rcp_chrome"]', 'nonsense');
		await page.press('input[name="rcp_chrome"]', 'Tab');
		check('C invalid typed value reverts', (await value('chrome')) === 'hsl(0, 100%, 50%)', await value('chrome'));

		// D: Photoshop: change then Cancel restores; no clear button (allowEmpty off)
		check('D Photoshop has no clear button', await picker('photoshop').evaluate((e) => e.shadowRoot.querySelector('.clear').hidden));
		await picker('photoshop').locator('button.swatch').click();
		await page.waitForTimeout(400);
		const sat = await picker('photoshop').locator('.rcp-sat').boundingBox();
		await page.mouse.click(sat.x + 10, sat.y + 10);
		const moved = await value('photoshop');
		await picker('photoshop').locator('button.button:not(.active)').click();
		check('D Photoshop Cancel restores the colour', moved !== '#7b1fa2' && (await value('photoshop')) === '#7b1fa2', moved + ' -> ' + (await value('photoshop')));

		// E: inline Circle click, then save and reload
		await picker('circle').locator('.rcp-swatch').nth(3).click();
		check('E inline Circle sets a value', (await value('circle')) === '#673ab7', await value('circle'));
		await picker('twitter').locator('button.swatch').click();
		await page.waitForTimeout(300);
		await picker('twitter').locator('.colors .rcp-swatch').nth(1).click();
		await page.keyboard.press('Escape');
		await Promise.all([page.waitForLoadState('networkidle'), page.click('#submit_save')]);
		await page.waitForTimeout(800);
		await open(edit);
		check('E saved: circle', (await value('circle')) === '#673ab7', await value('circle'));
		check('E saved: twitter', (await value('twitter')) === '#fcb900', await value('twitter'));
		check('E saved: chrome hsl()', (await value('chrome')) === 'hsl(0, 100%, 50%)', await value('chrome'));
		check('E saved: sketch empty', (await value('sketch')) === '');

		// F: the server rejects a value that is not a colour (set without the client's change)
		await page.evaluate(() => { document.querySelector('input[name="rcp_material"]').value = 'not a colour'; });
		await Promise.all([page.waitForLoadState('networkidle'), page.click('#submit_save')]);
		await page.waitForTimeout(800);
		await open(edit);
		check('F server keeps the old value for a non-colour', (await value('material')) === '#4a90e2', await value('material'));

		// G: field settings: gallery of screenshots, only the chosen picker live
		await open(`setup/field/edit?id=${FIELD_ID}`);
		const input = page.locator('a#_Inputfield_input, a[href="#Inputfield_input"], #_ProcessFieldEditInput');
		if(await input.count()) await input.first().click().catch(() => {});
		await page.waitForTimeout(300);
		check('G gallery has 13 radios and screenshots', (await page.locator('input[data-rcp-gallery]').count()) === 13 && (await page.locator('.rcp-gallery img').count()) === 13);
		check('G only the chosen picker (sketch) is loaded live', loaded() === 'sketch', loaded());
		await page.locator('input[data-rcp-gallery][value="photoshop"]').evaluate((r) => r.click());
		await page.waitForTimeout(600);
		check('G picking Photoshop loads only it', loaded() === 'photoshop,sketch' && await page.locator('rcp-color-picker[data-rcp-preview]').evaluate((e) => !!e.shadowRoot.querySelector('.photoshop-picker')), loaded());
		const posted = await page.evaluate(() => new FormData(document.querySelector('input[data-rcp-gallery]').form).getAll('picker'));
		check('G the checked radio is the last posted "picker"', posted[posted.length - 1] === 'photoshop', JSON.stringify(posted));

		check('no page errors', errors.length === 0, errors.join(' | '));
	} catch(err) {
		check('run', false, err.stack || err.message);
	} finally {
		await browser.close();
	}
	const failed = results.filter((r) => !r.ok).length;
	if(process.argv.includes('--json')) console.log(JSON.stringify({ failed, results }, null, 1));
	else for(const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.info ? '  [' + r.info + ']' : ''}`);
	process.exit(failed);
})();
