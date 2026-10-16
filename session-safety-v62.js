/* My Training v62 — persist active workout and protect completed exercises */
(function(){
  function isExerciseComplete(e){
    if(!e)return false;
    if(e.cardio)return !!e.cardio.done;
    return Array.isArray(e.sets)&&e.sets.length>0&&e.sets.every(s=>!!s.done);
  }

  function persistInputNow(input){
    if(!state.activeWorkout)return;
    const row=input.closest('.set-row');
    if(row&&input.dataset.field){
      const e=state.activeWorkout.exercises[Number(row.dataset.e)];
      const s=e?.sets?.[Number(row.dataset.s)];
      if(s){s[input.dataset.field]=input.value;save();}
      return;
    }
    const box=input.closest('.cardio-grid');
    if(box&&input.dataset.cardio){
      const e=state.activeWorkout.exercises[Number(box.dataset.e)];
      if(e?.cardio){e.cardio[input.dataset.cardio]=input.value;save();}
    }
  }

  function lockCompletedExercises(){
    const w=state.activeWorkout;
    if(!w)return;
    const cards=[...document.querySelectorAll('#exerciseList .exercise')];
    cards.forEach((card,index)=>{
      const e=w.exercises?.[index];
      if(!e||!isExerciseComplete(e))return;

      card.classList.add('mt-exercise-locked');
      card.querySelectorAll('input, .done, .cardio-done, .mt-swap-btn').forEach(el=>{
        el.disabled=true;
      });

      const actions=card.querySelector('.exercise-quick-actions');
      if(actions&&!actions.querySelector('.mt-unlock-exercise')){
        const unlock=document.createElement('button');
        unlock.type='button';
        unlock.className='ghost mt-unlock-exercise';
        unlock.textContent='✓ Terminé · Déverrouiller';
        unlock.onclick=()=>{
          if(!confirm(`Déverrouiller « ${e.name} » pour le modifier ?`))return;
          if(e.cardio)e.cardio.done=false;
          else if(e.sets?.length)e.sets[e.sets.length-1].done=false;
          save();
          renderWorkout();
        };
        actions.appendChild(unlock);
      }
    });
  }

  function attachImmediatePersistence(){
    document.querySelectorAll('#exerciseList input').forEach(input=>{
      input.addEventListener('input',()=>persistInputNow(input));
    });
  }

  function restoreActiveWorkoutView(){
    if(!state.activeWorkout)return;
    try{
      renderWorkout();
      showView('workoutView');
      startWorkoutClock();
    }catch(e){}
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-exercise-locked{position:relative;opacity:.78}
    .mt-exercise-locked::after{content:'EXERCICE TERMINÉ';position:absolute;top:10px;right:12px;font-size:.68rem;font-weight:800;letter-spacing:.06em;color:var(--muted,#9ca3af);pointer-events:none}
    .mt-exercise-locked input:disabled,.mt-exercise-locked button:disabled{cursor:not-allowed}
    .mt-unlock-exercise{white-space:nowrap}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){
      previousRender();
      attachImmediatePersistence();
      lockCompletedExercises();
    };
    window.renderWorkout=renderWorkout;
  }

  // Save one last checkpoint whenever Android backgrounds or closes the PWA.
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'&&state.activeWorkout)save();
  });
  window.addEventListener('pagehide',()=>{if(state.activeWorkout)save();});
  window.addEventListener('beforeunload',()=>{if(state.activeWorkout)save();});

  // If the app is reopened while a workout is active, return directly to it.
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(restoreActiveWorkoutView,0),{once:true});
  }else{
    setTimeout(restoreActiveWorkoutView,0);
  }
})();
