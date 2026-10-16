/* My Training v80 — edit recorded cardio details and calculate treadmill distance */
(function(){
  let currentWorkoutKey='';
  let decorating=false;

  function num(v){
    const n=Number(String(v??'').replace(',','.').replace(/[^0-9.\-]/g,''));
    return Number.isFinite(n)?n:0;
  }
  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function escHtml(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function rowsFor(key,name){
    return (state.history||[]).filter(r=>`${r.title||''}|${r.start_time||''}`===key && (r.exercise_title||'Exercice')===name);
  }
  function isCardioRows(name,rows){
    return !!rows.length && (
      rows.some(r=>r.set_type==='cardio'||num(r.duration_seconds)>0||num(r.distance_km)>0) ||
      norm(name).includes('tapis') ||
      (typeof isCardioName==='function'&&isCardioName(name))
    );
  }
  function hrFromRow(r){
    const direct=num(r.avg_hr||r.avgHr||r.heart_rate_avg||r.average_heart_rate);
    if(direct)return direct;
    const m=String(r.exercise_notes||'').match(/FC\s*(?:moyenne|moy\.)\s*:\s*(\d+(?:[.,]\d+)?)\s*bpm/i);
    return m?num(m[1]):0;
  }
  function cleanHrNote(note){
    return String(note||'')
      .replace(/\s*•?\s*FC\s*(?:moyenne|moy\.)\s*:\s*\d+(?:[.,]\d+)?\s*bpm/ig,'')
      .replace(/\s{2,}/g,' ')
      .trim()
      .replace(/\s*•\s*$/,'');
  }
  function format2(v){return num(v).toFixed(2).replace('.',',');}

  function openEditor(key,name){
    const rows=rowsFor(key,name);
    if(!isCardioRows(name,rows))return;
    const r=rows[0];
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body)return;

    const durationMin=num(r.duration_seconds)?num(r.duration_seconds)/60:0;
    const distance=num(r.distance_km);
    const speed=num(r.speed_kmh) || (durationMin>0&&distance>0 ? distance/(durationMin/60) : 0);
    const incline=num(r.incline_percent);
    const avgHr=hrFromRow(r);
    const maxHr=num(r.max_hr||r.maxHr||r.heart_rate_max||r.maximum_heart_rate);
    const kcal=num(r.calories||r.kcal||r.energy_kcal);

    title.textContent='Modifier '+name;
    meta.textContent='Données cardio enregistrées';
    body.innerHTML=`
      <button type="button" class="ghost mt-cardio-edit-back">← Retour au détail</button>
      <div class="mt-cardio-edit-box">
        <label>Durée réelle
          <div class="mt-cardio-edit-with-unit"><input id="mtCardioEditDuration" type="number" inputmode="decimal" min="0" max="600" step="0.5" value="${durationMin||''}"><span>min</span></div>
        </label>
        <label>Vitesse moyenne réelle
          <div class="mt-cardio-edit-with-unit"><input id="mtCardioEditSpeed" type="number" inputmode="decimal" min="0" max="30" step="0.1" value="${speed||''}"><span>km/h</span></div>
        </label>
        <label>Inclinaison
          <div class="mt-cardio-edit-with-unit"><input id="mtCardioEditIncline" type="number" inputmode="decimal" min="0" max="40" step="0.5" value="${incline||''}"><span>%</span></div>
        </label>
        <label>Distance réelle
          <div class="mt-cardio-edit-with-unit"><input id="mtCardioEditDistance" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="${distance||''}"><span>km</span></div>
        </label>
        <button type="button" class="secondary mt-cardio-calc-distance" id="mtCardioCalcDistance">Calculer la distance avec durée + vitesse</button>
        <div class="mt-cardio-distance-hint" id="mtCardioDistanceHint">Distance = vitesse moyenne × durée. L’inclinaison modifie l’effort, pas la distance affichée par le tapis.</div>
        <label>FC moyenne
          <div class="mt-cardio-edit-with-unit"><input id="mtCardioEditAvgHr" type="number" inputmode="numeric" min="40" max="230" step="1" value="${avgHr||''}"><span>bpm</span></div>
        </label>
        <label>FC maximale
          <div class="mt-cardio-edit-with-unit"><input id="mtCardioEditMaxHr" type="number" inputmode="numeric" min="40" max="240" step="1" value="${maxHr||''}"><span>bpm</span></div>
        </label>
        <label>Calories
          <div class="mt-cardio-edit-with-unit"><input id="mtCardioEditCalories" type="number" inputmode="numeric" min="0" max="5000" step="1" value="${kcal||''}"><span>kcal</span></div>
        </label>
      </div>
      <div class="mt-cardio-edit-actions">
        <button type="button" class="ghost" id="mtCardioEditCancel">Annuler</button>
        <button type="button" class="primary" id="mtCardioEditSave">Enregistrer</button>
      </div>`;

    const durationInput=document.getElementById('mtCardioEditDuration');
    const speedInput=document.getElementById('mtCardioEditSpeed');
    const distanceInput=document.getElementById('mtCardioEditDistance');
    const hint=document.getElementById('mtCardioDistanceHint');

    function calculatedDistance(){
      const minutes=num(durationInput.value),kmh=num(speedInput.value);
      return minutes>0&&kmh>0 ? kmh*(minutes/60) : 0;
    }
    function refreshSuggestion(){
      const d=calculatedDistance();
      hint.textContent=d>0
        ? `Distance calculée : ${format2(d)} km (${String(num(speedInput.value)).replace('.',',')} km/h × ${String(num(durationInput.value)).replace('.',',')} min). L’inclinaison n’entre pas dans ce calcul.`
        : 'Renseigne la durée et la vitesse moyenne pour calculer la distance. L’inclinaison modifie l’effort, pas la distance affichée par le tapis.';
    }
    durationInput.oninput=refreshSuggestion;
    speedInput.oninput=refreshSuggestion;
    refreshSuggestion();

    document.getElementById('mtCardioCalcDistance').onclick=()=>{
      const d=calculatedDistance();
      if(!d){
        hint.textContent='Il faut renseigner une durée et une vitesse moyenne supérieures à 0.';
        return;
      }
      distanceInput.value=d.toFixed(2);
      refreshSuggestion();
    };

    document.querySelector('.mt-cardio-edit-back').onclick=()=>{
      if(typeof window.mtOpenExerciseHistoryDetail==='function')window.mtOpenExerciseHistoryDetail(key,name);
    };
    document.getElementById('mtCardioEditCancel').onclick=()=>{
      if(typeof window.mtOpenExerciseHistoryDetail==='function')window.mtOpenExerciseHistoryDetail(key,name);
    };

    document.getElementById('mtCardioEditSave').onclick=()=>{
      const duration=num(document.getElementById('mtCardioEditDuration').value);
      const speedValue=num(document.getElementById('mtCardioEditSpeed').value);
      const inclineValue=num(document.getElementById('mtCardioEditIncline').value);
      const distanceValue=num(document.getElementById('mtCardioEditDistance').value);
      const avgHrValue=Math.round(num(document.getElementById('mtCardioEditAvgHr').value));
      const maxHrValue=Math.round(num(document.getElementById('mtCardioEditMaxHr').value));
      const kcalValue=Math.round(num(document.getElementById('mtCardioEditCalories').value));

      rows.forEach(row=>{
        row.duration_seconds=duration>0?Math.round(duration*60):'';
        row.speed_kmh=speedValue>0?speedValue:'';
        row.incline_percent=inclineValue>=0&&document.getElementById('mtCardioEditIncline').value!==''?inclineValue:'';
        row.distance_km=distanceValue>0?distanceValue:'';
        row.avg_hr=avgHrValue>0?avgHrValue:'';
        row.max_hr=maxHrValue>0?maxHrValue:'';
        row.calories=kcalValue>0?kcalValue:'';
        const base=cleanHrNote(row.exercise_notes);
        row.exercise_notes=avgHrValue?`${base}${base?' • ':''}FC moyenne: ${avgHrValue} bpm`:base;
      });

      if(typeof save==='function')save();
      try{window.mtCardioReference?.refresh?.();}catch(e){}
      try{renderHome();}catch(e){}
      try{renderHistory();}catch(e){}
      if(typeof window.mtOpenExerciseHistoryDetail==='function')window.mtOpenExerciseHistoryDetail(key,name);
    };

    modal.classList.remove('hidden');
  }

  function decorateExerciseDetail(){
    if(decorating||!currentWorkoutKey)return;
    const body=document.getElementById('sessionDetailBody');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    if(!body||!title||!meta)return;
    if(meta.textContent!=='Détail de l’exercice')return;
    const name=title.textContent||'';
    const rows=rowsFor(currentWorkoutKey,name);
    if(!isCardioRows(name,rows))return;
    if(body.querySelector('.mt-cardio-edit-open'))return;

    decorating=true;
    try{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='primary mt-cardio-edit-open';
      btn.textContent='✎ Modifier les données cardio';
      btn.onclick=()=>openEditor(currentWorkoutKey,name);
      const back=body.querySelector('.mt-ex-detail-back');
      if(back)back.insertAdjacentElement('afterend',btn); else body.prepend(btn);
    }finally{decorating=false;}
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-cardio-edit-open{width:100%;margin:0 0 12px}
    .mt-cardio-edit-back{width:100%;margin-bottom:12px;text-align:left}
    .mt-cardio-edit-box{display:grid;gap:12px;background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:14px}
    .mt-cardio-edit-box label{display:grid;gap:6px;color:var(--muted);font-size:12px;font-weight:800}
    .mt-cardio-edit-with-unit{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .mt-cardio-edit-with-unit input{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--line);border-radius:10px;background:#0e1727;color:var(--text);font-size:18px;font-weight:900}
    .mt-cardio-edit-with-unit span{min-width:42px;color:var(--text);font-weight:900}
    .mt-cardio-calc-distance{width:100%;padding:11px}
    .mt-cardio-distance-hint{padding:10px;border-radius:10px;background:#0e1727;color:var(--muted);font-size:12px;line-height:1.45}
    .mt-cardio-edit-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:12px}
    @media(max-width:430px){.mt-cardio-edit-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  if(typeof openWorkoutDetail==='function'){
    const previousOpenWorkoutDetail=openWorkoutDetail;
    openWorkoutDetail=function(key){
      currentWorkoutKey=key||'';
      const out=previousOpenWorkoutDetail(key);
      setTimeout(decorateExerciseDetail,0);
      return out;
    };
    window.openWorkoutDetail=openWorkoutDetail;
  }

  const body=document.getElementById('sessionDetailBody');
  if(body){
    const observer=new MutationObserver(()=>setTimeout(decorateExerciseDetail,0));
    observer.observe(body,{childList:true,subtree:true});
  }

  window.mtEditCardioHistory=openEditor;
})();
