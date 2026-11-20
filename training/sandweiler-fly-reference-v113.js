/* Séance 3 : reprendre uniquement les dernières séries d'écartés à la poulie enregistrées à Sandweiler. */
(function(){
  'use strict';
  const EXERCISE='Écartés poulie vis-à-vis';
  const gymNorm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const isFly=name=>{
    const n=gymNorm(name);
    return (n.includes('ecart')&&n.includes('poulie'))||
      (n.includes('vis-a-vis')&&n.includes('poulie'))||
      (n.includes('cable fly')||n.includes('cable crossover'));
  };
  const asNumber=value=>{
    const n=Number(String(value??'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  function latestSandweiler(){
    const gymByWorkout=new Map();
    (state.sessions||[]).forEach(s=>{
      if(s.title&&s.start)gymByWorkout.set(String(s.title)+'|'+String(s.start),s.gym_name||'');
    });
    const rows=(state.history||[]).filter(row=>{
      if(!isFly(row.exercise_title)||asNumber(row.weight_kg)<=0||asNumber(row.reps)<=0)return false;
      if(row.set_type&&row.set_type!=='normal')return false;
      const gym=row.gym_name||gymByWorkout.get(String(row.title||'')+'|'+String(row.start_time||''))||'';
      return gymNorm(gym).includes('sandweiler')&&Number.isFinite(Date.parse(row.start_time||''));
    });
    if(!rows.length)return null;
    rows.sort((a,b)=>Date.parse(b.start_time)-Date.parse(a.start_time));
    const latest=rows[0];
    const same=rows.filter(row=>row.title===latest.title&&row.start_time===latest.start_time)
      .sort((a,b)=>asNumber(a.set_index)-asNumber(b.set_index));
    return {date:latest.start_time,rows:same.slice(0,3)};
  }
  function applyReference(){
    const session=state.program?.sessions?.find(s=>s.id==='S3');
    const exercise=session?.exercises?.find(e=>e.name===EXERCISE);
    if(!exercise)return false;
    const ref=latestSandweiler();
    if(!ref)return false; // Si l'historique privé n'est pas chargé, garder les repères existants.
    const mainCount=exercise.sets.length;
    const active=state.activeWorkout?.id==='S3'
      ?state.activeWorkout.exercises.find(e=>e.name===EXERCISE):null;
    let changed=false,activeChanged=false;
    for(let i=0;i<Math.min(mainCount,ref.rows.length);i++){
      const row=ref.rows[i],target=exercise.sets[i];
      const weight=asNumber(row.weight_kg),reps=String(asNumber(row.reps));
      if(asNumber(target.weight)!==weight||String(target.reps)!==reps){
        target.weight=weight;target.reps=reps;changed=true;
      }
      const set=active?.sets?.[i];
      if(set&&!set.done&&String(set.reps||'').trim()===''){
        const previousTarget=asNumber(set.targetWeight);
        if(asNumber(set.weight)===previousTarget||String(set.weight)==='')set.weight=weight;
        set.targetWeight=weight;
        set.targetReps=reps;
        activeChanged=true;
      }
    }
    const dateLabel=new Date(ref.date).toLocaleDateString('fr-FR');
    const note='Référence des dernières séries enregistrées à Basic-Fit Sandweiler ('+dateLabel+'). Charges de Yutz non utilisées.';
    if(exercise.sandweilerReferenceDate!==ref.date){
      exercise.sandweilerReferenceDate=ref.date;
      exercise.note=note;
      changed=true;
    }
    if(active&&activeChanged){
      const source=active.sets[Math.max(0,mainCount-1)];
      const base=asNumber(source?.weight)||asNumber(source?.targetWeight);
      active.sets.filter(s=>s.dropSet&&!s.done).forEach(drop=>{
        const previous=asNumber(drop.targetWeight);
        const updated=base>0?Math.round(base*asNumber(drop.dropRatio)*2)/2:null;
        if(asNumber(drop.weight)===previous||String(drop.weight)==='')drop.weight=updated??'';
        drop.targetWeight=updated;
      });
      active.note=note;
      save();
      if(typeof renderWorkout==='function')renderWorkout();
    }
    return changed||activeChanged;
  }
  const previousRender=renderProgram;
  renderProgram=function(){
    applyReference();
    return previousRender.apply(this,arguments);
  };
  window.renderProgram=renderProgram;
  const previousBackfill=window.mtBackfillBasicFitSandweiler;
  if(typeof previousBackfill==='function'){
    window.mtBackfillBasicFitSandweiler=function(){
      const changed=previousBackfill.apply(this,arguments);
      if(changed&&state.program){renderProgram();renderHome();}
      return changed;
    };
  }
  if(state.program){renderProgram();}
})();