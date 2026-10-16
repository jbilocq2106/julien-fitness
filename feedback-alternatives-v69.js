/* My Training v70 — end-of-session alternatives become future preferences */
(function(){
  const PREF_KEY='mt_exercise_replacements_v70';

  function norm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function keyFor(name){return norm(name).replace(/[^a-z0-9]+/g,' ').trim();}
  function loadPrefs(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{};}catch(e){return {};}}
  function savePrefs(data){try{localStorage.setItem(PREF_KEY,JSON.stringify(data||{}));}catch(e){}}

  function isBodyweightName(name){
    const n=norm(name);
    return ['planche','hollow','pompe','sit-up','crunch au sol','sissy squat','nordic','bird dog','releve de jambes','releves de jambes','releve de genoux','releves de genoux'].some(k=>n.includes(k));
  }

  function programSetsFor(altName,originalSets){
    const n=norm(altName);
    if(n.includes('planche rkc')||n.includes('hollow hold'))return Array.from({length:3},()=>({reps:'20–30 s',weight:0}));
    if(n.includes('pallof press'))return Array.from({length:3},()=>({reps:'10–12/côté',weight:null}));
    const bodyweight=isBodyweightName(altName);
    const source=Array.isArray(originalSets)&&originalSets.length?originalSets:[{reps:'10–12',weight:null},{reps:'10–12',weight:null},{reps:'10–12',weight:null}];
    return source.map(s=>({reps:s.reps||'10–12',weight:bodyweight?0:null}));
  }

  function activeSetsFor(altName,sourceSets){
    const n=norm(altName);
    let specs;
    if(n.includes('planche rkc')||n.includes('hollow hold'))specs=Array.from({length:3},()=>({reps:'20–30 s',weight:0}));
    else if(n.includes('pallof press'))specs=Array.from({length:3},()=>({reps:'10–12/côté',weight:null}));
    else {
      const bodyweight=isBodyweightName(altName);
      const src=Array.isArray(sourceSets)&&sourceSets.length?sourceSets:[{targetReps:'10–12'},{targetReps:'10–12'},{targetReps:'10–12'}];
      specs=src.map(s=>({reps:s.targetReps||'10–12',weight:bodyweight?0:null}));
    }
    return specs.map((s,i)=>({i:i+1,targetReps:s.reps,targetWeight:s.weight,weight:s.weight??'',reps:'',rir:'',done:false}));
  }

  function savePreference(originalName,altName){
    if(!originalName||!altName)return;
    const prefs=loadPrefs();
    prefs[keyFor(originalName)]={originalName,alternative:altName,updatedAt:new Date().toISOString()};
    savePrefs(prefs);
  }

  function replaceProgramExercise(e,preference){
    if(!e||!preference?.alternative)return;
    const originalName=preference.originalName||e.name;
    const altName=preference.alternative;
    e.name=altName;
    e.note=`Alternative préférée à « ${originalName} »`;
    e.autoTarget=null;
    e.sets=programSetsFor(altName,e.sets);
    if(norm(altName).includes('planche rkc')||norm(altName).includes('hollow hold')||norm(altName).includes('pallof press'))e.rest=45;
  }

  function applyPreferencesToProgram(){
    const prefs=loadPrefs();
    const sessions=state.program?.sessions||[];
    sessions.forEach(s=>{
      (s.exercises||[]).forEach(e=>{
        const p=prefs[keyFor(e.name)];
        if(p)replaceProgramExercise(e,p);
      });
    });
  }

  function replaceActiveExercise(e,preference){
    if(!e||!preference?.alternative)return;
    const originalName=preference.originalName||e.name;
    const altName=preference.alternative;
    e.name=altName;
    e.note=`Alternative préférée à « ${originalName} »`;
    e.autoTarget=null;
    e.cardio=null;
    e.skipped=false;
    e.skippedAt=null;
    e.skippedReason=null;
    e.skippedSets=[];
    e.sets=activeSetsFor(altName,e.sets);
    if(norm(altName).includes('planche rkc')||norm(altName).includes('hollow hold')||norm(altName).includes('pallof press'))e.rest=45;
  }

  function applyPreferencesToFreshWorkout(){
    const w=state.activeWorkout;
    if(!w)return;
    const prefs=loadPrefs();
    let changed=false;
    (w.exercises||[]).forEach(e=>{
      const p=prefs[keyFor(e.name)];
      if(!p)return;
      replaceActiveExercise(e,p);
      changed=true;
    });
    if(changed){save();renderWorkout();}
  }

  function rebuildOriginalActive(originalName,current){
    const w=state.activeWorkout;
    const source=state.program?.sessions?.find(s=>s.id===w?.id)?.exercises?.find(e=>norm(e.name)===norm(originalName));
    if(source){
      return {
        name:source.name,
        note:source.note||'',
        rest:source.rest||0,
        superset:source.superset||null,
        autoTarget:source.autoTarget||null,
        cardio:typeof isCardioName==='function'&&isCardioName(source.name)?parseCardioDefaults(source):null,
        sets:(source.sets||[]).map((x,i)=>({i:i+1,targetReps:x.reps,targetWeight:x.weight,weight:x.weight??'',reps:'',rir:'',done:false})),
        skipped:true,
        skippedAt:new Date().toISOString(),
        skippedReason:'preferred-alternative-next-session',
        skippedSets:(source.sets||[]).map((_,i)=>i)
      };
    }
    return {
      ...current,
      name:originalName,
      note:'Exercice volontairement non fait — alternative mémorisée pour la prochaine fois',
      skipped:true,
      skippedAt:new Date().toISOString(),
      skippedReason:'preferred-alternative-next-session',
      skippedSets:(current.sets||[]).map((_,i)=>i)
    };
  }

  function recoverOldImmediateReplacement(){
    const w=state.activeWorkout;
    if(!w)return false;
    let changed=false;
    w.exercises=(w.exercises||[]).map(e=>{
      const m=String(e.note||'').match(/Alternative choisie en fin de séance à la place de «([^»]+)»/i);
      if(!m)return e;
      const hasCompleted=(e.sets||[]).some(s=>s.done)||!!e.cardio?.done;
      if(hasCompleted)return e;
      const originalName=m[1].trim();
      savePreference(originalName,e.name);
      changed=true;
      return rebuildOriginalActive(originalName,e);
    });
    if(changed)save();
    return changed;
  }

  function wireAlternatives(){
    const body=document.getElementById('sessionDetailBody');
    if(!body)return;
    const prefs=loadPrefs();

    body.querySelectorAll('.mt-alt-card').forEach(card=>{
      const originalName=card.querySelector(':scope > strong')?.textContent?.trim()||'';
      if(!originalName)return;
      const list=card.querySelector('.mt-alt-list');
      if(!list)return;
      const selected=prefs[keyFor(originalName)]?.alternative||'';

      [...list.children].forEach(node=>{
        if(node.matches?.('button[data-mt-feedback-alt]')){
          node.classList.toggle('selected',norm(node.textContent)===norm(selected));
          return;
        }
        const altName=node.textContent?.trim();
        if(!altName)return;
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='mt-feedback-alt-choice';
        btn.dataset.mtFeedbackAlt='1';
        btn.textContent=altName;
        btn.classList.toggle('selected',norm(altName)===norm(selected));
        btn.onclick=()=>{
          savePreference(originalName,altName);
          applyPreferencesToProgram();
          list.querySelectorAll('[data-mt-feedback-alt]').forEach(b=>b.classList.toggle('selected',b===btn));
          const help=card.querySelector('.mt-feedback-alt-help');
          if(help)help.textContent=`✓ ${altName} sera proposé à la place lors de la prochaine séance.`;
        };
        node.replaceWith(btn);
      });

      if(!card.querySelector('.mt-feedback-alt-help')){
        const help=document.createElement('small');
        help.className='mt-feedback-alt-help';
        help.textContent=selected?`✓ ${selected} sera proposé à la place lors de la prochaine séance.`:'Choisis l’alternative à utiliser la prochaine fois. Elle ne sera pas ajoutée à la séance que tu viens de finir.';
        card.insertBefore(help,list);
      }
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-feedback-alt-help{display:block;margin:0 0 8px;color:var(--muted);font-size:11px;line-height:1.4}
    .mt-feedback-alt-choice{width:100%;text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(59,130,246,.36);background:#0e1727;color:var(--text);font-size:13px;font-weight:800}
    .mt-feedback-alt-choice.selected{border-color:var(--accent,#22c55e);box-shadow:0 0 0 1px var(--accent,#22c55e);background:rgba(34,197,94,.10)}
    .mt-feedback-alt-choice:active{transform:scale(.99)}
    .mt-skipped-future-badge{display:inline-block;margin:6px 0 0;padding:4px 7px;border-radius:999px;background:rgba(59,130,246,.14);color:#93c5fd;font-size:10px;font-weight:800}
  `;
  document.head.appendChild(style);

  const recovered=recoverOldImmediateReplacement();
  applyPreferencesToProgram();
  if(recovered){try{renderWorkout();}catch(e){}}

  if(typeof renderProgram==='function'){
    const previousRenderProgram=renderProgram;
    renderProgram=function(){applyPreferencesToProgram();return previousRenderProgram();};
    window.renderProgram=renderProgram;
  }

  if(typeof startWorkout==='function'){
    const previousStartWorkout=startWorkout;
    startWorkout=function(id,testMode=false){
      const hadActive=!!state.activeWorkout;
      const result=previousStartWorkout(id,testMode);
      if(!hadActive&&state.activeWorkout)applyPreferencesToFreshWorkout();
      return result;
    };
    window.startWorkout=startWorkout;
  }

  if(typeof renderWorkout==='function'){
    const previousRenderWorkout=renderWorkout;
    renderWorkout=function(){
      previousRenderWorkout();
      const w=state.activeWorkout;
      if(!w)return;
      document.querySelectorAll('#exerciseList .exercise').forEach((card,index)=>{
        const e=w.exercises?.[index];
        if(!e?.skipped||e.skippedReason!=='preferred-alternative-next-session')return;
        if(card.querySelector('.mt-skipped-future-badge'))return;
        const badge=document.createElement('div');
        badge.className='mt-skipped-future-badge';
        badge.textContent='Zappé aujourd’hui · alternative mémorisée pour la prochaine fois';
        card.querySelector('.exercise-title-main')?.appendChild(badge);
      });
    };
    window.renderWorkout=renderWorkout;
  }

  const body=document.getElementById('sessionDetailBody');
  if(body){
    let queued=false;
    const obs=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;wireAlternatives();});
    });
    obs.observe(body,{childList:true,subtree:true});
  }

  wireAlternatives();
})();
