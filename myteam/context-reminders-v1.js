/* MyTEAM : accueil et rappels visuels prives. Aucune donnee agent integree au code public. */
(()=>{
'use strict';
if(window.MyTeamContextReminders)return;
const STORE='myteam_agent_context_reminders_v1';
const $=id=>document.getElementById(id);
const nav=document.querySelector('nav.tabs'),main=document.querySelector('main'),today=$('today');
if(!nav||!main||!today)return;
const read=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(x)?x:[]}catch{return []}};
const save=xs=>{try{localStorage.setItem(STORE,JSON.stringify(xs));return true}catch{return false}};
const active=()=>read().filter(x=>x&&x.status!=='done'&&x.agent&&x.text);
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(g4s|lxp|duss)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).sort();
const matches=(a,b)=>{const x=norm(a),y=norm(b);return x.length>1&&x.every(s=>y.includes(s))};
const style=document.createElement('style');style.textContent=[
'#mt-home-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:8px 0 16px}',
'#mt-home-tiles button{display:grid;text-align:left;gap:7px;min-height:95px;padding:15px;background:#273e58;border:1px solid #57728f;border-radius:16px;font-size:16px}',
'#mt-home-tiles .ctx-ico{font-size:28px}',
'#mt-context-reminders .ctx-row,#mt-parif-context .ctx-row,#mt-agent-context .ctx-row{padding:12px;border:1px solid #506985;border-radius:12px;background:#263950;margin:7px 0}',
'.ctx-row p{margin:6px 0 10px;font-size:14px}',
'.ctx-actions{display:flex;gap:8px;flex-wrap:wrap}.ctx-actions button{min-height:42px;font-size:13px}',
'.ctx-badge{display:inline-block;background:#966021;color:#fff4d9;border-radius:8px;padding:3px 6px;margin-left:5px;font-weight:800;cursor:pointer}',
'#mt-context-reminders input,#mt-context-reminders textarea,#mt-context-reminders select{width:100%;min-height:45px;padding:9px;background:#101c2d;color:#fff;border:1px solid #6c809a;border-radius:10px}',
'#mt-context-reminders label{display:block;margin:10px 0}',
'#mt-parif-context,#mt-agent-context{background:#253952;border:1px solid #607792;border-radius:14px;padding:14px;margin:10px 0}',
'#mt-mobile-nav .ctx-mobile-count:not(:empty){background:#985923;color:white;border-radius:20px;padding:2px 5px;font-size:10px;font-weight:800;position:absolute;top:2px;right:1px;min-width:17px}',
'#mt-mobile-nav button[data-mt-open="context-reminders"]{position:relative}',
'#today .mt-attach-parif-photo{display:none!important}',
'@media(min-width:720px){#mt-home-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}'
].join('');document.head.append(style);
const tab=document.createElement('button');tab.type='button';tab.dataset.tab='context-reminders';tab.textContent='🔔 Rappels';nav.append(tab);
const page=document.createElement('section');page.id='mt-context-reminders';page.className='hidden';
page.innerHTML='<div class="card"><h2>🔔 Rappels sans échéance</h2><p class="muted">Rappels liés aux agents, sans date renseignée. Ils restent affichés tant qu’ils ne sont pas marqués faits.</p><div id="ctx-list"></div><details><summary>Ajouter un rappel sur cet appareil</summary><form id="ctx-form"><label>Agent<input name="agent" required maxlength="100" placeholder="Nom et prénom"></label><label>Action à rappeler<textarea name="text" required maxlength="500"></textarea></label><label>Quand le montrer<select name="condition"><option value="present">Agent concerné</option><option value="afternoon-night">Après-midi ou nuit (si connu)</option><option value="visit">Au passage sur son poste</option></select></label><button type="submit">Enregistrer</button></form></details><p class="muted">Données conservées localement. La synchronisation automatique avec les messages ChatGPT reste à développer.</p></div>';
main.append(page);
// Les échéances générales sont visibles d'abord, suivies des rappels agents sans date.
const deadlines=document.getElementById('mt-reminders-panel');
if(deadlines)page.prepend(deadlines);
tab.addEventListener('click',()=>{nav.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===tab));main.querySelectorAll(':scope > section').forEach(x=>x.classList.toggle('hidden',x!==page));draw();window.scrollTo(0,0)});
const tiles=document.createElement('div');tiles.id='mt-home-tiles';tiles.setAttribute('aria-label','Rubriques MyTEAM');
[['today','☀️','Aujourd’hui'],['team','👥','Agents'],['leave','🏖️','Congés'],['context-reminders','🔔','Rappels']].forEach(([id,icon,label])=>{
 const b=document.createElement('button');b.type='button';b.dataset.ctxTab=id;
 const ico=document.createElement('span');ico.className='ctx-ico';ico.textContent=icon;
 const strong=document.createElement('strong');strong.textContent=label;b.append(ico,strong);
 b.onclick=()=>nav.querySelector('[data-tab="'+id+'"]')?.click();tiles.append(b);
});
today.querySelector('.mt-hero')?.after(tiles);
const mobile=document.getElementById('mt-mobile-nav');
if(mobile){const button=mobile.querySelector('[data-mt-open="context-reminders"]');if(button){const badge=document.createElement('span');badge.className='ctx-mobile-count';badge.setAttribute('aria-hidden','true');button.append(badge)}}
function row(r){
 const box=document.createElement('div');box.className='ctx-row';
 const h=document.createElement('strong');h.textContent=r.agent+(r.status==='postponed'?' · reporté':'');
 const p=document.createElement('p');p.textContent=r.text;
 const actions=document.createElement('div');actions.className='ctx-actions';
 [['done','✓ Fait'],['postponed','↪ Reporter']].forEach(([status,label])=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.onclick=()=>{if(!save(read().map(x=>x.id===r.id?{...x,status,updatedAt:new Date().toISOString()}:x))){alert('Enregistrement impossible');return;}draw()};
  actions.append(b);
 });box.append(h,p,actions);return box;
}
function paint(host,items,empty){
 if(!host)return;host.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.className='muted';p.textContent=empty;host.append(p);}
 else items.forEach(r=>host.append(row(r)));
}
function agentPanel(){
 const detail=$('agent-detail'),selected=$('agent-select');if(!detail||!selected)return;
 let panel=$('mt-agent-context');if(!panel){panel=document.createElement('div');panel.id='mt-agent-context';detail.querySelector('h3')?.after(panel)}
 if(!panel)return;panel.hidden=!selected.value;if(panel.hidden)return;
 const h=document.createElement('h4');h.textContent='🔔 Rappels pour cet agent';
 panel.replaceChildren(h);
 const list=document.createElement('div');panel.append(list);
 paint(list,active().filter(r=>matches(r.agent,selected.value)),'Aucun rappel en attente.');
}
$('agent-select')?.addEventListener('change',agentPanel);
function listBadges(){
 document.querySelectorAll('#agents-direct [data-ad-name]').forEach(b=>{
  const n=active().filter(r=>matches(r.agent,b.dataset.adName)).length;
  let badge=b.querySelector('.ctx-badge');
  if(n){if(!badge){badge=document.createElement('span');badge.className='ctx-badge';b.append(badge)}if(badge.textContent!=='🔔 '+n)badge.textContent='🔔 '+n;}
  else badge?.remove();
 });
}
const parif=$('parif'),overview=$('mt-parif-overview');let parifPanel=null;
if(parif){parifPanel=document.createElement('div');parifPanel.id='mt-parif-context';(overview||parif.firstChild)?.before(parifPanel);}
function planPanel(){
 if(!parifPanel||!overview)return;
 const spotted=new Map(),names=overview.querySelectorAll('.mt-parif-person'),all=active();
 names.forEach(span=>{
  const shift=span.closest('[data-session]')?.dataset.session;
  const raw=Array.from(span.childNodes).filter(x=>x.nodeType===3).map(x=>x.textContent).join(' ');
  const found=all.filter(r=>matches(r.agent,raw)&&(r.condition!=='afternoon-night'||shift==='afternoon'||shift==='night'));
  found.forEach(r=>spotted.set(r.id,r));
  let badge=span.querySelector('.ctx-badge');
  if(found.length){if(!badge){badge=document.createElement('span');badge.className='ctx-badge';badge.setAttribute('role','button');badge.tabIndex=0;span.append(badge)}if(badge.textContent!=='🔔 '+found.length)badge.textContent='🔔 '+found.length;badge.dataset.ctxOpen='1';}
  else badge?.remove();
 });
 const h=document.createElement('h3');h.textContent='🔔 Rappels à vérifier sur le plan';parifPanel.replaceChildren(h);
 const list=document.createElement('div');parifPanel.append(list);
 if(!names.length){
  const p=document.createElement('p');p.className='muted';p.textContent='Photo sans transcription des noms : vérifie ces rappels sur le document. Aucune présence déduite automatiquement.';parifPanel.append(p);
  paint(list,all,'Aucun rappel en attente.');
 }else paint(list,[...spotted.values()],'Aucun rappel correspondant aux noms transcrits.');
}
overview?.addEventListener('click',e=>{if(e.target.closest('.ctx-badge[data-ctx-open]')){e.preventDefault();e.stopImmediatePropagation();tab.click()}},true);
overview?.addEventListener('keydown',e=>{if(e.target.matches('.ctx-badge[data-ctx-open]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();tab.click()}},true);
function draw(){
 paint($('ctx-list'),active().sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))),'Aucun rappel agent sans date en attente sur cet appareil.');
 const n=active().length;
 const b=tiles.querySelector('[data-ctx-tab="context-reminders"] strong');if(b)b.textContent='Rappels'+(n?' ('+n+')':'');
 const mobileCount=document.querySelector('#mt-mobile-nav [data-mt-open="context-reminders"] .ctx-mobile-count');if(mobileCount)mobileCount.textContent=n?String(n):'';
 agentPanel();listBadges();planPanel();
}
$('ctx-form').addEventListener('submit',e=>{
 e.preventDefault();const f=e.currentTarget;
 const agent=String(f.elements.agent.value||'').trim(),text=String(f.elements.text.value||'').trim();
 if(!agent||!text)return;
 const r={id:'ctx-'+Date.now()+'-'+Math.random().toString(36).slice(2),agent:agent.slice(0,100),text:text.slice(0,500),condition:f.elements.condition.value,status:'open',createdAt:new Date().toISOString()};
 if(save([...read(),r])){f.reset();f.closest('details').open=false;draw()}
 else alert('Enregistrement impossible');
});
let pending=false;
function scheduleDraw(){if(pending)return;pending=true;queueMicrotask(()=>{pending=false;draw()})}
if(overview)new MutationObserver(scheduleDraw).observe(overview,{subtree:true,childList:true});
const agentList=$('agents-direct');
if(agentList)new MutationObserver(scheduleDraw).observe(agentList,{subtree:true,childList:true});
window.addEventListener('storage',e=>{if(!e.key||e.key===STORE)scheduleDraw()});
window.MyTeamContextReminders={refresh:draw,count:()=>active().length};
draw();
})();