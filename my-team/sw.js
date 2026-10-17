const CACHE='my-team-v1';
const ASSETS=['./','./index.html','./style.css?v=1','./app.js?v=1','./manifest.json','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('my-team-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    const clone=response.clone();caches.open(CACHE).then(c=>c.put(event.request,clone));return response;
  }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});