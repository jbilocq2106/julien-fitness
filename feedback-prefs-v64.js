/* My Training v64 — explicit exercise preferences */
(function(){
  const FEEDBACK_KEY='mt_exercise_feedback_v1';
  const DEAD_BUG_NAME='Dead bug + expiration complète';
  const DEAD_BUG_KEY='dead bug expiration complete';
  const DEAD_BUG_ALTS=['Planche RKC','Hollow hold','Pallof press'];

  function norm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function keyFor(name){return norm(name).replace(/[^a-z0-9]+/g,' ').trim();}
  function load(){try{return JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'{}')||{};}catch(e){return {};}}
  function save(data){try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(data||{}));}catch(e){}}

  function applyExplicitPreferences(){
    const data=load();
    const now=new Date().toISOString();

    Object.keys(data).forEach(k=>{
      const name=norm(data[k]?.name||k);
      if(name.includes('pec fly')||name.includes('butterfly')||name.includes('bug fly')){
        data[k]={...data[k],disliked:false,liked:true,updatedAt:now};
      }
    });
    ['pec fly machine','pec fly','butterfly','bug fly'].forEach(k=>{
      const existing=data[k]||{};
      data[k]={...existing,name:existing.name||k,disliked:false,liked:true,updatedAt:now};
    });

    data[DEAD_BUG_KEY]={
      ...(data[DEAD_BUG_KEY]||{}),
      name:DEAD_BUG_NAME,
      disliked:true,
      liked:false,
      updatedAt:now,
      alternatives:DEAD_BUG_ALTS.slice()
    };

    (state.activeWorkout?.exercises||[]).forEach(e=>{
      if(norm(e.name).includes('dead bug')){
        data[keyFor(e.name)]={name:e.name,disliked:true,liked:false,updatedAt:now,alternatives:DEAD_BUG_ALTS.slice()};
      }
      if(norm(e.name).includes('pec fly')||norm(e.name).includes('butterfly')||norm(e.name).includes('bug fly')){
        const k=keyFor(e.name);
        data[k]={...(data[k]||{}),name:e.name,disliked:false,liked:true,updatedAt:now};
      }
    });
    save(data);
  }

  function setTextIfChanged(el,text){
    if(el&&el.textContent!==text)el.textContent=text;
  }

  function tuneFeedbackModal(){
    const body=document.getElementById('sessionDetailBody');
    if(!body)return;

    body.querySelectorAll('.mt-feedback-row').forEach(row=>{
      const name=row.querySelector('strong')?.textContent||'';
      const input=row.querySelector('input[type="checkbox"]');
      const small=row.querySelector('small');
      const n=norm(name);
      if(n.includes('dead bug')){
        if(input&&!input.checked)input.checked=true;
        setTextIfChanged(small,'Marqué comme peu apprécié');
      }
      if(n.includes('pec fly')||n.includes('butterfly')||n.includes('bug fly')){
        if(input&&input.checked)input.checked=false;
        setTextIfChanged(small,'Tu as indiqué que cet exercice te plaît');
      }
    });

    body.querySelectorAll('.mt-alt-card').forEach(card=>{
      const name=card.querySelector('strong')?.textContent||'';
      if(!norm(name).includes('dead bug'))return;
      let list=card.querySelector('.mt-alt-list');
      if(!list){
        card.querySelector('small')?.remove();
        list=document.createElement('div');
        list.className='mt-alt-list';
        card.appendChild(list);
      }
      // Once v69/v70 has turned the alternatives into actionable buttons, never
      // overwrite them back to passive <span> elements.
      if(list.querySelector('button[data-mt-feedback-alt]'))return;
      const wanted=DEAD_BUG_ALTS.map(a=>`<span>${a}</span>`).join('');
      if(list.innerHTML!==wanted)list.innerHTML=wanted;
    });
  }

  function refreshCurrentCards(){
    const w=state.activeWorkout;
    if(!w)return;
    const cards=[...document.querySelectorAll('#exerciseList .exercise')];
    cards.forEach((card,index)=>{
      const name=w.exercises?.[index]?.name||'';
      const n=norm(name);
      if(n.includes('pec fly')||n.includes('butterfly')||n.includes('bug fly')){
        card.classList.remove('mt-exercise-disliked');
        card.querySelector('.mt-disliked-badge')?.remove();
      }
      if(n.includes('dead bug')){
        card.classList.add('mt-exercise-disliked');
        if(!card.querySelector('.mt-disliked-badge')){
          const badge=document.createElement('div');
          badge.className='mt-disliked-badge';
          badge.textContent='À remplacer la prochaine fois';
          card.querySelector('.exercise-title-main')?.appendChild(badge);
        }
      }
    });
  }

  applyExplicitPreferences();
  refreshCurrentCards();

  const modalBody=document.getElementById('sessionDetailBody');
  if(modalBody){
    let tuning=false;
    const observer=new MutationObserver(()=>{
      if(tuning)return;
      tuning=true;
      observer.disconnect();
      try{tuneFeedbackModal();}
      finally{
        tuning=false;
        observer.observe(modalBody,{childList:true,subtree:true});
      }
    });
    observer.observe(modalBody,{childList:true,subtree:true});
  }

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){
      previousRender();
      applyExplicitPreferences();
      refreshCurrentCards();
    };
    window.renderWorkout=renderWorkout;
  }
})();

/* Load the newer workout helpers in sequence without replacing the active session. */
(function(){
  function loadScript(id,src){
    return new Promise((resolve,reject)=>{
      if(document.getElementById(id)){resolve();return;}
      const s=document.createElement('script');
      s.id=id;
      s.src=src;
      s.onload=resolve;
      s.onerror=reject;
      document.body.appendChild(s);
    });
  }
  loadScript('mtTimedSetsV65','timed-sets-v65.js?v=65')
    .then(()=>loadScript('mtFinishCheckV66','finish-check-v66.js?v=66'))
    .then(()=>loadScript('mtTreadmillV67','treadmill-v67.js?v=67'))
    .then(()=>loadScript('mtTreadmillAlertV68','treadmill-alert-v68.js?v=68'))
    .then(()=>loadScript('mtFeedbackAlternativesV69','feedback-alternatives-v69.js?v=70'))
    .then(()=>loadScript('mtSessionTimeV70','session-time-v70.js?v=70'))
    .catch(()=>{});
})();
