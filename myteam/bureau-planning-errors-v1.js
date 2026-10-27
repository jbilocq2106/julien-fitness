/* MyTEAM — bureau modulable et suivi prive des anomalies de planning.
   Conserve les donnees de planning existantes. Aucune transmission automatique. */
(function () {
  'use strict';
  if (document.getElementById('mt-bureau')) return;
  const nav = document.querySelector('nav.tabs');
  const main = document.querySelector('main');
  if (!nav || !main) return;
  const KEY = 'myteam_planning_errors_v1';
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const isoDay = d => [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
  const monthOf = d => [d.getFullYear(), pad(d.getMonth() + 1)].join('-');
  const nextMonth = d => monthOf(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12));
  const labelMonth = m => {
    if (!/^\d{4}-\d{2}$/.test(m)) return m;
    const parts = m.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(parts[0], parts[1] - 1, 1, 12));
  };
  const windowFor = month => {
    const parts = month.split('-').map(Number);
    const prev = new Date(parts[0], parts[1] - 2, 1, 12);
    const last = Math.min(30, new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate());
    return { start: new Date(prev.getFullYear(), prev.getMonth(), 20, 12), end: new Date(prev.getFullYear(), prev.getMonth(), last, 12), last };
  };
  const insideWindow = (month, now) => {
    const w = windowFor(month);
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    return d >= w.start && d <= w.end;
  };
  const frenchDate = d => d.toLocaleDateString('fr-FR');
  const records = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(value) ? value.filter(r => r && typeof r === 'object' && typeof r.id === 'string') : [];
    } catch { return []; }
  };
  const writeRecords = data => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  };

  const css = document.createElement('style');
  css.textContent = [
    '#mt-bureau{max-width:1140px;margin:0 auto}#mt-bureau h2,#planning-errors h2{margin:0 0 8px}',
    '.mtb-intro{background:linear-gradient(120deg,#253c55,#1d2a3e);border:1px solid #47617b}',
    '.mtb-note{font-size:13px;color:#c6d5e4;line-height:1.5;margin:7px 0}',
    '.mtb-alert{padding:14px;background:#463623;border:1px solid #a47742;border-radius:12px;line-height:1.5}',
    '.mtb-alert strong{display:block;color:#ffcf91}',
    '.mtb-section-title{font-size:16px;margin:22px 0 10px;font-weight:800}',
    '.mtb-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
    '.mtb-tile{min-width:0;min-height:94px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px 7px;background:#273a54;border:1px solid #46607d;border-radius:16px;color:#fff;text-align:center;line-height:1.25;cursor:pointer}',
    '.mtb-tile:focus-visible{outline:3px solid #f6b77e;outline-offset:2px}',
    '.mtb-tile .mtb-ico{font-size:27px;line-height:1.2}',
    '.mtb-tile .mtb-label{font-size:12px;font-weight:800;overflow-wrap:anywhere}',
    '.mtb-tile .mtb-tile-note{font-size:10px;color:#c3d3e5}',
    '.mtb-alert-btn{background:#b36622;margin-top:10px;min-height:45px}',
    '#planning-errors{max-width:1000px;margin:0 auto}',
    '#planning-errors .mtpe-warning{border-left:4px solid #e5a34b;padding:12px;background:#3e3325;border-radius:10px;font-size:13px;line-height:1.55}',
    '#planning-errors .mtpe-warning.ok{border-left-color:#62c99c;background:#1e3a34}',
    '#planning-errors .mtpe-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
    '#planning-errors label{display:grid;gap:6px;margin:9px 0;font-weight:750;font-size:13px}',
    '#planning-errors input,#planning-errors select,#planning-errors textarea{width:100%;min-height:46px;border:1px solid #70839b;border-radius:10px;padding:10px 12px;background:#121d2d;color:#fff;font:inherit}',
    '#planning-errors textarea{min-height:84px;resize:vertical}',
    '#planning-errors button{min-height:45px}',
    '#planning-errors .mtpe-actions{display:flex;flex-wrap:wrap;gap:9px;margin:13px 0}',
    '#planning-errors .mtpe-primary{background:#cd692b}',
    '#planning-errors .mtpe-row{padding:13px 0;border-top:1px solid #42556e}',
    '#planning-errors .mtpe-row p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0;line-height:1.45}',
    '#planning-errors .mtpe-row small{color:#bbcada}',
    '#planning-errors .mtpe-head{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}',
    '#planning-errors .mtpe-head strong{overflow-wrap:anywhere}',
    '#planning-errors .mtpe-status{border-radius:100px;padding:4px 8px;font-size:11px;background:#344e6a;white-space:nowrap}',
    '#planning-errors .mtpe-status.done{background:#205b46}',
    '#planning-errors .mtpe-row button{margin:7px 6px 0 0;min-height:40px;padding:8px 12px}',
    '@media(max-width:650px){.mtb-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mtb-tile{min-height:92px;padding:10px 5px}.mtb-tile .mtb-ico{font-size:24px}.mtb-tile .mtb-label{font-size:11px}#planning-errors .mtpe-grid{grid-template-columns:1fr}}'
  ].join('');
  document.head.append(css);

  const errors = document.createElement('section');
  errors.id = 'planning-errors';
  errors.className = 'hidden';
  errors.innerHTML = [
    "<div class='card'><h2>Erreurs de planning</h2><p class='mtb-note'>Consigne de suivi : saisir les erreurs du mois concerné entre le 20 et le 30 du mois précédent (jusqu'au dernier jour en février).</p>",
    "<label for='mtpe-month'>Mois de planning concerné</label><input id='mtpe-month' type='month' required>",
    "<p id='mtpe-deadline' role='status' class='mtpe-warning'></p>",
    "<p id='mtpe-count' class='mtb-note'></p></div>",
    "<div class='card'><h3 id='mtpe-form-title'>Nouvelle anomalie</h3><form id='mtpe-form'>",
    "<label>Agent concerné<input name='agent' type='text' list='mtpe-agent-options' maxlength='100' placeholder='Nom et prénom de l’agent' required></label><datalist id='mtpe-agent-options'></datalist><div class='mtpe-grid'><label>Date concernée<input name='date' type='date' required></label>",
    "<label>Catégorie<select name='category'><option>Jour travaillé / repos</option><option>Horaires / durée</option><option>Poste / affectation</option><option>Congé / jour férié</option><option>Compteur d'heures / prime</option><option>Paie / suivi RH</option><option>Présence / absence annoncée</option><option>Autre</option></select></label></div>",
    "<label>Poste / vacation (facultatif)<input name='post' maxlength='70' placeholder='Ex. E84 après-midi'></label>",
    "<label>Erreur constatée<textarea name='issue' maxlength='1500' required placeholder='Décris le planning reçu et ce qui te paraît incorrect'></textarea></label>",
    "<label>Correction demandée (facultatif)<textarea name='request' maxlength='800' placeholder='Ce qu'il faudrait vérifier ou modifier'></textarea></label>",
    "<label>Suivi<select name='status'><option>Brouillon</option><option>Signalé</option><option>En attente</option><option>Corrigé</option><option>Non retenu</option></select></label>",
    "<div class='mtpe-actions'><button type='submit' class='mtpe-primary' id='mtpe-save'>Enregistrer</button><button type='button' id='mtpe-reset'>Annuler / nouveau</button></div>",
    "</form><p class='mtb-note' id='mtpe-message' role='status'></p>",
    "<p class='mtb-note'>Suivi privé : aucune transmission à la planification et aucune modification automatique du planning officiel. Évite les informations de santé ou personnelles dans les descriptions.</p></div>",
    "<div class='card'><h3>Importer un signalement privé</h3><p class='mtb-note'>Colle ici les fiches copiées depuis ChatGPT. Le contenu est traité sur cet appareil, sans être ajouté au code public de MyTEAM.</p><textarea id='mtpe-paste' style='width:100%;min-height:100px' placeholder='Colle les données des signalements ici'></textarea><div class='mtpe-actions'><button type='button' id='mtpe-paste-import' class='mtpe-primary'>Ajouter les signalements à MyTEAM</button></div><p id='mtpe-paste-status' class='mtb-note' role='status'></p></div>",
    "<div class='card'><h3>Historique et récapitulatif</h3>",
    "<div class='mtpe-actions'><button id='mtpe-copy' type='button'>Copier le récapitulatif du mois</button></div>",
    "<div id='mtpe-list'></div></div>"
  ].join('');
  main.append(errors);
  const errorTab = document.createElement('button');
  errorTab.type = 'button';
  errorTab.dataset.tab = 'planning-errors';
  errorTab.textContent = '⚠️ Erreurs planning';
  nav.append(errorTab);

  const bureau = document.createElement('section');
  bureau.id = 'mt-bureau';
  bureau.className = 'hidden';
  bureau.innerHTML = [
    "<div class='card mtb-intro'><h2>Mon bureau MyTEAM</h2>",
    "<p class='mtb-note'>Team 4 · Outils classés par priorité. « Mon planning » concerne uniquement mes horaires ; les anomalies des agents se trouvent dans « Plannings agents ». Les futurs modules apparaîtront dans les autres rubriques.</p></div>",
    "<div id='mtb-planning-alert' class='mtb-alert' role='status'></div>",
    "<div id='mtb-groups'></div>"
  ].join('');
  main.prepend(bureau);
  const bureauTab = document.createElement('button');
  bureauTab.type = 'button';
  bureauTab.dataset.tab = 'mt-bureau';
  bureauTab.textContent = '▦ Bureau';
  nav.prepend(bureauTab);

  const monthInput = $('mtpe-month');
  monthInput.value = nextMonth(new Date());
  const form = $('mtpe-form');
  let editId = '';

  function selectTab(id, selector) {
    const btn = Array.from(nav.querySelectorAll('button[data-tab]')).find(b => b.dataset.tab === id);
    if (!btn) return;
    btn.click();
    if (selector) setTimeout(() => document.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'}), 90);
    else window.scrollTo(0,0);
  }
  // Bureau : un point d'entrée par espace, les sous-fonctions restent accessibles à l'intérieur.
  const categoryItems = [
    ['1 · Aujourd’hui — actions quotidiennes', [
      ['today', '☀️', 'Tableau du jour', 'Alertes et remplacements'],
      ['parif', '📷', 'Plan PARIF'],
      ['main-courante', '📝', 'Main courante'],
      ['visits', '✅', 'Visites sur poste', 'Objectif : 3 par jour']
    ]],
    ['2 · Exploitation — contrôle des postes', [
      ['prestation', '📑', 'Fiche de prestation'],
      ['composition', '👷', 'Composition des équipes'],
      ['consignes', '📋', 'Consignes']
    ]],
    ['3 · Plannings agents — à vérifier et corriger', [
      ['planning-issues', '⚠️', 'Signalements reçus'],
      ['planning-errors', '📅', 'Suivi mensuel', 'Erreurs et échéances'],
      ['leave', '🏖️', 'Congés agents']
    ]],
    ['4 · Agents et encadrement', [
      ['team', '👥', 'Fiches agents', 'Matricules et qualifications'],
      ['mt-management-workspace', '🤝', 'Management', 'Entretiens individuels'],
      ['cde-memo', '📌', 'Mémo CDE']
    ]],
    ['5 · Mon espace personnel', [
      ['planning', '🗓️', 'Mon planning', 'Mes horaires uniquement'],
      ['hours', '🕒', 'Mes heures'],
      ['salary', '💶', 'Salaire']
    ]],
    ['6 · Historique et sauvegarde', [
      ['history', '📚', 'Historique'],
      ['secure-backup', '🔐', 'Sauvegarde privée']
    ]]
  ];
  const aliases = {
    'main-courante': { target:'today', selector:'#mt-ops-host .mt-ops-box:first-child' }
  };
  const makeTile = (id, icon, label, note) => {
    const shortcut = aliases[id];
    const target = shortcut ? shortcut.target : id;
    if (!Array.from(nav.querySelectorAll('button[data-tab]')).some(b => b.dataset.tab === target)) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mtb-tile';
    const emoji = document.createElement('span');
    emoji.className = 'mtb-ico';
    emoji.setAttribute('aria-hidden','true');
    emoji.textContent = icon;
    const name = document.createElement('span');
    name.className = 'mtb-label';
    name.textContent = label;
    button.append(emoji,name);
    if (note) {
      const small = document.createElement('span');
      small.className = 'mtb-tile-note';
      small.textContent = note;
      button.append(small);
    }
    button.onclick = () => selectTab(target,shortcut?.selector);
    return button;
  };
  function renderBureau() {
    const groups = $('mtb-groups');
    groups.replaceChildren();
    const included = new Set(['mt-bureau']);
    categoryItems.forEach(group => {
      const heading = document.createElement('h3');
      heading.className = 'mtb-section-title';
      heading.textContent = group[0];
      const grid = document.createElement('div');
      grid.className = 'mtb-grid';
      group[1].forEach(item => {
        const tile = makeTile(item[0],item[1],item[2],item[3]);
        if (tile) {grid.append(tile);included.add(item[0]);included.add(aliases[item[0]]?.target || item[0]);}
      });
      if (grid.children.length) groups.append(heading,grid);
    });
    const extras = Array.from(nav.querySelectorAll('button[data-tab]')).filter(b => !included.has(b.dataset.tab) && b.dataset.deskSecondary !== 'true' && !['mtal-recap','manager','interviews','pariftools'].includes(b.dataset.tab));
    if (extras.length) {
      const heading = document.createElement('h3');
      heading.className = 'mtb-section-title';
      heading.textContent = 'Autres modules';
      const grid = document.createElement('div');
      grid.className = 'mtb-grid';
      extras.forEach(b => {
        const tile = makeTile(b.dataset.tab,'📁',b.textContent.trim());
        if (tile) grid.append(tile);
      });
      groups.append(heading,grid);
    }
    const now = new Date();
    const target = nextMonth(now);
    const w = windowFor(target);
    const all = records().filter(r => r.month === target);
    const open = all.filter(r => r.status !== 'Corrigé' && r.status !== 'Non retenu').length;
    const alert = $('mtb-planning-alert');
    alert.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = insideWindow(target,now)
      ? 'Erreurs de planning — période de saisie en cours'
      : now > w.end ? 'Erreurs de planning — échéance passée' : 'Prochaine période de remontée des erreurs';
    const info = document.createElement('p');
    info.className = 'mtb-note';
    info.textContent = labelMonth(target) + ' : du ' + frenchDate(w.start) + ' au ' + frenchDate(w.end) + ' · ' + all.length + ' anomalie(s) enregistrée(s), ' + open + ' à suivre.';
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'mtb-alert-btn';
    action.textContent = "Ouvrir les erreurs de planning";
    action.onclick = () => {monthInput.value=target;onMonthChange();selectTab('planning-errors');};
    alert.append(title,info,action);
  }
  function showSection(section,tab) {
    nav.querySelectorAll('button[data-tab]').forEach(b => b.classList.toggle('active',b === tab));
    main.querySelectorAll('section').forEach(s => s.classList.toggle('hidden',s !== section));
    window.scrollTo(0,0);
  }
  bureauTab.onclick = () => {renderBureau();showSection(bureau,bureauTab);};
  errorTab.onclick = () => {renderErrors();showSection(errors,errorTab);};

  function updateDateBounds() {
    const month = monthInput.value;
    const date = form.elements.date;
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const parts=month.split('-').map(Number);
    const last = new Date(parts[0],parts[1],0).getDate();
    date.min=month+'-01';
    date.max=month+'-'+pad(last);
    if (!date.value.startsWith(month)) date.value='';
  }
  function clearForm() {
    editId='';
    form.reset();
    updateDateBounds();
    $('mtpe-form-title').textContent='Nouvelle anomalie';
    $('mtpe-save').textContent='Enregistrer';
    $('mtpe-message').textContent='';
  }
  function onMonthChange() {clearForm();renderErrors();}
  monthInput.addEventListener('change',onMonthChange);
  $('mtpe-reset').onclick=clearForm;

  function renderErrors() {
    const month = monthInput.value;
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const now=new Date(),win=windowFor(month),current=insideWindow(month,now);
    const banner=$('mtpe-deadline');
    banner.classList.toggle('ok',current);
    banner.textContent='Planning de '+labelMonth(month)+' · saisie prévue du '+frenchDate(win.start)+' au '+frenchDate(win.end)
      +(current?' — période ouverte.':now>win.end?' — délai passé : toute saisie tardive restera datée.':' — période pas encore ouverte : brouillon possible.');
    const items=records().filter(r=>r.month===month).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.createdAt).localeCompare(String(b.createdAt)));
    $('mtpe-count').textContent=items.length+' anomalie(s) enregistrée(s) pour ce mois · '+items.filter(r=>r.status==='Corrigé').length+' corrigée(s).';
    const list=$('mtpe-list');
    list.replaceChildren();
    if (!items.length) {
      const empty=document.createElement('p');
      empty.className='mtb-note';
      empty.textContent='Aucune anomalie enregistrée pour ce mois.';
      list.append(empty);
      return;
    }
    items.forEach(r=>{
      const row=document.createElement('article');
      row.className='mtpe-row';
      const head=document.createElement('div');
      head.className='mtpe-head';
      const title=document.createElement('strong');
      title.textContent=(r.date?r.date.split('-').reverse().join('/'):'Date ?')+' · '+(r.agent?r.agent+' · ':'')+(r.category||'Autre')+(r.post?' · '+r.post:'');
      const state=document.createElement('span');
      state.className='mtpe-status'+(r.status==='Corrigé'?' done':'');
      state.textContent=r.status||'Brouillon';
      head.append(title,state);
      const details=document.createElement('p');
      details.textContent=r.issue||'';
      row.append(head,details);
      if (r.request) {
        const correction=document.createElement('p');
        correction.textContent='Correction demandée : '+r.request;
        row.append(correction);
      }
      const meta=document.createElement('small');
      meta.textContent='Dernière mise à jour : '+(r.updatedAt?new Date(r.updatedAt).toLocaleString('fr-FR'):'non datée');
      row.append(meta);
      const actions=document.createElement('div');
      const edit=document.createElement('button');
      edit.type='button';edit.textContent='Modifier';
      edit.onclick=()=>{
        monthInput.value=r.month;
        editId=r.id;updateDateBounds();
        ['agent','date','category','post','issue','request','status'].forEach(name=>{form.elements[name].value=r[name]||'';});
        $('mtpe-form-title').textContent='Modifier cette anomalie';
        $('mtpe-save').textContent='Enregistrer les modifications';
        form.scrollIntoView({behavior:'smooth',block:'start'});
      };
      const remove=document.createElement('button');
      remove.type='button';remove.textContent='Supprimer';
      remove.onclick=()=>{
        if (!confirm('Supprimer définitivement cette anomalie locale ?')) return;
        const listNow=records().filter(item=>item.id!==r.id);
        if (!writeRecords(listNow)) {$('mtpe-message').textContent='Suppression impossible : stockage indisponible.';return;}
        if (editId===r.id) clearForm();
        renderErrors();
        renderAgentErrors();
      };
      actions.append(edit,remove);row.append(actions);list.append(row);
    });
  }
  form.onsubmit=event=>{
    event.preventDefault();
    const month=monthInput.value;
    const data={};
    ['agent','date','category','post','issue','request','status'].forEach(name=>{data[name]=String(form.elements[name].value||'').trim();});
    if(!data.date.startsWith(month+'-')||!data.issue||!data.agent){$('mtpe-message').textContent='Agent, date du bon mois et description obligatoires.';return;}
    const list=records();
    const old=editId?list.find(r=>r.id===editId):null;
    if(editId&&!old){$('mtpe-message').textContent='La fiche a changé ou a été supprimée : réouvre-la avant modification.';return;}
    const now=new Date().toISOString();
    const item={...data,id:old?.id||(crypto.randomUUID?crypto.randomUUID():String(Date.now())),month,createdAt:old?.createdAt||now,updatedAt:now};
    const updated=old?list.map(r=>r.id===old.id?item:r):[...list,item];
    if (!writeRecords(updated)) {$('mtpe-message').textContent='Enregistrement impossible. Vérifie le stockage du téléphone.';return;}
    clearForm();
    renderErrors();
    renderAgentErrors();
    $('mtpe-message').textContent='Anomalie enregistrée dans MyTEAM. Aucun message envoyé à la planification.';
  };
  $('mtpe-copy').onclick=async()=>{
    const items=records().filter(r=>r.month===monthInput.value).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    if(!items.length){$('mtpe-message').textContent='Aucune anomalie à copier.';return;}
    const lines=['Erreurs de planning — '+labelMonth(monthInput.value),'',...items.map((r,i)=>
      (i+1)+'. '+r.date+' — '+(r.agent?r.agent+' — ':'')+r.category+(r.post?' ('+r.post+')':'')+'\n'+r.issue+
      (r.request?'\nCorrection demandée : '+r.request:'')+'\nSuivi : '+r.status+'\n'
    )];
    try {await navigator.clipboard.writeText(lines.join('\n'));$('mtpe-message').textContent='Récapitulatif copié. Vérifie-le avant toute transmission.';}
    catch {$('mtpe-message').textContent='Copie automatique indisponible sur ce navigateur.';}
  };
  updateDateBounds();
  renderErrors();

  // Le rattachement à un agent n'expose jamais de dossier nominatif dans le dépôt public.
  const agentSelect = $('agent-select');
  const agentDetail = $('agent-detail');
  if (agentDetail && !$('mtpe-agent-records')) {
    const block = document.createElement('div');
    block.id = 'mtpe-agent-records';
    block.style.cssText = 'margin:18px 0;padding:13px;border:1px solid #4c6a87;border-radius:12px;background:#17263a';
    agentDetail.append(block);
  }
  function renderAgentErrors() {
    const block = $('mtpe-agent-records');
    const name = String(agentSelect?.value || '').trim();
    if (!block) return;
    block.replaceChildren();
    const title = document.createElement('h4');
    title.textContent = 'Problèmes de planning et suivi administratif';
    block.append(title);
    const agentRecords = records().filter(r => name && String(r.agent || '').localeCompare(name, 'fr', {sensitivity:'base'}) === 0)
      .sort((a,b) => String(b.date).localeCompare(String(a.date)));
    if (!agentRecords.length) {
      const empty = document.createElement('p');
      empty.className = 'mtb-note';
      empty.textContent = name ? 'Aucun problème de planning rattaché à cet agent.' : 'Sélectionne un agent.';
      block.append(empty);
      return;
    }
    agentRecords.forEach(r => {
      const item = document.createElement('div');
      item.className = 'mtpe-row';
      const head = document.createElement('strong');
      head.textContent = r.date.split('-').reverse().join('/')+' · '+r.post+' · '+r.status;
      const body = document.createElement('p');
      body.textContent = r.issue;
      const ask = document.createElement('p');
      ask.textContent = 'À vérifier : '+(r.request || '—');
      const open = document.createElement('button');
      open.type='button';
      open.textContent='Ouvrir dans les erreurs de planning';
      open.onclick=()=>{monthInput.value=r.month;onMonthChange();errorTab.click();};
      item.append(head,body,ask,open);
      block.append(item);
    });
  }
  agentSelect?.addEventListener('change',renderAgentErrors);
  function refreshAgentSuggestions() {
    const list = $('mtpe-agent-options');
    if(!list)return;
    let profiles={};
    try {profiles=JSON.parse(localStorage.getItem('myteam_agent_profiles_v1')||'{}')||{};}catch{}
    list.replaceChildren();
    Object.keys(profiles).sort((a,b)=>a.localeCompare(b,'fr')).forEach(name=>{
      const opt=document.createElement('option');
      opt.value=name;
      list.append(opt);
    });
  }
  form.elements.agent.addEventListener('focus',refreshAgentSuggestions);
  refreshAgentSuggestions();
  renderAgentErrors();
  
  // Import prive par collage : aucune donnee d'agent n'est codee dans le depot.
  function importPastedReports() {
    const status=$('mtpe-paste-status');
    try {
      const raw=$('mtpe-paste').value.trim();
      const payload=JSON.parse(raw);
      if(payload?.v!==1||!Array.isArray(payload.records)||!payload.records.length||payload.records.length>20)
        throw new Error('Format non reconnu');
      const allowed=['Jour travaillé / repos','Horaires / durée','Poste / affectation','Congé / jour férié','Compteur d\'heures / prime','Paie / suivi RH','Présence / absence annoncée','Autre'];
      const now=new Date().toISOString();
      const items=payload.records.map(r=>{
        const val=(k,max)=>String(r[k]??'').trim().slice(0,max);
        const id=val('id',120), date=val('date',10), agent=val('agent',100), category=val('category',100);
        const issue=val('issue',1500), request=val('request',800), post=val('post',70);
        if(!/^[a-z0-9_-]{8,120}$/i.test(id)||!/^(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)
          ||!agent||!issue||!allowed.includes(category))
          throw new Error('Dates, agent ou catégories incorrects');
        return {id,date,month:date.slice(0,7),agent,category,post,issue,request,status:'Brouillon',createdAt:now,updatedAt:now};
      });
      const existing=records();
      const additions=items.filter(x=>!existing.some(y=>y.id===x.id));
      if(additions.length&&!writeRecords(existing.concat(additions)))throw new Error('Stockage local indisponible');
      status.textContent=additions.length?additions.length+' signalement(s) enregistre(s) localement. Aucun message transmis aux RH.':'Signalement(s) deja enregistre(s) : aucun doublon.';
      if(additions.length) $('mtpe-paste').value='';
      monthInput.value=items[0].month;
      onMonthChange();
      renderAgentErrors();
    }catch(e) {
      status.textContent='Import impossible : '+e.message;
    }
  }
  $('mtpe-paste-import').onclick=importPastedReports;

  // Import depuis un fragment d'URL : le fragment n'est pas envoyé au serveur GitHub.
  // Les informations sont conservées dans le stockage local existant, puis dans
  // les sauvegardes chiffrées si la synchronisation privée est activée.
  function importFromHash() {
    const fragment=window.location.hash.slice(1);
    const prefix='mtpe-import=';
    if(!fragment.startsWith(prefix))return;
    try {
      const payload=JSON.parse(decodeURIComponent(fragment.slice(prefix.length)));
      if(payload?.v!==1 || !Array.isArray(payload.records) || payload.records.length<1 || payload.records.length>10)
        throw new Error('Format invalide');
      const accepted=['Jour travaillé / repos','Horaires / durée','Poste / affectation','Congé / jour férié','Compteur d\'heures / prime','Paie / suivi RH','Présence / absence annoncée','Autre'];
      const newItems=payload.records.map(r=>{
        const get=(field,max)=>String(r[field]||'').trim().slice(0,max);
        const id=get('id',120), date=get('date',10), agent=get('agent',100),issue=get('issue',1500);
        if(!/^[a-z0-9_-]{8,120}$/i.test(id) || !/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(date)
          || !agent || !issue)throw new Error('Champs manquants ou incorrects');
        const category=get('category',100);
        if(!accepted.includes(category))throw new Error('Catégorie invalide');
        return {id,date,agent,month:date.slice(0,7),category,post:get('post',70),issue,
          request:get('request',800),status:'Brouillon',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      });
      const existing=records();
      const unseen=newItems.filter(r=>!existing.some(p=>p.id===r.id));
      if(unseen.length && window.confirm('Ajouter '+unseen.length+' problème(s) de planning dans MyTEAM ?')) {
        if(!writeRecords(existing.concat(unseen)))throw new Error('Stockage indisponible');
        monthInput.value=unseen[0].month;
        onMonthChange();
        errorTab.click();
        renderAgentErrors();
        $('mtpe-message').textContent=unseen.length+' problème(s) enregistrés localement. Aucune transmission à la planification.';
      } else if (!unseen.length) {
        monthInput.value=newItems[0].month;onMonthChange();errorTab.click();
        $('mtpe-message').textContent='Ces problèmes figurent déjà dans MyTEAM : aucun doublon ajouté.';
      }
    } catch (error) {
      errorTab.click();
      $('mtpe-message').textContent='Import impossible : '+error.message;
    } finally {
      history.replaceState(null,'',window.location.pathname+window.location.search);
    }
  }
  const importRequested = window.location.hash.startsWith('#mtpe-import=');
  importFromHash();
  if (!importRequested) bureauTab.click();
})();
