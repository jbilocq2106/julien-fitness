/* My Training v79 — personal cardio HR reference from completed treadmill sessions */
(function(){
  const REF_KEY='mt_cardio_hr_reference_v1';
  const PATCH_KEY='mt_cardio_hr_patch_20261016_125_v1';

  function num(v){
    const n=Number(String(v??'').replace(',','.').replace(/[^0-9.\-]/g,''));
    return Number.isFinite(n)?n:0;
  }
  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function isTreadmillRow(r){
    const name=norm(r?.exercise_title||'');
    return name.includes('tapis') || r?.set_type==='cardio';
  }
  function dateMs(r){
    const d=Date.parse(r?.start_time||'');
    return Number.isFinite(d)?d:0;
  }
  function hrFromRow(r){
    const direct=num(r?.avg_hr||r?.avgHr||r?.heart_rate_avg||r?.average_heart_rate);
    if(direct)return direct;
    const m=String(r?.exercise_notes||'').match(/FC\s*(?:moyenne|moy\.)\s*:\s*(\d+(?:[.,]\d+)?)\s*bpm/i);
    return m?num(m[1]):0;
  }
  function loadRef(){
    try{return JSON.parse(localStorage.getItem(REF_KEY)||'null');}catch(e){return null;}
  }
  function saveRef(avgHr,startTime,source='history'){
    const hr=Math.round(num(avgHr));
    if(!hr)return;
    try{localStorage.setItem(REF_KEY,JSON.stringify({avgHr:hr,startTime:startTime||null,source,updatedAt:new Date().toISOString()}));}catch(e){}
  }

  function patchLatestTreadmillTo125(){
    if(localStorage.getItem(PATCH_KEY)==='done')return;
    const rows=(state?.history||[]).filter(isTreadmillRow).sort((a,b)=>dateMs(b)-dateMs(a));
    if(!rows.length)return;
    const r=rows[0];
    r.avg_hr=125;
    const base=String(r.exercise_notes||'')
      .replace(/\s*•?\s*FC\s*(?:moyenne|moy\.)\s*:\s*\d+(?:[.,]\d+)?\s*bpm/ig,'')
      .replace(/\s{2,}/g,' ')
      .trim()
      .replace(/\s*•\s*$/,'');
    r.exercise_notes=`${base}${base?' • ':''}FC moyenne: 125 bpm`;
    if(typeof save==='function')save();
    saveRef(125,r.start_time,'manual-confirmed');
    localStorage.setItem(PATCH_KEY,'done');
  }

  function refreshReferenceFromHistory(){
    const rows=(state?.history||[])
      .filter(isTreadmillRow)
      .map(r=>({r,hr:hrFromRow(r)}))
      .filter(x=>x.hr>0)
      .sort((a,b)=>dateMs(b.r)-dateMs(a.r));
    if(!rows.length)return loadRef();
    const latest=rows[0];
    saveRef(latest.hr,latest.r.start_time,'history');
    return loadRef();
  }

  function referenceText(){
    const ref=refreshReferenceFromHistory()||loadRef();
    return ref?.avgHr?`Référence perso : dernière FC moyenne ${Math.round(ref.avgHr)} bpm`:'';
  }

  function decorateWorkout(){
    const text=referenceText();
    if(!text)return;
    document.querySelectorAll('#exerciseList .cardio-grid').forEach(grid=>{
      let box=grid.querySelector('.mt-cardio-ref-v79');
      if(!box){
        box=document.createElement('div');
        box.className='mt-cardio-ref-v79';
        grid.appendChild(box);
      }
      box.textContent=text+' — renseigne ta FC réelle à la fin pour mettre la référence à jour.';
    });
  }

  function decorateProgram(){
    const text=referenceText();
    if(!text)return;
    document.querySelectorAll('#mtCardioProgram .session-card').forEach(card=>{
      let box=card.querySelector('.mt-cardio-ref-v79');
      if(!box){
        box=document.createElement('div');
        box.className='mt-cardio-ref-v79 mt-cardio-ref-program-v79';
        const panel=card.querySelector('.duration-panel')||card;
        panel.appendChild(box);
      }
      box.textContent=text;
    });
  }

  function comparisonText(hr){
    const ref=loadRef();
    const current=Math.round(num(hr));
    if(!ref?.avgHr||!current)return '';
    const diff=current-Math.round(ref.avgHr);
    if(Math.abs(diff)<=4)return `Intensité cardio proche de ta référence (${ref.avgHr} bpm).`;
    if(diff>0)return `FC moyenne ${diff} bpm au-dessus de ta référence (${ref.avgHr} bpm).`;
    return `FC moyenne ${Math.abs(diff)} bpm sous ta référence (${ref.avgHr} bpm).`;
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-cardio-ref-v79{grid-column:1/-1;margin-top:8px;padding:9px 10px;border:1px solid rgba(96,165,250,.28);border-radius:10px;background:rgba(30,64,175,.12);color:#bfdbfe;font-size:12px;font-weight:800;line-height:1.35}
    .mt-cardio-ref-program-v79{margin:9px 0 0}
  `;
  document.head.appendChild(style);

  patchLatestTreadmillTo125();
  refreshReferenceFromHistory();

  if(typeof renderWorkout==='function'){
    const prevWorkout=renderWorkout;
    renderWorkout=function(){
      const out=prevWorkout();
      decorateWorkout();
      return out;
    };
    window.renderWorkout=renderWorkout;
  }

  if(typeof renderProgram==='function'){
    const prevProgram=renderProgram;
    renderProgram=function(){
      const out=prevProgram();
      decorateProgram();
      return out;
    };
    window.renderProgram=renderProgram;
  }

  // Keep the personal reference current whenever a cardio HR input changes.
  document.addEventListener('change',e=>{
    const el=e.target;
    if(!(el instanceof HTMLInputElement)||el.dataset.cardio!=='avgHr')return;
    const hr=Math.round(num(el.value));
    if(hr)saveRef(hr,new Date().toISOString(),'active-workout');
    decorateWorkout();
    decorateProgram();
  });

  window.mtCardioReference={
    get:()=>loadRef(),
    refresh:refreshReferenceFromHistory,
    compare:comparisonText
  };

  decorateWorkout();
  decorateProgram();
})();
