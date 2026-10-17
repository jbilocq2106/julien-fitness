const STORAGE_KEY='myTeam.v2';
const LEGACY_KEY='myTeam.v1';
const defaultState={version:2,agents:[],logs:[],assignments:[],leaves:[],adviceIndex:0};
let state=loadState();
let deferredPrompt=null;
let activeFilter='all';
let activeOpsTab='assignments';

const advice=[
  "Commence par reconnaître un effort précis avant de corriger un point : une reconnaissance crédible renforce l’autorité sans passer par la répression.",
  "Pour rester équitable, explique le critère d’une décision avant le nom de la personne concernée : besoin opérationnel, qualification, rotation ou volontariat.",
  "Un agent volontaire ne doit pas devenir celui qu’on sollicite toujours. Valorise sa disponibilité, mais protège aussi une rotation équitable.",
  "Quand un problème se répète, décris d’abord les faits observables, puis leur impact, puis l’attente pour la suite. Évite les jugements de personnalité.",
  "Passe régulièrement sur les postes sans attendre un incident. Une présence calme et prévisible construit davantage la confiance qu’un contrôle uniquement correctif.",
  "Quand deux agents demandent la même chose, utilise un critère annoncé et traçable. L’équité perçue vient surtout de la cohérence des règles.",
  "Fais remonter aussi ce qui fonctionne bien. Un compte rendu équilibré aide le superviseur à voir les contributions positives, pas seulement les écarts.",
  "Avant une décision sensible, demande-toi : pourrais-je expliquer exactement la même règle à toute l’équipe ? Si oui, la décision est plus facile à défendre.",
  "Une préférence exprimée par un agent est une information à considérer, pas une promesse. Note-la, puis arbitre avec les besoins, les qualifications et la rotation.",
  "La ponctualité et l’assiduité méritent d’être reconnues explicitement. Évite cependant d’en faire un système automatique de récompense qui créerait des privilèges fixes."
];

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_KEY);
    if(!raw)return structuredCloneSafe(defaultState);
    const parsed=JSON.parse(raw);
    return normalizeState(parsed);
  }catch(e){return structuredCloneSafe(defaultState)}
}
function normalizeState(s){
  const out={...defaultState,...(s||{})};
  out.version=2;
  out.agents=Array.isArray(out.agents)?out.agents:[];
  out.logs=Array.isArray(out.logs)?out.logs:[];
  out.assignments=Array.isArray(out.assignments)?out.assignments:[];
  out.leaves=Array.isArray(out.leaves)?out.leaves:[];
  out.agents.forEach(a=>{a.posts=a.posts||'';a.positives=a.positives||''});
  return out;
}
function structuredCloneSafe(v){return JSON.parse(JSON.stringify(v))}
function saveState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  renderAll();
}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}
function round2(v){return Math.round((num(v)+Number.EPSILON)*100)/100}
function todayKey(){return localDateKey(new Date())}
function localDateKey(d){const x=d instanceof Date?d:new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function monthKey(v=new Date()){const d=v instanceof Date?v:new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function sameDay(a,b){return localDateKey(a)===localDateKey(b)}
function fmtDate(v){try{return new Intl.DateTimeFormat('fr-LU',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return v||''}}
function fmtDateOnly(v){if(!v)return '';try{return new Intl.DateTimeFormat('fr-LU',{dateStyle:'short'}).format(new Date(v+'T12:00:00'))}catch{return v}}
function fmtHours(v){return `${round2(v).toLocaleString('fr-FR',{maximumFractionDigits:2})} h`}
function nowLocalInput(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
function closeDialog(id){document.getElementById(id)?.close()}
function getAgent(id){return state.agents.find(a=>a.id===id)||null}
function snapshotName(id){return getAgent(id)?.name||''}
function inCurrentMonth(date){return String(date||'').slice(0,7)===monthKey()}
function dateInRange(date,start,end){return !!date&&!!start&&!!end&&date>=start&&date<=end}
function parseHoursFromTimes(start,end){
  if(!start||!end)return 0;
  const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
  if([sh,sm,eh,em].some(n=>!Number.isFinite(n)))return 0;
  let mins=(eh*60+em)-(sh*60+sm);if(mins<0)mins+=24*60;
  return round2(mins/60);
}

function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='log')renderLogs();
  if(id==='operations')renderOperations();
  if(id==='dashboard')renderDashboard();
}
document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.close)));

