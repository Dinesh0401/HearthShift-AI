/**
 * Static HTTP Server for Gate 2 (`out/`) Verification
 *
 * Serves Next.js `output: 'export'` artifacts from `out/` cleanly with zero
 * server-side framework execution, applies response headers parsed from
 * `out/_headers` (matching Cloudflare Pages `_headers` behavior), and enforces
 * fast deterministic shutdown without lingering keep-alive sockets on Windows.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'out');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3008);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Parse Cloudflare Pages `_headers` rules (`/*` path prefix + indented `Key: Value` pairs).
 * @param {string} headersPath
 * @returns {Array<{ prefix: string, headers: Array<[string, string]> }>}
 */
function parseHeadersFile(headersPath) {
  if (!fs.existsSync(headersPath)) {
    return [];
  }
  const lines = fs.readFileSync(headersPath, 'utf8').split(/\r?\n/);
  const rules = [];
  let current = null;

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
      continue;
    }
    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
      current = { prefix: rawLine.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    if (current) {
      const colonIdx = rawLine.indexOf(':');
      if (colonIdx !== -1) {
        const key = rawLine.slice(0, colonIdx).trim();
        const val = rawLine.slice(colonIdx + 1).trim();
        if (key && val) {
          current.headers.push([key, val]);
        }
      }
    }
  }
  return rules;
}

function matchesRule(requestPath, rulePrefix) {
  if (rulePrefix === '/*' || rulePrefix === '/') {
    return true;
  }
  if (rulePrefix.endsWith('/*')) {
    return requestPath.startsWith(rulePrefix.slice(0, -1));
  }
  return requestPath === rulePrefix;
}

function resolveStaticFile(urlPath) {
  const cleanUrlPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.posix.normalize(cleanUrlPath);
  if (normalized.includes('..')) {
    return null;
  }

  const relative = normalized.replace(/^\/+/, '');
  const candidates = [];

  if (!relative) {
    candidates.push(path.join(OUT_DIR, 'index.html'));
  } else {
    candidates.push(path.join(OUT_DIR, relative));
    candidates.push(path.join(OUT_DIR, `${relative}.html`));
    candidates.push(path.join(OUT_DIR, relative, 'index.html'));
  }

  for (const candidate of candidates) {
    if (
      candidate.startsWith(OUT_DIR) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
    ) {
      return candidate;
    }
  }

  return null;
}

if (!fs.existsSync(path.join(OUT_DIR, 'index.html'))) {
  console.error(`Error: Static export directory missing at ${OUT_DIR}. Run NEXT_STATIC_EXPORT=true npm run build first.`);
  process.exit(1);
}

const headerRules = parseHeadersFile(path.join(OUT_DIR, '_headers'));

const server = http.createServer((req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  const rawUrl = req.url || '/';
  const pathname = rawUrl.split('?')[0];

  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' });
    res.end('Method Not Allowed');
    return;
  }

  for (const rule of headerRules) {
    if (matchesRule(pathname, rule.prefix)) {
      for (const [key, val] of rule.headers) {
        res.setHeader(key, val);
      }
    }
  }

  // Prevent Playwright/Node HTTP keep-alive hangs on teardown
  res.setHeader('Connection', 'close');

  const filePath = resolveStaticFile(rawUrl);
  if (!filePath) {
    const notFoundPath = path.join(OUT_DIR, '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      if (method === 'HEAD') {
        res.end();
      } else {
        fs.createReadStream(notFoundPath).pipe(res);
      }
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  if (method === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(filePath).pipe(res);
  }
});

server.keepAliveTimeout = 0;

function shutdown() {
  server.closeAllConnections?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 250).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.stdin.on('end', shutdown);

server.listen(PORT, HOST, () => {
  console.log(`Static export server listening on http://${HOST}:${PORT} serving ${OUT_DIR}`);
});
