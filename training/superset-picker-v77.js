/* My Training — paires de supersets choisies pendant la séance.
   Ne modifie aucun exercice ni aucune série avant une sélection explicite. */
(function(){
  'use strict';
  let selectedIndex=-1;

  function isCardio(e){return !!e?.cardio || /tapis/i.test(e?.name||'');}
  function isComplete(e){
    return !!e && (e.cardio ? !!e.cardio.done :
      Array.isArray(e.sets) && e.sets.length>0 && e.sets.every(s=>!!s.done));
  }
  function members(workout,group){
    return workout.exercises.filter(e=>e.superset===group);
  }
  function groupIsLocked(workout,group){
    return !!group && members(workout,group).some(isComplete);
  }
  function unlink(workout,group){
    if(!group)return;
    workout.exercises.forEach(e=>{if(e.superset===group)e.superset=null;});
    if(workout.supersetEnabled)delete workout.supersetEnabled[group];
  }
  function firstFreeGroup(workout){
    const taken=new Set(workout.exercises.map(e=>e.superset).filter(Boolean));
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(k=>!taken.has(k)) || 'Z';
  }

  function ensureModal(){
    let modal=document.getElementById('mtSsPicker');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='mtSsPicker';
    modal.className='modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','mtSsTitle');
    modal.innerHTML=`
      <div class="modal-card mt-ss-modal-card">
        <div class="section-title">
          <div><div class="eyebrow">SUPERSET PERSONNALISÉ</div><h2 id="mtSsTitle">Associer deux exercices</h2></div>
          <button type="button" class="ghost" id="mtSsClose">Fermer</button>
        </div>
        <p class="muted mt-ss-help">Choisis le deuxième exercice. Les deux seront rapprochés dans la liste. En mode SS activé, le repos démarre après le deuxième.</p>
        <div id="mtSsChoices" class="mt-ss-choices"></div>
        <button type="button" class="ghost mt-ss-remove hidden" id="mtSsRemove">Dissocier ce superset</button>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#mtSsClose').onclick=closeModal;
    modal.onclick=e=>{if(e.target===modal)closeModal();};
    return modal;
  }
  function closeModal(){
    selectedIndex=-1;
    document.getElementById('mtSsPicker')?.classList.add('hidden');
  }

  function assignPartner(otherIndex){
    const workout=state.activeWorkout;
    const first=workout?.exercises[selectedIndex];
    const second=workout?.exercises[otherIndex];
    if(!first || !second || first===second || isCardio(first) || isCardio(second))return;
    if(isComplete(first)||isComplete(second)||groupIsLocked(workout,first.superset)||groupIsLocked(workout,second.superset)){
      alert('Un exercice de ce superset est déjà terminé. Garde-le tel quel pour préserver ta séance.');
      return;
    }

    const preferredGroup=first.superset||second.superset||null;
    const groups=[...new Set([first.superset,second.superset].filter(Boolean))];
    groups.forEach(group=>unlink(workout,group));
    const group=preferredGroup&&!workout.exercises.some(e=>e.superset===preferredGroup)
      ?preferredGroup:firstFreeGroup(workout);
    first.superset=group;
    second.superset=group;
    workout.supersetEnabled=workout.supersetEnabled||{};
    workout.supersetEnabled[group]=true;

    // Placer la seconde station juste après la première sans toucher aux séries.
    workout.exercises.splice(workout.exercises.indexOf(second),1);
    workout.exercises.splice(workout.exercises.indexOf(first)+1,0,second);
    save();
    closeModal();
    renderWorkout();
  }

  function removePair(){
    const workout=state.activeWorkout;
    const exercise=workout?.exercises[selectedIndex];
    if(!exercise?.superset)return;
    if(groupIsLocked(workout,exercise.superset)){
      alert('Ce superset comprend déjà un exercice terminé.');
      return;
    }
    unlink(workout,exercise.superset);
    save();
    closeModal();
    renderWorkout();
  }

  function openModal(index){
    const workout=state.activeWorkout;
    const first=workout?.exercises[index];
    if(!first || isCardio(first) || isComplete(first))return;
    selectedIndex=index;
    const modal=ensureModal();
    const choices=modal.querySelector('#mtSsChoices');
    const title=modal.querySelector('#mtSsTitle');
    const remove=modal.querySelector('#mtSsRemove');
    choices.replaceChildren();
    title.textContent=first.name;

    workout.exercises.forEach((e,i)=>{
      if(i===index || isCardio(e))return;
      const button=document.createElement('button');
      button.type='button';
      button.className='mt-ss-choice';
      const alreadyPaired=!!first.superset && e.superset===first.superset;
      const locked=isComplete(e)||groupIsLocked(workout,e.superset)||groupIsLocked(workout,first.superset);
      button.textContent=`${alreadyPaired?'✓ ':''}${e.name}${e.superset?' · SS '+e.superset:''}`;
      button.disabled=locked;
      button.onclick=()=>assignPartner(i);
      choices.appendChild(button);
    });

    remove.classList.toggle('hidden',!first.superset);
    remove.disabled=groupIsLocked(workout,first.superset);
    remove.onclick=removePair;
    modal.classList.remove('hidden');
  }

  function decorateWorkout(){
    const workout=state.activeWorkout;
    if(!workout)return;
    document.querySelectorAll('#exerciseList .exercise').forEach((card,index)=>{
      const e=workout.exercises[index];
      if(!e || isCardio(e))return;
      const actions=card.querySelector('.exercise-quick-actions');
      if(!actions || actions.querySelector('.mt-ss-picker-btn'))return;
      const button=document.createElement('button');
      button.type='button';
      button.className='ghost mt-ss-picker-btn';
      button.textContent=e.superset?'Modifier SS':'Choisir SS';
      button.setAttribute('aria-label',`Choisir le superset pour ${e.name}`);
      button.disabled=isComplete(e);
      button.onclick=()=>openModal(index);
      actions.appendChild(button);
    });
  }

  const css=document.createElement('style');
  css.textContent=`
    .mt-ss-picker-btn{font-size:10px;padding:6px 7px;white-space:nowrap;color:#93c5fd}
    .mt-ss-picker-btn:disabled{opacity:.45}
    .mt-ss-choices{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto;margin:12px 0}
    .mt-ss-choice{width:100%;text-align:left;padding:12px;border:1px solid var(--line,#26344c);background:var(--panel2,#172238);border-radius:12px}
    .mt-ss-choice:disabled{opacity:.4}
    .mt-ss-remove{width:100%;margin-top:8px;border-color:#ef4444;color:#fca5a5}
    .mt-ss-help{margin:8px 0;font-size:13px}
    .mt-ss-modal-card{padding-bottom:max(16px,env(safe-area-inset-bottom))}
  `;
  document.head.appendChild(css);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){const result=previousRender();decorateWorkout();return result;};
    window.renderWorkout=renderWorkout;
  }
  decorateWorkout();
})();
