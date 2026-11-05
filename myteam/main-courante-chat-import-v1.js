/* MyTEAM - Import privé des informations structurées dans ChatGPT et suivi des actions */
(()=>{
'use strict';
if(document.getElementById('mt-chat-intake'))return;
const journal=document.getElementById('mt-board-log'),picker=document.getElementById('date');
if(!journal||!picker)return;
const BOARD='myteam-board-log-v1',EVENTS='myteam-board-events-v1',TASKS='myteam-board-actions-v1';
const read=(key,def)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??def}catch{return def}};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=s=>typeof s==='string'&&/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const human=s=>iso(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
const nowDay=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const panel=document.createElement('section');panel.id='mt-chat-intake';panel.className='card';
panel.innerHTML='<h2>Informations dictées dans ChatGPT</h2><p class="ci-hint">Classe les changements de planning à la date où tu les as effectués ; conserve séparément leur date d’application. Importation privée sur cet appareil : aucun agent n’est ajouté au dépôt GitHub.</p>'+
'<details id="ci-import-panel"><summary>Importer une journée classée depuis ChatGPT</summary><p class="ci-hint">Sélectionne le fichier JSON que je t’ai préparé dans la conversation, ou colle son texte. L’import ne valide jamais la journée et ne termine pas les rappels en attente.</p>'+
'<label>Importer le fichier JSON<input id="ci-file" type="file" accept=".json,application/json"></label>'+
'<label>Ou coller le JSON<textarea id="ci-paste" rows="3" placeholder="Colle le fichier JSON ici"></textarea></label>'+
'<button type="button" id="ci-paste-button">Classer les informations collées</button></details>'+
'<p role="status" id="ci-message" class="ci-hint"></p>'+
'<h3>Interventions classées du jour</h3><div id="ci-events"></div>'+
'<details><summary>Ajouter une intervention manuellement</summary>'+
'<label>Catégorie<select id="ci-kind"><option>Modification planning</option><option>Rappel formation</option><option>Appel / mail</option><option>Information</option><option>Autre</option></select></label>'+
'<label>Date d’application (si différente)<input id="ci-effective" type="date"></label>'+
'<label>Horaire concerné<input id="ci-slot" placeholder="Ex. 05:30-14:30"></label>'+
'<label>Objet<input id="ci-title" maxlength="200"></label>'+
'<label>Détails<textarea id="ci-desc" rows="3" maxlength="4000"></textarea></label>'+
'<button id="ci-add" type="button">Ajouter à la main courante</button></details>'+
'<h3>Actions et rappels encore ouverts</h3><div id="ci-actions"></div>';
const css=document.createElement('style');
css.textContent='#mt-chat-intake{border:1px solid #637d98;background:#20344e;margin:12px 0}#mt-chat-intake h2{font-size:19px;margin:0 0 9px}#mt-chat-intake h3{font-size:16px;margin:15px 0 7px}#mt-chat-intake .ci-hint{font-size:12px;color:#c8d7e6;line-height:1.5}#mt-chat-intake details{padding:11px;border:1px solid #5d7489;border-radius:10px;margin:9px 0}#mt-chat-intake details summary{font-weight:750;cursor:pointer}#mt-chat-intake input,#mt-chat-intake textarea,#mt-chat-intake select{box-sizing:border-box;display:block;width:100%;padding:11px;color:white;background:#12263b;border:1px solid #718ba2;border-radius:9px;margin:7px 0}#mt-chat-intake .ci-item{border:1px solid #576e85;border-radius:11px;background:#263b53;padding:11px;margin:7px 0}#mt-chat-intake .ci-item small{display:block;color:#b8cde0;margin:5px 0}#mt-chat-intake .ci-task{border-left:4px solid #a47b34}#mt-chat-intake .ci-task.late{border-left-color:#bd495b;background:#573742}#mt-chat-intake .ci-task.done{border-left-color:#3b9a74}#mt-chat-intake button{min-height:42px}#mt-chat-intake .ci-item button{font-size:12px}';
panel.prepend(css);
const archive=journal.querySelector('.jb-summary');if(archive)archive.before(panel);else journal.append(panel);
const $=id=>document.getElementById(id);
const defaults=()=>({start:'',end:'',cde:'unknown',station:'',plan:'unknown',planNote:'',mail:'unknown',trello:'unknown',notes:'',extra:[]});
function actionData(){const v=read(TASKS,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function eventsData(){const v=read(EVENTS,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function markChanged(){
 window.dispatchEvent(new Event('myteam-board-updated'));
 try{picker.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
 render()
}
function importData(payload){
 if(payload?.schema!=='myteam-main-courante-v2'||payload.version!==2||!Array.isArray(payload.days)||payload.days.length>12||!payload.days.length)throw Error('Format de transfert non reconnu');
 const boards=read(BOARD,{}),eventStore=eventsData(),taskStore=actionData();
 let totalEvents=0,totalTasks=0,corrected=0,skipped=0,updatedDays=0,firstDate='';
 for(const d of payload.days){
  if(!iso(d.date))throw Error('Date de journée invalide');
  if(!firstDate)firstDate=d.date;
  if(!Array.isArray(d.entries)||d.entries.length>80||!Array.isArray(d.actions)||d.actions.length>80)throw Error('Nombre d’entrées invalide');
  const old=boards[d.date]||{draft:defaults(),validated:false,snapshots:[]};
  if(old.validated){skipped++;continue} // never overwrite an archived day
  const existing=old.draft||defaults(),f=d.fields||{};
  const next={...defaults(),...existing};
  const fields=['start','end','cde','station','plan','planNote','mail','trello','notes'];
  for(const k of fields){
   if(typeof f[k]!=='string')continue;
   const v=f[k].slice(0,k==='notes'?6000:1000);
   if(['cde','plan','mail','trello'].includes(k)){if(['unknown','',null].includes(next[k])&&['unknown','yes','no','na'].includes(v))next[k]=v}
   else if(!next[k])next[k]=v;
  }
  if(Array.isArray(f.extra))next.extra=[...(Array.isArray(next.extra)?next.extra:[]),...f.extra.filter(x=>x&&typeof x.label==='string'&&typeof x.value==='string').slice(0,12).map(x=>({label:x.label.slice(0,100),value:x.value.slice(0,1000)}))];
  old.draft=next;if(d.visitsDeclaredNone===true)old.visitsDeclaredNone=true;boards[d.date]=old;updatedDays++;
  const events=Array.isArray(eventStore[d.date])?eventStore[d.date]:[];
  const ids=new Set(events.map(x=>x.id));
  for(const x of d.entries){
   if(!x||typeof x.id!=='string'||!/^mc-[a-z0-9-]{5,100}$/.test(x.id)||typeof x.title!=='string'||!x.title.trim())continue;
   const existingIndex=events.findIndex(y=>y.id===x.id);
   if(existingIndex>=0){
     const previous=events[existingIndex];
     // Explicit correction: user has confirmed that this training was actually completed.
     if(x.kind==='Formation terminée'&&previous.kind!=='Formation terminée'&&/Rise Up Cybersecurity/i.test(x.title)){
       events[existingIndex]={...previous,kind:'Formation terminée',title:String(x.title).slice(0,220),description:String(x.description||'').slice(0,4000),state:'done'};
       corrected++;
     }
     continue;
   }
   const item={id:x.id,kind:String(x.kind||'Information').slice(0,70),effectiveDate:iso(x.effectiveDate)?x.effectiveDate:d.date,slot:String(x.slot||'').slice(0,70),title:x.title.trim().slice(0,220),description:String(x.description||'').slice(0,4000),mail:['yes','no','unknown','na'].includes(x.mail)?x.mail:'unknown',state:['done','pending','info'].includes(x.state)?x.state:'info',agent:String(x.agent||'').slice(0,180)};
   events.push(item);ids.add(item.id);totalEvents++;
  }
  eventStore[d.date]=events;
  const tasks=Array.isArray(taskStore[d.date])?taskStore[d.date]:[],taskIds=new Set(tasks.map(x=>x.id));
  for(const x of d.actions){
   if(!x||typeof x.id!=='string'||!/^mc-action-[a-z0-9-]{5,100}$/.test(x.id)||typeof x.title!=='string'||!x.title.trim())continue;
   if(taskIds.has(x.id))continue;
   const item={id:x.id,agent:String(x.agent||'').slice(0,120),title:x.title.trim().slice(0,600),dueDate:iso(x.dueDate)?x.dueDate:'',status:x.status==='done'?'done':'pending',type:String(x.type||'Action').slice(0,90)};
   tasks.push(item);taskIds.add(item.id);totalTasks++;
  }
  taskStore[d.date]=tasks;
 }
 if(!updatedDays)throw Error('Les journées concernées sont déjà validées. Réouvre-les avant de les compléter.');
 // Commit locally; never transmit data to the public GitHub repository.
 localStorage.setItem(BOARD,JSON.stringify(boards));
 localStorage.setItem(EVENTS,JSON.stringify(eventStore));
 localStorage.setItem(TASKS,JSON.stringify(taskStore));
 picker.value=firstDate;markChanged();
 return updatedDays+' journée(s), '+totalEvents+' intervention(s), '+corrected+' formation(s) corrigée(s), '+totalTasks+' rappel(s) classés'+(skipped?' ; '+skipped+' journée(s) déjà validée(s) ignorée(s)':'')+'. Les qualifications et rappels déjà terminés sont conservés.';
}
async function handleFile(e){
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>300000)throw Error('Fichier trop volumineux');const v=JSON.parse(await file.text());$('ci-message').textContent=importData(v);$('ci-import-panel').open=false}
 catch(err){$('ci-message').textContent='Import impossible : '+err.message}finally{e.target.value=''}
}
$('ci-file').addEventListener('change',handleFile);
$('ci-paste-button').onclick=()=>{
 try{$('ci-message').textContent=importData(JSON.parse($('ci-paste').value));$('ci-paste').value='';$('ci-import-panel').open=false}
 catch(err){$('ci-message').textContent='Import impossible : '+err.message}
};
$('ci-add').onclick=()=>{
 const title=$('ci-title').value.trim(),desc=$('ci-desc').value.trim();
 if(!title){$('ci-message').textContent='Indique l’objet de l’intervention.';return}
 if(read(BOARD,{})[picker.value]?.validated){$('ci-message').textContent='Réouvre la journée avant de la compléter.';return}
 const all=eventsData(),day=picker.value,list=Array.isArray(all[day])?all[day]:[];
 const item={id:'mc-local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),kind:$('ci-kind').value,effectiveDate:iso($('ci-effective').value)?$('ci-effective').value:day,slot:$('ci-slot').value.trim().slice(0,70),title:title.slice(0,220),description:desc.slice(0,4000),mail:'unknown',state:'info',agent:''};
 list.push(item);all[day]=list;try{localStorage.setItem(EVENTS,JSON.stringify(all));$('ci-title').value='';$('ci-desc').value='';$('ci-slot').value='';$('ci-effective').value='';markChanged();$('ci-message').textContent='Intervention enregistrée dans la journée '+human(day)+'.'}catch(err){$('ci-message').textContent=err.message}
};
function render(){
 const all=eventsData(),records=all[picker.value]||[];
 $('ci-events').innerHTML=records.length?records.map(x=>
 '<div class="ci-item"><strong>'+safe(x.kind)+' · '+safe(x.title)+'</strong><small>Effet : '+safe(human(x.effectiveDate||picker.value))+(x.slot?' · '+safe(x.slot):'')+' · Mail : '+(x.mail==='yes'?'OK':'À vérifier')+'</small>'+safe(x.description)+(x.state==='pending'?'<small>Suivi en attente</small>':'')+'</div>'
 ).join(''):'<p class="ci-hint">Aucune intervention structurée pour cette date.</p>';
 const tasks=Object.entries(actionData()).flatMap(([day,items])=>(Array.isArray(items)?items:[]).map(x=>({...x,sourceDay:day})))
 .filter(x=>x.status!=='done').sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
 const today=nowDay();
 $('ci-actions').innerHTML=tasks.length?tasks.map(x=>
 '<div class="ci-item ci-task '+(x.dueDate&&x.dueDate<=today?'late':'')+'"><strong>'+safe(x.agent||'Action')+'</strong> · '+safe(x.title)+'<small>À faire '+(x.dueDate?'le '+safe(human(x.dueDate)):'sans échéance')+(x.sourceDay?' · demandé le '+safe(human(x.sourceDay)):'')+'</small><button type="button" data-ci-task="'+safe(x.id)+'" data-ci-date="'+safe(x.sourceDay)+'">Marquer effectué</button></div>'
 ).join(''):'<p class="ci-hint">Aucune action en attente dans les journées enregistrées.</p>';
}
$('ci-actions').addEventListener('click',e=>{
 const btn=e.target.closest('[data-ci-task]');if(!btn)return;
 if(!confirm('Confirmer que cette action a été effectuée ?'))return;
 const all=actionData(),list=all[btn.dataset.ciDate]||[],item=list.find(x=>x.id===btn.dataset.ciTask);
 if(!item||item.status==='done')return;item.status='done';item.doneAt=new Date().toISOString();
 try{localStorage.setItem(TASKS,JSON.stringify(all));markChanged();$('ci-message').textContent='Action terminée après confirmation.'}
 catch(err){$('ci-message').textContent='Enregistrement impossible : '+err.message}
});
picker.addEventListener('change',render);
window.addEventListener('myteam-board-updated',render);
window.addEventListener('focus',render);
render();
})();