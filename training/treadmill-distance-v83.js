/* My Training — distance tapis calculée depuis vitesse et temps.
   La pente sert à estimer le dénivelé, sans fausser la distance du tapis. */
(function(){
  'use strict';

  function readNumber(value){
    const t=String(value??'').trim().replace(',','.');
    if(!t)return null;
    const v=Number(t);
    return Number.isFinite(v)?v:null;
  }

  function calculation(cardio){
    const speed=readNumber(cardio.speed);
    const minutes=readNumber(cardio.duration);
    const incline=readNumber(cardio.incline);
    if(speed===null||minutes===null||speed<=0||minutes<=0||speed>30||minutes>360)return null;
    const km=speed*minutes/60;
    const grade=incline===null?null:Math.max(0,Math.min(35,incline))/100;
    // La vitesse du tapis décrit la longueur de bande parcourue.
    // Le dénivelé de la pente est une estimation pour pente constante.
    const ascent=grade===null?null:Math.round(km*1000*grade/Math.sqrt(1+grade*grade));
    return {km,ascent};
  }

  function autoFill(cardio,force=false){
    if(cardio.done)return false;
    if(force){cardio.distanceManual=false;cardio.distanceSource='auto';}
    if(cardio.distanceManual)return false;
    // Préserve une distance mesurée et déjà entrée avant cette mise à jour.
    if(!force&&cardio.distance&&cardio.distanceSource!=='auto'){
      cardio.distanceManual=true;
      return false;
    }
    const computed=calculation(cardio);
    const next=computed?computed.km.toFixed(2):'';
    if(cardio.distance===next&&cardio.distanceSource==='auto')return false;
    cardio.distance=next;
    cardio.distanceSource='auto';
    return true;
  }

  function decorateWorkout(){
    const workout=state.activeWorkout;
    if(!workout)return;
    document.querySelectorAll('#exerciseList .cardio-grid').forEach(grid=>{
      const ei=Number(grid.dataset.e);
      const exercise=workout.exercises[ei];
      if(!exercise?.cardio)return;
      const cardio=exercise.cardio;
      const distanceInput=grid.querySelector('[data-cardio="distance"]');
      if(!distanceInput)return;

      if(!cardio.done&&autoFill(cardio)){
        distanceInput.value=cardio.distance;
        save();
      }
      if(grid.nextElementSibling?.classList?.contains('mt-treadmill-calculated'))return;

      const info=document.createElement('div');
      info.className='mt-treadmill-calculated';
      const text=document.createElement('span');
      const reset=document.createElement('button');
      reset.type='button';reset.className='ghost mt-treadmill-auto-btn';
      reset.textContent='↻ Auto';
      info.append(text,reset);
      grid.insertAdjacentElement('afterend',info);

      function updateLabel(){
        const value=calculation(cardio);
        if(!value){text.textContent='Entre la vitesse (km/h) et la durée (min) pour calculer la distance.';}
        else{
          const km=value.km.toFixed(2).replace('.',',');
          const ascent=value.ascent===null?'':` • D+ ≈ ${value.ascent} m si pente constante`;
          text.textContent=cardio.distanceManual
            ?`Distance saisie manuellement · calcul théorique ${km} km${ascent}`
            :`Distance calculée ≈ ${km} km${ascent}`;
        }
        reset.classList.toggle('hidden',!cardio.distanceManual||!!cardio.done);
      }

      ['speed','duration','incline'].forEach(field=>{
        const input=grid.querySelector(`[data-cardio="${field}"]`);
        if(!input)return;
        input.addEventListener('input',()=>{
          cardio[field]=input.value;
          if(field!=='incline'&&autoFill(cardio))distanceInput.value=cardio.distance;
          save();
          updateLabel();
        });
      });

      distanceInput.addEventListener('input',()=>{
        cardio.distance=distanceInput.value;
        cardio.distanceManual=true;
        cardio.distanceSource='manual';
        save();updateLabel();
      });
      reset.onclick=()=>{
        autoFill(cardio,true);
        distanceInput.value=cardio.distance;
        save();updateLabel();
      };
      updateLabel();
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-treadmill-calculated{display:flex;align-items:center;justify-content:space-between;gap:8px;
      margin:5px 0 12px;padding:9px 10px;border-radius:10px;background:rgba(34,197,94,.09);
      border:1px solid rgba(34,197,94,.25);font-size:11px;line-height:1.4;color:#bbf7d0}
    .mt-treadmill-calculated span{flex:1}
    .mt-treadmill-auto-btn{font-size:11px;padding:6px 9px;white-space:nowrap}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){const result=previousRender();decorateWorkout();return result;};
    window.renderWorkout=renderWorkout;
  }
  decorateWorkout();
})();
