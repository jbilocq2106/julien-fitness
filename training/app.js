
const DBKEY='mt_data_v1';
let state={history:[],sessions:[],program:null,nextSessionId:'S1',activeWorkout:null,progressionOverrides:{},v4Migrated:false};
let timer={end:0,remaining:90,running:false,interval:null};
let workoutTick=null,wakeLock=null;
let shortcutHandled=false;
let showRir=localStorage.getItem('mt_show_rir')==='1';

function save(){localStorage.setItem(DBKEY,JSON.stringify({history:state.history,sessions:state.sessions,nextSessionId:state.nextSessionId,activeWorkout:state.activeWorkout,progressionOverrides:state.progressionOverrides||{},v4Migrated:!!state.v4Migrated}));}
function load(){
  try{const d=JSON.parse(localStorage.getItem(DBKEY)||'{}');Object.assign(state,d);}catch(e){}
  state.history=Array.isArray(state.history)?state.history:[];
  state.sessions=Array.isArray(state.sessions)?state.sessions:[];
  state.progressionOverrides=state.progressionOverrides||{};
}
async function loadProgram(){
  const old=state.program;
  try{state.program=await fetch('program.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json());}
  catch(e){ if(!old){document.getElementById('nextSessionName').textContent='Programme indisponible';return;} state.program=old; }
  applyProgressionOverrides();
  migrateV4SequenceOnce();
  renderProgram();renderHome();handleShortcutLaunch();
}
function fmt(n){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n||0)}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));if(id==='historyView')renderHistory();if(id==='statsView')renderStatsSelect();}
document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));

function getSession(id){return state.program?.sessions?.find(s=>s.id===id)||state.program?.sessions?.[0]}
function renderHome(){
  if(!state.program)return;
  const s=getSession(state.nextSessionId);
  document.getElementById('nextSessionName').textContent=s.name;
  document.getElementById('nextSessionFocus').textContent=s.focus;
  const workouts=uniqueWorkouts(state.history);
  document.getElementById('statSessions').textContent=workouts.length;
  const recent=workouts.slice(0,5);
  document.getElementById('recentList').innerHTML=recent.length?recent.map(w=>`<button class="list-item workout-link" data-workout="${encodeURIComponent(w.key)}"><div><strong>${esc(w.title)}</strong><small>${formatWorkoutDate(w.start_time)}</small></div><small>${w.sets} ${w.sets>1?'entrées':'entrée'} ›</small></button>`).join(''):'<div class="muted">Aucune séance importée.</div>';
  bindWorkoutLinks(document.getElementById('recentList'));
}

const EXERCISE_GUIDES=[
  {keys:['chest press','développé convergent','machine inclinée'],type:'press',muscles:'Pectoraux • triceps • deltoïde antérieur',cues:['Omoplates serrées et poitrine haute','Pousse sans décoller les épaules'],avoid:'Épaules en avant en fin de poussée'},
  {keys:['développé incliné haltères'],type:'inclinePress',muscles:'Haut des pectoraux • triceps',cues:['Règle le dossier à 30° (15–30° si besoin)','Descente lente, coudes sous contrôle'],avoid:'Banc à 45° ou plus si les épaules prennent le dessus'},
  {keys:['écartés poulie','pec fly','butterfly'],type:'fly',muscles:'Pectoraux',cues:['Coudes légèrement fléchis','Ramène les bras comme si tu entourais un tonneau'],avoid:'Chercher trop loin derrière le buste'},
  {keys:['tirage vertical'],type:'pulldown',muscles:'Grand dorsal • biceps • haut du dos',cues:['Poitrine sortie, épaules basses','Tire les coudes vers les côtes'],avoid:'Tirer derrière la nuque'},
  {keys:['rowing haltère'],type:'row1',muscles:'Dos • grand dorsal • biceps',cues:['Banc plat à 0° si tu prends appui dessus','Dos neutre et coude vers la hanche'],avoid:'Tourner le buste pour finir la répétition'},
  {keys:['rowing poitrine'],type:'row',muscles:'Milieu du dos • rhomboïdes • biceps',cues:['Banc à 45° (30–45° selon morphologie), poitrine appuyée','Tire les coudes vers l’arrière sans lever le buste'],avoid:'Décoller le torse du dossier'},
  {keys:['rowing poulie'],type:'row',muscles:'Milieu du dos • rhomboïdes • biceps',cues:['Poitrine stable','Serre les omoplates en fin de tirage'],avoid:'Se balancer en arrière'},
  {keys:['élévations latérales'],type:'lateral',muscles:'Deltoïde moyen',cues:['Bras souples, poignets neutres','Monte jusqu’à hauteur d’épaule'],avoid:'Hausser les trapèzes'},
  {keys:['face pull'],type:'facepull',muscles:'Arrière d’épaule • trapèzes • rotateurs externes',cues:['Tire vers le front','Écarte les mains en fin de mouvement'],avoid:'Charge trop lourde et mouvement raccourci'},
  {keys:['extension triceps corde','extension triceps barre'],type:'pushdown',muscles:'Triceps',cues:['Coudes collés au corps','Extension complète sans bouger les épaules'],avoid:'Laisser les coudes partir vers l’avant'},
  {keys:['extension triceps unilatérale'],type:'pushdown1',muscles:'Triceps',cues:['Épaule fixe','Contrôle la remontée'],avoid:'Tourner le buste'},
  {keys:['au-dessus de la tête corde'],type:'overheadTri',muscles:'Triceps • longue portion',cues:['Coudes orientés vers l’avant','Étirement contrôlé derrière la tête'],avoid:'Creuser fortement le bas du dos'},
  {keys:['dips assistés'],type:'dips',muscles:'Triceps • pectoraux',cues:['Buste plutôt vertical pour les triceps','Descends seulement dans une amplitude confortable'],avoid:'Épaules très basses ou douloureuses'},
  {keys:['curl marteau'],type:'curl',muscles:'Biceps • brachial • brachio-radial',cues:['Paumes face à face, épaules relâchées','Monte les avant-bras sans balancer le buste'],avoid:'Décoller les coudes ou casser les poignets'},
  {keys:['flexions poignets'],type:'generic',muscles:'Avant-bras • fléchisseurs des poignets',cues:['Avant-bras posés sur un banc ou sur les cuisses','Fléchis les poignets doucement avec une charge légère'],avoid:'Déplacer les avant-bras ou utiliser un élan'},
  {keys:['extensions poignets'],type:'generic',muscles:'Avant-bras • extenseurs des poignets',cues:['Paumes orientées vers le sol','Monte les mains lentement, avant-bras soutenus'],avoid:'Forcer avec une charge qui provoque une douleur au poignet'},
  {keys:['curl incliné'],type:'curl',muscles:'Biceps',cues:['Dossier à 45° (ou 60° si épaules sensibles)','Bras en arrière du buste, coudes immobiles'],avoid:'Remonter les coudes devant le buste'},
  {keys:['curl poulie','curl pupitre'],type:'curl',muscles:'Biceps • brachial',cues:['Mouvement contrôlé','Contracte sans casser les poignets'],avoid:'Balancer le buste'},
  {keys:['crunch poulie'],type:'crunch',muscles:'Grand droit • gainage abdominal',cues:['Enroule le sternum vers le bassin','Expire fortement en bas'],avoid:'Tirer seulement avec les bras'},
  {keys:['crunch inversé'],type:'reverseCrunch',muscles:'Abdominaux • bassin',cues:['Enroule le bassin vers le thorax','Mouvement lent, sans élan'],avoid:'Balancer les jambes'},
  {keys:['dead bug'],type:'deadbug',muscles:'Transverse • gainage profond',cues:['Plaque doucement les lombaires','Expire en allongeant bras/jambe'],avoid:'Laisser le bas du dos se creuser'},
  {keys:['pallof'],type:'pallof',muscles:'Transverse • obliques • anti-rotation',cues:['Bassin et épaules face devant','Éloigne les mains sans tourner'],avoid:'Laisser le câble faire pivoter le tronc'},
  {keys:['wood chop'],type:'woodchop',muscles:'Obliques • tronc',cues:['Tourne avec contrôle','Garde les côtes basses'],avoid:'Tirer uniquement avec les bras'},
  {keys:['vacuum'],type:'vacuum',muscles:'Transverse',cues:['Expire presque tout l’air','Rentre le ventre sans bloquer la gorge'],avoid:'Forcer longtemps en apnée'},
  {keys:['relevés de genoux'],type:'kneeRaise',muscles:'Abdominaux • fléchisseurs de hanche',cues:['Commence par rétroverser le bassin','Monte les genoux sans élan'],avoid:'Se balancer sur les appuis'},
  {keys:['planche rkc'],type:'plank',muscles:'Transverse • sangle abdominale',cues:['Serre fessiers et abdos fort','Coudes vers les pieds sans bouger'],avoid:'Creuser les lombaires'},
  {keys:['planche latérale'],type:'sidePlank',muscles:'Obliques • moyen fessier',cues:['Corps aligné','Pousse le sol avec l’avant-bras'],avoid:'Laisser le bassin tomber'},
  {keys:['presse à cuisses'],type:'legpress',muscles:'Quadriceps • fessiers • ischios',cues:['Pieds stables sur la plateforme','Descends tant que le bassin reste plaqué'],avoid:'Décoller le bassin ou verrouiller brutalement les genoux'},
  {keys:['leg curl'],type:'legcurl',muscles:'Ischio-jambiers',cues:['Bassin stable','Ramène les talons sans donner d’élan'],avoid:'Soulever les hanches'},
  {keys:['leg extension'],type:'legext',muscles:'Quadriceps',cues:['Genou aligné avec l’axe de la machine','Monte puis redescends lentement'],avoid:'Claquer les genoux en extension'},
  {keys:['mollets'],type:'calf',muscles:'Mollets',cues:['Amplitude complète','Marque une courte pause en haut'],avoid:'Faire des rebonds rapides'},
  {keys:['tapis'],type:'treadmill',muscles:'Cardio • jambes • dépense énergétique',cues:['Posture haute, mains libres si possible','Cadence régulière et respiration contrôlée'],avoid:'Se suspendre aux poignées'}
];

