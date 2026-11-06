/* MyTEAM · Préparation des tournées à partir du plan copié en texte.
 * Pour une PHOTO, l'utilisateur la joint dans ChatGPT avec le résumé créé ici.
 * Aucune transmission automatique entre cette page et une conversation.
 */
(()=>{
'use strict';
const core=window.MyTeamVisitsCore,visit=()=>window.MyTeamVisits,api=window.MyTeamReboot;
if(!core||!api)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='myteam_current_plan_text_v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
const box=document.createElement('section');
box.id='v-plan-box';box.className='card hidden';
box.innerHTML=[
 '<div class="row-between"><h3>Tournée à partir du plan</h3><button type="button" id="v-plan-hide" class="text-button">Fermer</button></div>',
 '<p class="hint">Seuls les postes avec au moins un agent G4S identifié doivent être envisagés dans ta tournée. Cela vaut aussi pour les postes mixtes PARIF/G4S. Poste sans G4S identifié : écarté, ou à confirmer si des noms sont inconnus.</p>',
 '<p class="hint">Colle les postes et leurs agents (photo analysée dans ChatGPT ou liste relevée). Exemple : E84 : Henrat G4S, Sandstrom G4S, Marginale G4S.</p>',
 '<label>Date indiquée sur le plan (obligatoire pour exploiter ses affectations)<input id="v-plan-source-date" type="date"></label>',
 '<textarea id="v-plan-text" rows="5" placeholder="E84 : Henrat, Sandstrom, Marginale\nE85 : Lebrun, Jacotez"></textarea>',
 '<div class="visit-buttons"><button type="button" id="v-plan-run" class="primary">Proposer la tournée</button><button type="button" id="v-plan-share">Partager le suivi avec ChatGPT</button></div>',
 '<div id="v-plan-result"></div>',
 '<p class="hint">Les recommandations n’attestent pas la présence réelle d’un agent : le plan est la source des affectations. Les postes sont classés par priorité de contrôle, pas selon un itinéraire géographique calculé.</p>'
].join('');
$('visits').append(box);
let ranked=[];
function open(){
 visit()?.open();
 box.classList.remove('hidden');
 box.scrollIntoView({behavior:'smooth',block:'start'});
}
const trim=s=>String(s||'').trim();
function matchAgent(label){
 const q=core.norm(label);if(q.length<3)return null;
 const all=core.staff();
 const exact=all.filter(x=>core.norm(x.name)===q);
 if(exact.length===1)return exact[0];
 const possible=all.filter(x=>{
  const n=core.norm(x.name);
  return n.startsWith(q)||n.endsWith(q)||n.includes(q);
 });
 return possible.length===1?possible[0]:null;
}
function parse(text){
 const rows=[],errors=[];
 for(const line of String(text||'').split(/\r?\n/).map(trim).filter(Boolean)){
  const m=line.match(/^\s*(E\d{2,3})\s*[:|;\-–]\s*(.+)$/i);
  if(!m){errors.push(line.slice(0,95));continue}
  const post=m[1].toUpperCase(),people=[],unresolved=[],nonG4s=[];
   for(const candidate of m[2].split(/[,;\/]+/).map(trim).filter(Boolean)){
    const label=candidate.replace(/[()[\]]/g,' ').replace(/\s+/g,' ').trim();
    // Ne pas considérer comme G4S un agent explicitement attribué à une autre société.
    if(/\b(?:NON[\s-]?G4S|DUSS(?:MANN)?|LXP|LUXAIRPORT)\b/i.test(label)){
     nonG4s.push(label);continue;
    }
    const clean=label.replace(/\s+G4S$/i,'').trim();
    const p=matchAgent(clean);
    if(!p){unresolved.push(clean);continue}
    if(!people.some(x=>core.same(x.name,p.name)))people.push(p);
   }
   rows.push({post,people,unresolved,nonG4s});
 }
 return {rows,errors};
}
function analyze(text,date=core.today()){
 const {rows,errors}=parse(text);
 const analyzed=rows.map(v=>{
  const people=v.people.map(p=>{
   const signed=core.lastSigned(p.name,date),state=core.agentState(p.name);
   const pending=['pending','notasked'].includes(state.status);
   const profile=api.profiles()[p.name]||{};
   return {...p,signed,state,pending,rx:profile.rxCertified,piste:profile.pistePermit};
  });
  const eligible=people.filter(p=>!p.signed).length;
  const urgent=people.filter(p=>p.pending).length;
  const score=eligible*10+urgent*6+people.filter(p=>!p.state.lastSeen).length*4;
  return {...v,people,eligible,urgent,score};
 }).sort((a,b)=>b.eligible-a.eligible||b.urgent-a.urgent||b.score-a.score||a.post.localeCompare(b.post));
 const data=analyzed.filter(v=>v.people.length>0);
 const skipped=analyzed.filter(v=>v.people.length===0);
 return {data,skipped,errors};
}
function render(){
 const text=$('v-plan-text').value,date=$('v-date').value||core.today(),sourceDate=$('v-plan-source-date').value;
 if(!text.trim())return $('v-plan-result').innerHTML='<p class="hint">Ajoute au moins une ligne de poste.</p>';
 const sourceValid=core.valid(sourceDate),sourceMatches=sourceValid&&sourceDate===date;
 const dateNotice=!sourceValid?'<p class="visit-warning"><strong>Date du plan non indiquée.</strong> Analyse indicative uniquement. Vérifie la date source avant de préparer un rapport.</p>':
  !sourceMatches?'<p class="visit-warning"><strong>Plan du '+esc(api.fmtDate(sourceDate))+'.</strong> Il ne prouve aucune affectation pour le '+esc(api.fmtDate(date))+'. Actions de tournée désactivées.</p>':'';
 const {data,skipped,errors}=analyze(text,date);ranked=data;
 const excluded=skipped.length?'<details class="visit-skipped"><summary>'+skipped.length+' poste(s) écarté(s) : aucun agent G4S identifié</summary>'+
  skipped.map(v=>'<p><strong>'+esc(v.post)+'</strong> — '+(v.unresolved.length?'Noms non reconnus : '+esc(v.unresolved.join(', '))+'. Présence G4S à vérifier.':'Aucun agent G4S dans les noms fournis.')+'</p>').join('')+'</details>':'';
 if(!data.length){$('v-plan-result').innerHTML=dateNotice+'<p class="visit-warning">Aucun poste avec agent G4S identifié. Ne programme pas de visite sur ces seuls éléments : vérifie les noms inconnus ou transmets un plan plus complet.</p>'+excluded+
  (errors.length?'<p class="hint">'+errors.length+' ligne(s) non comprises.</p>':'');return}
 const eligible=data.filter(x=>x.eligible>0).length;
 $('v-plan-result').innerHTML=dateNotice+'<h4>Postes prioritaires : '+Math.min(3,eligible)+' sur 3 envisagés</h4>'+
 (eligible<3?'<p class="visit-warning">Moins de trois postes sans doublon dans ce plan. Vérifie les autres affectations ou la présence d’autres agents.</p>':'')+
 data.map((r,i)=>'<div class="visit-plan-row"><div class="row-between"><strong>'+esc(r.post)+(i<3&&r.eligible?' · Prioritaire':'')+'</strong><small>'+r.eligible+' agent(s) sans rapport signé récent</small></div>'+
  '<p>'+r.people.map(x=>esc(x.name)+(x.signed?' (déjà signé '+api.fmtDate(x.signed.date)+')':x.pending?' (relance consignes)':'')).join(', ')+'</p>'+
  (r.unresolved.length?'<p class="visit-warning">Noms à confirmer : '+esc(r.unresolved.join(', '))+'</p>':'')+
   (r.nonG4s.length?'<small>Hors G4S explicitement indiqués (exclus) : '+esc(r.nonG4s.join(', '))+'</small>':'')+
  (r.people.some(x=>x.rx===undefined||x.piste===undefined)?'<small>Qualifications RX/permis incomplètes pour certains agents : vérifier si le poste les exige.</small>':'')+
  '<div class="visit-buttons"><button type="button" data-v-plan-row="'+i+'" data-v-plan-kind="passage" '+(sourceMatches?'':'disabled')+'>Passage</button>'+
  '<button type="button" data-v-plan-row="'+i+'" data-v-plan-kind="report" '+(sourceMatches?'':'disabled')+'>Rapport</button></div></div>').join('')+
 excluded+
 (errors.length?'<p class="hint">'+errors.length+' ligne(s) non analysée(s) : '+esc(errors.slice(0,3).join(' | '))+'</p>':'');
}
function summaryText(){
 const date=$('v-date').value||core.today(),shift=$('v-shift').value||'morning';
 const n=core.count(date,shift),all=core.summary(date),pending=core.pending();
 const lines=[
  'MyTEAM — Contexte privé pour analyser la photo du plan que je joins dans ChatGPT.',
  'Date de vacation : '+date+', '+(core.shiftNames[shift]||shift)+'.',
  'Date inscrite sur le plan : '+($('v-plan-source-date').value||'INCONNUE — vérification nécessaire')+'.',
  'Rapports SIGNÉS déjà effectués sur cette vacation : '+n.signed+'/3.',
  'Règle impérative : proposer uniquement des postes avec au moins un agent G4S identifié sur le plan. Un poste sans G4S n’est pas une visite obligatoire, même s’il appartient à PARIF. Les noms inconnus doivent être signalés à vérifier.',
  'Règles : distinguer simples passages, rapports de visite signés et consignes validées.',
  'Éviter les doublons de RAPPORTS SIGNÉS au même agent sur 7 jours glissants.',
  'Un rapport signé compte pour UN, même avec plusieurs agents présents.',
  'Si consignes non validées : relancer par passage ou téléphone, sans présumer une validation sur poste.',
  'RELANCES :'
 ];
 if(!pending.length)lines.push('Aucune relance locale trouvée.');
 for(const s of pending)lines.push('- '+s.name+' : '+s.status+' ; échéance '+(s.due||'inconnue'));
 lines.push('HISTORIQUE DES VISITES ET RAPPORTS SIGNÉS CONNUS :');
 for(const row of all)lines.push('- '+row.name+
  ' | Rapport signé récent : '+(row.report?row.report.date+' '+row.report.post:'aucun')+
  ' | Dernier passage : '+(row.passage?row.passage.date+' '+row.passage.post+' ('+row.passage.kind+')':'aucun')+
  ' | Consignes : '+row.consignes+' | Relance : '+(row.due||'non'));
 if($('v-plan-text').value.trim())lines.push('POSTES RECOPIÉS DU PLAN :\n'+$('v-plan-text').value.trim().slice(0,9500));
 lines.push('Analyse la photo jointe : identifie les postes accueillant des G4S, exclue de la tournée tous les postes sans G4S, puis propose 3 rapports signés utiles sans doublons. Signale les noms incertains plutôt que d’inventer une présence G4S.');
 return lines.join('\n');
}
async function share(){
 const text=summaryText();
 if(typeof navigator!=='undefined'&&navigator.share){
  try{await navigator.share({title:'MyTEAM · Préparer ma tournée',text});return}catch(e){if(e.name==='AbortError')return}
 }
 try{
  await navigator.clipboard.writeText(text);
  alert('Résumé copié. Colle-le dans ChatGPT en joignant la photo du plan.');
 }catch{
  const a=document.createElement('textarea');a.value=text;a.rows=8;a.id='v-share-fallback';
  $('v-plan-result').replaceChildren(a);
  a.focus();a.select();
  alert('Copie ce texte et colle-le dans ChatGPT avec la photo du plan.');
 }
}
$('v-plan-hide').onclick=()=>box.classList.add('hidden');
$('v-plan-run').onclick=()=>{
 try{localStorage.setItem(KEY,JSON.stringify({date:$('v-date').value||core.today(),sourceDate:$('v-plan-source-date').value,text:$('v-plan-text').value.slice(0,12000)}))}catch{}
 render();
};
$('v-plan-share').onclick=share;
$('v-plan-result').addEventListener('click',e=>{
 const b=e.target.closest('[data-v-plan-row]');if(!b)return;
 const r=ranked[Number(b.dataset.vPlanRow)];
 if(!r)return;
 visit()?.openForm(b.dataset.vPlanKind,r.people.map(x=>x.name));
 $('v-form').elements.post.value=r.post;
});
const cached=read();
if(cached&&cached.date===core.today()){
 $('v-plan-text').value=String(cached.text||'');
 $('v-plan-source-date').value=core.valid(cached.sourceDate)?cached.sourceDate:'';
}
window.MyTeamVisitsPlanner={open,parse,analyze,render,share,summaryText};
})();