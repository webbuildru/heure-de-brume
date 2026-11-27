import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' };
const port = Number(process.env.PORT ?? 4173);

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    const file = resolve(root, '.' + relative);
    if (!file.startsWith(root + sep)) throw new Error('Outside preview directory');
    const data = await readFile(file);
    const type = types[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type.startsWith('image/') ? type : type + '; charset=utf-8' });
    response.end(data);
  } catch {
    const data = await readFile(resolve(root, '404.html')).catch(() => 'Сначала выполните npm run build');
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(data);
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/`));