function renderHome(){
  document.getElementById('statAgents').textContent=state.agents.length;
  document.getElementById('statToday').textContent=state.logs.filter(x=>sameDay(x.createdAt,Date.now())).length;
  document.getElementById('statFollow').textContent=state.logs.filter(x=>x.follow&&!x.closed).length;
  document.getElementById('statTodayAssignments').textContent=state.assignments.filter(x=>x.date===todayKey()).length;
  document.getElementById('adviceText').textContent=advice[state.adviceIndex%advice.length];
}
document.getElementById('nextAdvice').addEventListener('click',()=>{state.adviceIndex=(state.adviceIndex+1)%advice.length;saveState()});

function renderAgents(){
  const box=document.getElementById('agentList');
  const q=(document.getElementById('agentSearch')?.value||'').trim().toLowerCase();
  const list=state.agents.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).filter(a=>{
    if(!q)return true;
    return [a.name,a.quals,a.posts,a.prefs,a.less,a.positives,a.notes].join(' ').toLowerCase().includes(q);
  });
  if(!list.length){box.innerHTML=`<div class="empty">${state.agents.length?'Aucun agent ne correspond à la recherche.':'Aucun agent enregistré. Ajoute les agents progressivement, avec uniquement les informations professionnelles utiles.'}</div>`;return}
  box.innerHTML=list.map(a=>{
    const related=state.logs.filter(l=>l.agentId===a.id).length;
    const monthAssignments=state.assignments.filter(x=>x.agentId===a.id&&inCurrentMonth(x.date));
    const actual=monthAssignments.reduce((s,x)=>s+num(x.actualHours||x.plannedHours),0);
    return `<article class="agent-card">
      <div class="agent-title"><div><h3>${esc(a.name)}</h3><div class="meta">${related} entrée(s) de main courante · ${monthAssignments.length} affectation(s) ce mois · ${fmtHours(actual)}</div></div><button class="ghost small" data-edit-agent="${a.id}">Modifier</button></div>
      ${a.quals?`<p><strong>Qualifications :</strong> ${esc(a.quals)}</p>`:''}
      ${a.posts?`<p><strong>Postes maîtrisés :</strong> ${esc(a.posts)}</p>`:''}
      ${a.prefs?`<p><strong>Desiderata :</strong> ${esc(a.prefs)}</p>`:''}
      ${a.less?`<p><strong>Moins apprécié / contraintes :</strong> ${esc(a.less)}</p>`:''}
      ${a.positives?`<p><strong>Efforts / points positifs :</strong> ${esc(a.positives)}</p>`:''}
      ${a.notes?`<p><strong>Suivi factuel :</strong> ${esc(a.notes)}</p>`:''}
      <div class="log-actions"><button class="ghost small" data-log-agent="${a.id}">Ajouter un fait</button><button class="ghost small" data-assign-agent="${a.id}">Affecter</button><button class="ghost small danger-text" data-delete-agent="${a.id}">Supprimer</button></div>
    </article>`
  }).join('');
  box.querySelectorAll('[data-log-agent]').forEach(b=>b.addEventListener('click',()=>openLogDialog('',b.dataset.logAgent)));
  box.querySelectorAll('[data-assign-agent]').forEach(b=>b.addEventListener('click',()=>openAssignmentDialog('',b.dataset.assignAgent)));
  box.querySelectorAll('[data-edit-agent]').forEach(b=>b.addEventListener('click',()=>openAgentDialog(b.dataset.editAgent)));
  box.querySelectorAll('[data-delete-agent]').forEach(b=>b.addEventListener('click',()=>{
    if(confirm('Supprimer cette fiche agent ? Les entrées déjà enregistrées conserveront le nom mémorisé.')){
      state.agents=state.agents.filter(a=>a.id!==b.dataset.deleteAgent);saveState();
    }
  }));
}
document.getElementById('agentSearch').addEventListener('input',renderAgents);

