/* My Training v78 — clickable exercise details in recorded workout history */
(function(){
  function num(v){
    const n=Number(String(v??'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  }
  function escHtml(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function rowsForKey(key){
    return (state.history||[]).filter(r=>`${r.title||''}|${r.start_time||''}`===key);
  }
  function sortedSets(rows){
    return rows.map((r,i)=>({r,i})).sort((a,b)=>{
      const ai=Number(a.r?.set_index),bi=Number(b.r?.set_index);
      const av=Number.isFinite(ai)?ai:a.i;
      const bv=Number.isFinite(bi)?bi:b.i;
      return av-bv || a.i-b.i;
    }).map(x=>x.r);
  }
  function isCardio(name,rows){
    return rows.some(r=>r.set_type==='cardio'||num(r.duration_seconds)>0||num(r.distance_km)>0) ||
      (typeof isCardioName==='function'&&isCardioName(name)) || norm(name).includes('tapis');
  }
  function fmtDecimal(v,d=1){
    const n=num(v);
    return n?n.toFixed(d).replace('.',','):'—';
  }
  function fmtDuration(sec){
    sec=num(sec);
    if(!sec)return 'Non renseignée';
    const total=Math.round(sec);
    const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
    if(h)return `${h} h ${String(m).padStart(2,'0')} min`;
    if(s)return `${m} min ${String(s).padStart(2,'0')} s`;
    return `${m} min`;
  }
  function avgHrFromRow(r){
    const direct=num(r.avg_hr||r.avgHr||r.heart_rate_avg||r.average_heart_rate);
    if(direct)return direct;
    const m=String(r.exercise_notes||'').match(/FC\s*(?:moyenne|moy\.)\s*:\s*(\d+(?:[.,]\d+)?)\s*bpm/i);
    return m?num(m[1]):0;
  }
  function maxHrFromRow(r){
    const direct=num(r.max_hr||r.maxHr||r.heart_rate_max||r.maximum_heart_rate);
    if(direct)return direct;
    const m=String(r.exercise_notes||'').match(/FC\s*(?:max|maximale)\s*:\s*(\d+(?:[.,]\d+)?)\s*bpm/i);
    return m?num(m[1]):0;
  }
  function caloriesFromRow(r){
    const direct=num(r.calories||r.kcal||r.energy_kcal);
    if(direct)return direct;
    const m=String(r.exercise_notes||'').match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
    return m?num(m[1]):0;
  }
  function cardioDetails(row){
    const duration=num(row.duration_seconds);
    const distance=num(row.distance_km);
    const speed=num(row.speed_kmh) || (duration>0&&distance>0 ? distance/(duration/3600) : 0);
    let incline=num(row.incline_percent);
    if(!incline){
      const m=String(row.exercise_notes||'').match(/(\d+(?:[.,]\d+)?)\s*%/);
      if(m)incline=num(m[1]);
    }
    return {
      duration,distance,speed,incline,
      avgHr:avgHrFromRow(row),
      maxHr:maxHrFromRow(row),
      calories:caloriesFromRow(row)
    };
  }
  function metric(label,value,unit=''){
    return `<div class="mt-ex-detail-metric"><small>${escHtml(label)}</small><strong>${escHtml(value)}${unit?` <span>${escHtml(unit)}</span>`:''}</strong></div>`;
  }
  function openExerciseDetail(key,name){
    const all=rowsForKey(key);
    const rows=sortedSets(all.filter(r=>(r.exercise_title||'Exercice')===name));
    if(!rows.length)return;
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body)return;

    title.textContent=name;
    meta.textContent='Détail de l’exercice';

    if(isCardio(name,rows)){
      const r=rows[0],d=cardioDetails(r);
      body.innerHTML=`
        <button type="button" class="ghost mt-ex-detail-back">← Retour à la séance</button>
        <div class="mt-ex-detail-grid">
          ${metric('Durée',fmtDuration(d.duration))}
          ${metric('Distance',d.distance?fmtDecimal(d.distance,2):'Non renseignée',d.distance?'km':'')}
          ${metric('Vitesse moyenne',d.speed?fmtDecimal(d.speed,1):'Non renseignée',d.speed?'km/h':'')}
          ${metric('Inclinaison',d.incline?fmtDecimal(d.incline,1):'Non renseignée',d.incline?'%':'')}
          ${metric('FC moyenne',d.avgHr?String(Math.round(d.avgHr)):'Non renseignée',d.avgHr?'bpm':'')}
          ${metric('FC maximale',d.maxHr?String(Math.round(d.maxHr)):'Non renseignée',d.maxHr?'bpm':'')}
          ${metric('Calories',d.calories?String(Math.round(d.calories)):'Non renseignées',d.calories?'kcal':'')}
        </div>
        ${r.exercise_notes?`<div class="mt-ex-detail-note"><strong>Notes</strong><p>${escHtml(r.exercise_notes)}</p></div>`:''}`;
    }else{
      const totalReps=rows.reduce((a,r)=>a+num(r.reps),0);
      const volume=rows.reduce((a,r)=>a+num(r.weight_kg)*num(r.reps),0);
      const best=rows.slice().sort((a,b)=>(num(b.weight_kg)*num(b.reps))-(num(a.weight_kg)*num(a.reps)))[0];
      const showRirLocal=typeof showRir!=='undefined'&&showRir;
      body.innerHTML=`
        <button type="button" class="ghost mt-ex-detail-back">← Retour à la séance</button>
        <div class="mt-ex-detail-grid">
          ${metric('Séries',String(rows.length))}
          ${metric('Répétitions',String(totalReps))}
          ${metric('Volume',Math.round(volume).toLocaleString('fr-FR'),'kg')}
          ${metric('Meilleure série',best?`${num(best.weight_kg)} kg × ${num(best.reps)}`:'—')}
        </div>
        <div class="mt-ex-detail-table">
          <div class="history-set-head ${showRirLocal?'':'history-rir-hidden'}"><span>#</span><span>Charge</span><span>Reps</span>${showRirLocal?'<span>RIR/RPE</span>':''}</div>
          ${rows.map((r,i)=>`<div class="history-set-row ${showRirLocal?'':'history-rir-hidden'}"><span>${i+1}</span><strong>${num(r.weight_kg)?num(r.weight_kg)+' kg':'—'}</strong><span>${num(r.reps)||'—'}</span>${showRirLocal?`<span>${r.rir!=null&&r.rir!==''?escHtml(r.rir):(r.rpe?escHtml(r.rpe):'—')}</span>`:''}</div>`).join('')}
        </div>
        ${rows[0]?.exercise_notes?`<div class="mt-ex-detail-note"><strong>Notes</strong><p>${escHtml(rows[0].exercise_notes)}</p></div>`:''}`;
    }

    body.querySelector('.mt-ex-detail-back').onclick=()=>{
      if(typeof openWorkoutDetail==='function')openWorkoutDetail(key);
    };
    modal.classList.remove('hidden');
  }

  function attachExerciseClicks(key){
    const body=document.getElementById('sessionDetailBody');
    if(!body)return;
    const rows=rowsForKey(key);
    const names=[];
    rows.slice().sort((a,b)=>num(a.exercise_order)-num(b.exercise_order)).forEach(r=>{
      const name=r.exercise_title||'Exercice';
      if(!names.includes(name))names.push(name);
    });
    const cards=[...body.querySelectorAll('.history-exercise')];
    cards.forEach((card,i)=>{
      const name=card.querySelector('h3')?.textContent||names[i];
      if(!name)return;
      card.classList.add('mt-exercise-clickable');
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      if(!card.querySelector('.mt-ex-detail-link')){
        const link=document.createElement('div');
        link.className='mt-ex-detail-link';
        link.textContent='Voir les détails ›';
        card.appendChild(link);
      }
      const open=()=>openExerciseDetail(key,name);
      card.onclick=open;
      card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-exercise-clickable{cursor:pointer;transition:transform .12s ease,border-color .12s ease;position:relative}
    .mt-exercise-clickable:active{transform:scale(.99)}
    .mt-ex-detail-link{margin-top:10px;padding-top:9px;border-top:1px solid var(--line);font-size:12px;font-weight:900;color:#93c5fd;text-align:right}
    .mt-ex-detail-back{width:100%;margin-bottom:12px;text-align:left}
    .mt-ex-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .mt-ex-detail-metric{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:12px;min-width:0}
    .mt-ex-detail-metric small{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}
    .mt-ex-detail-metric strong{display:block;font-size:18px;line-height:1.2;word-break:break-word}
    .mt-ex-detail-metric strong span{font-size:12px;color:var(--muted)}
    .mt-ex-detail-table{background:var(--panel2);border-radius:12px;padding:10px 12px}
    .mt-ex-detail-note{margin-top:12px;background:var(--panel2);border-radius:12px;padding:12px}
    .mt-ex-detail-note p{margin:6px 0 0;color:var(--muted);line-height:1.45}
    @media(max-width:380px){.mt-ex-detail-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  if(typeof openWorkoutDetail==='function'){
    const previousOpen=openWorkoutDetail;
    openWorkoutDetail=function(key){
      const out=previousOpen(key);
      attachExerciseClicks(key);
      return out;
    };
    window.openWorkoutDetail=openWorkoutDetail;
  }

  window.mtOpenExerciseHistoryDetail=openExerciseDetail;
})();
