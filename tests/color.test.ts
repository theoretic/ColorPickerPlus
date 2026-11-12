// Colour model tests: node tests/color.test.ts (Node strips the types). Exit code = failures.
import { format, isTypedHex, parseColor, parseHex, toState } from '../src/color.ts';

let failed = 0;
const eq = (name: string, got: unknown, want: unknown) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if(!ok) failed++;
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const st = (v: string) => toState(parseColor(v)!)!;

eq('hex 6', parseHex('#4a90e2'), { r: 74, g: 144, b: 226, a: 1 });
eq('hex 3 without #', parseHex('fff'), { r: 255, g: 255, b: 255, a: 1 });
eq('hex 8 alpha', parseHex('#2196f399'), { r: 33, g: 150, b: 243, a: 0.6 });
eq('not hex', parseHex('#12345'), null);
eq('rgba()', parseColor('rgba(33, 150, 243, 0.6)'), { r: 33, g: 150, b: 243, a: 0.6 });
eq('rgb() space syntax', parseColor('rgb(10 20 30 / 50%)'), { r: 10, g: 20, b: 30, a: 0.5 });
eq('hsl() red', format(st('hsl(0, 100%, 50%)')), '#ff0000');
eq('garbage', parseColor('nonsense'), null);
eq('empty', parseColor(''), null);
eq('format hex', format(st('#4A90E2')), '#4a90e2');
eq('format rgb', format(st('#4a90e2'), 'rgb'), 'rgb(74, 144, 226)');
eq('format rgba', format(st('rgba(74,144,226,.5)'), 'rgb', true), 'rgba(74, 144, 226, 0.5)');
eq('format hsl', format(st('#ff0000'), 'hsl'), 'hsl(0, 100%, 50%)');
eq('format hex alpha', format(st('rgba(255,0,0,.5)'), 'hex', true), '#ff000080');
eq('alpha dropped without alpha', format(st('rgba(255,0,0,.5)'), 'hex', false), '#ff0000');
eq('hsv input', toState({ h: 120, s: 1, v: 1 })!.hex, '#00ff00');
eq('hsl input', toState({ h: 240, s: 1, l: 0.5 })!.hex, '#0000ff');
eq('grey keeps the old hue', toState({ hex: '#808080' }, 200)!.hsl.h, 200);
eq('round trip', toState(toState({ hex: '#7b1fa2' })!.hsv)!.hex, '#7b1fa2');
eq('typed hex 6', isTypedHex('4a90e2'), true);
eq('typed hex 4 refused', isTypedHex('#4a90'), false);
eq('typed hex 8 only with alpha', [isTypedHex('#4a90e2ff'), isTypedHex('#4a90e2ff', true)], [false, true]);

process.exit(failed);