function openAgentDialog(id=''){
  const a=id?getAgent(id):null;
  document.getElementById('agentDialogTitle').textContent=a?'Modifier la fiche':'Ajouter un agent';
  document.getElementById('agentEditId').value=a?.id||'';
  document.getElementById('agentName').value=a?.name||'';
  document.getElementById('agentQuals').value=a?.quals||'';
  document.getElementById('agentPosts').value=a?.posts||'';
  document.getElementById('agentPrefs').value=a?.prefs||'';
  document.getElementById('agentLess').value=a?.less||'';
  document.getElementById('agentPositives').value=a?.positives||'';
  document.getElementById('agentNotes').value=a?.notes||'';
  document.getElementById('agentDialog').showModal();
}
document.getElementById('addAgentBtn').addEventListener('click',()=>openAgentDialog());
document.getElementById('agentForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('agentName').value.trim();if(!name)return;
  const id=document.getElementById('agentEditId').value;
  const payload={name,quals:document.getElementById('agentQuals').value.trim(),posts:document.getElementById('agentPosts').value.trim(),prefs:document.getElementById('agentPrefs').value.trim(),less:document.getElementById('agentLess').value.trim(),positives:document.getElementById('agentPositives').value.trim(),notes:document.getElementById('agentNotes').value.trim()};
  if(id){const a=getAgent(id);if(a)Object.assign(a,payload,{updatedAt:new Date().toISOString()})}
  else state.agents.push({id:uid(),...payload,createdAt:new Date().toISOString()});
  closeDialog('agentDialog');saveState();
});

function refreshAgentSelects(){
  const options=state.agents.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
  ['logAgent','assignmentAgent','leaveAgent'].forEach(id=>{
    const s=document.getElementById(id);if(!s)return;const current=s.value;
    const empty=id==='logAgent'?'<option value="">— Aucun / général —</option>':'<option value="">— Choisir —</option>';
    s.innerHTML=empty+options;
    if([...s.options].some(o=>o.value===current))s.value=current;
  });
}

