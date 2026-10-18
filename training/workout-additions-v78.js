/* My Training — ajouter une série ou un exercice à la séance ouverte.
   Toutes les données déjà validées sont conservées. */
(function(){
  'use strict';

  function createSet(index,targetReps,targetWeight){
    return {
      i:index,targetReps:targetReps||'10–12',targetWeight:targetWeight??null,
      weight:targetWeight??'',reps:'',rir:'',done:false,mtAddedSet:true
    };
  }

  function addSet(index){
    const workout=state.activeWorkout;
    const exercise=workout?.exercises[index];
    if(!exercise || exercise.cardio || !Array.isArray(exercise.sets))return;
    const last=exercise.sets[exercise.sets.length-1];
    const targetReps=last?.targetReps||'10–12';
    const weight=last?.weight!==''&&last?.weight!=null?last.weight:last?.targetWeight;
    exercise.sets.push(createSet(exercise.sets.length+1,targetReps,weight));
    save();
    renderWorkout();
  }

  function undoAddedSet(index){
    const exercise=state.activeWorkout?.exercises[index];
    const last=exercise?.sets?.[exercise.sets.length-1];
    if(!last?.mtAddedSet || last.done)return;
    exercise.sets.pop();
    save();
    renderWorkout();
  }

  function programExerciseList(){
    const found=new Map();
    (state.program?.sessions||[]).forEach(session=>{
      (session.exercises||[]).forEach(e=>{
        const key=String(e.name||'').toLocaleLowerCase('fr');
        if(key&&!found.has(key))found.set(key,e);
      });
    });
    return [...found.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  }

  function makeExercise(template){
    const cardio=isCardioName(template.name);
    return {
      name:template.name,
      note:template.note||'Ajouté pendant la séance',
      rest:Number(template.rest)||0,
      superset:null,autoTarget:null,
      cardio:cardio?parseCardioDefaults(template):null,
      sets:(template.sets||[]).map((s,i)=>({...createSet(i+1,s.reps,s.weight),mtAddedSet:false}))
    };
  }

  function closeModal(){document.getElementById('mtAddExerciseModal')?.classList.add('hidden');}

  function addExercise(template){
    const workout=state.activeWorkout;
    if(!workout)return;
    if(workout.exercises.some(e=>normText(e.name)===normText(template.name))){
      if(!confirm('Cet exercice est déjà présent. L’ajouter une deuxième fois au lieu d’ajouter une série ?'))return;
    }

    const exercise=makeExercise(template);
    if(!exercise.sets.length && !exercise.cardio){
      exercise.sets=[{...createSet(1,'10–12',null),mtAddedSet:false}];
    }
    // Garder le tapis/cardio à la fin du programme, sans déplacer les autres exercices.
    const cardioIndex=workout.exercises.findIndex(e=>!!e.cardio);
    const insertIndex=exercise.cardio||cardioIndex<0?workout.exercises.length:cardioIndex;
    workout.exercises.splice(insertIndex,0,exercise);
    save();
    closeModal();
    renderWorkout();
    document.getElementById('exerciseList')?.children?.[insertIndex]?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  }

  function ensureModal(){
    let modal=document.getElementById('mtAddExerciseModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='mtAddExerciseModal';
    modal.className='modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','mtAddExTitle');
    modal.innerHTML=`
      <div class="modal-card mt-add-modal-card">
        <div class="section-title">
          <div><div class="eyebrow">SÉANCE EN COURS</div><h2 id="mtAddExTitle">Ajouter un exercice</h2></div>
          <button class="ghost" type="button" id="mtAddExClose">Fermer</button>
        </div>
        <div id="mtVoiceSuggestion" class="mt-voice-suggestion hidden">
          <strong id="mtVoiceHeard"></strong>
          <p id="mtVoiceProposal"></p>
          <button type="button" class="primary" id="mtVoiceAccept">Ajouter la proposition</button>
        </div>
        <label for="mtAddExSearch">Choisir un exercice de ton programme</label>
        <input id="mtAddExSearch" type="search" placeholder="Rechercher : curl, pecs, rowing…" autocomplete="off">
        <div id="mtAddExMatches" class="mt-add-matches"></div>
        <div class="mt-add-custom">
          <h3>Ou créer un exercice personnalisé</h3>
          <label>Nom de l’exercice<input id="mtNewExName" placeholder="Ex. Curl marteau haltères" maxlength="120"></label>
          <div class="mt-add-fields">
            <label>Séries<input id="mtNewExSets" type="number" min="1" max="8" value="3"></label>
            <label>Répétitions<input id="mtNewExReps" value="10–12" maxlength="25"></label>
            <label>Charge (kg)<input id="mtNewExWeight" inputmode="decimal" placeholder="Facultatif"></label>
            <label>Repos (s)<input id="mtNewExRest" type="number" min="0" max="300" value="75"></label>
          </div>
          <button type="button" class="primary mt-add-submit" id="mtNewExSubmit">+ Ajouter cet exercice</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#mtAddExClose').onclick=closeModal;
    modal.onclick=e=>{if(e.target===modal)closeModal();};
    modal.querySelector('#mtAddExSearch').addEventListener('input',renderSuggestions);
    modal.querySelector('#mtNewExSubmit').onclick=addCustomExercise;
    return modal;
  }

  function renderSuggestions(){
    const modal=ensureModal();
    const host=modal.querySelector('#mtAddExMatches');
    const q=normText(modal.querySelector('#mtAddExSearch').value.trim());
    host.replaceChildren();
    const list=programExerciseList().filter(e=>!q||normText(e.name).includes(q));
    list.forEach(template=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='mt-add-match';
      button.textContent=template.name;
      button.onclick=()=>addExercise(template);
      host.appendChild(button);
    });
    if(!list.length){
      const empty=document.createElement('p');
      empty.className='muted';
      empty.textContent='Aucun exercice trouvé. Utilise le formulaire personnalisé ci-dessous.';
      host.appendChild(empty);
    }
  }

  function addCustomExercise(){
    const modal=ensureModal();
    const name=modal.querySelector('#mtNewExName').value.trim();
    const reps=modal.querySelector('#mtNewExReps').value.trim()||'10–12';
    const setsCount=Number(modal.querySelector('#mtNewExSets').value);
    const rest=Number(modal.querySelector('#mtNewExRest').value);
    const weightText=modal.querySelector('#mtNewExWeight').value.trim();
    const weight=weightText===''?null:Number(weightText.replace(',','.'));

    if(!name){alert('Indique le nom de l’exercice.');return;}
    if(!Number.isInteger(setsCount)||setsCount<1||setsCount>8){alert('Choisis entre 1 et 8 séries.');return;}
    if(!Number.isFinite(rest)||rest<0||rest>300){alert('Le repos doit être compris entre 0 et 300 secondes.');return;}
    if(weight!==null&&(!Number.isFinite(weight)||weight<0)){alert('Vérifie la charge saisie.');return;}

    addExercise({name,rest,note:'Exercice personnalisé',sets:Array.from({length:setsCount},()=>({reps,weight}))});
  }

  function openModal(){
    if(!state.activeWorkout)return;
    const modal=ensureModal();
    modal.querySelector('#mtVoiceSuggestion').classList.add('hidden');
    modal.querySelector('#mtAddExSearch').value='';
    modal.querySelector('#mtNewExName').value='';
    modal.querySelector('#mtNewExSets').value='3';
    modal.querySelector('#mtNewExReps').value='10–12';
    modal.querySelector('#mtNewExWeight').value='';
    modal.querySelector('#mtNewExRest').value='75';
    renderSuggestions();
    modal.classList.remove('hidden');
  }

  function suggestedExercise(transcript){
    const spoken=normText(transcript);
    const available=programExerciseList();
    const current=new Set((state.activeWorkout?.exercises||[]).map(e=>normText(e.name)));
    const named=available.find(e=>spoken.includes(normText(e.name)));
    if(named)return named;

    const rules=[
      {match:/\b(pecs?|pectoraux|poitrine)\b/,names:['Pec Fly machine','Développé incliné haltères','Écartés poulie vis-à-vis','Chest Press machine']},
      {match:/\b(biceps?|bras devant)\b/,names:['Curl pupitre machine','Curl poulie basse corde']},
      {match:/\b(triceps?|arriere des bras)\b/,names:['Extension triceps corde','Extension triceps au-dessus de la tête corde']},
      {match:/\b(dos|dorsaux|rhomboides)\b/,names:['Rowing poulie assis','Tirage vertical','Rowing poitrine appuyée','Rowing haltère unilatéral']},
      {match:/\b(epaules?|deltoides?)\b/,names:['Face pull corde','Élévations latérales']},
      {match:/\b(abdos?|abdominaux|ventre|gainage)\b/,names:['Crunch poulie','Pallof press','Crunch inversé','Dead bug + expiration complète']},
      {match:/\b(jambes?|quadriceps|cuisses?)\b/,names:['Leg Extension','Leg Curl assis','Presse à cuisses']},
      {match:/\b(ischios?|ischio.jambiers)\b/,names:['Leg Curl assis']},
      {match:/\b(fessiers?|glutes?)\b/,names:['Presse à cuisses']},
      {match:/\b(mollets?)\b/,names:['Mollets presse / machine']},
      {match:/\b(avant.bras|avantbras|poignets?)\b/,custom:{name:'Curl inversé barre EZ',sets:[{reps:'12–15',weight:null},{reps:'12–15',weight:null},{reps:'12–15',weight:null}],rest:60,note:'Avant-bras • amplitude et poignets contrôlés'}}
    ];
    const rule=rules.find(r=>r.match.test(spoken));
    if(!rule)return null;
    if(rule.custom)return rule.custom;
    const ordered=(rule.names||[]).map(name=>available.find(e=>normText(e.name)===normText(name))).filter(Boolean);
    return ordered.find(e=>!current.has(normText(e.name)))||ordered[0]||null;
  }

  function handleVoiceRequest(transcript){
    openModal();
    const modal=ensureModal();
    const box=modal.querySelector('#mtVoiceSuggestion');
    const heard=modal.querySelector('#mtVoiceHeard');
    const proposed=modal.querySelector('#mtVoiceProposal');
    const accept=modal.querySelector('#mtVoiceAccept');
    const template=suggestedExercise(transcript);
    heard.textContent=`Tu as dit : « ${transcript} »`;
    proposed.textContent=template?`Je te propose : ${template.name}`:'Je n’ai pas reconnu le muscle. Choisis un exercice ci-dessous ou crée-le.';
    accept.classList.toggle('hidden',!template);
    accept.onclick=template?()=>addExercise(template):null;
    box.classList.remove('hidden');
  }

  function startVoiceRequest(button){
    if(!state.activeWorkout)return;
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){
      openModal();
      alert('Reconnaissance vocale indisponible sur ce navigateur. Utilise la recherche ou le formulaire.');
      return;
    }
    let received=false;
    const recognition=new Recognition();
    recognition.lang='fr-FR';
    recognition.continuous=false;
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    button.disabled=true;
    button.textContent='🎤 Je t’écoute…';
    recognition.onresult=event=>{
      const transcript=event.results?.[0]?.[0]?.transcript?.trim();
      if(!transcript)return;
      received=true;
      handleVoiceRequest(transcript);
    };
    recognition.onerror=event=>{
      if(event.error==='aborted')return;
      if(!received){
        openModal();
        alert('Le micro n’a pas pu reconnaître ta demande. Tu peux ajouter l’exercice manuellement.');
      }
    };
    recognition.onend=()=>{
      button.disabled=false;
      button.textContent='🎤 Demander un exercice';
    };
    try{recognition.start();}catch(e){
      button.disabled=false;
      button.textContent='🎤 Demander un exercice';
      openModal();
    }
  }

  function decorateWorkout(){
    const workout=state.activeWorkout;
    const list=document.getElementById('exerciseList');
    if(!list)return;
    list.querySelectorAll('.exercise').forEach((card,index)=>{
      const e=workout?.exercises[index];
      if(!e||e.cardio)return;
      const actions=card.querySelector('.exercise-quick-actions');
      if(!actions||actions.querySelector('.mt-add-set-btn'))return;
      const add=document.createElement('button');
      add.type='button';
      add.className='ghost mt-add-set-btn';
      add.textContent='+ Série';
      add.onclick=()=>addSet(index);
      actions.appendChild(add);
      const last=e.sets?.[e.sets.length-1];
      if(last?.mtAddedSet&&!last.done){
        const undo=document.createElement('button');
        undo.type='button';
        undo.className='ghost mt-undo-set-btn';
        undo.textContent='− Série';
        undo.onclick=()=>undoAddedSet(index);
        actions.appendChild(undo);
      }
    });

    let bar=document.getElementById('mtAddExerciseBar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='mtAddExerciseBar';
      bar.className='mt-add-exercise-bar';
      const button=document.createElement('button');
      button.type='button';
      button.className='secondary';
      button.textContent='+ Ajouter un exercice';
      button.onclick=openModal;
      bar.appendChild(button);
      const voice=document.createElement('button');
      voice.type='button';
      voice.className='ghost mt-voice-exercise-btn';
      voice.textContent='🎤 Demander un exercice';
      voice.onclick=()=>startVoiceRequest(voice);
      bar.appendChild(voice);
      list.insertAdjacentElement('afterend',bar);
    }
    bar.classList.toggle('hidden',!workout);
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-add-set-btn,.mt-undo-set-btn{font-size:10px;padding:6px 7px;white-space:nowrap}
    .mt-add-set-btn{color:#86efac}.mt-undo-set-btn{color:#fca5a5}
    .mt-add-exercise-bar{display:flex;flex-direction:column;gap:9px;padding:16px 0 22px;text-align:center}
    .mt-add-exercise-bar button{width:100%;padding:13px}
    .mt-voice-exercise-btn{border-color:#93c5fd;color:#bfdbfe}
    .mt-voice-suggestion{padding:12px;background:rgba(59,130,246,.13);border:1px solid #2563eb;border-radius:12px;margin:12px 0}
    .mt-voice-suggestion p{margin:8px 0 12px}
    .mt-add-modal-card label{display:flex;flex-direction:column;gap:5px;font-size:12px;margin-bottom:8px}
    .mt-add-modal-card input{width:100%;min-width:0}
    .mt-add-matches{display:flex;flex-direction:column;gap:6px;max-height:28vh;overflow:auto;margin:10px 0 18px}
    .mt-add-match{display:block;text-align:left;width:100%;padding:10px;border:1px solid var(--line,#26344c)}
    .mt-add-custom{border-top:1px solid var(--line,#26344c);padding-top:12px}
    .mt-add-custom h3{font-size:15px;margin:0 0 12px}
    .mt-add-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .mt-add-submit{width:100%;padding:12px;margin-top:8px}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const oldRender=renderWorkout;
    renderWorkout=function(){const result=oldRender();decorateWorkout();return result;};
    window.renderWorkout=renderWorkout;
  }
  decorateWorkout();
})();
