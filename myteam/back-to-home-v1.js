/* MyTEAM — Android back gesture: return to reminders rather than closing a subpage.
   Internal browser history only: no changes to saved agent data. */
(()=>{
  'use strict';
  const nav=document.querySelector('nav.tabs');
  const main=document.querySelector('main');
  if(!nav||!main||window.__myteamBackHomeInstalled)return;
  const home=nav.querySelector('button[data-tab="context-reminders"]');
  if(!home)return;
  window.__myteamBackHomeInstalled=true;
  const BACK_KEY='__myteamBackHome';
  let changingFromPop=false;
  let active='context-reminders';
  function backHome(){
    const close=document.getElementById('mt-more-close');
    const menu=document.getElementById('mt-more-panel');
    if(menu&&!menu.hidden)close?.click();
    home.click();
    active='context-reminders';
    window.scrollTo(0,0);
  }
  const safeState=()=>{
    const x=history.state;
    return x&&typeof x==='object'&&!Array.isArray(x)?{...x}:{};
  };
  const mark=(kind,tab)=>({...safeState(),[BACK_KEY]:kind,myteamActiveTab:tab});
  const url=()=>location.href;
  // Executed after all other MyTEAM modules have loaded, so their startup
  // navigations are not recorded as user actions.
  try{
    backHome();
    const previous=safeState();
    if(previous[BACK_KEY]==='guard'){
      history.replaceState(mark('guard','context-reminders'),'',url());
    }else{
      history.replaceState(mark('base','context-reminders'),'',url());
      history.pushState(mark('guard','context-reminders'),'',url());
    }
  }catch(error){
    console.warn('Historique interne MyTEAM indisponible',error);
  }

  nav.addEventListener('click',event=>{
    if(changingFromPop)return;
    const b=event.target.closest('button[data-tab]');
    if(!b||!nav.contains(b))return;
    const next=b.dataset.tab;
    if(!next||next===active)return;
    active=next;
    try{
      const kind=safeState()[BACK_KEY];
      if(kind==='guard'){
        // One Back returns directly to the app's home screen, even if the
        // user opened several sections via Bureau or the bottom nav.
        history.replaceState(mark('guard',next),'',url());
      }else{
        // We are on the underlying home entry after Back: restore one
        // guard entry only when a section is opened again.
        history.pushState(mark('guard',next),'',url());
      }
    }catch(error){console.warn('Navigation MyTEAM non enregistrée',error);}
  });
  window.addEventListener('popstate',event=>{
    const state=event.state;
    if(!state||!['base','guard'].includes(state[BACK_KEY]))return;
    changingFromPop=true;
    try{
      // Pressing Android Back while on a working section must not exit the
      // PWA. Keep the user's photos, forms and local data in place.
      backHome();
    }finally{changingFromPop=false;}
  });
})();