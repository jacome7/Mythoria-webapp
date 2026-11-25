import { randomBytes } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { renderDocument } from './document.mjs';

const host = '127.0.0.1';
const require = createRequire(import.meta.url);
const contentTypes = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  png: 'image/png',
  text: 'text/plain; charset=utf-8',
};
const headers = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

const specificationHeaders = {
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'none'; sandbox allow-same-origin allow-popups allow-popups-to-escape-sandbox",
};

function send(response, request, status, type, content, overrides) {
  response.writeHead(status, {
    ...headers,
    ...overrides,
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(content),
  });
  response.end(request.method === 'HEAD' ? undefined : content);
}

async function readAsset(directory, name) {
  const path = await realpath(join(directory, name));
  if (relative(directory, dirname(path)) !== '') {
    throw new Error(`${name} must resolve inside the assets directory.`);
  }
  return readFile(path);
}

async function readArtwork(directory, name) {
  const content = await readAsset(directory, name);
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!content.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${name} must be a PNG image.`);
  }
  return content;
}

async function start() {
  const { values } = parseArgs({
    options: {
      'assets-dir': { type: 'string' },
      port: { type: 'string', default: '4173' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const usage = 'node scripts/book-preview/server.mjs --assets-dir <directory> [--port 4173]';
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (!values['assets-dir']) throw new Error(usage);
  const port = Number(values.port);
  if (!/^\d+$/.test(values.port) || !Number.isInteger(port) || port > 65535) {
    throw new Error('--port must be an integer between 0 and 65535.');
  }

  const directory = await realpath(values['assets-dir']);
  const checkout = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
  const fromCheckout = relative(checkout, directory);
  if (!isAbsolute(fromCheckout) && fromCheckout !== '..' && !fromCheckout.startsWith(`..${sep}`)) {
    throw new Error('Put the preview assets outside the Web App checkout.');
  }

  const [metadata, spec, specLogo, specQr, left, right, css, reader, pageFlip] = await Promise.all([
    readAsset(directory, 'preview.json'),
    readAsset(directory, 'spec.html'),
    readArtwork(directory, 'spec-logo.png'),
    readArtwork(directory, 'spec-qr.png'),
    readArtwork(directory, 'left.png'),
    readArtwork(directory, 'right.png'),
    readFile(new URL('./style.css', import.meta.url)),
    readFile(new URL('./reader.js', import.meta.url)),
    readFile(require.resolve('page-flip/dist/js/page-flip.module.js')),
  ]);

  const preview = JSON.parse(metadata.toString('utf8').replace(/^\uFEFF/, ''));
  if (
    typeof preview?.title !== 'string' ||
    preview.title.trim() === '' ||
    typeof preview.leftText !== 'string' ||
    typeof preview.rightText !== 'string'
  ) {
    throw new Error('preview.json requires title, leftText and rightText strings.');
  }

  const prefix = `/${randomBytes(18).toString('base64url')}/`;
  const paths = new Map([
    [prefix, [contentTypes.html, renderDocument(preview)]],
    [`${prefix}spec.html`, [contentTypes.html, spec, specificationHeaders]],
    [`${prefix}spec-logo.png`, [contentTypes.png, specLogo]],
    [`${prefix}spec-qr.png`, [contentTypes.png, specQr]],
    [`${prefix}left.png`, [contentTypes.png, left]],
    [`${prefix}right.png`, [contentTypes.png, right]],
    [`${prefix}style.css`, [contentTypes.css, css]],
    [`${prefix}reader.js`, [contentTypes.js, reader]],
    [`${prefix}page-flip.js`, [contentTypes.js, pageFlip]],
  ]);

  const server = createServer((request, response) => {
    const fetchSite = request.headers['sec-fetch-site'];
    const expectedHost = `${host}:${server.address().port}`;
    const opensReader =
      request.method === 'GET' &&
      request.url === prefix &&
      request.headers['sec-fetch-mode'] === 'navigate' &&
      request.headers['sec-fetch-dest'] === 'document';
    if (
      request.headers.host !== expectedHost ||
      (request.headers.origin && request.headers.origin !== `http://${expectedHost}`) ||
      (fetchSite && fetchSite !== 'none' && fetchSite !== 'same-origin' && !opensReader)
    ) {
      send(response, request, 403, contentTypes.text, 'Forbidden');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      send(response, request, 405, contentTypes.text, 'Method not allowed');
      return;
    }
    const resource = paths.get(request.url);
    if (!resource) {
      send(response, request, 404, contentTypes.text, 'Not found');
      return;
    }
    send(response, request, 200, ...resource);
  });

  server.on('error', (error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    process.stdout.write(`http://${host}:${server.address().port}${prefix}\n`);
  });
}

start().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
