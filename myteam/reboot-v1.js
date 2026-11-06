/* MyTEAM v2 — interface simplifiée. Les anciennes données privées ne sont jamais effacées. */
(()=>{
'use strict';
const PROFILE='myteam_agent_profiles_v1',DELETED='myteam_deleted_agents_v1';
const CASES='myteam_agent_casebook_v1',GENERAL='myteam_general_notes_v2',ARCHIVE='myteam_agent_archives_v2',OVERRIDES='myteam_team_cycle_overrides_v1',JOURNAL='myteam_vacation_journal_v1';
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x===null?fallback:x}catch{return fallback}};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&!Number.isNaN(new Date(s+'T12:00:00').getTime())&&new Date(s+'T12:00:00').getDate()===Number(s.slice(8));
const dateNow=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const fmtDate=s=>validDate(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'Date non renseignée';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const crop=(s,n)=>String(s||'').length>n?String(s).slice(0,n-1)+'…':String(s||'');
const profiles=()=>{const p=read(PROFILE,{});return object(p)?p:{}};
const casebook=()=>{const c=read(CASES,{});return object(c)?c:{}};
const general=()=>{const a=read(GENERAL,[]);return Array.isArray(a)?a:[]};
const journal=()=>{const a=read(JOURNAL,[]);return Array.isArray(a)?a:[]};
const seed=object(window.MyTeamRosterSeed)?window.MyTeamRosterSeed:{};
const saved=()=>new Set((Array.isArray(read(DELETED,[]))?read(DELETED,[]):[]).map(norm));
const archiveEntries=()=>{const r=read(ARCHIVE,{});return object(r)?r:{}};
const isArchived=name=>Boolean(archiveEntries()[norm(name)]);
function archiveAgent(name,departureDate=''){
 const person=agent(name,true);if(!person)return false;
 const data=archiveEntries();data[norm(person.name)]={name:person.name,departureDate:validDate(departureDate)?departureDate:dateNow(),archivedAt:new Date().toISOString()};
 try{localStorage.setItem(ARCHIVE,JSON.stringify(data));renderAgents();renderHome();return true}catch{return false}
}
function restoreAgent(name){
 const data=archiveEntries(),key=norm(name);if(!data[key])return false;
 delete data[key];
 try{localStorage.setItem(ARCHIVE,JSON.stringify(data));renderAgents();renderHome();return true}catch{return false}
}
function deleteAgent(name){
 const person=agent(name,true);if(!person)return false;
 const p=profiles(),cases=casebook(),a=archiveEntries(),del=read(DELETED,[]);
 for(const k of Object.keys(p))if(same(k,name))delete p[k];
 for(const k of Object.keys(cases))if(same(k,name))delete cases[k];
 delete a[norm(name)];
 const removed=Array.isArray(del)?del:[];
 if(!removed.some(x=>same(x,name)))removed.push(name);
 const payload=[[PROFILE,p],[CASES,cases],[ARCHIVE,a],[DELETED,removed]];
 const backup=payload.map(([key])=>[key,localStorage.getItem(key)]);
 const changed=[];
 try{for(const [key,data] of payload){localStorage.setItem(key,JSON.stringify(data));changed.push(key)}}
 catch{
  for(const key of changed){const old=backup.find(x=>x[0]===key)?.[1];try{old===null?localStorage.removeItem(key):localStorage.setItem(key,old)}catch{}}
  return false;
 }
 if(same(selectedAgent,name)){selectedAgent='';$('agent-panel')?.classList.add('hidden')}
 renderAgents();renderHome();return true;
}
function renameAgent(oldName,newName){
 const target=agent(oldName,true),candidate=String(newName||'').trim().replace(/\s+/g,' ').slice(0,100);
 if(!target||candidate.length<3)return false;
 if(!same(target.name,candidate)&&agent(candidate,true))return false;
 const p=profiles(),c=casebook(),a=archiveEntries(),del=read(DELETED,[]);
 const oldKey=Object.keys(p).find(k=>same(k,oldName));
 const oldCase=Object.keys(c).find(k=>same(k,oldName));
 const old=oldKey?p[oldKey]:{team:target.team,gender:target.gender,manualAdded:true};
 if(oldKey)delete p[oldKey];
 p[candidate]={...old,team:target.team,manualAdded:true,previousNames:[...new Set([...(Array.isArray(old.previousNames)?old.previousNames:[]),target.name])]};
 if(oldCase){const list=c[oldCase];delete c[oldCase];c[candidate]=list;}
 if(a[norm(oldName)]){const value=a[norm(oldName)];delete a[norm(oldName)];a[norm(candidate)]={...value,name:candidate}}
 const removed=Array.isArray(del)?del:[];
 if(!same(target.name,candidate)&&!removed.some(x=>same(x,oldName)))removed.push(oldName);
 const visitsKey='myteam_field_visits_v1',followKey='myteam_visit_followups_v1';
 const logged=read(visitsKey,[]),called=read(followKey,[]);
 const migratedVisits=Array.isArray(logged)?logged.map(v=>({...v,agents:Array.isArray(v.agents)?v.agents.map(person=>same(person.name,oldName)?{...person,name:candidate}:person):[]})):[];
 const migratedCalls=Array.isArray(called)?called.map(x=>same(x.agent,oldName)?{...x,agent:candidate}:x):[];
 const writes=[[PROFILE,p],[CASES,c],[ARCHIVE,a],[DELETED,removed],[visitsKey,migratedVisits],[followKey,migratedCalls]],
 backup=writes.map(([key])=>[key,localStorage.getItem(key)]),done=[];
 try{for(const [key,value] of writes){localStorage.setItem(key,JSON.stringify(value));done.push(key)}}
 catch{for(const key of done){const previous=backup.find(x=>x[0]===key)?.[1];try{previous===null?localStorage.removeItem(key):localStorage.setItem(key,previous)}catch{}}return false}
 if(same(selectedAgent,oldName))selectedAgent=candidate;
 renderAgents();renderHome();return true;
}
let selectedAgent='',editing=null,activeTab='home',showAllReminders=false,planMonth=dateNow().slice(0,7);
const same=(a,b)=>norm(a)===norm(b);
const meta=(t)=>({'rappel':'Rappel','alarme':'Alerte','positif':'Point positif','remarque':'Remarque'})[t]||'Note';
const canDone=r=>['rappel','alarme'].includes(r.type);
const noteSort=(a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||''));

