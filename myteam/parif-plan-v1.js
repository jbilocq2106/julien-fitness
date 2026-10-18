(()=>{
  'use strict';
  if(document.getElementById('parif'))return;
  const main=document.querySelector('main'),topNav=document.querySelector('nav.tabs'),prestation=document.getElementById('prestation');
  if(!main||!topNav||!prestation)return;
  const STORE='myteam_parif_drafts_v1';
  // Référentiel fixe confirmé par Julien. Aucun écran de reclassement quotidien.
  const FIXED_POST_RULES={g4s:['E14','E32','E84','E85','E112'],duss:['E40'],parif:['E30','E43','E50','E51','E52','E80','E111','E121']};
  const SESSIONS=[
    {id:'morning',label:'Matin',hours:'06 h–14 h',start:'06:00',end:'14:00',middle:'E43',second:'E32'},
    {id:'afternoon',label:'Après-midi',hours:'14 h–22 h',start:'14:00',end:'22:00',middle:'E80',second:'E32'},
    {id:'night',label:'Nuit',hours:'22 h–06 h',start:'22:00',end:'06:00',middle:'E80',second:'E30'}
  ];
  const POST_TEMPLATE=[['E14',2],['E40',2],['SECOND',2],['E50',2],['MIDDLE',2],['E51',3],['E84',3],['E52',2],['E85',2],['E111',3],['E112',3],['E121',3]];
  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const today=()=>{const d=new Date();return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const read=(key,fallback)=>{try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return parsed??fallback}catch{return fallback}};
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00').toString()!=='Invalid Date';
  const clone=value=>JSON.parse(JSON.stringify(value));

  function blankSession(session){
    const posts={};
    for(const [p,count]of POST_TEMPLATE)posts[p==='MIDDLE'?session.middle:p==='SECOND'?session.second:p]=Array(count).fill('');
    // Conserver les valeurs d'anciens postes sans les afficher ni les considérer actifs.
    posts.E20=['',''];
    if(!posts.E30)posts.E30=['',''];
    if(!posts.E32)posts.E32=['',''];
    return{supervisor:'',patrol:['',''],posts,notesLxp:'',notesG4s:'',commande:'',extrasPlus:'',extrasMinus:'',effectifReel:'',escortHoraire:'',escortEffectif:'',escortLieu:'',escortSociete:''};
  }
  function blankDay(){return{shifts:Object.fromEntries(SESSIONS.map(session=>[session.id,blankSession(session)]))};}
  function hydrateDay(stored){
    const data=blankDay();
    if(!stored||typeof stored!=='object')return data;
    for(const session of SESSIONS){
      const source=stored.shifts?.[session.id];if(!source||typeof source!=='object')continue;
      const target=data.shifts[session.id];
      for(const name of ['supervisor','notesLxp','notesG4s','commande','extrasPlus','extrasMinus','effectifReel','escortHoraire','escortEffectif','escortLieu','escortSociete']){
        if(typeof source[name]==='string')target[name]=source[name].slice(0,name.startsWith('notes')?1200:160);
      }
      if(Array.isArray(source.patrol))target.patrol=target.patrol.map((_,i)=>typeof source.patrol[i]==='string'?source.patrol[i].slice(0,120):'');
      for(const [post,fields]of Object.entries(target.posts)){
        if(Array.isArray(source.posts?.[post]))target.posts[post]=fields.map((_,i)=>typeof source.posts[post][i]==='string'?source.posts[post][i].slice(0,120):'');
      }
    }
    return data;
  }
  function storedPlans(){const x=read(STORE,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
  let date=today(),active='morning',mode='overview',saved=blankDay(),working=blankDay(),baseRaw='',previewSnapshot='',importIssues=[];

  const section=document.createElement('section');section.id='parif';section.className='hidden';section.dataset.parifMode='overview';
  section.innerHTML=`<div class="card mt-parif-header">
    <div class="mt-parif-eyebrow">Planification du personnel · PARIF</div>
    <h2>📋 Plan PARIF</h2>
    <p class="mt-parif-sub">Les trois vacations sur la même page. Touche un poste pour le modifier.</p>
    <label class="mt-parif-date">Date du plan <input type="date" id="mt-parif-date"></label>
    <div class="mt-parif-view-modes" role="group" aria-label="Affichage du Plan PARIF">
      <button id="mt-parif-overview-btn" type="button" class="active" aria-pressed="true">📋 Vue de la journée</button>
      <button id="mt-parif-edit-btn" type="button" aria-pressed="false">✏️ Modifier</button>
      <button id="mt-parif-import-shortcut" type="button">📥 Importer</button>
    </div>
    <div class="mt-parif-tabs" role="group" aria-label="Choisir une vacation">
      ${SESSIONS.map(s=>`<button type="button" data-parif-shift="${s.id}"><strong>${s.label}</strong><small>${s.hours}</small></button>`).join('')}
    </div>
    <div class="mt-parif-banner">🔒 Brouillon privé. Ce plan ne modifie ni les équipes officielles ni les fiches de prestation.</div>
  </div>
  <div id="mt-parif-overview" aria-label="Vue complète des trois vacations"></div>
  <div class="card mt-parif-overview-actions">
    <button id="mt-parif-overview-review" type="button" class="mt-primary">👁 Vérifier et enregistrer le brouillon</button>
    <p class="mt-parif-disclaimer">Aucune modification officielle. La date et les trois vacations restent consultables sans changer d’onglet.</p>
  </div>
  <div class="card mt-parif-lookup">
    <h3>🔎 Où est un agent ?</h3>
    <p class="mt-parif-sub">Recherche l’affectation prévue dans le plan de la date sélectionnée. Le poste réel sur le terrain exige une confirmation opérationnelle.</p>
    <label class="mt-parif-lookup-label">Nom de l’agent
      <input id="mt-parif-lookup-input" autocomplete="off" placeholder="Tape un nom…" aria-label="Chercher une affectation par nom">
    </label>
    <div id="mt-parif-lookup-suggestions" class="mt-parif-lookup-suggestions"></div>
    <div id="mt-parif-lookup-result" role="status" class="mt-parif-lookup-result"></div>
  </div>
  <details class="card mt-parif-import" id="mt-parif-import-details">
    <summary>📥 Actualiser depuis la photo</summary>
    <p class="mt-parif-sub">Après m’avoir envoyé la photo du jour, télécharge le fichier du plan que je te donne, puis sélectionne-le ici. Rien n’est enregistré automatiquement.</p>
    <label class="mt-parif-file-label">Choisir le fichier du plan (.json)
      <input id="mt-parif-import-file" type="file" accept=".json,application/json">
    </label>
    <p id="mt-parif-import-status" role="status" class="mt-parif-import-status"></p>
    <div id="mt-parif-import-issues" class="mt-parif-import-issues hidden"></div>
  </details>
  <div id="mt-parif-content"></div>
  <div class="card mt-parif-actions">
    <h3>Vérifier avant d’enregistrer</h3>
    <p class="mt-parif-sub">Tu peux tout compléter ou corriger. Les cellules vides restent vides : aucune présence n’est supposée. La fiche de prestations sera rapprochée du plan dès qu’elle sera disponible.</p>
    <button id="mt-parif-preview-action" type="button" class="mt-primary">👁 Prévisualiser les changements</button>
    <div id="mt-parif-preview" class="hidden" role="status"></div>
    <div class="actions"><button id="mt-parif-save" type="button" class="mt-primary hidden">💾 Enregistrer le brouillon</button><button id="mt-parif-revert" type="button">Annuler les changements</button></div>
    <p id="mt-parif-status" role="status" class="mt-note"></p>
    <p class="mt-parif-disclaimer">Les effectifs et qualifications doivent être contrôlés avec les règles confirmées avant toute validation opérationnelle. Aucune transmission n’est effectuée.</p>
  </div>
  <button type="button" id="mt-parif-back">← Retour à la vue journalière</button>`;
  prestation.after(section);

  const nav=document.createElement('button');nav.type='button';nav.dataset.tab='parif';nav.textContent='📋 Plan PARIF';topNav.append(nav);
  const access=document.createElement('div');access.className='card mt-parif-entry';
  access.innerHTML='<h3>📋 Plan PARIF</h3><p>Les trois vacations réunies sur une seule page, avec modification tactile par poste.</p><button type="button" class="mt-primary">Ouvrir le plan PARIF</button>';
  prestation.insertBefore(access,prestation.firstChild.nextSibling);
  access.querySelector('button').onclick=()=>nav.click();
  el('mt-parif-back').onclick=()=>setMode('overview');

  function isDirty(){return JSON.stringify(working)!==JSON.stringify(saved)}
  function dropPreview(){previewSnapshot='';el('mt-parif-preview').classList.add('hidden');el('mt-parif-preview').replaceChildren();el('mt-parif-save').classList.add('hidden')}
  function showIssues(){
    const issues=el('mt-parif-import-issues');issues.replaceChildren();
    if(importIssues.length){
      const heading=document.createElement('strong');heading.textContent='À vérifier sur la photo :';issues.append(heading);
      const list=document.createElement('ul');
      importIssues.forEach(x=>{const item=document.createElement('li');item.textContent=x;list.append(item)});
      issues.append(list);issues.classList.remove('hidden');
    }else issues.classList.add('hidden');
  }
  function getDay(){
    baseRaw=localStorage.getItem(STORE)||'';
    const item=storedPlans()[date];
    saved=hydrateDay(item);working=clone(saved);
    importIssues=Array.isArray(item?.pointsAVerifier)?item.pointsAVerifier.filter(x=>typeof x==='string').slice(0,30):[];
    dropPreview();showIssues();
    el('mt-parif-import-status').textContent='';
    el('mt-parif-status').textContent='';
  }
  function textInput(path,value,placeholder='Nom / identifiant'){
    return`<input type="text" data-parif-name="1" data-parif-path="${esc(path)}" value="${esc(value)}" maxlength="120" autocomplete="off" placeholder="${esc(placeholder)}" aria-label="${esc(path.replaceAll('.',' '))}"><small class="mt-parif-employer">${esc(affiliation(value))}</small>`;
  }
  function affiliation(value){
    const v=String(value||'').trim();if(!v)return'';
    if(/\bG4S$/i.test(v))return'G4S';
    if(/\bDUSS$/i.test(v))return'DUSS';
    return'LXP (sans suffixe G4S, à vérifier)';
  }
  const currentPosts=session=>POST_TEMPLATE.map(([key,count])=>[key==='MIDDLE'?session.middle:key==='SECOND'?session.second:key,count]);
  function setMode(next){
    mode=next==='edit'?'edit':'overview';section.dataset.parifMode=mode;
    for(const [id,on]of [['mt-parif-overview-btn',mode==='overview'],['mt-parif-edit-btn',mode==='edit']]){
      const button=el(id);button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));
    }
    if(mode==='overview')el('mt-parif-overview').scrollIntoView({block:'start',behavior:'smooth'});
    else el('mt-parif-content').scrollIntoView({block:'start',behavior:'smooth'});
  }
  el('mt-parif-overview-btn').onclick=()=>setMode('overview');
  el('mt-parif-edit-btn').onclick=()=>setMode('edit');
  el('mt-parif-import-shortcut').onclick=()=>{
    const details=el('mt-parif-import-details');details.open=true;details.scrollIntoView({block:'center',behavior:'smooth'});
  };
  el('mt-parif-overview-review').onclick=()=>{
    setMode('edit');el('mt-parif-preview-action').click();
    el('mt-parif-preview-action').scrollIntoView({block:'center',behavior:'smooth'});
  };
  function numberInput(key,label,value){return`<label>${esc(label)}<input type="number" min="0" max="300" step="1" inputmode="numeric" data-parif-path="${key}" value="${esc(value)}" placeholder="—"></label>`;}
  function renderOverview(){
    const fmt=new Date(date+'T12:00:00').toLocaleDateString('fr-LU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const shiftCards=SESSIONS.map(session=>{
      const data=working.shifts[session.id],namesCount=currentPosts(session).reduce((n,[post])=>n+(data.posts[post]||[]).filter(Boolean).length,0);
      const postRows=currentPosts(session).map(([post])=>{
        const names=(data.posts[post]||[]).map(x=>String(x||'').trim()).filter(Boolean);
        const namesHtml=names.length?names.map(name=>`<span class="mt-parif-person ${/\bG4S$/i.test(name)?'is-g4s':/\bDUSS$/i.test(name)?'is-duss':'is-lxp'}">${esc(name)}</span>`).join(''):'<span class="mt-parif-empty">—</span>';
        return`<button type="button" class="mt-parif-overview-post" data-parif-open="${esc(session.id)}" data-parif-post="${esc(post)}" aria-label="${esc('Modifier '+post+' '+session.label)}">
          <span class="mt-parif-overview-code">${esc(post)}</span><span class="mt-parif-overview-names">${namesHtml}</span><span class="mt-parif-overview-pencil" aria-hidden="true">✎</span>
        </button>`;
      }).join('');
      const patrol=data.patrol.filter(Boolean).join(' · ')||'—';
      const hasBase=data.commande!=='';
      const predicted=hasBase?Number(data.commande)+Number(data.extrasPlus||0)-Number(data.extrasMinus||0):null;
      const summary=hasBase?`G4S prévu : ${predicted} · réel : ${data.effectifReel||'à vérifier'}`:'Effectif G4S : non renseigné';
      const notes=[data.notesLxp?`<div><b>LXP :</b> ${esc(data.notesLxp)}</div>`:'',data.notesG4s?`<div><b>G4S :</b> ${esc(data.notesG4s)}</div>`:''].filter(Boolean).join('');
      return`<article class="mt-parif-overview-shift" data-session="${session.id}">
        <div class="mt-parif-overview-shift-title"><div><h3>${esc(session.label)}</h3><small>${esc(session.hours)}</small></div><button type="button" data-parif-open="${session.id}" aria-label="Modifier la vacation ${esc(session.label)}">✏ Modifier</button></div>
        <div class="mt-parif-overview-leaders"><div><b>Superviseur</b><span>${esc(data.supervisor||'—')}</span></div><div><b>Patrouille</b><span>${esc(patrol)}</span></div></div>
        <div class="mt-parif-overview-rows">${postRows}</div>
        <div class="mt-parif-overview-foot"><b>${esc(summary)}</b>${notes?`<div class="mt-parif-overview-notes">${notes}</div>`:''}</div>
        <div class="mt-parif-overview-count">${namesCount} cellule(s) d’agents renseignée(s) · Brouillon</div>
      </article>`;
    }).join('');
    const legacy=SESSIONS.some(session=>(working.shifts[session.id].posts.E20||[]).some(Boolean));
    const filled=allAssignments().length;
    el('mt-parif-overview').innerHTML=`<div class="mt-parif-overview-heading"><div><h3>Plan du ${esc(fmt)}</h3><p>Matin · Après-midi · Nuit ${isDirty()?'· Non enregistré':''}</p></div><span>${filled} affectation(s)</span></div>
      ${importIssues.length?`<button type="button" class="mt-parif-overview-warning" data-parif-show-issues="1">⚠ ${importIssues.length} points à vérifier sur la photo · Voir les remarques</button>`:''}
      ${!filled?'<div class="mt-parif-overview-empty">Aucun nom chargé pour cette date. Utilise « 📥 Importer » pour reprendre le plan photographié.</div>':''}
      <div class="mt-parif-overview-grid">${shiftCards}</div>
      <p class="mt-parif-overview-legend">G4S après le nom = agent G4S. Sans suffixe G4S = agent Luxairport (LXP). DUSS = Dussmann. Les cases « — » ne sont pas une preuve de poste non couvert.</p>
      ${legacy?'<p class="mt-parif-overview-legend">Anciennes valeurs E20 conservées dans le brouillon local, mais ce poste supprimé n’apparaît plus dans le plan courant.</p>':''}`;
  }
  el('mt-parif-overview').addEventListener('click',event=>{
    if(event.target.closest('[data-parif-show-issues]')){
      const details=el('mt-parif-import-details');details.open=true;el('mt-parif-import-issues').scrollIntoView({block:'center',behavior:'smooth'});return;
    }
    const target=event.target.closest('[data-parif-open]');if(!target)return;
    active=target.dataset.parifOpen;render();setMode('edit');
    const post=target.dataset.parifPost;if(post){
      const input=section.querySelector(`[data-parif-path="posts.${post}.0"]`);
      input?.focus({preventScroll:true});input?.scrollIntoView({block:'center',behavior:'smooth'});
    }
  });
  function render(){
    el('mt-parif-date').value=date;
    section.querySelectorAll('[data-parif-shift]').forEach(button=>{button.classList.toggle('active',button.dataset.parifShift===active);button.setAttribute('aria-pressed',String(button.dataset.parifShift===active))});
    const session=SESSIONS.find(x=>x.id===active),data=working.shifts[active];
    const postCards=currentPosts(session).map(([post,count])=>{
      return`<div class="mt-parif-post ${active==='night'&&post==='E112'?'mt-parif-closed':''}">
        <h4>POSTE ${esc(post)} ${active==='night'&&post==='E112'?'<span>Fermeture nocturne à vérifier</span>':''}</h4>
        <div class="mt-parif-slot-list">${Array.from({length:count},(_,i)=>`<label><small>Agent ${i+1}</small>${textInput(`posts.${post}.${i}`,data.posts[post]?.[i]||'')}</label>`).join('')}</div>
      </div>`;
    }).join('');
    el('mt-parif-content').innerHTML=`
      <div class="card mt-parif-session" data-session="${active}">
        <div class="mt-parif-session-title"><h3>${esc(session.label)} · ${esc(session.hours)}</h3><span>Brouillon</span></div>
        <div class="mt-parif-leaders"><label><strong>Superviseur</strong>${textInput('supervisor',data.supervisor)}</label>
          <div><strong>Patrouilleur(s)</strong>${data.patrol.map((v,i)=>`<label><small>Patrouilleur ${i+1}</small>${textInput(`patrol.${i}`,v)}</label>`).join('')}</div></div>
        <h3 class="mt-parif-subtitle">Affectations par poste</h3><div class="mt-parif-post-grid">${postCards}</div>
      </div>
      <div class="card mt-parif-remarks"><h3>Remarques / absences</h3>
        <label>LXP<textarea rows="3" maxlength="1200" data-parif-path="notesLxp" placeholder="Remarques ou absences LXP">${esc(data.notesLxp)}</textarea></label>
        <label>G4S<textarea rows="3" maxlength="1200" data-parif-path="notesG4s" placeholder="Remarques ou absences G4S">${esc(data.notesG4s)}</textarea></label>
      </div>
      <div class="card mt-parif-effectifs"><h3>Effectifs G4S · ${esc(session.label)}</h3>
        <div class="mt-parif-count-grid">${numberInput('commande','Commande initiale',data.commande)}${numberInput('extrasPlus','Extra +',data.extrasPlus)}${numberInput('extrasMinus','Extra −',data.extrasMinus)}${numberInput('effectifReel','Effectif réel',data.effectifReel)}</div>
        <p id="mt-parif-total" class="mt-parif-total"></p>
        <p class="mt-parif-disclaimer">Effectif prévu = commande + extras − retraits. Un champ vide signifie « inconnu », pas zéro.</p>
      </div>
      <div class="card mt-parif-escort"><h3>Mission E121 / escorte chantier</h3>
        <div class="mt-parif-escort-fields">
          <label>Horaire<input data-parif-path="escortHoraire" maxlength="80" value="${esc(data.escortHoraire)}" placeholder="Ex. 08 h–16 h"></label>
          <label>Effectif<input data-parif-path="escortEffectif" maxlength="80" value="${esc(data.escortEffectif)}" placeholder="Nombre"></label>
          <label>Lieu<input data-parif-path="escortLieu" maxlength="120" value="${esc(data.escortLieu)}" placeholder="Lieu"></label>
          <label>Société<input data-parif-path="escortSociete" maxlength="120" value="${esc(data.escortSociete)}" placeholder="Société"></label>
        </div>
      </div>`;
    renderTotals();
    renderLookup();
    renderOverview();
  }
  const lookupName=name=>normalize(String(name||'').trim().replace(/\s+(G4S|DUSS)$/i,'')).replace(/\s+/g,' ');
  function allAssignments(){
    const result=[];
    for(const session of SESSIONS){
      const data=working.shifts[session.id],push=(name,post)=>{if(String(name||'').trim())result.push({name:String(name).trim(),session,post})};
      push(data.supervisor,'Superviseur');
      data.patrol.forEach((name,i)=>push(name,`Patrouilleur ${i+1}`));
      currentPosts(session).forEach(([post])=>(data.posts[post]||[]).forEach(name=>push(name,`Poste ${post}`)));
    }
    return result;
  }
  function renderLookup(){
    const input=el('mt-parif-lookup-input');if(!input)return;
    const query=input.value.trim(),suggestions=el('mt-parif-lookup-suggestions'),result=el('mt-parif-lookup-result');
    suggestions.replaceChildren();result.replaceChildren();
    if(!query){result.textContent='Renseigne un nom pour retrouver la vacation et le poste.';return;}
    const assignments=allAssignments(),q=lookupName(query);
    const exact=assignments.filter(x=>lookupName(x.name)===q);
    if(!exact.length){
      const matches=[...new Set(assignments.map(x=>x.name))].filter(name=>lookupName(name).includes(q)).slice(0,8);
      for(const name of matches){const button=document.createElement('button');button.type='button';button.textContent=name;
        button.onclick=()=>{input.value=name;renderLookup()};suggestions.append(button)}
      result.textContent=matches.length?'Sélectionne le nom exact dans les propositions.':'Nom introuvable dans ce brouillon. Cela ne prouve pas que l’agent est absent du site.';
      return;
    }
    const title=document.createElement('strong');title.textContent=exact[0].name+' · '+date;result.append(title);
    const list=document.createElement('ul');
    exact.forEach(x=>{const item=document.createElement('li');item.textContent=`${x.session.label} (${x.session.hours}) : ${x.post}`;list.append(item)});
    result.append(list);
    const disclaimer=document.createElement('p');disclaimer.textContent=`Source : ${isDirty()?'brouillon modifié non enregistré':'brouillon PARIF local'} · Affectation prévue, présence physique non vérifiée.${importIssues.length?' '+importIssues.length+' point(s) à contrôler sur la photo.':''}`;
    result.append(disclaimer);
    const bySession={};for(const x of exact){bySession[x.session.id]=(bySession[x.session.id]||0)+1;}
    if(Object.values(bySession).some(count=>count>1)){
      const alert=document.createElement('p');alert.className='mt-parif-lookup-warning';alert.textContent='⚠ Plusieurs affectations sur la même vacation : vérification nécessaire.';result.append(alert);
    }
  }
  el('mt-parif-lookup-input').addEventListener('input',renderLookup);
  function renderTotals(){
    const data=working.shifts[active],c=Number(data.commande),plus=data.extrasPlus===''?0:Number(data.extrasPlus),minus=data.extrasMinus===''?0:Number(data.extrasMinus);
    const hasBase=data.commande!==''&&[c,plus,minus].every(Number.isFinite),planned=hasBase?c+plus-minus:null;
    const hasReal=data.effectifReel!==''&&Number.isFinite(Number(data.effectifReel));
    el('mt-parif-total').textContent=`Effectif prévu : ${planned===null?'à renseigner':planned} · Réel : ${hasReal?data.effectifReel:'à renseigner'} · Écart : ${planned===null||!hasReal?'non calculable':Number(data.effectifReel)-planned}`;
  }
  function applyInput(event){
    const target=event.target,path=target.dataset.parifPath;if(!path)return;
    const parts=path.split('.'),shift=working.shifts[active];
    if(parts[0]==='posts'&&Array.isArray(shift.posts[parts[1]]))shift.posts[parts[1]][Number(parts[2])]=target.value;
    else if(parts[0]==='patrol')shift.patrol[Number(parts[1])]=target.value;
    else if(Object.prototype.hasOwnProperty.call(shift,parts[0]))shift[parts[0]]=target.value;
    if(target.matches('[data-parif-name]')){const employer=target.nextElementSibling;if(employer?.classList.contains('mt-parif-employer'))employer.textContent=affiliation(target.value);}
    dropPreview();
    if(['commande','extrasPlus','extrasMinus','effectifReel'].includes(parts[0]))renderTotals();
    renderLookup();
    renderOverview();
    el('mt-parif-status').textContent=isDirty()?'Modifications en cours, non enregistrées.':'Aucune modification en attente.';
  }
  el('mt-parif-content').addEventListener('input',applyInput);
  const importInput=el('mt-parif-import-file');
  importInput.onchange=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    const status=el('mt-parif-import-status');
    importInput.value='';
    if(file.size>1000000){status.textContent='Fichier trop volumineux : maximum 1 Mo.';return;}
    if(isDirty()&&!confirm('Les modifications non enregistrées seront remplacées par les données du fichier. Continuer ?'))return;
    let data;
    try{data=JSON.parse(await file.text());}
    catch{status.textContent='Le fichier choisi ne contient pas un plan JSON lisible.';return;}
    if(!data||data.myteamFormat!=='parif-draft-v1'||!validDate(data.date)||!data.shifts||typeof data.shifts!=='object'||SESSIONS.some(s=>!data.shifts[s.id]||typeof data.shifts[s.id]!=='object')){
      status.textContent='Ce fichier ne correspond pas au format Plan PARIF MyTEAM.';return;
    }
    if(data.date!==date&&storedPlans()[data.date]&&!confirm(`Un brouillon existe déjà pour le ${data.date}. Préparer son remplacement pour prévisualisation ?`))return;
    date=data.date;
    baseRaw=localStorage.getItem(STORE)||'';
    saved=hydrateDay(storedPlans()[date]);working=hydrateDay(data);
    importIssues=Array.isArray(data.pointsAVerifier)?data.pointsAVerifier.filter(x=>typeof x==='string').slice(0,30).map(x=>x.slice(0,240)):[];
    showIssues();
    active='morning';dropPreview();render();setMode('overview');
    const occupied=allAssignments().length;
    status.textContent=`Plan du ${date} chargé en prévisualisation · ${occupied} cellules nominatives ou indications de prestataire. Aucun enregistrement effectué.`;
    el('mt-parif-status').textContent='Parcours les 3 vacations, corrige les points incertains, puis clique sur « Prévisualiser les changements ».';
  };
  section.querySelectorAll('[data-parif-shift]').forEach(button=>button.onclick=()=>{if(button.dataset.parifShift===active)return;active=button.dataset.parifShift;dropPreview();render()});
  el('mt-parif-date').onchange=event=>{
    const next=event.target.value;
    if(!validDate(next)){event.target.value=date;return;}
    if(isDirty()&&!confirm('Tu as des changements non enregistrés. Changer de date et les abandonner ?')){event.target.value=date;return;}
    date=next;getDay();render();
  };
  el('mt-parif-revert').onclick=()=>{
    if(isDirty()&&!confirm('Annuler les corrections non enregistrées pour cette date ?'))return;
    working=clone(saved);
    const last=storedPlans()[date];importIssues=Array.isArray(last?.pointsAVerifier)?last.pointsAVerifier.filter(x=>typeof x==='string').slice(0,30):[];
    showIssues();dropPreview();render();el('mt-parif-status').textContent='Brouillon revenu à sa dernière version enregistrée.';
  };
  el('mt-parif-preview-action').onclick=()=>{
    dropPreview();
    const changed=SESSIONS.map(s=>({session:s,fields:Object.keys(working.shifts[s.id]).filter(key=>JSON.stringify(working.shifts[s.id][key])!==JSON.stringify(saved.shifts[s.id][key])).length}));
    const touched=changed.filter(x=>x.fields>0);
    const preview=el('mt-parif-preview');
    if(!touched.length){el('mt-parif-status').textContent='Aucune modification à enregistrer.';return;}
    const heading=document.createElement('strong');heading.textContent='Avant enregistrement · '+date;
    const detail=document.createElement('p');detail.textContent=touched.map(x=>x.session.label+' : '+x.fields+' rubrique(s) modifiée(s)').join(' · ');
    const note=document.createElement('p');note.textContent='Seul ce brouillon privé sera enregistré sur cet appareil. Aucune validation officielle, aucun envoi aux agents.';
    preview.append(heading,detail,note);
    if(importIssues.length){const warning=document.createElement('p');warning.textContent=`⚠ ${importIssues.length} point(s) issu(s) de la photo restent à vérifier. L’enregistrement du brouillon ne vaut pas validation officielle.`;preview.append(warning);}
    preview.classList.remove('hidden');
    previewSnapshot=JSON.stringify(working);el('mt-parif-save').classList.remove('hidden');
    el('mt-parif-status').textContent='Relis le plan et confirme l’enregistrement du brouillon.';
  };
  el('mt-parif-save').onclick=()=>{
    if(!previewSnapshot||previewSnapshot!==JSON.stringify(working)){dropPreview();el('mt-parif-status').textContent='Le plan a changé depuis la prévisualisation. Prévisualise à nouveau.';return;}
    if((localStorage.getItem(STORE)||'')!==baseRaw){dropPreview();el('mt-parif-status').textContent='Les brouillons ont été modifiés ailleurs. Recharge le plan pour éviter un écrasement.';return;}
    const plans=storedPlans();plans[date]={...clone(working),pointsAVerifier:importIssues,updatedAt:new Date().toISOString(),kind:'brouillon-personnel'};
    try{localStorage.setItem(STORE,JSON.stringify(plans));saved=clone(working);baseRaw=localStorage.getItem(STORE)||'';dropPreview();renderOverview();el('mt-parif-status').textContent='Brouillon PARIF enregistré localement pour le '+date+'. Aucun changement officiel.';setMode('overview');}
    catch{el('mt-parif-status').textContent='Stockage indisponible. Aucune donnée n’a été enregistrée.';}
  };
  function showParif(){
    topNav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===nav));
    main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));
    mode='overview';section.dataset.parifMode='overview';
    el('mt-parif-overview-btn').classList.add('active');el('mt-parif-overview-btn').setAttribute('aria-pressed','true');
    el('mt-parif-edit-btn').classList.remove('active');el('mt-parif-edit-btn').setAttribute('aria-pressed','false');
    render();window.scrollTo(0,0);
  }
  nav.onclick=showParif;

  // Propositions tactiles sous la cellule active. Aucun nom ajouté automatiquement.
  const suggestions=document.createElement('div');suggestions.className='mt-parif-suggestions';suggestions.setAttribute('role','group');suggestions.setAttribute('aria-label','Noms proposés');
  let focusedInput=null;
  const names=()=>{
    const profiles=read('myteam_agent_profiles_v1',{}),deleted=new Set(read('myteam_deleted_agents_v1',[]));
    return Object.keys(profiles&&typeof profiles==='object'&&!Array.isArray(profiles)?profiles:{}).filter(x=>!deleted.has(x));
  };
  function propose(input){
    suggestions.replaceChildren();focusedInput=input;
    const q=normalize(input.value.trim());if(!q||q.length<2)return;
    const results=names().filter(name=>{const n=normalize(name);return n.includes(q)||n.split(/[\s'-]+/).some(part=>part.startsWith(q))}).sort((a,b)=>a.localeCompare(b,'fr')).slice(0,5);
    if(!results.length)return;
    input.after(suggestions);
    for(const name of results){
      const button=document.createElement('button');button.type='button';button.className='mt-parif-suggestion';button.textContent=name;
      button.onclick=()=>{if(focusedInput!==input)return;input.value=/\bG4S$/i.test(name)?name:name+' G4S';input.dispatchEvent(new Event('input',{bubbles:true}));suggestions.replaceChildren();input.focus()};
      suggestions.append(button);
    }
  }
  el('mt-parif-content').addEventListener('input',event=>{if(event.target.matches('input[data-parif-name]'))propose(event.target)});
  el('mt-parif-content').addEventListener('focusin',event=>{if(event.target.matches('input[data-parif-name]'))propose(event.target)});
  el('mt-parif-content').addEventListener('focusout',event=>{if(event.target.matches('input[data-parif-name]'))setTimeout(()=>{if(!suggestions.contains(document.activeElement))suggestions.replaceChildren()},160)});

  // Conserver les saisies non enregistrées si l’utilisateur tente de quitter la page.
  window.addEventListener('beforeunload',event=>{if(!isDirty())return;event.preventDefault();event.returnValue=''});
  getDay();render();
})();
