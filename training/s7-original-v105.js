/* MyTraining S7 — exactement les 8 photos du montage fourni dans ce chat. */
(function(){
  'use strict';
  const names=["Curl biceps élastique — prise supination","Pushdown triceps à l'élastique (ancrage haut)","Curl biceps aux sangles de suspension","Pompes serrées (mains largeur d'épaules)","Curl marteau à l'élastique","Kickback triceps à l'élastique","Rowing aux sangles de suspension","Roue abdominale à genoux"];
  const labels=['Curl supination','Pushdown triceps','Curl aux sangles','Pompes serrées','Curl marteau','Kickback triceps','Rowing sangles','Roue abdominale'];
  const pos=['0% 0%','33.333% 0%','66.667% 0%','100% 0%','0% 100%','33.333% 100%','66.667% 100%','100% 100%'];
  function photo(index,cls){
    const el=document.createElement('div');
    el.className='mt-s7-exact-cell '+cls;
    el.style.backgroundPosition=pos[index];
    el.setAttribute('role','img');
    el.setAttribute('aria-label','Photo originale : '+labels[index]);
    el.dataset.photoIndex=String(index);
    return el;
  }
  function home(){
    const groups=[['.mt-s7-home-photo-strip figure',[0,1]],['.mt-s7-photo-grid figure',[0,1,2,3,4,5,6,7]]];
    for(const [selector,indices] of groups)document.querySelectorAll(selector).forEach((fig,i)=>{
      if(fig.querySelector('.mt-s7-exact-cell'))return;
      const node=fig.querySelector('img, .mt-s7-exact-loading');
      if(node)node.replaceWith(photo(indices[i],'mt-s7-exact-home'));
    });
    document.querySelectorAll('.mt-s7-photo-credit').forEach(x=>x.textContent='Les huit photos originales du montage présenté dans la conversation.');
  }
  function program(){
    const sessions=state.program?.sessions||[];
    const sIndex=sessions.findIndex(s=>s.id==='S7');
    if(sIndex<0)return;
    const card=document.querySelectorAll('#programCards .session-card')[sIndex];
    if(!card)return;
    card.querySelectorAll('.program-exercise-row').forEach((row,j)=>{
      const i=names.indexOf(sessions[sIndex].exercises[j]?.name);
      if(i<0)return;
      if(row.querySelector('.mt-s7-exact-cell'))return;
      const old=row.querySelector('.mt-s7-photo-pair, .mt-s7-thumb');
      if(old)old.replaceWith(photo(i,'mt-s7-exact-thumb mt-s7-thumb'));
      else row.prepend(photo(i,'mt-s7-exact-thumb mt-s7-thumb'));
    });
  }
  function workout(){
    if(state.activeWorkout?.id!=='S7')return;
    const cards=[...document.querySelectorAll('#exerciseList .exercise')];
    state.activeWorkout.exercises.forEach((exercise,j)=>{
      const i=names.indexOf(exercise.name),card=cards[j];
      if(!card)return;
      card.classList.add('mt-s7-exact-workout');
      card.querySelectorAll('.exercise-guide .exercise-visual').forEach(v=>v.remove());
      if(i<0)return; // Échauffement : pas de schéma générique.
      const old=card.querySelector('.mt-s7-workout-image .mt-s7-photo-pair');
      if(old)old.replaceWith(photo(i,'mt-s7-exact-workout-photo mt-s7-workout-photo'));
    });
  }
  function full(){
    const modal=document.getElementById('mtS7Fullscreen');
    if(!modal?.classList.contains('open'))return;
    const title=(modal.querySelector('h3')?.textContent||'').toLowerCase();
    const i=labels.findIndex(n=>n.toLowerCase()===title);
    if(i>=0)modal.querySelector('.mt-s7-big-img')?.replaceChildren(photo(i,'mt-s7-exact-fullsize'));
  }
  const originalP=window.renderProgram;
  if(typeof originalP==='function'){
    const updated=function(){const ret=originalP.apply(this,arguments);program();return ret;};
    renderProgram=updated;window.renderProgram=updated;
  }
  const originalW=window.renderWorkout;
  if(typeof originalW==='function'){
    const updated=function(){const ret=originalW.apply(this,arguments);workout();return ret;};
    renderWorkout=updated;window.renderWorkout=updated;
  }
  document.addEventListener('click',e=>{if(e.target.closest('.mt-s7-photo-button'))full();});
  home();program();workout();
})();