function openLogDialog(id='',agentId=''){
  refreshAgentSelects();
  const l=id?state.logs.find(x=>x.id===id):null;
  document.getElementById('logDialogTitle').textContent=l?'Modifier l’entrée':'Nouvelle entrée';
  document.getElementById('logEditId').value=l?.id||'';
  document.getElementById('logDateTime').value=l?toLocalInput(l.createdAt):nowLocalInput();
  document.getElementById('logCategory').value=l?.category||'Planning';
  document.getElementById('logAgent').value=l?.agentId||agentId||'';
  document.getElementById('logPost').value=l?.post||'';
  document.getElementById('logNature').value=l?.nature||'fact';
  document.getElementById('logText').value=l?.text||'';
  document.getElementById('logAction').value=l?.action||'';
  document.getElementById('logFollow').checked=!!l?.follow;
  document.getElementById('logSupervisor').checked=!!l?.supervisor;
  document.getElementById('logDialog').showModal();
}
function toLocalInput(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return nowLocalInput();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
document.getElementById('addLogBtn').addEventListener('click',()=>openLogDialog());
document.getElementById('logForm').addEventListener('submit',e=>{
  e.preventDefault();
  const text=document.getElementById('logText').value.trim();if(!text)return;
  const id=document.getElementById('logEditId').value;
  const agentId=document.getElementById('logAgent').value;
  const payload={createdAt:new Date(document.getElementById('logDateTime').value).toISOString(),category:document.getElementById('logCategory').value,agentId:agentId||null,agentNameSnapshot:snapshotName(agentId),post:document.getElementById('logPost').value.trim(),nature:document.getElementById('logNature').value,text,action:document.getElementById('logAction').value.trim(),follow:document.getElementById('logFollow').checked,supervisor:document.getElementById('logSupervisor').checked};
  if(id){const l=state.logs.find(x=>x.id===id);if(l)Object.assign(l,payload,{updatedAt:new Date().toISOString()})}
  else state.logs.unshift({id:uid(),...payload,closed:false});
  closeDialog('logDialog');saveState();
});

function natureLabel(v){return v==='declared'?'Déclaration agent':v==='assessment'?'Appréciation managériale':'Fait constaté'}
function filteredLogs(){return state.logs.filter(l=>{
  if(activeFilter==='today')return sameDay(l.createdAt,Date.now());
  if(activeFilter==='follow')return l.follow&&!l.closed;
  if(activeFilter==='supervisor')return l.supervisor;
  return true;
})}
function renderLogs(){
  const box=document.getElementById('logList');
  const list=filteredLogs().slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!list.length){box.innerHTML='<div class="empty">Aucune entrée pour ce filtre.</div>';return}
  box.innerHTML=list.map(l=>`<article class="log-card">
    <div class="log-head"><div><h3>${esc(l.category)}</h3><div class="meta">${fmtDate(l.createdAt)}${l.agentNameSnapshot?' · '+esc(l.agentNameSnapshot):''}${l.post?' · '+esc(l.post):''}</div></div><span class="nature ${l.nature}">${natureLabel(l.nature)}</span></div>
    <p>${esc(l.text)}</p>
    ${l.action?`<p><strong>Action :</strong> ${esc(l.action)}</p>`:''}
    <div class="tag-row">${l.follow?`<span class="flag">${l.closed?'Suivi clôturé':'À suivre'}</span>`:''}${l.supervisor?'<span class="flag supervisor">À transmettre</span>':''}</div>
    <div class="log-actions"><button class="ghost small" data-edit-log="${l.id}">Modifier</button>${l.follow&&!l.closed?`<button class="ghost small" data-close-log="${l.id}">Clôturer le suivi</button>`:''}<button class="ghost small danger-text" data-delete-log="${l.id}">Supprimer</button></div>
  </article>`).join('');
  box.querySelectorAll('[data-edit-log]').forEach(b=>b.addEventListener('click',()=>openLogDialog(b.dataset.editLog)));
  box.querySelectorAll('[data-close-log]').forEach(b=>b.addEventListener('click',()=>{const l=state.logs.find(x=>x.id===b.dataset.closeLog);if(l){l.closed=true;l.closedAt=new Date().toISOString();saveState()}}));
  box.querySelectorAll('[data-delete-log]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Supprimer cette entrée ?')){state.logs=state.logs.filter(x=>x.id!==b.dataset.deleteLog);saveState()}}));
}
document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));renderLogs()}));

function setOpsTab(tab){
  activeOpsTab=tab;
  document.querySelectorAll('[data-ops-tab]').forEach(b=>b.classList.toggle('active',b.dataset.opsTab===tab));
  document.getElementById('assignmentsPanel').classList.toggle('active',tab==='assignments');
  document.getElementById('leavesPanel').classList.toggle('active',tab==='leaves');
}
document.querySelectorAll('[data-ops-tab]').forEach(b=>b.addEventListener('click',()=>setOpsTab(b.dataset.opsTab)));

