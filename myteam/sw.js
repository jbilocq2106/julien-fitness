/* MyTEAM v2 : version autonome, réseau prioritaire, sans import PARIF. */
const CACHE='myteam-reboot-20261106-v6';
const ROOT='/julien-fitness/myteam/';
const ASSETS=[
 './','./index.html',
 './reboot-v1.css?v=20261106-5',
 './reboot-seed-v1.js?v=20261106-1',
 './reboot-v1.js?v=20261106-6',
 './journal-v1.js?v=20261106-3',
 './visits-v1.css?v=20261106-1',
 './visits-core-v1.js?v=20261106-2',
 './visits-ui-v1.js?v=20261106-3',
 './visits-planner-v1.js?v=20261106-1',
 './visits-alerts-v1.js?v=20261106-1',
 './reboot-edit-v1.js?v=20261106-4',
 './hours-reboot-v1.js?v=20261106-1',
 './salary-forecast-v3.js?v=20261027-1',
 './supervisors-rota-v1.js?v=20261029-4',
 './manifest.webmanifest?v=20261106-reboot1',
 './myteam-192-hd.png?v=2','./myteam-512-hd.png?v=2'
];
self.addEventListener('install',e=>{
 self.skipWaiting();
 e.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(ASSETS.map(url=>cache.add(url)))).catch(()=>{}));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys
  .filter(k=>k.startsWith('myteam-')&&k!==CACHE)
  .map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
 const html=url.pathname.endsWith('/myteam/')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/myteam');
 const fresh=html||/\.(?:js|css|webmanifest)$/.test(url.pathname);
 e.respondWith((async()=>{
  const get=async()=>{
   const response=await fetch(req,{cache:fresh?'no-store':'default'});
   if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone()).catch(()=>{});}
   return response;
  };
  if(fresh){try{return await get()}catch{
   const cached=await caches.match(req);if(cached)return cached;
   if(html){const fallback=await caches.match('./index.html');if(fallback)return fallback;}
   return Response.error();
  }}
  const cached=await caches.match(req);
  if(cached){e.waitUntil(get().catch(()=>{}));return cached}
  try{return await get()}catch{return Response.error()}
 })());
});
/* Notification affichée lorsque l'application est active : ouvrir MyTEAM au toucher. */
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    const existing=clients.find(client=>client.url.includes('/julien-fitness/myteam/'));
    if(existing){await existing.focus();return;}
    if(self.clients.openWindow)await self.clients.openWindow('./');
  }));
});
