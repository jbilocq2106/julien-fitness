/* My Training v86 — corrections des exercices une fois la séance enregistrée.
   Les corrections n'affectent pas la séance éventuellement en cours. */
(function(){
  'use strict';

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function matchesWorkout(row,key){
    return `${row.title||''}|${row.start_time||''}`===key;
  }
  function rowsForWorkout(key){
    return (state.history||[]).filter(row=>matchesWorkout(row,key));
  }
  function cardioRow(row,name){
    return row.set_type==='cardio'||(row.set_type!=='normal'&&
      (Number(row.duration_seconds)>0||Number(row.distance_km)>0))||
      (typeof isCardioName==='function'&&isCardioName(name));
  }
  function decimal(value){
    return value===undefined||value===null||value===''?'':String(value);
  }
  function field(index,key,label,value,unit,options={}){
    const opts={min:0,max:options.max??600,step:options.step??'any'};
    const suffix=unit?`<span class="mt-post-unit">${escapeHtml(unit)}</span>`:'';
    return `<label class="mt-post-field"><span>${escapeHtml(label)}</span>
      <span class="mt-post-input-wrap"><input type="number" inputmode="decimal"
        class="mt-post-value" data-row="${index}" data-field="${key}"
        min="${opts.min}" max="${opts.max}" step="${opts.step}"
        value="${escapeHtml(value)}">${suffix}</span></label>`;
  }

  function exerciseGroups(rows){
    const groups=new Map();
    rows.forEach((row,i)=>{
      const name=row.exercise_title||'Exercice';
      if(!groups.has(name))groups.set(name,{name,entries:[]});
      groups.get(name).entries.push({row,index:i});
    });
    return [...groups.values()];
  }

  function exerciseEditor(group,groupIndex){
    const isCardio=group.entries.some(({row})=>cardioRow(row,group.name));
    const entries=group.entries.map(({row,index},position)=>{
      if(isCardio){
        const mins=Number(row.duration_seconds)>0
          ?Math.round(Number(row.duration_seconds)/60*100)/100:'';
        return `<div class="mt-post-set mt-post-cardio" data-cardio-index="${index}">
          ${group.entries.length>1?`<div class="mt-post-set-name">Passage ${position+1}</div>`:''}
          <div class="mt-post-fields">
            ${field(index,'distance_km','Distance',decimal(row.distance_km),'km',{max:200,step:0.01})}
            ${field(index,'duration_minutes','Durée',decimal(mins),'min',{max:720,step:0.1})}
            ${field(index,'speed_kmh','Vitesse',decimal(row.speed_kmh),'km/h',{max:30,step:0.1})}
            ${field(index,'incline_percent','Inclinaison',decimal(row.incline_percent),'%',{max:35,step:0.5})}
          </div>
          <button type="button" class="ghost mt-post-calc" data-calc="${index}">↻ Recalculer la distance depuis la vitesse et la durée</button>
        </div>`;
      }
      const quality=row.technique_quality==='less_clean'?'less_clean':
        row.technique_quality==='clean'?'clean':'';
      return `<div class="mt-post-set">
        <div class="mt-post-set-name">Série ${row.set_index!=null?Number(row.set_index)+1:position+1}</div>
        <div class="mt-post-fields">
          ${field(index,'weight_kg','Charge',decimal(row.weight_kg),'kg',{max:600,step:0.5})}
          ${field(index,'reps','Répétitions',decimal(row.reps),'',{max:100,step:1})}
          ${field(index,'rir','RIR',decimal(row.rir),'',{max:10,step:1})}
        </div>
        <label class="mt-post-quality-label">Qualité de cette série
          <select class="mt-post-value" data-row="${index}" data-field="technique_quality">
            <option value="" ${quality===''?'selected':''}>Non précisée</option>
            <option value="clean" ${quality==='clean'?'selected':''}>Propre</option>
            <option value="less_clean" ${quality==='less_clean'?'selected':''}>Moins propre</option>
          </select>
        </label>
      </div>`;
    }).join('');
    return `<section class="mt-post-exercise" id="mt-post-exercise-${groupIndex}">
      <h3>${escapeHtml(group.name)}</h3>
      ${entries}
    </section>`;
  }

  function openEditor(key,focusName){
    const rows=rowsForWorkout(key);
    if(!rows.length)return;
    const groups=exerciseGroups(rows);
    const modal=document.getElementById('sessionModal');
    const body=document.getElementById('sessionDetailBody');
    const title=document.getElementById('sessionDetailTitle');
    const meta=document.getElementById('sessionDetailMeta');
    if(!modal||!body||!title||!meta)return;

    title.textContent='Corriger les exercices';
    meta.textContent=rows[0].title||'Séance enregistrée';
    body.innerHTML=`<div class="mt-post-intro">Les modifications ne seront enregistrées qu’après validation. La distance du tapis peut être corrigée manuellement.</div>
      ${groups.map(exerciseEditor).join('')}
      <div class="mt-post-actions">
        <button type="button" class="ghost" id="mt-post-cancel">Annuler</button>
        <button type="button" class="primary" id="mt-post-save">Enregistrer les corrections</button>
      </div>`;
    modal.classList.remove('hidden');

    body.querySelector('#mt-post-cancel').onclick=()=>openWorkoutDetail(key);
    body.querySelectorAll('[data-calc]').forEach(button=>{
      button.onclick=()=>{
        const index=button.dataset.calc;
        const speed=Number(body.querySelector(`[data-row="${index}"][data-field="speed_kmh"]`)?.value);
        const minutes=Number(body.querySelector(`[data-row="${index}"][data-field="duration_minutes"]`)?.value);
        if(speed<=0||minutes<=0){
          alert('Renseigne une vitesse et une durée positives pour calculer la distance.');
          return;
        }
        const distance=body.querySelector(`[data-row="${index}"][data-field="distance_km"]`);
        distance.value=(speed*minutes/60).toFixed(2);
      };
    });
    body.querySelector('#mt-post-save').onclick=()=>{
      const draft=rows.map(row=>({...row}));
      const fields=body.querySelectorAll('.mt-post-value');
      const limits={distance_km:200,duration_minutes:720,speed_kmh:30,
        incline_percent:35,weight_kg:600,reps:100,rir:10};
      for(const input of fields){
        const index=Number(input.dataset.row);
        const name=input.dataset.field;
        if(!Number.isInteger(index)||index<0||index>=draft.length||
          !Object.prototype.hasOwnProperty.call(limits,name)&&name!=='technique_quality')continue;
        if(name==='technique_quality'){
          draft[index][name]=input.value;
          draft[index].technique_set=Number(draft[index].set_index)+1;
          continue;
        }
        const raw=input.value.trim().replace(',','.');
        const value=raw===''?'':Number(raw);
        const integerField=name==='reps'||name==='rir';
        if(value!==''&&(!Number.isFinite(value)||value<0||value>limits[name]||
          (integerField&&!Number.isInteger(value)))){
          alert(`Vérifie « ${input.closest('label')?.querySelector('span')?.textContent||name} ».`);
          input.focus();
          return;
        }
        if(name==='duration_minutes')draft[index].duration_seconds=value===''?'':Math.round(value*60);
        else draft[index][name]=value;
      }

      const newTechniqueWarnings=draft.filter((row,i)=>
        row.technique_quality==='less_clean'&&rows[i].technique_quality!=='less_clean'
      );
      // Aucune modification tant que l'ensemble des valeurs n'a pas été validé.
      draft.forEach((row,i)=>Object.assign(rows[i],row));
      // Une correction rétroactive « moins propre » doit aussi empêcher une
      // progression automatique trop ambitieuse aux prochaines séances.
      const affected=new Map();
      newTechniqueWarnings.forEach(row=>{
        // Une vieille séance ne doit pas annuler les progrès effectués depuis.
        const newer=(state.history||[]).some(other=>
          other.exercise_title===row.exercise_title&&
          Date.parse(other.start_time)>Date.parse(row.start_time)
        );
        if(newer)return;
        const family=typeof exerciseFamily==='function'?exerciseFamily(row.exercise_title):null;
        if(!family)return;
        const top=Math.max(0,...rows.filter(r=>r.exercise_title===row.exercise_title)
          .map(r=>Number(r.weight_kg)||0));
        if(top>0)affected.set(family,Math.max(affected.get(family)||0,top));
      });
      affected.forEach((maxWeight,family)=>{
        const previous=Number(state.progressionOverrides?.[family])||0;
        if(!state.progressionOverrides)state.progressionOverrides={};
        state.progressionOverrides[family]=previous>0?Math.min(previous,maxWeight):maxWeight;
      });
      save();
      try{renderHome();}catch(e){}
      try{renderHistory();}catch(e){}
      try{renderStatsSelect();}catch(e){}
      try{if(affected.size){applyProgressionOverrides();renderProgram();}}catch(e){}
      openWorkoutDetail(key);
    };

    if(focusName){
      const focusIndex=groups.findIndex(group=>group.name===focusName);
      if(focusIndex>=0)requestAnimationFrame(()=>{
        const target=document.getElementById(`mt-post-exercise-${focusIndex}`);
        target?.scrollIntoView({block:'nearest'});
        target?.querySelector('input')?.focus({preventScroll:true});
      });
    }
  }

  function decorateDetail(key){
    const body=document.getElementById('sessionDetailBody');
    if(!body||!rowsForWorkout(key).length||body.querySelector('.mt-post-toolbar'))return;
    const bar=document.createElement('div');
    bar.className='mt-post-toolbar';
    const button=document.createElement('button');
    button.type='button';
    button.className='secondary mt-post-edit-button';
    button.textContent='✎ Corriger les exercices';
    button.onclick=()=>openEditor(key);
    bar.append(button);
    body.prepend(bar);

    body.querySelectorAll('.history-exercise').forEach(card=>{
      const title=card.querySelector('h3');
      if(!title)return;
      const edit=document.createElement('button');
      edit.type='button';
      edit.className='ghost mt-post-exercise-button';
      edit.textContent='✎ Corriger';
      edit.setAttribute('aria-label',`Corriger ${title.textContent}`);
      edit.onclick=()=>openEditor(key,title.textContent);
      title.insertAdjacentElement('afterend',edit);
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-post-toolbar{display:flex;margin:0 0 10px}
    .mt-post-edit-button{width:100%;padding:10px;font-weight:800}
    .mt-post-exercise-button{font-size:11px;padding:5px 9px;margin:-3px 0 8px}
    .mt-post-intro{color:var(--muted);font-size:12px;line-height:1.5;margin:0 0 13px}
    .mt-post-exercise{background:var(--panel2);border:1px solid var(--line);border-radius:14px;
      padding:12px;margin-bottom:12px;scroll-margin-top:12px}
    .mt-post-exercise h3{font-size:15px;margin:0 0 12px;color:var(--text)}
    .mt-post-set{border-top:1px solid var(--line);padding:11px 0 3px}
    .mt-post-set-name{font-size:12px;font-weight:800;color:var(--muted);margin-bottom:9px}
    .mt-post-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .mt-post-field{display:grid;gap:5px;min-width:0;font-size:11px;font-weight:800;color:var(--muted)}
    .mt-post-input-wrap{display:flex;align-items:center;gap:5px;min-width:0}
    .mt-post-field input,.mt-post-quality-label select{width:100%;min-width:0;box-sizing:border-box;
      border:1px solid var(--line);border-radius:9px;background:#0e1727;color:var(--text);
      padding:10px 8px;font-size:16px;font-weight:800}
    .mt-post-unit{font-size:11px;color:var(--muted);flex-shrink:0}
    .mt-post-quality-label{display:grid;gap:6px;margin:12px 0 4px;font-size:11px;
      font-weight:800;color:var(--muted)}
    .mt-post-calc{margin:10px 0 5px;padding:8px;font-size:11px;text-align:left;line-height:1.35}
    .mt-post-actions{display:grid;grid-template-columns:1fr 1.7fr;gap:8px;margin:16px 0 8px}
    @media(max-width:430px){.mt-post-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  if(typeof openWorkoutDetail==='function'){
    const previousOpenWorkoutDetail=openWorkoutDetail;
    openWorkoutDetail=function(key){
      const result=previousOpenWorkoutDetail(key);
      decorateDetail(key);
      return result;
    };
    window.openWorkoutDetail=openWorkoutDetail;
  }
  window.mtCorrectRecordedExercises=openEditor;
})();
