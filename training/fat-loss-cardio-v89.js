/* My Training v89 — cardio modéré, progressif et compatible avec la récupération.
   Objectif : volume régulier et soutenable, sans prétendre à une « zone brûle-graisse » magique. */
(function(){
  'use strict';

  const TARGET_MINUTES=150;
  const COMFORTABLE_RANGE_TOP=210;
  const PRESETS={
    C1:{name:'Cardio 1 — Endurance modérée',duration:'40 min',durationValue:'40',
      speed:'4,8–5,4 km/h',speedValue:'5.1',incline:'2–4 %',inclineValue:'3',
      intensity:'Modérée • RPE 4–5/10',
      targetHr:'Test de la parole : tu peux parler en phrases complètes',
      structure:'5 min faciles • 30 min régulières • 5 min de retour au calme'},
    C2:{name:'Cardio 2 — Marche soutenue',duration:'45 min',durationValue:'45',
      speed:'4,8–5,4 km/h',speedValue:'5.2',incline:'3–5 %',inclineValue:'4',
      intensity:'Modérée soutenue • RPE 5–6/10',
      targetHr:'Souffle accéléré, conversation encore possible',
      structure:'5 min faciles • 35 min d’effort régulier • 5 min faciles'},
    C3:{name:'Cardio 3 — Variations douces de pente',duration:'36 min',durationValue:'36',
      speed:'4,8–5,3 km/h',speedValue:'5.1',incline:'1–5 %',inclineValue:'3',
      intensity:'Modérée, sans sprint • RPE 4–6/10',
      targetHr:'La respiration doit rester contrôlable ; pas de travail à bloc',
      structure:'6 min faciles • 8 × (90 s à 4–5 % / 90 s à 1–2 %) • 6 min faciles'},
    C4:{name:'Cardio 4 — Marche longue facile',duration:'50 min',durationValue:'50',
      speed:'4,6–5,3 km/h',speedValue:'5.0',incline:'1–3 %',inclineValue:'2',
      intensity:'Facile à modérée • RPE 4–5/10',
      targetHr:'Test de la parole : conversation confortable',
      structure:'5 min faciles • 40 min régulières • 5 min de retour au calme'}
  };

  function applyCardioPresets(){
    if(typeof MT_CARDIO_SESSIONS==='undefined')return;
    MT_CARDIO_SESSIONS.forEach(session=>{
      if(PRESETS[session.id])Object.assign(session,PRESETS[session.id]);
    });
  }

  function minutesThisWeek(){
    const now=new Date();
    const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
    const seen=new Set();
    let total=0;
    (state.history||[]).forEach(row=>{
      if(!/\btapis\b/i.test(String(row.exercise_title||'')))return;
      if(row.set_type!=='cardio'&&!(Number(row.distance_km)>0))return;
      const started=new Date(row.start_time);
      if(!Number.isFinite(started.getTime())||started<monday||started>now)return;
      const key=`${row.start_time}|${row.exercise_order??row.exercise_title}|${row.set_index??0}`;
      if(seen.has(key))return;
      seen.add(key);
      const seconds=Number(row.duration_seconds);
      if(Number.isFinite(seconds)&&seconds>0&&seconds<24*3600)total+=seconds/60;
    });
    return Math.round(total);
  }

  function weeklyGuidance(){
    const done=minutesThisWeek();
    const remaining=Math.max(0,TARGET_MINUTES-done);
    const title=`${done} min de tapis enregistrées cette semaine`;
    const advice=remaining>0
      ?`Repère progressif : encore environ ${remaining} min pour atteindre 150 min, en comptant le tapis après la musculation. Ajoute 1 à 2 séances cardio dédiées si ta récupération le permet.`
      :`Repère de 150 min atteint. Une séance supplémentaire est facultative : priorité à la récupération et à la régularité.`;
    return {title,advice};
  }

  function decorateProgram(){
    const host=document.getElementById('mtCardioProgram');
    if(!host)return;
    let panel=host.querySelector('.mt-fatloss-week');
    if(!panel){
      panel=document.createElement('div');
      panel.className='mt-fatloss-week';
      const section=host.querySelector('.section-title');
      if(section)section.insertAdjacentElement('afterend',panel);
      else host.prepend(panel);
    }
    const guidance=weeklyGuidance();
    panel.innerHTML=`<strong>🎯 ${guidance.title}</strong>
      <span>${guidance.advice}</span>
      <small>Fourchette de progression : ${TARGET_MINUTES}–${COMFORTABLE_RANGE_TOP} min/semaine de cardio modéré, selon ton niveau et ta récupération. Les autres activités ne sont pas comptées ici.</small>
      <small>Pour perdre de la graisse, régularité + alimentation adaptée priment sur une pente très forte.</small>`;
  }

  function decorateWorkout(){
    if(!state.activeWorkout)return;
    document.querySelectorAll('#exerciseList .cardio-grid').forEach(grid=>{
      const index=Number(grid.dataset.e);
      const exercise=state.activeWorkout.exercises?.[index];
      if(!exercise?.cardio||!/\btapis\b/i.test(String(exercise.name||'')))return;
      const card=grid.closest('.exercise');
      if(card?.querySelector('.mt-fatloss-workout-tip'))return;
      const info=document.createElement('div');
      info.className='mt-fatloss-workout-tip';
      info.innerHTML=`<strong>Objectif perte de graisse : effort modéré et régulier</strong>
        <span>RPE 4–6/10 : tu respires plus vite, mais tu peux encore parler en phrases. Ajuste surtout la vitesse pour y rester.</span>
        <span>Si tes mollets sont sensibles : pente 0–2 %, vitesse plus douce. Si la douleur persiste ou augmente, arrête le tapis.</span>`;
      const done=card?.querySelector(`[data-cardio-done="${index}"]`);
      if(done)done.insertAdjacentElement('beforebegin',info);
      else grid.insertAdjacentElement('afterend',info);
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-fatloss-week{margin:8px 0 16px;padding:12px 13px;border-radius:13px;
      background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);display:grid;gap:7px}
    .mt-fatloss-week strong{color:#bbf7d0;font-size:13px}
    .mt-fatloss-week span{color:var(--text);font-size:12px;line-height:1.45}
    .mt-fatloss-week small{color:var(--muted);font-size:11px;line-height:1.4}
    .mt-fatloss-workout-tip{display:grid;gap:5px;margin:9px 0 12px;padding:10px 12px;
      border-radius:11px;border:1px solid rgba(59,130,246,.25);background:rgba(59,130,246,.08)}
    .mt-fatloss-workout-tip strong{color:#bfdbfe;font-size:12px}
    .mt-fatloss-workout-tip span{color:var(--muted);font-size:11px;line-height:1.45}
  `;
  document.head.appendChild(style);

  applyCardioPresets();
  if(typeof renderProgram==='function'){
    const previousRenderProgram=renderProgram;
    renderProgram=function(...args){
      const result=previousRenderProgram.apply(this,args);
      decorateProgram();
      return result;
    };
    window.renderProgram=renderProgram;
  }
  if(typeof renderWorkout==='function'){
    const previousRenderWorkout=renderWorkout;
    renderWorkout=function(...args){
      const result=previousRenderWorkout.apply(this,args);
      decorateWorkout();
      return result;
    };
    window.renderWorkout=renderWorkout;
  }
  if(state.program)renderProgram();
  decorateWorkout();
})();
