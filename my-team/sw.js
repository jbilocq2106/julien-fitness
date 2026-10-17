const CACHE='my-team-v2';
const ASSETS=['./','./index.html','./style.css?v=2','./app.js?v=2','./manifest.json?v=2','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('my-team-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const req=event.request;
  const url=new URL(req.url);
  const dynamic=url.origin===self.location.origin&&(url.pathname.endsWith('/my-team/')||url.pathname.endsWith('/my-team/index.html')||url.pathname.endsWith('/my-team/app.js')||url.pathname.endsWith('/my-team/style.css')||url.pathname.endsWith('/my-team/manifest.json'));
  if(dynamic){
    event.respondWith(fetch(req,{cache:'no-store'}).then(response=>{const clone=response.clone();caches.open(CACHE).then(c=>c.put(req,clone));return response}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(r=>r||fetch(req).then(response=>{const clone=response.clone();caches.open(CACHE).then(c=>c.put(req,clone));return response})));
});
