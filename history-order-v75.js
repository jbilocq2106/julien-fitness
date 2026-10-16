/* My Training v75 — chronological set order + one-time repair for the latest leg session */
(function(){
  const REPAIR_KEY='mt_history_repair_20261016_legcurl_v1';

  function n(v){const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0;}
  function norm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function escHtml(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function rowDate(r){
    if(typeof dateVal==='function')return dateVal(r?.start_time);
    const d=Date.parse(r?.start_time||'');
    return Number.isNaN(d)?0:d;
  }

  function repairLatestLegCurl(){
    if(localStorage.getItem(REPAIR_KEY)==='done')return;
    if(!Array.isArray(state?.history)||!state.history.length)return;

    const workouts=new Map();
    state.history.forEach(r=>{
      const key=`${r.title||''}|${r.start_time||''}`;
      if(!workouts.has(key))workouts.set(key,[]);
      workouts.get(key).push(r);
    });

    const ordered=[...workouts.entries()].sort((a,b)=>rowDate(b[1][0])-rowDate(a[1][0]));
    const target=ordered.find(([,rows])=>{
      const names=rows.map(r=>norm(r.exercise_title));
      return names.some(x=>x.includes('leg curl assis')) && names.some(x=>x.includes('presse a cuisses'));
    });
    if(!target)return;

    const rows=target[1];
    const leg=rows.filter(r=>norm(r.exercise_title).includes('leg curl assis'));
    const alreadyThird=leg.some(r=>n(r.set_index)>=2) || leg.length>=3;

    if(!alreadyThird && leg.length===2){
      const source=leg.find(r=>n(r.weight_kg)===52 && n(r.reps)===12) || leg[0];
      const maxIndex=Math.max(...leg.map(r=>Number.isFinite(Number(r.set_index))?Number(r.set_index):-1));
      const repaired={...source,set_index:maxIndex+1,weight_kg:52,reps:12,description:source.description||'My Training'};
      state.history.unshift(repaired);
      if(typeof save==='function')save();
    }

    localStorage.setItem(REPAIR_KEY,'done');
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

  repairLatestLegCurl();

  if(typeof openWorkoutDetail==='function'){
    openWorkoutDetail=chronologicalWorkoutDetail;
    window.openWorkoutDetail=chronologicalWorkoutDetail;
  }
  if(typeof renderHome==='function')renderHome();
  if(typeof renderHistory==='function' && document.getElementById('historyView')?.classList.contains('active'))renderHistory();
})();
