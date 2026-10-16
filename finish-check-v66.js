/* My Training v67 — end-of-workout check with deliberate skip option */
(function(){
  function escHtml(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function statusFor(e){
    if(!e||e.skipped)return {complete:true,skipped:!!e?.skipped,done:0,total:0,missing:[]};
    if(e.cardio)return {complete:!!e.cardio.done,cardio:true,done:e.cardio.done?1:0,total:1,missing:e.cardio.done?[]:[0]};
    const sets=Array.isArray(e.sets)?e.sets:[];
    if(!sets.length)return {complete:true,done:0,total:0,missing:[]};
    const missing=[];
    let done=0;
    sets.forEach((s,i)=>{if(s?.done)done++;else missing.push(i);});
    return {complete:missing.length===0,cardio:false,done,total:sets.length,missing};
  }

  function incompleteDetails(w){
    return (w?.exercises||[]).map((e,index)=>{
      const status=statusFor(e);
      if(status.complete)return null;
      return {index,e,status};
    }).filter(Boolean);
  }

  function jumpToExercise(index){
    const modal=document.getElementById('sessionModal');
    modal?.classList.add('hidden');
    try{showView('workoutView');}catch(e){}
    const card=document.querySelectorAll('#exerciseList .exercise')[index];
    if(card){
      card.scrollIntoView({behavior:'smooth',block:'center'});
      card.classList.add('mt-finish-check-highlight');
      setTimeout(()=>card.classList.remove('mt-finish-check-highlight'),1800);
    }
  }

  function applySkips(items){
    const w=state.activeWorkout;
    if(!w)return;
    const now=new Date().toISOString();
    items.forEach(({index,status})=>{
      const e=w.exercises?.[index];
      if(!e)return;
      e.skipped=true;
      e.skippedAt=now;
      e.skippedReason='manual-end-check';
      e.skippedSets=(status.missing||[]).slice();
    });
    if(typeof save==='function')save();
  }

  function showIncompleteModal(items,onContinue){
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body){
      alert('Certains exercices ne sont pas terminés.');
      return;
    }

    title.textContent='Contrôle fin de séance';
    meta.textContent=`${items.length} exercice${items.length>1?'s':''} pas totalement validé${items.length>1?'s':''}`;
    body.innerHTML=`
      <p class="mt-finish-check-intro">Ce contrôle sert surtout à éviter un oubli. Si tu as volontairement laissé un exercice ou des séries, coche <b>Zapper</b> pour pouvoir clôturer.</p>
      <div class="mt-finish-check-list">
        ${items.map(({e,index,status})=>{
          const detail=status.cardio?'Cardio non validé':`${status.done}/${status.total} série${status.total>1?'s':''} validée${status.done>1?'s':''}`;
          return `<div class="mt-finish-check-item" data-mt-row="${index}">
            <div class="mt-finish-check-copy"><strong>${escHtml(e.name||`Exercice ${index+1}`)}</strong><small>${escHtml(detail)}</small></div>
            <button type="button" class="ghost mt-finish-see" data-mt-jump="${index}">Voir</button>
            <label class="mt-finish-skip"><input type="checkbox" data-mt-skip="${index}"><span>Zapper</span></label>
          </div>`;
        }).join('')}
      </div>
      <div class="mt-finish-check-hint" id="mtFinishCheckHint">Termine ce qui manque, ou coche « Zapper » pour chaque exercice volontairement non fait.</div>
      <div class="mt-finish-check-actions">
        <button type="button" class="ghost" id="mtFinishCheckBack">Retour à la séance</button>
        <button type="button" class="primary" id="mtFinishCheckClose">Clôturer la séance</button>
      </div>`;

    body.querySelectorAll('[data-mt-jump]').forEach(btn=>{
      btn.onclick=()=>jumpToExercise(Number(btn.dataset.mtJump));
    });

    document.getElementById('mtFinishCheckBack').onclick=()=>{
      modal.classList.add('hidden');
      try{showView('workoutView');}catch(e){}
    };

    document.getElementById('mtFinishCheckClose').onclick=()=>{
      const selected=new Set([...body.querySelectorAll('[data-mt-skip]:checked')].map(x=>Number(x.dataset.mtSkip)));
      const unresolved=items.filter(x=>!selected.has(x.index));
      if(unresolved.length){
        const hint=document.getElementById('mtFinishCheckHint');
        if(hint){
          hint.textContent='Il reste des exercices non validés. Termine-les ou coche « Zapper » pour ceux que tu veux volontairement ignorer.';
          hint.classList.add('warning');
        }
        return;
      }
      applySkips(items);
      modal.classList.add('hidden');
      onContinue();
    };

    modal.classList.remove('hidden');
  }

  function simplifyRestControls(){
    document.querySelectorAll('#timerDock [data-timer]').forEach(btn=>btn.remove());
    const actions=document.querySelector('#timerDock .timer-actions');
    if(actions)actions.classList.add('mt-rest-actions-compact');
  }

  const style=document.createElement('style');
  style.textContent=`
    #timerDock .mt-rest-actions-compact{grid-template-columns:repeat(2,minmax(64px,1fr));align-content:center}
    #timerDock .mt-rest-actions-compact button{font-size:14px;min-height:40px}
    .mt-finish-check-intro{color:var(--muted);font-size:13px;line-height:1.45;margin-bottom:12px}
    .mt-finish-check-list{display:grid;gap:8px}
    .mt-finish-check-item{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;background:var(--panel2);border:1px solid var(--line);padding:11px 12px;border-radius:12px}
    .mt-finish-check-copy{min-width:0}.mt-finish-check-copy strong{display:block}.mt-finish-check-copy small{display:block;color:var(--muted);margin-top:3px}
    .mt-finish-see{padding:8px 10px;font-size:12px}
    .mt-finish-skip{display:flex;align-items:center;gap:5px;margin:0;padding:8px 9px;border-radius:10px;background:#0e1727;color:var(--text);font-size:12px;font-weight:800}
    .mt-finish-skip input{width:19px;height:19px;margin:0}
    .mt-finish-check-hint{margin-top:12px;padding:9px 10px;border-radius:10px;background:#0e1727;color:var(--muted);font-size:12px;line-height:1.4}
    .mt-finish-check-hint.warning{color:#fbbf24;border:1px solid rgba(245,158,11,.35)}
    .mt-finish-check-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .mt-finish-check-highlight{box-shadow:0 0 0 2px #f59e0b,0 0 22px rgba(245,158,11,.24)!important}
    @media(max-width:430px){.mt-finish-check-item{grid-template-columns:1fr auto}.mt-finish-check-copy{grid-column:1/-1}.mt-finish-check-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  simplifyRestControls();

  const finishBtn=document.getElementById('finishWorkoutBtn');
  if(finishBtn&&typeof finishBtn.onclick==='function'){
    const previousFinish=finishBtn.onclick;
    finishBtn.onclick=function(ev){
      const w=state.activeWorkout;
      if(!w||w.testMode)return previousFinish.call(this,ev);
      const incomplete=incompleteDetails(w);
      if(!incomplete.length)return previousFinish.call(this,ev);
      showIncompleteModal(incomplete,()=>previousFinish.call(finishBtn,ev));
    };
  }

  const dock=document.getElementById('timerDock');
  if(dock)new MutationObserver(()=>simplifyRestControls()).observe(dock,{childList:true,subtree:true});
})();
