/* My Training v57 — exercise preview + estimated/adaptive session duration */
const MT_DURATION_KEY='mytraining_duration_targets_v1';
let mtDurationTargets={};
try{mtDurationTargets=JSON.parse(localStorage.getItem(MT_DURATION_KEY)||'{}')||{};}catch(e){mtDurationTargets={};}

function mtSaveDurationTargets(){
  localStorage.setItem(MT_DURATION_KEY,JSON.stringify(mtDurationTargets));
}

function mtParseNumber(v){
  return Number(String(v??'').replace(',','.'))||0;
}

function mtRangeAverage(text){
  const s=String(text||'').toLowerCase().replace(',','.');
  const range=s.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if(range)return (Number(range[1])+Number(range[2]))/2;
  const one=s.match(/(\d+(?:\.\d+)?)/);
  return one?Number(one[1]):0;
}

function mtCardioMinutes(e){
  const reps=e?.sets?.[0]?.reps||'';
  const s=String(reps).toLowerCase();
  if(s.includes('min'))return mtRangeAverage(s);
  const note=String(e?.note||'').toLowerCase();
  const m=note.match(/(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*min/);
  if(m)return (mtParseNumber(m[1])+mtParseNumber(m[2]))/2;
  const one=note.match(/(\d+(?:[.,]\d+)?)\s*min/);
  return one?mtParseNumber(one[1]):0;
}

function mtSetWorkSeconds(reps){
  const s=String(reps||'').toLowerCase();
  if(s.includes(' s')){
    const sec=mtRangeAverage(s);
    return Math.max(20,sec);
  }
  if(s.includes('côté')||s.includes('cote'))return 50;
  const r=mtRangeAverage(s);
  if(r>0)return Math.min(55,Math.max(30,r*3));
  return 40;
}

function mtEstimateSession(session){
  if(!session?.exercises?.length)return 0;
  let seconds=5*60;
  session.exercises.forEach((e,idx)=>{
    if(isCardioName(e.name)){
      seconds+=mtCardioMinutes(e)*60;
    }else{
      const sets=e.sets||[];
      sets.forEach(s=>seconds+=mtSetWorkSeconds(s.reps));
      seconds+=Math.max(0,sets.length-1)*(Number(e.rest)||60);
      seconds+=75;
    }
    if(idx<session.exercises.length-1)seconds+=30;
  });
  return Math.max(1,Math.round(seconds/60));
}

function mtDurationLabel(minutes){
  minutes=Math.max(0,Math.round(minutes||0));
  const h=Math.floor(minutes/60),m=minutes%60;
  if(!h)return `${m} min`;
  if(!m)return `${h} h`;
  return `${h} h ${String(m).padStart(2,'0')}`;
}

function mtParseUserDuration(value){
  const s=String(value||'').trim().toLowerCase().replace(',', '.');
  if(!s)return null;
  if(/^(0|auto|complet|normal|reset)$/.test(s))return 0;
  const hs=[...s.matchAll(/(\d+)\s*h(?:\s*(\d{1,2}))?/g)];
  if(hs.length){
    const m=hs[hs.length-1];
    return Number(m[1])*60+Number(m[2]||0);
  }
  const mins=[...s.matchAll(/(\d+)\s*(?:min|minutes?)/g)];
  if(mins.length)return Number(mins[mins.length-1][1]);
  const nums=s.match(/\d+/g);
  if(nums?.length)return Number(nums[nums.length-1]);
  return null;
}

function mtPriority(sessionId,name){
  const n=normText(name);
  if(isCardioName(name))return 2;
  if(n.includes('triceps')||n.includes('curl')||n.includes('vacuum')||
     n.includes('pallof')||n.includes('dead bug')||n.includes('planche')||
     n.includes('crunch'))return 3;
  if(sessionId==='S1'&&(n.includes('chest press')||n.includes('developpe incline')))return 3;
  if(sessionId==='S2'&&(n.includes('tirage vertical')||n.includes('rowing haltere')||
     n.includes('rowing poulie')||n.includes('elevations laterales')))return 3;
  if(sessionId==='S3'&&(n.includes('presse a cuisses')||n.includes('leg curl')||
     n.includes('chest press')))return 3;
  if(sessionId==='S4'&&(n.includes('presse a cuisses')||n.includes('chest press')||
     n.includes('tirage vertical')))return 3;
  if(n.includes('face pull')||n.includes('mollets')||n.includes('leg extension')||
     n.includes('pec fly')||n.includes('ecartes poulie')||n.includes('releves de genoux'))return 1;
  return 2;
}

function mtAdaptSession(session,targetMinutes){
  const s=JSON.parse(JSON.stringify(session));
  const original=mtEstimateSession(s);
  const changes={setsRemoved:0,exercisesRemoved:0,cardioMinutesRemoved:0};
  if(!targetMinutes||targetMinutes>=original-2){
    return {session:s,original,estimate:original,changes};
  }
  const over=()=>mtEstimateSession(s)>targetMinutes+2;
  [1,2].forEach(priority=>{
    let guard=0;
    while(over()&&guard++<30){
      const candidates=s.exercises
        .map((e,i)=>({e,i,p:mtPriority(s.id,e.name)}))
        .filter(x=>!isCardioName(x.e.name)&&x.p===priority&&(x.e.sets?.length||0)>2)
        .sort((a,b)=>(b.e.sets.length-a.e.sets.length)||b.i-a.i);
      if(!candidates.length)break;
      candidates[0].e.sets.pop();
      changes.setsRemoved++;
    }
  });
  [1].forEach(priority=>{
    let guard=0;
    while(over()&&guard++<12&&s.exercises.length>6){
      const idx=s.exercises
        .map((e,i)=>({e,i,p:mtPriority(s.id,e.name)}))
        .filter(x=>!isCardioName(x.e.name)&&x.p===priority)
        .sort((a,b)=>b.i-a.i)[0]?.i;
      if(idx==null)break;
      s.exercises.splice(idx,1);
      changes.exercisesRemoved++;
    }
  });
  if(over()){
    const cardio=s.exercises.find(e=>isCardioName(e.name));
    if(cardio){
      const current=mtCardioMinutes(cardio);
      const minCardio=s.id==='S3'?10:15;
      const need=Math.max(0,mtEstimateSession(s)-targetMinutes);
      const next=Math.max(minCardio,Math.round(current-need));
      if(next<current){
        changes.cardioMinutesRemoved+=Math.round(current-next);
        if(cardio.sets?.[0])cardio.sets[0].reps=`${next} min`;
        cardio.note=String(cardio.note||'').replace(/\d+\s*[–-]\s*\d+\s*min/i,`${next} min`);
      }
    }
  }
  if(over()){
    let guard=0;
    while(over()&&guard++<10&&s.exercises.length>6){
      const idx=s.exercises
        .map((e,i)=>({e,i,p:mtPriority(s.id,e.name)}))
        .filter(x=>!isCardioName(x.e.name)&&x.p===2)
        .sort((a,b)=>b.i-a.i)[0]?.i;
      if(idx==null)break;
      s.exercises.splice(idx,1);
      changes.exercisesRemoved++;
    }
  }
  if(over()){
    let guard=0;
    while(over()&&guard++<20){
      const c=s.exercises.find(e=>!isCardioName(e.name)&&(e.sets?.length||0)>2);
      if(!c)break;
      c.sets.pop();
      changes.setsRemoved++;
    }
  }
  return {session:s,original,estimate:mtEstimateSession(s),changes};
}

function mtChangesText(result){
  const c=result.changes,parts=[];
  if(c.exercisesRemoved)parts.push(`−${c.exercisesRemoved} exo${c.exercisesRemoved>1?'s':''}`);
  if(c.setsRemoved)parts.push(`−${c.setsRemoved} série${c.setsRemoved>1?'s':''}`);
  if(c.cardioMinutesRemoved)parts.push(`−${c.cardioMinutesRemoved} min cardio`);
  return parts.join(' • ')||'programme complet';
}

function mtSetDurationTarget(id){
  const s=getSession(id);
  if(!s)return;
  const base=mtEstimateSession(s);
  const current=mtDurationTargets[id]||'';
  const input=prompt(
    `Durée cible pour ${s.name}\nDurée estimée actuelle : ${mtDurationLabel(base)}\n\n`+
    `Écris par exemple : 90, 1h30 ou « réduis à 1h30 ».\n`+
    `Écris 0 pour revenir au programme complet.`,
    current?mtDurationLabel(current):''
  );
  if(input===null)return;
  const target=mtParseUserDuration(input);
  if(target===null||Number.isNaN(target)){
    alert('Je n’ai pas compris la durée. Exemple : 1h30 ou 90 min.');
    return;
  }
  if(target===0){
    delete mtDurationTargets[id];
    mtSaveDurationTargets();
    renderProgram();
    return;
  }
  if(target<45){
    alert('Pour garder une séance cohérente, choisis au moins 45 minutes.');
    return;
  }
  mtDurationTargets[id]=target;
  mtSaveDurationTargets();
  renderProgram();
}
window.mtSetDurationTarget=mtSetDurationTarget;

function mtOpenExerciseDemo(encodedName){
  const name=decodeURIComponent(encodedName);
  const g=exerciseGuide(name);
  const recent=recentExercisePerformance(name);
  const title=document.getElementById('sessionDetailTitle');
  const meta=document.getElementById('sessionDetailMeta');
  const body=document.getElementById('sessionDetailBody');
  if(!title||!meta||!body)return;
  title.textContent=name;
  meta.textContent=g.muscles;
  const recentText=recent?(recent.weight?`${recent.weight} kg × ${recent.reps}`:`${recent.reps} reps`):'Pas encore de donnée';
  body.innerHTML=`
    <div class="exercise-demo-modal">
      <div class="demo-name">Exercice : <strong>${esc(name)}</strong></div>
      <div class="demo-recent"><span>Dernière perf.</span><strong>${esc(recentText)}</strong></div>
      <div class="demo-cue">✓ ${esc(g.cues[0])}</div>
      <div class="demo-cue">✓ ${esc(g.cues[1])}</div>
      <div class="demo-avoid">À éviter : ${esc(g.avoid)}</div>
      <a class="video-demo demo-big" href="${videoUrlForExercise(name)}" target="_blank" rel="noopener">
        <span class="video-play">▶</span>
        <span><strong>Voir une démonstration vidéo</strong><small>${esc(name)}</small></span>
      </a>
    </div>`;
  document.getElementById('sessionModal').classList.remove('hidden');
}
window.mtOpenExerciseDemo=mtOpenExerciseDemo;

const mtOriginalRenderProgram=renderProgram;
renderProgram=function(){
  if(!state.program)return;
  document.getElementById('programCards').innerHTML=state.program.sessions.map(baseSession=>{
    const target=mtDurationTargets[baseSession.id];
    const result=target?mtAdaptSession(baseSession,target):{
      session:baseSession,
      original:mtEstimateSession(baseSession),
      estimate:mtEstimateSession(baseSession),
      changes:{setsRemoved:0,exercisesRemoved:0,cardioMinutesRemoved:0}
    };
    const s=result.session;
    const adapted=!!target&&result.estimate<result.original;
    return `<div class="card session-card">
      <div class="section-title">
        <div>
          <h3>${esc(baseSession.name)}</h3>
          <div class="muted">${esc(baseSession.focus)}</div>
          ${baseSession.day_hint?`<div class="day-chip">${esc(baseSession.day_hint)}</div>`:''}
        </div>
        <div class="session-actions">
          <button class="ghost test-start" onclick="startWorkout('${baseSession.id}',true)">Tester</button>
          <button class="primary" onclick="startWorkout('${baseSession.id}',false)">Démarrer</button>
        </div>
      </div>

      <div class="duration-panel">
        <div>
          <div class="duration-label">⏱ Durée estimée <strong>≈ ${mtDurationLabel(result.estimate)}</strong></div>
          ${adapted?`<div class="duration-adapted">Programme complet ≈ ${mtDurationLabel(result.original)} • ${mtChangesText(result)}</div>`:
            `<div class="duration-adapted">Estimation avec temps de repos, changements de poste et cardio.</div>`}
        </div>
        <button class="ghost duration-edit" onclick="mtSetDurationTarget('${baseSession.id}')">${target?'Modifier':'Adapter'}</button>
      </div>

      ${s.exercises.map(e=>{
        const g=exerciseGuide(e.name);
        const targetText=e.sets?.map(x=>x.weight?`${x.weight}×${x.reps}`:x.reps).join(' / ')||'';
        return `<div class="exercise-row program-exercise-row">
          <button class="video-mini program-demo-btn" type="button"
            onclick="mtOpenExerciseDemo('${encodeURIComponent(e.name)}')"
            aria-label="Voir la démonstration de ${esc(e.name)}">▶</button>
          <div class="program-exercise-main">
            <span>${esc(e.name)}</span>
            <small>${esc(g.muscles)}</small>
            <small class="target-line">${esc(targetText)}</small>
          </div>
          <div class="program-row-badges">
            ${e.superset?`<span class="ss-chip">SS ${esc(e.superset)}</span>`:''}
            <span class="badge">${e.rest?e.rest+'s':'—'}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
};
window.renderProgram=renderProgram;

const mtOriginalStartWorkout=startWorkout;
startWorkout=function(id,testMode=false){
  const target=mtDurationTargets[id];
  if(!target)return mtOriginalStartWorkout(id,testMode);
  const idx=state.program?.sessions?.findIndex(s=>s.id===id);
  if(idx==null||idx<0)return mtOriginalStartWorkout(id,testMode);
  const original=state.program.sessions[idx];
  const adapted=mtAdaptSession(original,target).session;
  state.program.sessions[idx]=adapted;
  try{
    return mtOriginalStartWorkout(id,testMode);
  }finally{
    state.program.sessions[idx]=original;
  }
};
window.startWorkout=startWorkout;

if(state.program)renderProgram();
