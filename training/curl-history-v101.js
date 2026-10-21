/* MyTraining — relie les deux curls de la séance spéciale aux séries réelles
   présentes dans l'historique du téléphone ou récupérées via la synchronisation.
   Ne lit aucun serveur supplémentaire et ne modifie jamais les performances passées. */
(function(){
  'use strict';
  const asText=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function matches(name,kind){
    const n=asText(name);
    if(kind==='incline'){
      return (n.includes('curl')&&n.includes('incline')&&!n.includes('marteau')&&!n.includes('developpe')&&!n.includes('ecarte'))
        || (n.includes('incline')&&n.includes('dumbbell')&&n.includes('curl'));
    }
    return (n.includes('curl')&&n.includes('marteau'))||n.includes('hammer curl');
  }
  function lastRecorded(kind){
    const rows=(Array.isArray(state.history)?state.history:[]).filter(row=>{
      const w=Number(row.weight_kg),reps=Number(row.reps);
      return matches(row.exercise_title,kind)&&Number.isFinite(w)&&w>0&&
        Number.isFinite(reps)&&reps>0&&
        (!row.set_type||row.set_type==='normal');
    });
    if(!rows.length)return null;
    rows.sort((a,b)=>Date.parse(b.start_time||0)-Date.parse(a.start_time||0));
    const mostRecent=rows[0].start_time;
    const group=rows.filter(row=>row.start_time===mostRecent)
      .sort((a,b)=>Number(a.set_index||0)-Number(b.set_index||0));
    const series=group.map(row=>({weight:Number(row.weight_kg),reps:Number(row.reps)}))
      .filter(row=>row.weight>0&&row.reps>0).slice(-3);
    return series.length?{series,date:mostRecent}:null;
  }
  function syncTargets(){
    const s=state.program?.sessions?.find(session=>session.id==='S5');
    if(!s)return;
    const configs=[
      {kind:'incline',name:'Curl incliné haltères'},
      {kind:'marteau',name:'Curl marteau haltères'}
    ];
    for(const cfg of configs){
      const exercise=s.exercises.find(ex=>ex.name===cfg.name);
      if(!exercise)continue;
      const recorded=lastRecorded(cfg.kind);
      if(!recorded)continue;
      const found=recorded.series;
      const possibleProgression=Number(state.progressionOverrides?.[exerciseFamily(exercise.name)])||0;
      exercise.sets.forEach((set,i)=>{
        // Si une séance comportait moins de séries, répéter sa dernière charge connue.
        const historical=found[Math.min(i,found.length-1)].weight;
        set.weight=historical;
      });
      const highest=Math.max(...found.map(row=>row.weight));
      // Une progression déjà validée dans l'application doit être conservée.
      if(possibleProgression>highest&&possibleProgression<=highest*1.2){
        exercise.sets[exercise.sets.length-1].weight=possibleProgression;
      }
      exercise.autoTarget=exercise.sets[exercise.sets.length-1]?.weight||null;
      const when=Number.isFinite(Date.parse(recorded.date||''))?
        new Date(recorded.date).toLocaleDateString('fr-FR'):'date non précisée';
      exercise.note='Historique réel du '+when+' : '+found.map(row=>row.reps+'×'+row.weight+' kg').join(' / ')+
        ' (par haltère). Objectifs proposés à partir des poids saisis ; adapter aux sensations et à la technique.';
    }
  }
  const previousRenderProgram=renderProgram;
  renderProgram=function(){
    syncTargets();
    return previousRenderProgram.apply(this,arguments);
  };
  window.renderProgram=renderProgram;
  if(state.program){syncTargets();renderProgram();}
})();