function normText(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function exerciseGuide(name){
  const n=normText(name);
  return EXERCISE_GUIDES.find(g=>g.keys.some(k=>n.includes(normText(k))))||
    {type:'generic',muscles:'Muscles principaux de l’exercice',cues:['Exécution lente et contrôlée','Garde 1–2 répétitions en réserve'],avoid:'Sacrifier la technique pour augmenter la charge'};
}
function benchAngleInfo(name){
  const n = normText(name);
  if (n.includes('developpe incline halteres')) return { angle:'30°', detail:'Dossier incliné de 30° depuis l’horizontale. Plage 15–30° selon ton confort d’épaule.' };
  if (n.includes('rowing poitrine appuyee')) return { angle:'45°', detail:'Banc réglable à 45° (possible 30–45°). Poitrine en appui, dos neutre.' };
  if (n.includes('rowing haltere unilateral')) return { angle:'0°', detail:'Banc plat pour l’appui main/genou, si tu utilises un banc.' };
  if (n.includes('curl incline')) return { angle:'45°', detail:'Dossier à 45° (jusqu’à 60° si tension d’épaule). Garde les bras derrière le buste.' };
  return null;
}
function historyAliases(name){
  const n=normText(name);
  const groups=[
    [['tirage vertical'],['tirage verticale poulie haute','tirage vertical']],
    [['pec fly','écartés poulie','chest press'],['butterfly (pec deck)','pec fly','écarté','chest press']],
    [['rowing haltère'],['rowing haltère','rowing haltere']],
    [['rowing poulie','rowing poitrine'],['rowing poulie assis','rowing poulie','rowing']],
    [['élévations latérales'],['élévation latérale','elevation laterale']],
    [['curl poulie'],['curl poulie basse corde','curl poulie']],
    [['extension triceps corde'],['extension triceps corde']],
    [['presse à cuisses'],['presse à cuisses','presse cuisses']]
  ];
  const hit=groups.find(([need])=>need.some(k=>n.includes(normText(k))));
  return hit?hit[1].map(normText):[n];
}
function recentExercisePerformance(name){
  const aliases=historyAliases(name);
  const rows=state.history.filter(r=>{
    const ex=normText(r.exercise_title);
    return aliases.some(a=>ex.includes(a)) && num(r.reps)>0;
  }).sort((a,b)=>dateVal(b.start_time)-dateVal(a.start_time));
  if(!rows.length)return null;
  const latestDate=rows[0].start_time;
  const same=rows.filter(r=>r.start_time===latestDate);
  const best=same.slice().sort((a,b)=>e1rm(num(b.weight_kg),num(b.reps))-e1rm(num(a.weight_kg),num(a.reps)))[0];
  return {date:latestDate,weight:num(best.weight_kg),reps:num(best.reps)};
}
function exerciseIllustration(type){
  const base=(body,arrow='')=>`<svg class="exercise-svg" viewBox="0 0 120 82" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${body}${arrow}</g>
  </svg>`;
  const head='<circle cx="60" cy="16" r="7"/>';
  const person=(arms,legs='<path d="M60 51 L48 73 M60 51 L72 73"/>')=>head+'<path d="M60 24 L60 51"/>'+arms+legs;
  const arrow=(d)=>`<path class="motion-arrow" d="${d}"/><path class="motion-arrow" d="M92 22 l-7 -4 M92 22 l-4 7"/>`;
  switch(type){
    case 'press': return base(person('<path d="M60 31 L43 38 L25 38 M60 31 L77 38 L95 38"/>'),'<path class="motion-arrow" d="M28 29 L18 29 M92 29 L102 29"/>');
    case 'inclinePress': return base('<path d="M30 62 L82 38"/>'+head.replace('cx="60" cy="16"','cx="46" cy="41"')+'<path d="M52 45 L70 38 L86 25 M52 45 L67 52 L87 43 M47 49 L36 66 M55 52 L52 72"/>','<path class="motion-arrow" d="M84 40 L96 26"/>');
    case 'fly': return base(person('<path d="M60 31 L35 26 M60 31 L85 26"/>'),'<path class="motion-arrow" d="M33 31 Q60 48 87 31"/>');
    case 'pulldown': return base('<path d="M25 7 L95 7"/>'+person('<path d="M60 31 L38 18 L27 8 M60 31 L82 18 L93 8"/>'),'<path class="motion-arrow" d="M103 12 L103 45"/>');
    case 'row': return base('<path d="M25 61 L91 61"/>'+head.replace('cx="60" cy="16"','cx="49" cy="30"')+'<path d="M55 34 L69 48 L89 48 M55 34 L46 52 L34 61 M58 39 L45 58 M65 45 L79 61"/>','<path class="motion-arrow" d="M91 39 L72 39"/>');
    case 'row1': return base('<path d="M25 58 L90 58"/>'+head.replace('cx="60" cy="16"','cx="50" cy="28"')+'<path d="M56 32 L72 42 L89 36 M56 32 L44 50 L31 58 M60 38 L50 58 M70 45 L78 58"/>','<path class="motion-arrow" d="M93 34 L78 24"/>');
    case 'lateral': return base(person('<path d="M60 31 L31 31 M60 31 L89 31"/>'),'<path class="motion-arrow" d="M28 45 Q25 33 31 21 M92 45 Q95 33 89 21"/>');
    case 'facepull': return base(person('<path d="M60 31 L42 25 L29 31 M60 31 L78 25 L91 31"/>'),'<path class="motion-arrow" d="M96 31 L80 27"/>');
    case 'pushdown': return base(person('<path d="M60 30 L46 35 L46 54 M60 30 L74 35 L74 54"/>'),'<path class="motion-arrow" d="M84 39 L84 63"/>');
    case 'overheadTri': return base(person('<path d="M60 30 L49 17 L55 5 M60 30 L71 17 L65 5"/>'),'<path class="motion-arrow" d="M83 30 L83 8"/>');
    case 'curl': return base(person('<path d="M60 31 L44 43 L35 54 M60 31 L76 43 L85 54"/>'),'<path class="motion-arrow" d="M29 58 Q37 44 43 39"/>');
    case 'crunch': return base('<path d="M25 66 L95 66"/>'+head.replace('cx="60" cy="16"','cx="48" cy="30"')+'<path d="M54 34 Q61 48 73 53 M73 53 L86 66 M73 53 L64 66 M55 36 L43 52"/>','<path class="motion-arrow" d="M42 22 Q57 28 63 41"/>');
    case 'reverseCrunch': return base('<path d="M20 68 L100 68"/>'+head.replace('cx="60" cy="16"','cx="33" cy="52"')+'<path d="M40 53 L60 55 L75 43 L90 34 M40 53 L53 68"/>','<path class="motion-arrow" d="M91 40 Q84 27 73 24"/>');
    case 'deadbug': return base('<path d="M15 68 L105 68"/>'+head.replace('cx="60" cy="16"','cx="42" cy="54"')+'<path d="M49 55 L62 52 L80 36 M60 53 L78 63 M60 53 L47 35"/>','<path class="motion-arrow" d="M83 34 L96 25"/>');
    case 'pallof': return base(person('<path d="M60 31 L78 36 L100 36 M60 31 L78 42 L100 42"/>'),'<path class="motion-arrow" d="M82 56 L82 18"/>');
    case 'woodchop': return base(person('<path d="M60 31 L78 20 L94 10 M60 31 L72 46 L88 61"/>'),'<path class="motion-arrow" d="M98 14 Q83 39 91 62"/>');
    case 'vacuum': return base(person('<path d="M60 31 L45 41 M60 31 L75 41"/>'),'<path class="motion-arrow" d="M45 45 L55 45 M75 45 L65 45"/>');
    case 'kneeRaise': return base('<path d="M27 7 L93 7"/>'+person('<path d="M60 30 L42 10 M60 30 L78 10"/>','<path d="M60 51 L47 55 L42 42 M60 51 L73 55 L78 42"/>'),'<path class="motion-arrow" d="M90 64 Q80 47 72 42"/>');
    case 'plank': return base('<path d="M20 65 L100 65"/>'+head.replace('cx="60" cy="16"','cx="91" cy="45"')+'<path d="M84 48 L57 51 L31 59 M57 51 L72 65 M35 59 L24 65"/>');
    case 'sidePlank': return base('<path d="M20 67 L100 67"/>'+head.replace('cx="60" cy="16"','cx="86" cy="30"')+'<path d="M80 36 L60 47 L36 59 M60 47 L72 67 M38 59 L27 67 M80 36 L72 18"/>');
    case 'legpress': return base('<path d="M22 68 L64 68 M86 14 L104 52"/>'+head.replace('cx="60" cy="16"','cx="38" cy="43"')+'<path d="M44 47 L58 55 L75 47 L88 34 M58 55 L45 68"/>','<path class="motion-arrow" d="M89 35 L99 23"/>');
    case 'legcurl': return base('<path d="M20 48 L85 48"/>'+head.replace('cx="60" cy="16"','cx="31" cy="34"')+'<path d="M38 37 L56 43 L72 49 L85 64 M56 43 L46 48"/>','<path class="motion-arrow" d="M90 64 Q84 50 75 47"/>');
    case 'legext': return base('<path d="M25 30 L70 30 L70 65"/>'+head.replace('cx="60" cy="16"','cx="35" cy="18"')+'<path d="M40 24 L53 38 L67 41 L86 41 M53 38 L43 30"/>','<path class="motion-arrow" d="M87 50 L103 42"/>');
    case 'calf': return base(person('<path d="M60 31 L44 44 M60 31 L76 44"/>'),'<path class="motion-arrow" d="M98 66 L98 48"/>');
    case 'dips': return base('<path d="M24 38 L45 38 M75 38 L96 38"/>'+person('<path d="M60 31 L45 39 M60 31 L75 39"/>'),'<path class="motion-arrow" d="M106 25 L106 55"/>');
    case 'treadmill': return base('<path d="M18 67 L102 67 L88 75 L28 75"/>'+head.replace('cx="60" cy="16"','cx="63" cy="23"')+'<path d="M61 31 L55 46 L42 57 M56 43 L76 50 M55 46 L66 61 M42 57 L28 67"/>','<path class="motion-arrow" d="M80 17 L98 17"/>');
    default: return base(person('<path d="M60 31 L42 43 M60 31 L78 43"/>'),'<path class="motion-arrow" d="M95 20 L95 50"/>');
  }
}

function isCardioName(name){return normText(name).includes('tapis')}
function videoUrlForExercise(name){
  const q=`${name} technique musculation exécution correcte`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
function exerciseFamily(name){
  const n=normText(name);
  const families=[
    ['tirage-vertical',['tirage vertical','tirage verticale poulie haute']],
    ['rowing-halteres',['rowing haltère','rowing haltere']],
    ['rowing-poulie',['rowing poulie','rowing poitrine']],
    ['elevations-laterales',['élévations latérales','élévation latérale','elevation laterale']],
    ['triceps-corde',['extension triceps corde','extension triceps barre v','extension triceps barre']],
    ['triceps-overhead',['au-dessus de la tête corde','extension triceps au-dessus']],
    ['curl-poulie',['curl poulie basse corde','curl poulie']],
    ['curl-pupitre',['curl pupitre']],
    ['chest-press',['chest press']],
    ['pec-fly',['pec fly','butterfly','écartés poulie','ecartes poulie']],
    ['incline-db-press',['développé incliné haltères','developpe incline halteres']],
    ['leg-press',['presse à cuisses','presse cuisses']],
    ['leg-curl',['leg curl']],
    ['leg-extension',['leg extension']]
  ];
  const hit=families.find(([,keys])=>keys.some(k=>n.includes(normText(k))));
  return hit?hit[0]:n.replace(/[^a-z0-9]+/g,'-');
}
function repUpper(target){
  const m=String(target||'').match(/(\d+)\s*[–-]\s*(\d+)/);
  if(m)return Number(m[2]);
  const n=String(target||'').match(/(\d+)/);
  return n?Number(n[1]):null;
}
function roundToHalf(v){return Math.round(v*2)/2}
function historicalNextWeight(name,current){
  const aliases=historyAliases(name);
  const vals=[...new Set(state.history.filter(r=>{
    const ex=normText(r.exercise_title);
    return aliases.some(a=>ex.includes(a));
  }).map(r=>num(r.weight_kg)).filter(v=>v>current+0.001))].sort((a,b)=>a-b);
  if(vals.length && vals[0] <= current*1.20)return vals[0];

  const n=normText(name);
  let step;
  if(n.includes('haltère')||n.includes('haltere')) step=current<12?1:2;
  else if(current<10) step=1;
  else if(current<30) step=2;
  else step=roundToHalf(current*0.05);

  return roundToHalf(current+Math.max(step,0.5));
}
function applyProgressionOverrides(){
  if(!state.program)return;
  state.program.sessions.forEach(session=>session.exercises.forEach(e=>{
    if(isCardioName(e.name))return;
    const family=exerciseFamily(e.name);
    const override=num(state.progressionOverrides?.[family]);
    if(!override)return;

    const weights=e.sets.map(s=>num(s.weight)).filter(v=>v>0);
    if(!weights.length)return;
    const max=Math.max(...weights);

    e.sets.forEach(s=>{
      const w=num(s.weight);
      if(w>0 && Math.abs(w-max)<0.001)s.weight=override;
    });
    e.autoTarget=override;
  }));
}
function deriveNextSessionFromHistory(){
  const latest=uniqueWorkouts(state.history)[0];
  if(!latest)return 'S1';
  const t=normText(latest.title);
  if(/^1\b/.test(t)||t.includes('seance 1'))return 'S2';
  if(/^2\b/.test(t)||t.includes('seance 2'))return 'S3';
  if(/^3\b/.test(t)||t.includes('seance 3'))return 'S4';
  if(/^4\b/.test(t)||t.includes('seance 4')||t.includes('full body'))return 'S1';
  return state.nextSessionId||'S1';
}
function migrateV4SequenceOnce(){
  if(state.v4Migrated)return;
  state.nextSessionId=deriveNextSessionFromHistory();
  state.v4Migrated=true;
  save();
}

function parseCardioDefaults(e){
  const note=String(e.note||'');
  const speed=(note.match(/([\d,.]+)\s*km\/h/i)||[])[1];
  const incline=(note.match(/([\d,.]+)\s*%/)||[])[1];
  return {
    speed:speed?String(speed).replace(',','.'):'',
    incline:incline?String(incline).replace(',','.'):'',
    duration:e.cardioDuration?String(e.cardioDuration):'',
    distance:'',
    done:false
  };
}
function cardioSummary(row){
  const duration=num(row.duration_seconds);
  const km=num(row.distance_km);
  const speed=num(row.speed_kmh) || (duration>0&&km>0 ? km/(duration/3600) : 0);
  let incline=num(row.incline_percent);

  if(!incline){
    const m=String(row.exercise_notes||'').match(/([\d,.]+)\s*%/);
    if(m)incline=num(m[1]);
  }

  const parts=[];
  if(incline)parts.push(`${incline}% inclinaison`);
  if(speed)parts.push(`${speed.toFixed(1).replace('.',',')} km/h`);
  if(duration)parts.push(`${Math.round(duration/60)} min`);
  if(km)parts.push(`${km.toFixed(2).replace('.',',')} km`);
  return parts.join(' • ')||'Cardio enregistré';
}
function recalculateProgressionFromWorkout(w){
  const changes=[];

  w.exercises.forEach(e=>{
    if(isCardioName(e.name))return;
    const done=e.sets.filter(s=>s.done && num(s.weight)>0 && num(s.reps)>0);
    if(!done.length)return;

    const maxWeight=Math.max(...done.map(s=>num(s.weight)));
    const topSets=done.filter(s=>Math.abs(num(s.weight)-maxWeight)<0.001);

    const valid=topSets.every(s=>{
      const upper=repUpper(s.targetReps);
      const rir=String(s.rir??'').trim()===''?null:num(s.rir);
      return (!upper || num(s.reps)>=upper) && (rir===null || rir>=1);
    });

    if(!valid)return;

    const next=historicalNextWeight(e.name,maxWeight);
    if(!(next>maxWeight))return;

    const fam=exerciseFamily(e.name);
    const before=num(state.progressionOverrides[fam]);

    if(next>before){
      state.progressionOverrides[fam]=next;
      changes.push(`${e.name}: ${maxWeight} → ${next} kg`);
    }
  });

  return changes;
}
function formatWorkoutDate(s){
  const d=new Date(s);
  if(Number.isNaN(d.getTime()))return String(s||'');
  return d.toLocaleString('fr-FR',{
    day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
  });
}
function formatDurationSeconds(sec){
  sec=num(sec);
  if(!sec)return '';
  const m=Math.round(sec/60);
  return m>=60?`${Math.floor(m/60)} h ${m%60} min`:`${m} min`;
}
function bindWorkoutLinks(root){
  if(!root)return;
  root.querySelectorAll('[data-workout]').forEach(btn=>{
    btn.onclick=()=>openWorkoutDetail(decodeURIComponent(btn.dataset.workout));
  });
}
function openWorkoutDetail(key){
  const rows=state.history.filter(r=>`${r.title||''}|${r.start_time||''}`===key);
  if(!rows.length)return;

  const first=rows[0];
  const start=dateVal(first.start_time);
  const end=Math.max(...rows.map(r=>dateVal(r.end_time)||0));

  document.getElementById('sessionDetailTitle').textContent=first.title||'Séance';

  const meta=[formatWorkoutDate(first.start_time)];
  if(end>start)meta.push(formatDurationSeconds((end-start)/1000));
  document.getElementById('sessionDetailMeta').textContent=meta.join(' • ');

  const byEx=new Map();
  rows.forEach(r=>{
    const n=r.exercise_title||'Exercice';
    if(!byEx.has(n))byEx.set(n,[]);
    byEx.get(n).push(r);
  });

  document.getElementById('sessionDetailBody').innerHTML=[...byEx.entries()].map(([name,sets])=>{
    const cardio=sets.some(r=>
      r.set_type==='cardio' ||
      num(r.distance_km)>0 ||
      num(r.duration_seconds)>0 ||
      isCardioName(name)
    );

    if(sets.some(r=>r.set_type==='timed')){
      return '<div class="history-exercise"><h3>'+esc(name)+'</h3><div class="timed-history">'+
        sets.map((r,i)=>'<div class="timed-history-row"><span>Série '+(i+1)+'</span><strong>'+timeFmt(Math.round(num(r.duration_seconds)))+'</strong></div>').join('')+
        '</div></div>';
    }
    if(cardio){
      return `<div class="history-exercise"><h3>${esc(name)}</h3><div class="cardio-history">${esc(cardioSummary(sets[0]))}</div></div>`;
    }

    return `<div class="history-exercise">
      <h3>${esc(name)}</h3>
      <div class="history-set-head ${showRir?'':'history-rir-hidden'}"><span>#</span><span>Charge</span><span>Reps</span>${showRir?'<span>RIR/RPE</span>':''}</div>
      ${sets.map((r,i)=>`<div class="history-set-row ${showRir?'':'history-rir-hidden'}">
        <span>${i+1}</span>
        <strong>${num(r.weight_kg)?num(r.weight_kg)+' kg':'—'}</strong>
        <span>${num(r.reps)||'—'}</span>
        ${showRir?`<span>${r.rir!=null&&r.rir!==''?esc(r.rir):(r.rpe?esc(r.rpe):'—')}</span>`:''}
      </div>`).join('')}
    </div>`;
  }).join('');

  document.getElementById('sessionModal').classList.remove('hidden');
}

function exerciseInfoCard(e){
  const g=exerciseGuide(e.name);
  const bench=benchAngleInfo(e.name);
  const recent=recentExercisePerformance(e.name);
  const target=e.sets?.[0];
  const targetText=target?(target.weight?`${target.weight} kg × ${target.reps}`:`${target.reps}`):'—';
  const recentText=recent?(recent.weight?`${recent.weight} kg × ${recent.reps}`:`${recent.reps} reps`):'Pas encore de donnée';
  return `<div class="exercise-guide v4-guide">
    <div class="video-panel">
      <a class="video-demo" href="${videoUrlForExercise(e.name)}" target="_blank" rel="noopener">
        <span class="video-play">▶</span>
        <span><strong>Voir la démonstration</strong><small>vidéos techniques pour ${esc(e.name)}</small></span>
      </a>
    </div>
    <div class="exercise-guide-body">
      <div class="muscle-chip">${esc(g.muscles)}</div>
      <div class="guide-pair"><span>Dernier</span><strong>${esc(recentText)}</strong></div>
      <div class="guide-pair"><span>Objectif</span><strong>${esc(targetText)}</strong></div>
      ${e.autoTarget?`<div class="auto-target">Objectif ajusté automatiquement</div>`:''}
    </div>
    ${bench?`<div class="bench-angle-tip"><strong>📐 Banc : ${esc(bench.angle)}</strong><small>${esc(bench.detail)}</small></div>`:''}
    <button class="technique-toggle ghost" type="button">Technique</button>
    <div class="technique-details hidden">
      <div>✓ ${esc(g.cues[0])}</div>
      <div>✓ ${esc(g.cues[1])}</div>
      <div class="avoid">À éviter : ${esc(g.avoid)}</div>
    </div>
  </div>`;
}
function handleShortcutLaunch(){
  if(shortcutHandled||!state.program)return;
  shortcutHandled=true;
  const params=new URLSearchParams(location.search);
  const start=params.get('start');
  if(!start)return;
  history.replaceState({},'',location.pathname);
  if(start==='next')startWorkout(state.nextSessionId);
  else if(state.program.sessions.some(s=>s.id===start))startWorkout(start);
}

function renderProgram(){
  if(!state.program)return;
  document.getElementById('programCards').innerHTML=state.program.sessions.map(s=>`<div class="card session-card">
    <div class="section-title">
      <div><h3>${esc(s.name)}</h3><div class="muted">${esc(s.focus)}</div>${s.day_hint?`<div class="day-chip">${esc(s.day_hint)}</div>`:''}</div>
      <div class="session-actions">
        <button class="ghost test-start" onclick="startWorkout('${s.id}',true)">Tester</button>
        <button class="primary" onclick="startWorkout('${s.id}',false)">Démarrer</button>
      </div>
    </div>
    ${s.exercises.map(e=>{
      const g=exerciseGuide(e.name);
      const target=e.sets?.map(x=>x.weight?`${x.weight}×${x.reps}`:x.reps).join(' / ')||'';
      return `<div class="exercise-row program-exercise-row">
        <div class="video-mini">▶</div>
        <div class="program-exercise-main"><span>${esc(e.name)}</span><small>${esc(g.muscles)}</small><small class="target-line">${esc(target)}</small></div>
        <div class="program-row-badges">${e.superset?`<span class="ss-chip">SS ${esc(e.superset)}</span>`:''}<span class="badge">${e.rest?e.rest+'s':'—'}</span></div>
      </div>`;
    }).join('')}
  </div>`).join('');
}function startWorkout(id,testMode=false){
  const s=getSession(id); if(!s)return;
  const groups={};
  s.exercises.forEach(e=>{if(e.superset)groups[e.superset]=['S7','S8'].includes(s.id);});
  state.activeWorkout={
    id:s.id,name:s.name,started:Date.now(),testMode:!!testMode,supersetEnabled:groups,
    exercises:s.exercises.map(e=>({
      name:e.name,note:e.note||'',rest:e.rest,superset:e.superset||null,autoTarget:e.autoTarget||null,
      cardio:isCardioName(e.name)?parseCardioDefaults(e):null,
      sets:e.sets.map((x,i)=>({i:i+1,targetReps:x.reps,targetWeight:x.weight,weight:x.weight??'',reps:'',rir:'',done:false}))
    }))
  };
  save();renderWorkout();showView('workoutView');startWorkoutClock();
}
window.startWorkout=startWorkout;

function moveExercise(index,delta){
  const w=state.activeWorkout;if(!w)return;
  const next=index+delta;
  if(next<0||next>=w.exercises.length)return;
  [w.exercises[index],w.exercises[next]]=[w.exercises[next],w.exercises[index]];
  save();renderWorkout();
}
function toggleSuperset(group){
  const w=state.activeWorkout;if(!w||!group)return;
  w.supersetEnabled=w.supersetEnabled||{};
  w.supersetEnabled[group]=!w.supersetEnabled[group];
  save();renderWorkout();
}
function shouldStartRestAfter(exerciseIndex){
  const w=state.activeWorkout,e=w?.exercises?.[exerciseIndex];
  if(!e?.superset||!w.supersetEnabled?.[e.superset])return true;
  const members=w.exercises.map((x,i)=>x.superset===e.superset?i:-1).filter(i=>i>=0);
  return exerciseIndex===Math.max(...members);
}

function renderWorkout(){
  const w=state.activeWorkout;if(!w)return;
  document.getElementById('workoutTitle').textContent=w.name;
  document.getElementById('testModeBanner').classList.toggle('hidden',!w.testMode);
  const rirBtn=document.getElementById('rirToggleBtn');
  if(rirBtn)rirBtn.textContent=showRir?'Masquer RIR':'Afficher RIR';

  document.getElementById('exerciseList').innerHTML=w.exercises.map((e,ei)=>{
    const cardio=isCardioName(e.name);
    return `<div class="exercise">
      <div class="exercise-title-row">
        <div class="exercise-title-main">
          <div class="order-controls">
            <button class="order-btn ghost" data-move="${ei}" data-delta="-1" ${ei===0?'disabled':''}>↑</button>
            <button class="order-btn ghost" data-move="${ei}" data-delta="1" ${ei===w.exercises.length-1?'disabled':''}>↓</button>
          </div>
          <div><h3>${esc(e.name)}</h3>${e.note?`<div class="exercise-note">${esc(e.note)}</div>`:''}</div>
        </div>
        <div class="exercise-quick-actions">
          ${e.superset?`<button class="ss-toggle ${w.supersetEnabled?.[e.superset]?'primary':'ghost'}" data-ss="${esc(e.superset)}">SS ${esc(e.superset)} ${w.supersetEnabled?.[e.superset]?'ON':'OFF'}</button>`:''}
          ${e.rest&&!cardio?`<button class="rest-now secondary" data-rest="${e.rest}">Repos ${e.rest}s</button>`:''}
        </div>
      </div>

      ${e.superset?`<div class="superset-note">${w.supersetEnabled?.[e.superset]?'Superset actif : le repos démarre après le 2e exercice.':'Superset proposé, mais facultatif.'}</div>`:''}
      ${exerciseInfoCard(e)}

      ${cardio?`
        <div class="cardio-grid" data-e="${ei}">
          <label>Inclinaison %<input inputmode="decimal" data-cardio="incline" value="${esc(e.cardio?.incline||'')}" placeholder="12"></label>
          <label>Vitesse km/h<input inputmode="decimal" data-cardio="speed" value="${esc(e.cardio?.speed||'')}" placeholder="5,5"></label>
          <label>Durée min<input inputmode="decimal" data-cardio="duration" value="${esc(e.cardio?.duration||'')}" placeholder="40"></label>
          <label>Distance km<input inputmode="decimal" data-cardio="distance" value="${esc(e.cardio?.distance||'')}" placeholder="3,7"></label>
           <label>FC moyenne (bpm)<input type="number" inputmode="numeric" min="40" max="230" data-cardio="avgHr" value="${esc(e.cardio?.avgHr||'')}" placeholder="facultatif"></label>
        </div>
        <button class="cardio-done ${e.cardio?.done?'primary':'secondary'}" data-cardio-done="${ei}">${e.cardio?.done?'✓ Cardio validé':'Valider le cardio'}</button>
      `:`
        <div class="set-head ${showRir?'v4-set-head':'rir-hidden-head'}">
          <span>Série</span><span>kg</span><span>reps</span>${showRir?'<span>RIR</span>':''}<span></span>
        </div>
        ${e.sets.map((s,si)=>`<div class="set-row ${showRir?'v4-set-row':'rir-hidden-row'} ${s.done?'completed':''}" data-e="${ei}" data-s="${si}">
          <div class="set-num">${s.i}</div>
          <input inputmode="decimal" placeholder="${s.targetWeight??'kg'}" value="${s.weight}" data-field="weight" aria-label="Poids série ${s.i}">
          <input inputmode="numeric" placeholder="${esc(s.targetReps)}" value="${s.reps}" data-field="reps" aria-label="Répétitions série ${s.i}">
          ${showRir?`<input inputmode="decimal" placeholder="2" value="${s.rir??''}" data-field="rir" aria-label="RIR série ${s.i}">`:''}
          <button class="done">${s.done?'✓':'OK'}</button>
        </div>`).join('')}
      `}
    </div>`;
  }).join('');

  document.querySelectorAll('.set-row input').forEach(inp=>inp.onchange=(ev)=>{
    const row=ev.target.closest('.set-row');
    state.activeWorkout.exercises[+row.dataset.e].sets[+row.dataset.s][ev.target.dataset.field]=ev.target.value;
    save();
  });
  document.querySelectorAll('.set-row .done').forEach(btn=>btn.onclick=(ev)=>{
    const row=ev.target.closest('.set-row'),ei=+row.dataset.e,e=state.activeWorkout.exercises[ei],s=e.sets[+row.dataset.s];
    s.done=!s.done;save();renderWorkout();
    if(s.done&&e.rest&&shouldStartRestAfter(ei))startTimer(e.rest);
  });
  document.querySelectorAll('[data-cardio]').forEach(inp=>inp.onchange=(ev)=>{
    const box=ev.target.closest('.cardio-grid'),e=state.activeWorkout.exercises[+box.dataset.e];
    e.cardio[ev.target.dataset.cardio]=ev.target.value;save();
  });
  document.querySelectorAll('[data-cardio-done]').forEach(btn=>btn.onclick=()=>{
    const e=state.activeWorkout.exercises[+btn.dataset.cardioDone];
    e.cardio.done=!e.cardio.done;save();renderWorkout();
  });
  document.querySelectorAll('.rest-now').forEach(btn=>btn.onclick=()=>startTimer(+btn.dataset.rest));
  document.querySelectorAll('.technique-toggle').forEach(btn=>btn.onclick=()=>{
    const details=btn.closest('.exercise-guide').querySelector('.technique-details');
    details.classList.toggle('hidden');
    btn.textContent=details.classList.contains('hidden')?'Technique':'Masquer';
  });
  document.querySelectorAll('.order-btn').forEach(btn=>btn.onclick=()=>moveExercise(+btn.dataset.move,+btn.dataset.delta));
  document.querySelectorAll('.ss-toggle').forEach(btn=>btn.onclick=()=>toggleSuperset(btn.dataset.ss));
}
function startWorkoutClock(){clearInterval(workoutTick);workoutTick=setInterval(()=>{if(!state.activeWorkout)return;document.getElementById('workoutElapsed').textContent=timeFmt(Math.floor((Date.now()-state.activeWorkout.started)/1000));},1000)}

function cancelActiveWorkout(){
  if(!state.activeWorkout)return;
  if(!confirm(state.activeWorkout.testMode?'Quitter ce test ? Rien ne sera enregistré.':'Annuler cette séance ? Toutes les saisies de cette séance en cours seront perdues.'))return;
  state.activeWorkout=null;save();clearInterval(workoutTick);renderHome();showView('homeView');
}
document.getElementById('cancelWorkoutBtn').onclick=cancelActiveWorkout;

document.getElementById('finishWorkoutBtn').onclick=()=>{
  const w=state.activeWorkout;if(!w)return;

  if(w.testMode){
    if(!confirm('Terminer le mode test ? Rien ne sera ajouté à l’historique et aucune charge ne sera modifiée.'))return;
    state.activeWorkout=null;save();clearInterval(workoutTick);renderHome();showView('homeView');
    return;
  }

  const completedSets=w.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done&&(num(s.reps)>0||num(s.durationSeconds)>0)).length,0);
  const completedCardio=w.exercises.filter(e=>e.cardio?.done).length;
  if(completedSets+completedCardio===0){
    if(confirm('Aucune série ni cardio validé. Annuler simplement cette séance ?'))cancelActiveWorkout();
    return;
  }

  const end=new Date(),start=new Date(w.started),title=w.name;
  w.exercises.forEach((e,exerciseIndex)=>{
    if(e.cardio?.done){
      const durationMin=num(e.cardio.duration),distance=num(e.cardio.distance),speed=num(e.cardio.speed),incline=num(e.cardio.incline);
      state.history.unshift({
        title,start_time:start.toISOString(),end_time:end.toISOString(),description:'My Training',
        exercise_title:e.name,superset_id:'',exercise_notes:e.note,set_index:0,set_type:'cardio',
        weight_kg:0,reps:0,distance_km:distance||'',duration_seconds:durationMin?durationMin*60:'',
        speed_kmh:speed||'',incline_percent:incline||'',avg_hr_bpm:(num(e.cardio.avgHr)>=40&&num(e.cardio.avgHr)<=230)?num(e.cardio.avgHr):'',rpe:'',rir:'',exercise_order:exerciseIndex+1
      });
    }
    e.sets.filter(s=>s.done&&(num(s.reps)>0||num(s.durationSeconds)>0)).forEach((s,i)=>state.history.unshift({
      title,start_time:start.toISOString(),end_time:end.toISOString(),description:'My Training',
      exercise_title:e.name,superset_id:e.superset||'',exercise_notes:e.note,set_index:i,set_type:num(s.durationSeconds)>0?'timed':'normal',
      weight_kg:num(s.durationSeconds)>0?0:num(s.weight),reps:num(s.durationSeconds)>0?0:num(s.reps),distance_km:'',duration_seconds:num(s.durationSeconds)>0?Math.round(num(s.durationSeconds)):'',speed_kmh:'',incline_percent:'',
      rpe:'',rir:String(s.rir??''),exercise_order:exerciseIndex+1
    }));
  });

  const changes=recalculateProgressionFromWorkout(w);
  state.sessions.unshift({title,start:start.toISOString(),end:end.toISOString(),completedSets,completedCardio,exerciseOrder:w.exercises.map(e=>e.name)});
  // Les séances spéciales à la demande ne perturbent jamais la rotation S1–S4.
  const ids=state.program.sessions.filter(s=>/^S[1-4]$/.test(s.id)).map(s=>s.id);
  const idx=ids.indexOf(w.id);
  if(idx>=0)state.nextSessionId=ids[(idx+1)%ids.length];
  state.activeWorkout=null;save();clearInterval(workoutTick);applyProgressionOverrides();renderProgram();renderHome();showView('homeView');

  if(changes.length){
    alert(`Progression mise à jour :\n\n${changes.join('\n')}\n\nLes autres séances utilisant les mêmes mouvements ont été actualisées.`);
  }
};

