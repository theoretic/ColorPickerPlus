// Static server for tests/demo.html and the preview screenshots: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

export function serve(port = 0) {
	const server = createServer(async (req, res) => {
		const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
		if(path.includes('..')) return res.writeHead(403).end();
		try {
			const body = await readFile(join(root, path));
			res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(body);
		} catch {
			res.writeHead(404).end('not found');
		}
	});
	return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const s = await serve(Number(process.argv[2] || 8095));
	console.log('http://127.0.0.1:' + s.address().port + '/tests/demo.html');
}
