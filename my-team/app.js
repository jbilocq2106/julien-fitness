const STORAGE_KEY='myTeam.v1';
const defaultState={agents:[],logs:[],adviceIndex:0};
let state=loadState();
let deferredPrompt=null;
let activeFilter='all';

const advice=[
  "Commence par reconnaître un effort précis avant de corriger un point : la reconnaissance crédible renforce l’autorité sans passer par la répression.",
  "Pour rester équitable, explique le critère d’une décision avant le nom de la personne concernée : besoin opérationnel, qualification, rotation ou volontariat.",
  "Un agent volontaire ne doit pas devenir celui qu’on sollicite toujours. Valorise sa disponibilité, mais protège aussi une rotation équitable.",
  "Quand un problème se répète, décris d’abord les faits observables, puis leur impact, puis l’attente pour la suite. Évite les jugements de personnalité.",
  "Passe régulièrement sur les postes sans attendre un incident. Une présence calme et prévisible construit davantage la confiance qu’un contrôle uniquement correctif.",
  "Quand deux agents demandent la même chose, utilise un critère annoncé et traçable. L’équité perçue vient surtout de la cohérence des règles.",
  "Fais remonter aussi ce qui fonctionne bien. Un compte rendu équilibré aide le superviseur à voir les contributions positives, pas seulement les écarts.",
  "Avant une décision sensible, demande-toi : est-ce que je pourrais expliquer exactement la même règle à toute l’équipe ? Si oui, la décision est probablement défendable."
];

function loadState(){
  try{const raw=localStorage.getItem(STORAGE_KEY);return raw?{...defaultState,...JSON.parse(raw)}:{...defaultState};}
  catch{return {...defaultState};}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderAll();}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function sameDay(a,b){const da=new Date(a),db=new Date(b);return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate()}
function fmtDate(v){return new Intl.DateTimeFormat('fr-LU',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}

function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='log')renderLogs();
  if(id==='dashboard')renderDashboard();
}

document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));

function renderHome(){
  document.getElementById('statAgents').textContent=state.agents.length;
  document.getElementById('statToday').textContent=state.logs.filter(x=>sameDay(x.createdAt,Date.now())).length;
  document.getElementById('statFollow').textContent=state.logs.filter(x=>x.follow&&!x.closed).length;
  document.getElementById('adviceText').textContent=advice[state.adviceIndex%advice.length];
}

document.getElementById('nextAdvice').addEventListener('click',()=>{state.adviceIndex=(state.adviceIndex+1)%advice.length;saveState()});

function renderAgents(){
  const box=document.getElementById('agentList');
  if(!state.agents.length){box.innerHTML='<div class="empty">Aucun agent enregistré. Ajoute les agents progressivement, avec uniquement les informations professionnelles utiles.</div>';return}
  box.innerHTML=state.agents.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(a=>{
    const related=state.logs.filter(l=>l.agentId===a.id).length;
    return `<article class="agent-card">
      <h3>${esc(a.name)}</h3>
      <div class="meta">${related} entrée(s) de main courante liée(s)</div>
      ${a.quals?`<p><strong>Qualifications :</strong> ${esc(a.quals)}</p>`:''}
      ${a.prefs?`<p><strong>Desiderata :</strong> ${esc(a.prefs)}</p>`:''}
      ${a.less?`<p><strong>Moins apprécié / contraintes :</strong> ${esc(a.less)}</p>`:''}
      ${a.notes?`<p><strong>Suivi factuel :</strong> ${esc(a.notes)}</p>`:''}
      <div class="log-actions"><button class="ghost small" data-log-agent="${a.id}">Ajouter un fait</button><button class="ghost small danger-text" data-delete-agent="${a.id}">Supprimer</button></div>
    </article>`
  }).join('');
  box.querySelectorAll('[data-log-agent]').forEach(b=>b.addEventListener('click',()=>openLogDialog(b.dataset.logAgent)));
  box.querySelectorAll('[data-delete-agent]').forEach(b=>b.addEventListener('click',()=>{
    if(confirm('Supprimer cette fiche agent ? Les entrées de main courante seront conservées sans modifier leur texte.')){
      state.agents=state.agents.filter(a=>a.id!==b.dataset.deleteAgent);saveState();
    }
  }));
}

function refreshAgentSelect(){
  const s=document.getElementById('logAgent');
  const current=s.value;
  s.innerHTML='<option value="">— Aucun / général —</option>'+state.agents.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
  if([...s.options].some(o=>o.value===current))s.value=current;
}

document.getElementById('addAgentBtn').addEventListener('click',()=>document.getElementById('agentDialog').showModal());
document.getElementById('agentForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('agentName').value.trim();
  if(!name)return;
  state.agents.push({id:uid(),name,quals:document.getElementById('agentQuals').value.trim(),prefs:document.getElementById('agentPrefs').value.trim(),less:document.getElementById('agentLess').value.trim(),notes:document.getElementById('agentNotes').value.trim(),createdAt:new Date().toISOString()});
  e.target.reset();document.getElementById('agentDialog').close();saveState();
});

