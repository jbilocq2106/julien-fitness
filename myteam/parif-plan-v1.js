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
    <summary>📥 Importer un plan (PDF, JPEG, PNG ou JSON)</summary>
    <p class="mt-parif-sub">Choisis directement une photo, un PDF ou un brouillon JSON. Le fichier reste sur ton appareil : la prévisualisation ne modifie aucun poste.</p>
    <label class="mt-parif-file-label">Choisir le fichier du plan
      <input id="mt-parif-import-file" type="file" accept=".json,.pdf,.jpg,.jpeg,.png,application/json,application/pdf,image/jpeg,image/png">
    </label>
    <p id="mt-parif-import-status" role="status" class="mt-parif-import-status"></p>
    <div id="mt-parif-source-preview" class="mt-parif-source-preview hidden"></div>
    <div id="mt-parif-source-tools" class="mt-parif-source-tools hidden">
      <button id="mt-parif-read-source" type="button">🤖 Analyser et proposer le préremplissage</button>
      <p class="mt-parif-disclaimer">Reconnaissance sur cet appareil : le moteur peut devoir se télécharger. Le fichier n’est pas envoyé par MyTEAM à un service d’analyse. Les noms sont proposés avec leur fiabilité ; aucun poste n’est modifié ni enregistré sans ton contrôle.</p>
      <textarea id="mt-parif-source-text" rows="7" readonly class="hidden" aria-label="Texte relevé sur le document"></textarea>
      <div id="mt-parif-auto-preview" class="mt-parif-auto-preview hidden" aria-label="Propositions de préremplissage"></div>
      <button id="mt-parif-auto-apply" type="button" class="mt-primary hidden">✅ Préremplir le brouillon avec les propositions cochées</button>
      <button id="mt-parif-source-edit" type="button">✏️ Compléter le plan en regardant le document</button>
    </div>
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
  let sourceFile=null,sourceObjectUrl=null,autoResult=null;
  const sourcePreview=el('mt-parif-source-preview'),sourceTools=el('mt-parif-source-tools'),sourceText=el('mt-parif-source-text');
  const autoPreview=el('mt-parif-auto-preview'),autoApply=el('mt-parif-auto-apply');
  function clearSource(){
    if(sourceObjectUrl){URL.revokeObjectURL(sourceObjectUrl);sourceObjectUrl=null;}
    autoResult=null;autoPreview.replaceChildren();autoPreview.classList.add('hidden');autoApply.classList.add('hidden');
    sourceFile=null;sourcePreview.replaceChildren();sourcePreview.classList.add('hidden');
    sourceTools.classList.add('hidden');sourceText.value='';sourceText.classList.add('hidden');
  }
  function prepareSource(file,kind){
    clearSource();sourceFile=file;sourceObjectUrl=URL.createObjectURL(file);
    const title=document.createElement('strong');title.textContent=`Document sélectionné : ${file.name}`;sourcePreview.append(title);
    if(kind==='image'){
      const img=document.createElement('img');img.src=sourceObjectUrl;img.alt='Photo du plan PARIF à contrôler';img.className='mt-parif-source-image';sourcePreview.append(img);
    }else{
      const pdf=document.createElement('object');pdf.type='application/pdf';pdf.data=sourceObjectUrl;pdf.className='mt-parif-source-pdf';pdf.setAttribute('aria-label','Aperçu du PDF PARIF');
      pdf.textContent='Le PDF ne peut pas être affiché ici.';sourcePreview.append(pdf);
      const link=document.createElement('a');link.href=sourceObjectUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Ouvrir le PDF si l’aperçu ne s’affiche pas';sourcePreview.append(link);
    }
    sourcePreview.classList.remove('hidden');sourceTools.classList.remove('hidden');
    el('mt-parif-import-status').textContent=`${kind==='pdf'?'PDF':'Image'} chargé(e) en aperçu privé · aucune affectation créée. Tu peux examiner le document et compléter le brouillon.`;
  }
  const loadLibrary=(globalName,url)=>new Promise((resolve,reject)=>{
    if(window[globalName])return resolve(window[globalName]);
    const script=document.createElement('script');script.src=url;script.async=true;
    script.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error('Module non chargé'));
    script.onerror=()=>reject(new Error('Module indisponible'));document.head.append(script);
  });
  async function pdfLibrary(){
    const lib=await loadLibrary('pdfjsLib','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return lib;
  }
  async function ocrCanvasOrImage(image){
    const api=await loadLibrary('Tesseract','https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    const worker=await api.createWorker('eng',1,{logger:message=>{
      if(message?.status==='recognizing text')el('mt-parif-import-status').textContent=`Reconnaissance locale en cours : ${Math.round((message.progress||0)*100)} %`;
    }});
    try{const {data}=await worker.recognize(image);return String(data?.text||'');}
    finally{await worker.terminate();}
  }
  async function readPdf(file){
    const lib=await pdfLibrary(),pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    try{
      let text='',isScanned=true;
      for(let index=1;index<=Math.min(4,pdf.numPages);index++){
        const page=await pdf.getPage(index),layer=await page.getTextContent();
        const pageText=(layer.items||[]).map(item=>String(item.str||'')).filter(Boolean).join(' ');
        text+=`\n[Page ${index}]\n${pageText}\n`;
        if(pageText.trim().length>80)isScanned=false;
      }
      if(!isScanned)return text.trim();
      // Sur un PDF scanné, le texte du document est une image : lire la première page en local.
      const page=await pdf.getPage(1),viewport=page.getViewport({scale:1.8});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      return await ocrCanvasOrImage(canvas);
    }finally{await pdf.destroy();}
  }
  async function firstPdfPage(file){
    const lib=await pdfLibrary(),pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    try{
      const page=await pdf.getPage(1),viewport=page.getViewport({scale:2});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      return canvas;
    }finally{await pdf.destroy();}
  }
  function showAutoProposals(result){
    autoPreview.replaceChildren();autoResult=result;
    const title=document.createElement('strong');title.textContent='🤖 Préremplissage proposé — à vérifier';autoPreview.append(title);
    const allowed=result.items.filter(x=>x.allowed),selected=allowed.filter(x=>x.checked);
    const uncertain=allowed.length-selected.length,unmapped=result.items.length-allowed.length;
    const summary=document.createElement('p');
    summary.textContent=`${selected.length} lecture(s) fiables cochée(s) · ${uncertain} à contrôler · ${unmapped} case(s) non compatibles avec le plan actuel.`;
    autoPreview.append(summary);
    const dateNote=document.createElement('p');
    dateNote.textContent=result.dateText?`Date visible sur le document : « ${result.dateText} ». Vérifie-la avant de remplir le brouillon du ${date}.`:`Date de la photo non reconnue. Vérifie qu’elle correspond au ${date}.`;
    autoPreview.append(dateNote);
    const details=document.createElement('details'),heading=document.createElement('summary');
    heading.textContent=`Voir et cocher les ${result.items.length} propositions`;
    details.append(heading);
    const rows=document.createElement('div');rows.className='mt-parif-auto-list';
    result.items.forEach((proposal,index)=>{
      const row=document.createElement('label');row.className='mt-parif-auto-row'+(!proposal.allowed?' is-unmapped':!proposal.checked?' is-uncertain':'');
      const check=document.createElement('input');check.type='checkbox';check.dataset.parifAutoIndex=String(index);
      check.checked=proposal.checked;check.disabled=!proposal.allowed;
      const copy=document.createElement('span'),name=document.createElement('b'),confidence=document.createElement('small');
      name.textContent=`${proposal.label} → ${proposal.value}`;
      confidence.textContent=!proposal.allowed?'Poste ou place absent(e) du plan actuel : non transférable':proposal.checked?`Lecture estimée ${proposal.confidence}% · relis avant d’enregistrer`:`⚠ Lecture incertaine (${proposal.confidence}%) · coche seulement si le nom est exact`;
      copy.append(name,confidence);row.append(check,copy);rows.append(row);
    });
    details.append(rows);autoPreview.append(details);autoPreview.classList.remove('hidden');
    autoApply.classList.toggle('hidden',allowed.length===0);
  }
  function dateFromPhotoCouldMatch(raw,selected){
    const m=String(raw||'').match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/);
    if(!m)return false;
    const a=String(m[1]).padStart(2,'0'),b=String(m[2]).padStart(2,'0');
    // 08/11 peut signifier 8 novembre ou 11 août : confirmation manuelle obligatoire.
    if(a!==b&&Number(a)<=12&&Number(b)<=12)return false;
    return `${m[3]}-${b}-${a}`===selected||`${m[3]}-${a}-${b}`===selected;
  }
  autoApply.onclick=()=>{
    if(!autoResult)return;
    const chosen=Array.from(autoPreview.querySelectorAll('input[data-parif-auto-index]:checked'))
      .map(input=>autoResult.items[Number(input.dataset.parifAutoIndex)]).filter(item=>item?.allowed);
    if(!chosen.length){el('mt-parif-import-status').textContent='Coche les propositions que tu as relues pour préremplir le brouillon.';return;}
    if(!dateFromPhotoCouldMatch(autoResult.dateText,date)){
      if(!confirm(`⚠ Date à vérifier : le document indique « ${autoResult.dateText||'inconnue'} » et le brouillon est daté du ${date}. Es-tu certain de vouloir préparer ces affectations pour cette date ?`))return;
    }
    const conflicts=chosen.filter(item=>{
      const shift=working.shifts[item.shift],parts=item.path.split('.');
      const previous=parts[0]==='posts'?shift.posts[parts[1]]?.[Number(parts[2])]:parts[0]==='patrol'?shift.patrol[Number(parts[1])]:shift.supervisor;
      return previous&&previous!==item.value;
    });
    if(conflicts.length&&!confirm(`${conflicts.length} case(s) du brouillon contiennent déjà une valeur différente. Remplacer uniquement ces cases par les propositions cochées ?`))return;
    let applied=0;
    for(const item of chosen){
      const shift=working.shifts[item.shift],parts=item.path.split('.');
      if(parts[0]==='posts'&&Array.isArray(shift.posts[parts[1]])&&Number(parts[2])<shift.posts[parts[1]].length){shift.posts[parts[1]][Number(parts[2])]=item.value;applied++;}
      else if(parts[0]==='patrol'&&Number(parts[1])<shift.patrol.length){shift.patrol[Number(parts[1])]=item.value;applied++;}
      else if(parts[0]==='supervisor'){shift.supervisor=item.value;applied++;}
    }
    const skipped=autoResult.items.filter(item=>!chosen.includes(item)&&item.allowed);
    importIssues=[...autoResult.issues,...skipped.map(item=>`À relire : ${item.label} — ${item.value} (lecture ${item.confidence} %).`),
      !dateFromPhotoCouldMatch(autoResult.dateText,date)?`Date du document à contrôler : ${autoResult.dateText||'non lue'}.`:''
    ].filter(Boolean).slice(0,30);
    showIssues();dropPreview();render();setMode('overview');
    el('mt-parif-import-status').textContent=`${applied} case(s) préremplie(s) dans la prévisualisation. Rien n’est enregistré ni validé officiellement.`;
    el('mt-parif-status').textContent='Relis les affectations, notamment les noms douteux, puis clique sur « Vérifier et enregistrer le brouillon ».';
  };
  let readingSource=false;
  el('mt-parif-read-source').onclick=async()=>{
    if(readingSource||!sourceFile)return;
    const status=el('mt-parif-import-status'),button=el('mt-parif-read-source'),file=sourceFile;
    readingSource=true;button.disabled=true;status.textContent='Analyse locale du document… cela peut prendre un moment.';
    try{
      let result=null;
      try{
        const reader=await loadLibrary('MyTeamParifPhotoReader','./parif-photo-reader-v1.js?v=20261018-2');
        const api=await loadLibrary('Tesseract','https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
        const image=file.type==='application/pdf'||/\.pdf$/i.test(file.name)?await firstPdfPage(file):file;
        result=await reader.scan(image,api,message=>{if(sourceFile===file)status.textContent=message;});
      }catch(error){console.warn('Reconnaissance structurée indisponible :',error);}
      if(sourceFile!==file)return;
      if(result?.supported){
        showAutoProposals(result);
        sourceText.value=result.items.map(item=>`${item.label} : ${item.value} (${item.confidence} %)`).join('\n');
        sourceText.classList.remove('hidden');
        status.textContent=`${result.items.length} nom(s) proposé(s) par la lecture locale. Vérifie les cases cochées et la date, puis applique au brouillon. Aucune sauvegarde automatique.`;
      }else{
        const text=file.type==='application/pdf'||/\.pdf$/i.test(file.name)?await readPdf(file):await ocrCanvasOrImage(file);
        if(sourceFile!==file)return;
        sourceText.value=text.trim()||'Aucun texte lisible reconnu.';sourceText.classList.remove('hidden');
        status.textContent='Cette présentation ne correspond pas assez au modèle PARIF appris. Le texte reste disponible pour une saisie guidée, sans affectation automatique.';
      }
    }catch(error){
      if(sourceFile===file)status.textContent=`Lecture automatique indisponible (${error.message}). Le fichier reste visible pour la saisie manuelle.`;
    }finally{readingSource=false;button.disabled=false;if(sourceFile&&sourceFile!==file)button.click();}
  };
  el('mt-parif-source-edit').onclick=()=>setMode('edit');
  window.addEventListener('pagehide',()=>{if(sourceObjectUrl)URL.revokeObjectURL(sourceObjectUrl)});
  importInput.onchange=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    const status=el('mt-parif-import-status');
    importInput.value='';
    const lower=file.name.toLowerCase();
    const kind=/\.(jpg|jpeg|png)$/.test(lower)||['image/jpeg','image/png'].includes(file.type)?'image':/\.pdf$/.test(lower)||file.type==='application/pdf'?'pdf':/\.json$/.test(lower)||file.type==='application/json'?'json':null;
    if(!kind){status.textContent='Format non pris en charge. Choisis PDF, JPEG, PNG ou JSON.';return;}
    if(kind!=='json'){
      if(file.size>(kind==='pdf'?20000000:15000000)){status.textContent='Document trop volumineux (PDF : 20 Mo ; image : 15 Mo maximum).';return;}
      prepareSource(file,kind);
      // Un premier passage est proposé immédiatement, sans toucher au brouillon.
      el('mt-parif-read-source').click();return;
    }
    if(file.size>1000000){status.textContent='Brouillon JSON trop volumineux : maximum 1 Mo.';return;}
    if(isDirty()&&!confirm('Les modifications non enregistrées seront remplacées par les données du fichier. Continuer ?'))return;
    let data;
    try{data=JSON.parse(await file.text());}
    catch{status.textContent='Le fichier choisi ne contient pas un plan JSON lisible.';return;}
    if(!data||data.myteamFormat!=='parif-draft-v1'||!validDate(data.date)||!data.shifts||typeof data.shifts!=='object'||SESSIONS.some(s=>!data.shifts[s.id]||typeof data.shifts[s.id]!=='object')){
      status.textContent='Ce fichier ne correspond pas au format Plan PARIF MyTEAM.';return;
    }
    if(data.date!==date&&storedPlans()[data.date]&&!confirm(`Un brouillon existe déjà pour le ${data.date}. Préparer son remplacement pour prévisualisation ?`))return;
    clearSource();
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
