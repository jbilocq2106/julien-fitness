/* My Training v69 — clickable end-of-session exercise alternatives */
(function(){
  function norm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function findExerciseIndex(name){
    const w=state.activeWorkout;
    if(!w)return -1;
    const n=norm(name);
    return (w.exercises||[]).findIndex(e=>norm(e?.name)===n);
  }

  function freshSets(count,targetReps,targetWeight,bodyweight){
    const n=Math.max(1,Number(count)||3);
    return Array.from({length:n},(_,i)=>({
      i:i+1,
      targetReps,
      targetWeight:bodyweight?0:(targetWeight??null),
      weight:bodyweight?0:(targetWeight??''),
      reps:'',
      rir:'',
      done:false
    }));
  }

  function applyPreset(e,altName){
    const n=norm(altName);
    if(n.includes('planche rkc')){
      e.name='Planche RKC';
      e.rest=45;
      e.autoTarget=null;
      e.cardio=null;
      e.sets=freshSets(3,'20–30 s',0,true);
      return true;
    }
    if(n.includes('hollow hold')){
      e.name='Hollow hold';
      e.rest=45;
      e.autoTarget=null;
      e.cardio=null;
      e.sets=freshSets(3,'20–30 s',0,true);
      return true;
    }
    if(n.includes('pallof press')){
      e.name='Pallof press';
      e.rest=45;
      e.autoTarget=null;
      e.cardio=null;
      e.sets=freshSets(3,'10–12/côté',null,false);
      return true;
    }
    return false;
  }

  function isBodyweightName(name){
    const n=norm(name);
    return ['planche','hollow','pompe','sit-up','crunch au sol','sissy squat','nordic','bird dog','releves de jambes','releves de genoux'].some(k=>n.includes(k));
  }

  function replaceNow(index,altName){
    const w=state.activeWorkout;
    const e=w?.exercises?.[index];
    if(!e||!altName)return;
    const oldName=e.name;

    if(!applyPreset(e,altName)){
      const bodyweight=isBodyweightName(altName);
      e.name=altName;
      e.note=`Alternative choisie en fin de séance à la place de « ${oldName} »`;
      e.autoTarget=null;
      e.cardio=null;
      e.skipped=false;
      e.skippedAt=null;
      e.skippedReason=null;
      const oldSets=Array.isArray(e.sets)?e.sets:[];
      if(oldSets.length){
        e.sets=oldSets.map((s,i)=>({
          ...s,
          i:i+1,
          targetWeight:bodyweight?0:null,
          weight:bodyweight?0:'',
          reps:'',
          rir:'',
          done:false
        }));
      }else{
        e.sets=freshSets(3,'10–12',bodyweight?0:null,bodyweight);
      }
    }else{
      e.note=`Alternative choisie en fin de séance à la place de « ${oldName} »`;
      e.skipped=false;
      e.skippedAt=null;
      e.skippedReason=null;
    }

    if(typeof save==='function')save();
    document.getElementById('sessionModal')?.classList.add('hidden');
    try{renderWorkout();showView('workoutView');}catch(err){}

    setTimeout(()=>{
      const card=document.querySelectorAll('#exerciseList .exercise')[index];
      if(card){
        card.scrollIntoView({behavior:'smooth',block:'center'});
        card.classList.add('mt-feedback-alt-highlight');
        setTimeout(()=>card.classList.remove('mt-feedback-alt-highlight'),1800);
      }
    },80);
  }

  function wireAlternatives(){
    const body=document.getElementById('sessionDetailBody');
    if(!body||!state.activeWorkout)return;

    body.querySelectorAll('.mt-alt-card').forEach(card=>{
      const originalName=card.querySelector(':scope > strong')?.textContent?.trim()||'';
      const index=findExerciseIndex(originalName);
      if(index<0)return;
      const list=card.querySelector('.mt-alt-list');
      if(!list)return;

      [...list.children].forEach(node=>{
        if(node.matches?.('button[data-mt-feedback-alt]'))return;
        const altName=node.textContent?.trim();
        if(!altName)return;
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='mt-feedback-alt-choice';
        btn.dataset.mtFeedbackAlt='1';
        btn.textContent=altName;
        btn.onclick=()=>replaceNow(index,altName);
        node.replaceWith(btn);
      });

      if(!card.querySelector('.mt-feedback-alt-help')){
        const help=document.createElement('small');
        help.className='mt-feedback-alt-help';
        help.textContent='Touchez une alternative pour la faire maintenant à la place.';
        card.insertBefore(help,list);
      }
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-feedback-alt-help{display:block;margin:0 0 8px;color:var(--muted);font-size:11px}
    .mt-feedback-alt-choice{width:100%;text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(59,130,246,.36);background:#0e1727;color:var(--text);font-size:13px;font-weight:800}
    .mt-feedback-alt-choice:active{transform:scale(.99)}
    .mt-feedback-alt-highlight{box-shadow:0 0 0 2px #3b82f6,0 0 22px rgba(59,130,246,.25)!important}
  `;
  document.head.appendChild(style);

  const body=document.getElementById('sessionDetailBody');
  if(body){
    let queued=false;
    const obs=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;wireAlternatives();});
    });
    obs.observe(body,{childList:true,subtree:true});
  }

  wireAlternatives();
})();