function uniqueWorkouts(rows){
  const m=new Map();
  rows.forEach(r=>{
    const key=(r.title||'')+'|'+(r.start_time||'');
    if(!m.has(key))m.set(key,{key,title:r.title,start_time:r.start_time,sets:0,rows:[]});
    const w=m.get(key);w.sets++;w.rows.push(r);
  });
  return [...m.values()].sort((a,b)=>dateVal(b.start_time)-dateVal(a.start_time));
}
function dateVal(s){const d=Date.parse(s);if(!Number.isNaN(d))return d;return 0}
function renderHistory(){
  const ws=uniqueWorkouts(state.history);
  document.getElementById('historyList').innerHTML=ws.length?ws.map(w=>`<button class="list-item workout-link history-workout" data-workout="${encodeURIComponent(w.key)}"><div><strong>${esc(w.title)}</strong><small>${formatWorkoutDate(w.start_time)}</small></div><small>${w.sets} ${w.sets>1?'entrées':'entrée'} ›</small></button>`).join(''):'<div class="muted">Aucun historique.</div>';
  bindWorkoutLinks(document.getElementById('historyList'));
}
document.getElementById('exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify({history:state.history,sessions:state.sessions,nextSessionId:state.nextSessionId,progressionOverrides:state.progressionOverrides},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='my-training-backup.json';a.click();URL.revokeObjectURL(a.href);
};
let statsMetric='weight';

