/* MyTEAM · Moteur des visites sur poste. Données privées : localStorage seulement. */
(()=>{
'use strict';
const KEY='myteam_field_visits_v1',FOLLOW='myteam_visit_followups_v1';
const api=window.MyTeamReboot;if(!api)return;
const read=(k,def)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v===null?def:v}catch{return def}};
const list=k=>{const v=read(k,[]);return Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[]};
const visits=()=>list(KEY),followups=()=>list(FOLLOW);
const norm=api.norm,same=api.same,valid=api.validDate,today=api.dateNow;
const datePlus=(date,n)=>{if(!valid(date))return '';const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const uid=()=> 'v-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
const statuses={ok:'Consignes contrôlées sur place · OK',pending:'Consignes non validées',notasked:'Consignes non demandées',unknown:'Non renseignées',phone:'Validation déclarée par téléphone'};
const shiftNames={morning:'Matin',afternoon:'Après-midi',night:'Nuit',other:'Autre'};
function allStaff(){return api.agents().filter(x=>!api.isArchived(x.name))}
function staff(date=today()){return allStaff().filter(x=>!window.MyTeamAbsences?.isAbsent?.(x.name,date))}
function lastSigned(name,date=today(),ignore=''){
 const since=datePlus(date,-6);
 return visits().filter(v=>v.id!==ignore&&v.kind==='report'&&v.signed===true&&valid(v.date)&&v.date<=date&&v.date>=since&&Array.isArray(v.agents)&&v.agents.some(a=>same(a.name,name)))
  .sort((a,b)=>String(b.date+b.time).localeCompare(String(a.date+a.time)))[0]||null;
}
function eventsFor(name){
 const items=[];
 for(const v of visits()){
  const p=(Array.isArray(v.agents)?v.agents:[]).find(a=>same(a.name,name));
  if(p)items.push({source:'visit',date:v.date,time:v.time||'',createdAt:v.createdAt||'',post:v.post,kind:v.kind,signed:v.signed,status:p.status||'unknown',note:p.note||'',visit:v});
 }
 for(const f of followups())if(same(f.agent,name))items.push({source:'followup',...f});
 return items.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||String(a.time||'').localeCompare(String(b.time||'')));
}
function agentState(name){
 let status='unknown',due='',lastSeen=null,lastSignedReport=null,latestReport=null,latestConfirmation=null,sourceVisitId='';
 const events=eventsFor(name);
 for(const e of events){
  if(e.source==='visit'){
   lastSeen=e;
   if(e.kind==='report'){latestReport=e;if(e.signed)lastSignedReport=e}
   if(['ok','pending','notasked'].includes(e.status)){
    status=e.status;
    if(status==='ok'){due='';sourceVisitId='';latestConfirmation={date:e.date,method:'on-site'}}
    else{due=e.visit.followDue||datePlus(e.date,1);sourceVisitId=e.visit.id}
   }
  }else{
   if(e.result==='confirmed'){
    status=e.method==='on-site'?'ok':'phone';due='';sourceVisitId='';latestConfirmation={date:e.date,method:e.method||'phone'};
   }else if(e.result==='pending'){
    status='pending';due=e.due||datePlus(e.date,1);sourceVisitId=e.sourceVisitId||'';
   }
  }
 }
 return {name,status,due,lastSeen,lastSignedReport,latestReport,latestConfirmation,sourceVisitId,events};
}
const pending=()=>staff().map(a=>agentState(a.name)).filter(s=>['pending','notasked'].includes(s.status)).sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')));
function count(date,shift){
 const v=visits().filter(x=>x.date===date&&x.shift===shift);
 return {signed:v.filter(x=>x.kind==='report'&&x.signed===true).length,passages:v.filter(x=>x.kind==='passage').length,reports:v.filter(x=>x.kind==='report').length};
}
function saveVisit(row){
 if(!valid(row.date)||!shiftNames[row.shift]||!String(row.post||'').trim()||!['passage','report'].includes(row.kind)||!Array.isArray(row.agents)||!row.agents.length)throw Error('Date, vacation, poste ou agents manquants');
 if(window.MyTeamVacation?.isPosted?.(row.date,row.shift))throw Error('Vacances de poste : tu es déclaré posté sur cette vacation. Modifie d’abord ton affectation avant d’enregistrer une visite.');
 const names=new Set();
 const people=row.agents.map(a=>{
  const name=staff(row.date).find(x=>same(x.name,a.name))?.name;
  if(!name||names.has(norm(name)))throw Error('Agent inconnu ou en double : '+a.name);
  names.add(norm(name));
  if(!['ok','pending','notasked','unknown'].includes(a.status))throw Error('Statut des consignes invalide');
  return {name,status:a.status,note:String(a.note||'').slice(0,220)};
 });
 const now=new Date().toISOString(),rows=visits(),idx=rows.findIndex(x=>x.id===row.id),old=idx<0?null:rows[idx];
 const next={id:old?.id||uid(),createdAt:old?.createdAt||now,updatedAt:now,
  date:row.date,shift:row.shift,time:row.time||'',post:String(row.post).trim().toUpperCase().slice(0,30),
  kind:row.kind,signed:row.kind==='report'&&row.signed===true,agents:people,
  note:String(row.note||'').slice(0,1000),followDue:valid(row.followDue)?row.followDue:datePlus(row.date,1)};
 if(old){
  const {revisions,...snapshot}=old;
  next.revisions=[...(Array.isArray(revisions)?revisions:[]),{changedAt:now,snapshot}];
 }
 if(idx>=0)rows[idx]=next;else rows.push(next);
 localStorage.setItem(KEY,JSON.stringify(rows));
 window.dispatchEvent(new Event('myteam-visits-updated'));
 return next;
}
function saveFollowup(agent,result,method,date,note='',sourceVisitId=''){
 if(!staff().some(a=>same(a.name,agent))||!['confirmed','pending'].includes(result)||!['phone','on-site'].includes(method)||!valid(date))throw Error('Suivi de consignes invalide');
 const row={id:uid(),agent:staff().find(a=>same(a.name,agent)).name,result,method,date,
  note:String(note||'').slice(0,350),sourceVisitId,due:result==='pending'?datePlus(date,1):'',createdAt:new Date().toISOString()};
 const rows=followups();rows.push(row);
 localStorage.setItem(FOLLOW,JSON.stringify(rows));
 window.dispatchEvent(new Event('myteam-visits-updated'));
 return row;
}
function history(name){return eventsFor(name).slice().reverse()}
function pendingReminders(){
 return pending().map(s=>({id:'visit-'+norm(s.name),source:'visits',agent:s.name,
  title:(s.status==='pending'?'Consignes non validées':'Consignes non demandées')+' · '+s.name,
  detail:'Repasser sur poste ou obtenir une confirmation, à consigner séparément du rapport de visite.',
  date:s.due||datePlus(today(),1)}));
}
function summary(date=today()){
 return staff(date).map(a=>{
  const s=agentState(a.name),signed=lastSigned(a.name,date);
  return {name:a.name,report:signed?{date:signed.date,post:signed.post}:null,
   passage:s.lastSeen?{date:s.lastSeen.date,post:s.lastSeen.post,kind:s.lastSeen.kind}:null,
   consignes:s.status,due:s.due};
 }).filter(x=>x.report||x.passage||x.due);
}
const legacy=()=>{const raw=read('myteam_post_visits_v1',{});return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}};
window.MyTeamVisitsCore={KEY,FOLLOW,visits,followups,staff,allStaff,lastSigned,agentState,pending,count,saveVisit,saveFollowup,history,pendingReminders,summary,statuses,shiftNames,datePlus,valid,today,legacy,norm,same};
})();