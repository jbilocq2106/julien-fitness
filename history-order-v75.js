/* My Training v77 — chronological set order + robust repair for latest leg workout */
(function(){
  function n(v){const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0;}
  function norm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function escHtml(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  }
  function rowDate(r){
    if(typeof dateVal==='function')return dateVal(r?.start_time);
    const d=Date.parse(r?.start_time||'');
    return Number.isNaN(d)?0:d;
  }
  function nextSetIndex(rows){
    if(!rows.length)return 0;
    return Math.max(...rows.map(r=>Number.isFinite(Number(r.set_index))?Number(r.set_index):-1))+1;
  }
  function cloneSet(source,setIndex,weight,reps){
    return {
      ...source,
      set_index:setIndex,
      set_type:source?.set_type||'normal',
      weight_kg:weight,
      reps:reps,
      description:source?.description||'My Training'
    };
  }
  function addUntil(rows,count,weight,reps){
    if(!rows.length)return false;
    let changed=false;
    const source=rows[rows.length-1];
    while(rows.length<count){
      const repaired=cloneSet(source,nextSetIndex(rows),weight,reps);
      state.history.unshift(repaired);
      rows.push(repaired);
      changed=true;
    }
    return changed;
  }

  function latestLegWorkoutRows(){
    if(!Array.isArray(state?.history)||!state.history.length)return null;
    const workouts=new Map();
    state.history.forEach(r=>{
      const key=`${r.title||''}|${r.start_time||''}`;
      if(!workouts.has(key))workouts.set(key,[]);
      workouts.get(key).push(r);
    });
    const ordered=[...workouts.entries()].sort((a,b)=>rowDate(b[1][0])-rowDate(a[1][0]));
    const target=ordered.find(([,rows])=>{
      const names=rows.map(r=>norm(r.exercise_title));
      return names.some(x=>x.includes('leg curl assis')) &&
             names.some(x=>x.includes('presse a cuisses')) &&
             names.some(x=>x.includes('chest press')) &&
             names.some(x=>x.includes('curl pupitre'));
    });
    return target?.[1]||null;
  }

  function ensureLatestWorkoutRepair(){
    const rows=latestLegWorkoutRows();
    if(!rows)return false;
    let changed=false;

    const leg=rows.filter(r=>norm(r.exercise_title).includes('leg curl assis'));
    changed=addUntil(leg,3,52,12)||changed;

    const press=rows.filter(r=>norm(r.exercise_title).includes('presse a cuisses'));
    changed=addUntil(press,4,80,12)||changed;

    const chest=rows.filter(r=>norm(r.exercise_title).includes('chest press'));
    changed=addUntil(chest,3,59,9)||changed;

    const curl=rows.filter(r=>norm(r.exercise_title).includes('curl pupitre'));
    changed=addUntil(curl,3,27,14)||changed;

    if(changed && typeof save==='function')save();
    return changed;
  }

  function sortedSets(sets){
    return sets.map((r,i)=>({r,i})).sort((a,b)=>{
      const ai=Number(a.r?.set_index),bi=Number(b.r?.set_index);
      const av=Number.isFinite(ai)?ai:a.i;
      const bv=Number.isFinite(bi)?bi:b.i;
      return av-bv || a.i-b.i;
    }).map(x=>x.r);
  }

  function chronologicalWorkoutDetail(key){
    /* Re-apply on every opening. It is idempotent: existing rows are never duplicated. */
    ensureLatestWorkoutRepair();

    const rows=state.history.filter(r=>`${r.title||''}|${r.start_time||''}`===key);
    if(!rows.length)return;

    const first=rows[0];
    const start=typeof dateVal==='function'?dateVal(first.start_time):rowDate(first);
    const end=Math.max(...rows.map(r=>(typeof dateVal==='function'?dateVal(r.end_time):Date.parse(r.end_time||''))||0));

    document.getElementById('sessionDetailTitle').textContent=first.title||'Séance';
    const meta=[typeof formatWorkoutDate==='function'?formatWorkoutDate(first.start_time):String(first.start_time||'')];
    if(end>start && typeof formatDurationSeconds==='function')meta.push(formatDurationSeconds((end-start)/1000));
    document.getElementById('sessionDetailMeta').textContent=meta.join(' • ');

    const byEx=new Map();
    rows.slice().sort((a,b)=>n(a.exercise_order)-n(b.exercise_order)).forEach(r=>{
      const name=r.exercise_title||'Exercice';
      if(!byEx.has(name))byEx.set(name,[]);
      byEx.get(name).push(r);
    });

    const show=typeof showRir!=='undefined' && showRir;
    document.getElementById('sessionDetailBody').innerHTML=[...byEx.entries()].map(([name,rawSets])=>{
      const sets=sortedSets(rawSets);
      const cardio=sets.some(r=>
        r.set_type==='cardio' || n(r.distance_km)>0 || n(r.duration_seconds)>0 ||
        (typeof isCardioName==='function' && isCardioName(name))
      );
      if(cardio){
        const summary=typeof cardioSummary==='function'?cardioSummary(sets[0]):'Cardio enregistré';
        return `<div class="history-exercise"><h3>${escHtml(name)}</h3><div class="cardio-history">${escHtml(summary)}</div></div>`;
      }
      return `<div class="history-exercise">
        <h3>${escHtml(name)}</h3>
        <div class="history-set-head ${show?'':'history-rir-hidden'}"><span>#</span><span>Charge</span><span>Reps</span>${show?'<span>RIR/RPE</span>':''}</div>
        ${sets.map((r,i)=>`<div class="history-set-row ${show?'':'history-rir-hidden'}">
          <span>${i+1}</span>
          <strong>${n(r.weight_kg)?n(r.weight_kg)+' kg':'—'}</strong>
          <span>${n(r.reps)||'—'}</span>
          ${show?`<span>${r.rir!=null&&r.rir!==''?escHtml(r.rir):(r.rpe?escHtml(r.rpe):'—')}</span>`:''}
        </div>`).join('')}
      </div>`;
    }).join('');

    document.getElementById('sessionModal').classList.remove('hidden');
  }

  ensureLatestWorkoutRepair();

  if(typeof openWorkoutDetail==='function'){
    openWorkoutDetail=chronologicalWorkoutDetail;
    window.openWorkoutDetail=chronologicalWorkoutDetail;
  }
  if(typeof renderHome==='function')renderHome();
  if(typeof renderHistory==='function' && document.getElementById('historyView')?.classList.contains('active'))renderHistory();
})();