function renderStatsSelect(){
  const names=[...new Set(state.history.filter(r=>num(r.reps)>0).map(r=>r.exercise_title).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  const sel=document.getElementById('exerciseSelect');
  const prev=sel.value;
  sel.innerHTML=names.map(n=>`<option>${esc(n)}</option>`).join('');
  if(names.includes(prev))sel.value=prev;
  sel.onchange=renderExerciseStats;
  document.querySelectorAll('.metric-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.metric===statsMetric);
    btn.onclick=()=>{
      statsMetric=btn.dataset.metric;
      document.querySelectorAll('.metric-btn').forEach(b=>b.classList.toggle('active',b===btn));
      renderExerciseStats();
    };
  });
  renderExerciseStats();
}

function exerciseSessions(name){
  const rows=state.history.filter(r=>r.exercise_title===name&&num(r.reps)>0);
  const byWorkout=new Map();
  rows.forEach(r=>{
    const key=r.start_time||'';
    if(!byWorkout.has(key))byWorkout.set(key,{date:key,rows:[]});
    byWorkout.get(key).rows.push(r);
  });
  return [...byWorkout.values()].sort((a,b)=>dateVal(a.date)-dateVal(b.date)).map(w=>{
    const sets=w.rows.map(r=>({
      weight:num(r.weight_kg),
      reps:num(r.reps),
      e1rm:e1rm(num(r.weight_kg),num(r.reps)),
      volume:num(r.weight_kg)*num(r.reps)
    }));
    const bestSet=sets.slice().sort((a,b)=>(b.e1rm-a.e1rm)||(b.weight-a.weight)||(b.reps-a.reps))[0]||{weight:0,reps:0,e1rm:0,volume:0};
    return {
      date:w.date,
      bestWeight:Math.max(0,...sets.map(s=>s.weight)),
       bestReps:Math.max(0,...sets.map(s=>s.reps)),
      best1rm:Math.max(0,...sets.map(s=>s.e1rm)),
      volume:sets.reduce((a,s)=>a+s.volume,0),
      bestSet
    };
  });
}

function metricValue(s){
  if(statsMetric==='e1rm')return s.best1rm;
  if(statsMetric==='volume')return s.volume;
   if(statsMetric==='reps')return s.bestReps;
  return s.bestWeight;
}
function metricUnit(){return statsMetric==='reps'?'reps':'kg'}
function metricLabel(){return statsMetric==='reps'?'Plus grand nombre de répétitions par séance':statsMetric==='volume'?'Volume par séance':statsMetric==='e1rm'?'Meilleur 1RM estimé par séance':'Meilleure charge par séance'}
function fmtMetric(v){return statsMetric==='volume'?fmt(v):Number(v||0).toFixed(statsMetric==='e1rm'?1:0)}
function shortDate(s){
  const d=new Date(s);if(Number.isNaN(d.getTime()))return '';
  return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
}
function pctChange(a,b){
  if(!a)return null;
  return ((b-a)/a)*100;
}

function renderExerciseStats(){
  const name=document.getElementById('exerciseSelect').value;
  const rows=state.history.filter(r=>r.exercise_title===name&&num(r.reps)>0);
  const sessions=exerciseSessions(name);
  if(!rows.length||!sessions.length){
    document.getElementById('exerciseStats').innerHTML='<div class="muted">Pas de données</div>';
    document.getElementById('exerciseSummary').innerHTML='';
    drawChart([]);
    return;
  }

  const bestWeight=Math.max(...rows.map(r=>num(r.weight_kg)));
  const best1rm=Math.max(...rows.map(r=>e1rm(num(r.weight_kg),num(r.reps))));
  const totalVolume=rows.reduce((a,r)=>a+num(r.weight_kg)*num(r.reps),0);
  document.getElementById('exerciseStats').innerHTML=
    `<div><strong>${bestWeight} kg</strong><small>meilleure charge</small></div>`+
    `<div><strong>${best1rm.toFixed(1)} kg</strong><small>1RM estimé max</small></div>`+
    `<div><strong>${fmt(totalVolume)}</strong><small>volume total</small></div>`;

  const latest=sessions[sessions.length-1];
  const previous=sessions.length>1?sessions[sessions.length-2]:null;
  const first=sessions[0];
  const latestVal=metricValue(latest);
  const prevVal=previous?metricValue(previous):null;
  const firstVal=metricValue(first);
  const vsPrev=previous?pctChange(prevVal,latestVal):null;
  const sinceFirst=sessions.length>1?pctChange(firstVal,latestVal):null;
  const previousBest=sessions.length>1?Math.max(...sessions.slice(0,-1).map(metricValue)):0;
  const isPR=sessions.length>1&&latestVal>previousBest+1e-9;

  const diffClass=vsPrev==null?'':vsPrev>=0?'progress-positive':'progress-negative';
  const diffText=vsPrev==null?'—':`${vsPrev>=0?'+':''}${vsPrev.toFixed(1)} %`;
  const overallClass=sinceFirst==null?'':sinceFirst>=0?'progress-positive':'progress-negative';
  const overallText=sinceFirst==null?'—':`${sinceFirst>=0?'+':''}${sinceFirst.toFixed(1)} %`;

  document.getElementById('exerciseSummary').innerHTML=
    `<div class="progress-box"><small>Dernière performance</small><strong>${latest.bestSet.weight} kg × ${latest.bestSet.reps}${isPR?'<span class="pr-badge">PR</span>':''}</strong><small>${shortDate(latest.date)}</small></div>`+
    `<div class="progress-box"><small>Séances sur cet exercice</small><strong>${sessions.length}</strong><small>${rows.length} séries</small></div>`+
    `<div class="progress-box"><small>Vs séance précédente</small><strong class="${diffClass}">${diffText}</strong><small>${metricLabel().toLowerCase()}</small></div>`+
    `<div class="progress-box"><small>Depuis la 1re séance</small><strong class="${overallClass}">${overallText}</strong><small>${shortDate(first.date)} → ${shortDate(latest.date)}</small></div>`;

  document.getElementById('chartMetricTitle').textContent=metricLabel();
  document.getElementById('chartUnit').textContent=metricUnit();
  drawChart(sessions.slice(-20).map(s=>({value:metricValue(s),date:s.date})));
}

function drawChart(points){
  const svg=document.getElementById('progressChart');
  if(points.length<2){
    svg.innerHTML='<text x="14" y="82">Pas assez de données pour la courbe.</text>';
    return;
  }
  const vals=points.map(p=>p.value);
  const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
  const left=20,right=324,top=22,bottom=128;
  const pts=points.map((p,i)=>[
    left+i*((right-left)/(points.length-1)),
    bottom-(p.value-min)/span*(bottom-top)
  ]);
  const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const mid=Math.floor((points.length-1)/2);
  const maxLabel=statsMetric==='volume'?fmt(max):max.toFixed(statsMetric==='e1rm'?1:0);
  const minLabel=statsMetric==='volume'?fmt(min):min.toFixed(statsMetric==='e1rm'?1:0);
  const circles=pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===pts.length-1?4:2.6}" fill="#22c55e"/>`).join('');
  svg.innerHTML=
    `<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#334155"/>`+
    `<path d="${d}" fill="none" stroke="#22c55e" stroke-width="3"/>${circles}`+
    `<text x="${left}" y="14">${maxLabel}</text>`+
    `<text x="${left}" y="${bottom+14}">${minLabel}</text>`+
    `<text x="${left}" y="162">${shortDate(points[0].date)}</text>`+
    `<text x="${pts[mid][0]}" y="162" text-anchor="middle">${shortDate(points[mid].date)}</text>`+
    `<text x="${right}" y="162" text-anchor="end">${shortDate(points[points.length-1].date)}</text>`;
}
function e1rm(w,r){return w>0&&r>0?w*(1+r/30):0}function num(v){const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function timeFmt(s){s=Math.max(0,s|0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function timerRender(){const left=timer.running?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer.remaining;document.getElementById('timerToggle').textContent=timeFmt(left);if(timer.running&&left<=0){timer.running=false;timer.remaining=0;clearInterval(timer.interval);buzz();}}
function startTimer(sec){timer.remaining=sec;timer.end=Date.now()+sec*1000;timer.running=true;clearInterval(timer.interval);timer.interval=setInterval(timerRender,250);timerRender();}
function buzz(){if(navigator.vibrate)navigator.vibrate([300,120,300]);try{const ac=new (window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;g.gain.value=.08;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.25);}catch(e){}}
document.querySelectorAll('[data-timer]').forEach(b=>b.onclick=()=>startTimer(+b.dataset.timer));
document.getElementById('plus15').onclick=()=>{const l=timer.running?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer.remaining;startTimer(l+15)};
document.getElementById('minus15').onclick=()=>{const l=timer.running?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer.remaining;startTimer(Math.max(0,l-15))};
document.getElementById('timerToggle').onclick=()=>{if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.end-Date.now())/1000));timer.running=false;clearInterval(timer.interval);}else startTimer(timer.remaining||90);timerRender();};

