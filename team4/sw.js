const CACHE='myteam-shell-v3';
const ASSETS=['./','./index.html','./app.js','./agents-migration-v3.js?v=3','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('myteam-shell-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

async function withAgentMigration(response){
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const html=await response.text();
  const patched=html.includes('agents-migration-v3.js')?html:html.replace('</body>','<script src="./agents-migration-v3.js?v=3"></script></body>');
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(patched,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const req=e.request;
  const url=new URL(req.url);
  const sameOrigin=url.origin===location.origin;
  const isShell=sameOrigin&&(url.pathname.endsWith('/team4/')||url.pathname.endsWith('/team4/index.html'));

  if(isShell){
    e.respondWith((async()=>{
      let response;
      try{
        response=await fetch(req,{cache:'no-store'});
        if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
      }catch{}
      if(!response)response=await caches.match(req)||await caches.match('./index.html');
      return withAgentMigration(response);
    })());
    return;
  }

  e.respondWith(
    fetch(req,{cache:'no-store'}).then(r=>{
      if(r.ok&&sameOrigin){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}
      return r;
    }).catch(()=>caches.match(req))
  );
});
