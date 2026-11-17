// Build replaces cache identifier independently for each distribution and release.
const CACHE='mytraining-pro-source-v1';
const FILES=['./index.html','./app.js','./model.js','./config.js','./styles.css','./icon.svg','./manifest.webmanifest','./vente.html','./legal.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);const base=new URL(self.registration.scope);if(e.request.method!=='GET'||u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;const relative=u.pathname.slice(base.pathname.length);if(!['',...FILES.map(f=>f.slice(2))].includes(relative))return;e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(relative===''?'./index.html':e.request))));});