// Le bouton d'aide est remplacé par le raccourci Basic-Fit ; le contenu d'aide reste conservé.
document.getElementById('closeHelpBtn').onclick=()=>document.getElementById('helpModal').classList.add('hidden');
document.getElementById('helpModal').onclick=(e)=>{if(e.target.id==='helpModal')e.currentTarget.classList.add('hidden');};
document.getElementById('closeSessionBtn').onclick=()=>document.getElementById('sessionModal').classList.add('hidden');
document.getElementById('sessionModal').onclick=(e)=>{if(e.target.id==='sessionModal')e.currentTarget.classList.add('hidden');};

document.getElementById('rirToggleBtn').onclick=()=>{
  showRir=!showRir;
  localStorage.setItem('mt_show_rir',showRir?'1':'0');
  if(state.activeWorkout)renderWorkout();
};

document.getElementById('startNextBtn').onclick=()=>startWorkout(state.nextSessionId);
document.getElementById('refreshProgramBtn').onclick=loadProgram;
// Le code QR Basic-Fit est renouvelé en continu : on ouvre l'app officielle,
 // sans stocker de capture d'écran (qui ne fonctionnerait pas à la borne YANGA).
const BASIC_FIT_PLAY='https://play.google.com/store/apps/details?id=com.basicfit.trainingApp';
const BASIC_FIT_IOS='https://apps.apple.com/lu/app/basic-fit/id1588263601';
document.getElementById('waterBtn').onclick=()=>{
  if(/Android/i.test(navigator.userAgent)){
    // Tentative de lancement natif, avec repli vers la fiche officielle Google Play.
    const intent='intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.basicfit.trainingApp;S.browser_fallback_url='+encodeURIComponent(BASIC_FIT_PLAY)+';end';
    window.location.href=intent;
  }else if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){
    window.location.href=BASIC_FIT_IOS;
  }else{
    window.open('https://www.basic-fit.com/fr-lu/qrcode','_blank','noopener');
  }
};

