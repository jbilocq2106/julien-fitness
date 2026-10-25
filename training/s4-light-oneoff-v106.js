/* MyTraining — ajustement ponctuel S4 du 25 octobre 2026.
   La séance habituelle et son historique restent inchangés.
   Aucun détail personnel n'est publié dans ce fichier. */
(function(){
  'use strict';
  const DATE='2026-10-25';
  const FLAG='mtOneOffS420261025';
  const copy=x=>JSON.parse(JSON.stringify(x));
  let originalS4=null;

  const selection=[
    {name:'Chest Press machine',weights:[30,35],reps:['12','12'],rest:105,
      note:'Version allégée : omoplates et nuque confortables, RIR 4–5. Ne faire que si le mouvement reste indolore.'},
    {name:'Tirage vertical',weights:[25,30],reps:['12','12'],rest:120,
      note:'OPTIONNEL. Maximum 25–30 kg pour ces 2 séries ; commencer au plus léger. Traction devant la poitrine, lente, sans hausser les épaules et sans à-coups. Supprimer immédiatement si le haut du dos réagit, même à faible charge. Aucun objectif de progression.'},
    {name:'Presse à cuisses',weights:[60,65,70],reps:['12','12','12'],rest:105,
      note:'Dos appuyé, nuque détendue, ne pas pousser en crispant le buste. RIR 4. Arrêter si inconfort.'},
    {name:'Leg Curl assis',weights:[30,39],reps:['12','12'],rest:90,
      note:'Mouvement contrôlé, dos soutenu, épaules relâchées. RIR 4.'},
    {name:'Élévations latérales',weights:[3,4],reps:['12','12'],rest:75,
      note:'FACULTATIF : très léger, sans monter les épaules ni chercher une congestion à tout prix. Supprimer en cas de gêne.'},
    {name:'Extension triceps corde',weights:[24,27],reps:['12','12'],rest:75,
      note:'Coudes près du corps, épaules et nuque relâchées ; ne faire que sans douleur.'},
    {name:'Curl poulie basse corde',weights:[20,23],reps:['12','12'],rest:75,
      note:'Sans balancier ni crispation des épaules, RIR 4.'},
    {name:'Dead bug + expiration complète',weights:[0,0],reps:['8/côté','8/côté'],rest:60,
      note:'Tête posée si plus confortable, respiration lente ; arrêter si le haut du dos gêne.'},
    {name:'Vacuum / transverse',weights:[0,0],reps:['20–30 s','20–30 s'],rest:45,
      note:'Respiration douce, nuque libre. Ne pas forcer.'},
    {name:'Tapis incliné',weights:[0],reps:['15–25 min'],rest:0,
      note:'4,8 km/h • 1 % • 15–25 min • marche confortable, pente 0–2 % si bien tolérée. Sans tenir fortement les poignées.'}
  ];

  function dateAtParis(time){
    const p=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date(time));
    const v=k=>p.find(x=>x.type===k)?.value||'';
    return v('year')+'-'+v('month')+'-'+v('day');
  }
  const today=()=>dateAtParis(Date.now())===DATE;

  function adaptProgram(){
    const session=state.program?.sessions?.find(s=>s.id==='S4');
    if(!session)return false;
    if(!today()){
      if(session[FLAG] && originalS4){
        Object.keys(session).forEach(k=>delete session[k]);
        Object.assign(session,copy(originalS4));
        return true;
      }
      return false;
    }
    if(session[FLAG])return false;
    originalS4=copy(session);
    session.name='Séance 4 — Full Body léger (temporaire)';
    session.focus='Séance modérée : tirage vertical facultatif, charges allégées et aucune progression recherchée';
    session.day_hint='Uniquement le 25/10 · RIR 4–5 · pas de supersets';
    session.exercises=selection.map((x,i)=>{
      const base=originalS4.exercises.find(e=>e.name===x.name)||{name:x.name};
      return {...copy(base),name:x.name,coachOrder:i+1,
        superset:null,autoTarget:null,
        sets:x.reps.map((reps,j)=>({reps,weight:x.weights[j]})),
        rest:x.rest,note:x.note};
    });
    session[FLAG]=true;
    return true;
  }
  function activeFrom(ex,prior){
    const completed=(prior?.sets||[]).filter(s=>s.done);
    const sets=ex.sets.map((s,i)=>{
      const done=prior?.sets?.[i];
      return done?.done?copy(done):{
        i:i+1,targetReps:s.reps,targetWeight:s.weight,
        weight:s.weight??'',reps:'',rir:'',done:false
      };
    });
    // Ne jamais supprimer une série déjà réellement effectuée.
    for(let j=ex.sets.length;j<(prior?.sets?.length||0);j++){
      if(prior.sets[j]?.done)sets.push(copy(prior.sets[j]));
    }
    return {
      name:ex.name,note:ex.note,rest:ex.rest,superset:null,autoTarget:null,
      cardio:isCardioName(ex.name)?(
        prior?.cardio?.done?copy(prior.cardio):parseCardioDefaults(ex)
      ):null,
      sets
    };
  }
  function adaptAlreadyStarted(){
    const w=state.activeWorkout;
    if(!today()||!w||w.id!=='S4'||w[FLAG]||dateAtParis(w.started)!==DATE)return;
    adaptProgram();
    const session=state.program?.sessions?.find(s=>s.id==='S4');
    if(!session?.[FLAG])return;
    const names=new Set(session.exercises.map(e=>e.name));
    const oldNames=new Set((originalS4?.exercises||[]).map(e=>e.name));
    const extras=(w.exercises||[])
      .filter(e=>!names.has(e.name) && (
        // Conserver les exercices ajoutés manuellement et les exercices déjà terminés.
        !oldNames.has(e.name)||(e.sets||[]).some(s=>s.done)||e.cardio?.done
      )).map(e=>({...e,superset:null}));
    w.exercises=[
      ...session.exercises.map(ex=>activeFrom(ex,(w.exercises||[]).find(e=>e.name===ex.name))),
      ...extras
    ];
    w.name=session.name;
    w.supersetEnabled={};
    w[FLAG]=true;
    save();renderWorkout();
  }
  const priorRender=renderProgram;
  renderProgram=function(){
    adaptProgram();
    const output=priorRender.apply(this,arguments);
    adaptAlreadyStarted();
    return output;
  };
  window.renderProgram=renderProgram;

  const priorStart=startWorkout;
  startWorkout=function(id,testMode){
    adaptProgram();
    const result=priorStart.apply(this,arguments);
    if(id==='S4'&&today()&&state.activeWorkout){
      state.activeWorkout[FLAG]=true;
      save();
    }
    return result;
  };
  window.startWorkout=startWorkout;

  const priorProgression=recalculateProgressionFromWorkout;
  recalculateProgressionFromWorkout=function(workout){
    if(workout?.[FLAG])return [];
    return priorProgression.apply(this,arguments);
  };

  if(state.program){
    if(adaptProgram()){renderProgram();renderHome();}
  }
  adaptAlreadyStarted();
})();
