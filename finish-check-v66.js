/* My Training v66 — verify every exercise before finishing + compact rest controls */
(function(){
  function escHtml(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function exerciseIncomplete(e){
    if(!e)return false;
    if(e.cardio)return !e.cardio.done;
    return !Array.isArray(e.sets)||!e.sets.length||e.sets.some(s=>!s.done);
  }

  function incompleteDetails(w){
    return (w?.exercises||[]).map((e,index)=>{
      if(!exerciseIncomplete(e))return null;
      if(e.cardio){
        return {index,name:e.name,detail:'Cardio non validé'};
      }
      const total=e.sets?.length||0;
      const done=(e.sets||[]).filter(s=>s.done).length;
      return {index,name:e.name,detail:`${done}/${total} séries validées`};
    }).filter(Boolean);
  }

  function showIncompleteModal(items){
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body){
      alert('La séance n’est pas terminée : certains exercices restent à valider.');
      return;
    }

    title.textContent='Séance incomplète';
    meta.textContent='Tout doit être validé avant de terminer';
    body.innerHTML=`
      <p class="mt-finish-check-intro">Il reste ${items.length} exercice${items.length>1?'s':''} à terminer ou à valider.</p>
      <div class="mt-finish-check-list">
        ${items.map(x=>`<button type="button" class="mt-finish-check-item" data-mt-jump="${x.index}">
          <span><strong>${escHtml(x.name)}</strong><small>${escHtml(x.detail)}</small></span><b>Voir</b>
        </button>`).join('')}
      </div>
      <button type="button" class="primary mt-finish-check-back" id="mtFinishCheckBack">Retour à la séance</button>`;

    body.querySelectorAll('[data-mt-jump]').forEach(btn=>{
      btn.onclick=()=>{
        modal.classList.add('hidden');
        const index=Number(btn.dataset.mtJump);
        const card=document.querySelectorAll('#exerciseList .exercise')[index];
        if(card){
          card.scrollIntoView({behavior:'smooth',block:'center'});
          card.classList.add('mt-finish-check-highlight');
          setTimeout(()=>card.classList.remove('mt-finish-check-highlight'),1800);
        }
      };
    });
    document.getElementById('mtFinishCheckBack').onclick=()=>modal.classList.add('hidden');
    modal.classList.remove('hidden');
  }

  function simplifyRestControls(){
    // Keep only the countdown display and ±15 s adjustments in the bottom dock.
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
    .mt-finish-check-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;background:var(--panel2);border:1px solid var(--line);padding:11px 12px}
    .mt-finish-check-item strong{display:block}.mt-finish-check-item small{display:block;color:var(--muted);margin-top:3px}.mt-finish-check-item b{color:var(--accent);white-space:nowrap}
    .mt-finish-check-back{width:100%;margin-top:14px;padding:12px}
    .mt-finish-check-highlight{box-shadow:0 0 0 2px var(--danger,#ef4444),0 0 22px rgba(239,68,68,.25)!important}
  `;
  document.head.appendChild(style);

  simplifyRestControls();

  // Run after all previous finish handlers (including exercise feedback) have loaded.
  const finishBtn=document.getElementById('finishWorkoutBtn');
  if(finishBtn&&typeof finishBtn.onclick==='function'){
    const previousFinish=finishBtn.onclick;
    finishBtn.onclick=function(ev){
      const w=state.activeWorkout;
      if(!w||w.testMode)return previousFinish.call(this,ev);
      const incomplete=incompleteDetails(w);
      if(incomplete.length){
        showIncompleteModal(incomplete);
        return;
      }
      return previousFinish.call(this,ev);
    };
  }

  // In case a render/update recreates anything around the timer dock.
  const dock=document.getElementById('timerDock');
  if(dock){
    new MutationObserver(()=>simplifyRestControls()).observe(dock,{childList:true,subtree:true});
  }
})();
