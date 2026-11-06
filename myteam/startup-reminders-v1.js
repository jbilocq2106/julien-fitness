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
    '#mt-context-reminders #mt-reminders-panel{margin:0 0 12px}',
    '#mt-reminders-panel .mtr-head h3{font-size:20px;line-height:1.3}',
    '.mtr-pills{display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
    '.mtr-pill{display:inline-flex;align-items:center;border-radius:99px;padding:5px 10px;font-size:12px;font-weight:800;line-height:1.3;border:1px solid #60768c;background:#344e69;color:#f5f8fb}',
    '.mtr-pill.overdue{background:#5c2b30;border-color:#bd6168;color:#fff1f1}',
    '.mtr-pill.today{background:#66451f;border-color:#db9b4b;color:#fff1d9}',
    '.mtr-pill.upcoming{background:#214b65;border-color:#508eaf;color:#e6f7ff}',
    '.mtr-pill.undated{background:#3b4555;border-color:#778599;color:#e9ecf1}',
    '.mtr-row{border:1px solid #526981!important;background:#1b2c41;border-radius:13px;padding:13px!important;margin:9px 0;gap:9px!important}',
    '.mtr-row.urgent{border-left:4px solid #e8a456!important}',
    '.mtr-row strong{font-size:15px!important;line-height:1.4}',
    '.mtr-row p{font-size:13px!important;line-height:1.5!important}',
    '.mtr-row .mtr-actions button{font-size:13px;min-height:42px}',
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
    '<div class="mtr-head"><h3>Rappels par échéance</h3><span id="mtr-count" class="mtr-counter">0</span></div>',
    '<p class="mtr-sub">En retard, aujourd’hui, puis dates à venir. Les éléments sans date figurent à la fin. Données de cet appareil, sans synchronisation automatique avec ChatGPT.</p>',
    '<div id="mtr-list" role="status"></div>',
    '<button type="button" class="mtr-add-toggle" id="mtr-add">+ Ajouter un rappel personnel</button>',
    '<form id="mtr-form" hidden>',
    '<label>À faire <input name="title" required maxlength="120" autocomplete="off" placeholder="Ex. Vérifier la fiche de prestation"></label>',
    '<label>Échéance <input name="date" required type="date"></label>',
    '<label>Priorité <select name="priority"><option value="high">Importante</option><option value="normal">Normale</option></select></label>',
    '<button type="submit">Enregistrer le rappel</button><p id="mtr-form-status" class="mtr-sub" role="status"></p>',
    '</form>'
  ].join('');
  today.prepend(panel); // Le panneau sera transféré dans « Rappels » lorsque la rubrique sera chargée.

  const overlay=document.createElement('div');
  overlay.id='mtr-modal';overlay.hidden=true;
  overlay.innerHTML=[
    '<div id="mtr-dialog" role="dialog" aria-modal="true" aria-labelledby="mtr-title" tabindex="-1">',
    '<header><h2 id="mtr-title">Rappels à traiter</h2><div class="mtr-sub" id="mtr-subtitle">Tâches enregistrées dans MyTEAM</div></header>',
    '<div class="mtr-modal-content" id="mtr-modal-list"></div>',
    '<footer><button type="button" class="mtr-close" id="mtr-dismiss">Fermer</button>',
    '<button type="button" class="mtr-see" id="mtr-see">Voir les rappels</button></footer>',
    '</div>'
  ].join('');
  document.body.append(overlay);

  const manual=()=>arr(read(KEY,[])).filter(r=>r&&typeof r==='object'&&r.id&&r.done!==true);
  const saveManual=rows=>{try{localStorage.setItem(KEY,JSON.stringify(rows));return true;}catch{return false;}};
  const item=(id,title,detail,level,tab,selector,popup,manualId=null,date=null,agentName=null,caseId=null)=>({id,title,detail,level,tab,selector,popup,manualId,date,agentName,caseId});
  function collect(){
    const rows=[];
    // Planning PARIF désactivé : anciens brouillons conservés mais non présentés en alertes.

    const leaves=arr(read('myteam_agent_leave_requests_v1',[]))
      .filter(r=>r&&!r.archived&&!['validated','rejected'].includes(r.gesperStatus));
    leaves.forEach((r,index)=>{
      const date=validDate(r.from)?r.from:null;
      rows.push(item('leave-'+index,'Congé à vérifier · '+String(r.agent||'Agent non précisé'),
        'Validation MyGesper à confirmer'+(validDate(r.to)?' · jusqu’au '+fmt(r.to):'')+'.',
        date&&offset(date)<=2?'urgent':'normal','leave',null,Boolean(date&&offset(date)<=2),null,date));
    });

    const pay=read('myteam_panato_training_pay_case_v1',null);
    if(pay&&typeof pay==='object'&&!['compliant','escalated'].includes(pay.state)){
      const due=offset(pay.dueFrom);
      if(due!==null&&due<=2){
        rows.push(item('pay-check','Contrôle formation / paie à effectuer',
          due<0?'Échéance de contrôle dépassée ; dossier à vérifier.':'Échéance '+fmt(pay.dueFrom)+' · '+(due===0?"aujourd’hui":due===1?'J−1':'J−2')+'.',
          'urgent','mt-bureau','#mt-panato-pay-case',true,null,pay.dueFrom));
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
        'normal','visits',null,true,null,date));
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


    // Rappels et alertes structurés dans les fiches agents : pas de copie nominative dans le code public.
    const casebook=read('myteam_agent_casebook_v1',{});
    if(casebook&&typeof casebook==='object'&&!Array.isArray(casebook)){
      Object.entries(casebook).forEach(([name,entries])=>{
        arr(entries).forEach(r=>{
          if(!r||r.done===true||!['rappel','alarme'].includes(r.type))return;
          const due=validDate(r.due)?r.due:null;
          const label=r.type==='alarme'?'Alerte':'Rappel';
          rows.push(item('agent-case-'+r.id,label+' · '+name,
            String(r.text||'').slice(0,270)+(due?' · échéance '+fmt(due):' · échéance à préciser'),
            due&&offset(due)<=2?'urgent':'normal','equipes',null,Boolean(due&&offset(due)<=2),null,due,name,r.id));
        });
      });
    }
    // Échéances de certification : pastilles à partir d'un mois calendaire avant la fin.
    const agentData=read('myteam_agent_profiles_v1',{});
    if(agentData&&typeof agentData==='object'&&!Array.isArray(agentData)){
      const today=iso(new Date());
      const beforeMonth=(d)=>{
        if(!validDate(d))return null;
        const [y,m,day]=d.split('-').map(Number);
        const x=new Date(y,m-2,Math.min(day,new Date(y,m-1,0).getDate()),12);
        return iso(x);
      };
      Object.entries(agentData).forEach(([name,p])=>{
        if(!p||typeof p!=='object')return;
        const certs=[['RX',p.rxExpiry],['Permis piste',p.permitExpiry],
          ...arr(p.otherCertifications).map(x=>[String(x?.label||'Certification'),x?.expiry])];
        certs.forEach(([label,d],index)=>{
          if(!validDate(d)||today<beforeMonth(d))return;
          rows.push(item('cert-expiry-'+name+'-'+index,'Certification · '+name+' · '+label,
            d<today?'Date de fin dépassée · vérifier la validité officielle.':'Date de fin proche · vérifier le renouvellement.',
            'urgent','equipes',null,true,null,d,name,null));
        });
      });
    }

    manual().forEach(r=>{
      const diff=offset(r.date);
      if(diff===null)return;
      const lvl=diff<=2||r.priority==='high'?'urgent':'normal';
      const when=diff<0?'En retard depuis '+Math.abs(diff)+' jour(s)':
        diff===0?"Aujourd’hui":'Dans '+diff+' jour(s)';
      rows.push(item('manual-'+r.id,r.title,
        when+' · échéance '+fmt(r.date),'urgent'===lvl?'urgent':'normal',
        'context-reminders','#mt-reminders-panel',lvl==='urgent',r.id,r.date));
    });
    return rows.sort((a,b)=>{
      const da=validDate(a.date)?a.date:'9999-12-31';
      const db=validDate(b.date)?b.date:'9999-12-31';
      return da.localeCompare(db)||(a.level==='urgent'?0:1)-(b.level==='urgent'?0:1)||a.title.localeCompare(b.title,'fr');
    });
  }

  function navigate(r){
    hideModal();
    const tab=Array.from(nav.querySelectorAll('button[data-tab]')).find(b=>b.dataset.tab===r.tab);
    if(tab)tab.click();
    if(r.agentName)window.MyTeamAgentCard?.open(r.agentName);
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
      const diff=offset(r.date);
      const pill=document.createElement('span');
      pill.className='mtr-pill '+(diff===null?'undated':diff<0?'overdue':diff===0?'today':'upcoming');
      pill.textContent=diff===null?'◷ Sans date':diff<0?'⚠️ En retard · '+fmt(r.date):diff===0?'🔴 Aujourd’hui · '+fmt(r.date):'📅 '+fmt(r.date)+(diff===1?' · Demain':'');
      const pills=document.createElement('div');pills.className='mtr-pills';pills.append(pill);
      const heading=document.createElement('strong');heading.textContent=r.title;
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
      if(r.caseId&&r.agentName&&!inModal){
        const done=document.createElement('button');done.type='button';done.className='mtr-complete';done.textContent='✓ Fait';
        done.onclick=()=>{
          if(!confirm('Confirmer que ce rappel ou cette alerte a été traité ?'))return;
          const all=read('myteam_agent_casebook_v1',{});
          const entries=arr(all?.[r.agentName]);
          if(!entries.some(x=>x.id===r.caseId))return;
          all[r.agentName]=entries.map(x=>x.id===r.caseId?{...x,done:true,doneAt:new Date().toISOString()}:x);
          try{localStorage.setItem('myteam_agent_casebook_v1',JSON.stringify(all));window.MyTeamAgentCard?.refresh();refresh();}
          catch{alert('Enregistrement impossible.')}
        };
        actions.append(done);
      }
      box.append(pills,heading,p,actions);list.append(box);
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
    $('mtr-count').textContent=String(items.length)+' en attente';
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
    hideModal();nav.querySelector('[data-tab="context-reminders"]')?.click();
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)hideModal();});
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('storage',e=>{if(e.key&&e.key.startsWith('myteam_'))refresh();});
  document.getElementById('mt-mobile-nav')?.addEventListener('click',refresh);
  nav.querySelectorAll('button[data-tab]').forEach(b=>b.addEventListener('click',refresh));
  window.addEventListener('myteam:agent-profile-changed',refresh);
  window.MyTeamRefreshReminders=refresh;
  refresh();
  // Les rappels restent consultatifs : ne pas ouvrir de modale automatique.
})();
