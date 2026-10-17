/* My Training v72 — edit a recorded workout's date/time/duration */
(function(){
  function pad(n){return String(n).padStart(2,'0');}
  function toLocalInput(d){
    if(!(d instanceof Date)||Number.isNaN(d.getTime()))return '';
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromLocalInput(v){
    if(!v)return null;
    const d=new Date(v);
    return Number.isNaN(d.getTime())?null:d;
  }
  function durationMinutes(start,end){
    if(!start||!end)return 0;
    return Math.max(1,Math.round((end.getTime()-start.getTime())/60000));
  }
  function rowsForKey(key){
    return (state.history||[]).filter(r=>`${r.title||''}|${r.start_time||''}`===key);
  }
  function maxEnd(rows,start){
    const times=rows.map(r=>new Date(r.end_time||'').getTime()).filter(Number.isFinite);
    return new Date(times.length?Math.max(...times):start.getTime());
  }
  function closeModal(){document.getElementById('sessionModal')?.classList.add('hidden');}

  function attachEditButton(key){
    const body=document.getElementById('sessionDetailBody');
    if(!body||!rowsForKey(key).length)return;
    body.querySelector('.mt-recorded-edit-toolbar')?.remove();
    const bar=document.createElement('div');
    bar.className='mt-recorded-edit-toolbar';
    bar.innerHTML='<button type="button" class="secondary mt-recorded-edit-btn">✎ Modifier la séance</button>';
    bar.querySelector('button').onclick=()=>openEditor(key);
    body.prepend(bar);
  }

  function openEditor(key){
    const rows=rowsForKey(key);
    if(!rows.length)return;
    const first=rows[0];
    const start=new Date(first.start_time);
    const end=maxEnd(rows,start);
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body)return;

    title.textContent='Modifier la séance';
    meta.textContent=first.title||'Séance enregistrée';
    body.innerHTML=`
      <div class="mt-recorded-edit-box">
        <label>Début
          <input id="mtRecordedStart" type="datetime-local" step="60" value="${toLocalInput(start)}">
        </label>
        <label>Fin
          <input id="mtRecordedEnd" type="datetime-local" step="60" value="${toLocalInput(end)}">
        </label>
        <label class="mt-recorded-duration-label">Durée totale
          <div class="mt-recorded-duration-wrap"><input id="mtRecordedDuration" type="number" inputmode="numeric" min="1" max="720" step="1" value="${durationMinutes(start,end)}"><span>min</span></div>
        </label>
        <small>Tu peux modifier directement la durée totale. L’heure de fin sera recalculée automatiquement. Le contenu de la séance et tes performances restent inchangés.</small>
      </div>
      <div class="mt-recorded-edit-actions">
        <button type="button" class="ghost" id="mtRecordedCancel">Annuler</button>
        <button type="button" class="primary" id="mtRecordedSave">Enregistrer les modifications</button>
      </div>`;

    const startInput=document.getElementById('mtRecordedStart');
    const endInput=document.getElementById('mtRecordedEnd');
    const durationInput=document.getElementById('mtRecordedDuration');

    function syncEndFromDuration(){
      const s=fromLocalInput(startInput.value);
      const min=Math.max(1,Number(durationInput.value)||1);
      if(!s)return;
      endInput.value=toLocalInput(new Date(s.getTime()+min*60000));
    }
    function syncDurationFromTimes(){
      const s=fromLocalInput(startInput.value),e=fromLocalInput(endInput.value);
      if(!s||!e||e<=s)return;
      durationInput.value=String(durationMinutes(s,e));
    }
    durationInput.oninput=syncEndFromDuration;
    startInput.onchange=syncEndFromDuration;
    endInput.onchange=syncDurationFromTimes;

    document.getElementById('mtRecordedCancel').onclick=()=>{
      closeModal();
      if(typeof openWorkoutDetail==='function')openWorkoutDetail(key);
    };

    document.getElementById('mtRecordedSave').onclick=()=>{
      const newStart=fromLocalInput(startInput.value);
      let newEnd=fromLocalInput(endInput.value);
      const min=Math.max(1,Number(durationInput.value)||0);
      if(!newStart||!newEnd||!min){alert('Vérifie la date, les heures et la durée.');return;}
      newEnd=new Date(newStart.getTime()+min*60000);
      if(newEnd<=newStart){alert('L’heure de fin doit être après l’heure de début.');return;}
      if(newEnd.getTime()>Date.now()+5*60*1000){alert('La fin de séance ne peut pas être dans le futur.');return;}

      const oldStart=first.start_time;
      const oldTitle=first.title||'';
      const newStartIso=newStart.toISOString();
      const newEndIso=newEnd.toISOString();

      (state.history||[]).forEach(r=>{
        if((r.title||'')===oldTitle&&r.start_time===oldStart){
          r.start_time=newStartIso;
          r.end_time=newEndIso;
        }
      });
      (state.sessions||[]).forEach(s=>{
        if((s.title||'')===oldTitle&&s.start===oldStart){
          s.start=newStartIso;
          s.end=newEndIso;
        }
      });

      if(typeof save==='function')save();
      try{renderHome();}catch(e){}
      try{renderHistory();}catch(e){}
      const newKey=`${oldTitle}|${newStartIso}`;
      if(typeof openWorkoutDetail==='function')openWorkoutDetail(newKey);
    };

    modal.classList.remove('hidden');
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-recorded-edit-toolbar{display:flex;justify-content:flex-end;margin:0 0 12px}
    .mt-recorded-edit-btn{padding:9px 12px;font-weight:800}
    .mt-recorded-edit-box{display:grid;gap:12px;background:var(--panel2);border-radius:14px;padding:14px}
    .mt-recorded-edit-box label{display:grid;gap:6px;font-size:12px;font-weight:800;color:var(--muted)}
    .mt-recorded-edit-box input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid var(--line);background:#0e1727;color:var(--text);font-size:16px;font-weight:800}
    .mt-recorded-duration-label{padding-top:3px}
    .mt-recorded-duration-wrap{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px}
    .mt-recorded-duration-wrap input{font-size:26px;text-align:center}
    .mt-recorded-duration-wrap span{font-weight:900;color:var(--text)}
    .mt-recorded-edit-box small{color:var(--muted);line-height:1.45}
    .mt-recorded-edit-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:12px}
    @media(max-width:430px){.mt-recorded-edit-actions{grid-template-columns:1fr}.mt-recorded-edit-toolbar{justify-content:stretch}.mt-recorded-edit-btn{width:100%}}
  `;
  document.head.appendChild(style);

  if(typeof openWorkoutDetail==='function'){
    const previousOpenWorkoutDetail=openWorkoutDetail;
    openWorkoutDetail=function(key){
      const result=previousOpenWorkoutDetail(key);
      attachEditButton(key);
      return result;
    };
    window.openWorkoutDetail=openWorkoutDetail;
  }

  window.mtEditRecordedWorkout=openEditor;
})();
