/* My Training — salle par géolocalisation, confirmée et mémorisée localement.
   Aucune coordonnée n'est envoyée à un service externe. */
(function(){
  'use strict';

  const GYMS_KEY='mt_known_gym_locations_v1';
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

  function ensureModal(){
    let modal=document.getElementById('mtGymModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='mtGymModal';modal.className='modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','mtGymModalTitle');
    modal.innerHTML=`
      <div class="modal-card mt-gym-modal-card">
        <div class="section-title">
          <div><div class="eyebrow">LIEU D’ENTRAÎNEMENT</div><h2 id="mtGymModalTitle">Quelle salle ?</h2></div>
          <button type="button" class="ghost" id="mtGymClose">Fermer</button>
        </div>
        <p id="mtGymLocationStatus" class="muted">Tu peux donner un nom à cet endroit.</p>
        <label for="mtGymNameInput">Nom de la salle</label>
        <input id="mtGymNameInput" list="mtGymPreviousNames" maxlength="100"
          placeholder="Ex. Ma salle à Luxembourg" autocomplete="off">
        <datalist id="mtGymPreviousNames"></datalist>
        <p class="muted mt-gym-explanation">Ce nom sera indiqué dans l’historique, avec les heures. Le téléphone pourra reconnaître la même salle par GPS les prochaines fois.</p>
        <div class="mt-gym-modal-actions">
          <button type="button" class="ghost" id="mtGymLocateAgain">📍 Actualiser GPS</button>
          <button type="button" class="primary" id="mtGymStore">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#mtGymClose').onclick=()=>modal.classList.add('hidden');
    modal.onclick=event=>{if(event.target===modal)modal.classList.add('hidden');};
    modal.querySelector('#mtGymLocateAgain').onclick=()=>locate(state.activeWorkout);
    modal.querySelector('#mtGymStore').onclick=storeGym;
    return modal;
  }

  function openGymModal(){
    const workout=state.activeWorkout;
    if(!workout)return;
    const modal=ensureModal();
    modal.querySelector('#mtGymNameInput').value=workout.gymName||'';
    const suggestions=modal.querySelector('#mtGymPreviousNames');
    suggestions.replaceChildren();
    [...new Set(knownGyms.map(g=>g.name))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(name=>{
      const option=document.createElement('option');option.value=name;suggestions.appendChild(option);
    });
    modal.classList.remove('hidden');
    if(currentPositionWorkout===workout.started){
      locationMessage(`Position déjà enregistrée (précision ≈ ${Math.round(currentPosition.accuracy)} m).`);
    }else locate(workout);
    modal.querySelector('#mtGymNameInput').focus();
  }

  function storeGym(){
    const workout=state.activeWorkout;
    if(!workout)return;
    const input=document.getElementById('mtGymNameInput');
    const name=input.value.trim();
    if(!name){alert('Indique un nom pour la salle, ou « Maison » si tu t’entraînes chez toi.');return;}
    workout.gymName=name;
    workout.gymDetection=currentPositionWorkout===workout.started?'gps-confirmed':'manual';
    if(currentPositionWorkout===workout.started&&currentPosition&&currentPosition.accuracy<=350){
      const position=currentPosition;
      const existing=knownGyms.find(g=>g.name.toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr')&&distanceMeters(g,position)<250);
      if(existing){existing.lat=position.lat;existing.lon=position.lon;}
      else knownGyms.push({name,lat:position.lat,lon:position.lon});
      knownGyms=knownGyms.slice(-50);
      try{localStorage.setItem(GYMS_KEY,JSON.stringify(knownGyms));}catch(e){}
    }
    save();
    document.getElementById('mtGymModal')?.classList.add('hidden');
    renderWorkout();
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

  function autoLocateNewWorkout(previousWorkout){
    const workout=state.activeWorkout;
    if(previousWorkout||!workout||workout.testMode)return;
    currentPosition=null;currentPositionWorkout=null;
    locate(workout);
  }

  if(typeof startWorkout==='function'){
    const previousStart=startWorkout;
    startWorkout=function(...args){
      const before=state.activeWorkout;
      const result=previousStart(...args);
      autoLocateNewWorkout(before);
      return result;
    };
    window.startWorkout=startWorkout;
  }
  if(typeof mtStartCardioSession==='function'){
    const previousCardio=mtStartCardioSession;
    mtStartCardioSession=function(...args){
      const before=state.activeWorkout;
      const result=previousCardio(...args);
      autoLocateNewWorkout(before);
      return result;
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
          const name=prompt('Nom de la salle pour cette séance :',first.gym_name||'');
          if(name===null)return;
          rows.forEach(r=>r.gym_name=name.trim());
          save();renderHistory();openWorkoutDetail(key);
        };
        body.appendChild(edit);
      }
      return result;
    };
    window.openWorkoutDetail=openWorkoutDetail;
  }

  const style=document.createElement('style');
  style.textContent=`
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