function renderOperations(){renderAssignments();renderLeaves();setOpsTab(activeOpsTab)}
function renderAssignments(){
  const box=document.getElementById('assignmentList');
  const list=state.assignments.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.start||'').localeCompare(String(a.start||'')));
  if(!list.length){box.innerHTML='<div class="empty">Aucune affectation enregistrée.</div>';return}
  box.innerHTML=list.map(x=>{
    const shown=x.actualHours!==''&&x.actualHours!=null?x.actualHours:x.plannedHours;
    return `<article class="log-card"><div class="log-head"><div><h3>${esc(x.agentNameSnapshot||snapshotName(x.agentId)||'Agent')}</h3><div class="meta">${fmtDateOnly(x.date)}${x.start?` · ${esc(x.start)}${x.end?'–'+esc(x.end):''}`:''}</div></div><span class="tag">${esc(x.post)}</span></div><p><strong>Heures :</strong> ${fmtHours(shown)}${x.actualHours!==''&&x.actualHours!=null&&num(x.actualHours)!==num(x.plannedHours)?` <span class="muted">(prévu ${fmtHours(x.plannedHours)})</span>`:''}</p>${x.note?`<p>${esc(x.note)}</p>`:''}<div class="log-actions"><button class="ghost small" data-edit-assignment="${x.id}">Modifier</button><button class="ghost small danger-text" data-delete-assignment="${x.id}">Supprimer</button></div></article>`;
  }).join('');
  box.querySelectorAll('[data-edit-assignment]').forEach(b=>b.addEventListener('click',()=>openAssignmentDialog(b.dataset.editAssignment)));
  box.querySelectorAll('[data-delete-assignment]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Supprimer cette affectation ?')){state.assignments=state.assignments.filter(x=>x.id!==b.dataset.deleteAssignment);saveState()}}));
}
function openAssignmentDialog(id='',agentId=''){
  refreshAgentSelects();
  const x=id?state.assignments.find(a=>a.id===id):null;
  document.getElementById('assignmentDialogTitle').textContent=x?'Modifier l’affectation':'Nouvelle affectation';
  document.getElementById('assignmentEditId').value=x?.id||'';
  document.getElementById('assignmentDate').value=x?.date||todayKey();
  document.getElementById('assignmentAgent').value=x?.agentId||agentId||'';
  document.getElementById('assignmentPost').value=x?.post||'';
  document.getElementById('assignmentStart').value=x?.start||'';
  document.getElementById('assignmentEnd').value=x?.end||'';
  document.getElementById('assignmentPlanned').value=x?.plannedHours??'';
  document.getElementById('assignmentActual').value=x?.actualHours??'';
  document.getElementById('assignmentNote').value=x?.note||'';
  document.getElementById('assignmentDialog').showModal();
}
document.getElementById('addAssignmentBtn').addEventListener('click',()=>openAssignmentDialog());
function autoPlannedHours(){const p=document.getElementById('assignmentPlanned');if(p.value)return;const h=parseHoursFromTimes(document.getElementById('assignmentStart').value,document.getElementById('assignmentEnd').value);if(h)p.value=h}
document.getElementById('assignmentStart').addEventListener('change',autoPlannedHours);
document.getElementById('assignmentEnd').addEventListener('change',autoPlannedHours);
document.getElementById('assignmentForm').addEventListener('submit',e=>{
  e.preventDefault();const id=document.getElementById('assignmentEditId').value;const agentId=document.getElementById('assignmentAgent').value;if(!agentId)return;
  const start=document.getElementById('assignmentStart').value,end=document.getElementById('assignmentEnd').value;
  let planned=document.getElementById('assignmentPlanned').value; if(planned==='')planned=parseHoursFromTimes(start,end)||'';
  const actual=document.getElementById('assignmentActual').value;
  const payload={date:document.getElementById('assignmentDate').value,agentId,agentNameSnapshot:snapshotName(agentId),post:document.getElementById('assignmentPost').value.trim(),start,end,plannedHours:planned===''?'':round2(planned),actualHours:actual===''?'':round2(actual),note:document.getElementById('assignmentNote').value.trim()};
  if(id){const x=state.assignments.find(a=>a.id===id);if(x)Object.assign(x,payload,{updatedAt:new Date().toISOString()})}
  else state.assignments.push({id:uid(),...payload,createdAt:new Date().toISOString()});
  closeDialog('assignmentDialog');saveState();
});