function openLogDialog(agentId=''){
  refreshAgentSelect();
  document.getElementById('logAgent').value=agentId;
  document.getElementById('logDialog').showModal();
}
document.getElementById('addLogBtn').addEventListener('click',()=>openLogDialog());
document.getElementById('logForm').addEventListener('submit',e=>{
  e.preventDefault();
  const text=document.getElementById('logText').value.trim();if(!text)return;
  const agentId=document.getElementById('logAgent').value;
  const agent=state.agents.find(a=>a.id===agentId);
  state.logs.unshift({id:uid(),createdAt:new Date().toISOString(),category:document.getElementById('logCategory').value,agentId:agentId||null,agentNameSnapshot:agent?.name||'',nature:document.getElementById('logNature').value,text,action:document.getElementById('logAction').value.trim(),follow:document.getElementById('logFollow').checked,supervisor:document.getElementById('logSupervisor').checked,closed:false});
  e.target.reset();document.getElementById('logDialog').close();saveState();
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
  const list=filteredLogs();
  if(!list.length){box.innerHTML='<div class="empty">Aucune entrée pour ce filtre.</div>';return}
  box.innerHTML=list.map(l=>`<article class="log-card">
    <div class="log-head"><div><h3>${esc(l.category)}</h3><div class="meta">${fmtDate(l.createdAt)}${l.agentNameSnapshot?' · '+esc(l.agentNameSnapshot):''}</div></div><span class="nature ${l.nature}">${natureLabel(l.nature)}</span></div>
    <p>${esc(l.text)}</p>
    ${l.action?`<p><strong>Action :</strong> ${esc(l.action)}</p>`:''}
    <div class="tag-row">${l.follow?`<span class="flag">${l.closed?'Suivi clôturé':'À suivre'}</span>`:''}${l.supervisor?'<span class="flag supervisor">À transmettre</span>':''}</div>
    <div class="log-actions">${l.follow&&!l.closed?`<button class="ghost small" data-close-log="${l.id}">Clôturer le suivi</button>`:''}<button class="ghost small danger-text" data-delete-log="${l.id}">Supprimer</button></div>
  </article>`).join('');
  box.querySelectorAll('[data-close-log]').forEach(b=>b.addEventListener('click',()=>{const l=state.logs.find(x=>x.id===b.dataset.closeLog);if(l){l.closed=true;saveState()}}));
  box.querySelectorAll('[data-delete-log]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Supprimer cette entrée ?')){state.logs=state.logs.filter(x=>x.id!==b.dataset.deleteLog);saveState()}}));
}
document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{
  activeFilter=b.dataset.filter;document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));renderLogs();
}));

function renderDashboard(){
  const today=state.logs.filter(x=>sameDay(x.createdAt,Date.now()));
  const facts=today.filter(x=>x.nature==='fact').length;
  const declarations=today.filter(x=>x.nature==='declared').length;
  const assessments=today.filter(x=>x.nature==='assessment').length;
  const follow=state.logs.filter(x=>x.follow&&!x.closed).length;
  document.getElementById('indicatorList').innerHTML=[['Agents enregistrés',state.agents.length],['Entrées aujourd’hui',today.length],['Faits constatés aujourd’hui',facts],['Déclarations agents aujourd’hui',declarations],['Appréciations managériales aujourd’hui',assessments],['Suivis ouverts',follow]].map(([k,v])=>`<div class="indicator"><span>${k}</span><strong>${v}</strong></div>`).join('');
}

function buildSummary(){
  const today=state.logs.filter(x=>sameDay(x.createdAt,Date.now())).slice().reverse();
  if(!today.length)return 'Aucun fait enregistré aujourd’hui.';
  const parts=[];
  const date=new Intl.DateTimeFormat('fr-LU',{dateStyle:'full'}).format(new Date());
  parts.push(`Synthèse de vacation — ${date}`,'');
  const cats=[...new Set(today.map(x=>x.category))];
  cats.forEach(cat=>{
    parts.push(cat+':');
    today.filter(x=>x.category===cat).forEach(l=>{
      const who=l.agentNameSnapshot?` — ${l.agentNameSnapshot}`:'';
      const kind=natureLabel(l.nature);
      parts.push(`• ${kind}${who} : ${l.text}${l.action?` | Action : ${l.action}`:''}${l.follow&&!l.closed?' | À suivre':''}${l.supervisor?' | À transmettre':''}`);
    });
    parts.push('');
  });
  const open=state.logs.filter(x=>x.follow&&!x.closed);
  if(open.length){parts.push(`Points encore à suivre : ${open.length}.`)}
  return parts.join('\n');
}
document.getElementById('summaryBtn').addEventListener('click',()=>document.getElementById('summaryOutput').value=buildSummary());

function exportData(){
  const blob=new Blob([JSON.stringify({app:'My Team',version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`my-team-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.getElementById('exportBtn').addEventListener('click',exportData);
document.querySelector('[data-action="export"]').addEventListener('click',exportData);
document.getElementById('importInput').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{const data=JSON.parse(await f.text());const incoming=data.state||data;if(!Array.isArray(incoming.agents)||!Array.isArray(incoming.logs))throw new Error();state={...defaultState,...incoming};saveState();alert('Données importées.')}catch{alert('Fichier My Team non reconnu.')}finally{e.target.value=''}
});

function renderAll(){renderHome();renderAgents();refreshAgentSelect();renderLogs();renderDashboard()}
renderAll();

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').hidden=false});
document.getElementById('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.getElementById('installBtn').hidden=true});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=1');
