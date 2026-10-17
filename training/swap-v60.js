/* My Training v60 — exercise replacement suggestions when equipment is unavailable */
(function(){
  const MT_SWAP_RULES=[
    {keys:['chest press'],alts:[
      {name:'Développé couché haltères',why:'Même poussée horizontale, sans machine.'},
      {name:'Développé couché Smith',why:'Trajectoire guidée proche de la chest press.'},
      {name:'Pompes',why:'Alternative immédiate au poids du corps pour les pectoraux et triceps.',bodyweight:true}
    ]},
    {keys:['développé incliné haltères','developpe incline halteres'],alts:[
      {name:'Chest press inclinée machine',why:'Même priorité sur le haut des pectoraux.'},
      {name:'Développé incliné Smith',why:'Même angle de poussée avec trajectoire guidée.'},
      {name:'Pompes pieds surélevés',why:'Alternative sans machine ciblant davantage le haut des pectoraux.',bodyweight:true}
    ]},
    {keys:['écartés poulie','ecartes poulie','pec fly'],alts:[
      {name:'Pec deck',why:'Même mouvement d’adduction des bras pour les pectoraux.'},
      {name:'Écartés haltères sur banc',why:'Alternative libre sans poulie.'},
      {name:'Pompes prise large',why:'Solution simple si toutes les machines pectoraux sont prises.',bodyweight:true}
    ]},
    {keys:['rowing poitrine','rowing poulie assis','rowing poulie'],alts:[
      {name:'Rowing machine convergente',why:'Même tirage horizontal pour le milieu du dos.'},
      {name:'Rowing haltères sur banc incliné',why:'Tirage horizontal avec poitrine appuyée.'},
      {name:'Rowing T-bar poitrine appuyée',why:'Très proche du travail rhomboïdes / grand dorsal.'}
    ]},
    {keys:['rowing haltère','rowing haltere'],alts:[
      {name:'Rowing poulie unilatéral',why:'Même travail unilatéral du dos.'},
      {name:'Rowing machine convergente',why:'Alternative stable et facile à charger.'},
      {name:'Rowing poitrine appuyée',why:'Même tirage, avec moins de contrainte lombaire.'}
    ]},
    {keys:['tirage vertical'],alts:[
      {name:'Tractions assistées',why:'Même tirage vertical pour le grand dorsal.'},
      {name:'Pullover à la poulie',why:'Travail du grand dorsal sans utiliser la machine de tirage vertical.'},
      {name:'Tractions élastique',why:'Alternative au poids du corps si les machines sont occupées.',bodyweight:true}
    ]},
    {keys:['élévations latérales','elevations laterales'],alts:[
      {name:'Élévations latérales poulie',why:'Tension continue sur le deltoïde moyen.'},
      {name:'Machine élévations latérales',why:'Même mouvement avec trajectoire guidée.'},
      {name:'Élévations latérales assis haltères',why:'Même cible avec peu de matériel.'}
    ]},
    {keys:['face pull'],alts:[
      {name:'Reverse pec deck',why:'Très bon remplacement pour arrière d’épaule et haut du dos.'},
      {name:'Oiseau haltères sur banc incliné',why:'Alternative libre pour l’arrière d’épaule.'},
      {name:'Y-raise incliné',why:'Travail léger du haut du dos et des rotateurs.'}
    ]},
    {keys:['extension triceps au-dessus','au-dessus de la tête corde'],alts:[
      {name:'Extension triceps haltère au-dessus de la tête',why:'Même travail de la longue portion du triceps.'},
      {name:'Barre au front haltères',why:'Alternative libre efficace pour les triceps.'},
      {name:'Dips assistés',why:'Mouvement polyarticulaire pour les triceps.',bodyweight:true}
    ]},
    {keys:['extension triceps corde'],alts:[
      {name:'Dips assistés',why:'Très bon remplacement pour charger les triceps.',bodyweight:true},
      {name:'Extension triceps unilatérale haltère',why:'Pas besoin de poulie.'},
      {name:'Barre au front haltères',why:'Alternative libre pour conserver un travail ciblé des triceps.'}
    ]},
    {keys:['curl pupitre','curl poulie'],alts:[
      {name:'Curl haltères incliné',why:'Très bon travail du biceps sans machine.'},
      {name:'Curl marteau haltères',why:'Alternative simple pour biceps et brachial.'},
      {name:'Curl barre EZ',why:'Facile à charger si la machine ou la poulie est prise.'}
    ]},
    {keys:['crunch poulie'],alts:[
      {name:'Crunch machine',why:'Même flexion du tronc avec résistance.'},
      {name:'Crunch au sol lesté',why:'Alternative simple sans poulie.'},
      {name:'Sit-up décliné',why:'Travail abdominal sans câble.',bodyweight:true}
    ]},
    {keys:['pallof'],alts:[
      {name:'Planche latérale',why:'Excellent travail anti-rotation des obliques.',bodyweight:true},
      {name:'Suitcase carry',why:'Gainage anti-inclinaison et anti-rotation.'},
      {name:'Pallof press élastique',why:'Même mouvement sans station de poulie.',bodyweight:true}
    ]},
    {keys:['vacuum'],alts:[
      {name:'Dead bug + expiration complète',why:'Travail du transverse et contrôle respiratoire.',bodyweight:true},
      {name:'Hollow hold',why:'Gainage profond sans matériel.',bodyweight:true},
      {name:'Planche respiration contrôlée',why:'Alternative simple pour le transverse.',bodyweight:true}
    ]},
    {keys:['relevés de genoux','releves de genoux'],alts:[
      {name:'Crunch inversé',why:'Même priorité sur l’enroulement du bassin.',bodyweight:true},
      {name:'Relevés de jambes au sol',why:'Alternative sans chaise romaine.',bodyweight:true},
      {name:'Dead bug + expiration complète',why:'Moins agressif pour les fléchisseurs de hanche.',bodyweight:true}
    ]},
    {keys:['planche rkc'],alts:[
      {name:'Hollow hold',why:'Gainage intense sans matériel.',bodyweight:true},
      {name:'Dead bug + expiration complète',why:'Gainage profond avec meilleur contrôle lombaire.',bodyweight:true},
      {name:'Planche longue',why:'Même logique de gainage anti-extension.',bodyweight:true}
    ]},
    {keys:['presse à cuisses','presse a cuisses'],alts:[
      {name:'Hack squat',why:'Très proche de la presse pour quadriceps et fessiers.'},
      {name:'Goblet squat',why:'Alternative simple avec un haltère.'},
      {name:'Fentes bulgares',why:'Très bon remplacement unilatéral sans presse.'}
    ]},
    {keys:['leg curl'],alts:[
      {name:'Leg curl allongé',why:'Même flexion de genou pour les ischio-jambiers.'},
      {name:'Leg curl glissé au sol',why:'Alternative sans machine avec serviette ou sliders.',bodyweight:true},
      {name:'Nordic curl assisté',why:'Très bon travail des ischio-jambiers.',bodyweight:true}
    ]},
    {keys:['leg extension'],alts:[
      {name:'Sissy squat assisté',why:'Alternative très orientée quadriceps.',bodyweight:true},
      {name:'Split squat talon surélevé',why:'Accent quadriceps sans machine.'},
      {name:'Step-up haut',why:'Alternative unilatérale pour les quadriceps.'}
    ]},
    {keys:['mollets'],alts:[
      {name:'Mollets debout haltères',why:'Même extension de cheville sans machine.'},
      {name:'Mollets assis haltère sur genoux',why:'Alternative simple pour le soléaire.'},
      {name:'Mollets debout Smith',why:'Facile à charger si la machine dédiée est prise.'}
    ]},
    {keys:['dead bug'],alts:[
      {name:'Hollow hold',why:'Gainage anti-extension sans matériel.',bodyweight:true},
      {name:'Bird dog',why:'Gainage croisé plus facile à contrôler.',bodyweight:true},
      {name:'Planche RKC',why:'Gainage plus intense du tronc.',bodyweight:true}
    ]},
    {keys:['crunch inversé','crunch inverse'],alts:[
      {name:'Relevés de genoux au sol',why:'Même enroulement du bassin.',bodyweight:true},
      {name:'Crunch machine',why:'Alternative chargée pour les abdominaux.'},
      {name:'Dead bug + expiration complète',why:'Alternative plus axée gainage profond.',bodyweight:true}
    ]}
  ];

  function mtSwapNorm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function mtSwapCandidates(name){
    const n=mtSwapNorm(name);
    const rule=MT_SWAP_RULES.find(r=>r.keys.some(k=>n.includes(mtSwapNorm(k))));
    return rule?rule.alts.slice():[];
  }

  function mtSwapButtonStyle(){
    if(document.getElementById('mtSwapStyle'))return;
    const style=document.createElement('style');
    style.id='mtSwapStyle';
    style.textContent=`
      .mt-swap-btn{white-space:nowrap}
      .mt-swap-intro{margin:0 0 12px;color:var(--muted,#9ca3af);line-height:1.45}
      .mt-swap-list{display:grid;gap:10px}
      .mt-swap-choice{width:100%;text-align:left;padding:14px;border-radius:14px;border:1px solid rgba(148,163,184,.25);background:rgba(30,41,59,.55);color:inherit}
      .mt-swap-choice strong{display:block;font-size:1rem;margin-bottom:4px}
      .mt-swap-choice small{display:block;color:var(--muted,#9ca3af);line-height:1.35}
      .mt-swap-current{display:inline-block;margin:0 0 10px;padding:6px 9px;border-radius:999px;background:rgba(59,130,246,.14);font-size:.82rem}
      .mt-swap-none{padding:12px;border-radius:12px;background:rgba(148,163,184,.10);color:var(--muted,#9ca3af)}
    `;
    document.head.appendChild(style);
  }

  function mtOpenExerciseSwap(index){
    const w=state.activeWorkout;
    const e=w?.exercises?.[index];
    if(!e)return;

    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    const modal=document.getElementById('sessionModal');
    if(!title||!meta||!body||!modal)return;

    const used=new Set((w.exercises||[]).map((x,i)=>i===index?'':mtSwapNorm(x.name)).filter(Boolean));
    const choices=mtSwapCandidates(e.name).filter(a=>!used.has(mtSwapNorm(a.name)));
    const muscles=(typeof exerciseGuide==='function'?exerciseGuide(e.name)?.muscles:'')||'';

    title.textContent='Remplacer l’exercice';
    meta.textContent=muscles;
    body.innerHTML=`
      <div class="mt-swap-current">Actuel : ${esc(e.name)}</div>
      <p class="mt-swap-intro">Machine occupée ou indisponible ? Choisis une alternative. Le remplacement vaut uniquement pour cette séance.</p>
      ${choices.length?`<div class="mt-swap-list">${choices.map((a,i)=>`
        <button type="button" class="mt-swap-choice" data-mt-swap-choice="${i}">
          <strong>${esc(a.name)}</strong>
          <small>${esc(a.why)}</small>
        </button>`).join('')}</div>`:'<div class="mt-swap-none">Aucune alternative préconfigurée pour cet exercice.</div>'}
    `;
    body.querySelectorAll('[data-mt-swap-choice]').forEach(btn=>{
      btn.onclick=()=>mtApplyExerciseSwap(index,choices[Number(btn.dataset.mtSwapChoice)]);
    });
    modal.classList.remove('hidden');
  }

  function mtApplyExerciseSwap(index,alt){
    const w=state.activeWorkout;
    const e=w?.exercises?.[index];
    if(!e||!alt)return;
    const oldName=e.name;

    e.name=alt.name;
    e.note=`Remplacement temporaire de « ${oldName} » • ${alt.why}`;
    e.autoTarget=null;

    (e.sets||[]).forEach(s=>{
      if(s.done)return;
      s.targetWeight=alt.bodyweight?0:null;
      s.weight=alt.bodyweight?0:'';
      s.reps='';
      s.rir='';
    });

    save();
    document.getElementById('sessionModal')?.classList.add('hidden');
    renderWorkout();
  }

  function mtAttachSwapButtons(){
    const w=state.activeWorkout;
    if(!w)return;
    const cards=[...document.querySelectorAll('#exerciseList .exercise')];
    cards.forEach((card,index)=>{
      const e=w.exercises?.[index];
      if(!e||mtSwapNorm(e.name).includes('tapis'))return;
      const actions=card.querySelector('.exercise-quick-actions');
      if(!actions||actions.querySelector('.mt-swap-btn'))return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='ghost mt-swap-btn';
      btn.textContent='↔ Remplacer';
      btn.setAttribute('aria-label',`Remplacer ${e.name}`);
      btn.onclick=()=>mtOpenExerciseSwap(index);
      actions.prepend(btn);
    });
  }

  mtSwapButtonStyle();
  window.mtOpenExerciseSwap=mtOpenExerciseSwap;
  window.mtApplyExerciseSwap=mtApplyExerciseSwap;

  if(typeof renderWorkout==='function'){
    const mtV60RenderWorkout=renderWorkout;
    renderWorkout=function(){
      mtV60RenderWorkout();
      mtAttachSwapButtons();
    };
    window.renderWorkout=renderWorkout;
  }

  const help=document.querySelector('.help-steps');
  if(help&&!document.getElementById('mtSwapHelp')){
    const step=document.createElement('div');
    step.id='mtSwapHelp';
    step.className='help-step';
    step.innerHTML='<span>10</span><div><strong>Machine indisponible</strong><p>Pendant la séance, touche <b>↔ Remplacer</b> sur l’exercice. My Training te propose des alternatives qui ciblent le même groupe musculaire. Le changement ne vaut que pour la séance en cours.</p></div>';
    help.appendChild(step);
  }

  if(state.activeWorkout)renderWorkout();
})();
