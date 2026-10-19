(()=>{
  'use strict';
  if(document.getElementById('visits'))return;
  const nav=document.querySelector('nav.tabs'),main=document.querySelector('main');
  if(!nav||!main)return;
  const KEY='myteam_post_visits_v1',AGENTS_KEY='myteam_agent_profiles_v1';
  const GROUPS=[['G4S',['E14','E32','E84','E85','E112']],['PARIF / Luxairport',['E20','E30','E43','E50','E51','E52','E80','E111','E121']],['Dussmann',['E40']]];
  const POSTS=GROUPS.flatMap(g=>g[1]);
  const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=()=>iso(new Date());
  const validDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(new Date(x+'T12:00:00').getTime());
  const relative=(x,n)=>{const d=new Date(x+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
  const blank=()=>({post:'',done:false,agents:[],time:'',note:''});
  const normalized=v=>({post:String(v?.post||'').slice(0,70),done:v?.done===true,agents:[...new Set((Array.isArray(v?.agents)?v.agents:[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim().slice(0,100)))],time:/^\d{2}:\d{2}$/.test(v?.time)?v.time:'',note:String(v?.note||'').slice(0,1000)});
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return{}}};
  let state=read(),date=today(),slot=0,team='all',query='';
  const rows=()=>Array.from({length:3},(_,i)=>normalized(state[date]?.[i]||blank()));
  const count=items=>items.filter(v=>v.post&&v.done).length;
  const tab=document.createElement('button');tab.type='button';tab.dataset.tab='visits';tab.textContent='✅ Visites sur poste';nav.append(tab);
  const section=document.createElement('section');section.id='visits';section.className='hidden';
  section.innerHTML=`<div class="card pv-head"><small>TEAM 4 · SUIVI QUOTIDIEN</small><h2>✅ Visites sur poste</h2><p>3 postes à visiter par journée travaillée. Sélectionne l’une des 3 visites ci-dessous.</p>
    <div class="pv-date"><button id="pv-prev" type="button" aria-label="Jour précédent">‹</button><label>Date<input id="pv-date" type="date"></label><button id="pv-next" type="button" aria-label="Jour suivant">›</button></div>
    <button id="pv-today" type="button">Aujourd’hui</button><p id="pv-shift" class="pv-help"></p><strong id="pv-progress"></strong><div class="pv-meter"><div id="pv-meter-fill"></div></div></div>
    <div class="card"><h3>Mes 3 visites</h3><div id="pv-slots" class="pv-slots"></div></div>
    <div class="card"><h3 id="pv-title">Visite 1</h3><label class="pv-done"><input id="pv-done" type="checkbox"> Visite effectuée</label><p class="pv-help">La visite est comptée une fois le poste sélectionné et cette case cochée.</p>
    <div class="pv-columns"><div class="pv-column"><h4>Postes <small>(${POSTS.length})</small></h4><div id="pv-posts" class="pv-scroll" role="radiogroup" aria-label="Tous les postes"></div>
    <label class="pv-other">Autre poste<input id="pv-custom-post" maxlength="70" placeholder="Code du poste"></label><button id="pv-custom-post-add" type="button">Choisir</button></div>
    <div class="pv-column"><h4>Agents <small id="pv-roster-count"></small></h4><input id="pv-search" type="search" placeholder="Rechercher…" aria-label="Rechercher un agent">
    <select id="pv-team" aria-label="Filtrer par équipe"><option value="all">Toutes les équipes</option><option value="4">Team 4</option><option value="1">Team 1</option><option value="2">Team 2</option><option value="3">Team 3</option></select>
    <div id="pv-agents" class="pv-scroll" role="group" aria-label="Tous les agents"></div><label class="pv-other">Agent absent de la liste<input id="pv-custom-agent" maxlength="100" placeholder="Nom de l’agent"></label><button id="pv-custom-agent-add" type="button">Ajouter</button></div></div>
    <div id="pv-selected"></div><div class="pv-extra"><label>Heure (facultative)<input id="pv-time" type="time"></label><label>Observation (facultative)<textarea id="pv-note" rows="2" maxlength="1000" placeholder="Fait ou consigne…"></textarea></label></div>
    <div class="pv-actions"><button id="pv-clear" type="button">Vider cette visite</button><p id="pv-status" role="status" aria-live="polite"></p></div><p class="pv-help">Sauvegarde automatique sur cet appareil. Modifiable après validation. Rien n’est envoyé à l’employeur.</p></div>
    <div class="card"><h3>Historique des visites</h3><div id="pv-history"></div></div>`;
  main.append(section);
  const $=id=>document.getElementById(id);
  const message=(s,error=false)=>{const el=$('pv-status');el.textContent=s;el.classList.toggle('error',error)};
  function roster(){
    let all={},deleted=[];
    try{all=JSON.parse(localStorage.getItem(AGENTS_KEY)||'{}')||{}}catch{}
    try{deleted=JSON.parse(localStorage.getItem('myteam_deleted_agents_v1')||'[]')||[]}catch{}
    const excluded=new Set(Array.isArray(deleted)?deleted:[]);
    return Object.entries(all).filter(([name,p])=>name&&p&&typeof p==='object'&&!excluded.has(name))
      .map(([name,p])=>({name,team:Number(p.team)||0,gender:p.gender||''}))
      .sort((a,b)=>(a.team===4?-1:0)-(b.team===4?-1:0)||a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
  }
  function save(next){
    const v=next.map(normalized),updated={...state};
    if(v.some(x=>x.post||x.done||x.agents.length||x.time||x.note))updated[date]=v;else delete updated[date];
    try{localStorage.setItem(KEY,JSON.stringify(updated));state=updated;message('✓ Enregistré sur ce téléphone');drawTotals();drawSlots();drawHistory();return true}
    catch{message('Enregistrement impossible. Vérifie le stockage.',true);return false}
  }
  function drawTotals(){const n=count(rows());$('pv-progress').textContent=`${n}/3 visites effectuées${n===3?' · Objectif atteint':''}`;$('pv-meter-fill').style.width=`${n/3*100}%`;$('pv-meter-fill').classList.toggle('complete',n===3)}
  function drawSlots(){$('pv-slots').innerHTML=rows().map((v,i)=>`<button type="button" data-slot="${i}" aria-pressed="${i===slot}" class="pv-slot ${i===slot?'active':''} ${v.post&&v.done?'finished':''}"><span>Visite ${i+1}</span><b>${esc(v.post||'Choisir un poste')}</b><small>${v.post&&v.done?'✓ Effectuée':v.post?'À confirmer':'À renseigner'} · ${v.agents.length} agent${v.agents.length>1?'s':''}</small></button>`).join('')}
  function drawPosts(){const selected=rows()[slot].post;const used=new Set(rows().filter((_,i)=>i!==slot).map(v=>v.post));$('pv-posts').innerHTML=GROUPS.map(([title,codes])=>`<div class="pv-group">${esc(title)}</div>${codes.map(post=>`<label class="pv-choice ${selected===post?'selected':''} ${used.has(post)?'taken':''}"><input type="radio" name="pv-post" value="${post}" ${selected===post?'checked':''} ${used.has(post)?'disabled':''}><span>${post}</span></label>`).join('')}`).join('');$('pv-custom-post').value=selected&&!POSTS.includes(selected)?selected:''}
  function drawAgents(){const selected=new Set(rows()[slot].agents),all=roster(),q=query.toLocaleLowerCase('fr');const visible=all.filter(a=>(team==='all'||String(a.team)===team)&&(!q||a.name.toLocaleLowerCase('fr').includes(q)));$('pv-roster-count').textContent=`(${all.length})`;
    $('pv-agents').innerHTML=visible.length?visible.map(a=>`<label class="pv-choice pv-person ${a.gender==='F'?'female':''} ${selected.has(a.name)?'selected':''}"><input type="checkbox" data-agent="${esc(a.name)}" ${selected.has(a.name)?'checked':''}><span>${esc(a.name)}<small>${a.team?'Team '+a.team:'Équipe ?'}</small></span></label>`).join(''):'<p class="pv-help">Aucun agent dans ce filtre.</p>'}
  function drawSelected(){const names=rows()[slot].agents;$('pv-selected').innerHTML=names.length?`<strong>Agents rencontrés (${names.length})</strong><div class="pv-tags">${names.map(x=>`<button type="button" data-remove="${esc(x)}" aria-label="Retirer ${esc(x)}">${esc(x)} ×</button>`).join('')}</div>`:'<p class="pv-help">Aucun agent coché.</p>'}
  function drawExtras(){const v=rows()[slot];$('pv-title').textContent=`Visite ${slot+1} · ${v.post||'poste à choisir'}`;$('pv-done').checked=v.done;$('pv-done').disabled=!v.post;$('pv-time').value=v.time;$('pv-note').value=v.note}
  function drawHistory(){const days=Object.keys(state).filter(validDate).sort().reverse();$('pv-history').innerHTML=days.length?days.slice(0,45).map(day=>{const v=Array.from({length:3},(_,i)=>normalized(state[day]?.[i]||blank())),n=count(v);return `<button type="button" data-day="${day}" class="pv-history"><span><strong>${new Date(day+'T12:00:00').toLocaleDateString('fr-FR')}</strong><small>${esc(v.filter(x=>x.post).map(x=>x.post).join(' · '))}</small></span><b class="${n===3?'ok':''}">${n}/3</b></button>`}).join(''):'<p class="pv-help">Aucune visite enregistrée.</p>'}
  function drawShift(){let shifts=[];try{shifts=JSON.parse(localStorage.getItem('myteam_shifts')||'[]')}catch{}const found=Array.isArray(shifts)?shifts.filter(s=>s?.date===date):[];$('pv-shift').textContent=found.length?'Vacation enregistrée : '+found.map(s=>`${s.start||'?'}–${s.end||'?'}`).join(' · '):'Aucune vacation retrouvée à cette date ; saisie possible.'}
  function draw(){ $('pv-date').value=date;$('pv-team').value=team;$('pv-search').value=query;drawShift();drawTotals();drawSlots();drawPosts();drawAgents();drawSelected();drawExtras();drawHistory()}
  const refreshSelection=()=>{drawTotals();drawSlots();drawPosts();drawSelected();drawExtras();drawHistory()};
  function openDate(d){if(!validDate(d))return;date=d;slot=0;query='';message('');draw()}
  function choosePost(post){post=String(post||'').trim().slice(0,70);if(!post)return message('Indique un poste.',true);const next=rows();if(next.some((v,i)=>i!==slot&&v.post.toLowerCase()===post.toLowerCase()))return message('Ce poste est déjà sélectionné pour cette journée.',true);next[slot].post=post;if(save(next))refreshSelection()}
  function addAgent(name){name=String(name||'').trim().replace(/\s+/g,' ').slice(0,100);if(!name)return message('Indique un agent.',true);const next=rows();if(next[slot].agents.some(x=>x.localeCompare(name,'fr',{sensitivity:'base'})===0))return message('Agent déjà coché.',true);next[slot].agents.push(name);if(save(next)){drawAgents();refreshSelection()}}
  tab.onclick=()=>{nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));state=read();draw()};
  $('pv-date').onchange=e=>openDate(e.target.value);$('pv-prev').onclick=()=>openDate(relative(date,-1));$('pv-next').onclick=()=>openDate(relative(date,1));$('pv-today').onclick=()=>openDate(today());
  $('pv-slots').onclick=e=>{const b=e.target.closest('[data-slot]');if(!b)return;slot=Number(b.dataset.slot);message('');draw()};
  $('pv-posts').onchange=e=>{if(e.target.name==='pv-post')choosePost(e.target.value)};
  $('pv-custom-post-add').onclick=()=>choosePost($('pv-custom-post').value);
  $('pv-custom-post').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();choosePost(e.target.value)}};
  $('pv-done').onchange=e=>{const next=rows();if(!next[slot].post){e.target.checked=false;return message('Choisis un poste avant de valider.',true)}next[slot].done=e.target.checked;if(save(next))refreshSelection()};
  $('pv-team').onchange=e=>{team=e.target.value;drawAgents()};$('pv-search').oninput=e=>{query=e.target.value;drawAgents()};
  $('pv-agents').onchange=e=>{const input=e.target.closest('[data-agent]');if(!input)return;const next=rows(),name=input.dataset.agent;next[slot].agents=input.checked?[...new Set([...next[slot].agents,name])]:next[slot].agents.filter(x=>x!==name);if(save(next)){input.closest('.pv-choice')?.classList.toggle('selected',input.checked);drawSelected()}};
  $('pv-custom-agent-add').onclick=()=>{const input=$('pv-custom-agent');addAgent(input.value);input.value=''};
  $('pv-custom-agent').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addAgent(e.target.value);e.target.value=''}};
  $('pv-selected').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b)return;const next=rows();next[slot].agents=next[slot].agents.filter(x=>x!==b.dataset.remove);if(save(next)){drawSelected();drawAgents()}};
  $('pv-time').onchange=e=>{const next=rows();next[slot].time=e.target.value;save(next)};
  $('pv-note').onchange=e=>{const next=rows();next[slot].note=e.target.value;save(next)};
  $('pv-clear').onclick=()=>{const v=rows()[slot];if(!v.post&&!v.done&&!v.agents.length&&!v.time&&!v.note)return;if(!confirm(`Vider la visite ${slot+1} du ${date} ?`))return;const next=rows();next[slot]=blank();if(save(next))draw()};
  $('pv-history').onclick=e=>{const b=e.target.closest('[data-day]');if(b){openDate(b.dataset.day);section.scrollIntoView({behavior:'smooth',block:'start'})}};
  window.addEventListener('storage',e=>{if(e.key===KEY||e.key===AGENTS_KEY){state=read();if(!section.classList.contains('hidden'))draw()}});
  draw();
})();
