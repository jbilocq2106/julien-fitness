const CACHE='my-training-separate-v12';
const CORE=['./','index.html','styles.css?v=56','features-v57.css?v=57','app.js?v=56','features-v57.js?v=57','cardio-v59.js?v=59','swap-v60.js?v=60','swap-priority-v61.js?v=61','session-safety-v63.js?v=63','rest-ui-v63.js?v=73','muscles-feedback-v63.js?v=63','feedback-prefs-v64.js?v=73','sunday-oneoff-v74.js?v=75','rest-three-beeps-v76.js?v=76','superset-picker-v77.js?v=77','workout-additions-v79.js?v=79','machine-settings-v81.js?v=81','quality-and-order-v82.js?v=82','treadmill-distance-v83.js?v=83','rest-countdown-v84.js?v=84','gym-location-history-v85.js?v=85','postworkout-corrections-v86.js?v=87','treadmill-ascent-v88.js?v=88','timed-sets-v65.js?v=73','finish-check-v66.js?v=66','treadmill-v67.js?v=67','treadmill-alert-v68.js?v=68','feedback-alternatives-v69.js?v=70','session-time-v70.js?v=70','deadbug-recovery-v71.js?v=71','recorded-session-edit-v72.js?v=72','program.json','manifest.json','favicon.png?v=58','icon-192.png?v=58','icon-512.png?v=58'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('my-training-separate-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url),sameOrigin=url.origin===self.location.origin;
 if(!sameOrigin||!url.pathname.startsWith('/julien-fitness/training/'))return;
 const dynamic=url.pathname.endsWith('/')||url.pathname.endsWith('index.html')||url.pathname.endsWith('.js')||url.pathname.endsWith('.css')||url.pathname.endsWith('.json');
 if(dynamic){event.respondWith(fetch(req,{cache:'no-store'}).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});return resp;}).catch(()=>caches.match(req)));return;}
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow?self.clients.openWindow('./'):undefined);});
