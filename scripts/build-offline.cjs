// Run after Expo's static export. Precache every exported asset, including lazy routes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve('dist');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
const files = walk(root).filter((file) => !file.endsWith('.map') && !file.endsWith('sw.js'));
const urls = files.map((file) => '/' + path.relative(root, file).split(path.sep).join('/'));
const version = crypto.createHash('sha256');
files.forEach((file) => version.update(fs.readFileSync(file)));
const cache = 'ruby-shell-' + version.digest('hex').slice(0, 16);
fs.writeFileSync(path.join(root, 'sw.js'), `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ruby-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(cached => cached || fetch(event.request)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(event.request)));
  }
});
`);
console.log(`Prepared offline website: ${urls.length} assets (${cache}).`);
