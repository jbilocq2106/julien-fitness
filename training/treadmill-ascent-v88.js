/* My Training v88 — dénivelé positif estimé du tapis, bilan de fin et historique.
   D+ fondé sur la distance enregistrée et la pente supposée constante. */
(function(){
  'use strict';

  function treadmill(row){
    return /\btapis\b/i.test(String(row?.exercise_title||row?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
  }
  function numberOrNull(input){
    if(input===null||input===undefined||String(input).trim()==='')return null;
    const value=Number(String(input).trim().replace(',','.'));
    return Number.isFinite(value)?value:null;
  }
  function elevation(row){
    if(!row||!treadmill(row))return null;
    const incline=numberOrNull(row.incline_percent??row.incline);
    if(incline===null||incline<0||incline>35)return null;
    let distance=numberOrNull(row.distance_km??row.distance);
    if(distance===null||distance<=0){
      const speed=numberOrNull(row.speed_kmh??row.speed);
      const seconds=numberOrNull(row.duration_seconds);
      const minutes=seconds===null?numberOrNull(row.duration):seconds/60;
      if(speed===null||speed<=0||minutes===null||minutes<=0)return null;
      distance=speed*minutes/60;
    }
    if(distance<=0||distance>200)return null;
    // Vitesse du tapis = distance de bande sur le plan incliné, d'où sin(arctan(pente)).
    const grade=incline/100;
    return Math.round(distance*1000*grade/Math.sqrt(1+grade*grade));
  }
  function isTreadmillHistory(row){
    return row?.set_type==='cardio'&&treadmill(row);
  }
  function syncElevation(){
    (state.history||[]).forEach(row=>{
      if(!isTreadmillHistory(row))return;
      const gain=elevation(row);
      if(gain===null)delete row.elevation_gain_m;
      else row.elevation_gain_m=gain;
    });
  }
  function formatDistance(row){
    const entered=numberOrNull(row.distance_km);
    if(entered!==null&&entered>0)return entered.toFixed(2).replace('.',',')+' km';
    const speed=numberOrNull(row.speed_kmh),seconds=numberOrNull(row.duration_seconds);
    return speed!==null&&speed>0&&seconds!==null&&seconds>0
      ?(speed*seconds/3600).toFixed(2).replace('.',',')+' km (estimés)':'—';
  }
  function workoutKey(workout){
    try{return `${workout.name||''}|${new Date(workout.started).toISOString()}`;}
    catch(e){return '';}
  }
  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Le calcul est mémorisé en même temps que les performances, notamment
  // après une correction rétroactive de la distance ou de l'inclinaison.
  if(typeof save==='function'){
    const previousSave=save;
    save=function(...args){syncElevation();return previousSave.apply(this,args);};
    window.save=save;
  }

  // Les séances déjà terminées (et corrigées ensuite) affichent toujours un D+
  // à jour : la valeur n'est jamais figée à celle du jour de l'enregistrement.
  if(typeof cardioSummary==='function'){
    const previousSummary=cardioSummary;
    cardioSummary=function(row){
      const base=previousSummary(row);
      const gain=isTreadmillHistory(row)?elevation(row):null;
      return gain===null?base:`${base} • D+ estimé : ${gain} m`;
    };
    window.cardioSummary=cardioSummary;
  }

  function showRecap(key,rows){
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body)return;

    title.textContent='Bilan de ton tapis';
    meta.textContent=rows[0]?.title||'Séance terminée';
    body.innerHTML=`<div class="mt-ascent-recap">
      ${rows.map(row=>{
        const duration=numberOrNull(row.duration_seconds);
        const incline=numberOrNull(row.incline_percent);
        const gain=elevation(row);
        return `<div class="mt-ascent-card">
          <div class="mt-ascent-card-name">${escapeHtml(row.exercise_title||'Tapis')}</div>
          <div class="mt-ascent-big"><span>Dénivelé positif estimé</span><strong>${gain===null?'—':`+${gain} m`}</strong></div>
          <div class="mt-ascent-details">
            <span><b>${escapeHtml(formatDistance(row))}</b> distance</span>
            <span><b>${duration===null?'—':`${Math.round(duration/60)} min`}</b> durée</span>
            <span><b>${incline===null?'—':`${String(incline).replace('.',',')} %`}</b> inclinaison</span>
          </div>
        </div>`;
      }).join('')}
      <p class="mt-ascent-note">Calcul estimatif sur la base de la distance et de l’inclinaison renseignées. Si tu as changé de pente pendant la séance, le dénivelé réel peut être différent.</p>
      <div class="mt-ascent-actions">
        <button type="button" class="ghost" id="mtAscentClose">Fermer</button>
        <button type="button" class="primary" id="mtAscentHistory">Voir et corriger la séance</button>
      </div>
    </div>`;
    body.querySelector('#mtAscentClose').onclick=()=>modal.classList.add('hidden');
    body.querySelector('#mtAscentHistory').onclick=()=>openWorkoutDetail(key);
    modal.classList.remove('hidden');
  }

  // Le contrôle des exercices manquants peut différer la validation : on
  // attend donc la véritable clôture de la séance, pas le premier clic.
  let lastActive=state.activeWorkout?{
    name:state.activeWorkout.name,started:state.activeWorkout.started,
    testMode:!!state.activeWorkout.testMode
  }:null;
  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(...args){
      const w=state.activeWorkout;
      if(w)lastActive={name:w.name,started:w.started,testMode:!!w.testMode};
      return previousRender.apply(this,args);
    };
    window.renderWorkout=renderWorkout;
  }
  if(typeof renderHome==='function'){
    const previousHome=renderHome;
    renderHome=function(...args){
      const result=previousHome.apply(this,args);
      if(!lastActive||state.activeWorkout)return result;
      const finished=lastActive;
      lastActive=null;
      if(finished.testMode)return result;
      const key=workoutKey(finished);
      const rows=(state.history||[]).filter(r=>
        `${r.title||''}|${r.start_time||''}`===key&&isTreadmillHistory(r)
      );
      if(rows.length){
        // La navigation vers l'accueil s'achève avant d'ouvrir le bilan.
        queueMicrotask(()=>showRecap(key,rows));
      }
      return result;
    };
    window.renderHome=renderHome;
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-ascent-recap{display:grid;gap:12px}
    .mt-ascent-card{border:1px solid rgba(34,197,94,.3);border-radius:15px;
      padding:15px;background:rgba(34,197,94,.07)}
    .mt-ascent-card-name{font-size:13px;color:var(--muted);font-weight:800;margin-bottom:8px}
    .mt-ascent-big{display:grid;gap:5px;margin-bottom:12px}
    .mt-ascent-big span{color:var(--muted);font-size:12px;font-weight:700}
    .mt-ascent-big strong{font-size:35px;line-height:1.1;color:#86efac}
    .mt-ascent-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
    .mt-ascent-details span{display:grid;gap:3px;color:var(--muted);font-size:10px}
    .mt-ascent-details b{color:var(--text);font-size:13px}
    .mt-ascent-note{font-size:12px;line-height:1.45;color:var(--muted);margin:0}
    .mt-ascent-actions{display:grid;grid-template-columns:1fr 1.8fr;gap:8px}
    @media(max-width:430px){.mt-ascent-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  window.mtTreadmillElevation=elevation;
})();
