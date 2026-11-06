/* MyTEAM — actions par appui long (700ms), menu d'édition non destructif par défaut. */
(()=>{
'use strict';
const api=window.MyTeamReboot;
if(!api)return;
const $=id=>document.getElementById(id);
const read=(key,def)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?def:v}catch{return def}};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=api.dateNow;
const TARGET='[data-long-agent],[data-long-note],[data-long-journal],[data-long-reminder-source],[data-long-cycle],[data-long-supervisors],[data-long-team],[data-long-search],#hours h2,#salary h2,#hours .card,#salary .card,[data-v-long],[data-long-absence]';
let current=null,backupPrepared=false,hold=null,suppressUntil=0;
const overlay=document.createElement('div');
overlay.id='mt-long-overlay';overlay.className='mt-long-overlay';overlay.hidden=true;
overlay.innerHTML='<div class="mt-long-shade" data-mt-close="1"></div><div class="mt-long-sheet" role="dialog" aria-modal="true" aria-label="Actions de modification"><div class="row-between"><h3 id="mt-long-title">Modifier</h3><button type="button" id="mt-long-close" class="small-button">Fermer</button></div><div id="mt-long-items"></div></div>';
document.body.append(overlay);
const editor=document.createElement('div');
editor.id='mt-edit-overlay';editor.className='mt-long-overlay';editor.hidden=true;
editor.innerHTML='<div class="mt-long-shade" data-mt-edit-close="1"></div><section class="mt-long-sheet mt-long-editor" role="dialog" aria-modal="true" aria-labelledby="mt-edit-title"><div class="row-between"><h3 id="mt-edit-title">Modifier</h3><button type="button" id="mt-edit-close" class="small-button">Fermer</button></div><div id="mt-edit-body"></div></section>';
document.body.append(editor);
function closeMenu(){overlay.hidden=true;current=null}
function closeEditor(){editor.hidden=true;$('mt-edit-body').replaceChildren()}
function choice(label,action,danger=false){return '<button type="button" data-long-action="'+esc(action)+'"'+(danger?' class="danger-option"':'')+'>'+esc(label)+'</button>'}
function activeAbsenceBanner(name){
 const abs=window.MyTeamAbsences;
 const rows=abs?.findFor?.(name,today())||[];
 if(!rows.length)return '';
 const format=date=>api.validDate(date)?api.fmtDate(date):'';
 const sections=rows.slice(0,4).map(r=>{
  const type=String(abs.TYPES?.[r.type]||'Absence');
  const dates=[
   r.start?'Du '+format(r.start):'Début non communiqué',
   r.end?'au '+format(r.end):'',
   r.returnDate?'Retour prévu le '+format(r.returnDate):'',
   !r.end&&!r.returnDate?'Date de retour non renseignée':''
  ].filter(Boolean).join(' · ');
  return '<div class="mt-agent-absence-line"><strong>'+esc(type)+'</strong><span>'+esc(dates)+'</span></div>';
 }).join('');
 return '<div class="mt-agent-absence-alert" role="status" aria-label="Agent actuellement absent">'+
  '<div class="mt-agent-absence-heading">⛔ ABSENT ACTUELLEMENT</div>'+
  sections+
  '<button type="button" data-long-action="agent-absence-open" class="mt-agent-absence-open">Voir / modifier l’absence</button></div>';
}
function selectedAgentFrom(kind,value){
 if(kind==='agent')return value;
 if(kind==='reminder'){
  const [, , who]=String(value).split('||');
  return who||'';
 }
 if(kind==='search')return value.split('||')[1]||'';
 return '';
}
function menus(kind,value){
 if(kind==='agent'){
  const archived=api.isArchived(value);
  return [
   activeAbsenceBanner(value),
   choice('Ouvrir la fiche','open-agent'),
   choice('Modifier RX, permis et dates','quals'),
   choice('Ajouter une note datée','note'),
   choice('Modifier le nom','rename'),
   choice('Changer d’équipe','team-change'),
   choice(archived?'Réactiver cet agent':'Archiver cet agent',archived?'restore':'archive'),
   choice('Supprimer définitivement (avec sauvegarde)','delete-agent',true)
  ];
 }
 if(kind==='note')return [choice('Modifier la note datée','edit-note'),choice('Confirmer rappel / alerte traité(e)','note-done')];
 if(kind==='journal')return [choice('Corriger cet événement','journal-edit'),choice('Confirmer le rappel comme fait','journal-done')];
 if(kind==='reminder'){
  const src=value.split('||')[0];
  return [
   choice('Prochain matin · 05h00','reminder-next-morning'),
   choice('Prochain après-midi · 13h00','reminder-next-afternoon'),
   choice('Prochaine nuit · 21h00','reminder-next-night'),
   choice('Choisir une autre date / heure','reminder-custom-date'),
   choice('Retirer la date prévue','reminder-clear-plan'),
   choice('Modifier / consulter','reminder-edit'),
   choice('Confirmer comme fait','reminder-done'),
    ...(src==='journal'?[choice('Voir dans le journal','reminder-open')]:[])];
 }
 if(kind==='cycle')return [
  choice('Matin (05h–13h)','cycle-m'),choice('Après-midi (13h–21h)','cycle-a'),
  choice('Nuit (21h–05h)','cycle-n'),choice('Repos','cycle-r'),choice('Revenir au cycle théorique','cycle-reset')];
 if(kind==='supervisors')return [choice('Modifier la rotation des superviseurs','sup-edit')];
 if(kind==='team')return [choice('Consulter les agents de cette équipe','team-open')];
 if(kind==='hours')return [choice('Saisir ou corriger une vacation','hours-edit')];
 if(kind==='salary')return [choice('Modifier les paramètres de salaire','salary-edit')];
 if(kind==='visit')return [choice('Corriger ce passage / rapport','visit-edit')];
 if(kind==='absence')return [choice('Modifier cette absence','absence-edit'),choice('Afficher l’historique des corrections','absence-history')];
 if(kind==='search')return [choice('Ouvrir la fiche / l’événement','search-open')];
 return [];
}
function openMenu(kind,value){
 const m=menus(kind,value);if(!m.length)return;
 closeEditor();
 current={kind,value};
 $('mt-long-title').textContent={
  agent:'Agent · '+value,note:'Historique personnel',journal:'Journal de vacation',reminder:'Rappel daté',
  cycle:'Vacations du '+api.fmtDate(value),supervisors:'Superviseurs',team:'Équipe '+value,
  hours:'Mes heures',salary:'Salaire',search:'Historique',visit:'Rapport ou passage',absence:'Absence agent'
 }[kind]||'Modifier';
 $('mt-long-items').innerHTML=m.join('');
 overlay.hidden=false;
 try{navigator.vibrate?.(20)}catch{}
 $('mt-long-close').focus();
}
function resolveTarget(target){
 const t=target.closest?.(TARGET);if(!t)return null;
 if(t.matches('input,textarea,select'))return null;
 if(t.hasAttribute('data-long-agent'))return {kind:'agent',value:t.dataset.longAgent};
 if(t.hasAttribute('data-long-note'))return {kind:'note',value:t.dataset.longNote};
 if(t.hasAttribute('data-long-journal'))return {kind:'journal',value:t.dataset.longJournal};
 if(t.hasAttribute('data-long-reminder-source'))return {kind:'reminder',value:[t.dataset.longReminderSource,t.dataset.longReminderId,t.dataset.longReminderAgent].join('||')};
 if(t.hasAttribute('data-long-cycle'))return {kind:'cycle',value:t.dataset.longCycle};
 if(t.hasAttribute('data-long-supervisors'))return {kind:'supervisors',value:''};
 if(t.hasAttribute('data-long-team'))return {kind:'team',value:t.dataset.longTeam};
 if(t.hasAttribute('data-long-search'))return {kind:'search',value:[t.dataset.longSearch,t.dataset.longSearchAgent].join('||')};
 if(t.hasAttribute('data-v-long'))return {kind:'visit',value:t.dataset.vLong};
 if(t.hasAttribute('data-long-absence'))return {kind:'absence',value:t.dataset.longAbsence};
 if(t.closest('#hours'))return {kind:'hours',value:''};
 if(t.closest('#salary'))return {kind:'salary',value:''};
 return null;
}
document.addEventListener('pointerdown',e=>{
 if(e.button!==0||!overlay.hidden||!editor.hidden)return;
 const dest=resolveTarget(e.target);
 if(!dest)return;
 const token={x:e.clientX,y:e.clientY,dest,triggered:false};
 hold=token;
 token.timer=setTimeout(()=>{if(hold!==token)return;token.triggered=true;suppressUntil=Date.now()+700;openMenu(dest.kind,dest.value)},700);
}, {passive:true});
function stopHold(){if(hold){clearTimeout(hold.timer);hold=null}}
document.addEventListener('pointermove',e=>{if(hold&&(Math.abs(e.clientX-hold.x)>12||Math.abs(e.clientY-hold.y)>12))stopHold()},{passive:true});
document.addEventListener('pointerup',stopHold,{passive:true});
document.addEventListener('pointercancel',stopHold,{passive:true});
document.addEventListener('scroll',stopHold,{passive:true});
document.addEventListener('click',e=>{if(Date.now()<suppressUntil){if(e.target.closest(TARGET)){e.preventDefault();e.stopImmediatePropagation()}}},true);
document.addEventListener('contextmenu',e=>{const dest=resolveTarget(e.target);if(dest){e.preventDefault();stopHold();suppressUntil=Date.now()+700;openMenu(dest.kind,dest.value)}});
$('mt-long-close').onclick=closeMenu;
overlay.addEventListener('click',e=>{if(e.target.closest('[data-mt-close]'))closeMenu()});
$('mt-edit-close').onclick=closeEditor;
editor.addEventListener('click',e=>{if(e.target.closest('[data-mt-edit-close]'))closeEditor()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closeEditor()}});
function saveProfile(name,values){
 const p=api.profiles(),a=api.agent(name,true);
 if(!a)return false;
 const key=Object.keys(p).find(k=>api.same(k,a.name))||a.name;
 p[key]={...(p[key]||{}),...values,manualAdded:true};
 try{localStorage.setItem('myteam_agent_profiles_v1',JSON.stringify(p));api.renderAgents();api.renderPlanning();return true}catch{return false}
}
function changeTeam(name){
 const a=api.agent(name,true);if(!a)return;
 const raw=prompt('Nouvelle équipe pour '+a.name+' (0 = non attribuée, 1, 2, 3 ou 4) :',String(a.team||0));
 if(raw===null)return;
 if(!/^[0-4]$/.test(raw.trim())){alert('Choisis un nombre de 0 à 4.');return}
 if(saveProfile(name,{team:Number(raw)})){api.openAgent(name);alert('Équipe mise à jour. Historique conservé.')}
 else alert('Modification impossible.');
}
function archivedAgent(name){
 const departure=prompt('Date de départ / archivage (AAAA-MM-JJ) :',today());
 if(departure===null)return;
 if(!api.validDate(departure)){alert('Date incorrecte.');return}
 if(!confirm('Archiver '+name+' ? Son historique restera consultable.'))return;
 if(api.archiveAgent(name,departure)){api.activate('team');$('agent-status-filter').value='active';api.renderAgents()}
 else alert('Archivage impossible.');
}
function renamedAgent(name){
 const next=prompt('Modifier le nom de '+name+' :',name);
 if(next===null||next.trim()===name)return;
 if(!confirm('Confirmer le changement de nom ? Les notes déjà enregistrées seront transférées.'))return;
 if(api.renameAgent(name,next)){api.openAgent(next.trim().replace(/\s+/g,' '))}
 else alert('Nom invalide ou déjà utilisé.');
}
function removeAgent(name){
 if(!backupPrepared){alert('Par précaution, télécharge d’abord la sauvegarde de tes données dans Accueil → Sauvegarde et données privées. Ensuite refais un appui long.');api.activate('home');document.querySelector('.backup-card')?.setAttribute('open','');return}
 if(!confirm('SUPPRESSION DÉFINITIVE de '+name+' ? Ses notes personnelles et qualifications seront supprimées de cet appareil.'))return;
 if(!confirm('Dernière confirmation : es-tu certain de vouloir effacer sa fiche et ses notes personnelles ?'))return;
 if(api.deleteAgent(name)){alert('Fiche supprimée.');api.activate('team')}
 else alert('Suppression impossible.');
}
document.addEventListener('click',e=>{if(e.target.id==='export-data')backupPrepared=true},true);
$('agent-manage')?.addEventListener('click',()=>{const name=api.selected();if(name)openMenu('agent',name)});
function editExternal(source,id){
 const k=source==='manual'?'myteam_manual_reminders_v1':source==='context'?'myteam_agent_context_reminders_v1':'';
 if(!k)return;
 const rows=read(k,[]);
 if(!Array.isArray(rows))return;
 const idx=rows.findIndex((r,i)=>r&&String(r.id??i)===String(id));
 if(idx<0)return;
 const row=rows[idx];
 const value=prompt('Modifier le texte du rappel :',row.title||row.text||row.description||'');
 if(value===null)return;
 if(!value.trim())return alert('Le texte ne peut pas être vide.');
 const data={...row};
 if(source==='manual')data.title=value.trim().slice(0,120);
 else data.text=value.trim().slice(0,500);
 if(source==='manual'){
  const d=prompt('Date du rappel (AAAA-MM-JJ) :',data.date||today());
  if(d===null)return;
  if(!api.validDate(d))return alert('Date invalide.');
  data.date=d;
 }
 data.updatedAt=new Date().toISOString();
 rows[idx]=data;
 try{localStorage.setItem(k,JSON.stringify(rows));api.renderHome()}catch{alert('Modification non enregistrée.')}
}
/* Planification indépendante de l'échéance réelle : ne marque jamais un rappel fait. */
const REMINDER_PLAN_KEY='myteam_reminder_plans_v1';
const planIndex=(source,id,who)=>JSON.stringify([source,String(id),who||'']);
function nextShift(kind,from=new Date()){
 const slots={morning:{code:0,time:'05:00'},afternoon:{code:1,time:'13:00'},night:{code:2,time:'21:00'}};
 const wanted=slots[kind];if(!wanted)return null;
 const anchor=Date.UTC(2026,9,25),y=from.getFullYear(),m=from.getMonth(),day=from.getDate();
 for(let delta=0;delta<24;delta++){
  const date=new Date(y,m,day+delta),diff=Math.round((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-anchor)/86400000);
  const phase=((diff%8)+8)%8,override=read('myteam_team_cycle_overrides_v1',{})||{};
  const label=override[[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')];
  const slot=['m','a','n','r'].includes(label)?{m:0,a:1,n:2,r:3}[label]:phase<2?0:phase<4?1:phase<6?2:3;
  if(slot!==wanted.code)continue;
  const [hh,mm]=wanted.time.split(':').map(Number);
  const candidate=new Date(date.getFullYear(),date.getMonth(),date.getDate(),hh,mm,0,0);
  if(candidate.getTime()>from.getTime()){
   const iso=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
   return {date:iso,time:wanted.time};
  }
 }
 return null;
}
function setReminderPlan(raw,slot){
 const [source,id,...agentParts]=raw.split('||'),who=agentParts.join('||');
 if(!source||!id)return;
 if(slot&&who&&window.MyTeamAbsences?.isAbsent?.(who,slot.date)){
  const ret=window.MyTeamAbsences?.expectedReturn?.(who,slot.date);
  alert('Agent absent à cette date'+(ret?' (retour prévu le '+api.fmtDate(ret)+')':'')+'. Choisis une date après son retour.');return;
 }
 const all=read(REMINDER_PLAN_KEY,{});
 const plans=all&&typeof all==='object'&&!Array.isArray(all)?all:{};
 const key=planIndex(source,id,who),previous=plans[key];
 if(slot){
  plans[key]={date:slot.date,time:slot.time,updatedAt:new Date().toISOString(),
    history:[...(Array.isArray(previous?.history)?previous.history:[]),
      ...(previous?.date?[{date:previous.date,time:previous.time,changedAt:new Date().toISOString()}]:[])]};
 }else delete plans[key];
 try{
  localStorage.setItem(REMINDER_PLAN_KEY,JSON.stringify(plans));
  api.renderHome();
  window.MyTeamAlertScheduler?.render?.();
  window.dispatchEvent(new Event('myteam-reminder-planned'));
 }catch{alert('Impossible de conserver la date prévue sur ce téléphone.');return}
 const info=slot?'Date prévue : '+api.fmtDate(slot.date)+' à '+slot.time+'. Le rappel reste à faire.':'Date prévue supprimée. Le rappel reste à faire.';
 const visible=document.createElement('div');visible.setAttribute('role','status');visible.className='mt-reminder-confirmation';visible.textContent=info;
 document.body.append(visible);setTimeout(()=>visible.remove(),4000);
}
function chooseReminderDate(raw){
 closeEditor();
 $('mt-edit-title').textContent='Quand prévois-tu de le faire ?';
 $('mt-edit-body').innerHTML='<form id="mt-plan-form"><p class="hint">La date prévue est différente de la date limite. Le rappel restera ouvert jusqu’à confirmation.</p>'+
 '<label>Date prévue<input name="date" type="date" required></label>'+
 '<label>Heure<input name="time" type="time" required></label>'+
 '<button type="submit" class="primary">Enregistrer la date prévue</button>'+
 '<p id="mt-plan-form-status" class="hint" role="status"></p></form>';
 const [source,id,...who]=raw.split('||');
 const all=read(REMINDER_PLAN_KEY,{}),current=all?.[planIndex(source,id,who.join('||'))];
 const f=$('mt-plan-form'),now=api.dateNow();
 f.elements.date.value=current?.date||now;f.elements.time.value=current?.time||'08:00';
 f.addEventListener('submit',e=>{
  e.preventDefault();const date=f.elements.date.value,time=f.elements.time.value;
  if(!api.validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){$('mt-plan-form-status').textContent='Date ou heure invalide.';return}
  setReminderPlan(raw,{date,time});closeEditor();
 });
 editor.hidden=false;
}
function reminderAction(action,raw){
 if(action==='reminder-next-morning'||action==='reminder-next-afternoon'||action==='reminder-next-night'){
  const kind=action.slice('reminder-next-'.length);
  let slot=nextShift(kind);
  const [src,rid,...parts]=raw.split('||'),who=parts.join('||');
  if(slot&&who&&window.MyTeamAbsences?.isAbsent?.(who,slot.date)){
   const ret=window.MyTeamAbsences?.expectedReturn?.(who,slot.date);
   if(!ret){alert('Agent absent : date de retour non renseignée. Planifie le rappel seulement après sa confirmation.');return}
   const when=new Date(ret+'T00:00:00');when.setMinutes(when.getMinutes()-1);
   slot=nextShift(kind,when);
  }
  if(slot)setReminderPlan(raw,slot);else alert('Aucune vacation correspondante trouvée dans le cycle.');
  return;
 }
 if(action==='reminder-custom-date')return chooseReminderDate(raw);
 if(action==='reminder-clear-plan')return setReminderPlan(raw,null);
 const [source,id,who]=raw.split('||');
 if(source==='journal'){
  const j=window.MyTeamJournal,record=j?.get(id);
  if(!record)return;
  if(action==='reminder-done')j.markDone(id);
  else if(action==='reminder-edit'){j.openJournal(id);j.openForm(record);}
  else j.openJournal(id);
  return;
 }
 if(source==='case'||source==='general'){
  const found=api.findNote(id);
  if(!found)return;
  if(action==='reminder-done')api.markDone(id);
  else api.openComposer(found.agent,found.note);
  return;
 }
 if(source==='manual'||source==='context'){
  if(action==='reminder-done')api.markExternalDone(source,id);
  else editExternal(source,id);
 }
}
function setCycle(date,mode){
 const k='myteam_team_cycle_overrides_v1';
 const obj=read(k,{});
 if(!obj||typeof obj!=='object'||Array.isArray(obj))return;
 if(mode==='reset')delete obj[date];else obj[date]=mode;
 try{localStorage.setItem(k,JSON.stringify(obj));api.renderPlanning()}catch{alert('Modification impossible.')}
}
function editHours(){
 closeEditor();
 $('mt-edit-title').textContent='Corriger mes heures';
 const body=$('mt-edit-body');
 body.innerHTML='<p class="hint">Choisis une journée et, si des heures existent déjà, modifie la ligne existante plutôt que d’en créer une seconde.</p>'+
 '<form id="mt-hours-edit-form"><label>Date<input name="date" type="date" required value="'+today()+'"></label>'+
 '<label>Ligne enregistrée<select name="entry"></select></label>'+
 '<div class="form-grid"><label>Début<input name="start" type="time" required></label><label>Fin<input name="end" type="time" required></label></div>'+
 '<label>Poste / motif<input name="post" maxlength="90" placeholder="Ex. Chef d’équipe"></label>'+
 '<button type="submit" class="primary">Enregistrer la vacation</button><p id="mt-hours-edit-status" class="hint"></p></form>';
 const f=$('mt-hours-edit-form'),data=()=>{const v=read('myteam_shifts',[]);return Array.isArray(v)?v:[]};
 function sync(){
  const d=f.elements.date.value,rows=data();
  const ids=rows.map((r,i)=>({r,i})).filter(x=>x.r?.date===d);
  f.elements.entry.innerHTML='<option value="new">Nouvelle ligne</option>'+ids.map(x=>'<option value="'+x.i+'">'+esc(x.r.start+'–'+x.r.end+' '+(x.r.post||''))+'</option>').join('');
  f.elements.entry.value=ids.length?String(ids[0].i):'new';
  loadChoice();
 }
 function loadChoice(){
  const idx=Number(f.elements.entry.value);
  const row=f.elements.entry.value==='new'?null:data()[idx];
  f.elements.start.value=row?.start||'05:00';
  f.elements.end.value=row?.end||'13:00';
  f.elements.post.value=row?.post||'';
 }
 f.elements.date.addEventListener('change',sync);f.elements.entry.addEventListener('change',loadChoice);
 f.addEventListener('submit',e=>{
  e.preventDefault();
  const date=f.elements.date.value,start=f.elements.start.value,end=f.elements.end.value,post=f.elements.post.value.trim();
  if(!api.validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||start===end)return $('mt-hours-edit-status').textContent='Date ou horaires invalides.';
  const rows=data(),oldIndex=f.elements.entry.value==='new'?-1:Number(f.elements.entry.value);
  if(oldIndex<0&&rows.some(r=>r.date===date)){
   if(!confirm('Une vacation existe déjà à cette date. Ajouter une deuxième ligne peut compter deux fois les heures. Confirmer ?'))return;
  }
  const type=Number(start.slice(0,2))>=20||Number(start.slice(0,2))<4?'night':Number(start.slice(0,2))>=12?'afternoon':'morning';
  const next={date,start,end,post,type,source:'correction manuelle',updatedAt:new Date().toISOString()};
  const histKey='myteam_hours_manual_edit_history_v1',hist=read(histKey,[]);
  const history=Array.isArray(hist)?hist:[];
  if(oldIndex>=0&&rows[oldIndex]){
   history.push({changedAt:new Date().toISOString(),before:rows[oldIndex],after:next});
   rows[oldIndex]={...rows[oldIndex],...next};
  }else rows.push(next);
  try{
   localStorage.setItem('myteam_shifts',JSON.stringify(rows));
   localStorage.setItem(histKey,JSON.stringify(history));
   window.MyTeamRenderHours?.();window.MyTeamRenderSalary?.();
   window.dispatchEvent(new Event('myteam-planning-updated'));
   $('mt-hours-edit-status').textContent='Vacation enregistrée. Les heures et la prévision de salaire ont été recalculées.';
   sync();
  }catch{$('mt-hours-edit-status').textContent='Enregistrement impossible.'}
 });
 sync();editor.hidden=false;
}
function editSalary(){
 closeEditor();
 const month=today().slice(0,7);
 $('mt-edit-title').textContent='Paramètres de salaire';
 const body=$('mt-edit-body');
 body.innerHTML='<p class="hint">Corrige les montants de référence. Le salaire réel est stocké séparément de l’estimation.</p>'+
 '<form id="mt-salary-edit-form">'+
 '<label>Salaire de base net de référence (€)<input name="base" type="number" min="1" max="10000" step="0.01" required></label>'+
 '<label>Taux horaire congé (€)<input name="leave" type="number" min="0" max="100" step="0.0001" required></label>'+
 '<label>Mois du salaire réel<input name="month" type="month" value="'+month+'"></label>'+
 '<label>Net réel constaté (€ — facultatif)<input name="actual" type="number" min="0" max="20000" step="0.01"></label>'+
 '<button type="submit" class="primary">Enregistrer et recalculer</button><p class="hint" id="mt-salary-edit-status"></p></form>';
 const f=$('mt-salary-edit-form');f.elements.base.value=String(localStorage.getItem('myteam_salary_base_net_v1')||2925.42);
 f.elements.leave.value=String(localStorage.getItem('myteam_salary_leave_rate_v1')||4.0789);
 const fillActual=()=>{const data=read('myteam_salary_actuals',{});f.elements.actual.value=data?.[f.elements.month.value]?.net??''};
 f.elements.month.addEventListener('change',fillActual);fillActual();
 f.addEventListener('submit',e=>{
  e.preventDefault();const base=Number(f.elements.base.value),leave=Number(f.elements.leave.value),month=f.elements.month.value,actual=f.elements.actual.value;
  if(!Number.isFinite(base)||base<=0||base>=10000||!Number.isFinite(leave)||leave<0||leave>100)return;
  const existing=read('myteam_salary_actuals',{}),data=existing&&typeof existing==='object'&&!Array.isArray(existing)?existing:{};
  if(actual!==''){
   if(!/^\d{4}-\d\d$/.test(month)||!Number.isFinite(Number(actual))||Number(actual)<0)return;
   data[month]={...(data[month]||{}),net:Number(actual),source:'Paie réelle saisie manuellement',updatedAt:new Date().toISOString()};
  }
  try{
   localStorage.setItem('myteam_salary_base_net_v1',String(base));
   localStorage.setItem('myteam_salary_leave_rate_v1',String(leave));
   if(actual!=='')localStorage.setItem('myteam_salary_actuals',JSON.stringify(data));
   window.MyTeamRenderSalary?.();
   $('mt-salary-edit-status').textContent='Paramètres enregistrés. Le salaire prévisionnel a été recalculé.';
  }catch{$('mt-salary-edit-status').textContent='Enregistrement impossible.'}
 });
 editor.hidden=false;
}
function act(action){
 if(!current)return;
 const {kind,value}=current;
 closeMenu();
 if(action==='agent-absence-open'){
  const record=window.MyTeamAbsences?.findFor?.(value,today())?.[0];
  if(record)window.MyTeamAbsencesUI?.open?.(record);
  return;
 }
 if(action==='open-agent')return api.openAgent(value);
 if(action==='quals'){api.openAgent(value);$('qualification-form')?.scrollIntoView({behavior:'smooth',block:'center'});return}
 if(action==='note')return api.openComposer(value);
 if(action==='rename')return renamedAgent(value);
 if(action==='team-change')return changeTeam(value);
 if(action==='archive')return archivedAgent(value);
 if(action==='restore'){if(confirm('Réactiver cet agent ?')){api.restoreAgent(value);api.openAgent(value)}return}
 if(action==='delete-agent')return removeAgent(value);
 if(action==='edit-note'){const r=api.findNote(value);if(r)return api.openComposer(r.agent,r.note)}
 if(action==='note-done')return api.markDone(value);
 if(action==='journal-edit'){const j=window.MyTeamJournal;return j?.openForm?.(j.get(value))}
 if(action==='journal-done')return window.MyTeamJournal?.markDone?.(value);
 if(action.startsWith('reminder-'))return reminderAction(action,value);
 if(action.startsWith('cycle-'))return setCycle(value,action.slice(6));
 if(action==='sup-edit'){api.showSupervisors();$('mt-sup-config')?.click();return}
 if(action==='team-open'){api.activate('team');$('agent-filter').value=value;api.renderAgents();return}
 if(action==='hours-edit')return editHours();
 if(action==='salary-edit')return editSalary();
 if(action==='visit-edit'){const v=window.MyTeamVisitsCore?.visits?.().find(x=>x.id===value);if(v)window.MyTeamVisits?.openForm?.(v.kind,[],v.id);return}
 if(action==='absence-edit'){
  const v=window.MyTeamAbsences?.read?.().find(x=>x.id===value);
  if(v)window.MyTeamAbsencesUI?.open?.(v);
  return;
 }
 if(action==='absence-history'){
  const v=window.MyTeamAbsences?.read?.().find(x=>x.id===value);
  if(!v)return;
  closeEditor();
  $('mt-edit-title').textContent='Corrections · '+v.agent;
  const container=$('mt-edit-body');
  const revisions=Array.isArray(v.revisions)?v.revisions:[];
  container.innerHTML=revisions.length?'<div class="hint">Versions antérieures conservées : '+revisions.length+'</div>'+
   revisions.slice().reverse().map((r,i)=>'<div class="legacy-entry"><small>'+api.fmtDate(r.changedAt?.slice(0,10))+'</small><p>'+esc(r.previous?.type||'')+' · '+esc(r.previous?.start||'')+' au '+esc(r.previous?.end||'')+' · Retour '+esc(r.previous?.returnDate||'non renseigné')+'</p></div>').join(''):
    '<p class="hint">Aucune correction antérieure.</p>';
  editor.hidden=false;return;
 }
 if(action==='search-open'){
  const [id,name]=value.split('||');
  if(name&&api.agent(name,true))api.openAgent(name);
  else if(window.MyTeamJournal?.get(id))window.MyTeamJournal.openJournal(id);
 }
}
window.MyTeamReminderPlanner={nextShift,setReminderPlan,planIndex};
$('mt-long-items').addEventListener('click',e=>{const b=e.target.closest('[data-long-action]');if(b)act(b.dataset.longAction)});
})();