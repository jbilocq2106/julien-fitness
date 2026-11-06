/* MyTEAM — Absences privées, validation des absences et contrôle d'affectation.
 * Aucune absence nominative n'est publiée dans le dépôt : import local uniquement.
 */
(()=>{
'use strict';
const KEY='myteam_agent_absences_v1',api=window.MyTeamReboot;
if(!api)return;
const TYPES={sick:'Maladie',leave:'Congé',parental:'Congé parental',cure:'Cure'};
const STATUSES={confirmed:'Validé / confirmé',requested:'Demandé',accepted:'Accepté dans MyGesper',refused:'Refusé'};
const norm=api.norm,valid=api.validDate,today=api.dateNow;
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[]}catch{return []}};
const knownNames=()=>api.agents(true);
const matchName=(s,allowPartial=false)=>{
 const input=norm(s),n=input===norm('OUINNE Melyse')?norm('OUNINE Melyse'):input;if(!n)return null;
 const people=knownNames();
 const exact=people.filter(a=>norm(a.name)===n);
 if(exact.length===1)return exact[0];
 if(!allowPartial||n.length<3)return null;
 const candidates=people.filter(a=>norm(a.name).startsWith(n)||norm(a.name).endsWith(n)||norm(a.name).includes(n));
 return candidates.length===1?candidates[0]:null;
};
const uid=()=> 'abs-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
const active=(record,date=today())=>{
 if(!valid(date)||!['confirmed','accepted'].includes(record.status)||!TYPES[record.type])return false;
 const start=valid(record.start)?record.start:valid(record.observedAt)?record.observedAt:'';
 const end=valid(record.end)?record.end:'';
 if(!start||date<start)return false;
 if(valid(record.returnDate)&&date>=record.returnDate)return false;
 if(end&&date>end)return false;
 return true;
};
function findFor(name,date=today()){
 const n=norm(name);
 return read().filter(r=>norm(r.agent)===n&&active(r,date));
}
const isAbsent=(name,date=today())=>findFor(name,date).length>0;
function expectedReturn(name,date=today()){
 const candidates=findFor(name,date);
 if(!candidates.length)return null;
 const days=candidates.map(r=>r.returnDate||(valid(r.end)?addDays(r.end,1):'')).filter(valid);
 return days.length?days.sort().at(-1):null;
}
function addDays(date,n){
 const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function validate(input){
 const matched=matchName(input.agent,false);
 if(!matched)throw Error('Agent introuvable : sélectionne un nom existant dans MyTEAM.');
 if(!TYPES[input.type]||!STATUSES[input.status])throw Error('Type ou statut incorrect.');
 if(input.start&&!valid(input.start))throw Error('Date de début invalide.');
 if(input.end&&!valid(input.end))throw Error('Date de fin invalide.');
 if(input.returnDate&&!valid(input.returnDate))throw Error('Date de retour invalide.');
 if(!input.start&&input.type!=='parental')throw Error('Indique la date de début.');
 if(!input.end&&!input.returnDate)throw Error('Indique la date de fin ou la date de retour.');
 if(input.start&&input.end&&input.end<input.start)throw Error('La fin précède le début.');
 if(input.returnDate&&input.start&&input.returnDate<=input.start)throw Error('Retour antérieur au début.');
 if(input.returnDate&&input.end&&input.returnDate<=input.end)throw Error('Le retour doit suivre le dernier jour absent.');
 return {agent:matched.name,type:input.type,status:input.status,start:input.start||'',end:input.end||'',
  returnDate:input.returnDate||'',notes:String(input.notes||'').slice(0,750),
  observedAt:valid(input.observedAt)?input.observedAt:today()};
}
function saveOne(input){
 const obj=validate(input),all=read(),ix=all.findIndex(x=>x.id===input.id),old=ix>=0?all[ix]:null;
 const now=new Date().toISOString();
 const next={...obj,id:old?.id||uid(),createdAt:old?.createdAt||now,updatedAt:now};
 if(old){
  const {revisions,...snap}=old;
  next.revisions=[...(Array.isArray(revisions)?revisions:[]),{previous:snap,changedAt:now}];
 }
 if(ix>=0)all[ix]=next;else all.push(next);
 localStorage.setItem(KEY,JSON.stringify(all));
 window.dispatchEvent(new Event('myteam-absences-updated'));
 return next;
}
function importData(input){
 if(!input||!Array.isArray(input.absences))throw Error('Le fichier doit contenir une liste absences.');
 const all=read(),added=[],skipped=[];
 for(const raw of input.absences){
  try{
   const obj=validate(raw);
   const duplicate=all.some(x=>norm(x.agent)===norm(obj.agent)&&x.type===obj.type&&x.start===obj.start&&x.end===obj.end&&x.returnDate===obj.returnDate&&x.status===obj.status);
   if(duplicate){skipped.push(obj.agent+' : déjà présent');continue}
   const now=new Date().toISOString();
   const row={...obj,id:uid(),createdAt:now,updatedAt:now};
   all.push(row);added.push(row);
  }catch(e){skipped.push(String(raw?.agent||'?')+' : '+e.message)}
 }
 if(added.length){localStorage.setItem(KEY,JSON.stringify(all));window.dispatchEvent(new Event('myteam-absences-updated'))}
 return {added,skipped};
}
function linkedAgents(label){
 const candidates=String(label||'').split(/[,;\/]+/).map(s=>s.trim()).filter(Boolean);
 return candidates.map(part=>matchName(part,true)?.name||null);
}
function shouldDeferReminder(row,date=today()){
 const person=String(row.agent||'').trim();
 if(!person)return false;
 const matches=linkedAgents(person).filter(Boolean);
 if(!matches.length)return false;
 return matches.every(name=>isAbsent(name,date));
}
function auditAssignments(text,date=today()){
 const errors=[],rows=[];
 const source=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 for(const line of source){
  const m=line.match(/^\s*(E\d{2,3})\s*[:;|\-–]\s*(.+)$/i);
  if(!m){errors.push(line);continue}
  const post=m[1].toUpperCase(),names=m[2].split(/[,;\/]+/).map(x=>x.trim()).filter(Boolean);
  const absent=[],present=[],unknown=[];
  for(const raw of names){
   const match=matchName(raw,true);
   if(!match){unknown.push(raw);continue}
   if(isAbsent(match.name,date))absent.push({name:match.name,returnDate:expectedReturn(match.name,date),absence:findFor(match.name,date)});
   else present.push(match.name);
  }
  rows.push({post,absent,present,unknown});
 }
 return {rows,errors,inconsistencies:rows.filter(x=>x.absent.length),unrecognized:rows.filter(x=>x.unknown.length)};
}
window.MyTeamAbsences={KEY,TYPES,STATUSES,read,saveOne,importData,validate,findFor,isAbsent,expectedReturn,active,addDays,matchName,linkedAgents,shouldDeferReminder,auditAssignments};
})();