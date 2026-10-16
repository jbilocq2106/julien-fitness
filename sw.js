const CACHE='my-training-v64';
const CORE=['./','index.html','styles.css?v=56','features-v57.css?v=57','app.js?v=56','features-v57.js?v=57','cardio-v59.js?v=59','swap-v60.js?v=60','swap-priority-v61.js?v=61','session-safety-v63.js?v=63','rest-ui-v63.js?v=63','muscles-feedback-v63.js?v=63','feedback-prefs-v64.js?v=64','program.json','manifest.json','favicon.png?v=58','icon-192.png?v=58','icon-512.png?v=58'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{})
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>(k.startsWith('mon-training-')||k.startsWith('my-training-'))&&k!==CACHE).map(k=>caches.delete(k))))
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
    url.pathname.endsWith('features-v57.js') ||
    url.pathname.endsWith('cardio-v59.js') ||
    url.pathname.endsWith('swap-v60.js') ||
    url.pathname.endsWith('swap-priority-v61.js') ||
    url.pathname.endsWith('session-safety-v63.js') ||
    url.pathname.endsWith('rest-ui-v63.js') ||
    url.pathname.endsWith('muscles-feedback-v63.js') ||
    url.pathname.endsWith('feedback-prefs-v64.js') ||
    url.pathname.endsWith('styles.css') ||
    url.pathname.endsWith('features-v57.css') ||
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
