(()=>{
  'use strict';
  if(document.getElementById('mt-mobile-nav'))return;
  const main=document.querySelector('main'),topNav=document.querySelector('nav.tabs');
  if(!main||!topNav)return;
  const REPLACEMENTS_KEY='myteam_replacements_drafts_v1';
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const read=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x??fallback}catch{return fallback}};
  const isoDay=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const dayLabel=d=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
  const replacements=()=>{const x=read(REPLACEMENTS_KEY,[]);return Array.isArray(x)?x.filter(r=>r&&typeof r==='object'):[]};

  const todaySection=document.createElement('section');
  todaySection.id='today';todaySection.className='hidden';
  todaySection.innerHTML=`
    <div class="card mt-hero"><div class="mt-eyebrow">Mon tableau de bord</div><h2>☀️ Aujourd’hui</h2>
      <p class="mt-today-date" id="mt-date"></p><span class="mt-status-chip warn" id="mt-summary">Chargement des informations locales…</span></div>
    <div class="mt-columns"><div>
      <div class="card"><h3>🕒 Mon poste du jour</h3><div id="mt-my-shifts" role="status"></div>
        <p class="mt-section-caption">Issu de ton planning personnel enregistré sur cet appareil.</p></div>
      <div class="card"><h3>👥 Absences à vérifier</h3><div id="mt-absences"></div>
        <p class="mt-section-caption">Un congé demandé n’est pas forcément accordé. Seules les absences maladie signalées dans les fiches locales sont affichées, sans motif médical.</p></div>
    </div><div>
      <div class="card"><h3>🔄 Remplacements</h3><div id="mt-replacements" class="mt-replace-list"></div>
        <button type="button" id="mt-add-replacement" class="mt-primary">+ Préparer un remplacement</button>
        <form id="mt-replacement-form" class="mt-replace-form hidden">
          <label>Date <input name="date" type="date" required></label>
          <label>Agent remplacé <input name="absent" maxlength="100" required autocomplete="off" placeholder="Nom ou identifiant"></label>
          <label>Agent remplaçant <input name="replacement" maxlength="100" required autocomplete="off" placeholder="Nom ou identifiant"></label>
          <label>Poste / vacation <input name="post" maxlength="100" required placeholder="Ex. E84 matin"></label>
          <div class="actions"><button class="mt-primary" type="submit">Enregistrer le brouillon</button><button type="button" id="mt-cancel-replacement">Annuler</button></div>
        </form>
        <p id="mt-replacement-status" role="status" class="mt-note"></p>
        <p class="mt-section-caption">Brouillons privés : aucune modification du planning officiel ni notification aux agents.</p></div>
      <div class="card"><h3>🚦 Alertes prioritaires</h3><div id="mt-alerts" role="status"></div>
        <p class="mt-section-caption">Les alertes indiquent leur source et ce qui reste à vérifier. L’absence d’alerte n’équivaut pas à une prestation validée.</p></div>
    </div></div>`;
  main.prepend(todaySection);

  const todayTab=document.createElement('button');
  todayTab.type='button';todayTab.dataset.tab='today';todayTab.textContent='☀️ Aujourd’hui';topNav.prepend(todayTab);
  let current='today',formOpen=false;
  const navItems=[['today','☀️','Aujourd’hui'],['planning','🗓️','Planning'],['team','👥','Agents'],['parif','📋','Postes']];
  const mobileNav=document.createElement('nav');
  mobileNav.id='mt-mobile-nav';mobileNav.setAttribute('aria-label','Navigation principale');
  mobileNav.innerHTML=navItems.map(([id,icon,label])=>`<button type="button" data-mt-open="${id}" aria-label="${label}"><span class="mt-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')+
    '<button type="button" data-mt-open="more" aria-haspopup="dialog" aria-expanded="false"><span class="mt-icon" aria-hidden="true">☰</span><span>Plus</span></button>';
  document.body.append(mobileNav);
  const shade=document.createElement('div');shade.id='mt-more-shade';shade.hidden=true;
  const more=document.createElement('div');more.id='mt-more-panel';more.hidden=true;
  more.setAttribute('role','dialog');more.setAttribute('aria-modal','true');more.setAttribute('aria-label','Autres fonctions');
  more.innerHTML='<button type="button" id="mt-more-close" aria-label="Fermer le menu">✕ Fermer</button><h2>Autres fonctions</h2><div id="mt-more-links"></div>';
  document.body.append(shade,more);
  const $=id=>document.getElementById(id);

  function closeMore(){shade.hidden=true;more.hidden=true;mobileNav.querySelector('[data-mt-open=more]').setAttribute('aria-expanded','false')}
  function openMore(){
    const primary=new Set(navItems.map(x=>x[0]));
    $('mt-more-links').innerHTML=Array.from(topNav.querySelectorAll('button[data-tab]'))
      .filter(b=>!primary.has(b.dataset.tab))
      .map(b=>`<button type="button" data-mt-other="${esc(b.dataset.tab)}">${esc(b.textContent.trim())}</button>`).join('');
    shade.hidden=false;more.hidden=false;
    mobileNav.querySelector('[data-mt-open=more]').setAttribute('aria-expanded','true');
    $('mt-more-close').focus();
  }
  const markActive=id=>{
    current=id;
    mobileNav.querySelectorAll('[data-mt-open]').forEach(b=>{
      if(b.dataset.mtOpen===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
  };
  function activate(id){
    closeMore();
    const btn=Array.from(topNav.querySelectorAll('button[data-tab]')).find(b=>b.dataset.tab===id);
    if(!btn)return;
    if(id==='today'){
      topNav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===todayTab));
      main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==todaySection));
      renderToday();
    }else btn.click();
    markActive(id);window.scrollTo(0,0);
  }
  todayTab.onclick=()=>activate('today');
  topNav.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-tab]');if(!btn)return;
    if(btn===todayTab)return;
    markActive(btn.dataset.tab);
    closeMore();
  });
  mobileNav.addEventListener('click',event=>{
    const b=event.target.closest('[data-mt-open]');if(!b)return;
    b.dataset.mtOpen==='more'?openMore():activate(b.dataset.mtOpen);
  });
  more.addEventListener('click',event=>{
    const b=event.target.closest('[data-mt-other]');if(b)activate(b.dataset.mtOther);
  });
  $('mt-more-close').onclick=closeMore;shade.onclick=closeMore;
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!more.hidden)closeMore()});

  function dailyAnalyses(dateKey){
    const stored=read('myteam.prestationAnalyses.v1',[]);
    if(!Array.isArray(stored))return [];
    return stored.filter(a=>{
      if(!a||String(a.id||'').includes('demo'))return false;
      const raw=String(a.date||'');
      const m=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return (m?`${m[3]}-${m[2]}-${m[1]}`:raw)===dateKey;
    });
  }
  function renderToday(){
    const now=new Date(),date=isoDay(now);
    $('mt-date').textContent=dayLabel(now);
    const allShifts=read('myteam_shifts',[]),shifts=Array.isArray(allShifts)?allShifts.filter(s=>s?.date===date):[];
    $('mt-my-shifts').innerHTML=shifts.length?shifts.map(s=>`<div class="mt-line"><strong>${esc(s.start||'?')} – ${esc(s.end||'?')}</strong><small>${esc(s.post||'Poste non renseigné')} · ${esc(s.type||'Vacation')}</small></div>`).join(''):
      '<p class="mt-empty">Aucune vacation indiquée aujourd’hui. Repos possible ou planning incomplet.</p>';

    const allLeaves=read('myteam_leave_v1',[]),leaves=Array.isArray(allLeaves)?allLeaves.filter(l=>l?.from<=date&&l?.to>=date):[];
    const profiles=read('myteam_agent_profiles_v1',{});
    const sick=profiles&&typeof profiles==='object'&&!Array.isArray(profiles)?Object.entries(profiles).filter(([,p])=>p?.sickActive===true&&(!p.sickEnd||p.sickEnd>=date)).map(([name])=>name):[];
    const leaveNames=[...new Set(leaves.map(l=>String(l.agent||'').trim()).filter(Boolean))];
    $('mt-absences').innerHTML=`<div class="mt-line"><strong>${sick.length} absence${sick.length>1?'s':''} signalée${sick.length>1?'s':''}</strong>
      <small>${sick.length?esc(sick.join(' · ')):'Aucune absence maladie active renseignée dans les fiches locales.'}</small></div>
      <div class="mt-line"><strong>${leaveNames.length} demande${leaveNames.length>1?'s':''} de congé en cours</strong>
      <small>${leaveNames.length?esc(leaveNames.join(' · ')):'Aucune demande enregistrée couvrant aujourd’hui.'}</small></div>`;

    const allReplacements=replacements(),dayReplacements=allReplacements.filter(r=>r.date===date);
    $('mt-replacements').innerHTML=dayReplacements.length?dayReplacements.map(r=>`<div class="mt-replace-item">
      <strong>${esc(r.replacement)} → ${esc(r.post)}</strong><small>À la place de ${esc(r.absent)} · Brouillon non validé</small>
      <button type="button" data-mt-delete="${esc(r.id)}">Supprimer le brouillon</button></div>`).join(''):
      '<p class="mt-empty">Aucun remplacement préparé pour aujourd’hui.</p>';
    $('mt-replacement-form').classList.toggle('hidden',!formOpen);
    $('mt-add-replacement').classList.toggle('hidden',formOpen);

    const alerts=[];
    if(leaveNames.length>4)alerts.push({level:'warn',title:`${leaveNames.length} demandes de congé simultanées`,detail:'Le seuil indicatif de 4 est dépassé. Vérifier les validations et l’effectif disponible.'});
    for(const s of shifts){if(!s.post)alerts.push({level:'warn',title:'Poste non renseigné dans ton planning',detail:`Vacation ${s.start||'?'}–${s.end||'?'} : compléter l’information avant de contrôler la couverture.`});}
    const analyses=dailyAnalyses(date);
    const rows=analyses.flatMap(a=>Array.isArray(a.rows)?a.rows:[]);
    const bad=rows.filter(r=>r?.manualStatus==='bad'||(!r?.manualStatus&&r?.status==='bad'));
    const warn=rows.filter(r=>r?.manualStatus==='warn'||(!r?.manualStatus&&r?.status==='warn'));
    if(bad.length)alerts.push({level:'bad',title:`${bad.length} anomalie${bad.length>1?'s':''} sur les analyses du jour`,detail:'Résultat enregistré, à vérifier dans Fiche de prestation. Une correction peut avoir été apportée depuis.'});
    if(warn.length)alerts.push({level:'warn',title:`${warn.length} point${warn.length>1?'s':''} à vérifier sur les analyses du jour`,detail:'Qualifications ou informations manquantes : ouvre la fiche pour consulter les explications.'});
    $('mt-alerts').innerHTML=alerts.length?alerts.map(a=>`<div class="mt-alert ${a.level}"><strong>${a.level==='bad'?'🔴':'🟠'} ${esc(a.title)}</strong><p>${esc(a.detail)}</p></div>`).join(''):
      '<p class="mt-empty">Aucune alerte déduite des données locales disponibles aujourd’hui.</p>';
    $('mt-alerts').innerHTML+='<div class="mt-alert"><strong>⚪ Couverture des postes non vérifiée</strong><p>Les affectations nominatives du jour et les qualifications confirmées ne sont pas encore reliées à un contrôle complet. Impossible de conclure que tous les postes sont couverts.</p></div>';
    $('mt-summary').textContent=alerts.length?`${alerts.length} alerte${alerts.length>1?'s':''} à examiner`:'Données du jour à compléter';
    $('mt-summary').classList.toggle('warn',true);
  }

  $('mt-add-replacement').onclick=()=>{formOpen=true;renderToday();$('mt-replacement-form').elements.date.value=isoDay(new Date());$('mt-replacement-form').elements.absent.focus()};
  $('mt-cancel-replacement').onclick=()=>{formOpen=false;renderToday()};
  $('mt-replacement-form').onsubmit=event=>{
    event.preventDefault();const data=new FormData(event.currentTarget);
    const row={id:String(Date.now())+Math.random().toString(36).slice(2,7),date:String(data.get('date')||''),absent:String(data.get('absent')||'').trim().slice(0,100),replacement:String(data.get('replacement')||'').trim().slice(0,100),post:String(data.get('post')||'').trim().slice(0,100)};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!row.absent||!row.replacement||!row.post)return;
    try{localStorage.setItem(REPLACEMENTS_KEY,JSON.stringify([...replacements(),row]));formOpen=false;event.currentTarget.reset();renderToday();$('mt-replacement-status').textContent='Brouillon enregistré sur cet appareil. Aucune affectation officielle modifiée.'}
    catch{$('mt-replacement-status').textContent='Enregistrement impossible. Vérifie l’espace de stockage.'}
  };
  $('mt-replacements').addEventListener('click',event=>{
    const btn=event.target.closest('[data-mt-delete]');if(!btn)return;
    if(!confirm('Supprimer ce brouillon de remplacement ?'))return;
    try{localStorage.setItem(REPLACEMENTS_KEY,JSON.stringify(replacements().filter(r=>r.id!==btn.dataset.mtDelete)));renderToday()}
    catch{$('mt-replacement-status').textContent='Suppression impossible.'}
  });
  window.addEventListener('focus',()=>{if(current==='today')renderToday()});
  window.addEventListener('storage',event=>{if(event.key?.startsWith('myteam')&&current==='today')renderToday()});
  activate(document.querySelector('nav.tabs button[data-tab="parif"]')?'parif':'today');
})();
