const CACHE='mon-training-v54';
const CORE=['./','index.html','styles.css','app.js','program.json','manifest.json','icon-192.png','icon-512.png'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{})
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('mon-training-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const url=new URL(req.url);
  const sameOrigin=url.origin===self.location.origin;
  const dynamic = sameOrigin && (
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('app.js') ||
    url.pathname.endsWith('styles.css') ||
    url.pathname.endsWith('program.json') ||
    url.pathname.endsWith('manifest.json')
  );

  if(dynamic){
    event.respondWith(
      fetch(req,{cache:'no-store'})
        .then(resp=>{
          const copy=resp.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
          return resp;
        })
        .catch(()=>caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req))
  );
});
