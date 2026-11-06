/* MyTEAM — interface des absences, import privé et contrôle de cohérence. */
(()=>{
'use strict';
const core=window.MyTeamAbsences,api=window.MyTeamReboot;if(!core||!api)return;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=$('absences');if(!page)return;
let editing='',showAll=false;
const form=$('absence-form');
function selection(){
 const opt=$('absence-agents');
 if(!opt)return;
 opt.innerHTML=api.agents(true).map(x=>'<option value="'+esc(x.name)+'"></option>').join('');
}
function sortRows(){
 return core.read().slice().sort((a,b)=>String(b.end||b.returnDate||'').localeCompare(String(a.end||a.returnDate||''))||a.agent.localeCompare(b.agent,'fr'));
}
function presentStatus(record){
 if(record.status==='requested')return 'Demandé';
 if(record.status==='accepted')return 'Accepté (non validé)';
 if(record.status==='refused')return 'Refusé';
 return record.type==='sick'?'Arrêt confirmé':'Validé';
}
function render(){
 selection();
 const dates=core.read(),now=api.dateNow(),query=api.norm($('absence-search').value);
 const active=dates.filter(x=>core.active(x,now)),future=dates.filter(x=>x.status==='confirmed'&&(x.start||x.observedAt)>now);
 $('absence-active-count').textContent=String(new Set(active.map(x=>api.norm(x.agent))).size);
 $('absence-future-count').textContent=String(new Set(future.map(x=>api.norm(x.agent))).size);
 const rows=sortRows().filter(x=>{
  if(!showAll&&x.status==='confirmed'&&!core.active(x,now)&&(x.end||x.returnDate||'')<now)return false;
  return !query||api.norm(x.agent+' '+x.type+' '+x.notes).includes(query);
 });
 $('absence-results').innerHTML=rows.length?rows.map(x=>{
  const absent=core.active(x,now),finish=x.returnDate||x.end;
  return '<div class="absence-item" data-long-absence="'+esc(x.id)+'"><div class="row-between"><strong>'+esc(x.agent)+'</strong>'+
   '<small class="'+(absent?'absence-ongoing':'')+'">'+esc(presentStatus(x))+'</small></div>'+
   '<p>'+esc(core.TYPES[x.type]||x.type)+' · '+(x.start?'Du '+api.fmtDate(x.start):'Début non communiqué')+
    (x.end?' au '+api.fmtDate(x.end):'')+(x.returnDate?' · Retour '+api.fmtDate(x.returnDate):'')+'</p>'+
   (absent?'<small class="absence-warning">Agent absent — pas de contrôle ni de rappel pendant l’absence</small>':'')+
   (x.status==='accepted'?'<small class="absence-warning">Accepté n’est pas Validé dans MyGesper</small>':'')+
   (x.notes?'<small>'+esc(x.notes)+'</small>':'')+
   '<div class="visit-actions"><button type="button" data-absence-edit="'+esc(x.id)+'">Modifier</button></div></div>';
 }).join(''):'<p class="empty">Aucune absence correspondant au filtre.</p>';
 $('absence-show-all').textContent=showAll?'Masquer les anciennes':'Tout l’historique';
 const datesFor=$('absence-audit-date').value||now;
 const todayActive=api.agents().filter(x=>core.isAbsent(x.name,datesFor));
 $('absence-day-summary').textContent=todayActive.length?todayActive.length+' agent(s) absent(s) à cette date : '+todayActive.map(x=>x.name).join(', '):
  'Aucun agent absent connu à cette date.';
}
function reset(){
 editing='';form.reset();form.elements.status.value='confirmed';form.elements.type.value='sick';form.elements.start.value=api.dateNow();
 $('absence-form-title').textContent='Nouvelle absence';
 $('absence-form-msg').textContent='Les données nominatives restent sur cet appareil.';
}
function open(row=null){
 api.activate('absences');selection();reset();
 if(row){
  editing=row.id;
  for(const key of ['agent','type','status','start','end','returnDate','notes'])if(form.elements[key])form.elements[key].value=row[key]||'';
  $('absence-form-title').textContent='Modifier une absence';
  $('absence-form-msg').textContent='L’ancienne version restera dans l’historique des modifications.';
 }
 form.classList.remove('hidden');
 form.scrollIntoView({behavior:'smooth',block:'start'});
}
function onSave(e){
 e.preventDefault();
 const f=e.currentTarget,raw={id:editing,agent:f.elements.agent.value,type:f.elements.type.value,
  status:f.elements.status.value,start:f.elements.start.value,end:f.elements.end.value,
  returnDate:f.elements.returnDate.value,notes:f.elements.notes.value};
 const existing=editing?core.read().find(r=>r.id===editing):null;
 if(existing)raw.observedAt=existing.observedAt;
 try{
  const row=core.saveOne(raw);
  form.classList.add('hidden');
  render();
  window.MyTeamVisits?.refresh?.();
  api.renderHome();
  api.renderPlanning();
  $('absence-save-status').textContent='Absence enregistrée pour '+row.agent+'.';
 }catch(err){$('absence-form-msg').textContent=err.message||'Enregistrement impossible.'}
}
function onImport(file){
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const obj=JSON.parse(String(reader.result||'')),done=core.importData(obj);
   $('absence-import-status').textContent=done.added.length+' absence(s) ajoutée(s). '+done.skipped.length+' ignorée(s).'+
    (done.skipped.length?' '+done.skipped.join(' · ').slice(0,450):'');
   render();api.renderHome();window.MyTeamVisits?.refresh?.();
  }catch(err){$('absence-import-status').textContent='Import impossible : '+err.message}
  $('absence-import-file').value='';
 };
 reader.onerror=()=>{$('absence-import-status').textContent='Lecture du fichier impossible.'};
 reader.readAsText(file,'utf-8');
}
function showAudit(){
 const date=$('absence-audit-date').value||api.dateNow(),txt=$('absence-audit-text').value;
 if(!core.validDate&&false)return;
 if(!api.validDate(date))return $('absence-audit-result').textContent='Date invalide.';
 const results=core.auditAssignments(txt,date),source=$('absence-audit-source').value;
 const items=results.inconsistencies.map(x=>'<div class="absence-conflict"><strong>'+esc(x.post)+' — Agent absent affecté sur '+esc(source)+'</strong>'+
  x.absent.map(a=>'<p>'+esc(a.name)+(a.returnDate?' · Retour prévu '+api.fmtDate(a.returnDate):' · Date de retour inconnue')+'</p>').join('')+'</div>');
 const notFound=results.unrecognized.map(x=>'<div class="hint"><strong>'+esc(x.post)+'</strong> : nom(s) non reconnus : '+esc(x.unknown.join(', '))+'</div>');
 $('absence-audit-result').innerHTML=
  (items.length?items.join(''):'<p class="visit-ok">Aucune affectation incompatible avec les absences enregistrées dans les lignes reconnues.</p>')+
  (notFound.length?notFound.join(''):'')+
  (results.errors.length?'<p class="hint">'+results.errors.length+' ligne(s) non comprises.</p>':'');
}
$('absence-new').addEventListener('click',()=>open());
$('absence-cancel').addEventListener('click',()=>{form.classList.add('hidden');editing=''});
$('absence-search').addEventListener('input',render);
$('absence-show-all').addEventListener('click',()=>{showAll=!showAll;render()});
$('absence-audit-date').addEventListener('change',render);
$('absence-audit-run').addEventListener('click',showAudit);
form.addEventListener('submit',onSave);
$('absence-results').addEventListener('click',e=>{
 const b=e.target.closest('[data-absence-edit]');if(!b)return;
 const row=core.read().find(x=>x.id===b.dataset.absenceEdit);if(row)open(row);
});
$('absence-import-file').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)onImport(f)});
$('absence-audit-date').value=api.dateNow();
window.MyTeamAbsencesUI={render,open,showAudit};
window.addEventListener('myteam-absences-updated',()=>{render();api.renderHome();window.MyTeamVisits?.refresh?.()});
render();
})();