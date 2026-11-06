/* MyTEAM · UI tournée : saisie des passages, rapports signés et consignes. */
(()=>{
'use strict';
const core=window.MyTeamVisitsCore,api=window.MyTeamReboot;if(!core||!api)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentShift=()=>{const h=new Date().getHours();return h>=5&&h<13?'morning':h>=13&&h<21?'afternoon':'night'};
let day=new Date().getHours()<5?core.datePlus(core.today(),-1):core.today(),shift=currentShift(),editing='',selected=new Map(),allHistory=false;
const section=document.createElement('section');section.id='visits';section.className='screen hidden';
section.innerHTML=[
'<div class="row-between"><div><h2>Ma tournée</h2><p class="hint">Passages simples et rapports signés : deux actions distinctes.</p></div><button type="button" id="v-back" class="small-button">Accueil</button></div>',
'<div class="card"><div class="form-grid">',
'<label>Jour de vacation<input id="v-date" type="date"></label>',
'<label>Vacation<select id="v-shift"><option value="morning">Matin 05–13</option><option value="afternoon">Après-midi 13–21</option><option value="night">Nuit 21–05</option><option value="other">Autre</option></select></label>',
'</div><div class="visit-summary"><div><strong id="v-count">0 / 3</strong><small>Rapports signés</small></div>',
'<div><strong id="v-pass-count">0</strong><small>Passages</small></div><div><strong id="v-pending-count">0</strong><small>Relances</small></div></div>',
'<div class="visit-bar"><div id="v-progress"></div></div><p id="v-count-msg" class="hint"></p>',
'<div class="visit-buttons"><button type="button" id="v-new-pass">+ Simple passage</button><button type="button" id="v-new-report" class="primary">+ Rapport sur poste</button></div></div>',
'<div class="card"><div class="row-between"><h3>Relances et contrôles</h3><button type="button" class="small-button" id="v-share">Partager pour ChatGPT</button></div>',
'<div id="v-alerts"></div><p class="hint">Un appel confirmé est distinct d’un contrôle sur poste. Les rapports non signés ne comptent pas.</p></div>',
'<div class="card"><div class="row-between"><h3>Historique des visites</h3><button type="button" class="text-button" id="v-all-history">Toutes les dates</button></div><div id="v-history"></div></div>',
'<div class="card"><div class="row-between"><h3>Préparer ma tournée</h3><button type="button" class="small-button" id="v-open-planner">Analyser les postes</button></div>',
'<p class="hint">Pour une photo du plan, joins-la dans ChatGPT avec le résumé partagé depuis cette page.</p></div>',
'<form id="v-form" class="card hidden">',
'<div class="row-between"><h3 id="v-form-title">Visite</h3><button type="button" class="text-button" id="v-cancel">Fermer</button></div>',
'<div class="form-grid">',
'<label>Date<input name="date" type="date" required></label>',
'<label>Vacation<select name="shift"><option value="morning">Matin</option><option value="afternoon">Après-midi</option><option value="night">Nuit</option><option value="other">Autre</option></select></label>',
'<label>Heure (facultative)<input name="time" type="time"></label>',
'<label>Poste<input name="post" required placeholder="E84" maxlength="30" list="v-post-list"></label>',
'</div><datalist id="v-post-list"><option>E14</option><option>E32</option><option>E84</option><option>E85</option><option>E112</option><option>E40</option><option>E30</option><option>E43</option><option>E50</option><option>E51</option><option>E52</option><option>E80</option><option>E111</option><option>E121</option></datalist>',
'<label>Nature<select name="kind"><option value="passage">Simple passage — ne compte pas</option><option value="report">Rapport de visite sur poste</option></select></label>',
'<label class="visit-checkbox" id="v-signed-label"><input type="checkbox" name="signed"> Rapport signé (compte pour 1 rapport)</label>',
'<p class="hint" id="v-kind-help"></p>',
'<label>Rechercher des agents<input type="search" id="v-agent-search" placeholder="Nom ou matricule…" autocomplete="off"></label>',
'<div id="v-agent-pick" class="visit-agent-pick"></div>',
'<div class="row-between"><h4>Agents rencontrés</h4><button type="button" id="v-apply-status" class="small-button">Même statut pour tous</button></div>',
'<div id="v-selected"></div>',
'<label>Remarque commune (facultative)<textarea name="note" rows="2" maxlength="1000"></textarea></label>',
'<label>Relance proposée si consignes non validées<input name="followDue" type="date"></label>',
'<div id="v-duplicate" aria-live="polite"></div>',
'<button type="submit" class="primary">Enregistrer</button><p id="v-form-msg" class="hint" role="status"></p></form>'
].join('');
document.querySelector('main').append(section);
const card=document.createElement('div');card.id='v-home-card';card.className='card';
const home=$('home');const grid=home?.querySelector('.quick-grid');if(home)home.insertBefore(card,grid||home.firstChild);
const profile=document.createElement('section');profile.id='v-profile';profile.className='visit-profile';
const agentPanel=$('agent-panel');agentPanel?.insertBefore(profile,agentPanel.querySelector('#agent-timeline'));
const follow=document.createElement('form');
follow.id='v-follow-form';follow.className='card hidden';
follow.innerHTML=[
 '<div class="row-between"><h3>Suivi des consignes</h3><button type="button" id="v-follow-close" class="text-button">Fermer</button></div>',
 '<p id="v-follow-agent" class="hint"></p>',
 '<label>Résultat de la vérification<select name="outcome">',
 '<option value="confirmed-phone">Validation déclarée par téléphone</option>',
 '<option value="still-pending">Toujours non validées · à relancer</option>',
 '<option value="confirmed-site">Consignes vérifiées sur place · OK</option>',
 '</select></label>',
 '<label>Date<input name="date" type="date" required></label>',
 '<label>Observation ou interlocuteur (facultatif)<input name="note" maxlength="350"></label>',
 '<button type="submit" class="primary">Enregistrer la confirmation</button>',
 '<p id="v-follow-msg" class="hint" role="status"></p>'
].join('');
section.insertBefore(follow,$('v-form'));
let followAgent='';
const form=$('v-form');
function stateText(s){return core.statuses[s]||core.statuses.unknown}
function refresh(){
 renderHome();renderCounts();renderAlerts();renderHistory();renderProfile();window.MyTeamReboot?.renderHome?.();
}
function open(date=day,vacation=shift){
 if(core.valid(date))day=date;
 if(core.shiftNames[vacation])shift=vacation;
 api.activate('visits');refresh();
}
function renderHome(){
 const n=core.count(day,shift),p=core.pending().length;
 card.innerHTML=[
 '<div class="row-between"><h3>Ma tournée · '+api.fmtDate(day)+'</h3><button type="button" id="v-home-open" class="small-button">Ouvrir</button></div>',
 '<div class="visit-summary"><div><strong>'+n.signed+' / 3</strong><small>Rapports signés</small></div><div><strong>'+p+'</strong><small>Relances</small></div></div>',
 '<p class="hint">Un simple passage ne compte jamais dans les 3 rapports.</p>',
 '<div class="visit-buttons"><button type="button" id="v-home-pass">+ Passage</button><button type="button" class="primary" id="v-home-report">+ Rapport</button></div>'
 ].join('');
 card.querySelector('#v-home-open').onclick=()=>open();
 card.querySelector('#v-home-pass').onclick=()=>openForm('passage');
 card.querySelector('#v-home-report').onclick=()=>openForm('report');
}
function renderCounts(){
 $('v-date').value=day;$('v-shift').value=shift;
 const n=core.count(day,shift),p=core.pending().length;
 $('v-count').textContent=n.signed+' / 3';$('v-pass-count').textContent=n.passages;$('v-pending-count').textContent=p;
 $('v-progress').style.width=Math.min(100,n.signed/3*100)+'%';
 $('v-count-msg').textContent=n.signed>=3?'Objectif atteint sur cette vacation.':(3-n.signed)+' rapport(s) signé(s) restant(s) pour cette vacation.';
}
function renderAlerts(){
 const data=core.pending();
 $('v-alerts').innerHTML=data.length?data.slice(0,35).map(s=>[
  '<div class="visit-alert"><div><strong>'+esc(s.name)+'</strong><small>'+esc(stateText(s.status))+
  (core.valid(s.due)?' · À relancer '+api.fmtDate(s.due):'')+'</small></div>',
  '<div class="visit-actions"><button type="button" data-v-call="'+esc(s.name)+'">Appeler / confirmer</button><button type="button" data-v-agent="'+esc(s.name)+'">Fiche</button></div></div>'
 ].join('')).join(''):'<p class="empty">Aucune relance enregistrée sur les agents actifs.</p>';
}
function renderHistory(){
 const rows=core.visits().slice().sort((a,b)=>String(b.date+b.time).localeCompare(String(a.date+a.time)));
 const shown=allHistory?rows:rows.filter(r=>r.date===day&&r.shift===shift);
 let legacy='';
 const old=core.legacy()[day];
 if(!allHistory&&Array.isArray(old))legacy=old.filter(x=>x&&x.post).map(x=>
  '<div class="visit-entry"><small>Ancien suivi — signature non vérifiée</small><p>'+esc(x.post)+' · '+esc((x.agents||[]).join(', '))+'</p></div>').join('');
 $('v-history').innerHTML=shown.length||legacy?
  shown.map(v=>'<div class="visit-entry" data-v-long="'+esc(v.id)+'"><div class="row-between"><strong>'+esc(v.post)+' · '+(v.kind==='report'?'Rapport':'Passage')+'</strong><small>'+api.fmtDate(v.date)+' · '+esc(core.shiftNames[v.shift])+'</small></div>'+
   '<p>'+v.agents.map(a=>esc(a.name)).join(', ')+'</p><small>'+
   (v.kind==='passage'?'Simple passage · Ne compte pas':v.signed?'Rapport signé · Compte pour 1':'Rapport non signé · Ne compte pas')+'</small>'+
   (v.note?'<p>'+esc(v.note)+'</p>':'')+
   (Array.isArray(v.revisions)&&v.revisions.length?'<details><summary>'+v.revisions.length+' ancienne(s) version(s)</summary>'+
    v.revisions.map(r=>'<div class="legacy-entry">'+api.fmtDate(r.snapshot?.date||'')+' · '+esc(r.snapshot?.post||'')+' · '+(r.snapshot?.signed?'Signé':'Non signé')+'</div>').join('')+'</details>':'')+
   '<div class="visit-actions"><button type="button" data-v-edit="'+esc(v.id)+'">Corriger</button></div></div>').join('')+legacy:
  '<p class="empty">Aucun passage ni rapport enregistré pour cette vacation.</p>';
 $('v-all-history').textContent=allHistory?'Cette vacation':'Tout l’historique';
}
function renderProfile(){
 if(!profile)return;
 const name=api.selected();if(!name){profile.innerHTML='';return}
 const s=core.agentState(name),history=core.history(name).slice(0,12);
 profile.innerHTML='<div class="row-between"><h4>Passages et rapports</h4><button type="button" class="small-button" id="v-profile-pass">+ Passage</button></div>'+
 '<p class="hint">'+(s.lastSignedReport?'Dernier rapport signé : '+api.fmtDate(s.lastSignedReport.date)+' · '+esc(s.lastSignedReport.post):
 'Aucun rapport signé retrouvé')+' · '+esc(stateText(s.status))+'</p>'+
 (['pending','notasked'].includes(s.status)?'<button type="button" id="v-profile-call" class="small-button">Consignes : appeler / confirmer</button>':'')+
 (history.length?history.map(e=>'<div class="visit-profile-row"><small>'+api.fmtDate(e.date)+' · '+esc(e.source==='visit'?e.post:'Appel / confirmation')+'</small><p>'+
 (e.source==='followup'?(e.result==='confirmed'?'Confirmation '+esc(e.method||'phone'):'Toujours en attente'):
 (e.kind==='passage'?'Simple passage':e.signed?'Rapport signé':'Rapport non signé')+' · '+esc(stateText(e.status)))+'</p>'+
 (e.note?'<small>'+esc(e.note)+'</small>':'')+'</div>').join(''):'<p class="empty">Aucun passage ni rapport enregistré pour cet agent.</p>');
 $('v-profile-pass')?.addEventListener('click',()=>openForm('passage',[name]));
 $('v-profile-call')?.addEventListener('click',()=>callAgent(name));
}
function showKind(){
 const report=form.elements.kind.value==='report';
 $('v-signed-label').classList.toggle('hidden',!report);
 if(!report)form.elements.signed.checked=false;
 $('v-kind-help').textContent=report?'Un rapport signé compte une seule fois, quel que soit le nombre d’agents. Doublons contrôlés sur 7 jours.':
 'Simple passage : enrichit l’historique sans compter dans les 3 rapports.';
 duplicates();
}
function pickAgents(){
 const q=core.norm($('v-agent-search').value);
 const list=core.staff().filter(x=>core.norm(x.name+' '+(api.profiles()[x.name]?.workerNumber||'')).includes(q)).slice(0,q?90:50);
 $('v-agent-pick').innerHTML=list.length?list.map(p=>'<label class="visit-pick"><input type="checkbox" data-v-pick="'+esc(p.name)+'"'+(selected.has(core.norm(p.name))?' checked':'')+
 '><span>'+esc(p.name)+'<small>Équipe '+(p.team||'?')+'</small></span></label>').join(''):
 '<p class="empty">Agent introuvable. Crée d’abord sa fiche depuis Agents.</p>';
}
function renderSelected(){
 $('v-selected').innerHTML=selected.size?[...selected.values()].map(p=>{
  const recent=core.lastSigned(p.name,form.elements.date.value,editing),state=core.agentState(p.name);
  return '<div class="visit-selected"><div class="row-between"><strong>'+esc(p.name)+'</strong><button type="button" data-v-remove="'+esc(p.name)+'">Retirer</button></div>'+
   (recent?'<small class="visit-warning">Rapport signé récent : '+api.fmtDate(recent.date)+' '+esc(recent.post)+'</small>':'')+
   (['pending','notasked'].includes(state.status)?'<small class="visit-warning">'+esc(stateText(state.status))+'</small>':'')+
   '<label>Consignes<select data-v-status="'+esc(p.name)+'">'+Object.entries(core.statuses).filter(([v])=>v!=='phone').map(([v,label])=>
    '<option value="'+v+'"'+(p.status===v?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+
   '<label>Observation individuelle<input data-v-personal="'+esc(p.name)+'" maxlength="220" value="'+esc(p.note||'')+'"></label></div>';
 }).join(''):'<p class="hint">Sélectionne un ou plusieurs agents et indique leur statut individuel.</p>';
 duplicates();
}
function duplicates(){
 const el=$('v-duplicate');
 if(form.elements.kind.value!=='report'||!form.elements.signed.checked){el.textContent='';return}
 const duplicates=[...selected.values()].map(p=>({name:p.name,report:core.lastSigned(p.name,form.elements.date.value,editing)})).filter(x=>x.report);
 el.innerHTML=duplicates.length?'<p class="visit-warning"><strong>Doublon possible :</strong> '+duplicates.map(x=>esc(x.name)+' ('+api.fmtDate(x.report.date)+', '+esc(x.report.post)+')').join('; ')+'.</p>':
 '<p class="visit-ok">Aucun rapport signé récent retrouvé pour ces agents.</p>';
}
function openForm(kind='passage',names=[],id=''){
 const previous=id?core.visits().find(x=>x.id===id):null;
 editing=previous?.id||'';selected=new Map();
 if(previous){for(const a of previous.agents)selected.set(core.norm(a.name),{name:a.name,status:a.status,note:a.note||''})}
 else for(const name of names){const a=core.staff().find(x=>core.same(x.name,name));if(a)selected.set(core.norm(a.name),{name:a.name,status:'unknown',note:''})}
 api.activate('visits');
 const f=form.elements;
 f.date.value=previous?.date||day;f.shift.value=previous?.shift||shift;f.time.value=previous?.time||'';
 f.post.value=previous?.post||'';f.kind.value=previous?.kind||kind;f.signed.checked=previous?.signed===true;
 f.note.value=previous?.note||'';f.followDue.value=previous?.followDue||core.datePlus(f.date.value,1);
 $('v-form-title').textContent=previous?'Corriger le '+(previous.kind==='report'?'rapport':'passage'):'Nouveau '+(kind==='report'?'rapport de visite':'passage');
 $('v-form-msg').textContent=previous?'Les anciennes versions restent dans l’historique.':'Aucune modification du planning officiel.';
 $('v-agent-search').value='';
 form.classList.remove('hidden');
 showKind();pickAgents();renderSelected();form.scrollIntoView({behavior:'smooth',block:'start'});
}
function save(e){
 e.preventDefault();
 const f=form.elements;
 const data={id:editing,date:f.date.value,shift:f.shift.value,time:f.time.value,post:f.post.value,
  kind:f.kind.value,signed:f.signed.checked,note:f.note.value,followDue:f.followDue.value,agents:[...selected.values()]};
 if(data.kind==='report'&&data.signed){
  const dup=data.agents.filter(a=>core.lastSigned(a.name,data.date,editing));
  if(dup.length&&!confirm('Rapport signé récent pour '+dup.map(a=>a.name).join(', ')+'. Confirmer ce nouveau rapport malgré le doublon ?'))return;
 }
 try{
  core.saveVisit(data);
  day=data.date;shift=data.shift;
  editing='';form.classList.add('hidden');refresh();
 }catch(err){$('v-form-msg').textContent=err.message||'Enregistrement impossible.'}
}
function callAgent(name){
 const a=core.staff().find(x=>core.same(x.name,name));if(!a)return;
 followAgent=a.name;
 api.activate('visits');
 $('v-follow-agent').textContent=a.name+' · '+stateText(core.agentState(a.name).status);
 follow.elements.outcome.value='confirmed-phone';
 follow.elements.date.value=core.today();
 follow.elements.note.value='';
 $('v-follow-msg').textContent='Une déclaration par téléphone ne devient pas un contrôle sur place.';
 follow.classList.remove('hidden');
 follow.scrollIntoView({behavior:'smooth',block:'center'});
}
$('v-follow-close').onclick=()=>{followAgent='';follow.classList.add('hidden')};
follow.addEventListener('submit',e=>{
 e.preventDefault();if(!followAgent)return;
 const f=follow.elements,answer=f.outcome.value,date=f.date.value;
 const mapped={
  'confirmed-phone':{result:'confirmed',method:'phone'},
  'still-pending':{result:'pending',method:'phone'},
  'confirmed-site':{result:'confirmed',method:'on-site'}
 }[answer];
 if(!mapped||!core.valid(date))return $('v-follow-msg').textContent='Choisis un résultat et une date valides.';
 try{
  core.saveFollowup(followAgent,mapped.result,mapped.method,date,f.note.value,core.agentState(followAgent).sourceVisitId);
  follow.classList.add('hidden');followAgent='';refresh();
 }catch(err){$('v-follow-msg').textContent=err.message||'Enregistrement impossible.'}
});

function readShiftForm(){const f=form.elements;return {date:f.date.value,shift:f.shift.value}}
$('v-date').value=day;$('v-shift').value=shift;
$('v-date').onchange=e=>{if(core.valid(e.target.value)){day=e.target.value;refresh()}};
$('v-shift').onchange=e=>{if(core.shiftNames[e.target.value]){shift=e.target.value;refresh()}};
$('v-new-pass').onclick=()=>openForm('passage');
$('v-new-report').onclick=()=>openForm('report');
$('v-back').onclick=()=>api.activate('home');
$('v-cancel').onclick=()=>{form.classList.add('hidden');editing=''};
$('v-all-history').onclick=()=>{allHistory=!allHistory;renderHistory()};
$('v-share').onclick=()=>window.MyTeamVisitsPlanner?.share?.();
$('v-open-planner').onclick=()=>window.MyTeamVisitsPlanner?.open?.();
$('v-agent-search').oninput=pickAgents;
$('v-agent-pick').onchange=e=>{
 const c=e.target.closest('[data-v-pick]');if(!c)return;
 const name=c.dataset.vPick,key=core.norm(name);
 if(c.checked)selected.set(key,selected.get(key)||{name,status:'unknown',note:''});else selected.delete(key);
 renderSelected();
};
$('v-selected').addEventListener('click',e=>{
 const b=e.target.closest('[data-v-remove]');if(b){selected.delete(core.norm(b.dataset.vRemove));renderSelected();pickAgents()}
});
$('v-selected').onchange=e=>{
 const c=e.target.closest('[data-v-status]');if(!c)return;
 const p=selected.get(core.norm(c.dataset.vStatus));if(p)p.status=c.value;
};
$('v-selected').oninput=e=>{
 const c=e.target.closest('[data-v-personal]');if(!c)return;
 const p=selected.get(core.norm(c.dataset.vPersonal));if(p)p.note=c.value;
};
$('v-apply-status').onclick=()=>{
 const choice=prompt('Statut à attribuer aux agents sélectionnés :\n1 OK · 2 Non validées · 3 Non demandées · 4 À vérifier','1');
 const status={'1':'ok','2':'pending','3':'notasked','4':'unknown'}[choice];
 if(!status)return;for(const a of selected.values())a.status=status;renderSelected();
};
form.elements.kind.onchange=showKind;
form.elements.signed.onchange=duplicates;
form.elements.date.onchange=()=>{form.elements.followDue.value=core.datePlus(form.elements.date.value,1);renderSelected()};
form.addEventListener('submit',save);
section.addEventListener('click',e=>{
 const call=e.target.closest('[data-v-call]');if(call){callAgent(call.dataset.vCall);return}
 const ag=e.target.closest('[data-v-agent]');if(ag){api.openAgent(ag.dataset.vAgent);renderProfile();return}
 const edit=e.target.closest('[data-v-edit]');if(edit){const v=core.visits().find(x=>x.id===edit.dataset.vEdit);if(v)openForm(v.kind,[],v.id);return}
});
document.addEventListener('click',e=>{if(e.target.closest('[data-open-agent]'))setTimeout(renderProfile,0)});
window.addEventListener('myteam-visits-updated',refresh);
window.addEventListener('focus',()=>{if(document.visibilityState!=='hidden')refresh()});
window.MyTeamVisits={open,openForm,renderHome,renderProfile,renderHistory,renderAlerts,callAgent,refresh};
refresh();
})();