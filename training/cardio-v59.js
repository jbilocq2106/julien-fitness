/* My Training v67 — dedicated treadmill cardio sessions optimized for fat loss */
const MT_CARDIO_SESSIONS=[
  {
    id:'C1',
    name:'Cardio 1 — Endurance inclinée',
    duration:'40 min',
    durationValue:'40',
    speed:'5,2–5,5 km/h',
    speedValue:'5.35',
    incline:'8–10 %',
    inclineValue:'9',
    intensity:'Modérée • RPE 4–5/10',
    targetHr:'FC cible : ~65–72 % de ta FC max',
    structure:'5 min échauffement • 30 min bloc régulier • 5 min retour au calme'
  },
  {
    id:'C2',
    name:'Cardio 2 — Tempo incliné',
    duration:'45 min',
    durationValue:'45',
    speed:'5,0–5,4 km/h',
    speedValue:'5.2',
    incline:'10–12 %',
    inclineValue:'11',
    intensity:'Modérée soutenue • RPE 5–6/10',
    targetHr:'FC cible : ~70–78 % de ta FC max',
    structure:'5 min échauffement • 35 min bloc principal • 5 min retour au calme'
  },
  {
    id:'C3',
    name:'Cardio 3 — Intervalles inclinaison',
    duration:'36 min',
    durationValue:'36',
    speed:'5,0–5,8 km/h',
    speedValue:'5.3',
    incline:'6–15 %',
    inclineValue:'8',
    intensity:'Intervalles • RPE 7–8/10 sur les blocs',
    targetHr:'FC : pics ~80–90 % max • moyenne souvent ~70–80 %',
    structure:'6 min échauffement • 8 × (90 s à 12–15 % / 90 s à 6–8 %) • 6 min retour au calme'
  },
  {
    id:'C4',
    name:'Cardio 4 — Endurance longue',
    duration:'50 min',
    durationValue:'50',
    speed:'5,0–5,4 km/h',
    speedValue:'5.2',
    incline:'7–9 %',
    inclineValue:'8',
    intensity:'Facile à modérée • RPE 4–5/10',
    targetHr:'FC cible : ~65–72 % de ta FC max',
    structure:'5 min échauffement • 40 min continu • 5 min retour au calme'
  }
];

function mtCardioSessionById(id){
  return MT_CARDIO_SESSIONS.find(s=>s.id===id)||null;
}

function mtStartCardioSession(id,testMode=false){
  const c=mtCardioSessionById(id);
  if(!c)return;
  if(state.activeWorkout){
    alert('Une séance est déjà en cours. Termine-la ou annule-la avant d’en démarrer une autre.');
    return;
  }

  // Anchor the workout to the strength session immediately before the current
  // next session. The existing finish logic then returns to the same strength
  // nextSessionId, so cardio never advances or resets the strength rotation.
  const strengthIds=(state.program?.sessions||[]).map(s=>s.id);
  const currentIdx=Math.max(0,strengthIds.indexOf(state.nextSessionId));
  const anchorId=strengthIds.length
    ? strengthIds[(currentIdx-1+strengthIds.length)%strengthIds.length]
    : 'S4';

  const note=`${c.speed} • ${c.incline} • ${c.intensity} • ${c.targetHr} • ${c.structure}`;
  state.activeWorkout={
    id:anchorId,
    cardioSessionId:c.id,
    name:c.name,
    started:Date.now(),
    testMode:!!testMode,
    supersetEnabled:{},
    exercises:[{
      name:'Tapis incliné',
      note,
      rest:0,
      superset:null,
      autoTarget:null,
      cardio:{
        incline:c.inclineValue,
        speed:c.speedValue,
        duration:c.durationValue,
        distance:'',
        avgHr:'',
        done:false
      },
      sets:[]
    }]
  };
  save();
  renderWorkout();
  showView('workoutView');
  startWorkoutClock();
}
window.mtStartCardioSession=mtStartCardioSession;

function mtRenderCardioProgram(){
  const host=document.getElementById('programCards');
  if(!host||document.getElementById('mtCardioProgram'))return;
  const section=document.createElement('div');
  section.id='mtCardioProgram';
  section.innerHTML=`
    <div class="section-title" style="margin-top:22px"><h2>Cardio — Tapis incliné</h2></div>
    ${MT_CARDIO_SESSIONS.map(c=>`
      <div class="card session-card">
        <div class="section-title">
          <div>
            <h3>${esc(c.name)}</h3>
            <div class="muted">${esc(c.intensity)}</div>
          </div>
          <div class="session-actions">
            <button class="ghost" onclick="mtStartCardioSession('${c.id}',true)">Tester</button>
            <button class="primary" onclick="mtStartCardioSession('${c.id}',false)">Démarrer</button>
          </div>
        </div>
        <div class="duration-panel">
          <div>
            <div class="duration-label">⏱ Durée <strong>${esc(c.duration)}</strong></div>
            <div class="duration-adapted">${esc(c.structure)}</div>
            <div class="duration-adapted">${esc(c.targetHr)}</div>
          </div>
        </div>
        <div class="exercise-row program-exercise-row">
          <div class="program-exercise-main">
            <span>Tapis incliné</span>
            <small>Vitesse : ${esc(c.speed)}</small>
            <small class="target-line">Inclinaison : ${esc(c.incline)} • ${esc(c.intensity)}</small>
          </div>
        </div>
      </div>`).join('')}`;
  host.appendChild(section);
}

const mtV59RenderProgram=renderProgram;
renderProgram=function(){
  mtV59RenderProgram();
  mtRenderCardioProgram();
};
window.renderProgram=renderProgram;

if(state.program)renderProgram();
