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
  const parifTopTab=topNav.querySelector('button[data-tab="parif"]');
  if(parifTopTab)topNav.prepend(parifTopTab);
  let current='today',formOpen=false;
  const navItems=[['today','☀️','Aujourd’hui'],['parif','📷','Plan PARIF'],['mt-bureau','▦','Bureau'],['team','👥','Agents'],['planning','🗓️','Mon planning']];
  // Nouvelle organisation demandée : réinitialise une fois l'ancien ordre visuel, sans effacer aucune donnée de travail.
  const NAV_ORDER_KEY='myteam_mobile_nav_order_v2';
  const navDefinitions=[...navItems,['more','☰','Plus']];
  const defaults=navDefinitions.map(item=>item[0]);
  const storedOrder=read(NAV_ORDER_KEY,[]);
  const saved=Array.isArray(storedOrder)?storedOrder.filter(id=>defaults.includes(id)):[];
  const order=[...new Set([...saved,...defaults])];
  const mobileNav=document.createElement('nav');
  mobileNav.id='mt-mobile-nav';mobileNav.setAttribute('aria-label','Navigation principale');
  mobileNav.innerHTML=order.map(id=>{
    const [,icon,label]=navDefinitions.find(item=>item[0]===id);
    return `<button type="button" data-mt-open="${id}" aria-label="${label}" ${id==='more'?'aria-haspopup="dialog" aria-expanded="false"':''}><span class="mt-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`;
  }).join('')+'<div id="mt-nav-reorder-hint" role="status" aria-live="polite"></div>';
  document.body.append(mobileNav);
  const shade=document.createElement('div');shade.id='mt-more-shade';shade.hidden=true;
  const more=document.createElement('div');more.id='mt-more-panel';more.hidden=true;
  more.setAttribute('role','dialog');more.setAttribute('aria-modal','true');more.setAttribute('aria-label','Autres fonctions');
  more.innerHTML='<button type="button" id="mt-more-close" aria-label="Fermer le menu">✕ Fermer</button><h2>Autres fonctions</h2><div id="mt-more-links"></div>';
  document.body.append(shade,more);
  const $=id=>document.getElementById(id);

  function closeMore(){shade.hidden=true;more.hidden=true;mobileNav.querySelector('[data-mt-open=more]').setAttribute('aria-expanded','false')}
  function openMore(){
    // Priorité opérationnelle dans « Plus » ; seules les rubriques présentes sont affichées.
    const primary=new Set(navItems.map(x=>x[0]));
    const available=Array.from(topNav.querySelectorAll('button[data-tab]'))
      .filter(b=>!primary.has(b.dataset.tab)&&b.dataset.deskSecondary!=='true');
    const groups=[
      ['Plannings et exploitation', ['planning-issues','planning-errors','prestation','composition','leave']],
      ['Actions et encadrement', ['visits','consignes','cde-memo','mt-management-workspace']],
      ['Mes outils personnels', ['hours','salary']],
      ['Historique et sécurité', ['history','secure-backup']]
    ];
    const labels={
      'planning-issues':'⚠️ Signalements des agents',
      'planning-errors':'📅 Tableau des erreurs',
      'mt-management-workspace':'🤝 Management et entretiens',
      'cde-memo':'📌 Mémo CDE'
    };
    const host=$('mt-more-links');host.replaceChildren();
    const used=new Set();
    const addGroup=(heading,buttons)=>{
      if(!buttons.length)return;
      const title=document.createElement('h3');
      title.textContent=heading;
      title.style.cssText='grid-column:1/-1;margin:11px 0 1px;font-size:14px;color:#f0c9a4';
      host.append(title);
      buttons.forEach(original=>{
        const button=document.createElement('button');
        button.type='button';
        button.dataset.mtOther=original.dataset.tab;
        button.textContent=labels[original.dataset.tab]||original.textContent.trim();
        host.append(button);used.add(original.dataset.tab);
      });
    };
    groups.forEach(([heading,ids])=>addGroup(heading,ids
      .map(id=>available.find(b=>b.dataset.tab===id)).filter(Boolean)));
    addGroup('Autres rubriques',available.filter(b=>!used.has(b.dataset.tab)));
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
  let drag=null,reorderMessageTimer=null,suppressNavClickUntil=0;
  const navButtons=()=>Array.from(mobileNav.querySelectorAll('button[data-mt-open]'));
  const reorderHint=mobileNav.querySelector('#mt-nav-reorder-hint');
  const showReorderMessage=(message)=>{
    reorderHint.textContent=message;mobileNav.classList.add('mt-reorder-saved');
    clearTimeout(reorderMessageTimer);
    reorderMessageTimer=setTimeout(()=>mobileNav.classList.remove('mt-reorder-saved'),2200);
  };
  function saveNavOrder(buttons){
    buttons.forEach(button=>mobileNav.insertBefore(button,reorderHint));
    try{localStorage.setItem(NAV_ORDER_KEY,JSON.stringify(buttons.map(button=>button.dataset.mtOpen)));showReorderMessage('✓ Ordre des boutons enregistré sur ce téléphone');}
    catch{showReorderMessage('Ordre modifié, mais son enregistrement est indisponible');}
  }
  function clearDrag(){
    if(!drag)return;
    clearTimeout(drag.timer);
    drag.button.classList.remove('mt-dragging');drag.button.removeAttribute('aria-grabbed');drag.button.style.transform='';
    navButtons().forEach(button=>button.classList.remove('mt-drop-target'));
    mobileNav.classList.remove('mt-reordering');drag=null;
  }
  function closestDropButton(x,button){
    const candidates=navButtons().filter(item=>item!==button);
    return candidates.reduce((best,item)=>{
      const r=item.getBoundingClientRect(),distance=Math.abs(x-(r.left+r.width/2));
      return !best||distance<best.distance?{button:item,distance}:best;
    },null)?.button||null;
  }
  mobileNav.addEventListener('pointerdown',event=>{
    const button=event.target.closest('button[data-mt-open]');
    if(!button||drag||(event.pointerType==='mouse'&&event.button!==0))return;
    const gesture={button,pointerId:event.pointerId,x:event.clientX,y:event.clientY,active:false,target:null,timer:null};
    drag=gesture;
    gesture.timer=setTimeout(()=>{
      if(drag!==gesture)return;
      gesture.active=true;button.classList.add('mt-dragging');button.setAttribute('aria-grabbed','true');
      mobileNav.classList.add('mt-reordering');reorderHint.textContent='↔ Glisse le bouton à sa nouvelle place';
      try{button.setPointerCapture(gesture.pointerId);}catch{}
      if(typeof navigator.vibrate==='function')navigator.vibrate(25);
    },550);
  });
  mobileNav.addEventListener('pointermove',event=>{
    const gesture=drag;if(!gesture||event.pointerId!==gesture.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.active){if(Math.hypot(dx,dy)>12)clearDrag();return;}
    if(event.cancelable)event.preventDefault();
    gesture.button.style.transform=`translate3d(${dx}px,0,0)`;
    gesture.target=Math.abs(dx)>gesture.button.offsetWidth*.38?closestDropButton(event.clientX,gesture.button):null;
    navButtons().forEach(button=>button.classList.toggle('mt-drop-target',button===gesture.target));
  });
  mobileNav.addEventListener('pointerup',event=>{
    const gesture=drag;if(!gesture||event.pointerId!==gesture.pointerId)return;
    if(!gesture.active){clearDrag();return;}
    suppressNavClickUntil=Date.now()+700;
    const target=gesture.target;
    if(target){
      const buttons=navButtons(),from=buttons.indexOf(gesture.button),to=buttons.indexOf(target);
      buttons.splice(from,1);buttons.splice(to,0,gesture.button);
      clearDrag();saveNavOrder(buttons);
    }else{clearDrag();showReorderMessage('Maintiens puis glisse pour déplacer un bouton');}
  });
  mobileNav.addEventListener('pointercancel',clearDrag);
  mobileNav.addEventListener('lostpointercapture',event=>{if(drag?.active&&event.target===drag.button)clearDrag()});
  mobileNav.addEventListener('contextmenu',event=>event.preventDefault());
  mobileNav.addEventListener('click',event=>{
    if(Date.now()<suppressNavClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
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
  activate('today');
})();
