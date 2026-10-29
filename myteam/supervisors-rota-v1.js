/* MyTEAM — agenda des superviseurs, cycle 2/2/3.
   Configuration personnelle en localStorage, les noms ne sont pas publies dans le code.
   Semaine de reference : 26/10/2026; jeudi 29 = bloc mercredi-jeudi. */
(()=>{
  'use strict';
  if(document.getElementById('supervisors'))return;
  const main=document.querySelector('main'),nav=document.querySelector('nav.tabs');
  if(!main||!nav)return;
  const KEY='myteam_supervisors_rota_v1';
  const REF_MONDAY=Date.UTC(2026,9,26);
  const REF_DATE='2026-10-29';
  const SHIFTS=['Matin','Après-midi','Nuit','Repos'];
  const CODES=['M','A','N','R'];
  const EMPTY=[{name:'',phase:0},{name:'',phase:1},{name:'',phase:2},{name:'',phase:3}];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const parseDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?new Date(String(s)+'T12:00:00Z'):null;
  const iso=d=>[d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,'0'),String(d.getUTCDate()).padStart(2,'0')].join('-');
  const todayISO=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-';};
  const plusDays=(date,n)=>{const d=new Date(date.getTime());d.setUTCDate(d.getUTCDate()+n);return d;};
  const mondayOf=date=>plusDays(date,-((date.getUTCDay()+6)%7));
  const fmt=date=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(date);
  const fmtMonth=date=>new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'}).format(date);
  const normRow=(r,i)=>({name:String(r?.name||'').trim().slice(0,45),phase:Number.isInteger(Number(r?.phase))&&Number(r.phase)>=0&&Number(r.phase)<=3?Number(r.phase):i});
  const validRows=rows=>Array.isArray(rows)&&rows.length===4?rows.map(normRow):EMPTY.map(x=>({...x}));
  let profiles=(()=>{try{return validRows(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return validRows(null);}})();
  const hasNames=()=>profiles.every(x=>x.name.length>0);
  let warning='';
  const hashPrefix='#mt-supervisors=';
  if(location.hash.startsWith(hashPrefix)){
    try{
      const parts=decodeURIComponent(location.hash.slice(hashPrefix.length)).split(',');
      if(parts.length!==4)throw new Error('quatre superviseurs requis');
      const incoming=parts.map(part=>{
        const end=part.lastIndexOf(':');
        if(end<1)throw new Error('format invalide');
        const name=part.slice(0,end).trim(),phase=Number(part.slice(end+1));
        if(!name||name.length>45||!Number.isInteger(phase)||phase<0||phase>3)throw new Error('valeur invalide');
        return {name,phase};
      });
      if(new Set(incoming.map(x=>x.name.toLocaleLowerCase('fr'))).size!==4)throw new Error('doublon');
      localStorage.setItem(KEY,JSON.stringify(incoming));
      profiles=incoming;
      try{history.replaceState(null,'',location.pathname+location.search);}catch{}
    }catch(error){warning='Configuration non enregistrée : '+error.message;}
  }
  function blockIndex(date){
    const weekday=(date.getUTCDay()+6)%7;
    const week=Math.round((mondayOf(date).getTime()-REF_MONDAY)/604800000);
    return 3*week+(weekday<2?0:weekday<4?1:2);
  }
  const shiftIndex=(day,phase)=>((phase+blockIndex(day)-1)%4+4)%4;
  const chip=(index,compact)=>'<span class="mt-sup-chip mt-sup-'+CODES[index].toLowerCase()+'" title="'+esc(SHIFTS[index])+'">'+(compact?CODES[index]:esc(SHIFTS[index]))+'</span>';
  const person=(r,i,day)=>'<div class="mt-sup-person"><strong>'+esc(r.name||('Superviseur '+(i+1)))+'</strong>'+chip(shiftIndex(day,r.phase),false)+'</div>';
  const style=document.createElement('style');
  style.textContent=[
    '#supervisors .mt-sup-summary{font-size:12px;color:#c8d5e6;line-height:1.5}',
    '.mt-sup-panel{border:1px solid #526b87}',
    '.mt-sup-people{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
    '.mt-sup-person{min-width:0;padding:10px;background:#293b53;border:1px solid #425b76;border-radius:12px;display:flex;flex-direction:column;gap:7px}',
    '.mt-sup-person strong{font-size:13px;overflow-wrap:anywhere}',
    '.mt-sup-chip{display:inline-block;align-self:flex-start;padding:5px 9px;border-radius:20px;font-size:12px;font-weight:750}',
    '.mt-sup-m{background:#255fba;color:#fff}.mt-sup-a{background:#167b4e;color:#fff}.mt-sup-n{background:#a43b4e;color:#fff}.mt-sup-r{background:#506074;color:#fff}',
    '.mt-sup-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0}',
    '.mt-sup-toolbar button,.mt-sup-actions button{padding:10px 12px;min-height:42px;border:1px solid #647d9b}',
    '.mt-sup-toolbar strong{flex:1;text-align:center;font-size:15px;text-transform:capitalize}',
    '.mt-sup-views{display:flex;gap:8px;margin:8px 0 16px}',
    '.mt-sup-views button{flex:1}.mt-sup-views .chosen{background:#bb6b2c}',
    '.mt-sup-today{margin-bottom:15px}',
    '.mt-sup-scroll{overflow-x:auto;max-width:100%;border-radius:12px;border:1px solid #4a6483}',
    '.mt-sup-table{border-collapse:collapse;width:100%;min-width:320px;font-size:12px;table-layout:fixed}',
    '.mt-sup-table th,.mt-sup-table td{padding:9px 3px;border-bottom:1px solid #425971;text-align:center;line-height:1.3}',
    '.mt-sup-table th{background:#2c405b;position:sticky;top:0;z-index:1;font-size:11px;overflow-wrap:anywhere}',
    '.mt-sup-table th:first-child,.mt-sup-table td:first-child{width:72px;text-align:left;padding-left:8px}',
    '.mt-sup-table tbody tr:nth-child(even){background:#22334b}',
    '.mt-sup-table tr.mt-sup-is-today{outline:2px solid #f1b36c;outline-offset:-2px;background:#3b4555}',
    '.mt-sup-table tr.mt-sup-new-block td{border-top:2px solid #92a8c1}',
    '.mt-sup-table tr.mt-sup-outside{opacity:.55}',
    '.mt-sup-table .mt-sup-chip{font-size:12px;min-width:28px;text-align:center;display:inline-block}',
    '.mt-sup-table .mt-sup-daynum{font-weight:800;display:block}.mt-sup-table .mt-sup-weekday{color:#b9c9dc;font-size:11px}',
    '.mt-sup-legend{display:flex;gap:8px;flex-wrap:wrap;margin:11px 0;font-size:12px}',
    '.mt-sup-note{font-size:12px;color:#bbcbdc;line-height:1.5}',
    '.mt-sup-settings{border-top:1px solid #53667d;padding-top:12px;margin-top:14px}',
    '.mt-sup-settings[hidden]{display:none}',
    '.mt-sup-settings label{display:grid;gap:5px;margin:7px 0;font-size:12px;font-weight:700}',
    '.mt-sup-settings input,.mt-sup-settings select{min-height:42px;background:#142239;color:white;border:1px solid #687f9b;border-radius:9px;padding:9px;font:inherit}',
    '.mt-sup-settings .mt-sup-formgrid{display:grid;grid-template-columns:minmax(0,1fr) 125px;gap:7px;align-items:end}',
    '#mt-sup-status{font-size:12px;color:#f7c889}',
    '#mt-sup-today-brief{margin-top:9px}',
    '@media(min-width:650px){.mt-sup-people{grid-template-columns:repeat(4,minmax(0,1fr))}.mt-sup-table th:first-child,.mt-sup-table td:first-child{width:105px}.mt-sup-table th,.mt-sup-table td{padding:10px 8px}}'
  ].join('');
  document.head.appendChild(style);

  const section=document.createElement('section');
  section.id='supervisors';section.className='hidden';
  section.innerHTML='<div class="card mt-sup-panel"><h2>Agenda des superviseurs</h2>'+
   '<p class="mt-sup-summary">Cycle 2–2–3 : lundi–mardi, mercredi–jeudi, vendredi–samedi–dimanche. Passage à la vacation suivante à chaque bloc. Prévision théorique, hors remplacements et absences.</p>'+
   '<div class="mt-sup-views"><button type="button" data-sup-view="week">Semaine</button><button type="button" data-sup-view="month">Mois</button></div>'+
   '<div class="mt-sup-toolbar"><button id="mt-sup-prev" type="button" aria-label="Période précédente">‹</button><strong id="mt-sup-period"></strong><button id="mt-sup-next" type="button" aria-label="Période suivante">›</button><button id="mt-sup-now" type="button">Aujourd’hui</button></div>'+
   '<div class="mt-sup-today" id="mt-sup-today"></div>'+
   '<div class="mt-sup-scroll" id="mt-sup-calendar"></div>'+
   '<div class="mt-sup-legend">'+SHIFTS.map((_,i)=>chip(i,false)).join('')+'</div>'+
   '<p class="mt-sup-note">M / A / N / R sont les vacations du jour. Les séparations marquent le changement de bloc. Les horaires précis et les échanges ne sont pas déduits automatiquement.</p>'+
   '<div class="mt-sup-actions"><button type="button" id="mt-sup-config">Modifier les superviseurs</button></div>'+
   '<div class="mt-sup-settings" id="mt-sup-settings" hidden><h3>Référence du 29 octobre 2026</h3><p class="mt-sup-note">Associe chaque superviseur à sa vacation du jeudi 29 octobre. Le calcul se fait ensuite sur toutes les dates.</p><form id="mt-sup-form"><div id="mt-sup-form-fields"></div><button type="submit">Enregistrer les 4 superviseurs</button></form></div>'+
   '<p id="mt-sup-status" role="status"></p></div>';
  main.append(section);
  const tab=document.createElement('button');
  tab.type='button';tab.dataset.tab='supervisors';tab.textContent='📆 Superviseurs';
  nav.append(tab);
  // Le nouveau bouton est ajoute apres l'initialisation de l'ancienne navigation.
  tab.addEventListener('click',()=>{
    nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));
    main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));
    render();
  });
  let view='week',cursor=parseDate(todayISO())||parseDate(REF_DATE);
  function visibleDays(){
    const start=view==='week'?mondayOf(cursor):new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1,12));
    const total=view==='week'?7:new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
    return Array.from({length:total},(_,i)=>plusDays(start,i));
  }
  function render(){
    const dates=visibleDays(),start=dates[0],end=dates[dates.length-1];
    document.getElementById('mt-sup-period').textContent=view==='week'?
      'Du '+fmt(start)+' au '+fmt(end):fmtMonth(start);
    section.querySelectorAll('[data-sup-view]').forEach(b=>{b.classList.toggle('chosen',b.dataset.supView===view);b.setAttribute('aria-pressed',String(b.dataset.supView===view));});
    const t=parseDate(todayISO());
    document.getElementById('mt-sup-today').innerHTML='<h3 style="margin:0 0 10px">Aujourd’hui · '+esc(fmt(t))+'</h3><div class="mt-sup-people">'+profiles.map((p,i)=>person(p,i,t)).join('')+'</div>';
    document.getElementById('mt-sup-calendar').innerHTML='<table class="mt-sup-table"><thead><tr><th scope="col">Jour</th>'+
      profiles.map((p,i)=>'<th scope="col">'+esc(p.name||('Sup. '+(i+1)))+'</th>').join('')+'</tr></thead><tbody>'+
      dates.map((d,i)=>'<tr class="'+(iso(d)===todayISO()?'mt-sup-is-today ':'')+(i>0&&blockIndex(d)!==blockIndex(dates[i-1])?'mt-sup-new-block ':'')+'">'+
      '<td><span class="mt-sup-daynum">'+esc(fmt(d).replace(/\s+\d+\s.*/,''))+' '+d.getUTCDate()+'</span><span class="mt-sup-weekday">'+String(d.getUTCMonth()+1).padStart(2,'0')+'</span></td>'+
      profiles.map(p=>'<td>'+chip(shiftIndex(d,p.phase),true)+'</td>').join('')+'</tr>').join('')+
      '</tbody></table>';
    document.getElementById('mt-sup-status').textContent=warning||(hasNames()?'Cycle prévisionnel enregistré sur cet appareil.':'Renseigne les quatre noms dans « Modifier les superviseurs ».');
    renderBrief();
  }
  function renderBrief(){
    const brief=document.getElementById('mt-sup-today-brief');
    if(!brief)return;
    const day=parseDate(todayISO());
    brief.innerHTML='<div class="mt-sup-people">'+profiles.map((p,i)=>person(p,i,day)).join('')+'</div>'+
      '<button type="button" id="mt-sup-brief-open" style="width:100%;margin-top:10px">Voir l’agenda semaine / mois</button>';
    brief.querySelector('button').onclick=()=>tab.click();
  }
  section.querySelectorAll('[data-sup-view]').forEach(b=>b.onclick=()=>{view=b.dataset.supView;render();});
  document.getElementById('mt-sup-prev').onclick=()=>{cursor=view==='week'?plusDays(cursor,-7):new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()-1,1,12));render();};
  document.getElementById('mt-sup-next').onclick=()=>{cursor=view==='week'?plusDays(cursor,7):new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,1,12));render();};
  document.getElementById('mt-sup-now').onclick=()=>{cursor=parseDate(todayISO());render();};
  document.getElementById('mt-sup-config').onclick=()=>{const panel=document.getElementById('mt-sup-settings');panel.hidden=!panel.hidden;if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'start'});};
  const fields=document.getElementById('mt-sup-form-fields');
  const renderFields=()=>{fields.innerHTML=profiles.map((p,i)=>'<div class="mt-sup-formgrid"><label>Nom du superviseur '+(i+1)+'<input maxlength="45" required name="name'+i+'" value="'+esc(p.name)+'"></label>'+
    '<label>Jeudi 29/10<select name="phase'+i+'">'+SHIFTS.map((s,k)=>'<option value="'+k+'"'+(p.phase===k?' selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label></div>').join('');};
  document.getElementById('mt-sup-config').addEventListener('click',renderFields);
  document.getElementById('mt-sup-form').onsubmit=e=>{
    e.preventDefault();const data=new FormData(e.currentTarget);
    const entries=[0,1,2,3].map(i=>({name:String(data.get('name'+i)||'').trim().slice(0,45),phase:Number(data.get('phase'+i))}));
    if(entries.some(x=>!x.name)||new Set(entries.map(x=>x.name.toLocaleLowerCase('fr'))).size!==4||
       new Set(entries.map(x=>x.phase)).size!==4){warning='Renseigne quatre noms et une vacation différente pour chacun.';render();return;}
    try{localStorage.setItem(KEY,JSON.stringify(entries));profiles=entries;warning='';document.getElementById('mt-sup-settings').hidden=true;render();}
    catch{warning='Enregistrement local impossible.';render();}
  };
  const todaySection=document.getElementById('today');
  if(todaySection){
    const brief=document.createElement('div');
    brief.id='mt-sup-summary-card';brief.className='card mt-sup-panel';
    brief.innerHTML='<h3 style="margin-top:0">Superviseurs de service</h3><div id="mt-sup-today-brief"></div>';
    const hero=todaySection.querySelector('.mt-hero');
    if(hero)hero.after(brief);else todaySection.prepend(brief);
  }
  window.MyTeamSupervisors={forDate:s=>{const d=parseDate(s);return d?profiles.map(p=>({name:p.name,shift:SHIFTS[shiftIndex(d,p.phase)]})):[];}};
  window.addEventListener('focus',render);
  window.addEventListener('storage',e=>{if(e.key===KEY){try{profiles=validRows(JSON.parse(e.newValue||'null'));}catch{}render();}});
  render();
})();