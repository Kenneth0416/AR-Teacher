// Tiny zero-dependency static file server used by the build scripts.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.css': 'text/css', '.mind': 'application/octet-stream', '.wasm': 'application/wasm',
};

/** Serve `root` on 127.0.0.1:<random port>. `routes` maps url path -> {type, body} overrides. */
export async function startStaticServer(root, routes = {}) {
  root = resolve(root);
  const server = http.createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (routes[path]) {
        res.writeHead(200, { 'content-type': routes[path].type });
        return res.end(routes[path].body);
      }
      let file = normalize(join(root, path));
      if (path.endsWith('/')) file = join(file, 'index.html');
      if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
      const s = await stat(file);
      if (!s.isFile()) throw new Error('not a file');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}
