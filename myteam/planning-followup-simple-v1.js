/* MyTEAM — suivi simplifié des plannings, rattaché aux fiches agents.
   Les anciens signalements restent intacts : aucune description n'est exposée dans l'interface. */
(()=>{
  'use strict';
  if(document.getElementById('planning-followup-simple'))return;
  const nav=document.querySelector('nav.tabs'),main=document.querySelector('main');
  if(!nav||!main)return;
  const SOURCES={
    issues:'myteam_planning_issues_v1',
    errors:'myteam_planning_errors_v1',
    simple:'myteam_planning_followups_v1'
  };
  const ALIAS_KEY='myteam_planning_agent_aliases_v1';
  const STATES=['En attente','Réglé','Sans suite'];
  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v;}catch{return fallback;}};
  const rows=key=>{const data=read(key,[]);return Array.isArray(data)?data.filter(r=>r&&typeof r==='object'&&typeof r.id==='string'):[];};
  const store=(key,data)=>{localStorage.setItem(key,JSON.stringify(data));};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\bG4S\b/gi,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean).sort().join(' ');
  const labelStatus=s=>['Corrigé','Réglé'].includes(s)?'Réglé':['Non retenu','Sans suite'].includes(s)?'Sans suite':'En attente';
  const legacyStatus=(source,status)=>status==='Réglé'?'Corrigé':status==='Sans suite'?'Non retenu':source==='issues'?'En attente de réponse':'En attente';
  const niceDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'Date non précisée';
  const profiles=()=>{const data=read('myteam_agent_profiles_v1',{});const deleted=new Set(read('myteam_deleted_agents_v1',[]));return Object.keys(data&&typeof data==='object'?data:{}).filter(n=>!deleted.has(n)).sort((a,b)=>a.localeCompare(b,'fr'));};
  const aliases=()=>read(ALIAS_KEY,{});
  function profileFor(name) {
    const candidates=profiles(),alias=aliases()[norm(name)];
    if(alias&&candidates.includes(alias))return alias;
    const exact=candidates.filter(p=>norm(p)===norm(name));
    if(exact.length===1)return exact[0];
    if(exact.length>1)return '';
    const words=norm(name).split(' ').filter(Boolean);
    if(!words.length)return '';
    const matches=candidates.filter(p=>{const tokens=norm(p).split(' ');return words.every(w=>tokens.includes(w));});
    return matches.length===1?matches[0]:'';
  }
  function allEntries(){
    const items=[];
    Object.entries(SOURCES).forEach(([source,key])=>rows(key).forEach(r=>items.push({...r,_source:source,_profile:profileFor(r.agent),_state:labelStatus(r.status)})));
    return items;
  }
  const tab=document.createElement('button');
  tab.type='button';tab.dataset.tab='planning-followup-simple';tab.textContent='✓ Suivi planning';
  nav.append(tab);
  // Les deux anciens écrans restent disponibles dans le code pour ne perdre aucune donnée,
  // mais les accès du bureau et des rappels sont redirigés vers ce suivi minimal.
  ['planning-issues','planning-errors'].forEach(id=>{
    const old=nav.querySelector('button[data-tab="'+id+'"]');
    if(old){old.dataset.deskSecondary='true';old.style.display='none';}
  });
  const section=document.createElement('section');
  section.id='planning-followup-simple';section.className='hidden';
  section.innerHTML=[
    '<div class="card"><h2>Suivi planning · Team 4</h2>',
    '<p class="mts-note">Retrouve chaque suivi dans la fiche de l’agent. Aucun détail d’erreur à saisir.</p>',
    '<div id="mts-count" class="mts-count" role="status"></div>',
    '<label class="mts-label">Rechercher un agent<input id="mts-search" type="search" placeholder="Nom de l’agent"></label>',
    '<label class="mts-label">Afficher<select id="mts-filter"><option value="">Tous les statuts</option><option>En attente</option><option>Réglé</option><option>Sans suite</option></select></label></div>',
    '<div id="mts-list"></div>',
    '<div class="card"><h3>Ajouter un suivi</h3>',
    '<form id="mts-form"><label class="mts-label">Agent<select name="agent" id="mts-agent" required></select></label>',
    '<label class="mts-label">Date concernée (facultative)<input type="date" name="date"></label>',
    '<label class="mts-label">Statut<select name="status"><option>En attente</option><option>Réglé</option><option>Sans suite</option></select></label>',
    '<button class="mts-action" type="submit">+ Enregistrer</button></form>',
    '<p id="mts-message" class="mts-note" role="status"></p></div>'
  ].join('');
  main.append(section);
  const style=document.createElement('style');
  style.textContent=[
    '#planning-followup-simple{max-width:860px;margin:auto}',
    '#planning-followup-simple .mts-note{font-size:13px;color:#becddd;line-height:1.5}',
    '#planning-followup-simple .mts-label{display:grid;gap:6px;font-weight:700;font-size:14px;margin:13px 0}',
    '#planning-followup-simple input,#planning-followup-simple select,#mtps-agent-panel select{width:100%;min-height:46px;border:1px solid #71859c;background:#142237;color:white;border-radius:11px;padding:11px;font:inherit}',
    '#planning-followup-simple .mts-count{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}',
    '#planning-followup-simple .mts-pill{font-size:12px;background:#314963;border-radius:20px;padding:7px 10px;font-weight:700}',
    '#planning-followup-simple .mts-agent{border-left:4px solid #528dbf}',
    '#planning-followup-simple .mts-head{display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '#planning-followup-simple .mts-head h3{margin:0;font-size:17px}',
    '#planning-followup-simple .mts-head button{font-size:12px;padding:9px}',
    '#planning-followup-simple .mts-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,165px);gap:9px;align-items:center;border-top:1px solid #40556c;padding:10px 0}',
    '#planning-followup-simple .mts-row:first-of-type{margin-top:10px}',
    '#planning-followup-simple .mts-row small{color:#bdcbd9;display:block;margin-top:3px}',
    '#planning-followup-simple .mts-row select{font-size:13px;min-height:44px}',
    '#planning-followup-simple .mts-unmatched{font-size:12px;margin:10px 0;padding:10px;background:#463927;border-radius:10px}',
    '#planning-followup-simple .mts-unmatched select{margin-top:5px}',
    '#planning-followup-simple .mts-action{min-height:46px;background:#2865a2;font-size:15px}',
    '#mtps-agent-panel{margin:17px 0;padding:14px;border:1px solid #526b84;border-radius:12px;background:#1a2e45}',
    '#mtps-agent-panel .mts-profile-row{padding:9px 0;border-top:1px solid #526078;display:flex;justify-content:space-between;gap:12px;align-items:center}',
    '#mtps-agent-panel small{color:#bdcbd9}',
    '@media(max-width:410px){#planning-followup-simple .mts-row{grid-template-columns:minmax(0,1fr) 130px}}'
  ].join('');
  document.head.append(style);
  const search=section.querySelector('#mts-search'),filter=section.querySelector('#mts-filter'),list=section.querySelector('#mts-list');
  const agentSelect=document.getElementById('agent-select'),agentDetail=document.getElementById('agent-detail');
  let agentPanel=null;
  if(agentDetail){
    document.getElementById('mtpe-agent-records')?.setAttribute('hidden','');
    style.textContent+='#mtpe-agent-records{display:none!important}';
    agentPanel=document.createElement('div');agentPanel.id='mtps-agent-panel';agentDetail.append(agentPanel);
  }
  function refreshOptions(){
    const box=section.querySelector('#mts-agent'),previous=box.value,names=profiles();
    box.replaceChildren();
    const placeholder=new Option(names.length?'Choisir un agent':'Aucun agent dans la liste','');
    box.add(placeholder);
    names.forEach(name=>box.add(new Option(name,name)));
    if(names.includes(previous))box.value=previous;
  }
  function openProfile(name){
    const profile=profileFor(name);if(!profile)return;
    nav.querySelector('button[data-tab="team"]')?.click();
    if(agentSelect){
      agentSelect.value=profile;
      agentSelect.dispatchEvent(new Event('change',{bubbles:true}));
      agentDetail?.scrollIntoView({block:'start',behavior:'smooth'});
    }
  }
  function setStatus(source,id,next){
    if(!STATES.includes(next))return false;
    const key=SOURCES[source],all=rows(key),item=all.find(r=>r.id===id);
    if(!item)return false;
    const before=labelStatus(item.status);
    if(before===next)return true;
    const now=new Date().toISOString();
    item.status=source==='simple'?next:legacyStatus(source,next);
    item.updatedAt=now;
    item.followupHistory=Array.isArray(item.followupHistory)?item.followupHistory:[];
    item.followupHistory.push({from:before,to:next,at:now});
    if(item.followupHistory.length>100)item.followupHistory=item.followupHistory.slice(-100);
    try{store(key,all);window.dispatchEvent(new Event('myteam:planning-followups-changed'));return true;}
    catch(e){alert('Enregistrement impossible. Réessaie après avoir vérifié le stockage du téléphone.');return false;}
  }
  function renderAgentPanel(){
    if(!agentPanel)return;
    const selected=agentSelect?.value||'';
    agentPanel.replaceChildren();
    const h=document.createElement('h4');h.textContent='Suivi planning';agentPanel.append(h);
    if(!selected)return;
    const data=allEntries().filter(r=>r._profile===selected).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if(!data.length){
      const p=document.createElement('p');p.textContent='Aucun suivi pour cet agent.';agentPanel.append(p);return;
    }
    data.forEach(r=>{
      const line=document.createElement('div');line.className='mts-profile-row';
      const info=document.createElement('span');info.textContent=niceDate(r.date)+(r.post?' · '+r.post:'');
      const state=document.createElement('strong');state.textContent=r._state;
      line.append(info,state);agentPanel.append(line);
    });
    const open=document.createElement('button');open.type='button';open.textContent='Changer les statuts';
    open.onclick=()=>tab.click();agentPanel.append(open);
  }
  function render(){
    refreshOptions();
    const data=allEntries().sort((a,b)=>(a._profile||a.agent).localeCompare(b._profile||b.agent,'fr')||String(a.date||'').localeCompare(String(b.date||'')));
    section.querySelector('#mts-count').innerHTML=STATES.map(state=>'<span class="mts-pill">'+esc(state)+' : '+data.filter(r=>r._state===state).length+'</span>').join('');
    const q=norm(search.value),wanted=filter.value;
    const visible=data.filter(r=>(!wanted||r._state===wanted)&&(!q||norm(r._profile||r.agent).includes(q)));
    list.replaceChildren();
    if(!visible.length){
      const empty=document.createElement('div');empty.className='card';
      empty.textContent='Aucun suivi correspondant.';list.append(empty);
    }
    const groups=new Map();
    visible.forEach(r=>{const name=r._profile||r.agent||'Agent à préciser';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r);});
    groups.forEach((entries,name)=>{
      const card=document.createElement('div');card.className='card mts-agent';
      const head=document.createElement('div');head.className='mts-head';
      const h=document.createElement('h3');h.textContent=name+' · '+entries.length;
      head.append(h);
      if(entries[0]._profile){const go=document.createElement('button');go.type='button';go.textContent='Fiche agent';go.onclick=()=>openProfile(name);head.append(go);}
      card.append(head);
      if(!entries[0]._profile){
        const link=document.createElement('label');link.className='mts-unmatched';link.textContent='Agent non rapproché. Associer à la fiche :';
        const select=document.createElement('select');
        select.add(new Option('Choisir un agent',''));
        profiles().forEach(p=>select.add(new Option(p,p)));
        select.onchange=()=>{
          const all=aliases();all[norm(entries[0].agent)]=select.value;
          try{store(ALIAS_KEY,all);render();}catch(e){alert('Association impossible.');}
        };
        link.append(select);card.append(link);
      }
      entries.forEach((r,i)=>{
        const line=document.createElement('div');line.className='mts-row';
        const info=document.createElement('div');const date=document.createElement('strong');
        date.textContent=niceDate(r.date)+(r.post?' · '+r.post:'');
        const meta=document.createElement('small');
        meta.textContent=(entries.length>1?'Suivi '+(i+1)+' · ':'')+(r.updatedAt?'Actualisé le '+new Date(r.updatedAt).toLocaleDateString('fr-FR'):'');
        info.append(date,meta);
        const sel=document.createElement('select');
        sel.setAttribute('aria-label','Statut de '+name+' le '+niceDate(r.date));
        STATES.forEach(s=>sel.add(new Option(s,s)));sel.value=r._state;
        sel.onchange=()=>{if(setStatus(r._source,r.id,sel.value))render();else sel.value=r._state;};
        line.append(info,sel);card.append(line);
      });
      list.append(card);
    });
    renderAgentPanel();
  }
  section.querySelector('#mts-form').onsubmit=e=>{
    e.preventDefault();
    const data=new FormData(e.currentTarget),agent=String(data.get('agent')||'');
    if(!profiles().includes(agent)){section.querySelector('#mts-message').textContent='Choisis un agent existant.';return;}
    const date=String(data.get('date')||''),status=String(data.get('status')||'En attente');
    if(!STATES.includes(status)){return;}
    const existing=allEntries().some(r=>r._profile===agent&&String(r.date||'')===date&&r._source==='simple');
    if(existing){section.querySelector('#mts-message').textContent='Un suivi simple existe déjà pour cet agent et cette date.';return;}
    const now=new Date().toISOString();
    const id='followup-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    const item={id,agent,date,status,createdAt:now,updatedAt:now,followupHistory:[{from:'',to:status,at:now}]};
    try{
      store(SOURCES.simple,rows(SOURCES.simple).concat(item));
      e.currentTarget.reset();
      section.querySelector('#mts-message').textContent='Suivi enregistré et associé à la fiche de l’agent.';
      render();
    }catch(error){section.querySelector('#mts-message').textContent='Impossible de sauvegarder ce suivi.';}
  };
  function show(){
    nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));
    main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));
    render();window.scrollTo(0,0);
  }
  tab.addEventListener('click',show);
  nav.addEventListener('click',e=>{
    const old=e.target.closest('button[data-tab]');
    if(old&&['planning-issues','planning-errors'].includes(old.dataset.tab)){
      e.preventDefault();e.stopImmediatePropagation();tab.click();
    }
  },true);
  search.addEventListener('input',render);filter.addEventListener('change',render);
  agentSelect?.addEventListener('change',renderAgentPanel);
  window.addEventListener('myteam:planning-followups-changed',renderAgentPanel);
  render();
  if(document.getElementById('mt-bureau')&&!document.getElementById('mt-bureau').classList.contains('hidden')){
    nav.querySelector('button[data-tab="mt-bureau"]')?.click();
  }
})();