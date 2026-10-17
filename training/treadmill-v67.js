/* My Training v67 — treadmill average HR capture + cardio history display */
(function(){
  function cleanNumber(v){
    const n=String(v??'').replace(',','.').replace(/[^0-9.]/g,'');
    return n;
  }

  function addHrToNote(e,value){
    const hr=cleanNumber(value);
    const base=String(e.note||'')
      .replace(/\s*•?\s*FC moyenne\s*:\s*\d+(?:[.,]\d+)?\s*bpm/ig,'')
      .replace(/\s{2,}/g,' ')
      .trim()
      .replace(/\s*•\s*$/,'');
    e.cardio.avgHr=hr;
    e.note=hr?`${base}${base?' • ':''}FC moyenne: ${hr} bpm`:base;
  }

  function attachAverageHrInputs(){
    const w=state.activeWorkout;
    if(!w)return;

    document.querySelectorAll('#exerciseList .cardio-grid').forEach(grid=>{
      const ei=Number(grid.dataset.e);
      const e=w.exercises?.[ei];
      if(!e?.cardio)return;
      if(e.cardio.avgHr==null)e.cardio.avgHr='';

      let input=grid.querySelector('[data-cardio="avgHr"]');
      if(!input){
        const label=document.createElement('label');
        label.className='mt-cardio-hr-label';
        label.innerHTML=`FC moyenne bpm<input inputmode="numeric" type="number" min="40" max="230" step="1" data-cardio="avgHr" value="${String(e.cardio.avgHr||'').replace(/"/g,'&quot;')}" placeholder="ex. 132"><small>À renseigner à la fin</small>`;
        grid.appendChild(label);
        input=label.querySelector('input');
      }

      input.disabled=!!e.cardio.done;
      const persist=()=>{
        addHrToNote(e,input.value);
        save();
      };
      input.oninput=persist;
      input.onchange=persist;
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-cardio-hr-label{grid-column:1/-1}
    .mt-cardio-hr-label small{display:block;margin-top:5px;color:var(--muted);font-size:10px}
    .mt-cardio-hr-label input{font-weight:800}
  `;
  document.head.appendChild(style);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){
      previousRender();
      attachAverageHrInputs();
    };
    window.renderWorkout=renderWorkout;
  }

  if(typeof cardioSummary==='function'){
    const previousSummary=cardioSummary;
    cardioSummary=function(row){
      const base=previousSummary(row);
      const m=String(row?.exercise_notes||'').match(/FC moyenne\s*:\s*(\d+(?:[.,]\d+)?)\s*bpm/i);
      return m?`${base} • FC moy. ${m[1]} bpm`:base;
    };
    window.cardioSummary=cardioSummary;
  }

  attachAverageHrInputs();
})();
