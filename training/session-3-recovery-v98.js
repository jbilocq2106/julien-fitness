/* Adaptation temporaire de S3 pour le 21 octobre 2026.
   Le programme de référence reste intact ; aucune information de santé personnelle n'est publiée. */
(function(){
  'use strict';
  const DATE='2026-10-21';
  const FLAG='mtOneOffRecovery20261021';
  const copy=value=>JSON.parse(JSON.stringify(value));
  let normalS3=null;

  function parisDate(value){
    const parts=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date(value));
    const part=k=>parts.find(p=>p.type===k)?.value||'';
    return part('year')+'-'+part('month')+'-'+part('day');
  }
  const isToday=()=>parisDate(Date.now())===DATE;
  const selected=[
    {name:'Presse à cuisses',reps:['12','12','12'],weights:[60,65,70],rest:105,
      note:'Séance allégée : dos entièrement soutenu, épaules relâchées. Ne pas pousser avec le haut du dos. RIR 3–4 ; arrêter si inconfort.'},
    {name:'Leg Curl assis',reps:['12','12'],weights:[30,39],rest:90,
      note:'Charge volontairement modérée. RIR 3–4, nuque neutre et épaules détendues.'},
    {name:'Leg Extension',reps:['12–15','12–15'],weights:[null,null],rest:75,
      note:'Charge modérée au ressenti (RIR 3–4). Ne pas s’agripper fortement aux poignées.'},
    {name:'Mollets presse / machine',reps:['15','15'],weights:[null,null],rest:75,
      note:'Machine assise si possible ; ne pas forcer sur les épaules. Facultatif en cas d’inconfort.'},
    {name:'Curl pupitre machine',reps:['12','12'],weights:[20,23],rest:75,
      note:'Bras bien appuyés, nuque neutre. Facultatif : ne faire que si absolument indolore.'},
    {name:'Dead bug + expiration complète',reps:['8/côté','8/côté'],weights:[0,0],rest:60,
      note:'Tête posée, nuque relâchée. Si le haut du dos tire, supprimer cet exercice.'},
    {name:'Vacuum / transverse',reps:['20–30 s','20–30 s'],weights:[0,0],rest:45,
      note:'Respiration calme, épaules relâchées ; ne pas crisper le cou.'},
    {name:'Tapis incliné',reps:['15–20 min'],weights:[0],rest:0,
      note:'4,5–5,0 km/h • 0 % • 15–20 min • marche douce, RPE 3–4/10, sans tenir fortement les poignées.'}
  ];

  function applyProgram(){
    const session=state.program?.sessions?.find(s=>s.id==='S3');
    if(!session)return false;
    if(!isToday()){
      if(session[FLAG]&&normalS3){Object.keys(session).forEach(k=>delete session[k]);Object.assign(session,copy(normalS3));return true;}
      return false;
    }
    if(session[FLAG])return false;
    normalS3=copy(session);
    session.name='Séance 3 — Jambes et abdos (allégée)';
    session.focus='Séance exceptionnelle du 21 octobre • effort modéré, buste ménagé • aucun record à viser';
    session.day_hint='Aujourd’hui seulement • récupération, RIR 3–4';
    session.exercises=selected.map((choice,index)=>{
      const ref=normalS3.exercises.find(e=>e.name===choice.name);
      return {
        ...(ref?copy(ref):{name:choice.name}),
        name:choice.name,coachOrder:index+1,superset:null,autoTarget:null,
        sets:choice.reps.map((reps,i)=>({reps,weight:choice.weights[i]})),
        rest:choice.rest,note:choice.note
      };
    });
    session[FLAG]=true;
    return true;
  }

  function toActive(ex){
    return {
      name:ex.name,note:ex.note,rest:ex.rest,superset:null,autoTarget:null,
      cardio:isCardioName(ex.name)?parseCardioDefaults(ex):null,
      sets:ex.sets.map((set,i)=>({
        i:i+1,targetReps:set.reps,targetWeight:set.weight,
        weight:set.weight??'',reps:'',rir:'',done:false
      }))
    };
  }
  function adaptActive(){
    const w=state.activeWorkout;
    if(!w||w.id!=='S3'||w[FLAG]||parisDate(w.started)!==DATE||!isToday())return;
    applyProgram();
    const template=state.program?.sessions?.find(s=>s.id==='S3');
    if(!template?.[FLAG])return;
    const names=new Set(template.exercises.map(e=>e.name));
    const done=e=>Boolean(e.cardio?.done||(e.sets||[]).some(set=>set.done));
    const completedOutside=(w.exercises||[]).filter(e=>!names.has(e.name)&&done(e))
      .map(e=>({...e,superset:null}));
    const adapted=template.exercises.map(ex=>{
      const prior=(w.exercises||[]).find(e=>e.name===ex.name);
      return prior&&done(prior)?{...prior,superset:null}:toActive(ex);
    });
    w.exercises=[...completedOutside,...adapted];
    w.name=template.name;w.supersetEnabled={};w[FLAG]=true;
    save();renderWorkout();
  }

  const oldRenderProgram=renderProgram;
  renderProgram=function(){
    applyProgram();
    return oldRenderProgram.apply(this,arguments);
  };
  window.renderProgram=renderProgram;

  const oldStartWorkout=startWorkout;
  startWorkout=function(id,testMode){
    applyProgram();
    const result=oldStartWorkout.apply(this,arguments);
    if(id==='S3'&&isToday()&&state.activeWorkout){
      state.activeWorkout[FLAG]=true;
      save();
    }
    return result;
  };
  window.startWorkout=startWorkout;

  const oldProgression=recalculateProgressionFromWorkout;
  recalculateProgressionFromWorkout=function(workout){
    if(workout?.[FLAG])return [];
    return oldProgression.apply(this,arguments);
  };

  if(state.program){
    if(applyProgram()){renderProgram();renderHome();}
  }
  adaptActive();
})();