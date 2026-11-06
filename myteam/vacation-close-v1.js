/* MyTEAM — Clôture de vacation, deux brouillons et deux validations séparées.
 * Le PDF est téléchargé par Android, jamais envoyé à l'employeur automatiquement.
 */
(()=>{
'use strict';
const api=window.MyTeamReboot,vis=window.MyTeamVisitsCore,pdf=window.MyTeamPdf;
if(!api||!vis||!pdf)return;
const $=id=>document.getElementById(id);
const MODE='myteam_vacation_affectations_v1',DOC='myteam_vacation_closures_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x===null?d:x}catch{return d}};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const shiftNames={morning:'Matin',afternoon:'Après-midi',night:'Nuit',other:'Autre'};
const modes={mobile:'CDE disponible pour les visites',posted:'Posté toute la vacation',partial:'Posté une partie de la vacation'};
const dateNow=api.dateNow;
function shiftNow(){const h=new Date().getHours();return h>=5&&h<13?'morning':h>=13&&h<21?'afternoon':'night'}
function initialDate(){const now=new Date();if(now.getHours()<5)now.setDate(now.getDate()-1);return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')}
const key=(date,shift)=>date+'|'+shift;
function modeOf(date,shift){const o=read(MODE,{});return object(o)?o[key(date,shift)]||null:null}
function isPosted(date,shift){return modeOf(date,shift)?.mode==='posted'}
function storeMode({date,shift,mode,post='',start='',end='',note=''}) {
 if(!api.validDate(date)||!shiftNames[shift]||!modes[mode])throw Error('Date, vacation ou affectation incorrecte.');
 if(mode!=='mobile'&&!String(post||'').trim())throw Error('Indique le poste occupé.');
 if(mode==='partial'&&(!/^\d\d:\d\d$/.test(start)||!/^\d\d:\d\d$/.test(end)||start===end))throw Error('Indique les horaires pendant lesquels tu es posté.');
 const all=read(MODE,{}),obj=object(all)?all:{},id=key(date,shift),old=obj[id],now=new Date().toISOString();
 const next={date,shift,mode,post:mode==='mobile'?'':String(post).trim().toUpperCase().slice(0,30),
  start:mode==='partial'?start:'',end:mode==='partial'?end:'',note:String(note).trim().slice(0,300),
  updatedAt:now,createdAt:old?.createdAt||now,
  revisions:[...(Array.isArray(old?.revisions)?old.revisions:[]),
   ...(old?[{changedAt:now,previous:{mode:old.mode,post:old.post,start:old.start,end:old.end,note:old.note}}]:[])]};
 obj[id]=next;
 localStorage.setItem(MODE,JSON.stringify(obj));
 window.dispatchEvent(new Event('myteam-vacation-updated'));
 return next;
}
function stored(date,shift){const all=read(DOC,{});return object(all)?all[key(date,shift)]||null:null}
function allDocs(){const x=read(DOC,{});return object(x)?x:{}}
function saveDocs(date,shift,payload){
 const all=allDocs();
 all[key(date,shift)]=payload;
 localStorage.setItem(DOC,JSON.stringify(all));
 window.dispatchEvent(new Event('myteam-closure-updated'));
}
function fmt(date){return api.validDate(date)?api.fmtDate(date):'Date inconnue'}
function shiftHours(shift){return {morning:'05h00–13h00',afternoon:'13h00–21h00',night:'21h00–05h00',other:'horaires variables'}[shift]||''}
function facts(date,shift){
 const a=modeOf(date,shift),reports=vis.visits().filter(x=>x.date===date&&x.shift===shift).slice().sort((x,y)=>String(x.time||'').localeCompare(String(y.time||'')));
 const journals=read('myteam_vacation_journal_v1',[]);
 const logs=Array.isArray(journals)?journals.filter(x=>x.date===date).sort((x,y)=>String(x.time||'').localeCompare(String(y.time||''))):[];
 const pending=vis.pending().filter(x=>!window.MyTeamAbsences?.isAbsent(x.name,dateNow()));
 const oldBoard=read('myteam-board-events-v1',{});
 const oldEvents=object(oldBoard)&&Array.isArray(oldBoard[date])?oldBoard[date]:[];
 const notes=read('myteam_main_courante_v1',[]);
 const oldLogs=Array.isArray(notes)?notes.filter(x=>x&&x.date===date):[];
 return {mode:a,reports,logs,pending,oldEvents,oldLogs};
}
const lineVisit=v=>(v.time?v.time+' · ':'')+v.post+' — '+(v.kind==='report'?(v.signed?'Rapport SIGNÉ':'Rapport non signé'):'Simple passage')+
 ' — '+(v.agents||[]).map(a=>a.name+' ('+({ok:'consignes OK',pending:'consignes non validées',notasked:'non demandées',unknown:'à vérifier'}[a.status]||'à vérifier')+')').join(', ')+
 (v.note?' — '+v.note:'');
const lineLog=v=>(v.time?v.time+' · ':'')+({planning:'Changement de planning',event:'Événement',call:'Appel / mail',extra:'Extra / remplacement',other:'Information'}[v.category]||'Événement')+
 (v.post?' '+v.post:'')+(v.agents?' · '+v.agents:'')+' : '+(v.description||'')+
 (v.hasReminder&&v.due?' [Rappel : '+fmt(v.due)+(v.done?' effectué':' en attente')+']':'');
function makeDraft(date,shift,kind,includeOpen=true){
 const f=facts(date,shift),a=f.mode;
 const count=vis.count(date,shift);
 const title='Vacation du '+fmt(date)+' · '+(shiftNames[shift]||shift)+' · '+shiftHours(shift);
 const context='Affectation : '+(a?modes[a.mode]||a.mode:'Non renseignée')+
  (a?.post?' · '+a.post:'')+(a?.mode==='partial'?' · posté '+a.start+'–'+a.end:'');
 const objective=a?.mode==='posted'?'Rapports de visite : NON APPLICABLE (vacation entièrement postée)':
  a?.mode==='partial'?'Rapports signés : '+count.signed+' — objectif à adapter (vacation partiellement postée)':
  a?.mode==='mobile'?'Rapports signés : '+count.signed+'/3'+(count.signed<3?' — objectif non atteint':' — objectif atteint'):
  'Rapports signés : '+count.signed+' — affectation à préciser avant clôture';
 const notes=[];
 notes.push(title,context,objective,'Passages simples : '+count.passages);
 const reports=f.reports.filter(x=>x.kind==='report'),passages=f.reports.filter(x=>x.kind==='passage');
 const changed=f.logs.filter(x=>x.category==='planning'||x.category==='extra');
 const events=f.logs.filter(x=>x.category!=='planning'&&x.category!=='extra');
 const add=(label,rows)=>{notes.push('',label);if(!rows.length)notes.push('Aucun élément enregistré.');else rows.forEach(x=>notes.push('- '+x))};
 if(kind==='backup'){
  add('Changements de planning / extras',changed.map(lineLog));
  add('Événements et appels utiles à la relève',events.map(lineLog));
  const issues=f.reports.flatMap(v=>(v.agents||[]).filter(p=>['pending','notasked'].includes(p.status)).map(p=>p.name+' · '+v.post+' : consignes '+(p.status==='pending'?'non validées':'non demandées')));
  add('Consignes à régulariser',issues);
  if(includeOpen){
   const tasks=f.logs.filter(x=>x.hasReminder&&!x.done).map(x=>(x.reminderText||x.description)+' · '+fmt(x.due));
   tasks.push(...f.pending.map(x=>x.name+' : consignes à relancer'+(x.due?' · '+fmt(x.due):'')));
   add('Rappels ouverts à transmettre',tasks);
  }
  notes.push('','Transmission préparée automatiquement — à vérifier et modifier avant validation.');
 }else{
  add('Rapports de visite sur poste',reports.map(lineVisit));
  add('Passages simples',passages.map(lineVisit));
  add('Changements de planning / extras',changed.map(lineLog));
  add('Événements, appels et faits de service',events.map(lineLog));
  const oldEntries=[...f.oldEvents,...f.oldLogs].map(x=>[x.title,x.description,x.text].filter(Boolean).join(' · ')).filter(Boolean);
  if(oldEntries.length)add('Anciennes informations conservées',oldEntries);
  if(includeOpen){
   add('Relances de consignes ouvertes',f.pending.map(x=>x.name+' · '+(x.due?'Prévue '+fmt(x.due):'Sans date de retour')));
  }
  notes.push('','Document personnel. Les données sources et les rappels ne sont pas supprimés par la clôture.');
 }
 return notes.join('\n');
}
const section=document.createElement('section');section.id='closing';section.className='screen hidden';
section.innerHTML=[
 '<div class="row-between"><div><h2>Fin de vacation</h2><p class="hint">Deux documents distincts, modifiables avant toute validation.</p></div><button type="button" class="small-button" id="close-back">Accueil</button></div>',
 '<div class="card"><div class="form-grid">',
 '<label>Date de vacation<input type="date" id="close-date"></label>',
 '<label>Vacation<select id="close-shift"><option value="morning">Matin 05–13</option><option value="afternoon">Après-midi 13–21</option><option value="night">Nuit 21–05</option><option value="other">Autre</option></select></label>',
 '</div><div id="close-status" class="hint"></div></div>',
 '<div class="card" id="close-assignment"><div class="row-between"><h3>Mon affectation</h3><span id="close-mode-state" class="hint">À préciser</span></div>',
 '<form id="close-mode-form"><label>Quel type de vacation effectues-tu ?<select name="mode"><option value="">Choisir…</option>',
 '<option value="mobile">CDE disponible pour les visites</option><option value="posted">Je suis posté toute la vacation</option>',
 '<option value="partial">Je suis posté une partie de la vacation</option></select></label>',
 '<div id="close-post-fields" class="hidden"><label>Quel poste occupes-tu ?<input name="post" list="close-post-codes" maxlength="30" placeholder="E84" autocomplete="off"></label>',
 '<datalist id="close-post-codes"><option>E14</option><option>E32</option><option>E84</option><option>E85</option><option>E112</option><option>E111</option><option>E121</option><option>E50</option></datalist></div>',
 '<div id="close-partial-fields" class="hidden"><div class="form-grid"><label>Posté à partir de<input name="start" type="time"></label>',
 '<label>Posté jusqu’à<input name="end" type="time"></label></div></div>',
 '<label>Observation d’affectation (facultative)<input name="note" maxlength="300"></label>',
 '<button type="submit" class="primary">Enregistrer mon affectation</button><p id="close-mode-msg" role="status" class="hint"></p></form></div>',
 '<div class="card"><h3>Mon bilan avant validation</h3><div id="close-figures"></div>',
 '<p class="hint">Tu peux modifier les deux textes ci-dessous. Une modification n’efface jamais le journal, les rapports ni les rappels d’origine.</p></div>',
 '<div class="card"><div class="row-between"><h3>Transmission back-up</h3><span id="close-backup-status" class="hint">Brouillon</span></div>',
 '<label class="visit-checkbox"><input type="checkbox" id="close-include-open" checked> Inclure les rappels encore ouverts</label>',
 '<textarea id="close-backup-text" rows="11" aria-label="Brouillon de transmission au back-up"></textarea>',
 '<div class="visit-buttons"><button type="button" id="close-save-backup">Sauvegarder le brouillon</button>',
 '<button type="button" id="close-validate-backup" class="primary">Valider la transmission</button></div>',
 '<div class="visit-buttons"><button type="button" id="close-export-backup">PDF dernière version</button>',
 '<button type="button" id="close-share-backup">Partager version validée</button></div></div>',
 '<div class="card"><div class="row-between"><h3>Mon historique personnel</h3><span id="close-personal-status" class="hint">Brouillon</span></div>',
 '<textarea id="close-personal-text" rows="14" aria-label="Brouillon d’historique personnel"></textarea>',
 '<div class="visit-buttons"><button type="button" id="close-save-personal">Sauvegarder le brouillon</button>',
 '<button type="button" id="close-validate-personal" class="primary">Valider mon historique</button></div>',
 '<div class="visit-buttons"><button type="button" id="close-export-personal">PDF dernière version</button>',
 '<button type="button" id="close-share-personal">Partager version validée</button></div></div>',
 '<div class="card"><div class="row-between"><h3>Brouillons et anciennes versions</h3><button type="button" id="close-refresh" class="small-button">Actualiser les propositions</button></div>',
 '<div id="close-versions"></div><p class="hint">Les anciennes versions validées restent consultables. Une nouvelle validation crée une nouvelle version datée.</p></div>',
 '<div class="card"><h3>Classement sur le téléphone</h3><p class="hint">Dossier conseillé : Documents / MyTEAM / Bilans / Année / Mois. Le téléchargement arrive dans Téléchargements ou dans l’emplacement choisi par Android.</p>',
 '<p class="hint">La date du fichier correspond au début de la vacation, y compris pour les nuits. Rien n’est automatiquement envoyé au back-up.</p></div>'
].join('');
document.querySelector('main').append(section);
const card=document.createElement('div');card.className='card';card.id='mt-closing-home';
const home=$('home');const rest=home?.querySelector('.backup-card');home?.insertBefore(card,rest||null);
let currentDate=initialDate(),currentShift=shiftNow(),loading=false;
const mform=$('close-mode-form');
const fields={date:$('close-date'),shift:$('close-shift'),backup:$('close-backup-text'),personal:$('close-personal-text')};
const draftKinds=['backup','personal'];
function getState(){
 const doc=stored(currentDate,currentShift);
 return doc||{date:currentDate,shift:currentShift,drafts:{},validated:{backup:[],personal:[]},updatedAt:''};
}
function getVersions(type){const d=getState();return Array.isArray(d.validated?.[type])?d.validated[type]:[]}
function draftData(){
 const doc=getState();
 const drafts=object(doc.drafts)?doc.drafts:{};
 return {...doc,drafts:{...drafts,backup:fields.backup.value,personal:fields.personal.value},
  lastDraftAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}
function saveDraft(silent=false){
 if(loading)return;
 try{
  saveDocs(currentDate,currentShift,draftData());
  if(!silent)$('close-status').textContent='Brouillons sauvegardés sur cet appareil.';
  renderVersions();
 }catch(e){$('close-status').textContent='Sauvegarde impossible : '+e.message}
}
function updateMode(){
 const val=mform.elements.mode.value;
 $('close-post-fields').classList.toggle('hidden',val==='mobile'||!val);
 $('close-partial-fields').classList.toggle('hidden',val!=='partial');
 $('close-mode-state').textContent=val?modes[val]:'À préciser';
}
function loadMode(){
 const data=modeOf(currentDate,currentShift)||{};
 mform.elements.mode.value=data.mode||'';
 mform.elements.post.value=data.post||'';
 mform.elements.start.value=data.start||'';
 mform.elements.end.value=data.end||'';
 mform.elements.note.value=data.note||'';
 $('close-mode-msg').textContent=data.mode?'Affectation enregistrée pour cette vacation.':'Indique si tu es disponible, posté ou partiellement posté.';
 updateMode();
}
function statusFor(type){
 const n=getVersions(type).length;
 return n?'Validé · version '+n:'Brouillon';
}
function summary(){
 const count=vis.count(currentDate,currentShift),mode=modeOf(currentDate,currentShift);
 const label=mode?.mode==='posted'?'NON APPLICABLE : vacation entièrement postée':
 mode?.mode==='partial'?count.signed+' signé(s) : vacation partiellement postée':
 mode?.mode==='mobile'?count.signed+' / 3':'Affectation à renseigner';
 $('close-figures').innerHTML='<div class="visit-summary"><div><strong>'+count.signed+'</strong><small>Rapports signés</small></div>'+
  '<div><strong>'+count.passages+'</strong><small>Passages</small></div>'+
  '<div><strong>'+vis.pending().length+'</strong><small>Relances ouvertes</small></div></div>'+
  '<p class="hint"><strong>Objectif visites : '+esc(label)+'</strong></p>'+
  (mode?.mode==='posted'?'<p class="visit-ok">Aucune alerte de rapports manquants : tu étais posté sur '+esc(mode.post)+'.</p>':'');
}
function refreshDrafts(force=false){
 const data=getState(),saved=object(data.drafts)?data.drafts:{};
 if(!force){
  fields.backup.value=typeof saved.backup==='string'?saved.backup:makeDraft(currentDate,currentShift,'backup',$('close-include-open').checked);
  fields.personal.value=typeof saved.personal==='string'?saved.personal:makeDraft(currentDate,currentShift,'personal',true);
 }else{
  if(!confirm('Remplacer tes brouillons par de nouvelles propositions ? Les versions déjà validées resteront conservées.'))return;
  fields.backup.value=makeDraft(currentDate,currentShift,'backup',$('close-include-open').checked);
  fields.personal.value=makeDraft(currentDate,currentShift,'personal',true);
  saveDraft(true);
 }
}
function renderVersions(){
 const doc=getState();
 for(const type of draftKinds)$('close-'+type+'-status').textContent=statusFor(type);
 $('close-versions').innerHTML=draftKinds.map(type=>{
  const versions=getVersions(type);
  const title=type==='backup'?'Transmission back-up':'Historique personnel';
  return '<div class="close-version-group"><strong>'+title+'</strong>'+
   (versions.length?versions.slice().reverse().map(v=>'<div class="close-version-row"><small>Version '+v.version+' · '+esc(v.validatedAt.slice(0,16).replace('T',' '))+'</small>'+
    '<button type="button" data-close-old="'+type+'|'+v.version+'">PDF</button><button type="button" data-close-view="'+type+'|'+v.version+'">Voir le texte</button></div>').join(''):
   '<p class="hint">Aucune version validée.</p>')+'</div>';
 }).join('');
}
function renderHome(){
 const now=initialDate(),shift=shiftNow(),mode=modeOf(now,shift),docs=stored(now,shift),n=vis.count(now,shift);
 card.innerHTML='<div class="row-between"><h3>Ma vacation · '+api.fmtDate(now)+'</h3><button type="button" id="close-home-open" class="small-button">Fin de vacation</button></div>'+
  '<p class="hint"><strong>Affectation : '+esc(mode?modes[mode.mode]+' · '+(mode.post||''): 'à préciser — sur quel poste es-tu ?')+'</strong></p>'+
  '<p class="hint">'+(mode?.mode==='posted'?'Rapports de visite : non applicables (posté).':
   mode?.mode==='partial'?'Vacations partiellement postée : objectif à ajuster.':
   mode?.mode==='mobile'?'Rapports de visite signés : '+n.signed+'/3.':'Indique ton affectation pour adapter tes contrôles.')+'</p>'+
  '<div class="visit-buttons"><button type="button" id="close-home-mode">Mon affectation</button>'+
  '<button type="button" id="close-home-summary" class="primary">Bilan / PDF</button></div>'+
  (docs?.validated?.backup?.length||docs?.validated?.personal?.length?'<p class="hint">Une version du bilan est déjà validée. Les corrections créeront une nouvelle version.</p>':'');
 card.querySelector('#close-home-open').onclick=()=>open();
 card.querySelector('#close-home-mode').onclick=()=>open(true);
 card.querySelector('#close-home-summary').onclick=()=>open();
}
function open(focusMode=false,date=null,shift=null){
 if(api.validDate(date))currentDate=date;
 if(shiftNames[shift])currentShift=shift;
 api.activate('closing');
 load();
 if(focusMode)$('close-assignment').scrollIntoView({behavior:'smooth',block:'center'});
}
function load(){
 loading=true;
 fields.date.value=currentDate;fields.shift.value=currentShift;
 loadMode();refreshDrafts();summary();renderVersions();
 $('close-status').textContent='Tu peux modifier les propositions. La validation est séparée pour chaque document.';
 loading=false;
}
function validate(type){
 const data=modeOf(currentDate,currentShift);
 if(!data){$('close-status').textContent='Déclare d’abord ton affectation : disponible ou posté.';return}
 const text=fields[type].value.trim();
 if(!text){$('close-status').textContent='Le document ne peut pas être vide.';return}
 const prev=getVersions(type),version=prev.length+1,label=type==='backup'?'transmission back-up':'historique personnel';
 if(!confirm('Valider la '+label+' — version '+version+' ? Cette version sera conservée ; une future correction créera une nouvelle version.'))return;
 const doc=draftData(),now=new Date().toISOString();
 if(!object(doc.validated))doc.validated={backup:[],personal:[]};
 if(!Array.isArray(doc.validated[type]))doc.validated[type]=[];
 doc.validated[type].push({version,text,validatedAt:now,mode:{...data},source:'édition vérifiée'});
 try{saveDocs(currentDate,currentShift,doc)}catch(e){$('close-status').textContent='Validation non enregistrée : '+e.message;return}
 renderVersions();renderHome();
 exportVersion(type,version);
 $('close-status').textContent='Version '+version+' validée et PDF généré pour '+label+'. Les rappels restent ouverts.';
}
function buildVersion(type,version){
 const items=getVersions(type),item=items.find(x=>x.version===version);
 if(!item)return null;
 const title=type==='backup'?'TRANSMISSION BACK-UP':'HISTORIQUE PERSONNEL';
 const pdfTitle=type==='backup'?'MyTEAM - Transmission back-up':'MyTEAM - Historique personnel';
 const doc=pdf.makePdf({title:pdfTitle,subtitle:'Vacation '+api.fmtDate(currentDate)+' - '+(shiftNames[currentShift]||currentShift)+
  ' - Version '+version,
  sections:[{header:'Document vérifié et validé',text:item.text}],
  footer:title+' - Version '+version+' - '+item.validatedAt.slice(0,16).replace('T',' ')});
 return {blob:doc,name:pdf.fileName(currentDate,currentShift,type,version)};
}
function exportVersion(type,version=null){
 const n=version||getVersions(type).length;
 const result=buildVersion(type,n);
 if(!result){$('close-status').textContent='Aucune version validée pour ce document.';return}
 pdf.download(result.blob,result.name);
}
async function shareVersion(type){
 const result=buildVersion(type,getVersions(type).length);
 if(!result){$('close-status').textContent='Valide d’abord le document avant de le partager.';return}
 try{await pdf.share(result.blob,result.name)}
 catch(e){$('close-status').textContent='Partage annulé ou indisponible.'}
}
mform.elements.mode.addEventListener('change',updateMode);
mform.addEventListener('submit',e=>{
 e.preventDefault();
 try{
  storeMode({date:currentDate,shift:currentShift,
   mode:mform.elements.mode.value,post:mform.elements.post.value,
   start:mform.elements.start.value,end:mform.elements.end.value,note:mform.elements.note.value});
  $('close-mode-msg').textContent='Affectation enregistrée. Le compteur de visites est adapté.';
  summary();renderHome();api.renderPlanning();window.MyTeamVisits?.refresh?.();
 }catch(err){$('close-mode-msg').textContent=err.message||'Enregistrement impossible.'}
});
function changePeriod(){
 if(!api.validDate(fields.date.value)||!shiftNames[fields.shift.value])return;
 saveDraft(true);
 currentDate=fields.date.value;currentShift=fields.shift.value;
 load();
}
fields.date.addEventListener('change',changePeriod);
fields.shift.addEventListener('change',changePeriod);
$('close-back').onclick=()=>{saveDraft(true);api.activate('home')};
$('close-refresh').onclick=()=>refreshDrafts(true);
$('close-include-open').addEventListener('change',()=>{if(confirm('Actualiser la transmission avec cette option ? Le brouillon actuel sera remplacé.')){fields.backup.value=makeDraft(currentDate,currentShift,'backup',$('close-include-open').checked);saveDraft(true)}});
for(const type of draftKinds){
 $('close-save-'+type).onclick=()=>saveDraft();
 $('close-validate-'+type).onclick=()=>validate(type);
 $('close-export-'+type).onclick=()=>exportVersion(type);
 $('close-share-'+type).onclick=()=>shareVersion(type);
}
$('close-versions').addEventListener('click',e=>{
 const b=e.target.closest('[data-close-old]');if(b){const [type,n]=b.dataset.closeOld.split('|');exportVersion(type,Number(n));return}
 const v=e.target.closest('[data-close-view]');if(v){
  const [type,n]=v.dataset.closeView.split('|'),item=getVersions(type).find(x=>x.version===Number(n));
  if(!item)return;
  const output=document.createElement('textarea');output.value=item.text;output.rows=9;output.readOnly=true;
  v.closest('.close-version-group').append(output);output.scrollIntoView({behavior:'smooth',block:'center'});
 }
});
let autosave;
for(const type of draftKinds)fields[type].addEventListener('input',()=>{
 clearTimeout(autosave);autosave=setTimeout(()=>saveDraft(true),850);
});
window.addEventListener('myteam-vacation-updated',()=>{renderHome();summary()});
window.addEventListener('focus',renderHome);
window.MyTeamVacation={MODE,DOC,modeOf,isPosted,storeMode,stored,allDocs,makeDraft,facts,open,renderHome,saveDraft,load,exportVersion};
renderHome();
})();