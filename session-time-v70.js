/* My Training v70 — editable workout end time */
(function(){
  let pendingEndPatch=null;

  function pad(n){return String(n).padStart(2,'0');}
  function clock(d){return `${pad(d.getHours())}:${pad(d.getMinutes())}`;}

  function validManualEnd(w){
    if(!w?.manualEndTime)return null;
    const d=new Date(w.manualEndTime);
    return Number.isNaN(d.getTime())?null:d;
  }

  function updateEndButton(){
    const btn=document.getElementById('mtWorkoutEndTimeBtn');
    const w=state.activeWorkout;
    if(!btn)return;
    const d=validManualEnd(w);
    btn.textContent=d?`Fin : ${clock(d)}`:'Fin : maintenant';
    btn.classList.toggle('active',!!d);
  }

  function attachEndButton(){
    const elapsed=document.getElementById('workoutElapsed');
    if(!elapsed||document.getElementById('mtWorkoutEndTimeBtn')){updateEndButton();return;}
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='mtWorkoutEndTimeBtn';
    btn.className='ghost mt-workout-end-time-btn';
    btn.textContent='Fin : maintenant';
    btn.onclick=openEndTimeModal;
    elapsed.insertAdjacentElement('afterend',btn);
    updateEndButton();
  }

  function endFromClock(w,value){
    if(!w||!/^[0-2]\d:[0-5]\d$/.test(value||''))return null;
    const [h,m]=value.split(':').map(Number);
    if(h>23)return null;
    const start=new Date(w.started);
    if(Number.isNaN(start.getTime()))return null;
    const d=new Date(start);
    d.setHours(h,m,0,0);
    if(d.getTime()<start.getTime())d.setDate(d.getDate()+1);
    return d;
  }

  function openEndTimeModal(){
    const w=state.activeWorkout;
    if(!w)return;
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body)return;

    const existing=validManualEnd(w);
    const initial=clock(existing||new Date());
    title.textContent='Heure de fin';
    meta.textContent='Corrige l’heure si tu as oublié de clôturer la séance tout de suite';
    body.innerHTML=`
      <div class="mt-end-time-box">
        <label for="mtEndTimeInput">Fin réelle de la séance</label>
        <input id="mtEndTimeInput" type="time" value="${initial}" step="60">
        <small>Le début de séance reste inchangé. L’historique utilisera cette heure comme fin réelle.</small>
      </div>
      <div class="mt-end-time-actions">
        <button type="button" class="ghost" id="mtEndTimeNow">Utiliser maintenant</button>
        <button type="button" class="primary" id="mtEndTimeSave">Enregistrer l’heure</button>
      </div>`;

    document.getElementById('mtEndTimeNow').onclick=()=>{
      delete w.manualEndTime;
      save();
      updateEndButton();
      modal.classList.add('hidden');
    };

    document.getElementById('mtEndTimeSave').onclick=()=>{
      const input=document.getElementById('mtEndTimeInput');
      const d=endFromClock(w,input?.value||'');
      if(!d){alert('Heure invalide.');return;}
      if(d.getTime()>Date.now()+5*60*1000){alert('L’heure de fin ne peut pas être dans le futur.');return;}
      w.manualEndTime=d.toISOString();
      save();
      updateEndButton();
      modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
  }

  function patchFinishedWorkoutEnd(){
    if(!pendingEndPatch||state.activeWorkout)return false;
    const {startIso,title,endIso}=pendingEndPatch;
    let changed=false;
    (state.history||[]).forEach(row=>{
      if(row.start_time===startIso&&row.title===title){row.end_time=endIso;changed=true;}
    });
    (state.sessions||[]).forEach(s=>{
      if(s.start===startIso&&s.title===title){s.end=endIso;changed=true;}
    });
    pendingEndPatch=null;
    return changed;
  }

  if(typeof save==='function'){
    const previousSave=save;
    save=function(){
      patchFinishedWorkoutEnd();
      return previousSave();
    };
    window.save=save;
  }

  const finishBtn=document.getElementById('finishWorkoutBtn');
  if(finishBtn&&typeof finishBtn.onclick==='function'){
    const previousFinish=finishBtn.onclick;
    finishBtn.onclick=function(ev){
      const w=state.activeWorkout;
      const end=validManualEnd(w);
      if(w&&end){
        pendingEndPatch={startIso:new Date(w.started).toISOString(),title:w.name,endIso:end.toISOString()};
      }else pendingEndPatch=null;
      return previousFinish.call(this,ev);
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-workout-end-time-btn{margin-top:6px;padding:6px 9px;font-size:11px}
    .mt-workout-end-time-btn.active{border-color:rgba(34,197,94,.55);color:#86efac;background:rgba(34,197,94,.08)}
    .mt-end-time-box{display:grid;gap:8px;padding:13px;border-radius:13px;background:var(--panel2)}
    .mt-end-time-box label{font-size:13px;font-weight:800}
    .mt-end-time-box input{font-size:24px;font-weight:900;padding:12px;border-radius:10px;border:1px solid var(--line);background:#0e1727;color:var(--text)}
    .mt-end-time-box small{color:var(--muted);line-height:1.4}
    .mt-end-time-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    @media(max-width:430px){.mt-end-time-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){
      previousRender();
      attachEndButton();
      updateEndButton();
    };
    window.renderWorkout=renderWorkout;
  }

  attachEndButton();
})();
