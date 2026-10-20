import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { root, basePath } from './config.mjs';

const dist = resolve(root, 'dist');
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const request = new URL(req.url, 'http://127.0.0.1');
    let path = decodeURIComponent(request.pathname);
    if (basePath && (path === '/' || path === basePath)) {
      res.writeHead(302, { Location: basePath + '/' });
      return res.end();
    }
    if (!path.startsWith(basePath + '/')) throw new Error('Not found');
    path = path.slice(basePath.length + 1);
    let target = resolve(dist, path || 'index.html');
    if (!target.startsWith(dist + sep)) throw new Error('Not found');
    if ((await stat(target)).isDirectory()) {
      if (!request.pathname.endsWith('/')) {
        res.writeHead(302, { Location: request.pathname + '/' + request.search });
        return res.end();
      }
      target = resolve(target, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(resolve(dist, '404.html')));
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${basePath}/`));
