/* My Training v68 — Cardio 3 interval change warnings */
(function(){
  const C3_ID='C3';
  const ALERT_LEAD=20;
  let tick=null;
  let timeouts=[];
  let currentWorkoutStarted=null;

  const transitions=[
    {t:360,  kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:450,  kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:540,  kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:630,  kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:720,  kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:810,  kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:900,  kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:990,  kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:1080, kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:1170, kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:1260, kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:1350, kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:1440, kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:1530, kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:1620, kind:'hard', title:'MONTE', body:'5,3–5,8 km/h • pente 12–15 %'},
    {t:1710, kind:'easy', title:'RÉCUP', body:'5,0–5,2 km/h • pente 6–8 %'},
    {t:1800, kind:'cool', title:'RETOUR AU CALME', body:'4,5–5,0 km/h • pente 2–4 %'}
  ];

  function activeC3(){
    const w=state.activeWorkout;
    return w&&w.cardioSessionId===C3_ID?w:null;
  }

  function ensureBanner(){
    let el=document.getElementById('mtC3ChangeAlert');
    if(el)return el;
    el=document.createElement('div');
    el.id='mtC3ChangeAlert';
    el.className='mt-c3-alert hidden';
    el.innerHTML='<div class="mt-c3-alert-kicker">TAPIS — CHANGEMENT</div><div class="mt-c3-alert-count"></div><div class="mt-c3-alert-title"></div><div class="mt-c3-alert-body"></div>';
    document.body.appendChild(el);
    return el;
  }

  function askNotificationPermission(){
    try{
      if('Notification' in window&&Notification.permission==='default'){
        Notification.requestPermission().catch(()=>{});
      }
    }catch(e){}
  }

  function notifyOS(tr){
    try{
      if(!('Notification' in window)||Notification.permission!=='granted'||!('serviceWorker' in navigator))return;
      navigator.serviceWorker.ready.then(reg=>reg.showNotification('Tapis C3 — changement dans 20 s',{
        body:`${tr.title} : ${tr.body}`,
        icon:'icon-192.png?v=58',
        badge:'icon-192.png?v=58',
        tag:`mt-c3-${activeC3()?.started||'x'}-${tr.t}`,
        renotify:true,
        vibrate:[180,90,180],
        data:{url:location.href}
      })).catch(()=>{});
    }catch(e){}
  }

  function fireWarning(tr){
    const w=activeC3();
    if(!w)return;
    w.c3Alerted=w.c3Alerted||{};
    if(w.c3Alerted[tr.t])return;
    const elapsed=(Date.now()-Number(w.started))/1000;
    // Do not send a stale warning after the change has already happened.
    if(elapsed>=tr.t||elapsed<tr.t-ALERT_LEAD-3)return;
    w.c3Alerted[tr.t]=true;
    save();
    if(navigator.vibrate)navigator.vibrate([120,70,120]);
    notifyOS(tr);
    renderBanner();
  }

  function renderBanner(){
    const el=ensureBanner();
    const w=activeC3();
    if(!w){el.classList.add('hidden');return;}
    const elapsed=(Date.now()-Number(w.started))/1000;
    const warning=transitions.find(tr=>elapsed>=tr.t-ALERT_LEAD&&elapsed<tr.t);
    const now=transitions.find(tr=>elapsed>=tr.t&&elapsed<tr.t+8);
    const tr=warning||now;
    if(!tr){el.classList.add('hidden');return;}

    el.classList.remove('hidden','hard','easy','cool','now');
    el.classList.add(tr.kind);
    if(now)el.classList.add('now');
    el.querySelector('.mt-c3-alert-kicker').textContent=now?'À MODIFIER MAINTENANT':'TAPIS — CHANGEMENT DANS';
    el.querySelector('.mt-c3-alert-count').textContent=now?'MAINTENANT':`${Math.max(1,Math.ceil(tr.t-elapsed))} s`;
    el.querySelector('.mt-c3-alert-title').textContent=tr.title;
    el.querySelector('.mt-c3-alert-body').textContent=tr.body;
  }

  function clearSchedule(){
    timeouts.forEach(clearTimeout);timeouts=[];
    clearInterval(tick);tick=null;
    currentWorkoutStarted=null;
  }

  function scheduleC3(){
    const w=activeC3();
    if(!w){clearSchedule();renderBanner();return;}
    if(currentWorkoutStarted===w.started)return;
    clearSchedule();
    currentWorkoutStarted=w.started;
    w.c3Alerted=w.c3Alerted||{};
    const elapsed=(Date.now()-Number(w.started))/1000;

    transitions.forEach(tr=>{
      if(w.c3Alerted[tr.t]||elapsed>=tr.t)return;
      const delay=Math.max(0,(tr.t-ALERT_LEAD-elapsed)*1000);
      timeouts.push(setTimeout(()=>fireWarning(tr),delay));
    });

    tick=setInterval(()=>{
      const current=activeC3();
      if(!current||current.started!==currentWorkoutStarted){scheduleC3();return;}
      const e=(Date.now()-Number(current.started))/1000;
      transitions.forEach(tr=>{
        if(e>=tr.t-ALERT_LEAD&&e<tr.t)fireWarning(tr);
      });
      renderBanner();
      if(e>1810)clearSchedule();
    },500);
    renderBanner();
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-c3-alert{position:fixed;left:12px;right:12px;top:max(14px,env(safe-area-inset-top));z-index:20000;padding:14px 16px;border-radius:18px;background:rgba(8,15,28,.97);border:2px solid #60a5fa;box-shadow:0 12px 34px rgba(0,0,0,.45);text-align:center;pointer-events:none}
    .mt-c3-alert.hidden{display:none!important}.mt-c3-alert.hard{border-color:#ef4444}.mt-c3-alert.easy{border-color:#22c55e}.mt-c3-alert.cool{border-color:#60a5fa}
    .mt-c3-alert-kicker{font-size:11px;font-weight:900;letter-spacing:.11em;color:#cbd5e1}.mt-c3-alert-count{font-size:34px;line-height:1;font-weight:1000;margin:5px 0 7px}.mt-c3-alert-title{font-size:21px;font-weight:1000}.mt-c3-alert-body{font-size:16px;font-weight:800;margin-top:4px;color:#f8fafc}
    .mt-c3-alert.hard .mt-c3-alert-title,.mt-c3-alert.hard .mt-c3-alert-count{color:#f87171}.mt-c3-alert.easy .mt-c3-alert-title,.mt-c3-alert.easy .mt-c3-alert-count{color:#4ade80}.mt-c3-alert.now{animation:mtC3Pulse .65s ease-in-out 3}
    @keyframes mtC3Pulse{50%{transform:scale(1.025);box-shadow:0 12px 42px rgba(96,165,250,.42)}}
  `;
  document.head.appendChild(style);

  // Ask on the user's tap that starts C3, so Android can display a heads-up notification over another app such as Netflix.
  if(typeof mtStartCardioSession==='function'){
    const previousStart=mtStartCardioSession;
    mtStartCardioSession=function(id,testMode=false){
      if(id===C3_ID)askNotificationPermission();
      const result=previousStart(id,testMode);
      setTimeout(scheduleC3,0);
      return result;
    };
    window.mtStartCardioSession=mtStartCardioSession;
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')renderBanner();
    scheduleC3();
  });
  window.addEventListener('pageshow',scheduleC3);
  setTimeout(scheduleC3,0);
})();
