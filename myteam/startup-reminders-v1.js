/* MyTEAM — rappels locaux affichés à l'ouverture.
   Sources : suivi des plannings, congés, visites et rappels manuels.
   Aucune donnée nominative n'est incluse dans ce script public. */
(()=>{
  'use strict';
  if(document.getElementById('mt-reminders-panel'))return;
  const today=document.getElementById('today');
  const nav=document.querySelector('nav.tabs');
  if(!today||!nav)return;
  const KEY='myteam_manual_reminders_v1';
  const read=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x??fallback;}catch{return fallback;}};
  const arr=x=>Array.isArray(x)?x:[];
  const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&!isNaN(Date.parse(s+'T12:00:00'));
  const offset=s=>validDate(s)?Math.round((new Date(s+'T12:00:00').getTime()-new Date(iso(new Date())+'T12:00:00').getTime())/86400000):null;
  const fmt=s=>validDate(s)?s.slice(8,10)+'/'+s.slice(5,7):'date à confirmer';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const complete=s=>['corrigé','réglé','non retenu','sans suite','validated','rejected'].includes(String(s||'').toLowerCase());
  const $=id=>document.getElementById(id);

  const style=document.createElement('style');
  style.id='mt-reminders-style';
  style.textContent=[
    '#mt-reminders-panel{border:1px solid #647e9d;background:#22364e}',
    '#mt-reminders-panel h3{margin:0 0 6px;font-size:19px}',
    '#mt-reminders-panel .mtr-sub{font-size:12px;color:#c8d6e5;line-height:1.5}',
    '.mtr-head{display:flex;align-items:center;justify-content:space-between;gap:9px}',
    '.mtr-counter{padding:6px 10px;background:#405975;border-radius:99px;font-size:12px;font-weight:800}',
    '.mtr-row{display:grid;gap:6px;padding:12px 0;border-top:1px solid #435b74}',
    '.mtr-row:first-child{border-top:0}',
    '.mtr-row.urgent{border-left:4px solid #e8a456;padding-left:10px}',
    '.mtr-row strong{font-size:14px;line-height:1.4}',
    '.mtr-row p{margin:0;font-size:12px;color:#cbd9e8;line-height:1.45}',
    '.mtr-row .mtr-actions{display:flex;gap:8px;flex-wrap:wrap}',
    '.mtr-row button,.mtr-add-toggle{min-height:42px;padding:9px 12px;background:#36597d;color:#fff}',
    '.mtr-row button.mtr-complete{background:#315d4c}',
    '.mtr-add-toggle{background:#b36c32!important;width:100%;margin:8px 0}',
    '#mtr-form{margin:11px 0;padding:12px;background:#17283d;border-radius:12px;border:1px solid #526984;display:grid;gap:9px}',
    '#mtr-form[hidden]{display:none}',
    '#mtr-form label{font-size:12px;font-weight:750;display:grid;gap:5px}',
    '#mtr-form input,#mtr-form select{width:100%;min-height:44px;padding:10px;background:#101d2e;color:#fff;border:1px solid #7189a2;border-radius:10px;font:inherit}',
    '#mtr-form button{background:#bd722e;min-height:44px}',
    '#mtr-modal[hidden]{display:none!important}',
    '#mtr-modal{position:fixed;inset:0;z-index:1000;background:#07101be3;display:grid;place-items:center;padding:16px}',
    '#mtr-dialog{width:min(100%,570px);max-height:85dvh;display:flex;flex-direction:column;background:#1d2b40;color:#fff;border:1px solid #8297af;box-shadow:0 20px 55px #000b;border-radius:17px;overflow:hidden}',
    '#mtr-dialog header{position:static;padding:16px;background:#2b3e56}',
    '#mtr-dialog header h2{margin:0 0 5px;font-size:20px}',
    '#mtr-dialog .mtr-modal-content{overflow-y:auto;padding:8px 16px}',
    '#mtr-dialog footer{display:flex;gap:8px;justify-content:space-between;padding:12px 16px;border-top:1px solid #495d73}',
    '#mtr-dialog footer button{min-height:44px;flex:1}',
    '#mtr-dialog footer .mtr-close{background:#485b71}',
    '#mtr-dialog footer .mtr-see{background:#b46d2d}',
    '@media(max-width:500px){#mtr-dialog{max-height:88dvh}#mtr-dialog footer{flex-direction:column}}'
  ].join('');
  document.head.append(style);

  const panel=document.createElement('div');
  panel.id='mt-reminders-panel';panel.className='card';
  panel.innerHTML=[
    '<div class="mtr-head"><h3>Rappels importants</h3><span id="mtr-count" class="mtr-counter">0</span></div>',
    '<p class="mtr-sub">Échéances de planning : rappel à J−2, J−1 et le jour même. Les statuts doivent être mis à jour dans les fiches. Consultation locale uniquement, sans notification extérieure.</p>',
    '<div id="mtr-list" role="status"></div>',
    '<button type="button" class="mtr-add-toggle" id="mtr-add">+ Ajouter un rappel personnel</button>',
    '<form id="mtr-form" hidden>',
    '<label>À faire <input name="title" required maxlength="120" autocomplete="off" placeholder="Ex. Vérifier la fiche de prestation"></label>',
    '<label>Échéance <input name="date" required type="date"></label>',
    '<label>Priorité <select name="priority"><option value="high">Importante</option><option value="normal">Normale</option></select></label>',
    '<button type="submit">Enregistrer le rappel</button><p id="mtr-form-status" class="mtr-sub" role="status"></p>',
    '</form>'
  ].join('');
  today.querySelector('.mt-hero')?.after(panel);

  const overlay=document.createElement('div');
  overlay.id='mtr-modal';overlay.hidden=true;
  overlay.innerHTML=[
    '<div id="mtr-dialog" role="dialog" aria-modal="true" aria-labelledby="mtr-title" tabindex="-1">',
    '<header><h2 id="mtr-title">Rappels à traiter</h2><div class="mtr-sub" id="mtr-subtitle">Tâches enregistrées dans MyTEAM</div></header>',
    '<div class="mtr-modal-content" id="mtr-modal-list"></div>',
    '<footer><button type="button" class="mtr-close" id="mtr-dismiss">Fermer</button>',
    '<button type="button" class="mtr-see" id="mtr-see">Voir dans Aujourd’hui</button></footer>',
    '</div>'
  ].join('');
  document.body.append(overlay);

  const manual=()=>arr(read(KEY,[])).filter(r=>r&&typeof r==='object'&&r.id&&r.done!==true);
  const saveManual=rows=>{try{localStorage.setItem(KEY,JSON.stringify(rows));return true;}catch{return false;}};
  const item=(id,title,detail,level,tab,selector,popup,manualId)=>({id,title,detail,level,tab,selector,popup,manualId});
  function collect(){
    const rows=[];
    const allPlanning=[
      ...arr(read('myteam_planning_issues_v1',[])).map(r=>({...r,origin:'planning-issues'})),
      ...arr(read('myteam_planning_errors_v1',[])).map(r=>({...r,origin:'planning-errors'})),
      ...arr(read('myteam_planning_followups_v1',[])).map(r=>({...r,origin:'planning-followup-simple'}))
    ];
    const seen=new Set();
    const dated={soon:[],next:[],old:[]};
    let undated=0;
    allPlanning.forEach(r=>{
      if(!r||complete(r.status))return;
      const unique=[norm(r.agent),String(r.date||''),norm(r.post),norm(r.detail||r.issue).slice(0,50)].join('|');
      if(seen.has(unique))return;seen.add(unique);
      const diff=offset(r.date);
      if(diff===null){undated++;return;}
      if(diff>=0&&diff<=2)dated.soon.push(r);
      else if(diff>=3&&diff<=7)dated.next.push(r);
      else if(diff>=-7&&diff<0)dated.old.push(r);
    });
    if(dated.soon.length){
      const earliest=dated.soon.reduce((v,r)=>!v||r.date<v?r.date:v,'');
      const days=offset(earliest);
      rows.push(item('planning-soon','Plannings agents : '+dated.soon.length+' anomalie(s) à vérifier',
        'Prochaine date : '+fmt(earliest)+' · '+(days===0?"aujourd’hui":days===1?'J−1':'J−2')+'. Vérifier la fiche de prestation et les corrections demandées.',
        'urgent','planning-followup-simple',null,true));
    }
    if(dated.old.length)rows.push(item('planning-old','Plannings agents : '+dated.old.length+' suivi(s) en retard',
      'Dates de poste déjà passées ; vérifier la résolution sans conclure automatiquement à une erreur.',
      'urgent','planning-followup-simple',null,true));
    if(dated.next.length)rows.push(item('planning-next','Plannings agents : '+dated.next.length+' date(s) à anticiper',
      'Dans les 3 à 7 prochains jours. Vérifier les réponses avant l’échéance.',
      'normal','planning-followup-simple',null,false));
    if(undated)rows.push(item('planning-undated',undated+' signalement(s) sans date confirmée',
      'Compléter les dates des signalements pour activer le rappel J−2/J−1.',
      'normal','planning-followup-simple',null,false));

    const leaves=arr(read('myteam_agent_leave_requests_v1',[]))
      .filter(r=>r&&!r.archived&&!['validated','rejected'].includes(r.gesperStatus));
    const nearLeave=leaves.filter(r=>{const diff=offset(r.from);return diff!==null&&diff>=-2&&diff<=7&&(!validDate(r.to)||offset(r.to)>=0);});
    const criticalLeave=nearLeave.filter(r=>offset(r.from)<=2);
    if(criticalLeave.length)rows.push(item('leave-soon','Congés : '+criticalLeave.length+' demande(s) à vérifier',
      'Début prévu aujourd’hui, dans les deux jours ou tout juste passé. Vérifier l’accord et le statut MyGesper.',
      'urgent','team','#mt-agent-leaves',true));
    const laterLeaves=nearLeave.length-criticalLeave.length;
    if(laterLeaves)rows.push(item('leave-next','Congés : '+laterLeaves+' demande(s) proches',
      'Début prévu dans les 3 à 7 jours ; suivre les validations MyGesper.',
      'normal','leave',null,false));

    const pay=read('myteam_panato_training_pay_case_v1',null);
    if(pay&&typeof pay==='object'&&!['compliant','escalated'].includes(pay.state)){
      const due=offset(pay.dueFrom);
      if(due!==null&&due<=2){
        rows.push(item('pay-check','Contrôle formation / paie à effectuer',
          due<0?'Échéance de contrôle dépassée ; dossier à vérifier.':'Échéance '+fmt(pay.dueFrom)+' · '+(due===0?"aujourd’hui":due===1?'J−1':'J−2')+'.',
          'urgent','mt-bureau','#mt-panato-pay-case',true));
      }
    }

    const date=iso(new Date());
    const shifts=arr(read('myteam_shifts',[])).filter(r=>r&&r.date===date&&['morning','afternoon','night'].includes(r.type));
    if(shifts.length){
      const visits=read('myteam_post_visits_v1',{});
      const visitsToday=arr(visits&&typeof visits==='object'?visits[date]:[]);
      const count=visitsToday.filter(r=>r&&r.done===true&&r.post).length;
      if(count<3)rows.push(item('visits-today','Visites sur poste : '+count+'/3 effectuées',
        (3-count)+' visite(s) à réaliser durant la journée travaillée, si la consigne s’applique à cette vacation.',
        'normal','visits',null,true));
    }
    const consignes=read('myteam_consignes_tracking_v1',null);
    if(consignes&&typeof consignes==='object'&&consignes.versions&&consignes.revision){
      const revision=consignes.versions[consignes.revision]||{};
      const profiles=read('myteam_agent_profiles_v1',{});
      const excluded=new Set(arr(read('myteam_deleted_agents_v1',[])));
      const names=Object.keys(profiles&&typeof profiles==='object'?profiles:{})
        .filter(name=>!excluded.has(name)&&Number(profiles[name]?.team)===4);
      const pending=names.filter(name=>revision[norm(name)]?.status!=='confirmed').length;
      if(pending>0&&names.length)rows.push(item('consignes','Consignes : '+pending+' confirmation(s) à suivre',
        'Ne pas confondre consignes demandées et lecture effectivement confirmée.',
        'normal','today','#mt-ops-consignes-summary',false));
    }

    manual().forEach(r=>{
      const diff=offset(r.date);
      if(diff===null||diff>7)return;
      const lvl=diff<=2||r.priority==='high'?'urgent':'normal';
      const when=diff<0?'En retard depuis '+Math.abs(diff)+' jour(s)':
        diff===0?"Aujourd’hui":'Dans '+diff+' jour(s)';
      rows.push(item('manual-'+r.id,r.title,
        when+' · échéance '+fmt(r.date),'urgent'===lvl?'urgent':'normal',
        'today','#mt-reminders-panel',lvl==='urgent',r.id));
    });
    return rows.sort((a,b)=>(a.level==='urgent'?0:1)-(b.level==='urgent'?0:1));
  }

  function navigate(r){
    hideModal();
    const tab=Array.from(nav.querySelectorAll('button[data-tab]')).find(b=>b.dataset.tab===r.tab);
    if(tab)tab.click();
    if(r.selector)setTimeout(()=>document.querySelector(r.selector)?.scrollIntoView({behavior:'smooth',block:'start'}),140);
  }
  function renderRows(list,items,inModal){
    list.replaceChildren();
    if(!items.length){
      const empty=document.createElement('p');empty.className='mtr-sub';
      empty.textContent=inModal?'Aucun rappel urgent.':'Aucune échéance enregistrée pour les sept prochains jours.';
      list.append(empty);return;
    }
    items.forEach(r=>{
      const box=document.createElement('div');box.className='mtr-row'+(r.level==='urgent'?' urgent':'');
      const heading=document.createElement('strong');heading.textContent=(r.level==='urgent'?'À traiter · ':'À suivre · ')+r.title;
      const p=document.createElement('p');p.textContent=r.detail;
      const actions=document.createElement('div');actions.className='mtr-actions';
      const open=document.createElement('button');open.type='button';open.textContent=r.manualId?'Voir les rappels':'Ouvrir le suivi';open.onclick=()=>navigate(r);
      actions.append(open);
      if(r.manualId&&!inModal){
        const done=document.createElement('button');done.type='button';done.className='mtr-complete';done.textContent='Terminé';
        done.onclick=()=>{
          const current=arr(read(KEY,[]));
          const saved=saveManual(current.map(x=>x.id===r.manualId?{...x,done:true,doneAt:new Date().toISOString()}:x));
          if(saved)refresh();else alert('Enregistrement impossible sur cet appareil.');
        };
        actions.append(done);
      }
      box.append(heading,p,actions);list.append(box);
    });
  }
  function showModal(){
    const items=collect().filter(x=>x.popup);
    if(!items.length)return;
    renderRows($('mtr-modal-list'),items,true);
    $('mtr-subtitle').textContent=items.length+' point(s) à traiter · informations issues des données locales, à vérifier.';
    overlay.hidden=false;document.body.style.overflow='hidden';$('mtr-dismiss').focus();
  }
  function hideModal(){overlay.hidden=true;document.body.style.overflow='';}
  function refresh(){
    const items=collect();
    $('mtr-count').textContent=String(items.filter(x=>x.level==='urgent').length);
    renderRows($('mtr-list'),items,false);
  }

  $('mtr-add').onclick=()=>{
    const form=$('mtr-form');form.hidden=!form.hidden;
    if(!form.hidden){form.elements.date.value=iso(new Date());form.elements.title.focus();}
  };
  $('mtr-form').onsubmit=e=>{
    e.preventDefault();const f=e.currentTarget;
    const title=String(f.elements.title.value||'').trim().slice(0,120);
    const date=String(f.elements.date.value||'');
    if(!title||!validDate(date))return;
    const current=arr(read(KEY,[]));
    const record={id:'rem-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),title,date,
      priority:f.elements.priority.value==='normal'?'normal':'high',done:false,createdAt:new Date().toISOString()};
    if(!saveManual([...current,record])){$('mtr-form-status').textContent='Enregistrement impossible.';return;}
    f.reset();f.hidden=true;refresh();
  };
  $('mtr-dismiss').onclick=hideModal;
  $('mtr-see').onclick=()=>{
    hideModal();nav.querySelector('[data-tab="today"]')?.click();
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)hideModal();});
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('storage',e=>{if(e.key&&e.key.startsWith('myteam_'))refresh();});
  document.getElementById('mt-mobile-nav')?.addEventListener('click',refresh);
  nav.querySelectorAll('button[data-tab]').forEach(b=>b.addEventListener('click',refresh));
  window.MyTeamRefreshReminders=refresh;
  refresh();
  showModal();
})();