function agents(includeArchived=false){
 const p=profiles(),removed=saved(),all=new Map();
 const authoritative=Object.values(p).some(x=>x?.rosterPrivateImport===true);
 if(!authoritative){
  for(const [team,rows] of Object.entries(seed)){
   if(!Array.isArray(rows))continue;
   for(const pair of rows){
    if(!Array.isArray(pair)||typeof pair[0]!=='string')continue;
    const [name,gender]=pair,k=norm(name);
    if(k&&!removed.has(k)&&!all.has(k))all.set(k,{name,team:Number(team)||0,gender:gender||'',profile:false});
   }
  }
 }
 for(const [name,data] of Object.entries(p)){
  const k=norm(name);
  if(!k||removed.has(k))continue;
  const base=all.get(k)||{};
  all.set(k,{name,team:Number.isInteger(Number(data?.team))?Number(data.team):(base.team||0),gender:data?.gender||base.gender||'',profile:true});
 }
 return [...all.values()].filter(a=>includeArchived||!isArchived(a.name)).sort((a,b)=>(a.team===4?0:1)-(b.team===4?0:1)||a.team-b.team||a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
}
function agent(name,includeArchived=false){return agents(includeArchived).find(a=>same(a.name,name))||null;}
function ownNotes(name){
 const all=casebook(),rows=[];
 for(const [key,entries] of Object.entries(all)){
  if(same(key,name)&&Array.isArray(entries))for(const entry of entries)if(object(entry))rows.push(entry);
 }
 return rows.sort(noteSort);
}
function archived(){
 const out=[];
 for(const [key,source] of [['myteam-board-events-v1','Ancienne main courante'],['myteam-board-actions-v1','Anciennes actions']]){
  const data=read(key,{});
  if(!object(data))continue;
  for(const [date,items] of Object.entries(data)){
   if(!Array.isArray(items))continue;
   items.forEach((v,i)=>{
    if(!object(v))return;
    const text=[v.title,v.description,v.text].filter(Boolean).join(' · ').trim();
    if(text)out.push({id:key+'-'+date+'-'+i,date:validDate(date)?date:(v.date||''),text,agent:String(v.agent||v.agents||''),source});
   });
  }
 }
 const old=read('myteam_main_courante_v1',[]);
 if(Array.isArray(old))old.forEach((v,i)=>{
  if(!object(v))return;
  const text=[v.title,v.description,v.text].filter(Boolean).join(' · ').trim();
  if(text)out.push({id:'old-main-'+i,date:v.date||v.effectiveDate||'',agent:String(v.agent||v.agents||''),text,source:'Ancienne main courante'});
 });
 return out;
}
function legacy(name){
 const p=profiles(),key=Object.keys(p).find(k=>same(k,name));
 const row=key?p[key]:{};
 const fields=[['Remarques anciennes',row?.notes],['Rappels historiques',row?.reminderNotes],['Historique RX',row?.rxLog],['Retards',row?.lateLog],['Absences administratives',row?.sickLog]];
 const rows=fields.filter(([,value])=>String(value||'').trim()).map(([title,value])=>'<div class="legacy-entry"><strong>'+esc(title)+'</strong><div>'+esc(value)+'</div></div>');
 if(Array.isArray(row?.otherCertifications)&&row.otherCertifications.length)rows.push('<div class="legacy-entry"><strong>Autres certifications</strong><div>'+row.otherCertifications.map(x=>esc(x.label||'Certification')+(x.expiry?' · '+esc(fmtDate(x.expiry)):'')).join('<br>')+'</div></div>');
 journal().filter(x=>String(x.agents||'').split(/[;,]/).some(v=>[name,...(Array.isArray(row?.previousNames)?row.previousNames:[])].some(n=>same(v.trim(),n)))).forEach(x=>rows.push('<div class="legacy-entry"><strong>Journal de vacation · '+esc(fmtDate(x.date))+'</strong><div>'+esc(x.description)+(x.post?' · '+esc(x.post):'')+'</div></div>'));
 archived().filter(x=>x.agent&&same(x.agent,name)).forEach(x=>rows.push('<div class="legacy-entry"><strong>'+esc(x.source)+' · '+esc(fmtDate(x.date))+'</strong><div>'+esc(x.text)+'</div></div>'));
 return rows.join('')||'<p class="hint">Aucune ancienne information disponible pour cet agent.</p>';
}
function allEvents(){
 const out=[];
 for(const [name,notes] of Object.entries(casebook())){
  if(!Array.isArray(notes))continue;
  notes.forEach(x=>{if(object(x)&&x.text)out.push({...x,agent:name,source:'Suivi personnel'})});
 }
 general().forEach(x=>{if(object(x)&&x.text)out.push({...x,agent:'',source:'Note générale'})});
 (window.MyTeamVisitsCore?.visits?.()||[]).forEach(v=>(v.agents||[]).forEach(p=>out.push({id:v.id,date:v.date,agent:p.name,text:(v.kind==='report'?'Rapport':'Passage')+' · '+v.post+' · '+(p.note||'')+' · '+(p.status||'non renseigné'),source:'Visites sur poste'})));
 (window.MyTeamVisitsCore?.followups?.()||[]).forEach(f=>out.push({id:f.id,date:f.date,agent:f.agent,text:'Confirmation des consignes · '+f.method+' · '+f.result+' · '+(f.note||''),source:'Suivi consignes'}));
 journal().forEach(x=>{if(object(x)&&x.description)out.push({id:x.id,date:x.date,agent:x.agents||'',text:x.description,post:x.post,source:'Journal de vacation',journal:true})});
 archived().forEach(x=>out.push(x));
 for(const [name,p] of Object.entries(profiles())){
  for(const [label,key] of [['Remarques','notes'],['Rappels','reminderNotes'],['RX','rxLog'],['Retards','lateLog'],['Absences administratives','sickLog']]){
   if(p&&String(p[key]||'').trim())out.push({id:'legacy-'+name+'-'+key,date:'',agent:name,text:String(p[key]),source:'Historique ancien · '+label});
  }
 }
 return out.sort(noteSort);
}
function reminders(){
 const rows=[];
 for(const [name,notes] of Object.entries(casebook())){
  if(!Array.isArray(notes))continue;
  notes.filter(r=>object(r)&&canDone(r)&&r.done!==true).forEach(r=>rows.push({id:r.id,agent:name,title:meta(r.type)+' · '+name,detail:r.text,date:r.due||r.date||'',source:'case'}));
 }
 general().filter(r=>object(r)&&canDone(r)&&r.done!==true).forEach(r=>rows.push({id:r.id,agent:'',title:'Rappel général',detail:r.text,date:r.due||r.date||'',source:'general'}));
 const manual=read('myteam_manual_reminders_v1',[]);
 if(Array.isArray(manual))manual.filter(r=>object(r)&&r.done!==true).forEach((r,i)=>rows.push({id:String(r.id??i),agent:r.agent||'',title:r.title||'Rappel enregistré',detail:r.text||r.description||'',date:r.date||r.due||'',source:'manual'}));
 journal().filter(r=>object(r)&&r.hasReminder&&validDate(r.due)&&r.done!==true).forEach(r=>rows.push({id:r.id,agent:r.agents||'',title:'Journal · '+(r.category==='planning'?'Changement de planning':'Événement'),detail:r.reminderText||r.description,date:r.due,source:'journal'}));
 const context=read('myteam_agent_context_reminders_v1',[]);
 if(Array.isArray(context))context.filter(r=>object(r)&&r.status!=='done').forEach((r,i)=>rows.push({id:String(r.id??i),agent:r.agent||'',title:'Rappel · '+String(r.agent||'Agent'),detail:r.text||'',date:r.due||'',source:'context'}));
 const visiting=window.MyTeamVisitsCore?.pendingReminders?.()||[];rows.push(...visiting);
 const dedup=new Set(),savedPlans=read('myteam_reminder_plans_v1',{});
 const plans=object(savedPlans)?savedPlans:{};
 return rows.filter(r=>{const k=[r.source,r.id,r.agent].join('|');if(dedup.has(k))return false;dedup.add(k);return true})
   .filter(r=>!window.MyTeamAbsences?.shouldDeferReminder?.(r,dateNow()))
   .map(r=>({...r,planned:plans[JSON.stringify([r.source,String(r.id),r.agent||''])]||null}))
   .sort((a,b)=>{
    const ka=validDate(a.planned?.date)?a.planned.date:validDate(a.date)?a.date:'9999-12-31';
    const kb=validDate(b.planned?.date)?b.planned.date:validDate(b.date)?b.date:'9999-12-31';
    return ka.localeCompare(kb)||String(a.planned?.time||'').localeCompare(String(b.planned?.time||''))||a.title.localeCompare(b.title,'fr');
   });
}
function renderHome(){
 $('today-label').textContent=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
 const all=reminders(),rows=showAllReminders?all:all.slice(0,8);
 $('reminders-count').textContent=all.length;
 $('show-all-reminders').hidden=all.length<=8;
 $('show-all-reminders').textContent=showAllReminders?'Réduire la liste':'Afficher les '+all.length+' rappels';
 $('home-reminders').innerHTML=rows.length?rows.map(r=>
  '<div class="reminder-card" data-long-reminder-source="'+esc(r.source)+'" data-long-reminder-id="'+esc(r.id)+'" data-long-reminder-agent="'+esc(r.agent||'')+'"><div class="reminder-info"><div class="reminder-date">'+(validDate(r.planned?.date)?'<strong>Prévu '+esc(fmtDate(r.planned.date))+' · '+esc(r.planned.time||'')+'</strong> · ':'')+(validDate(r.date)?'Échéance '+esc(fmtDate(r.date)):'Sans échéance')+'</div>'+
  '<strong>'+esc(r.title)+'</strong><p>'+esc(crop(r.detail,240))+'</p><span class="status-open">À faire</span></div>'+
  (r.agent&&agent(r.agent)?'<button type="button" data-open-agent="'+esc(agent(r.agent).name)+'" aria-label="Ouvrir la fiche">Ouvrir</button>':'')+
  (r.source==='general'?'<button type="button" data-mark-done="'+esc(r.id)+'">Fait</button>':'')+
  (r.source==='manual'||r.source==='context'?'<button type="button" data-mark-external="'+esc(r.source)+'" data-mark-id="'+esc(r.id)+'">Fait</button>':'')+
  (r.source==='journal'?'<button type="button" data-open-journal="'+esc(r.id)+'">Voir</button>':'')+
  (r.source==='visits'?'<button type="button" data-open-visit-agent="'+esc(r.agent)+'">Relancer</button>':'')+
  '</div>').join(''):'<div class="empty">Aucun rappel ouvert enregistré sur cet appareil.</div>';
 const g=general().slice().sort(noteSort).slice(0,5);
 $('general-notes').innerHTML=g.length?g.map(r=>'<div class="general-item" data-long-note="'+esc(r.id)+'"><small>'+esc(fmtDate(r.date))+' · '+esc(meta(r.type))+'</small><p>'+esc(crop(r.text,220))+'</p><button type="button" class="text-button" data-edit-note="'+esc(r.id)+'">Corriger</button></div>').join(''):'<p class="empty">Aucune note générale pour l’instant.</p>';
 renderSearch();
}
function renderSearch(){
 const q=norm($('history-search').value),host=$('history-results');
 if(!q||q.length<2){host.innerHTML=q?'<p class="hint">Saisir au moins deux caractères.</p>':'';return}
 const matches=allEvents().filter(r=>norm([r.agent,r.text,r.date,r.source,meta(r.type)].join(' ')).includes(q)).slice(0,40);
 host.innerHTML=matches.length?matches.map(r=>
  '<div class="search-row" data-long-search="'+esc(r.id||'')+'" data-long-search-agent="'+esc(r.agent||'')+'"><small>'+esc(r.agent||'Général')+' · '+esc(fmtDate(r.date))+' · '+esc(r.source||'Historique')+'</small>'+
  '<p>'+esc(crop(r.text,220))+'</p>'+
  (r.agent&&agent(r.agent)?'<button type="button" data-open-agent="'+esc(agent(r.agent).name)+'">Ouvrir la fiche</button>':'')+'</div>').join(''):
  '<p class="empty">Aucun résultat dans les notes accessibles sur cet appareil.</p>';
}
function renderAgents(){
 const q=norm($('agent-search').value),filter=$('agent-filter').value,status=$('agent-status-filter')?.value||'active';
 const all=agents(true).filter(a=>(status==='all'||(status==='archived')===isArchived(a.name))&&(filter==='all'||a.team===Number(filter))&&(!q||norm([a.name,profiles()[a.name]?.workerNumber].join(' ')).includes(q)));
 $('agents-count').textContent=all.length+' agent(s)';
 $('agent-results').innerHTML=all.length?all.map(a=>'<div class="agent-row" data-long-agent="'+esc(a.name)+'"><button type="button" data-open-agent="'+esc(a.name)+'"><strong>'+esc(a.name)+'</strong><small>Équipe '+(a.team||'à définir')+
  (profiles()[a.name]?.workerNumber?' · Matricule '+esc(profiles()[a.name].workerNumber):'')+
  (isArchived(a.name)?' · Archivé'+(archiveEntries()[norm(a.name)]?.departureDate?' le '+fmtDate(archiveEntries()[norm(a.name)].departureDate):''):'')+
  '</small></button><span class="agent-arrow" aria-hidden="true">›</span></div>').join(''):
  '<p class="empty">Aucun agent correspondant à la recherche.</p>';
}

function openAgent(name){
 const a=agent(name,true);if(!a)return;
 selectedAgent=a.name;
 activate('team');
 $('agent-panel').classList.remove('hidden');
 $('note-form').classList.add('hidden');
 $('agent-title').textContent=a.name;
 $('agent-archive-status').textContent=isArchived(a.name)?'Agent archivé · départ '+fmtDate(archiveEntries()[norm(a.name)]?.departureDate)+' · historique conservé':'Agent actif';
 $('agent-subtitle').textContent='Équipe '+(a.team||'à définir')+' · '+ownNotes(a.name).length+' note(s) enregistrée(s)';
 const p=profiles()[a.name]||{};
 const f=$('qualification-form');
 f.elements.workerNumber.value=p.workerNumber||'';
 f.elements.team.value=String(a.team||0);
 f.elements.rxCertified.value=p.rxCertified===true?'true':p.rxCertified===false?'false':'';
 f.elements.pistePermit.value=p.pistePermit===true?'true':p.pistePermit===false?'false':'';
 f.elements.rxExpiry.value=validDate(p.rxExpiry)?p.rxExpiry:'';
 f.elements.permitExpiry.value=validDate(p.permitExpiry)?p.permitExpiry:'';
 $('qualification-status').textContent='';
 $('agent-note-search').value='';
 $('agent-note-filter').value='all';
 $('agent-legacy-content').innerHTML=legacy(a.name);
 renderTimeline();
 window.MyTeamVisits?.renderProfile?.();
 window.MyTeamAbsencesUI?.renderAgent?.();
 $('agent-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderTimeline(){
 if(!selectedAgent)return;
 const q=norm($('agent-note-search').value),type=$('agent-note-filter').value;
 const all=ownNotes(selectedAgent).filter(r=>(type==='all'||type==='open'&&canDone(r)&&r.done!==true||r.type===type)&&(!q||norm([r.text,r.date,r.due,meta(r.type)].join(' ')).includes(q)));
 $('agent-timeline').innerHTML=all.length?all.map(r=>'<div class="timeline-row" data-long-note="'+esc(r.id)+'"><div class="timeline-head"><span class="timeline-label">'+esc(meta(r.type))+'</span><span class="timeline-date">'+esc(fmtDate(r.date))+'</span></div>'+
  '<p class="timeline-text">'+esc(r.text||'')+'</p>'+
  (validDate(r.due)?'<small>Échéance : '+esc(fmtDate(r.due))+'</small>':'')+
  (canDone(r)?'<p class="'+(r.done?'status-done':'status-open')+'">'+(r.done?'Fait (confirmé)':'À faire')+'</p>':'')+
  (Array.isArray(r.revisions)&&r.revisions.length?'<details class="note-versions"><summary>'+r.revisions.length+' ancienne(s) version(s)</summary>'+r.revisions.map(v=>'<div class="legacy-entry"><small>Correction '+esc(String(v.changedAt||'').slice(0,10))+' · fait du '+esc(fmtDate(v.date))+'</small><p>'+esc(v.text||'')+'</p></div>').join('')+'</details>':'')+
  '<div class="timeline-actions"><button type="button" data-edit-note="'+esc(r.id)+'">Corriger la note</button>'+
  (canDone(r)&&r.done!==true?'<button type="button" data-mark-done="'+esc(r.id)+'">Marquer fait</button>':'')+'</div></div>').join(''):
  '<div class="empty">Aucune note pour ce filtre. Utilise « + Note » pour ajouter un événement daté.</div>';
}
function qualificationSave(ev){
 ev.preventDefault();
 const a=agent(selectedAgent,true);if(!a)return;
 const f=ev.currentTarget,p=profiles(),k=Object.keys(p).find(k=>same(k,a.name))||a.name;
 const existing=p[k]||{},newp={...existing,team:Number(f.elements.team.value),workerNumber:String(f.elements.workerNumber.value).trim().slice(0,20)};
 for(const key of ['rxCertified','pistePermit']){
  const v=f.elements[key].value;
  if(v==='')delete newp[key];else newp[key]=v==='true';
 }
 for(const key of ['rxExpiry','permitExpiry']){
  const v=f.elements[key].value;
  if(v&&!validDate(v)){$('qualification-status').textContent='Date invalide.';return}
  newp[key]=v;
 }
 p[k]=newp;
 try{localStorage.setItem(PROFILE,JSON.stringify(p));$('qualification-status').textContent='Informations enregistrées localement.';renderAgents();$('agent-subtitle').textContent='Équipe '+(newp.team||'à définir')+' · '+ownNotes(k).length+' note(s)';}
 catch(e){$('qualification-status').textContent='Enregistrement impossible : stockage indisponible.'}
}
function prepareSelect(value){
 const opts='<option value="__general__">Information générale (sans agent)</option>'+
  agents(name?true:false).map(a=>'<option value="'+esc(a.name)+'">'+esc(a.name)+' · équipe '+(a.team||'à définir')+'</option>').join('');
 $('note-primary').innerHTML=opts;
 $('note-primary').value=value&&agent(value)?agent(value).name:'__general__';
}
function openComposer(name='',note=null){
 activate('team');
 editing=note?{id:note.id}:null;
 prepareSelect(name);
 const f=$('note-form');
 f.classList.remove('hidden');
 $('note-form-title').textContent=note?'Corriger la note':'Nouvelle note datée';
 f.elements.type.value=note?.type||'remarque';
 f.elements.date.value=validDate(note?.date)?note.date:dateNow();
 f.elements.due.value=validDate(note?.due)?note.due:'';
 f.elements.text.value=note?.text||'';
 f.elements.extraAgents.value='';
 f.elements.primaryAgent.disabled=Boolean(note);
 f.elements.extraAgents.disabled=Boolean(note);
 $('note-status').textContent=note?'La correction conserve une trace de la version précédente.':'Les informations restent privées sur cet appareil.';
 f.scrollIntoView({behavior:'smooth',block:'start'});
}
function findNote(id){
 for(const [name,entries] of Object.entries(casebook())){
  const r=Array.isArray(entries)?entries.find(x=>x&&String(x.id)===String(id)):null;
  if(r)return {note:r,agent:name};
 }
 const r=general().find(x=>x&&String(x.id)===String(id));
 return r?{note:r,agent:''}:null;
}
function saveNote(ev){
 ev.preventDefault();
 const f=ev.currentTarget;
 const type=f.elements.type.value,date=f.elements.date.value,due=f.elements.due.value,text=String(f.elements.text.value||'').trim();
 const status=$('note-status');
 if(!['remarque','rappel','alarme','positif'].includes(type)||!validDate(date)||(due&&!validDate(due))||!text){status.textContent='Complète la date, la catégorie et le texte.';return}
 const now=new Date().toISOString();
 if(editing){
  const existing=findNote(editing.id);
  if(!existing){status.textContent='Note d’origine introuvable : correction annulée.';return}
  const update=r=>({...r,type,date,due,text,updatedAt:now,revisions:[...(Array.isArray(r.revisions)?r.revisions:[]),{type:r.type,date:r.date,due:r.due,text:r.text,changedAt:now}]});
  try{
   if(existing.agent){
    const all=casebook();
    for(const [k,entries] of Object.entries(all))if(Array.isArray(entries))all[k]=entries.map(r=>r&&String(r.id)===String(editing.id)?update(r):r);
    localStorage.setItem(CASES,JSON.stringify(all));
   }else{
    localStorage.setItem(GENERAL,JSON.stringify(general().map(r=>r&&String(r.id)===String(editing.id)?update(r):r)));
   }
  }catch{status.textContent='Impossible de corriger : stockage indisponible.';return}
  status.textContent='Correction enregistrée. La version précédente reste archivée dans la note.';
 }else{
  const primary=f.elements.primaryAgent.value,targets=[];
  if(primary!=='__general__'){
   const a=agent(primary);if(!a){status.textContent='Choisis un agent existant.';return}targets.push(a.name);
  }
  const extras=String(f.elements.extraAgents.value||'').split(';').map(x=>x.trim()).filter(Boolean);
  for(const name of extras){
   const a=agent(name);
   if(!a){status.textContent='Agent non reconnu : '+name+'. Utilise son nom exact.';return}
   if(!targets.some(k=>same(k,a.name)))targets.push(a.name);
  }
  const row={id:'agent-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),type,date,due,text,done:false,createdAt:now};
  try{
   if(!targets.length)localStorage.setItem(GENERAL,JSON.stringify([...general(),row]));
   else{
    const all=casebook();
    for(const name of targets){
     const key=Object.keys(all).find(k=>same(k,name))||name;
     all[key]=[...(Array.isArray(all[key])?all[key]:[]),{...row}];
    }
    localStorage.setItem(CASES,JSON.stringify(all));
   }
  }catch{status.textContent='Note non enregistrée : stockage indisponible.';return}
  status.textContent='Note enregistrée pour '+(targets.join(', ')||'l’historique général')+'.';
 }
 editing=null;
 f.elements.primaryAgent.disabled=false;
 f.elements.extraAgents.disabled=false;
 f.elements.text.value='';f.elements.due.value='';
 renderHome();renderAgents();
 if(selectedAgent){renderTimeline();$('agent-subtitle').textContent='Équipe '+(agent(selectedAgent)?.team||'à définir')+' · '+ownNotes(selectedAgent).length+' note(s)';}
}
function markDone(id){
 const found=findNote(id);
 if(!found||!canDone(found.note)||found.note.done===true)return;
 if(!confirm('Confirmer que ce rappel ou cette alerte a réellement été traité ?'))return;
 const doneAt=new Date().toISOString();
 try{
  if(found.agent){
   const all=casebook();
   for(const [k,entries] of Object.entries(all))if(Array.isArray(entries))all[k]=entries.map(r=>r&&String(r.id)===String(id)?{...r,done:true,doneAt}:r);
   localStorage.setItem(CASES,JSON.stringify(all));
  }else localStorage.setItem(GENERAL,JSON.stringify(general().map(r=>r&&String(r.id)===String(id)?{...r,done:true,doneAt}:r)));
  renderTimeline();renderHome();
 }catch{alert('Confirmation non enregistrée : stockage indisponible.')}
}
function markExternalDone(source,id){
 const key=source==='manual'?'myteam_manual_reminders_v1':source==='context'?'myteam_agent_context_reminders_v1':'';
 if(!key||!confirm('Confirmer que cette action est réellement terminée ?'))return;
 const rows=read(key,[]);
 if(!Array.isArray(rows))return;
 const changed=rows.map((r,i)=>r&&String(r.id??i)===String(id)?(source==='manual'?{...r,done:true,doneAt:new Date().toISOString()}:{...r,status:'done',updatedAt:new Date().toISOString()}):r);
 try{localStorage.setItem(key,JSON.stringify(changed));renderHome()}catch{alert('Enregistrement impossible sur cet appareil.')}
}
function activate(id){
 const target=id==='team'?'team':id;
 if(!['home','team','planning','hours','salary','journal','visits','absences','closing'].includes(target))return;
 activeTab=target;
 document.querySelectorAll('main > section').forEach(s=>s.classList.toggle('hidden',s.id!==target));
 document.querySelectorAll('nav.tabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===(target==='visits'?'team':target)));
 if(target==='visits')window.MyTeamVisits?.renderHome?.();
 if(target==='absences')window.MyTeamAbsencesUI?.render?.();
 if(target==='closing')window.MyTeamVacation?.load?.();
 if(target==='home')renderHome();
 if(target==='team')renderAgents();
 if(target==='planning')renderPlanning();
 if(target==='journal')window.MyTeamJournal?.render?.();
 if(target==='hours')window.MyTeamRenderHours?.();
 if(target==='salary')window.MyTeamRenderSalary?.();
 window.scrollTo(0,0);
}
function cycle(date){
 const overrides=read(OVERRIDES,{});if(object(overrides)&&['m','a','n','r'].includes(overrides[date]))return overrides[date];
 const [year,month,day]=date.split('-').map(Number);
 const offset=Math.round((Date.UTC(year,month-1,day)-Date.UTC(2026,9,17))/86400000);
 const index=((offset%8)+8)%8;
 return index<2?'m':index<4?'a':index<6?'n':'r';
}
function renderPlanning(){
 const v=$('plan-month').value||planMonth;
 if(!/^\d{4}-\d{2}$/.test(v))return;
 planMonth=v;
 const [y,m]=v.split('-').map(Number),days=new Date(y,m,0).getDate();
 const offset=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7;
 const titles=['L','M','M','J','V','S','D'];
 const cells=titles.map(n=>'<div class="cycle-weekday">'+n+'</div>');
 for(let i=0;i<offset;i++)cells.push('<div aria-hidden="true"></div>');
 for(let day=1;day<=days;day++){
  const date=v+'-'+String(day).padStart(2,'0'),c=cycle(date);
  const lbl={m:'Matin',a:'Après-midi',n:'Nuit',r:'Repos'}[c];
  const posted=['morning','afternoon','night'].some(phase=>window.MyTeamVacation?.isPosted?.(date,phase));
  cells.push('<div class="cycle-day '+c+(date===dateNow()?' is-today':'')+'" data-long-cycle="'+date+'" title="Appui long : modifier · '+lbl+' '+fmtDate(date)+'"><strong>'+day+'</strong><span>'+lbl+(read(OVERRIDES,{})[date]?' *':'')+(posted?' · POSTÉ':'')+'</span></div>');
 }
 $('team-calendar').innerHTML=cells.join('');
 const d=$('supervisor-date').value||dateNow();
 const rota=window.MyTeamSupervisors?.forDate?.(d)||[];
 $('supervisor-summary').innerHTML=rota.length?rota.map(r=>'<div class="sup-line" data-long-supervisors="1"><span>'+esc(r.name)+'</span><strong>'+esc(r.shift)+'</strong></div>').join(''):
  '<p class="empty">Planning superviseurs indisponible.</p>';
 const all=agents();
 $('teams-overview').innerHTML=[1,2,3,4].map(team=>'<div class="team-count" data-long-team="'+team+'"><strong>Équipe '+team+'</strong><span>'+all.filter(a=>a.team===team).length+' agents</span></div>').join('');
}
function showSupervisors(){
 const b=document.querySelector('nav.tabs [data-tab="supervisors"]');
 if(!b)return;
 b.click();
 document.querySelectorAll('nav.tabs [data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='planning'));
 let back=$('supervisor-reboot-back');
 if(!back){back=document.createElement('button');back.id='supervisor-reboot-back';back.type='button';back.className='text-button';back.textContent='← Planning équipe';back.addEventListener('click',()=>activate('planning'));$('supervisors').prepend(back)}
 window.scrollTo(0,0);
}
function addAgent(ev){
 ev.preventDefault();
 const f=ev.currentTarget,name=String(f.elements.name.value||'').trim().replace(/\s+/g,' ').slice(0,100),team=Number(f.elements.team.value);
 if(name.length<3||!Number.isInteger(team)||team<0||team>4){$('add-agent-status').textContent='Nom ou équipe invalide.';return}
 if(agent(name,true)){$('add-agent-status').textContent='Cet agent est déjà présent, actif ou archivé.';return}
 const dates={rxExpiry:f.elements.rxExpiry.value,permitExpiry:f.elements.permitExpiry.value};
 if(Object.values(dates).some(d=>d&&!validDate(d))){$('add-agent-status').textContent='Date de validité incorrecte.';return}
 const workerNumber=String(f.elements.workerNumber.value||'').trim();
 if(workerNumber&&!/^[0-9]{3,20}$/.test(workerNumber)){$('add-agent-status').textContent='Matricule : chiffres uniquement (3 à 20).';return}
 const rx=f.elements.rxCertified.value,piste=f.elements.pistePermit.value;
 const profile={team,manualAdded:true,workerNumber,...dates};
 if(rx!=='')profile.rxCertified=rx==='true';
 if(piste!=='')profile.pistePermit=piste==='true';
 const p=profiles();p[name]=profile;
 // Réintroduction explicite après une suppression passée : retirer l’ancien marqueur.
 const removed=read(DELETED,[]),clean=Array.isArray(removed)?removed.filter(v=>!same(v,name)):[];
 const oldp=localStorage.getItem(PROFILE),oldd=localStorage.getItem(DELETED);
 try{
  localStorage.setItem(PROFILE,JSON.stringify(p));
  localStorage.setItem(DELETED,JSON.stringify(clean));
  $('add-agent-status').textContent='Fiche créée avec qualifications.';f.reset();renderAgents();openAgent(name);
 }catch{
  try{oldp===null?localStorage.removeItem(PROFILE):localStorage.setItem(PROFILE,oldp);oldd===null?localStorage.removeItem(DELETED):localStorage.setItem(DELETED,oldd)}catch{}
  $('add-agent-status').textContent='Impossible d’enregistrer la fiche.';
 }
}
function exportAll(){
 const keys={};
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(key&&(/^(myteam|mt-)/i.test(key)))keys[key]=localStorage.getItem(key);
  }
  const data=JSON.stringify({format:'myteam-local-backup-v2',createdAt:new Date().toISOString(),keys},null,2);
  const blob=new Blob([data],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='MyTEAM-sauvegarde-'+dateNow()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  $('backup-status').textContent=Object.keys(keys).length+' ensembles de données inclus dans le fichier de sauvegarde. Conserve-le dans un endroit privé.';
 }catch{$('backup-status').textContent='Impossible de préparer la sauvegarde sur cet appareil.'}
}
function init(){
 $('today-label').textContent='';
 $('plan-month').value=planMonth;
 $('supervisor-date').value=dateNow();
 document.querySelector('nav.tabs').addEventListener('click',e=>{
  const b=e.target.closest('button[data-tab]');if(!b)return;
  if(b.dataset.tab==='supervisors'){document.querySelectorAll('nav.tabs [data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab==='planning'));return}
  activate(b.dataset.tab);
 });
 document.addEventListener('click',e=>{
  const tab=e.target.closest('button[data-tab]');
  if(tab&&!tab.closest('nav.tabs')){activate(tab.dataset.tab);return}
  const journalLink=e.target.closest('[data-open-journal]');if(journalLink){window.MyTeamJournal?.openJournal?.(journalLink.dataset.openJournal);return}
  const visitRelance=e.target.closest('[data-open-visit-agent]');if(visitRelance){window.MyTeamVisits?.open?.();window.MyTeamVisits?.callAgent?.(visitRelance.dataset.openVisitAgent);return}
  const open=e.target.closest('[data-open-agent]');
  if(open){openAgent(open.dataset.openAgent);return}
  const edit=e.target.closest('[data-edit-note]');
  if(edit){const found=findNote(edit.dataset.editNote);if(found)openComposer(found.agent,found.note);return}
  const external=e.target.closest('[data-mark-external]');
  if(external){markExternalDone(external.dataset.markExternal,external.dataset.markId);return}
  const done=e.target.closest('[data-mark-done]');
  if(done){markDone(done.dataset.markDone);return}
  const action=e.target.closest('[data-action]');
  if(!action)return;
  if(action.dataset.action==='new-note')openComposer(selectedAgent||'');
  if(action.dataset.action==='general-note')openComposer('');
  if(action.dataset.action==='find-agent'){activate('team');$('agent-search').focus()}
  if(action.dataset.action==='search-history'){$('history-search').focus();$('history-search').scrollIntoView({behavior:'smooth',block:'center'})}
 });
 $('show-all-reminders').addEventListener('click',()=>{showAllReminders=!showAllReminders;renderHome()});
 $('history-search').addEventListener('input',renderSearch);
 $('agent-search').addEventListener('input',renderAgents);
 $('agent-filter').addEventListener('change',renderAgents);
 $('agent-status-filter').addEventListener('change',renderAgents);
 $('agent-note-search').addEventListener('input',renderTimeline);
 $('agent-note-filter').addEventListener('change',renderTimeline);
 $('qualification-form').addEventListener('submit',qualificationSave);
 $('note-form').addEventListener('submit',saveNote);
 $('note-cancel').addEventListener('click',()=>{editing=null;$('note-form').classList.add('hidden')});
 $('agent-back').addEventListener('click',()=>{selectedAgent='';$('agent-panel').classList.add('hidden');$('note-form').classList.add('hidden');$('agent-tools').scrollIntoView({behavior:'smooth',block:'start'})});
 $('add-agent-form').addEventListener('submit',addAgent);
 $('export-data').addEventListener('click',exportAll);
 $('plan-month').addEventListener('change',renderPlanning);
 for(const [id,change] of [['plan-prev',-1],['plan-next',1]]){
  $(id).addEventListener('click',()=>{
   const [y,m]=planMonth.split('-').map(Number),d=new Date(y,m-1+change,1);
   $('plan-month').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');renderPlanning();
  });
 }
 $('supervisor-date').addEventListener('change',renderPlanning);
 $('open-supervisors').addEventListener('click',showSupervisors);
 window.addEventListener('myteam-supervisors-updated',()=>{if(activeTab==='planning')renderPlanning()});
 window.addEventListener('focus',()=>{renderHome();renderAgents()});
 window.addEventListener('myteam-journal-updated',()=>{renderHome();if(selectedAgent){$('agent-legacy-content').innerHTML=legacy(selectedAgent)}});
 window.addEventListener('myteam-visits-updated',()=>{renderHome();if(activeTab==='team'&&selectedAgent)window.MyTeamVisits?.renderProfile?.()});
 window.addEventListener('myteam-absences-updated',()=>{renderHome();renderPlanning();if(activeTab==='team'&&selectedAgent)window.MyTeamAbsencesUI?.renderAgent?.()});
 window.addEventListener('myteam-vacation-updated',()=>{renderHome();renderPlanning()});
 renderHome();renderAgents();renderPlanning();activate('home');
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
window.MyTeamReboot={agents,agent,openAgent,openComposer,findNote,markDone,markExternalDone,archiveAgent,restoreAgent,deleteAgent,renameAgent,isArchived,archiveEntries,renderAgents,renderTimeline,renderHome,renderPlanning,activate,showSupervisors,validDate,dateNow,fmtDate,norm,same,cycle,profiles,casebook,read,exportAll,selected:()=>selectedAgent};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();