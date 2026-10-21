/* Rétablit la séance 3 habituelle si une séance allégée du 21/10 était déjà ouverte.
   Préserve les séries réellement validées ainsi que les exercices ajoutés manuellement. */
(function(){
  'use strict';
  const FLAG='mtOneOffRecovery20261021';
  function restoreActiveS3(){
    const w=state.activeWorkout;
    const normal=state.program?.sessions?.find(s=>s.id==='S3');
    if(!w||w.id!=='S3'||!w[FLAG]||!normal)return false;
    const old=Array.isArray(w.exercises)?w.exercises:[];
    const names=new Set(normal.exercises.map(e=>e.name));
    const restored=normal.exercises.map(ex=>{
      const existing=old.find(e=>e.name===ex.name);
      const result={
        name:ex.name,note:ex.note||'',rest:ex.rest,
        superset:ex.superset||null,autoTarget:ex.autoTarget||null,
        cardio:isCardioName(ex.name)?parseCardioDefaults(ex):null,
        sets:ex.sets.map((set,i)=>{
          const previous=existing?.sets?.[i];
          return previous?.done?{...previous}:{
            i:i+1,targetReps:set.reps,targetWeight:set.weight,
            weight:set.weight??'',reps:'',rir:'',done:false
          };
        })
      };
      if(existing?.cardio?.done)result.cardio=existing.cardio;
      return result;
    });
    // Conserver les ajouts personnels déjà commencés en dehors du programme.
    old.filter(ex=>!names.has(ex.name)&&(
      ex.cardio?.done||ex.sets?.some(s=>s.done)
    )).forEach(ex=>restored.push(ex));
    w.exercises=restored;
    w.name=normal.name;
    w.supersetEnabled={A:false,B:false};
    delete w[FLAG];
    save();
    renderWorkout();
    return true;
  }
  const previous=renderProgram;
  renderProgram=function(){
    restoreActiveS3();
    return previous.apply(this,arguments);
  };
  window.renderProgram=renderProgram;
  if(state.program&&restoreActiveS3())renderProgram();
})();
