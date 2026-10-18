(()=>{
  'use strict';
  if(window.MyTeamQuickEntry)return;
  window.MyTeamQuickEntry=true;

  const $=id=>document.getElementById(id);
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
  const isoDay=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  let voicePrivacyAccepted=false;

  // Les propositions proviennent exclusivement des noms déjà connus sur cet appareil.
  function knownAgents(){
    const deleted=new Set(read('myteam_deleted_agents_v1',[]));
    const profiles=read('myteam_agent_profiles_v1',{});
    const fromSelect=Array.from($('agent-select')?.options||[]).map(o=>o.value).filter(Boolean);
    const names=[...new Set([...Object.keys(profiles&&typeof profiles==='object'&&!Array.isArray(profiles)?profiles:{}),...fromSelect])];
    return names.filter(name=>!deleted.has(name)).map(name=>({name,team:profiles[name]?.team}));
  }
  function distance(a,b){
    if(a===b)return 0;
    const prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let diagonal=prev[0];prev[0]=i;
      for(let j=1;j<=b.length;j++){
        const old=prev[j];
        prev[j]=Math.min(prev[j]+1,prev[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));
        diagonal=old;
      }
    }
    return prev[b.length];
  }
  function scoreName(query,name){
    const q=normalize(query),n=normalize(name);
    if(!q||!n)return 0;
    if(q===n)return 110;
    const qt=q.split(' '),nt=n.split(' ');
    const similarities=qt.map(word=>Math.max(...nt.map(other=>{
      if(word===other)return 1;
      if(other.startsWith(word))return .89;
      if(word.length<3)return 0;
      return Math.max(0,1-distance(word,other)/Math.max(word.length,other.length));
    })));
    const average=similarities.reduce((sum,x)=>sum+x,0)/similarities.length;
    return average*90+(n.includes(q)?16:0)+(similarities.every(x=>x>=.72)?12:0);
  }
  function rankedNames(query){
    return knownAgents().map(agent=>({...agent,score:scoreName(query,agent.name)}))
      .filter(agent=>agent.score>34)
      .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'fr'))
      .slice(0,6);
  }

  function attachNameHelp(input){
    if(!input||input.dataset.mtNameHelp)return;
    input.dataset.mtNameHelp='1';
    input.setAttribute('autocomplete','off');
    const wrapper=document.createElement('div');wrapper.className='mt-name-field';
    input.before(wrapper);wrapper.append(input);
    const mic=document.createElement('button');mic.type='button';mic.className='mt-name-mic';
    mic.textContent='🎙️';mic.title='Dicter un nom';mic.setAttribute('aria-label','Dicter un nom d’agent');
    wrapper.append(mic);
    const status=document.createElement('p');status.className='mt-name-status';status.setAttribute('role','status');
    const suggestions=document.createElement('div');suggestions.className='mt-name-suggestions';
    suggestions.setAttribute('role','group');suggestions.setAttribute('aria-label','Noms d’agents proposés');
    wrapper.after(status,suggestions);
    const show=(spoken=false)=>{
      suggestions.replaceChildren();
      const query=input.value.trim();if(!query)return;
      const candidates=rankedNames(query);
      if(spoken)status.textContent=candidates.length?'Nom entendu : « '+query+' ». Vérifie et choisis le bon agent.':'Nom entendu : « '+query+' ». Aucun nom assez proche : corrige au clavier.';
      for(const agent of candidates){
        const button=document.createElement('button');button.type='button';button.className='mt-name-option';
        const name=document.createElement('span');name.textContent=agent.name;
        const tag=document.createElement('small');tag.textContent=[1,2,3,4].includes(Number(agent.team))?'Équipe '+agent.team:'Agent enregistré';
        button.append(name,tag);
        button.onclick=()=>{input.value=agent.name;input.dispatchEvent(new Event('input',{bubbles:true}));suggestions.replaceChildren();status.textContent='Nom sélectionné : '+agent.name+'. Vérifie avant d’enregistrer.';input.focus()};
        suggestions.append(button);
      }
    };
    input.addEventListener('input',()=>{status.textContent='';show()});
    input.addEventListener('focus',()=>{if(input.value.trim())show()});
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    mic.onclick=()=>{
      if(!Recognition){status.textContent='Reconnaissance vocale indisponible ici. Utilise le micro du clavier de ton téléphone.';input.focus();return;}
      if(!voicePrivacyAccepted){
        if(!confirm('Le service de reconnaissance vocale de ton navigateur peut traiter la voix en ligne. MyTEAM n’enregistre pas l’audio. Autoriser la dictée pour ce chargement de l’application ?'))return;
        voicePrivacyAccepted=true;
      }
      let recognition;
      try{
        recognition=new Recognition();recognition.lang='fr-FR';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=4;
        recognition.onresult=event=>{
          const alternatives=Array.from(event.results?.[0]||[]).map(x=>x.transcript?.trim()).filter(Boolean);
          if(!alternatives.length){status.textContent='Aucun nom reconnu. Réessaie.';return;}
          // Lorsque le navigateur propose plusieurs transcriptions, retenir celle qui se rapproche le plus de la liste locale.
          const heard=alternatives.sort((a,b)=>(rankedNames(b)[0]?.score||0)-(rankedNames(a)[0]?.score||0))[0];
          input.value=heard;input.dispatchEvent(new Event('input',{bubbles:true}));show(true);
        };
        recognition.onerror=event=>{status.textContent=event.error==='not-allowed'?'Micro non autorisé. Tu peux saisir le nom au clavier.':'Dictée indisponible. Utilise le clavier ou son micro.'};
        recognition.onend=()=>{mic.disabled=false;mic.textContent='🎙️'};
        recognition.start();mic.disabled=true;mic.textContent='…';status.textContent='Je t’écoute… Prononce le prénom et le nom.';
      }catch{mic.disabled=false;mic.textContent='🎙️';status.textContent='Impossible de démarrer la dictée. Utilise le clavier.';}
    };
  }

  // Saisie prédictive partout où un nom est demandé, sans changer la logique des formulaires.
  attachNameHelp($('ad-search'));
  attachNameHelp(document.querySelector('#mt-replacement-form [name="absent"]'));
  attachNameHelp(document.querySelector('#mt-replacement-form [name="replacement"]'));
  attachNameHelp($('leave-agent'));
  attachNameHelp($('agent-name'));

  const shiftBox=$('mt-my-shifts');if(!shiftBox)return;
  const editor=document.createElement('div');editor.className='mt-post-editor';
  editor.innerHTML=`<button type="button" id="mt-post-edit-open" class="mt-primary">✏️ Modifier mon poste du jour</button>
    <div id="mt-post-edit-panel" class="hidden">
      <p class="mt-post-disclaimer">Modification de ton <strong>planning privé sur cet appareil</strong>, sans changement d’affectation officielle.</p>
      <form id="mt-post-edit-form">
        <label id="mt-post-shift-label">Vacation à corriger<select id="mt-post-shift"></select></label>
        <label>Poste / affectation<input id="mt-post-name" type="text" maxlength="140" required placeholder="Ex. E84 X Ray Matin" list="mt-known-posts"></label>
        <datalist id="mt-known-posts"><option value="E14"></option><option value="E32"></option><option value="E84"></option><option value="E85"></option><option value="E112"></option><option value="Formation"></option><option value="Renfort"></option></datalist>
        <div id="mt-post-times" class="mt-post-times hidden"><label>Début<input id="mt-post-start" type="time"></label><label>Fin<input id="mt-post-end" type="time"></label></div>
        <div id="mt-post-preview" class="mt-post-preview hidden" role="status"></div>
        <div class="actions"><button type="submit" id="mt-post-preview-button" class="mt-primary">Prévisualiser</button><button type="button" id="mt-post-confirm" class="hidden mt-primary">Confirmer la correction</button><button type="button" id="mt-post-cancel">Annuler</button></div>
      </form>
      <p id="mt-post-edit-status" role="status" class="mt-note"></p>
    </div>`;
  shiftBox.after(editor);
  const SHIFTS='myteam_shifts',HISTORY='myteam_today_post_edits_v1';
  const panel=$('mt-post-edit-panel'),form=$('mt-post-edit-form'),select=$('mt-post-shift');
  const nameField=$('mt-post-name'),times=$('mt-post-times'),startField=$('mt-post-start'),endField=$('mt-post-end');
  const previewBox=$('mt-post-preview'),confirmButton=$('mt-post-confirm'),status=$('mt-post-edit-status');
  let baseline='',draft=null;
  function shiftsNow(){const rows=read(SHIFTS,[]);return Array.isArray(rows)?rows:[];}
  function clearPreview(){draft=null;previewBox.classList.add('hidden');previewBox.replaceChildren();confirmButton.classList.add('hidden')}
  function onShiftChange(){
    clearPreview();const rows=shiftsNow(),index=Number(select.value),shift=index>=0?rows[index]:null;
    nameField.value=shift?.post||'';
    startField.value=shift?.start||'';endField.value=shift?.end||'';
    times.classList.toggle('hidden',Boolean(shift));
    startField.required=!shift;endField.required=!shift;
  }
  function openEditor(){
    baseline=localStorage.getItem(SHIFTS)||'';
    const date=isoDay(new Date()),rows=shiftsNow();
    select.replaceChildren();
    rows.forEach((row,index)=>{
      if(row?.date!==date)return;
      const option=document.createElement('option');option.value=String(index);
      option.textContent=`${row.start||'?'}–${row.end||'?'} · ${row.post||'Poste non renseigné'}`;
      select.append(option);
    });
    if(!select.options.length){const option=document.createElement('option');option.value='-1';option.textContent='Ajouter une vacation personnelle';select.append(option);}
    $('mt-post-shift-label').classList.toggle('hidden',select.options.length===1);
    panel.classList.remove('hidden');$('mt-post-edit-open').classList.add('hidden');
    status.textContent='';onShiftChange();nameField.focus();
  }
  function closeEditor(){panel.classList.add('hidden');$('mt-post-edit-open').classList.remove('hidden');clearPreview()}
  function shiftType(start,end,post){
    if(/formation/i.test(post))return'training';
    const a=Number(start.slice(0,2))*60+Number(start.slice(3)),b=Number(end.slice(0,2))*60+Number(end.slice(3));
    if(b<=a||a>=20*60||a<4*60)return'night';
    return a<12*60?'morning':'afternoon';
  }
  $('mt-post-edit-open').onclick=openEditor;
  $('mt-post-cancel').onclick=closeEditor;
  select.onchange=onShiftChange;
  for(const input of [nameField,startField,endField])input.addEventListener('input',clearPreview);
  form.onsubmit=event=>{
    event.preventDefault();clearPreview();
    if((localStorage.getItem(SHIFTS)||'')!==baseline){status.textContent='Le planning a changé entre-temps. Rouvre le formulaire pour voir les données à jour.';return;}
    const name=nameField.value.trim();if(!name){status.textContent='Indique le poste.';return;}
    const rows=shiftsNow(),index=Number(select.value),old=index>=0?rows[index]:null;
    if(index>=0&&(!old||old.date!==isoDay(new Date()))){status.textContent='Vacation introuvable. Rouvre le formulaire.';return;}
    const start=old?.start||startField.value,end=old?.end||endField.value;
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||start===end){status.textContent='Indique des heures de début et de fin valides.';return;}
    if(old&&old.post===name){status.textContent='Le poste est déjà identique : aucune correction nécessaire.';return;}
    const next=old?{...old,post:name}:{date:isoDay(new Date()),start,end,post:name,type:shiftType(start,end,name)};
    draft={baseline,index,old,next};
    const before=old?`${old.start}–${old.end} · ${old.post||'Poste non renseigné'}`:'Aucune vacation enregistrée aujourd’hui';
    const after=`${next.start}–${next.end} · ${next.post}`;
    previewBox.replaceChildren();
    for(const line of [`AVANT : ${before}`,`APRÈS : ${after}`,'Cette confirmation change uniquement le planning personnel stocké sur ton appareil.']){
      const p=document.createElement('p');p.textContent=line;previewBox.append(p);
    }
    previewBox.classList.remove('hidden');confirmButton.classList.remove('hidden');
    status.textContent='Vérifie la correction ci-dessus, puis confirme si elle est exacte.';
  };
  confirmButton.onclick=()=>{
    if(!draft)return;
    if((localStorage.getItem(SHIFTS)||'')!==draft.baseline){clearPreview();status.textContent='Planning modifié depuis la prévisualisation. Recommence pour éviter un écrasement.';return;}
    const rows=shiftsNow(),{index,old,next}=draft;
    if(index>=0&&JSON.stringify(rows[index])!==JSON.stringify(old)){clearPreview();status.textContent='La vacation a changé. Aucune correction appliquée.';return;}
    if(index>=0)rows[index]=next;else rows.push(next);
    const previousHistory=localStorage.getItem(HISTORY),history=read(HISTORY,[]);
    const entry={at:new Date().toISOString(),date:next.date,before:old,after:next};
    try{
      localStorage.setItem(HISTORY,JSON.stringify([...(Array.isArray(history)?history:[]),entry].slice(-40)));
      localStorage.setItem(SHIFTS,JSON.stringify(rows));
      status.textContent='Correction personnelle enregistrée. Actualisation du planning…';
      confirmButton.disabled=true;setTimeout(()=>location.reload(),250);
    }catch{
      try{if(previousHistory===null)localStorage.removeItem(HISTORY);else localStorage.setItem(HISTORY,previousHistory)}catch{}
      status.textContent='Enregistrement impossible. Les données du planning n’ont pas été modifiées.';
    }
  };
})();
