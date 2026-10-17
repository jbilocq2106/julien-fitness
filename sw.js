const LEGACY_PREFIXES=['mon-training-','my-training-'];
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{try{const keys=await caches.keys();await Promise.all(keys.filter(k=>LEGACY_PREFIXES.some(p=>k.startsWith(p))).map(k=>caches.delete(k)));}catch(e){}try{await self.registration.unregister();}catch(e){}try{await self.clients.claim();}catch(e){}})());});
self.addEventListener('fetch',()=>{});
