/* My Training — qualité des séries, progression prudente et ordre de séance conseillé.
   L'ordre n'est établi que dans le programme, jamais dans une séance déjà ouverte. */
(function(){
  'use strict';

  function norm(value){return normText(value);}
  function isCardio(e){return !!e?.cardio||/\b(tapis|velo|rameur|elliptique)\b/.test(norm(e?.name));}

  function category(e){
    const n=norm(e?.name);
    if(isCardio(e))return {stage:4,region:'cardio'};
    if(/pallof|crunch|abdomin|releve de genoux|gainage|planche|dead bug|vacuum|hollow|rotation du tronc/.test(n))return {stage:3,region:'core'};
    if(/triceps|\bcurl\b(?!\s*(assis|allonge|debout))|avant.bras|poignet/.test(n))return {stage:2,region:'arms'};
    const lower=/presse a cuisses|leg curl|leg extension|mollet|ischio|quadriceps|fessier|hip thrust|abduction des hanches|pont fessier/.test(n);
    const push=/chest press|pec fly|pector|ecarte|developpe incline|developpe couche|pompe/.test(n);
    const pull=/rowing|tirage|face pull|oiseau/.test(n);
    const shoulders=/epaule|elevation laterale|deltoide/.test(n);
    const isolation=/leg curl|leg extension|mollet|pec fly|ecarte|elevation|face pull|oiseau|abduction/.test(n);
    return {stage:isolation?1:0,region:lower?'lower':push?'push':pull?'pull':shoulders?'shoulders':'other'};
  }

  function orderedExercises(exercises){
    if(!Array.isArray(exercises)||exercises.length<2)return exercises;
    // L'ordre de coach explicite par séance prime sur le tri générique.
    if(exercises.every(e=>Number.isFinite(Number(e.coachOrder))))return [...exercises].sort((a,b)=>Number(a.coachOrder)-Number(b.coachOrder));
    const used=new Set();
    const blocks=[];
    exercises.forEach((exercise,index)=>{
      if(used.has(index))return;
      const members=exercise.superset
        ?exercises.map((e,i)=>e.superset===exercise.superset?i:-1).filter(i=>i>=0&&!used.has(i))
        :[index];
      members.forEach(i=>used.add(i));
      const items=members.map(i=>exercises[i]);
      const cats=items.map(category);
      const region=cats.every(c=>c.region===cats[0].region)?cats[0].region:'mixed';
      blocks.push({items,stage:Math.max(...cats.map(c=>c.stage)),region,index});
    });

    const effort=blocks.filter(b=>b.stage<3);
    const core=blocks.filter(b=>b.stage===3);
    const cardio=blocks.filter(b=>b.stage===4);
    const result=[];
    let last='';
    let beforeLast='';
    while(effort.length){
      let best=0,bestScore=Infinity;
      effort.forEach((b,i)=>{
        const repeat=b.region!=='mixed'&&b.region!=='other';
        const score=b.stage*6+(repeat&&b.region===last?7:0)
          +(repeat&&b.region===beforeLast?2:0)+b.index*.015;
        if(score<bestScore){bestScore=score;best=i;}
      });
      const next=effort.splice(best,1)[0];
      result.push(next);
      beforeLast=last;
      last=next.region;
    }
    return [...result,...core,...cardio].flatMap(b=>b.items);
  }

  function applySuggestedOrder(){
    (state.program?.sessions||[]).forEach(session=>{
      session.exercises=orderedExercises(session.exercises);
    });
  }

  function latestTechnique(name){
    const key=norm(name);
    const qualified=(state.history||[]).filter(r=>
      norm(r.exercise_title)===key&&(r.technique_quality==='clean'||r.technique_quality==='less_clean')
    );
    if(!qualified.length)return null;
    qualified.sort((a,b)=>Date.parse(b.start_time||0)-Date.parse(a.start_time||0));
    const latest=qualified.filter(r=>r.start_time===qualified[0].start_time);
    const poor=latest.filter(r=>r.technique_quality==='less_clean');
    return {needsWork:poor.length>0,poorSets:poor.map(r=>Number(r.technique_set)||Number(r.set_index)+1)};
  }

  function annotateWorkoutHistory(workout){
    const start=new Date(workout.started).toISOString();
    workout.exercises.forEach((exercise,exerciseIndex)=>{
      if(isCardio(exercise))return;
      const rows=state.history.filter(r=>
        r.start_time===start&&Number(r.exercise_order)===exerciseIndex+1&&
        norm(r.exercise_title)===norm(exercise.name)&&r.set_type==='normal'
      );
      const completed=(exercise.sets||[]).filter(s=>s.done&&num(s.reps)>0);
      completed.forEach((set,i)=>{
        const row=rows.find(r=>Number(r.set_index)===i);
        if(!row)return;
        row.technique_quality=set.techniquePoor?'less_clean':'clean';
        row.technique_set=Number(set.i)||i+1;
      });
    });
  }

  if(typeof recalculateProgressionFromWorkout==='function'){
    const previousProgression=recalculateProgressionFromWorkout;
    recalculateProgressionFromWorkout=function(workout){
      annotateWorkoutHistory(workout);
      const flagged=workout.exercises.filter(e=>
        !isCardio(e)&&(e.sets||[]).some(s=>s.done&&s.techniquePoor&&num(s.reps)>0)
      );
      const pausedFamilies=new Set(flagged.map(e=>exerciseFamily(e.name)));
      flagged.forEach(exercise=>{
        const weights=exercise.sets.filter(s=>s.done&&num(s.reps)>0)
          .map(s=>num(s.weight)).filter(w=>w>0);
        if(!weights.length)return;
        const max=Math.max(...weights);
        const family=exerciseFamily(exercise.name);
        const previous=num(state.progressionOverrides?.[family]);
        state.progressionOverrides[family]=previous>0?Math.min(previous,max):max;
      });
      // Même si une autre série atteint l'objectif, aucune augmentation
      // pour le mouvement dont une exécution a été signalée moins propre.
      const eligible={...workout,exercises:workout.exercises.filter(e=>
        isCardio(e)||!pausedFamilies.has(exerciseFamily(e.name))
      )};
      return previousProgression(eligible);
    };
    window.recalculateProgressionFromWorkout=recalculateProgressionFromWorkout;
  }

  function setQuality(ei,si,poor){
    const set=state.activeWorkout?.exercises?.[ei]?.sets?.[si];
    if(!set?.done)return;
    set.techniquePoor=!!poor;
    save();
    renderWorkout();
  }

  const WORD_NUMBERS=[
    /\b(1|premiere?)\b/,
    /\b(2|deuxieme|seconde|deux)\b/,
    /\b(3|troisieme|trois)\b/,
    /\b(4|quatrieme|quatre)\b/,
    /\b(5|cinquieme|cinq)\b/,
    /\b(6|sixieme|six)\b/,
    /\b(7|septieme|sept)\b/,
    /\b(8|huitieme|huit)\b/
  ];

  function spokenSetIndex(phrase,exercise){
    const spoken=norm(phrase);
    const done=(exercise.sets||[]).map((s,i)=>s.done?i:-1).filter(i=>i>=0);
    if(/\b(derniere?|derniers?)\b/.test(spoken))return done[done.length-1]??-1;
    const number=WORD_NUMBERS.findIndex(re=>re.test(spoken));
    if(number>=0)return number;
    if(/\b(serie (une?|numero un)|la premiere)\b/.test(spoken))return 0;
    return done.length===1?done[0]:-1;
  }

  function startVoiceQuality(ei,button){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){alert('Micro indisponible ici. Touche directement le numéro de la série.');return;}
    const exercise=state.activeWorkout?.exercises?.[ei];
    if(!exercise)return;
    const recognition=new Recognition();
    recognition.lang='fr-FR';
    recognition.continuous=false;
    recognition.interimResults=false;
    button.disabled=true;
    button.textContent='🎤 Écoute…';
    recognition.onresult=event=>{
      const phrase=event.results?.[0]?.[0]?.transcript||'';
      const spoken=norm(phrase);
      const si=spokenSetIndex(spoken,exercise);
      const poor=/moins propre|pas propre|mal faite|ratee?|triche|trop lourd|baclee?/.test(spoken);
      const clean=/\b(propre|correcte?|bien faite)\b/.test(spoken);
      if(si<0||!exercise.sets[si]?.done||(!poor&&!clean)){
        alert(`Je n’ai pas compris « ${phrase} ». Dis par exemple « deuxième série moins propre », ou touche la série.`);
        return;
      }
      setQuality(ei,si,poor);
    };
    recognition.onerror=event=>{
      if(event.error!=='aborted')alert('Demande vocale non comprise. Tu peux toucher la série directement.');
    };
    recognition.onend=()=>{button.disabled=false;button.textContent='🎤';};
    try{recognition.start();}catch(e){button.disabled=false;button.textContent='🎤';}
  }

  function decorateWorkout(){
    const workout=state.activeWorkout;
    if(!workout)return;
    document.querySelectorAll('#exerciseList .exercise').forEach((card,ei)=>{
      const exercise=workout.exercises[ei];
      if(!exercise||isCardio(exercise))return;

      const previous=latestTechnique(exercise.name);
      if(previous?.needsWork&&!card.querySelector('.mt-quality-followup')){
        const hint=document.createElement('div');
        hint.className='mt-quality-followup';
        hint.textContent=`⚠ Dernière séance : série${previous.poorSets.length>1?'s':''} ${previous.poorSets.join(', ')} moins propre${previous.poorSets.length>1?'s':''}. Charge conservatrice : priorité à la technique.`;
        card.querySelector('.exercise-title-row')?.insertAdjacentElement('afterend',hint);
      }

      const completed=(exercise.sets||[]).map((set,si)=>({set,si})).filter(x=>x.set.done);
      if(!completed.length||card.querySelector('.mt-quality-panel'))return;
      const panel=document.createElement('div');
      panel.className='mt-quality-panel';
      const header=document.createElement('div');
      header.className='mt-quality-head';
      const caption=document.createElement('span');
      caption.textContent='Qualité des séries · touche si moins propre';
      header.appendChild(caption);
      const mic=document.createElement('button');
      mic.type='button';mic.className='ghost mt-quality-mic';
      mic.textContent='🎤';
      mic.title='Dire « deuxième série moins propre »';
      mic.setAttribute('aria-label',`Décrire la qualité d’une série de ${exercise.name}`);
      mic.onclick=()=>startVoiceQuality(ei,mic);
      header.appendChild(mic);
      panel.appendChild(header);
      const buttons=document.createElement('div');
      buttons.className='mt-quality-choices';
      completed.forEach(({set,si})=>{
        const choice=document.createElement('button');
        choice.type='button';
        choice.className=`mt-quality-choice ${set.techniquePoor?'less-clean':'clean'}`;
        choice.textContent=`S${set.i||si+1} ${set.techniquePoor?'⚠ Moins propre':'✓ Propre'}`;
        choice.setAttribute('aria-label',`Série ${set.i||si+1} : ${set.techniquePoor?'moins propre, toucher pour corriger':'propre, toucher pour signaler moins propre'}`);
        choice.onclick=()=>setQuality(ei,si,!set.techniquePoor);
        buttons.appendChild(choice);
      });
      panel.appendChild(buttons);
      card.appendChild(panel);
    });
  }

  function decorateProgram(){
    document.querySelectorAll('#programCards .program-exercise-row').forEach(row=>{
      const name=row.querySelector('.program-exercise-main > span')?.textContent;
      if(!name||!latestTechnique(name)?.needsWork)return;
      if(row.querySelector('.mt-quality-program-hint'))return;
      const note=document.createElement('small');
      note.className='mt-quality-program-hint';
      note.textContent='⚠ Consolider la technique avant d’augmenter';
      row.querySelector('.program-exercise-main')?.appendChild(note);
    });
  }

  const css=document.createElement('style');
  css.textContent=`
    .mt-quality-followup{padding:8px 10px;margin:6px 0 10px;border-radius:10px;
      background:rgba(245,158,11,.11);border:1px solid rgba(245,158,11,.32);color:#fde68a;font-size:12px;line-height:1.4}
    .mt-quality-panel{margin:13px 0 2px;padding:10px;border-radius:12px;background:rgba(15,23,42,.7);
      border:1px solid var(--line,#26344c)}
    .mt-quality-head{display:flex;align-items:center;justify-content:space-between;gap:8px;
      color:var(--muted,#94a3b8);font-size:11px;font-weight:800}
    .mt-quality-mic{font-size:13px;padding:4px 9px;min-width:39px}
    .mt-quality-choices{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
    .mt-quality-choice{font-size:11px;line-height:1.2;padding:8px;border-radius:9px;border:1px solid #475569;
      color:#bbf7d0;background:rgba(22,101,52,.12)}
    .mt-quality-choice.less-clean{color:#fde68a;border-color:#ca8a04;background:rgba(133,77,14,.24)}
    .mt-quality-program-hint{display:block;color:#fbbf24;margin-top:3px;font-size:10px}
    .mt-quality-history-note{color:#fde68a;background:rgba(245,158,11,.12);border-radius:8px;
      padding:7px 9px;font-size:11px;margin-top:9px}
  `;
  document.head.appendChild(css);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){const result=previousRender();decorateWorkout();return result;};
    window.renderWorkout=renderWorkout;
  }
  if(typeof renderProgram==='function'){
    const previousProgram=renderProgram;
    renderProgram=function(){
      applySuggestedOrder();
      const result=previousProgram();
      decorateProgram();
      return result;
    };
    window.renderProgram=renderProgram;
  }
  if(typeof openWorkoutDetail==='function'){
    const previousDetail=openWorkoutDetail;
    openWorkoutDetail=function(key){
      const result=previousDetail(key);
      const rows=(state.history||[]).filter(r=>`${r.title||''}|${r.start_time||''}`===key);
      const poorByName=new Map();
      rows.filter(r=>r.technique_quality==='less_clean').forEach(r=>{
        const name=norm(r.exercise_title);
        if(!poorByName.has(name))poorByName.set(name,[]);
        poorByName.get(name).push(Number(r.technique_set)||Number(r.set_index)+1);
      });
      document.querySelectorAll('#sessionDetailBody .history-exercise').forEach(card=>{
        const numbers=poorByName.get(norm(card.querySelector('h3')?.textContent));
        if(!numbers?.length||card.querySelector('.mt-quality-history-note'))return;
        const note=document.createElement('div');
        note.className='mt-quality-history-note';
        note.textContent=`⚠ Série${numbers.length>1?'s':''} ${numbers.join(', ')} : exécution moins propre`;
        card.appendChild(note);
      });
      return result;
    };
    window.openWorkoutDetail=openWorkoutDetail;
  }
  if(state.program)renderProgram();
  decorateWorkout();
})();
