/* MyTEAM : bilan A4 des six jours de service du cycle CDE 2-2-2-2. */
(()=>{
'use strict';
if(document.getElementById('mt-cycle-summary'))return;
const board=document.getElementById('mt-board-log'),dayInput=document.getElementById('date');if(!board||!dayInput)return;
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const anchor=Date.UTC(2026,9,25),ms=86400000;
const parse=s=>/^\d{4}-\d\d-\d\d$/.test(s)?Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10)):NaN;
const iso=t=>new Date(t).toISOString().slice(0,10);
const human=s=>s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const stages=['Matin 1','Matin 2','Après-midi 1','Après-midi 2','Nuit 1','Nuit 2'];
function cycle(day){
 const x=parse(day);if(!Number.isFinite(x))return null;
 const days=Math.floor((x-anchor)/ms),start=anchor+Math.floor(days/8)*8*ms;
 return Array.from({length:6},(_,i)=>iso(start+i*ms));
}
const wrap=document.createElement('section');wrap.className='card';wrap.id='mt-cycle-summary';
wrap.innerHTML='<h2>Bilan de cycle CDE · A4</h2><p class="cy-help">Six jours de service (deux matins, deux après-midis, deux nuits). Le bilan regroupe les journées déjà validées et signale celles encore en brouillon.</p>'+
'<label>Date de référence<input id="cy-date" type="date"></label><p id="cy-range" class="cy-help"></p>'+
'<p id="cy-state" class="cy-help"></p><button type="button" id="cy-preview">Afficher le résumé</button> <button type="button" id="cy-print">Imprimer A4 / Enregistrer en PDF</button><div id="cy-screen"></div>';
const css=document.createElement('style');
css.textContent='#mt-cycle-summary{background:#1c3448;border:1px solid #6d8196;margin:14px 0;padding:14px}#mt-cycle-summary h2{font-size:20px;margin:0 0 8px}#mt-cycle-summary .cy-help{font-size:12px;line-height:1.5;color:#c6d5e3}#mt-cycle-summary #cy-date{display:block;width:100%;box-sizing:border-box;padding:10px;margin:6px 0;color:#fff;background:#12283d;border:1px solid #6f889e;border-radius:10px}#mt-cycle-summary button{min-height:44px;margin:4px 0}#mt-cycle-summary #cy-screen{border:1px solid #56718c;border-radius:10px;padding:10px;margin:10px 0;font-size:13px;line-height:1.5}#mt-cycle-summary .cy-day{border-bottom:1px solid #5a7188;padding:9px 0}#mt-cycle-summary .cy-day:last-child{border:0}#mt-cycle-summary .cy-warn{color:#f7d59e}#mt-cycle-print{display:none}@media print{@page{size:A4;margin:11mm}body{background:white!important;color:#26394d!important}body>*:not(#mt-cycle-print){display:none!important}#mt-cycle-print{display:block!important;margin:0!important;padding:0!important;font:8.3pt/1.33 Arial,sans-serif;color:#1f344a!important}#mt-cycle-print h1{font:16pt Arial;font-weight:bold;margin:0 0 7pt}#mt-cycle-print h2{font:bold 10pt Arial;margin:11pt 0 5pt;background:#e8f0f7;padding:5pt}#mt-cycle-print .cy-day{border-bottom:1px solid #cdd7e2;padding:7pt 0;break-inside:avoid}#mt-cycle-print .cy-day h3{font:bold 10pt Arial;margin:0 0 3pt}#mt-cycle-print .cy-day p{margin:3pt 0}#mt-cycle-print .cy-warn{color:#9b5e18}#mt-cycle-print footer{margin-top:14pt;font:7pt Arial;color:#68788c}#mt-cycle-print *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
wrap.prepend(css);board.after(wrap);
const print=document.createElement('div');print.id='mt-cycle-print';document.body.append(print);
const $=id=>document.getElementById(id);
function details(day,idx){
 const all=read('myteam-board-log-v1',{}),rec=all[day]||{},saved=rec.validated?rec.snapshots?.at(-1):null;
 const fields=saved?.fields||rec.draft||{};
 const base=saved?.entries||{};
 const events=(base.operations||read('myteam-board-events-v1',{})[day]||[]);
 const actions=(base.actions||read('myteam-board-actions-v1',{})[day]||[]);
 const brief=(base.briefs||read('myteam-private-briefings-v1',[]).filter(x=>x.date===day));
 const vis=(base.visits||read('myteam-daily-v1',{})[day]?.visits||[]);
 const operationText=events.map(x=>(x.title||x.kind||'Information')+(x.effectiveDate&&x.effectiveDate!==day?' (effet '+human(x.effectiveDate)+')':''));
 return {day,stage:stages[idx],validated:!!rec.validated,station:fields.station||'',start:fields.start||'',end:fields.end||'',mail:fields.mail||'',trello:fields.trello||'',visits:vis.length,none:rec.visitsDeclaredNone===true,operationText,briefCount:brief.length,actions};
}
function summary(){
 const days=cycle($('cy-date').value||dayInput.value||iso(Date.now()));if(!days)return null;
 const items=days.map(details);
 const unvalidated=items.filter(x=>!x.validated).length;
 const allActions=read('myteam-board-actions-v1',{});
 const pending=Object.entries(allActions).filter(([day])=>day<=days[5]).flatMap(([,entries])=>Array.isArray(entries)?entries.filter(x=>x.status!=='done'):[]);
 const intro='<h1>MYTEAM · BILAN DE FIN DE CYCLE</h1><p>Du '+human(days[0])+' au '+human(days[5])+' · 6 jours de service · '+(6-unvalidated)+'/6 journées validées</p>';
 const rows=items.map(x=>{
  const schedule=[x.start,x.end].every(Boolean)?x.start+'–'+x.end:'Horaires non renseignés';
  const visite=x.none?'Aucune visite déclarée':x.visits?x.visits+' déplacement(s) enregistré(s)':'Visites non renseignées';
  const statuses='Mail '+(x.mail==='yes'?'OK':x.mail==='no'?'non fait':'?')+' · Trello '+(x.trello==='yes'?'OK':x.trello==='no'?'non fait':'?');
  const titles=x.operationText.slice(0,3).map(safe);
  const op=x.operationText.length?titles.join('; ')+(x.operationText.length>3?' ; +'+(x.operationText.length-3)+' autres':''):'Aucune modification enregistrée';
  return '<section class="cy-day"><h3>'+human(x.day)+' · '+x.stage+' — '+(x.validated?'Validée':'BROUILLON')+'</h3><p><b>Poste :</b> '+safe(x.station||'Non renseigné')+' · '+schedule+' · '+visite+'</p><p><b>Suivi :</b> '+statuses+' · '+x.briefCount+' transmission(s)</p><p><b>Opérations :</b> '+op+'</p></section>';
 }).join('');
 const pendingHtml='<h2>Actions encore ouvertes</h2>'+(!pending.length?'<p>Aucune action ouverte enregistrée.</p>':pending.slice(0,12).map(x=>'<p>• '+safe(x.agent||'Action')+' : '+safe(x.title||'')+(x.dueDate?' (échéance '+human(x.dueDate)+')':'')+'</p>').join('')+(pending.length>12?'<p>+'+(pending.length-12)+' autres actions en attente.</p>':''));
 return {html:intro+(unvalidated?'<p class="cy-warn">Attention : '+unvalidated+' journée(s) encore en brouillon.</p>':'')+rows+pendingHtml,days,unvalidated};
}
function render(){
 const x=summary();if(!x)return;
 $('cy-range').textContent='Cycle : '+human(x.days[0])+' → '+human(x.days[5]);
 $('cy-state').textContent=x.unvalidated?x.unvalidated+' journée(s) non validée(s) — bilan provisoire.':'Six journées validées — bilan disponible pour impression.';
 $('cy-screen').innerHTML=x.html;
 print.innerHTML=x.html+'<footer>MyTEAM · bilan imprimé à partir des données privées de cet appareil · les corrections nécessitent validation de chaque journée.</footer>';
}
$('cy-date').value=dayInput.value||iso(Date.now());
$('cy-date').addEventListener('change',render);
$('cy-preview').onclick=render;
$('cy-print').onclick=()=>{render();window.print()};
dayInput.addEventListener('change',()=>{$('cy-date').value=dayInput.value;render()});
window.addEventListener('myteam-board-updated',render);window.addEventListener('focus',render);
render();
})();