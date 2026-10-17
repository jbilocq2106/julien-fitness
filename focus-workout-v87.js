/* My Training v87 — mode séance: un exercice par écran */
(function(){
  const KEY='mt_focus_exercise_v87';
  let current=0;

  function workout(){
    try{return typeof state!=='undefined'?state.activeWorkout:null}catch{return null}
  }

  function complete(e){
    if(!e)return false;
    if(e.cardio)return !!e.cardio.done;
    return Array.isArray(e.sets)&&e.sets.length>0&&e.sets.every(s=>!!s.done);
  }

  function savedIndex(){
    const n=Number(localStorage.getItem(KEY));
    return Number.isInteger(n)&&n>=0?n:0;
  }
  function saveIndex(n){
    current=n;
    try{localStorage.setItem(KEY,String(n));}catch{}
  }

  function firstIncomplete(exercises,from=0){
    for(let i=Math.max(0,from);i<exercises.length;i++)if(!complete(exercises[i]))return i;
    for(let i=0;i<Math.max(0,from);i++)if(!complete(exercises[i]))return i;
    return Math.min(from,Math.max(0,exercises.length-1));
  }

  function ensureNav(list,total){
    let nav=document.getElementById('mtFocusNav');
    if(!nav){
      nav=document.createElement('div');
      nav.id='mtFocusNav';
      nav.className='mt-focus-nav';
      nav.innerHTML='<button type="button" id="mtFocusPrev" class="ghost">‹ Précédent</button><div class="mt-focus-progress"><strong id="mtFocusCount"></strong><span id="mtFocusDots"></span></div><button type="button" id="mtFocusNext" class="primary">Suivant ›</button>';
      list.parentNode.insertBefore(nav,list);
      nav.querySelector('#mtFocusPrev').onclick=()=>show(current-1,false);
      nav.querySelector('#mtFocusNext').onclick=()=>{
        if(current>=total-1){document.getElementById('finishWorkoutBtn')?.click();return;}
        show(current+1,false);
      };
    }
    return nav;
  }

  function show(index,scroll=true){
    const w=workout();
    const cards=[...document.querySelectorAll('#exerciseList .exercise')];
    if(!w||!cards.length)return;
    index=Math.max(0,Math.min(index,cards.length-1));
    saveIndex(index);
    cards.forEach((card,i)=>{
      card.classList.toggle('mt-focus-active',i===index);
      card.classList.toggle('mt-focus-hidden',i!==index);
    });
    const nav=ensureNav(document.getElementById('exerciseList'),cards.length);
    const count=nav.querySelector('#mtFocusCount');
    const dots=nav.querySelector('#mtFocusDots');
    const prev=nav.querySelector('#mtFocusPrev');
    const next=nav.querySelector('#mtFocusNext');
    count.textContent=`Exercice ${index+1} / ${cards.length}`;
    dots.innerHTML=w.exercises.map((e,i)=>`<i class="${i===index?'active ':''}${complete(e)?'done':''}"></i>`).join('');
    prev.disabled=index===0;
    next.textContent=index===cards.length-1?'Terminer ✓':'Suivant ›';
    const e=w.exercises[index];
    const title=cards[index].querySelector('h3');
    if(title)title.setAttribute('aria-label',`Exercice ${index+1} sur ${cards.length} : ${e?.name||title.textContent}`);
    if(scroll)window.scrollTo({top:0,behavior:'smooth'});
  }

  function applyFocus(){
    const w=workout();
    const list=document.getElementById('exerciseList');
    const cards=list?[...list.querySelectorAll('.exercise')]:[];
    if(!w||!cards.length){document.body.classList.remove('mt-focus-mode');return;}
    document.body.classList.add('mt-focus-mode');
    let idx=savedIndex();
    if(idx>=cards.length)idx=0;
    if(complete(w.exercises[idx]))idx=firstIncomplete(w.exercises,idx+1);
    show(idx,false);
  }

  const style=document.createElement('style');
  style.textContent=`
    body.mt-focus-mode{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
    body.mt-focus-mode .bottom-nav{display:none!important}
    body.mt-focus-mode .timer-dock{bottom:0!important;padding:6px 8px!important}
    body.mt-focus-mode .topbar{min-height:54px!important;padding:7px 10px!important}
    body.mt-focus-mode #workoutView{padding-bottom:8px}
    body.mt-focus-mode .workout-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;margin-bottom:8px!important;align-items:center!important}
    body.mt-focus-mode .workout-head .eyebrow,body.mt-focus-mode .workout-hint,body.mt-focus-mode .rir-toggle{display:none!important}
    body.mt-focus-mode .workout-head h2{font-size:17px!important;margin:0!important}
    body.mt-focus-mode .workout-actions{display:flex!important;width:auto!important;gap:5px!important}
    body.mt-focus-mode .workout-actions button{width:auto!important;min-height:38px!important;padding:6px 8px!important;font-size:10px!important}
    .mt-focus-hidden{display:none!important}
    #exerciseList .mt-focus-active{display:block!important;width:100%!important;min-height:calc(100dvh - 285px);margin:0!important;padding:16px 14px 18px!important;border-radius:20px!important;border:1px solid #334a6b!important;background:linear-gradient(180deg,#16243a 0%,#111b2c 100%)!important;box-shadow:0 10px 30px rgba(0,0,0,.22)!important}
    #exerciseList .mt-focus-active h3{font-size:24px!important;line-height:1.1!important;margin:2px 0 8px!important}
    #exerciseList .mt-focus-active .exercise-note{font-size:13px!important;margin-bottom:12px!important}
    #exerciseList .mt-focus-active .exercise-guide{grid-template-columns:88px minmax(0,1fr) auto!important;padding:11px!important;margin:10px 0 14px!important}
    #exerciseList .mt-focus-active .exercise-visual{width:88px!important;height:76px!important}
    #exerciseList .mt-focus-active .exercise-svg{width:84px!important;height:72px!important}
    #exerciseList .mt-focus-active .set-head,#exerciseList .mt-focus-active .set-row{grid-template-columns:30px minmax(0,1fr) minmax(0,1fr) 52px!important;gap:7px!important}
    #exerciseList .mt-focus-active .set-row{margin-top:9px!important}
    #exerciseList .mt-focus-active .set-row input{height:52px!important;font-size:18px!important;border-radius:12px!important}
    #exerciseList .mt-focus-active .set-row .done{width:52px!important;min-width:52px!important;height:52px!important;min-height:52px!important;font-size:13px!important;border-radius:12px!important}
    #exerciseList .mt-focus-active .cardio-grid input{min-height:52px!important;font-size:17px!important}
    .mt-focus-nav{position:sticky;top:54px;z-index:55;display:grid;grid-template-columns:92px 1fr 92px;gap:7px;align-items:center;margin:0 0 8px;padding:7px 0;background:#0b1220}
    .mt-focus-nav button{min-height:44px!important;padding:7px!important;font-size:11px!important}
    .mt-focus-progress{text-align:center;min-width:0}.mt-focus-progress strong{display:block;font-size:13px;margin-bottom:5px}.mt-focus-progress span{display:flex;justify-content:center;gap:4px;overflow:hidden}.mt-focus-progress i{display:block;width:7px;height:7px;border-radius:50%;background:#334155;flex:none}.mt-focus-progress i.done{background:#22c55e}.mt-focus-progress i.active{outline:2px solid #93c5fd;outline-offset:2px}
    @media(max-width:380px){.mt-focus-nav{grid-template-columns:82px 1fr 82px}.mt-focus-nav button{font-size:10px!important}#exerciseList .mt-focus-active h3{font-size:21px!important}}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const previous=renderWorkout;
    renderWorkout=function(){
      previous.apply(this,arguments);
      applyFocus();
    };
    window.renderWorkout=renderWorkout;
  }

  document.addEventListener('click',e=>{
    if(!document.body.classList.contains('mt-focus-mode'))return;
    if(e.target.closest('.done,.cardio-done'))setTimeout(applyFocus,120);
  },true);

  const observer=new MutationObserver(()=>{
    if(workout()&&document.querySelector('#exerciseList .exercise'))applyFocus();
  });
  const list=document.getElementById('exerciseList');
  if(list)observer.observe(list,{childList:true,subtree:false});
  setTimeout(applyFocus,0);
})();