let screenLockWanted=false,screenLockRequesting=false;
const screenLockOverlay=document.getElementById('screenLockOverlay');
const screenLockButton=document.getElementById('wakeBtn');
function renderScreenLock(){
  screenLockOverlay.classList.toggle('hidden',!screenLockWanted);
  screenLockButton.setAttribute('aria-pressed',String(screenLockWanted));
  document.getElementById('wakeIcon').textContent=screenLockWanted?'🔒':'🔓';
  document.getElementById('wakeCaption').textContent=screenLockWanted?'Bloqué':'Libre';
  screenLockButton.setAttribute('aria-label',screenLockWanted?'Déverrouiller My Training':'Verrouiller My Training et garder l’écran allumé');
  screenLockButton.title=screenLockWanted?'Déverrouiller':'Verrouiller et garder l’écran allumé';
  document.getElementById('screenLockStatus').textContent=screenLockWanted&&wakeLock&&!wakeLock.released?
    'Écran maintenu allumé · appuis bloqués':'Maintien de l’écran en cours ou indisponible';
}
async function acquireScreenWakeLock(){
  if(!screenLockWanted||document.visibilityState!=='visible'||screenLockRequesting||(wakeLock&&!wakeLock.released))return;
  screenLockRequesting=true;
  try{
    const sentinel=await navigator.wakeLock.request('screen');
    if(!screenLockWanted){await sentinel.release();return;}
    wakeLock=sentinel;
    sentinel.addEventListener('release',()=>{
      if(wakeLock===sentinel)wakeLock=null;
      renderScreenLock();
    });
  }finally{
    screenLockRequesting=false;
    renderScreenLock();
  }
}
async function unlockTrainingScreen(){
  screenLockWanted=false;
  const current=wakeLock;wakeLock=null;
  renderScreenLock();
  if(current&&!current.released){try{await current.release();}catch(e){}}
}
screenLockButton.onclick=async()=>{
  if(screenLockWanted){await unlockTrainingScreen();return;}
  if(!navigator.wakeLock||!navigator.wakeLock.request){
    alert('Ton navigateur ne permet pas de maintenir l’écran allumé.');
    return;
  }
  screenLockWanted=true;
  try{
    await acquireScreenWakeLock();
    if(!wakeLock)throw new Error('Wake Lock indisponible');
    renderScreenLock();
  }catch(e){
    await unlockTrainingScreen();
    alert('Impossible de garder l’écran allumé. Vérifie le mode économie d’énergie.');
  }
};
document.getElementById('unlockScreenBtn').onclick=unlockTrainingScreen;
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&screenLockWanted){
    acquireScreenWakeLock().catch(()=>renderScreenLock());
  }
});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
load();loadProgram();if(state.activeWorkout){renderWorkout();startWorkoutClock()}timerRender();