function renderLeaves(){
  const box=document.getElementById('leaveList');
  const list=state.leaves.slice().sort((a,b)=>String(b.start).localeCompare(String(a.start)));
  if(!list.length){box.innerHTML='<div class="empty">Aucun congé ou absence enregistré.</div>';return}
  box.innerHTML=list.map(x=>`<article class="log-card"><div class="log-head"><div><h3>${esc(x.agentNameSnapshot||snapshotName(x.agentId)||'Agent')}</h3><div class="meta">${fmtDateOnly(x.start)} → ${fmtDateOnly(x.end)}</div></div><span class="tag">${esc(x.type)}</span></div><p><strong>Statut :</strong> ${esc(x.status)}</p>${x.note?`<p>${esc(x.note)}</p>`:''}<div class="log-actions"><button class="ghost small" data-edit-leave="${x.id}">Modifier</button><button class="ghost small danger-text" data-delete-leave="${x.id}">Supprimer</button></div></article>`).join('');
  box.querySelectorAll('[data-edit-leave]').forEach(b=>b.addEventListener('click',()=>openLeaveDialog(b.dataset.editLeave)));
  box.querySelectorAll('[data-delete-leave]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Supprimer cette entrée ?')){state.leaves=state.leaves.filter(x=>x.id!==b.dataset.deleteLeave);saveState()}}));
}
function openLeaveDialog(id=''){
  refreshAgentSelects();const x=id?state.leaves.find(a=>a.id===id):null;
  document.getElementById('leaveDialogTitle').textContent=x?'Modifier l’entrée':'Nouvelle entrée';
  document.getElementById('leaveEditId').value=x?.id||'';
  document.getElementById('leaveAgent').value=x?.agentId||'';
  document.getElementById('leaveType').value=x?.type||'Congé';
  document.getElementById('leaveStart').value=x?.start||todayKey();
  document.getElementById('leaveEnd').value=x?.end||todayKey();
  document.getElementById('leaveStatus').value=x?.status||'Prévu';
  document.getElementById('leaveNote').value=x?.note||'';
  document.getElementById('leaveDialog').showModal();
}
document.getElementById('addLeaveBtn').addEventListener('click',()=>openLeaveDialog());
document.getElementById('leaveForm').addEventListener('submit',e=>{
  e.preventDefault();const id=document.getElementById('leaveEditId').value,agentId=document.getElementById('leaveAgent').value;if(!agentId)return;
  const start=document.getElementById('leaveStart').value,end=document.getElementById('leaveEnd').value;if(end<start){alert('La date de fin doit être postérieure ou égale à la date de début.');return}
  const payload={agentId,agentNameSnapshot:snapshotName(agentId),type:document.getElementById('leaveType').value,start,end,status:document.getElementById('leaveStatus').value,note:document.getElementById('leaveNote').value.trim()};
  if(id){const x=state.leaves.find(a=>a.id===id);if(x)Object.assign(x,payload,{updatedAt:new Date().toISOString()})}
  else state.leaves.push({id:uid(),...payload,createdAt:new Date().toISOString()});
  closeDialog('leaveDialog');saveState();
});

function renderDashboard(){
  const now=new Date();
  document.getElementById('dashboardPeriod').textContent=new Intl.DateTimeFormat('fr-LU',{month:'long',year:'numeric'}).format(now);
  const today=state.logs.filter(x=>sameDay(x.createdAt,Date.now()));
  const follow=state.logs.filter(x=>x.follow&&!x.closed).length;
  const todayAssignments=state.assignments.filter(x=>x.date===todayKey()).length;
  const unavailableToday=state.leaves.filter(x=>dateInRange(todayKey(),x.start,x.end)&&['Validé','Réalisé','Prévu'].includes(x.status)).length;
  document.getElementById('indicatorList').innerHTML=[['Agents enregistrés',state.agents.length],['Entrées de main courante aujourd’hui',today.length],['Affectations aujourd’hui',todayAssignments],['Congés / absences couvrant aujourd’hui',unavailableToday],['Suivis ouverts',follow],['Éléments marqués à transmettre',state.logs.filter(x=>x.supervisor).length]].map(([k,v])=>`<div class="indicator"><span>${k}</span><strong>${v}</strong></div>`).join('');
  renderHoursTable();renderPostsTable();
}
function renderHoursTable(){
  const host=document.getElementById('hoursTable');
  if(!state.agents.length){host.innerHTML='<div class="empty">Ajoute les agents pour afficher les heures.</div>';return}
  const rows=state.agents.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(a=>{
    const xs=state.assignments.filter(x=>x.agentId===a.id&&inCurrentMonth(x.date));
    const planned=xs.reduce((s,x)=>s+num(x.plannedHours),0);
    const actual=xs.reduce((s,x)=>s+num(x.actualHours!==''&&x.actualHours!=null?x.actualHours:x.plannedHours),0);
    return `<div class="table-row"><strong>${esc(a.name)}</strong><span>${fmtHours(planned)} prév.</span><span>${fmtHours(actual)} saisies</span></div>`;
  }).join('');
  host.innerHTML=`<div class="table-head"><span>Agent</span><span>Prévu</span><span>Réel/saisi</span></div>${rows}`;
}
function renderPostsTable(){
  const host=document.getElementById('postsTable');
  if(!state.agents.length){host.innerHTML='<div class="empty">Ajoute les agents pour afficher la rotation des postes.</div>';return}
  const rows=state.agents.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(a=>{
    const xs=state.assignments.filter(x=>x.agentId===a.id&&inCurrentMonth(x.date));
    const counts={};xs.forEach(x=>{const p=x.post||'Non précisé';counts[p]=(counts[p]||0)+1});
    const detail=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`${esc(p)} × ${n}`).join(' · ')||'Aucune affectation';
    return `<div class="table-row posts"><strong>${esc(a.name)}</strong><span>${xs.length} affect.</span><span>${detail}</span></div>`;
  }).join('');
  host.innerHTML=`<div class="table-head posts"><span>Agent</span><span>Total</span><span>Répartition</span></div>${rows}`;
}

