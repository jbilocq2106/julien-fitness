/* MyTEAM — Journal de vacation, historique privé et rappels datés.
 * Aucun enregistrement nominatif n'est envoyé à GitHub.
 * Une correction conserve la version antérieure.
 */
(()=>{
'use strict';
const KEY='myteam_vacation_journal_v1', $=id=>document.getElementById(id);
const view=$('journal'),form=$('journal-form');
if(!view||!form)return;
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const iso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dateValid=s=>/^\d{4}-\d\d-\d\d$/.test(String(s||''))&&new Date(s+'T12:00:00').getDate()===Number(String(s).slice(8));
const label=s=>dateValid(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'Date non renseignée';
const categories={planning:'Changement de planning',event:'Événement de service',call:'Appel / mail',extra:'Extra / remplacement',other:'Information'};
const uid=()=> 'jv-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
let editing='',showAll=false;
const refs={date:$('journal-date'),search:$('journal-search'),filter:$('journal-filter'),list:$('journal-results'),status:$('journal-form-status')};
function notify(){
 window.dispatchEvent(new Event('myteam-journal-updated'));
 window.MyTeamReboot?.renderHome?.();
}
function save(rows){
 localStorage.setItem(KEY,JSON.stringify(rows));
 notify();
 return true;
}
const byDate=(a,b)=>String(b.date).localeCompare(String(a.date))||String(b.time||'').localeCompare(String(a.time||'') )||String(b.createdAt||'').localeCompare(String(a.createdAt||''));
function historicalEntries(){
 const out=[];
 const fromBoard=(key,source)=>{
  let data={};try{data=JSON.parse(localStorage.getItem(key)||'{}')}catch{return}
  if(!data||typeof data!=='object'||Array.isArray(data))return;
  for(const [day,events] of Object.entries(data)){
   if(!Array.isArray(events))continue;
   for(const [i,x] of events.entries()){
    if(!x||typeof x!=='object')continue;
    const description=[x.title,x.description,x.text].filter(Boolean).join(' · ').trim();
    if(!description)continue;
    out.push({id:'old-'+key+'-'+day+'-'+i,legacy:true,source,date:dateValid(day)?day:x.date||'',
     category:/planning/i.test(String(x.category||x.type||''))?'planning':'event',post:x.post||'',
     agents:x.agent||x.agents||'',description});
   }
  }
 };
 fromBoard('myteam-board-events-v1','Historique antérieur');
 fromBoard('myteam-board-actions-v1','Anciennes actions');
 const old=(()=>{try{return JSON.parse(localStorage.getItem('myteam_main_courante_v1')||'[]')}catch{return []}})();
 if(Array.isArray(old))old.forEach((x,i)=>{
  if(!x||typeof x!=='object')return;
  const description=[x.title,x.description,x.text].filter(Boolean).join(' · ').trim();
  if(description)out.push({id:'old-main-'+i,legacy:true,source:'Historique antérieur',date:x.date||'',
   category:/planning/i.test(String(x.category||x.type||''))?'planning':'event',
   post:x.post||'',agents:x.agent||x.agents||'',description});
 });
 return out;
}
function entryHTML(row){
 if(row.legacy)return '<article class="journal-entry"><small>Archive en lecture seule · '+esc(row.source||'Ancien suivi')+' · '+esc(label(row.date))+'</small><p>'+esc(row.description||'')+'</p>'+(row.post?'<small>Poste '+esc(row.post)+'</small>':'')+(row.agents?'<small> · '+esc(row.agents)+'</small>':'')+'</article>';
 const remind=row.hasReminder&&dateValid(row.due);
 const state=remind?(row.done?'Terminé':'À faire'):'';
 const agents=String(row.agents||'').trim();
 return '<article class="journal-entry" data-long-journal="'+esc(row.id)+'">'+
 '<div class="row-between"><strong>'+esc(categories[row.category]||categories.other)+'</strong><small>'+esc(label(row.date))+(row.time?' · '+esc(row.time):'')+'</small></div>'+
 '<p>'+esc(row.description||'')+'</p>'+
 '<div class="journal-meta">'+(row.post?'<span>Poste '+esc(row.post)+'</span>':'')+
 (agents?'<span>'+esc(agents)+'</span>':'')+
 (row.category==='planning'&&dateValid(row.effectiveDate)?'<span>Application '+esc(label(row.effectiveDate))+'</span>':'')+'</div>'+
 (remind?'<div class="journal-reminder '+(row.done?'is-done':'is-pending')+'">'+
 '<span>'+(row.done?'Rappel effectué':'Rappel à faire')+' · '+esc(label(row.due))+(row.dueTime?' à '+esc(row.dueTime):'')+'</span>'+
 '<div>'+esc(row.reminderText||row.description||'')+'</div>'+
 (row.done?'<small>Confirmé le '+esc(label(row.doneAt?.slice(0,10)))+'</small>':'')+
 '</div>':'')+
 (Array.isArray(row.revisions)&&row.revisions.length?'<details class="note-versions"><summary>'+row.revisions.length+' modification(s) conservée(s)</summary>'+
 row.revisions.slice().reverse().map(old=>'<div class="legacy-entry"><small>'+esc(old.changedAt?.slice(0,16)||'Correction')+'</small><p>'+esc(old.description||'')+'</p></div>').join('')+'</details>':'')+
 '<div class="journal-actions"><button type="button" data-journal-edit="'+esc(row.id)+'">Modifier</button>'+
 (remind&&!row.done?'<button type="button" data-journal-done="'+esc(row.id)+'">Confirmer le rappel</button>':'')+
 '</div></article>';
}
function render(){
 const rows=[...read(),...historicalEntries()];
 const q=norm(refs.search.value.trim()),kind=refs.filter.value,day=refs.date.value;
 const filtered=rows.filter(r=>{
  if(!showAll&&day!==r.date)return false;
  if(kind==='pending'&&!(r.hasReminder&&r.due&&!r.done))return false;
  if(kind!=='pending'&&kind!=='all'&&r.category!==kind)return false;
  return !q||norm([r.description,r.agents,r.post,r.date,r.effectiveDate,r.reminderText,r.due].join(' ')).includes(q);
 }).sort(byDate);
 $('journal-show-all').textContent=showAll?'Afficher une journée':'Tout l’historique';
 refs.list.innerHTML=filtered.length?filtered.map(entryHTML).join(''):'<p class="empty">Aucun événement pour cette sélection. Utilise « + Ajouter » pour noter un changement ou un rappel.</p>';
 const count=read().filter(r=>r.hasReminder&&dateValid(r.due)&&r.done!==true).length;
 const labelCount=$('journal-pending-count');if(labelCount)labelCount.textContent=String(count);
}
function updateReminderVisibility(){
 const on=form.elements.hasReminder.checked;
 $('journal-reminder-fields').classList.toggle('hidden',!on);
 form.elements.due.required=on;
}
function resetForm(){
 editing='';
 form.reset();form.elements.date.value=iso();
 refs.status.textContent='';
 form.elements.category.value='event';
 $('journal-form-title').textContent='Nouvel événement';
 updateReminderVisibility();
}
function openForm(row=null){
 window.MyTeamReboot?.activate?.('journal');
 resetForm();
 if(row){
  editing=row.id;
  $('journal-form-title').textContent='Modifier cet événement';
  for(const key of ['date','time','post','agents','effectiveDate','description','due','dueTime','reminderText'])form.elements[key].value=row[key]||'';
  form.elements.category.value=categories[row.category]?row.category:'other';
  form.elements.hasReminder.checked=Boolean(row.hasReminder);
  updateReminderVisibility();
  refs.status.textContent='L’ancienne version sera conservée dans l’historique des corrections.';
 }
 form.classList.remove('hidden');
 form.scrollIntoView({behavior:'smooth',block:'start'});
}
function onSave(e){
 e.preventDefault();
 const f=e.currentTarget;
 const cat=f.elements.category.value;
 const date=f.elements.date.value,time=f.elements.time.value;
 const due=f.elements.due.value,hasReminder=f.elements.hasReminder.checked;
 const desc=f.elements.description.value.trim();
 if(!categories[cat]||!dateValid(date)||!desc){refs.status.textContent='Renseigne une date valide, une catégorie et une description.';return}
 if(hasReminder&&!dateValid(due)){refs.status.textContent='Un rappel doit avoir une date d’échéance valide.';return}
 const effective=f.elements.effectiveDate.value;
 if(effective&&!dateValid(effective)){refs.status.textContent='Date d’application incorrecte.';return}
 const now=new Date().toISOString();
 const entry={category:cat,date,time,post:String(f.elements.post.value).trim().slice(0,30),
  agents:String(f.elements.agents.value).trim().slice(0,250),effectiveDate:cat==='planning'?effective:'',
  description:desc.slice(0,3000),hasReminder,due:hasReminder?due:'',dueTime:hasReminder?f.elements.dueTime.value:'',
  reminderText:hasReminder?String(f.elements.reminderText.value).trim().slice(0,220):''};
 const rows=read();
 if(editing){
  const i=rows.findIndex(r=>r.id===editing);
  if(i<0){refs.status.textContent='Événement introuvable : aucune modification faite.';return}
  const old=rows[i];
  const revised={...old,...entry,updatedAt:now,
   revisions:[...(Array.isArray(old.revisions)?old.revisions:[]),
    {category:old.category,date:old.date,time:old.time,post:old.post,agents:old.agents,effectiveDate:old.effectiveDate,
     description:old.description,due:old.due,reminderText:old.reminderText,done:old.done,changedAt:now}]};
  // Un rappel déjà confirmé ne redevient pas ouvert par une simple correction.
  if(!hasReminder){revised.done=false;delete revised.doneAt}
  rows[i]=revised;
 }else{
  rows.push({id:uid(),createdAt:now,done:false,...entry});
 }
 try{
  save(rows);
  refs.date.value=date;
  showAll=false;
  render();
  resetForm();
  form.classList.add('hidden');
 }catch(err){refs.status.textContent='Enregistrement impossible : '+(err.message||'Stockage indisponible')}
}
function markDone(id){
 const rows=read(),idx=rows.findIndex(r=>r.id===id);
 if(idx<0||!rows[idx].hasReminder||rows[idx].done)return;
 if(!confirm('Confirmer que le rappel a réellement été effectué ?'))return;
 rows[idx]={...rows[idx],done:true,doneAt:new Date().toISOString()};
 try{save(rows);render()}catch{alert('Enregistrement impossible sur cet appareil.')}
}
function get(id){return read().find(r=>r.id===id)||null}
function setForDate(date){
 if(!dateValid(date))return;
 refs.date.value=date;showAll=false;render();
}
function openJournal(id=''){
 window.MyTeamReboot?.activate?.('journal');
 if(id){const event=get(id);if(event){setForDate(event.date);document.querySelector('[data-long-journal="'+id+'"]')?.scrollIntoView({behavior:'smooth',block:'center'})}}
}
$('journal-new').addEventListener('click',()=>openForm());
$('journal-cancel').addEventListener('click',()=>{resetForm();form.classList.add('hidden')});
$('journal-show-all').addEventListener('click',()=>{showAll=!showAll;render()});
refs.date.addEventListener('change',()=>{showAll=false;render()});
refs.search.addEventListener('input',()=>{if(refs.search.value.trim())showAll=true;render()});
refs.filter.addEventListener('change',()=>{if(refs.filter.value==='pending')showAll=true;render()});
form.elements.hasReminder.addEventListener('change',updateReminderVisibility);
form.addEventListener('submit',onSave);
refs.list.addEventListener('click',e=>{
 const edit=e.target.closest('[data-journal-edit]');
 if(edit){const row=get(edit.dataset.journalEdit);if(row)openForm(row);return}
 const done=e.target.closest('[data-journal-done]');
 if(done)markDone(done.dataset.journalDone);
});
window.MyTeamJournal={read,render,openForm,get,markDone,openJournal,setForDate};
refs.date.value=iso();resetForm();render();
})();