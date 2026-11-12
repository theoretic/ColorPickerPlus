import { PICKERS } from '../assets/dist/rcp.js';

const q = new URLSearchParams(location.search);
const only = q.get('picker');
const inline = q.has('inline');
if(q.has('dark')) document.body.classList.add('dark');
if(only) document.body.classList.add('shot');
const form = document.getElementById('demo');
const log = document.getElementById('log');
const values = { alpha: 'rgba(33, 150, 243, 0.6)', hue: '#ff6900', photoshop: '#7b1fa2', block: '#37d67a' };

for(const name of only ? [only] : PICKERS) {
	const row = document.createElement('div');
	row.className = 'row';
	const label = document.createElement('label');
	label.textContent = name;
	label.htmlFor = 'f-' + name;
	const picker = document.createElement('rcp-color-picker');
	picker.setAttribute('picker', name);
	picker.setAttribute('label', name);
	picker.setAttribute('allow-empty', '');
	if(name === 'sketch' || name === 'chrome' || name === 'alpha') picker.setAttribute('alpha', '');
	if(inline) picker.setAttribute('mode', 'inline');
	const input = document.createElement('input');
	input.type = 'text';
	input.name = name;
	input.id = 'f-' + name;
	input.value = values[name] || '#4a90e2';
	picker.append(input);
	row.append(label, picker);
	form.append(row);
	input.addEventListener('change', () => (log.textContent = `change ${name} = ${input.value}\n` + log.textContent));
}
window.demoReady = Promise.all([...document.querySelectorAll('rcp-color-picker')].map((p) => (inline ? p.ready() : Promise.resolve())));