function buildSummary(){
  const date=todayKey();
  const logs=state.logs.filter(x=>sameDay(x.createdAt,Date.now())).slice().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const assignments=state.assignments.filter(x=>x.date===date).slice().sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  const leaves=state.leaves.filter(x=>dateInRange(date,x.start,x.end)&&!['Refusé'].includes(x.status));
  const parts=[];
  const label=new Intl.DateTimeFormat('fr-LU',{dateStyle:'full'}).format(new Date());
  parts.push(`Synthèse de vacation — ${label}`,'');
  if(assignments.length){parts.push('Affectations / heures :');assignments.forEach(x=>parts.push(`• ${x.agentNameSnapshot||snapshotName(x.agentId)} — ${x.post}${x.start?` ${x.start}${x.end?'–'+x.end:''}`:''} — ${fmtHours(x.actualHours!==''&&x.actualHours!=null?x.actualHours:x.plannedHours)}${x.note?` — ${x.note}`:''}`));parts.push('')}
  if(leaves.length){parts.push('Congés / absences :');leaves.forEach(x=>parts.push(`• ${x.agentNameSnapshot||snapshotName(x.agentId)} — ${x.type} (${x.status})${x.note?` — ${x.note}`:''}`));parts.push('')}
  if(logs.length){
    parts.push('Main courante :');
    logs.forEach(l=>parts.push(`• ${natureLabel(l.nature)}${l.agentNameSnapshot?` — ${l.agentNameSnapshot}`:''}${l.post?` — ${l.post}`:''} : ${l.text}${l.action?` | Action : ${l.action}`:''}${l.follow&&!l.closed?' | À suivre':''}${l.supervisor?' | À transmettre':''}`));parts.push('');
  }
  const open=state.logs.filter(x=>x.follow&&!x.closed);
  if(open.length)parts.push(`Points encore à suivre : ${open.length}.`);
  if(!assignments.length&&!leaves.length&&!logs.length)parts.push('Aucun élément enregistré pour aujourd’hui.');
  return parts.join('\n');
}
document.getElementById('summaryBtn').addEventListener('click',()=>document.getElementById('summaryOutput').value=buildSummary());
document.getElementById('copySummaryBtn').addEventListener('click',async()=>{
  const area=document.getElementById('summaryOutput');if(!area.value)area.value=buildSummary();
  try{await navigator.clipboard.writeText(area.value);const b=document.getElementById('copySummaryBtn');const old=b.textContent;b.textContent='✓ Copié';setTimeout(()=>b.textContent=old,1200)}catch{area.select();document.execCommand('copy')}
});

function exportData(){
  const blob=new Blob([JSON.stringify({app:'My Team',version:2,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`my-team-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.getElementById('exportBtn').addEventListener('click',exportData);
document.getElementById('importInput').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{const data=JSON.parse(await f.text());const incoming=data.state||data;if(!Array.isArray(incoming.agents)||!Array.isArray(incoming.logs))throw new Error();state=normalizeState(incoming);saveState();alert('Données My Team importées.')}catch{alert('Fichier My Team non reconnu.')}finally{e.target.value=''}
});

function renderAll(){renderHome();renderAgents();refreshAgentSelects();renderLogs();renderOperations();renderDashboard()}
renderAll();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').hidden=false});
document.getElementById('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById('installBtn').hidden=true});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=2');
