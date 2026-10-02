// Production static server for dist/: precompressed (br/gzip) responses,
// immutable caching for hashed assets, and security headers. No dependencies.
// Usage: npm run build && npm start   (PORT and HOST env vars, default 4321 / 0.0.0.0)
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const root = new URL('./dist/', import.meta.url).pathname;
const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const compressible = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);

const security = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// dist/ is small: load and compress everything once at startup.
const files = new Map();
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { walk(path); continue; }
    const ext = extname(name);
    const body = readFileSync(path);
    const entry = { body, type: types[ext] ?? 'application/octet-stream' };
    if (compressible.has(ext) && body.length > 1024) {
      entry.br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
      entry.gz = gzipSync(body, { level: 9 });
    }
    entry.cache = path.includes(`${sep}_astro${sep}`)
      ? 'public, max-age=31536000, immutable'
      : ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400';
    files.set('/' + relative(root, path).split(sep).join('/'), entry);
  }
})(root);

function lookup(pathname) {
  if (pathname.endsWith('/')) pathname += 'index.html';
  return files.get(pathname) ?? files.get(pathname + '/index.html') ?? files.get(pathname + '.html');
}

createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return;
  }
  const file = lookup(pathname) ?? files.get('/404.html');
  const status = file === lookup(pathname) ? 200 : 404;
  if (!file) { res.writeHead(404, security).end('Not found'); return; }

  const accept = req.headers['accept-encoding'] ?? '';
  let body = file.body, encoding;
  if (file.br && /\bbr\b/.test(accept)) { body = file.br; encoding = 'br'; }
  else if (file.gz && /\bgzip\b/.test(accept)) { body = file.gz; encoding = 'gzip'; }

  // COOP and HSTS only take effect over HTTPS (e.g. behind a TLS proxy); over plain HTTP
  // Chrome logs COOP as a console error, so send them only when the request was secure.
  const secure = req.headers['x-forwarded-proto'] === 'https';
  res.writeHead(status, {
    ...security,
    ...(secure ? {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    } : {}),
    'Content-Type': file.type,
    'Content-Length': body.length,
    'Cache-Control': file.cache,
    ...(file.br ? { Vary: 'Accept-Encoding' } : {}),
    ...(encoding ? { 'Content-Encoding': encoding } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(port, host, () => console.log(`Serving ${root} on http://${host}:${port}`));
