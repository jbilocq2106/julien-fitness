(()=>{
  const roster=[
    {name:'ADAM Manon',gender:'F',rx:false,piste:false},
    {name:'BORGESE Myriam',gender:'F',rx:true,piste:true},
    {name:'DAL FARRA Shirley',gender:'F',rx:true,piste:false},
    {name:"D'AVERSI Margaux",gender:'F',rx:true,piste:true},
    {name:'DIELS Elisa',gender:'F',rx:false,piste:false},
    {name:'GAGNANT Deborah',gender:'F',rx:true,piste:true},
    {name:'GARCIA Maeva',gender:'F',rx:false,piste:false},
    {name:'LUCK Océane',gender:'F',rx:false,piste:false},
    {name:'OUINNE Melyse',gender:'F',rx:false,piste:false},
    {name:'WILTGEN Ophélie',gender:'F',rx:false,piste:false},
    {name:'BERAUT Geoffrey',gender:'M',rx:true,piste:true},
    {name:'BIGONI-HOUDUSSE Alexandre',gender:'M',rx:true,piste:false},
    {name:'BILOCQ Julien',gender:'M',rx:true,piste:true},
    {name:'BURG Jeremy',gender:'M',rx:false,piste:true},
    {name:'CLESEUR Noah',gender:'M',rx:false,piste:true},
    {name:'DORRION Albert',gender:'M',rx:false,piste:false},
    {name:'FREZAL Joey',gender:'M',rx:true,piste:false},
    {name:'HENRAT Corentin',gender:'M',rx:true,piste:true},
    {name:'HUMMEL Aurelien',gender:'M',rx:false,piste:false},
    {name:'JACOTEZ Tim',gender:'M',rx:true,piste:true},
    {name:'MATEI Vitor',gender:'M',rx:false,piste:false},
    {name:'PANATO Joey',gender:'M',rx:false,piste:true},
    {name:'SANDSTROM Mike',gender:'M',rx:true,piste:false},
    {name:'SCARPINO Loic',gender:'M',rx:false,piste:true},
    {name:'STASIAK Valentin',gender:'M',rx:false,piste:false},
    {name:'TUMMINELLI Attilio',gender:'M',rx:false,piste:true},
    {name:'WILLEMS Jeremy',gender:'M',rx:true,piste:false}
  ];

  if(typeof agentProfiles==='undefined'||typeof renderAgents!=='function')return;
  const clean=v=>String(v??'').trim();

  // Récupère d'abord les fiches de l'ancienne version si elles existent encore.
  for(const key of ['myTeam.v2','myTeam.v1']){
    let legacy=null;
    try{legacy=JSON.parse(localStorage.getItem(key)||'null')}catch{}
    if(!legacy||!Array.isArray(legacy.agents))continue;
    for(const a of legacy.agents){
      const name=clean(a?.name); if(!name)continue;
      const cur=agentProfiles[name]||{};
      const parts=[];
      for(const [label,val] of [['Qualifications / habilitations',a.quals],['Postes maîtrisés',a.posts],['Desiderata / préférences',a.prefs],['Contraintes professionnelles',a.less],['Points positifs / efforts',a.positives],['Suivi factuel',a.notes]]){
        if(clean(val))parts.push(label+' : '+clean(val));
      }
      const recovered=parts.join('\n');
      agentProfiles[name]={...cur,notes:clean(cur.notes)||recovered,team:4};
    }
  }

  // Base de référence Team 4 : complète les fiches sans effacer les notes déjà saisies.
  for(const a of roster){
    const cur=agentProfiles[a.name]||{};
    agentProfiles[a.name]={...cur,gender:a.gender,team:4,rxCertified:a.rx,pistePermit:a.piste};
  }
  localStorage.setItem(agentKey,JSON.stringify(agentProfiles));
  renderAgents();

  const status=document.querySelector('#agent-import-status');
  if(status)status.textContent='27 agents Team 4 chargés • 12 RX • 12 permis piste. Données locales conservées.';

  const search=document.querySelector('#agent-search');
  const list=document.querySelector('#agent-roster');
  function drawRoster(){
    if(!list)return;
    const q=(search?.value||'').trim().toLocaleLowerCase('fr');
    const rows=roster.filter(a=>!q||a.name.toLocaleLowerCase('fr').includes(q));
    list.innerHTML=rows.map(a=>`<button type="button" class="agent-row" data-agent="${a.name.replace(/"/g,'&quot;')}"><span><strong>${a.name}</strong><small>${a.gender==='F'?'Femme':'Homme'}</small></span><span class="agent-tags">${a.rx?'<b>RX</b>':''}${a.piste?'<b>PISTE</b>':''}</span></button>`).join('');
    list.querySelectorAll('[data-agent]').forEach(b=>b.onclick=()=>{
      agentSelect.value=b.dataset.agent;
      agentSelect.dispatchEvent(new Event('change'));
      document.querySelector('#agent-detail')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  search?.addEventListener('input',drawRoster);
  drawRoster();

  // Suivi mensuel RX : restaure les champs ajoutés à la fiche.
  const month=document.querySelector('#agent-rx-month');
  const target=document.querySelector('#agent-rx-target');
  const done=document.querySelector('#agent-rx-done');
  const remaining=document.querySelector('#agent-rx-remaining');
  function loadRx(){
    const p=agentProfiles[agentSelect.value];
    if(!p)return;
    if(month)month.value=p.rxMonth||'';
    if(target)target.value=p.rxTarget??'';
    if(done)done.value=p.rxDone??'';
    updateRemaining();
  }
  function updateRemaining(){
    if(!remaining)return;
    const t=Number(target?.value||0),d=Number(done?.value||0),r=Math.max(0,t-d);
    remaining.textContent=t?`Reste ${r} min sur ${t} min ce mois.`:'';
  }
  agentSelect.addEventListener('change',loadRx);
  target?.addEventListener('input',updateRemaining);
  done?.addEventListener('input',updateRemaining);
  const save=document.querySelector('#agent-save');
  if(save){
    const previous=save.onclick;
    save.onclick=()=>{
      if(previous)previous();
      const name=agentSelect.value;if(!name||!agentProfiles[name])return;
      agentProfiles[name].rxMonth=month?.value||'';
      agentProfiles[name].rxTarget=Math.max(0,Number(target?.value||0));
      agentProfiles[name].rxDone=Math.max(0,Number(done?.value||0));
      localStorage.setItem(agentKey,JSON.stringify(agentProfiles));
      updateRemaining();
    };
  }
})();
