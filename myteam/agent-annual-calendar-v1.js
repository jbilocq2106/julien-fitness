/* MyTEAM — agenda annuel prive, par agent. Aucune donnee nominative dans le code.
   Conges MyGesper : affichage en lecture seule, sans doublonner les demandes.
   Maladie : dates administratives uniquement, aucun diagnostic ou motif medical. */
(()=>{
  'use strict';
  if(document.getElementById('mt-agent-annual'))return;
  const nav=document.querySelector('nav.tabs'),main=document.querySelector('main');
  const agentSelect=document.getElementById('agent-select'),agentDetail=document.getElementById('agent-detail');
  if(!nav||!main||!agentSelect||!agentDetail)return;
  const KEY='myteam_agent_absence_calendar_v1',LEAVES='myteam_agent_leave_requests_v1';
  const TYPES=[
    {id:'leave',title:'Congé / congé futur',short:'Congé',color:'#42a0d8'},
    {id:'parental',title:'Congé parental',short:'Parental',color:'#b28ae8'},
    {id:'sick',title:'Arrêt maladie',short:'Maladie',color:'#e88787'},
    {id:'holiday',title:'Jour férié',short:'Férié',color:'#e9b860'}
  ];
  const STATUS=[{id:'planned',title:'Prévu / à confirmer'},{id:'confirmed',title:'Confirmé'}];
  // Conserver la différence essentielle : accord du chef ≠ validation MyGesper.
  const LEAVE_STAGES=[
    {id:'requested',title:'Demandé — non validé'},
    {id:'chef-approved',title:'Accordé par le chef — non validé MyGesper'},
    {id:'filed',title:'Déposé dans MyGesper'},
    {id:'pending',title:'En attente de réponse MyGesper'},
    {id:'approved',title:'Accepté MyGesper — non validé'},
    {id:'validated',title:'Validé MyGesper'},
    {id:'rejected',title:'Refusé / sans suite'}
  ];
  const stageTitle=stage=>LEAVE_STAGES.find(x=>x.id===stage)?.title||'Demandé — non validé';
  function stageForLegacy(r){
    if(r.gesperStatus==='validated')return 'validated';
    if(r.gesperStatus==='rejected'||r.chefStatus==='rejected')return 'rejected';
    if(r.gesperStatus==='approved')return 'approved';
    if(r.gesperStatus==='pending')return 'pending';
    if(r.gesperFiled==='yes')return 'filed';
    if(r.chefStatus==='approved')return 'chef-approved';
    return 'requested';
  }
  const $=id=>document.getElementById(id);
  const read=(key,backup)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??backup;}catch{return backup;}};
  const data=()=>{const a=read(KEY,[]);return Array.isArray(a)?a.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'):[];};
  const save=a=>{try{localStorage.setItem(KEY,JSON.stringify(a));return true;}catch{return false;}};
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const isDate=x=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x||'')))return false;
    const [y,m,d]=x.split('-').map(Number),v=new Date(y,m-1,d,12);
    return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d;
  };
  const nice=x=>isDate(x)?x.slice(8)+'/'+x.slice(5,7)+'/'+x.slice(0,4):'non précisée';
  const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bg4s\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean).sort().join(' ');
  const names=()=>{
    const raw=read('myteam_agent_profiles_v1',{}),removed=new Set(read('myteam_deleted_agents_v1',[]));
    return Object.keys(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}).filter(x=>!removed.has(x)).sort((a,b)=>a.localeCompare(b,'fr'));
  };
  function matchingName(name,available){
    const exact=available.filter(x=>norm(x)===norm(name));
    if(exact.length===1)return exact[0];
    if(exact.length>1)return '';
    const pieces=norm(name).split(' ').filter(Boolean);
    if(!pieces.length)return '';
    const matches=available.filter(n=>{const parts=norm(n).split(' ');return pieces.every(p=>parts.includes(p));});
    return matches.length===1?matches[0]:'';
  }
  const typeInfo=id=>TYPES.find(t=>t.id===id)||TYPES[0];
  const statusText=id=>id==='confirmed'?'Confirmé':id==='rejected'?'Refusé / sans suite':'Prévu / à confirmer';
  const stageFor=r=>r.type==='leave'?(r.leaveStage||((r.status==='confirmed')?'validated':'requested')):'';
  const statusOf=r=>r.type==='leave'?stageTitle(stageFor(r)):statusText(r.status);
  const eventLabel=r=>r.source==='mygesper'?'Congé (suivi MyGesper)':typeInfo(r.type).title;
  const intersects=(r,year)=>isDate(r.from)&&r.from<=year+'-12-31'&&(isDate(r.to)?r.to:r.from)>=year+'-01-01';
  let selected='',year=new Date().getFullYear(),editing='',chooseEnd=false;
  let currentFilter='all';
  const tab=document.createElement('button');tab.type='button';tab.dataset.tab='agent-annual';tab.textContent='📅 Agenda agents';nav.append(tab);
  const view=document.createElement('section');view.id='mt-agent-annual';view.className='hidden';
  view.innerHTML=[
    '<div class="card"><h2>Agenda annuel des agents</h2><p class="mtaa-hint">Les absences sont rattachées à chaque agent, sans modifier les plannings officiels.</p>',
    '<label class="mtaa-label">Agent<select id="mtaa-agent"><option value="">Choisir un agent</option></select></label>',
    '<div class="mtaa-year-nav"><button type="button" id="mtaa-prev" aria-label="Année précédente">‹</button><strong id="mtaa-year"></strong><button type="button" id="mtaa-next" aria-label="Année suivante">›</button></div>',
    '<div class="mtaa-legend" id="mtaa-legend"></div>',
    '<p id="mtaa-stats" class="mtaa-hint" role="status"></p>',
    '<p class="mtaa-hint">Appuie sur un jour pour choisir le début, puis sur un autre jour pour la fin. Les dates peuvent aussi être saisies manuellement.</p>',
    '</div>',
    '<div class="card" id="mtaa-team-summary"><h3>Congés simultanés — toute la Team 4</h3>',
    '<p class="mtaa-hint">Un agent compte une seule fois par journée, même si deux demandes se chevauchent. Les demandes non validées sont séparées des congés confirmés.</p>',
    '<label class="mtaa-label">Mois du tableau récapitulatif<input type="month" id="mtaa-overlap-month"></label>',
    '<div id="mtaa-team-metrics" class="mtaa-team-metrics" role="status"></div>',
    '<div class="mtaa-table-wrap"><table class="mtaa-team-table"><thead><tr><th>Date</th><th>Validés</th><th>À confirmer</th><th>Total potentiel</th><th>Agents en congé</th></tr></thead><tbody id="mtaa-overlap-body"></tbody></table></div>',
    '<p id="mtaa-team-note" class="mtaa-hint"></p></div>',
    '<div id="mtaa-months" class="mtaa-months" aria-label="Douze mois de l’année"></div>',
    '<div class="card" id="mtaa-entries-box"><h3>Périodes de l’agent</h3>',
    '<label class="mtaa-label">Filtrer les périodes<select id="mtaa-entry-filter">',
    '<option value="all">Toutes les périodes</option><option value="leave">Congés / demandes</option>',
    '<option value="parental">Congé parental</option><option value="sick">Arrêts maladie</option><option value="holiday">Jours fériés</option>',
    '</select></label><div id="mtaa-entries"></div></div>',
    '<div class="card" id="mtaa-editor-card"><h3 id="mtaa-form-heading">Ajouter une période</h3>',
    '<form id="mtaa-form">',
    '<label class="mtaa-label">Type<select name="type" required></select></label>',
    '<label class="mtaa-label">Du (inclus)<input name="from" type="date" required></label>',
    '<label class="mtaa-label">Au (inclus, facultatif si inconnu)<input name="to" type="date"></label>',
    '<label class="mtaa-label" id="mtaa-leave-stage-field">Suivi du congé<select name="leaveStage" id="mtaa-leave-stage"></select></label>',
    '<label class="mtaa-label" id="mtaa-general-state-field">État<select name="status"><option value="planned">Prévu / à confirmer</option><option value="confirmed">Confirmé</option></select></label>',
    '<p class="mtaa-hint">Le statut saisi manuellement doit être vérifié : seul « Validé MyGesper » représente une validation définitive. « Accordé par le chef » ne suffit pas.</p>',
    '<p class="mtaa-hint">Pour un arrêt dont la fin est inconnue, laisse « Au » vide. Seul le premier jour sera marqué jusqu’à la mise à jour.</p>',
    '<p class="mtaa-hint">Indique seulement les dates administratives : aucun diagnostic ni motif médical.</p>',
    '<div class="mtaa-actions"><button type="submit" class="mtaa-primary">Enregistrer</button><button type="button" id="mtaa-cancel">Nouveau / annuler</button></div>',
    '</form><p id="mtaa-message" class="mtaa-hint" role="status"></p></div>'
  ].join('');
  main.append(view);
  const css=document.createElement('style');css.id='mtaa-css';css.textContent=[
    '#mt-agent-annual{max-width:1120px;margin:0 auto}',
    '#mt-agent-annual h2{margin:0 0 7px}#mt-agent-annual h3{margin:0 0 11px}',
    '#mt-agent-annual .mtaa-hint{font-size:12px;line-height:1.5;color:#bed0e3}',
    '#mt-agent-annual .mtaa-label{display:grid;gap:6px;font-size:14px;font-weight:750;margin:11px 0}',
    '#mt-agent-annual input,#mt-agent-annual select{width:100%;min-height:46px;padding:10px;background:#142439;border:1px solid #788ba1;border-radius:11px;color:#fff;font:inherit}',
    '#mt-agent-annual .mtaa-year-nav{display:flex;align-items:center;justify-content:space-between;margin:10px 0;gap:15px}',
    '#mt-agent-annual .mtaa-year-nav strong{font-size:23px}',
    '#mt-agent-annual .mtaa-year-nav button{min-width:57px;min-height:46px;font-size:25px}',
    '#mt-agent-annual .mtaa-legend{display:flex;flex-wrap:wrap;gap:8px;margin:11px 0}',
    '#mt-agent-annual .mtaa-legend span{display:inline-flex;align-items:center;gap:5px;font-size:12px;background:#314056;padding:6px 9px;border-radius:20px}',
    '#mt-agent-annual .mtaa-dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex-shrink:0}',
    '#mt-agent-annual .mtaa-months{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}',
    '#mt-agent-annual .mtaa-month{background:#202e44;border:1px solid #4d617b;border-radius:15px;padding:11px;min-width:0}',
    '#mt-agent-annual .mtaa-month h3{font-size:15px;text-transform:capitalize;margin:0 0 9px}',
    '#mt-agent-annual .mtaa-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}',
    '#mt-agent-annual .mtaa-week{font-size:10px;text-align:center;color:#a9bbcf;padding:5px 0}',
    '#mt-agent-annual .mtaa-day{border:1px solid transparent;border-radius:8px;min-width:0;min-height:34px;padding:3px 0;background:#2d3e56;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;gap:3px;cursor:pointer}',
    '#mt-agent-annual .mtaa-day.has-events{background:#344d68;border-color:#617f9c}',
    '#mt-agent-annual .mtaa-day.pending{border-style:dashed}',
    '#mt-agent-annual .mtaa-day.selected{outline:3px solid #f6bb6d;outline-offset:-2px}',
    '#mt-agent-annual .mtaa-day.today{box-shadow:inset 0 0 0 2px #fff}',
    '#mt-agent-annual .mtaa-dots{display:flex;gap:2px;justify-content:center;flex-wrap:wrap}',
    '#mt-agent-annual .mtaa-dots i{display:block;width:5px;height:5px;border-radius:50%}',
    '#mt-agent-annual .mtaa-team-metrics{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0;font-size:12px;font-weight:700}',
    '#mt-agent-annual .mtaa-team-metrics span{padding:8px 10px;border-radius:9px;background:#294460}',
    '#mt-agent-annual .mtaa-table-wrap{overflow-x:auto;max-height:65dvh;overflow-y:auto}',
    '#mt-agent-annual .mtaa-team-table{width:100%;border-collapse:collapse;min-width:550px;font-size:12px}',
    '#mt-agent-annual .mtaa-team-table th{text-align:left;background:#2c415b;position:sticky;top:0;z-index:1;padding:10px}',
    '#mt-agent-annual .mtaa-team-table td{border-bottom:1px solid #3e5169;padding:9px 10px;vertical-align:top}',
    '#mt-agent-annual .mtaa-team-table tr.mtaa-warning{background:#553a27}',
    '#mt-agent-annual .mtaa-team-table td[data-count]{font-weight:800;text-align:center;font-variant-numeric:tabular-nums}',
    '#mt-agent-annual .mtaa-entry{border-top:1px solid #4a5b71;padding:12px 0;display:grid;gap:6px}',
    '#mt-agent-annual .mtaa-entry strong{font-size:14px}#mt-agent-annual .mtaa-meta{font-size:12px;color:#bed0e3}',
    '#mt-agent-annual .mtaa-entry .mtaa-mark{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:7px}',
    '#mt-agent-annual .mtaa-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:7px}',
    '#mt-agent-annual .mtaa-actions button{min-height:44px}',
    '#mt-agent-annual .mtaa-primary{background:#2c719e}',
    '#mt-agent-annual .mtaa-empty{padding:13px 0;color:#bdcfe0;font-size:13px}',
    '#mt-agent-annual .mtaa-manual{padding-left:10px;border-left:3px solid #577492}',
    '#mtaa-agent-detail{margin:14px 0;padding:13px;border-radius:13px;background:#203750;border:1px solid #6281a2}',
    '#mtaa-agent-detail button{width:100%;min-height:45px;background:#276aa5}',
    '#mtaa-agent-detail p{font-size:12px;color:#cbd9e9;line-height:1.55}',
    '#mtaa-agent-detail h4{margin:0 0 9px}',
    '@media(max-width:900px){#mt-agent-annual .mtaa-months{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media(max-width:580px){#mt-agent-annual .mtaa-months{grid-template-columns:1fr}#mt-agent-annual .mtaa-day{min-height:42px;font-size:14px}#mt-agent-annual .mtaa-dots i{width:6px;height:6px}}'
  ].join('');document.head.append(css);
  const select=$('mtaa-agent'),form=$('mtaa-form'),message=$('mtaa-message');
  TYPES.forEach(t=>form.elements.type.add(new Option(t.title,t.id)));
  LEAVE_STAGES.forEach(stage=>form.elements.leaveStage.add(new Option(stage.title,stage.id)));
  function updateTypeFields(){
    const isLeave=form.elements.type.value==='leave';
    $('mtaa-leave-stage-field').hidden=!isLeave;
    $('mtaa-general-state-field').hidden=isLeave;
  }
  form.elements.type.addEventListener('change',updateTypeFields);
  updateTypeFields();
  const legend=$('mtaa-legend');
  TYPES.forEach(t=>{const label=document.createElement('span'),dot=document.createElement('i');dot.className='mtaa-dot';dot.style.background=t.color;label.append(dot,document.createTextNode(t.short));legend.append(label);});
  const mark=document.createElement('span');mark.textContent='Contour pointillé : à confirmer';legend.append(mark);
  function fillAgents(){
    const old=select.value;
    select.replaceChildren();select.add(new Option('Choisir un agent',''));
    names().forEach(n=>select.add(new Option(n,n)));
    if(names().includes(selected))select.value=selected;
    else if(names().includes(old)){selected=old;select.value=old;}
    else{selected='';select.value='';}
  }
  function legacy(){
    const values=read(LEAVES,[]);
    if(!Array.isArray(values))return [];
    const people=names();
    return values.filter(r=>r&&typeof r==='object'&&r.archived!==true&&isDate(r.from)).map(r=>{
      const match=matchingName(r.agent,people);
      if(!match)return null;
      const until=isDate(r.to)&&r.to>=r.from?r.to:r.from,leaveStage=stageForLegacy(r);
      return {id:'legacy-'+r.id,agent:match,type:'leave',from:r.from,to:until,
        leaveStage,status:leaveStage==='validated'?'confirmed':leaveStage==='rejected'?'rejected':'planned',
        source:'mygesper',gesperStatus:r.gesperStatus||'unknown'};
    }).filter(Boolean);
  }
  function personal(){
    return data().filter(r=>TYPES.some(t=>t.id===r.type)&&isDate(r.from)).map(r=>{
      const stage=r.type==='leave'?(r.leaveStage||((r.status==='confirmed')?'validated':'requested')):'';
      const status=r.type==='leave'?(stage==='validated'?'confirmed':stage==='rejected'?'rejected':'planned'):(r.status==='confirmed'?'confirmed':'planned');
      return {...r,leaveStage:stage,source:'personal',status};
    });
  }
  function forSelected(){return selected?[...personal(),...legacy()].filter(r=>r.agent===selected):[];}
  function clearForm(){
    editing='';chooseEnd=false;form.reset();
    form.elements.status.value='planned';form.elements.leaveStage.value='requested';updateTypeFields();
    $('mtaa-form-heading').textContent='Ajouter une période';
    message.textContent='';
  }
  function editRow(r){
    editing=r.id;chooseEnd=false;
    form.elements.type.value=r.type;
    form.elements.from.value=r.from;
    form.elements.to.value=r.to||'';
    form.elements.status.value=r.status==='confirmed'?'confirmed':'planned';
    form.elements.leaveStage.value=stageFor(r);updateTypeFields();
    $('mtaa-form-heading').textContent='Modifier la période';
    $('mtaa-editor-card').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function clickDay(date){
    if(!selected){message.textContent='Sélectionne un agent avant de choisir une date.';select.focus();return;}
    if(!chooseEnd||!isDate(form.elements.from.value)){
      if(!editing)clearForm();
      form.elements.from.value=date;
      form.elements.to.value=date;
      chooseEnd=true;
      message.textContent='Début : '+nice(date)+'. Choisis maintenant la fin (ou enregistre cette journée).';
    }else{
      const from=form.elements.from.value;
      form.elements.from.value=date<from?date:from;
      form.elements.to.value=date<from?from:date;
      chooseEnd=false;
      message.textContent='Période choisie : '+nice(form.elements.from.value)+' au '+nice(form.elements.to.value)+'.';
    }
    highlightSelection();
  }
  function highlightSelection(){
    const a=form.elements.from.value,b=form.elements.to.value||a;
    view.querySelectorAll('.mtaa-day[data-date]').forEach(node=>node.classList.toggle('selected',isDate(a)&&node.dataset.date>=a&&node.dataset.date<=b));
  }
  function renderMonths(items){
    const host=$('mtaa-months');host.replaceChildren();
    if(!selected){const div=document.createElement('div');div.className='card mtaa-empty';div.textContent='Choisis un agent pour afficher son calendrier annuel.';host.append(div);return;}
    const today=iso(new Date());
    for(let month=0;month<12;month++){
      const box=document.createElement('div');box.className='mtaa-month';
      const title=document.createElement('h3');
      title.textContent=new Intl.DateTimeFormat('fr-FR',{month:'long'}).format(new Date(year,month,1,12));
      box.append(title);
      const grid=document.createElement('div');grid.className='mtaa-grid';
      ['L','M','M','J','V','S','D'].forEach(letter=>{
        const cell=document.createElement('span');cell.className='mtaa-week';cell.textContent=letter;grid.append(cell);
      });
      const offset=(new Date(year,month,1,12).getDay()+6)%7;
      for(let p=0;p<offset;p++)grid.append(document.createElement('span'));
      const count=new Date(year,month+1,0,12).getDate();
      for(let day=1;day<=count;day++){
        const date=iso(new Date(year,month,day,12));
        const matches=items.filter(r=>r.status!=='rejected'&&r.from<=date&&(r.to||r.from)>=date);
        const btn=document.createElement('button');btn.type='button';btn.className='mtaa-day';btn.dataset.date=date;
        btn.textContent=String(day);btn.setAttribute('aria-label',nice(date)+(matches.length?' : '+matches.map(eventLabel).join(', '):''));
        if(date===today)btn.classList.add('today');
        if(matches.length){
          btn.classList.add('has-events');
          if(matches.some(r=>r.status!=='confirmed'))btn.classList.add('pending');
          const dots=document.createElement('span');dots.className='mtaa-dots';
          [...new Set(matches.map(r=>r.type))].forEach(t=>{
            const dot=document.createElement('i');dot.style.background=typeInfo(t).color;dots.append(dot);
          });
          btn.append(dots);
          btn.title=matches.map(r=>eventLabel(r)+' ('+statusOf(r)+')').join(' · ');
        }
        btn.onclick=()=>clickDay(date);grid.append(btn);
      }
      box.append(grid);host.append(box);
    }
    highlightSelection();
  }
  function renderEntries(items){
    const host=$('mtaa-entries');host.replaceChildren();
    if(!selected){host.textContent='Sélectionne un agent.';return;}
    const chosen=$('mtaa-entry-filter').value;
    const relevant=items.filter(r=>intersects(r,String(year))&&(chosen==='all'||r.type===chosen))
      .sort((a,b)=>a.from.localeCompare(b.from)||a.type.localeCompare(b.type));
    if(!relevant.length){const msg=document.createElement('p');msg.className='mtaa-empty';msg.textContent='Aucune période enregistrée pour '+year+'.';host.append(msg);return;}
    for(const r of relevant){
      const entry=document.createElement('div');entry.className='mtaa-entry';
      if(r.source!=='mygesper')entry.classList.add('mtaa-manual');
      const head=document.createElement('strong'),dot=document.createElement('i');
      dot.className='mtaa-mark';dot.style.background=typeInfo(r.type).color;
      head.append(dot,document.createTextNode(eventLabel(r)));entry.append(head);
      const date=document.createElement('div');date.className='mtaa-meta';
      date.textContent=nice(r.from)+' → '+(r.to&&r.to!==r.from?nice(r.to):r.to?nice(r.from):'fin non renseignée');
      entry.append(date);
      const state=document.createElement('div');state.className='mtaa-meta';
      state.textContent=statusOf(r)+(r.source==='mygesper'?' · Dossier MyGesper':' · Déclaré dans MyTEAM');
      entry.append(state);
      if(r.source==='personal'){
        const actions=document.createElement('div');actions.className='mtaa-actions';
        const edit=document.createElement('button');edit.type='button';edit.textContent='Modifier';
        edit.onclick=()=>editRow(r);
        const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer';
        remove.onclick=()=>{
          if(!confirm('Supprimer cette période de '+selected+' ?'))return;
          const latest=data();if(!save(latest.filter(p=>p.id!==r.id))){message.textContent='Suppression impossible.';return;}
          clearForm();render();
        };
        actions.append(edit,remove);entry.append(actions);
      }else{
        const info=document.createElement('div');info.className='mtaa-hint';
        info.textContent='Importé en lecture seule du suivi de congés de la fiche agent. Modifier la demande dans ce suivi.';
        entry.append(info);
      }
      host.append(entry);
    }
  }
  function renderConcurrency(){
    const month=$('mtaa-overlap-month').value;
    const body=$('mtaa-overlap-body');body.replaceChildren();
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return;
    const [y,m]=month.split('-').map(Number);
    const count=new Date(y,m,0,12).getDate(),everyone=[...personal(),...legacy()];
    const people=names(),included=new Set(people);
    const all=everyone.filter(r=>included.has(r.agent)&&isDate(r.from)&&r.status!=='rejected');
    let peak=0,peakConfirmed=0,risk=0,rows=0;
    for(let d=1;d<=count;d++){
      const date=iso(new Date(y,m-1,d,12)),today=all.filter(r=>r.from<=date&&(r.to||r.from)>=date);
      const vacations=today.filter(r=>r.type==='leave'||r.type==='parental');
      const agents=new Map();
      for(const r of vacations){
        const entry=agents.get(r.agent);
        const confirmed=r.status==='confirmed';
        if(!entry)agents.set(r.agent,{confirmed,types:[statusOf(r)]});
        else{entry.confirmed=entry.confirmed||confirmed;if(!entry.types.includes(statusOf(r)))entry.types.push(statusOf(r));}
      }
      if(!agents.size)continue;
      const confirmed=[...agents.values()].filter(a=>a.confirmed).length,unconfirmed=agents.size-confirmed;
      peak=Math.max(peak,agents.size);peakConfirmed=Math.max(peakConfirmed,confirmed);
      if(agents.size>=5)risk++;
      rows++;
      const row=document.createElement('tr');if(agents.size>=5)row.className='mtaa-warning';
      const cells=[
        nice(date),String(confirmed),String(unconfirmed),String(agents.size),
        [...agents.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr')).map(([n,v])=>n+' ('+(v.confirmed?'validé':v.types.join(', '))+')').join(' · ')
      ];
      cells.forEach((value,i)=>{const cell=document.createElement('td');cell.textContent=value;if(i>=1&&i<=3)cell.dataset.count='true';row.append(cell);});
      body.append(row);
    }
    if(!rows){
      const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.textContent='Aucun congé daté enregistré pour ce mois.';tr.append(td);body.append(tr);
    }
    $('mtaa-team-metrics').replaceChildren();
    ['Maximum simultané : '+peak+' agent(s)','Maximum validé : '+peakConfirmed,'Jours avec 5 agents ou plus : '+risk].forEach(v=>{
      const chip=document.createElement('span');chip.textContent=v;$('mtaa-team-metrics').append(chip);
    });
    $('mtaa-team-note').textContent=
      'Total potentiel = demandes + congés validés + congés parentaux. Les arrêts maladie et jours fériés ne sont pas comptés comme congés. '
      +'Une demande, un accord du chef ou une acceptation MyGesper non validée ne sont jamais comptés comme congé confirmé. '
      +'Seuls les agents rapprochés d’une fiche locale et les périodes datées figurent ici. '
      +'Le seuil de 5 est une alerte de vérification, pas un refus automatique.';
  }
  function renderAgentDetail(){
    const wrap=$('mtaa-agent-detail');
    if(!wrap)return;
    const chosen=agentSelect.value;
    wrap.hidden=!chosen;
    if(!chosen)return;
    wrap.querySelector('p').textContent='Agenda annuel '+year+' : '+[...personal(),...legacy()].filter(r=>r.agent===chosen&&intersects(r,String(year))).length+' période(s). Congés, parentaux, maladie et fériés.';
  }
  function render(){
    fillAgents();
    $('mtaa-year').textContent=String(year);
    const all=forSelected();
    const inside=all.filter(r=>intersects(r,String(year)));
    $('mtaa-stats').textContent=selected
      ?selected+' · '+year+' : '+inside.length+' période(s) · '+inside.filter(r=>r.status==='confirmed').length+' confirmée(s) · '+inside.filter(r=>r.status!=='confirmed').length+' à confirmer'
      :'Aucun agent sélectionné.';
    renderMonths(all);renderEntries(all);renderConcurrency();renderAgentDetail();
  }
  $('mtaa-overlap-month').value=iso(new Date()).slice(0,7);
  $('mtaa-overlap-month').addEventListener('change',renderConcurrency);
  $('mtaa-entry-filter').addEventListener('change',()=>renderEntries(forSelected()));
  select.onchange=()=>{selected=select.value;clearForm();render();};
  $('mtaa-prev').onclick=()=>{if(year>2020){year--;render();}};
  $('mtaa-next').onclick=()=>{if(year<2040){year++;render();}};
  $('mtaa-cancel').onclick=()=>{clearForm();render();};
  form.onsubmit=e=>{
    e.preventDefault();
    if(!selected||!names().includes(selected)){message.textContent='Sélectionne un agent existant.';return;}
    const type=form.elements.type.value,from=form.elements.from.value,to=form.elements.to.value,
      stage=form.elements.leaveStage.value,uiStatus=form.elements.status.value;
    const status=type==='leave'?(stage==='validated'?'confirmed':stage==='rejected'?'rejected':'planned'):uiStatus;
    if(!TYPES.some(t=>t.id===type)||!isDate(from)||(to&&!isDate(to))||
      (type==='leave'?!LEAVE_STAGES.some(s=>s.id===stage):!STATUS.some(s=>s.id===uiStatus))){
      message.textContent='Dates ou type incorrects.';return;
    }
    if(to&&to<from){message.textContent='La fin est antérieure au début.';return;}
    const now=new Date().toISOString(),current=data(),before=editing?current.find(x=>x.id===editing&&x.agent===selected):null;
    if(editing&&!before){message.textContent='La période à modifier est introuvable.';return;}
    const id=before?.id||('absence-'+Date.now()+'-'+Math.random().toString(36).slice(2,8));
    const record={id,agent:selected,type,from,to,status,leaveStage:type==='leave'?stage:'',
      createdAt:before?.createdAt||now,updatedAt:now};
    if(!before&&type==='leave'&&legacy().some(r=>r.agent===selected&&r.from===from&&r.to===(to||from))){
      message.textContent='Cette période existe déjà dans les demandes de congés MyGesper. Modifie-la depuis la fiche de congés plutôt que de créer un doublon.';return;
    }
    const updated=before?current.map(x=>x.id===id?record:x):current.concat(record);
    if(!save(updated)){message.textContent='Enregistrement impossible : stockage local indisponible.';return;}
    clearForm();render();message.textContent='Période enregistrée pour '+selected+'. Aucune validation administrative créée.';
    window.dispatchEvent(new Event('myteam:annual-agent-calendar-changed'));
  };
  const block=document.createElement('div');block.id='mtaa-agent-detail';
  block.innerHTML='<h4>Agenda annuel de l’agent</h4><p></p><button type="button">Ouvrir l’agenda annuel</button>';
  const leavePanel=$('mt-agent-leaves');
  if(leavePanel&&leavePanel.parentElement===agentDetail)agentDetail.insertBefore(block,leavePanel);
  else agentDetail.append(block);
  block.querySelector('button').onclick=()=>openCalendar(agentSelect.value);
  function openCalendar(agent){
    if(agent&&names().includes(agent))selected=agent;
    tab.click();
  }
  window.MyTeamOpenAgentAnnualCalendar=openCalendar;
  agentSelect.addEventListener('change',renderAgentDetail);
  const leaveWorkspace=$('mt-leave-workspace');
  if(leaveWorkspace&&!$('mt-ws-agent-annual')){
    const btn=document.createElement('button');btn.id='mt-ws-agent-annual';btn.type='button';
    btn.textContent='📅 Agenda annuel · congés / arrêts / fériés';
    btn.style.cssText='width:100%;margin-top:10px;min-height:46px;background:#286a9e';
    btn.onclick=()=>openCalendar($('mt-ws-agent-select')?.value||agentSelect.value);
    leaveWorkspace.append(btn);
  }
  function show(){
    nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));
    main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==view));
    if(!selected&&names().includes(agentSelect.value))selected=agentSelect.value;
    render();window.scrollTo(0,0);
  }
  tab.onclick=show;
  render();
})();