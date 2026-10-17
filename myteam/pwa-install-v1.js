(()=>{
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  let deferredPrompt=null;

  function ensureCard(){
    let card=document.querySelector('#pwa-install-card');
    if(card)return card;
    const header=document.querySelector('header');
    card=document.createElement('div');
    card.id='pwa-install-card';
    card.style.cssText='margin:10px 14px 0;padding:13px 14px;border-radius:14px;background:#213149;border:1px solid #4b607c;color:#fff;font:14px system-ui,Arial';
    card.innerHTML='<div style="font-weight:850;margin-bottom:5px">📲 MyTEAM en mode application</div><div id="pwa-install-text" style="color:#c4d0de;margin-bottom:9px">Préparation de l’installation…</div><button id="pwa-install-btn" type="button" style="display:none;border:0;border-radius:11px;padding:11px 14px;background:#e76b24;color:#fff;font-weight:850">Installer MyTEAM</button>';
    if(header)header.after(card);else document.body.prepend(card);
    card.querySelector('#pwa-install-btn').onclick=async()=>{
      if(!deferredPrompt){
        card.querySelector('#pwa-install-text').textContent='Dans Chrome : menu ⋮ → Installer l’application. Ne choisis pas « créer un raccourci ».';
        return;
      }
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch{}
      deferredPrompt=null;
      refresh();
    };
    return card;
  }

  function refresh(){
    const card=ensureCard(),text=card.querySelector('#pwa-install-text'),btn=card.querySelector('#pwa-install-btn');
    if(isStandalone()){
      text.textContent='Installée comme application autonome.';
      btn.style.display='none';
      setTimeout(()=>{card.style.display='none'},2500);
      return;
    }
    card.style.display='block';
    if(deferredPrompt){
      text.textContent='Prête à être installée comme vraie application sur le téléphone.';
      btn.style.display='inline-block';
    }else{
      text.textContent='Ouvre cette page dans Chrome puis utilise ⋮ → Installer l’application. Si Chrome affiche seulement « Ajouter à l’écran d’accueil », actualise une fois et réessaie.';
      btn.style.display='inline-block';
      btn.textContent='Afficher l’aide d’installation';
    }
  }

  function loadHistory(){
    if(window.MyTeamRenderHistory||document.querySelector('script[data-myteam-history-v2]'))return;
    const s=document.createElement('script');
    s.src='./history-v2.js?v=20261017-1';
    s.dataset.myteamHistoryV2='1';
    s.onerror=()=>{delete s.dataset.myteamHistoryV2;s.remove()};
    document.head.appendChild(s);
  }

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    const btn=ensureCard().querySelector('#pwa-install-btn');
    if(btn)btn.textContent='Installer MyTEAM';
    refresh();
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;refresh();});

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(r=>r.update().catch(()=>{})).catch(()=>{});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,500));else setTimeout(refresh,500);
  if(document.readyState==='complete')setTimeout(loadHistory,0);else window.addEventListener('load',()=>setTimeout(loadHistory,0),{once:true});
  setTimeout(loadHistory,1500);
})();
