/* My Training — récupération 2:00 / 2:30, sans toucher à l'historique. */
(function(){
  'use strict';
  const isHeavy=(name)=>/chest press|développé|rowing|presse à cuisses|leg curl|soulevé|squat|tirage vertical|tractions/i.test(name||'');
  function adjust(ex){
    if(!ex||!(Number(ex.rest)>0))return;
    ex.rest=isHeavy(ex.name)?150:120;
  }
  function adjustProgram(){
    (state.program?.sessions||[]).forEach(s=>(s.exercises||[]).forEach(adjust));
  }
  function adjustActive(){
    if(!state.activeWorkout)return;
    (state.activeWorkout.exercises||[]).forEach(adjust);
  }
  const oldProgram=renderProgram;
  renderProgram=function(){adjustProgram();return oldProgram.apply(this,arguments);};
  window.renderProgram=renderProgram;
  const oldWorkout=renderWorkout;
  renderWorkout=function(){adjustActive();return oldWorkout.apply(this,arguments);};
  window.renderWorkout=renderWorkout;
  adjustProgram();
  adjustActive();
  timer.remaining=timer.running?timer.remaining:120;
  const toggle=document.getElementById('timerToggle');
  if(toggle&&!timer.running)toggle.textContent='02:00';
  if(state.program)renderProgram();
  if(state.activeWorkout)renderWorkout();
})();
