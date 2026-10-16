/* My Training v71 — preserve today's completed Dead bug while keeping future alternative preference */
(function(){
  function norm(s){
    if(typeof normText==='function')return normText(s);
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function fixCurrentDeadBug(){
    const w=state.activeWorkout;
    if(!w)return false;
    let changed=false;

    (w.exercises||[]).forEach(e=>{
      if(!norm(e?.name).includes('dead bug'))return;
      if(e.skippedReason!=='preferred-alternative-next-session')return;

      e.skipped=false;
      e.skippedAt=null;
      e.skippedReason=null;
      e.skippedSets=[];
      e.recoveredPerformed=true;
      e.note='Réalisé aujourd’hui • alternative mémorisée pour la prochaine séance';

      // The old end-of-session replacement could erase the exact reps already
      // entered. Mark the exercise as completed without inventing rep values.
      (e.sets||[]).forEach(s=>{s.done=true;});
      changed=true;
    });

    if(changed&&typeof save==='function')save();
    return changed;
  }

  function addBadge(){
    const w=state.activeWorkout;
    if(!w)return;
    const cards=[...document.querySelectorAll('#exerciseList .exercise')];
    cards.forEach((card,index)=>{
      const e=w.exercises?.[index];
      if(!e?.recoveredPerformed)return;
      if(card.querySelector('.mt-recovered-performed-badge'))return;
      const badge=document.createElement('div');
      badge.className='mt-recovered-performed-badge';
      badge.textContent='Réalisé aujourd’hui · alternative prévue pour la prochaine fois';
      card.querySelector('.exercise-title-main')?.appendChild(badge);
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-recovered-performed-badge{display:inline-block;margin:6px 0 0;padding:4px 7px;border-radius:999px;background:rgba(34,197,94,.12);color:#86efac;font-size:10px;font-weight:800}
  `;
  document.head.appendChild(style);

  const changed=fixCurrentDeadBug();
  if(changed){try{renderWorkout();}catch(e){}}
  addBadge();

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){
      previousRender();
      addBadge();
    };
    window.renderWorkout=renderWorkout;
  }
})();
