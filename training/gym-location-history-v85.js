/* My Training — salle par géolocalisation, confirmée et mémorisée localement.
   Aucune coordonnée n'est envoyée à un service externe. */
(function(){
  'use strict';

  const GYMS_KEY='mt_known_gym_locations_v1';
  const GYM_OPTIONS=['Basic-Fit Sandweiler','Basic-Fit Yutz','Basic-Fit Thionville'];
  const DEFAULT_GYM=GYM_OPTIONS[0];
  const SANDWEILER_BACKFILL_KEY='mt_sandweiler_last_two_20261021_v1';
  let pendingGymChoice='';
  let knownGyms=[];
  let currentPosition=null;
  let currentPositionWorkout=null;

  try{
    const stored=JSON.parse(localStorage.getItem(GYMS_KEY)||'[]');
    if(Array.isArray(stored))knownGyms=stored.filter(x=>
      x&&typeof x.name==='string'&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)
    );
  }catch(e){knownGyms=[];}

  function distanceMeters(a,b){
    const toRad=Math.PI/180;
    const dLat=(b.lat-a.lat)*toRad;
    const dLon=(b.lon-a.lon)*toRad;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*toRad)*Math.cos(b.lat*toRad)*Math.sin(dLon/2)**2;
    return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
  }

  function closestKnown(position){
    if(!knownGyms.length||position.accuracy>150)return null;
    const candidates=knownGyms.map(gym=>({...gym,meters:distanceMeters(position,gym)}))
      .sort((a,b)=>a.meters-b.meters);
    // Une marge conservatrice évite de confondre deux salles voisines.
    if(candidates[0].meters>180)return null;
    if(candidates[1]&&candidates[1].name!==candidates[0].name&&candidates[1].meters-candidates[0].meters<75)return null;
    return candidates[0];
  }

  function locationMessage(message){
    const status=document.getElementById('mtGymLocationStatus');
    if(status)status.textContent=message;
  }

  function locate(workout){
    if(!workout||!navigator.geolocation){
      locationMessage('GPS indisponible. Saisis le nom de la salle manuellement.');
      return;
    }
    locationMessage('Recherche de ta position…');
    navigator.geolocation.getCurrentPosition(position=>{
      if(state.activeWorkout!==workout)return;
      currentPosition={lat:position.coords.latitude,lon:position.coords.longitude,
        accuracy:position.coords.accuracy};
      currentPositionWorkout=workout.started;
      const nearby=closestKnown(currentPosition);
      if(nearby&&!workout.gymName){
        workout.gymName=nearby.name;
        workout.gymDetection='gps';
        save();renderWorkout();
      }
      locationMessage(`Position obtenue (précision ≈ ${Math.round(currentPosition.accuracy)} m). ${nearby?'Salle connue : '+nearby.name:'Nomme la salle pour la mémoriser.'}`);
      const input=document.getElementById('mtGymNameInput');
      if(input&&nearby&&!input.value)input.value=nearby.name;
    },error=>{
      if(state.activeWorkout!==workout)return;
      const problem=error.code===1?'Autorisation GPS refusée.':
        error.code===2?'Position indisponible.':'Le GPS n’a pas répondu.';
      locationMessage(`${problem} Tu peux saisir le nom manuellement.`);
      refreshWorkoutBadge();
    },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }

  // Choix explicite : aucune géolocalisation nécessaire ni envoyée.
  function ensureSelectionModal(){
    let modal=document.getElementById('mtGymSelectionModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='mtGymSelectionModal';
    modal.className='modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','mtGymSelectionTitle');
    modal.innerHTML=`
      <div class="modal-card mt-gym-choice-card">
        <div class="eyebrow">SALLE D’ENTRAÎNEMENT</div>
        <h2 id="mtGymSelectionTitle">Dans quel Basic-Fit ?</h2>
        <p class="muted">Sandweiler est proposé par défaut. Confirme ou choisis Yutz ou Thionville.</p>
        <div id="mtGymChoices" class="mt-gym-options" role="radiogroup" aria-label="Choisir le Basic-Fit">
          ${GYM_OPTIONS.map((name,index)=>`<label class="mt-gym-option">
            <input type="radio" name="mtGymSelection" value="${name}" ${index===0?'checked':''}>
            <span>${name}</span>
          </label>`).join('')}
        </div>
        <div class="mt-gym-choice-actions">
          <button type="button" class="ghost" id="mtGymChoiceCancel">Annuler</button>
          <button type="button" class="primary" id="mtGymChoiceConfirm">Confirmer la salle</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function promptGymSelection(onConfirm,selectedName=DEFAULT_GYM){
    const modal=ensureSelectionModal();
    const selection=GYM_OPTIONS.includes(selectedName)?selectedName:DEFAULT_GYM;
    for(const radio of modal.querySelectorAll('input[name="mtGymSelection"]')){
      radio.checked=radio.value===selection;
    }
    modal.classList.remove('hidden');
    const close=()=>{modal.classList.add('hidden');document.removeEventListener('keydown',onEscape);};
    const onEscape=event=>{if(event.key==='Escape'){event.preventDefault();close();}};
    document.addEventListener('keydown',onEscape);
    modal.querySelector('#mtGymChoiceCancel').onclick=close;
    modal.querySelector('#mtGymChoiceConfirm').onclick=()=>{
      const chosen=modal.querySelector('input[name="mtGymSelection"]:checked')?.value||DEFAULT_GYM;
      close();
      onConfirm(chosen);
    };
    modal.onclick=event=>{if(event.target===modal)close();};
    modal.querySelector('input[name="mtGymSelection"]:checked')?.focus();
  }

  function openGymModal(){
    const workout=state.activeWorkout;
    if(!workout)return;
    promptGymSelection(name=>{
      if(state.activeWorkout!==workout)return;
      workout.gymName=name;
      workout.gymDetection='selected';
      save();
      renderWorkout();
    },workout.gymName||DEFAULT_GYM);
  }

  function refreshWorkoutBadge(){
    const workout=state.activeWorkout;
    const elapsed=document.getElementById('workoutElapsed');
    if(!elapsed)return;
    let badge=document.getElementById('mtGymCurrent');
    if(!badge){
      badge=document.createElement('button');
      badge.type='button';badge.id='mtGymCurrent';
      badge.className='ghost mt-gym-current';
      badge.onclick=openGymModal;
      elapsed.insertAdjacentElement('afterend',badge);
    }
    badge.classList.toggle('hidden',!workout);
    if(workout)badge.textContent=workout.gymName?`📍 ${workout.gymName} · modifier`:'📍 Identifier la salle';
  }

  function addGymToHistory(workout){
    const start=new Date(workout.started).toISOString();
    (state.history||[]).forEach(row=>{
      if(row.start_time===start&&row.title===workout.name){
        row.gym_name=workout.gymName||'';
      }
    });
  }

  if(typeof recalculateProgressionFromWorkout==='function'){
    const previousRecalculate=recalculateProgressionFromWorkout;
    recalculateProgressionFromWorkout=function(workout){
      const result=previousRecalculate(workout);
      addGymToHistory(workout);
      return result;
    };
    window.recalculateProgressionFromWorkout=recalculateProgressionFromWorkout;
  }

  // Ne corriger qu'une seule fois les deux dernières vraies séances
  // après la récupération éventuelle des données privées Firebase.
  function backfillSandweilerForLastTwo(){
    if(localStorage.getItem(SANDWEILER_BACKFILL_KEY))return false;
    const groups=new Map();
    function add(title,start){
      const date=Date.parse(start||'');
      if(!Number.isFinite(date)||!title)return;
      const key=String(title)+'|'+String(start);
      groups.set(key,{key,title,start,date});
    }
    (state.history||[]).forEach(row=>add(row.title,row.start_time));
    (state.sessions||[]).forEach(row=>add(row.title,row.start));
    const latest=[...groups.values()].sort((a,b)=>b.date-a.date).slice(0,2);
    if(latest.length<2)return false;
    const keys=new Set(latest.map(group=>group.key));
    let changed=false;
    (state.history||[]).forEach(row=>{
      if(!keys.has(String(row.title||'')+'|'+String(row.start_time||'')))return;
      if(row.gym_name!==DEFAULT_GYM){row.gym_name=DEFAULT_GYM;changed=true;}
    });
    (state.sessions||[]).forEach(summary=>{
      if(!keys.has(String(summary.title||'')+'|'+String(summary.start||'')))return;
      if(summary.gym_name!==DEFAULT_GYM){summary.gym_name=DEFAULT_GYM;changed=true;}
    });
    localStorage.setItem(SANDWEILER_BACKFILL_KEY,JSON.stringify({
      groups:latest.map(group=>group.key),name:DEFAULT_GYM,updatedAt:new Date().toISOString()
    }));
    if(changed){save();try{renderHistory();}catch(e){}}
    return changed;
  }
  window.mtBackfillBasicFitSandweiler=backfillSandweilerForLastTwo;

  function autoLocateNewWorkout(previousWorkout){
    const workout=state.activeWorkout;
    if(previousWorkout||!workout||workout.testMode)return;
    currentPosition=null;currentPositionWorkout=null;
    // Une salle est choisie explicitement au lancement : ne pas
    // lui substituer silencieusement un résultat GPS.
    if(!pendingGymChoice&&!workout.gymName)locate(workout);
  }

  function promptBeforeStart(begin,testMode){
    if(testMode)return begin();
    if(state.activeWorkout){
      alert('Une séance est déjà en cours. Termine-la ou annule-la avant d’en démarrer une autre.');
      return;
    }
    promptGymSelection(chosen=>{
      if(state.activeWorkout)return;
      pendingGymChoice=chosen;
      try{
        begin();
        const workout=state.activeWorkout;
        if(!workout||workout.testMode)return;
        workout.gymName=chosen;
        workout.gymDetection='selected';
        save();
        renderWorkout();
      }finally{pendingGymChoice='';}
    });
  }

  if(typeof startWorkout==='function'){
    const previousStart=startWorkout;
    startWorkout=function(...args){
      return promptBeforeStart(()=>previousStart(...args),!!args[1]);
    };
    window.startWorkout=startWorkout;
  }
  if(typeof mtStartCardioSession==='function'){
    const previousCardio=mtStartCardioSession;
    mtStartCardioSession=function(...args){
      return promptBeforeStart(()=>previousCardio(...args),!!args[1]);
    };
    window.mtStartCardioSession=mtStartCardioSession;
  }

  function gymForHistoryKey(key){
    return (state.history||[]).find(row=>`${row.title||''}|${row.start_time||''}`===key)?.gym_name||'';
  }

  if(typeof renderHistory==='function'){
    const previousRenderHistory=renderHistory;
    renderHistory=function(){
      const result=previousRenderHistory();
      document.querySelectorAll('#historyList [data-workout]').forEach(button=>{
        const gym=gymForHistoryKey(decodeURIComponent(button.dataset.workout));
        if(!gym)return;
        const sub=button.querySelector('div');
        if(!sub||sub.querySelector('.mt-gym-history'))return;
        const label=document.createElement('small');
        label.className='mt-gym-history';
        label.textContent=`📍 ${gym}`;
        sub.appendChild(label);
      });
      return result;
    };
    window.renderHistory=renderHistory;
  }

  if(typeof openWorkoutDetail==='function'){
    const previousDetail=openWorkoutDetail;
    openWorkoutDetail=function(key){
      const result=previousDetail(key);
      const rows=(state.history||[]).filter(r=>`${r.title||''}|${r.start_time||''}`===key);
      if(!rows.length)return result;
      const first=rows[0];
      const start=new Date(first.start_time);
      const end=new Date(Math.max(...rows.map(r=>Date.parse(r.end_time)||0)));
      const startTime=Number.isFinite(start.getTime())?start.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
      const endTime=Number.isFinite(end.getTime())&&end.getTime()>0?end.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
      const date=Number.isFinite(start.getTime())?start.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'—';
      const mins=Number.isFinite(end.getTime())&&Number.isFinite(start.getTime())?Math.max(0,Math.round((end-start)/60000)):0;
      const duration=mins?` • ${Math.floor(mins/60)?Math.floor(mins/60)+' h ':''}${mins%60} min`:'';
      const gym=first.gym_name||'Salle non renseignée';
      const meta=document.getElementById('sessionDetailMeta');
      if(meta)meta.textContent=`${date} · ${startTime}–${endTime}${duration} · 📍 ${gym}`;
      const body=document.getElementById('sessionDetailBody');
      if(body&&!body.querySelector('.mt-gym-edit-history')){
        const edit=document.createElement('button');
        edit.type='button';edit.className='ghost mt-gym-edit-history';
        edit.textContent='✎ Corriger la salle de cette séance';
        edit.onclick=()=>{
          promptGymSelection(name=>{
            rows.forEach(r=>r.gym_name=name);
            (state.sessions||[]).forEach(summary=>{
              if((summary.title||'')+'|'+(summary.start||'')===key)summary.gym_name=name;
            });
            save();renderHistory();openWorkoutDetail(key);
          },first.gym_name||DEFAULT_GYM);
        };
        body.appendChild(edit);
      }
      return result;
    };
    window.openWorkoutDetail=openWorkoutDetail;
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-gym-choice-card{max-width:420px}
    .mt-gym-options{display:grid;gap:9px;margin-top:16px}
    .mt-gym-option{display:flex;align-items:center;gap:10px;padding:13px;border:1px solid #475569;border-radius:11px;font-size:15px;font-weight:700;cursor:pointer}
    .mt-gym-option:has(input:checked){border-color:#38bdf8;background:rgba(56,189,248,.11)}
    .mt-gym-option input{accent-color:#38bdf8;flex:0 0 auto;width:18px;height:18px}
    .mt-gym-choice-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:9px;margin-top:20px}
    .mt-gym-choice-actions button{min-height:43px}
    .mt-gym-current{display:block;margin-top:7px;margin-bottom:5px;padding:7px 10px;
      font-size:11px;text-align:left;max-width:100%;white-space:normal;color:#93c5fd}
    .mt-gym-modal-card label{display:block;font-weight:800;font-size:12px;margin:12px 0 6px}
    .mt-gym-modal-card input{width:100%}
    .mt-gym-explanation{font-size:12px;line-height:1.45;margin-top:9px}
    .mt-gym-modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
    .mt-gym-modal-actions button{padding:12px 6px;font-size:12px}
    .mt-gym-history{display:block;color:#93c5fd;font-size:11px;margin-top:3px}
    .mt-gym-edit-history{display:block;width:100%;margin-top:15px;padding:11px}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){const result=previousRender();refreshWorkoutBadge();return result;};
    window.renderWorkout=renderWorkout;
  }
  refreshWorkoutBadge();
})();
