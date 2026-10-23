/* MyTEAM — Récapitulatif textuel des demandes de congés par agent.
   Lecture seule; aucun envoi à MyGesper ou à l'employeur. */
(()=>{
  'use strict';
  if(document.getElementById('mtal-recap'))return;
  const nav=document.querySelector('nav.tabs'),main=document.querySelector('main');
  if(!nav||!main)return;
  const KEY='myteam_agent_leave_requests_v1',PROFILE_KEY='myteam_agent_profiles_v1';
  const $=id=>document.getElementById(id);
  const read=(key,fallback)=>{
    try { const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback; }
    catch{return fallback;}
  };
  const records=()=>{const rows=read(KEY,[]);return Array.isArray(rows)?rows.filter(x=>x&&typeof x.agent==='string'&&typeof x.id==='string'):[];};
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
  const fmt=s=> /^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'Non renseignée';
  const stage={unknown:'À confirmer',todo:'À faire',sent:'Envoyée'};
  const chef={unknown:'À confirmer',pending:'En attente',approved:'Accordée',rejected:'Refusée'};
  const filing={unknown:'À confirmer',no:'Non déposée',yes:'Déposée'};
  const gesper={unknown:'À confirmer',none:'Non déposée',pending:'En attente',approved:'Accepté — non validé',validated:'Validé — confirmé',rejected:'Refusée'};
  const sources={agent:"Déclaration de l'agent",email:'Mail ou message consulté',gesper:'MyGesper consulté',mixed:'Informations croisées'};
  const label=(dictionary,value)=>dictionary[value]||'À confirmer';

  const tab=document.createElement('button');
  tab.type='button';tab.dataset.tab='mtal-recap';tab.textContent='📝 Récap congés';
  const leaveTab=nav.querySelector('[data-tab="leave"]');
  if(leaveTab)leaveTab.after(tab);else nav.append(tab);
  const section=document.createElement('section');
  section.id='mtal-recap';section.className='hidden';
  section.innerHTML=[
    '<div class="card"><h2>Récapitulatif des demandes de congés</h2>',
    '<p>Historique en texte, par agent, avec les dates et les étapes : chef d’équipe, MyGesper, statut actuel et motif de refus si renseigné.</p>',
    '<label>Équipe<select id="mtal-recap-team"><option value="4">TEAM 4</option>',
    '<option value="all">Toutes les équipes</option><option value="1">Équipe 1</option>',
    '<option value="2">Équipe 2</option><option value="3">Équipe 3</option></select></label>',
    '<label>Agent<select id="mtal-recap-agent"><option value="">Tous les agents avec demandes</option></select></label>',
    '<label>Afficher<select id="mtal-recap-filter">',
    '<option value="active">Demandes non archivées</option>',
    '<option value="pending">À suivre (y compris acceptées)</option>',
    '<option value="approved">Acceptées, non validées</option>',
    '<option value="validated">Validées sur MyGesper</option>',
    '<option value="rejected">Refusées sur MyGesper</option>',
    '<option value="archived">Archives</option>',
    '<option value="all">Tout, y compris les archives</option></select></label>',
    '<p id="mtal-recap-count" role="status"></p>',
    '<div class="mtal-recap-actions"><button id="mtal-recap-copy" type="button">Copier le récapitulatif</button>',
    '<button id="mtal-recap-open-agent" type="button">Ouvrir la fiche agent</button>',
    '<button id="mtal-recap-refresh" type="button">Actualiser</button></div>',
    '<label>Texte du récapitulatif<textarea id="mtal-recap-text" readonly spellcheck="false" aria-label="Récapitulatif texte des congés"></textarea></label>',
    '<p id="mtal-recap-msg" role="status"></p>',
    '<p>Les statuts sont ceux saisis dans MyTEAM. Une déclaration d’agent n’est pas une confirmation officielle. Le texte n’est ni envoyé automatiquement ni synchronisé avec MyGesper.</p></div>'
  ].join('');
  main.append(section);
  const team=$('mtal-recap-team'),agent=$('mtal-recap-agent'),filter=$('mtal-recap-filter'),textNode=$('mtal-recap-text');
  const uniqueSorted=names=>[...new Set(names)].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
  function profiles(){
    const x=read(PROFILE_KEY,{});
    return x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  }
  function agentTeam(name,p){
    const match=Object.keys(p).find(k=>norm(k)===norm(name));
    return Number(match?p[match]?.team:0);
  }
  function namesForTeam(){
    const selected=team.value,p=profiles();
    const fromProfiles=Object.keys(p).filter(name=>selected==='all'||agentTeam(name,p)===Number(selected));
    const fromRows=records().map(r=>r.agent).filter(name=>selected==='all'||agentTeam(name,p)===Number(selected));
    return uniqueSorted([...fromProfiles,...fromRows]);
  }
  function populateNames(preferred){
    const names=namesForTeam();
    agent.replaceChildren();
    const first=document.createElement('option');
    first.value='';first.textContent='Tous les agents avec demandes';
    agent.append(first);
    names.forEach(name=>{
      const o=document.createElement('option');o.value=name;o.textContent=name;agent.append(o);
    });
    agent.value=names.includes(preferred)?preferred:'';
  }
  const qualifies=r=>{
    if(filter.value==='active')return !r.archived;
    if(filter.value==='pending')return !r.archived&&!['validated','rejected'].includes(r.gesperStatus);
    if(filter.value==='approved')return !r.archived&&r.gesperStatus==='approved';
    if(filter.value==='validated')return !r.archived&&r.gesperStatus==='validated';
    if(filter.value==='rejected')return !r.archived&&r.gesperStatus==='rejected';
    if(filter.value==='archived')return !!r.archived;
    return true;
  };
  function infoFor(row,i){
    const period=(row.from?fmt(row.from):'début à préciser')+' au '+(row.to?fmt(row.to):'fin à préciser');
    const lines=[
      'Demande '+i+' — '+period+(row.archived?' [ARCHIVÉE]':''),
      '  Au chef d’équipe : '+label(stage,row.cdeRequest)+' | Date : '+fmt(row.cdeSentAt),
      '  Réponse du chef : '+label(chef,row.chefStatus)+' | Date : '+fmt(row.chefStatusAt),
      '  Dépôt sur MyGesper : '+label(filing,row.gesperFiled)+' | Date : '+fmt(row.gesperFiledAt),
      '  Réponse MyGesper : '+label(gesper,row.gesperStatus)+' | Date : '+fmt(row.gesperStatusAt),
      ...(row.gesperStatus==='validated'?['  Validation définitive MyGesper : '+fmt(row.gesperValidatedAt)]:[]),
    ];
    if(row.gesperStatus==='rejected')lines.push('  Motif du refus : '+(row.gesperRefusalReason||'Non communiqué'));
    lines.push('  Informations : '+(sources[row.source]||'Source non précisée')+' | Recueillies le : '+fmt(row.collectedOn));
    if(row.note)lines.push('  Note : '+String(row.note));
    if(row.updatedAt){const d=new Date(row.updatedAt);if(!isNaN(d.getTime()))lines.push('  Dernière mise à jour : '+d.toLocaleString('fr-FR'));}
    return lines.join('\n');
  }
  function refresh(){
    const p=profiles(),selected=team.value,name=agent.value;
    const rows=records().filter(r=>(
      selected==='all'||agentTeam(r.agent,p)===Number(selected)
    )&&(!name||norm(name)===norm(r.agent))&&qualifies(r))
      .sort((a,b)=>a.agent.localeCompare(b.agent,'fr',{sensitivity:'base'})||
        String(a.from||'').localeCompare(String(b.from||''))||
        String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    const groups=new Map();
    rows.forEach(r=>{const key=groups.has(r.agent)?r.agent:r.agent;const arr=groups.get(key)||[];arr.push(r);groups.set(key,arr);});
    const now=new Date().toLocaleString('fr-FR');
    let header='SUIVI DES DEMANDES DE CONGÉS — '+(selected==='all'?'TOUTES LES ÉQUIPES':'TEAM '+selected)+'\nÉtat du suivi : '+now+'\nInformations internes saisies manuellement, à vérifier auprès des sources officielles.\n';
    if(name)header+='Agent sélectionné : '+name+'\n';
    const parts=[header];
    if(!rows.length)parts.push('\nAucune demande enregistrée pour cette sélection.');
    for(const [agentName,items] of groups){
      parts.push('\n'+'='.repeat(35)+'\n'+agentName+' — '+items.length+' demande(s)\n'+'='.repeat(35));
      items.forEach((r,index)=>parts.push('\n'+infoFor(r,index+1)));
    }
    textNode.value=parts.join('\n');
    $('mtal-recap-count').textContent=rows.length+' demande(s) de '+groups.size+' agent(s) · '+rows.filter(r=>r.gesperStatus==='approved').length+' acceptée(s), non validée(s) · '+rows.filter(r=>r.gesperStatus==='validated').length+' validée(s) · '+rows.filter(r=>r.gesperStatus==='rejected').length+' refusée(s).';
    $('mtal-recap-open-agent').disabled=!name;
  }
  function display(){
    populateNames(agent.value);
    refresh();
    nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));
    main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));
    window.scrollTo(0,0);
  }
  tab.onclick=display;
  team.onchange=()=>{populateNames('');refresh();};
  agent.onchange=refresh;filter.onchange=refresh;
  $('mtal-recap-refresh').onclick=()=>{populateNames(agent.value);refresh();$('mtal-recap-msg').textContent='Récapitulatif actualisé.';};
  $('mtal-recap-copy').onclick=async()=>{
    const content=textNode.value;
    try {
      await navigator.clipboard.writeText(content);
      $('mtal-recap-msg').textContent='Texte copié. Vérifie les informations avant partage.';
    }catch{
      textNode.focus();textNode.select();
      $('mtal-recap-msg').textContent='Sélection effectuée : maintiens le doigt sur le texte puis appuie sur Copier.';
    }
  };
  $('mtal-recap-open-agent').onclick=()=>{
    const name=agent.value;
    if(!name)return;
    const btn=nav.querySelector('[data-tab="team"]');
    btn?.click();
    const select=$('agent-select');
    if(!select)return;
    const option=Array.from(select.options).find(o=>norm(o.value)===norm(name));
    if(option){
      select.value=option.value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      $('agent-detail')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  };
  const pane=$('mt-agent-leaves');
  if(pane&&!$('mtal-open-recap')){
    const quick=document.createElement('button');
    quick.id='mtal-open-recap';quick.type='button';
    quick.textContent='Voir le récapitulatif texte';
    quick.className='mtal-date-clear';
    $('mtal-new')?.after(quick);
    quick.onclick=()=>{
      const name=$('agent-select')?.value||'';
      team.value='all';populateNames(name);filter.value='all';tab.click();
    };
  }
  window.addEventListener('storage',ev=>{if(ev.key===KEY&& !section.classList.contains('hidden'))refresh();});
  populateNames('');refresh();
})();
