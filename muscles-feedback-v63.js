/* My Training v63 — muscle diagrams + end-of-workout exercise feedback */
(function(){
  const FEEDBACK_KEY='mt_exercise_feedback_v1';

  function norm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function escapeHtml(s){
    if(typeof esc==='function')return esc(s);
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function loadFeedback(){
    try{return JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'{}')||{};}catch(e){return {};}
  }
  function saveFeedback(data){
    try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(data||{}));}catch(e){}
  }
  function keyForExercise(name){return norm(name).replace(/[^a-z0-9]+/g,' ').trim();}

  const MUSCLE_LABELS={
    chest:'Pectoraux',frontDelts:'Deltoïde antérieur',sideDelts:'Deltoïde moyen',rearDelts:'Deltoïde postérieur',
    traps:'Trapèzes',lats:'Grand dorsal',midBack:'Rhomboïdes / milieu du dos',biceps:'Biceps',triceps:'Triceps',
    forearms:'Avant-bras',abs:'Grand droit',obliques:'Obliques',glutes:'Fessiers',quads:'Quadriceps',
    hamstrings:'Ischio-jambiers',calves:'Mollets',hipFlexors:'Fléchisseurs de hanche',core:'Transverse / gainage profond'
  };

  const MUSCLE_RULES=[
    {keys:['chest press','developpe couche','developpe incline','pompe'],primary:['chest'],secondary:['frontDelts','triceps']},
    {keys:['pec fly','butterfly','ecarte','bug fly'],primary:['chest'],secondary:['frontDelts']},
    {keys:['tirage vertical','tractions','pulldown'],primary:['lats'],secondary:['biceps','midBack','rearDelts']},
    {keys:['rowing','row '],primary:['midBack','lats'],secondary:['biceps','rearDelts','traps']},
    {keys:['elevation laterale','elevations laterales'],primary:['sideDelts'],secondary:['traps']},
    {keys:['face pull','reverse pec deck','oiseau','y-raise'],primary:['rearDelts','midBack'],secondary:['traps']},
    {keys:['developpe epaules','shoulder press'],primary:['frontDelts','sideDelts'],secondary:['triceps']},
    {keys:['curl'],primary:['biceps'],secondary:['forearms']},
    {keys:['extension triceps','pushdown','dips','barre au front'],primary:['triceps'],secondary:['chest','frontDelts']},
    {keys:['crunch','sit-up'],primary:['abs'],secondary:['obliques']},
    {keys:['pallof','planche laterale','wood chop'],primary:['obliques','core'],secondary:['abs']},
    {keys:['dead bug','vacuum','planche rkc','hollow'],primary:['core','abs'],secondary:['obliques','hipFlexors']},
    {keys:['releve de genoux','releves de genoux','releve de jambes'],primary:['abs','hipFlexors'],secondary:['obliques']},
    {keys:['presse a cuisses','leg press','hack squat','goblet squat','squat'],primary:['quads','glutes'],secondary:['hamstrings']},
    {keys:['leg extension'],primary:['quads'],secondary:[]},
    {keys:['leg curl','nordic'],primary:['hamstrings'],secondary:['glutes']},
    {keys:['fente','bulgare','split squat','step-up'],primary:['quads','glutes'],secondary:['hamstrings']},
    {keys:['mollet','calf'],primary:['calves'],secondary:[]},
    {keys:['tapis'],primary:['quads','glutes','calves'],secondary:['hamstrings','core']}
  ];

  function muscleProfile(name){
    const n=norm(name);
    const rule=MUSCLE_RULES.find(r=>r.keys.some(k=>n.includes(norm(k))));
    if(rule)return rule;
    const guide=typeof exerciseGuide==='function'?exerciseGuide(name):null;
    return {primary:[],secondary:[],fallback:guide?.muscles||'Muscles ciblés selon le mouvement'};
  }

  function classFor(key,primary,secondary){
    if(primary.includes(key))return 'mt-muscle-primary';
    if(secondary.includes(key))return 'mt-muscle-secondary';
    return 'mt-muscle-base';
  }

  function anatomySvg(profile){
    const p=profile.primary||[],s=profile.secondary||[];
    const c=k=>classFor(k,p,s);
    return `
      <div class="mt-anatomy-wrap">
        <div class="mt-anatomy-figure">
          <div class="mt-anatomy-label">AVANT</div>
          <svg viewBox="0 0 170 330" role="img" aria-label="Schéma musculaire face avant">
            <g class="mt-body-outline">
              <circle cx="85" cy="28" r="20"/><path d="M65 52 Q48 60 42 92 L34 156 Q32 170 43 174 L52 126 L58 199 L52 305 L72 305 L85 215 L98 305 L118 305 L112 199 L118 126 L127 174 Q138 170 136 156 L128 92 Q122 60 105 52 Z"/>
            </g>
            <ellipse class="${c('frontDelts')}" cx="57" cy="76" rx="13" ry="17"/><ellipse class="${c('frontDelts')}" cx="113" cy="76" rx="13" ry="17"/>
            <path class="${c('chest')}" d="M62 72 Q84 61 84 96 Q65 100 60 88 Z"/><path class="${c('chest')}" d="M108 72 Q86 61 86 96 Q105 100 110 88 Z"/>
            <ellipse class="${c('biceps')}" cx="48" cy="119" rx="8" ry="19"/><ellipse class="${c('biceps')}" cx="122" cy="119" rx="8" ry="19"/>
            <ellipse class="${c('forearms')}" cx="42" cy="153" rx="6" ry="22"/><ellipse class="${c('forearms')}" cx="128" cy="153" rx="6" ry="22"/>
            <rect class="${c('abs')}" x="72" y="104" width="26" height="70" rx="10"/>
            <path class="${c('obliques')}" d="M62 103 Q70 110 69 173 L58 174 L56 119 Z"/><path class="${c('obliques')}" d="M108 103 Q100 110 101 173 L112 174 L114 119 Z"/>
            <path class="${c('hipFlexors')}" d="M72 174 L84 174 L80 202 L67 197 Z"/><path class="${c('hipFlexors')}" d="M98 174 L86 174 L90 202 L103 197 Z"/>
            <path class="${c('quads')}" d="M62 190 Q76 180 82 204 L73 267 Q58 262 58 238 Z"/><path class="${c('quads')}" d="M108 190 Q94 180 88 204 L97 267 Q112 262 112 238 Z"/>
            <ellipse class="${c('calves')}" cx="67" cy="283" rx="8" ry="22"/><ellipse class="${c('calves')}" cx="103" cy="283" rx="8" ry="22"/>
          </svg>
        </div>
        <div class="mt-anatomy-figure">
          <div class="mt-anatomy-label">ARRIÈRE</div>
          <svg viewBox="0 0 170 330" role="img" aria-label="Schéma musculaire face arrière">
            <g class="mt-body-outline">
              <circle cx="85" cy="28" r="20"/><path d="M65 52 Q48 60 42 92 L34 156 Q32 170 43 174 L52 126 L58 199 L52 305 L72 305 L85 215 L98 305 L118 305 L112 199 L118 126 L127 174 Q138 170 136 156 L128 92 Q122 60 105 52 Z"/>
            </g>
            <path class="${c('traps')}" d="M68 55 L85 72 L102 55 L108 78 L85 94 L62 78 Z"/>
            <ellipse class="${c('rearDelts')}" cx="57" cy="78" rx="13" ry="17"/><ellipse class="${c('rearDelts')}" cx="113" cy="78" rx="13" ry="17"/>
            <path class="${c('midBack')}" d="M66 82 Q85 72 104 82 L100 121 Q85 132 70 121 Z"/>
            <path class="${c('lats')}" d="M61 93 Q68 110 70 155 L58 169 L55 112 Z"/><path class="${c('lats')}" d="M109 93 Q102 110 100 155 L112 169 L115 112 Z"/>
            <ellipse class="${c('triceps')}" cx="48" cy="119" rx="8" ry="20"/><ellipse class="${c('triceps')}" cx="122" cy="119" rx="8" ry="20"/>
            <ellipse class="${c('forearms')}" cx="42" cy="153" rx="6" ry="22"/><ellipse class="${c('forearms')}" cx="128" cy="153" rx="6" ry="22"/>
            <ellipse class="${c('glutes')}" cx="74" cy="188" rx="16" ry="18"/><ellipse class="${c('glutes')}" cx="96" cy="188" rx="16" ry="18"/>
            <path class="${c('hamstrings')}" d="M62 204 Q76 196 81 218 L74 265 Q60 260 59 237 Z"/><path class="${c('hamstrings')}" d="M108 204 Q94 196 89 218 L96 265 Q110 260 111 237 Z"/>
            <ellipse class="${c('calves')}" cx="67" cy="283" rx="8" ry="22"/><ellipse class="${c('calves')}" cx="103" cy="283" rx="8" ry="22"/>
          </svg>
        </div>
      </div>`;
  }

  function muscleListHtml(profile){
    const p=(profile.primary||[]).map(k=>MUSCLE_LABELS[k]||k);
    const s=(profile.secondary||[]).map(k=>MUSCLE_LABELS[k]||k);
    return `<div class="mt-muscle-legend">
      <div><span class="mt-legend-dot primary"></span><strong>Principaux</strong><span>${escapeHtml(p.join(' • ')||profile.fallback||'—')}</span></div>
      <div><span class="mt-legend-dot secondary"></span><strong>Secondaires</strong><span>${escapeHtml(s.join(' • ')||'—')}</span></div>
    </div>`;
  }

  function openMuscleModal(index){
    const e=state.activeWorkout?.exercises?.[index];
    if(!e)return;
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body)return;
    const profile=muscleProfile(e.name);
    title.textContent=e.name;
    meta.textContent='Muscles sollicités — principaux et secondaires';
    body.innerHTML=anatomySvg(profile)+muscleListHtml(profile);
    modal.classList.remove('hidden');
  }

  function alternativesFor(name){
    const n=norm(name);
    const rules=[
      {keys:['pec fly','butterfly','bug fly','ecarte'],alts:['Écartés poulie vis-à-vis','Développé couché haltères','Pompes prise large']},
      {keys:['chest press'],alts:['Développé couché haltères','Développé couché Smith','Pompes']},
      {keys:['developpe incline'],alts:['Chest press inclinée','Développé incliné Smith','Pompes pieds surélevés']},
      {keys:['tirage vertical'],alts:['Tractions assistées','Pullover à la poulie','Tractions élastique']},
      {keys:['rowing'],alts:['Rowing haltères poitrine appuyée','Rowing poulie unilatéral','Rowing machine convergente']},
      {keys:['elevation laterale'],alts:['Élévations latérales poulie','Machine élévations latérales','Élévations latérales assis haltères']},
      {keys:['face pull'],alts:['Reverse pec deck','Oiseau haltères sur banc incliné','Y-raise incliné']},
      {keys:['extension triceps'],alts:['Dips assistés','Barre au front haltères','Extension triceps haltère']},
      {keys:['curl'],alts:['Curl incliné haltères','Curl marteau','Curl barre EZ']},
      {keys:['crunch poulie'],alts:['Crunch machine','Crunch au sol lesté','Sit-up décliné']},
      {keys:['pallof'],alts:['Planche latérale','Suitcase carry','Pallof élastique']},
      {keys:['leg extension'],alts:['Sissy squat assisté','Split squat talon surélevé','Step-up']},
      {keys:['leg curl'],alts:['Leg curl allongé','Leg curl glissé au sol','Nordic curl assisté']},
      {keys:['presse a cuisses'],alts:['Hack squat','Goblet squat','Fentes bulgares']}
    ];
    return (rules.find(r=>r.keys.some(k=>n.includes(norm(k))))?.alts||[]).slice(0,3);
  }

  function attachMuscleButtons(){
    const w=state.activeWorkout;
    if(!w)return;
    const cards=[...document.querySelectorAll('#exerciseList .exercise')];
    cards.forEach((card,index)=>{
      const actions=card.querySelector('.exercise-quick-actions');
      if(!actions||actions.querySelector('.mt-muscle-btn'))return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='ghost mt-muscle-btn';
      btn.textContent='◉ Muscles';
      btn.setAttribute('aria-label',`Voir les muscles travaillés par ${w.exercises[index]?.name||'cet exercice'}`);
      btn.onclick=()=>openMuscleModal(index);
      actions.prepend(btn);

      const feedback=loadFeedback();
      const item=feedback[keyForExercise(w.exercises[index]?.name)];
      if(item?.disliked){
        card.classList.add('mt-exercise-disliked');
        if(!card.querySelector('.mt-disliked-badge')){
          const badge=document.createElement('div');
          badge.className='mt-disliked-badge';
          badge.textContent='À remplacer la prochaine fois';
          card.querySelector('.exercise-title-main')?.appendChild(badge);
        }
      }
    });
  }

  function completedWorkoutHasData(w){
    if(!w)return false;
    return w.exercises.some(e=>e.cardio?.done || (e.sets||[]).some(s=>s.done));
  }

  function feedbackSelectionModal(onFinish){
    const w=state.activeWorkout;
    if(!w||w.testMode||!completedWorkoutHasData(w)){onFinish();return;}
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!modal||!title||!meta||!body){onFinish();return;}

    const saved=loadFeedback();
    const defaultDisliked=['pec fly','butterfly','bug fly'];
    const rows=w.exercises.map((e,i)=>{
      const k=keyForExercise(e.name);
      const already=!!saved[k]?.disliked || defaultDisliked.some(x=>norm(e.name).includes(norm(x)));
      return `<label class="mt-feedback-row">
        <input type="checkbox" data-feedback-index="${i}" ${already?'checked':''}>
        <span><strong>${escapeHtml(e.name)}</strong><small>${already?'Déjà marqué comme peu apprécié':'Coche si tu ne veux pas le refaire tel quel'}</small></span>
      </label>`;
    }).join('');

    title.textContent='Fin de séance';
    meta.textContent='Quels exercices ne t’ont pas plu ?';
    body.innerHTML=`
      <p class="mt-feedback-intro">Je les mémoriserai et je te proposerai des remplacements proches pour les prochaines séances.</p>
      <div class="mt-feedback-list">${rows}</div>
      <div class="mt-feedback-actions">
        <button type="button" class="ghost" id="mtFeedbackNone">Tout m’a plu</button>
        <button type="button" class="primary" id="mtFeedbackNext">Voir les alternatives</button>
      </div>`;

    document.getElementById('mtFeedbackNone').onclick=()=>{
      modal.classList.add('hidden');
      onFinish();
    };
    document.getElementById('mtFeedbackNext').onclick=()=>{
      const selected=[...body.querySelectorAll('[data-feedback-index]:checked')].map(x=>Number(x.dataset.feedbackIndex));
      if(!selected.length){modal.classList.add('hidden');onFinish();return;}
      selected.forEach(i=>{
        const e=w.exercises[i],k=keyForExercise(e.name);
        saved[k]={name:e.name,disliked:true,updatedAt:new Date().toISOString(),alternatives:alternativesFor(e.name)};
      });
      saveFeedback(saved);
      showAlternatives(selected,onFinish);
    };
    modal.classList.remove('hidden');
  }

  function showAlternatives(indices,onFinish){
    const w=state.activeWorkout;
    const modal=document.getElementById('sessionModal');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    const body=document.getElementById('sessionDetailBody');
    if(!w||!modal||!title||!meta||!body){onFinish();return;}
    title.textContent='Alternatives proposées';
    meta.textContent='À tester lors d’une prochaine séance';
    body.innerHTML=indices.map(i=>{
      const e=w.exercises[i];
      const alts=alternativesFor(e.name);
      return `<div class="mt-alt-card">
        <strong>${escapeHtml(e.name)}</strong>
        ${alts.length?`<div class="mt-alt-list">${alts.map(a=>`<span>${escapeHtml(a)}</span>`).join('')}</div>`:'<small>Je garderai cet exercice comme « à remplacer » et une alternative pourra être choisie manuellement.</small>'}
      </div>`;
    }).join('')+`<button type="button" class="primary mt-finish-after-feedback" id="mtFinishAfterFeedback">Enregistrer et terminer la séance</button>`;
    document.getElementById('mtFinishAfterFeedback').onclick=()=>{
      modal.classList.add('hidden');
      onFinish();
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-muscle-btn{font-size:11px;padding:7px 9px;white-space:nowrap}
    .mt-anatomy-wrap{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 14px}
    .mt-anatomy-figure{background:#0e1727;border:1px solid var(--line);border-radius:14px;padding:8px;text-align:center}
    .mt-anatomy-figure svg{display:block;width:100%;max-height:300px;background:transparent}
    .mt-anatomy-label{font-size:10px;font-weight:900;letter-spacing:.12em;color:var(--muted);margin-bottom:3px}
    .mt-body-outline{fill:rgba(148,163,184,.10);stroke:rgba(148,163,184,.42);stroke-width:2}
    .mt-muscle-base{fill:rgba(148,163,184,.12);stroke:rgba(148,163,184,.12);stroke-width:1}
    .mt-muscle-primary{fill:#ef4444;stroke:#fecaca;stroke-width:1.5}
    .mt-muscle-secondary{fill:#f59e0b;stroke:#fde68a;stroke-width:1.2;opacity:.88}
    .mt-muscle-legend{display:grid;gap:9px;margin-bottom:6px}
    .mt-muscle-legend>div{display:grid;grid-template-columns:14px 86px 1fr;gap:7px;align-items:start;background:var(--panel2);border-radius:11px;padding:9px;font-size:12px}
    .mt-legend-dot{width:11px;height:11px;border-radius:50%;margin-top:2px}.mt-legend-dot.primary{background:#ef4444}.mt-legend-dot.secondary{background:#f59e0b}
    .mt-feedback-intro{color:var(--muted);font-size:13px;line-height:1.45;margin-bottom:12px}
    .mt-feedback-list{display:grid;gap:8px}.mt-feedback-row{display:flex;align-items:center;gap:10px;margin:0;background:var(--panel2);border-radius:12px;padding:11px;color:var(--text)}
    .mt-feedback-row input{width:22px;height:22px;flex:none}.mt-feedback-row strong{display:block}.mt-feedback-row small{display:block;color:var(--muted);margin-top:2px}
    .mt-feedback-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
    .mt-alt-card{background:var(--panel2);border-radius:13px;padding:12px;margin-bottom:9px}.mt-alt-card>strong{display:block;margin-bottom:8px}.mt-alt-card small{color:var(--muted)}
    .mt-alt-list{display:grid;gap:6px}.mt-alt-list span{display:block;padding:8px 10px;border-radius:9px;background:#0e1727;font-size:13px}
    .mt-finish-after-feedback{width:100%;margin-top:6px;padding:12px}
    .mt-disliked-badge{display:inline-block;margin:6px 0 0;padding:4px 7px;border-radius:999px;background:rgba(245,158,11,.14);color:#fbbf24;font-size:10px;font-weight:800}
    @media (max-width:420px){.mt-anatomy-wrap{gap:7px}.mt-anatomy-figure{padding:5px}.mt-feedback-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){
      previousRender();
      attachMuscleButtons();
    };
    window.renderWorkout=renderWorkout;
  }

  // Intercept the existing Finish action without changing the workout data model.
  const finishBtn=document.getElementById('finishWorkoutBtn');
  if(finishBtn&&typeof finishBtn.onclick==='function'){
    const originalFinish=finishBtn.onclick;
    finishBtn.onclick=function(ev){
      const w=state.activeWorkout;
      if(!w||w.testMode){return originalFinish.call(this,ev);}
      feedbackSelectionModal(()=>originalFinish.call(finishBtn,ev));
    };
  }

  if(state.activeWorkout)attachMuscleButtons();
})();
