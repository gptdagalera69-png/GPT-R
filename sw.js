const CACHE='central-mestre-v15';
const SHELL=['/','/index.html','/styles.css','/theme-v2.css','/atlas-v3.css','/mestre-v35.css','/monster-art-v1.css','/ux-responsive-v1.css','/tactical-v2.css','/assets/creature-symbols.svg','/assets/atlas-logo.svg','/assets/hero-citadel.svg','/assets/atlas-icons.svg','/app.js','/sync.js','/manifest.webmanifest','/icon.svg','/data/monsters.json','/data/nomes-pt-BR.json'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  const freshFirst=e.request.mode==='navigate'||/\.(?:html|js|css|json)$/.test(url.pathname);
  if(freshFirst){
    e.respondWith(fetch(e.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}
      return response;
    }).catch(()=>caches.match(e.request).then(cached=>cached||(e.request.mode==='navigate'?caches.match('/index.html'):Response.error()))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}
    return response;
  })));
});