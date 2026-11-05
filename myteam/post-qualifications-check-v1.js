/* MyTEAM - Contrôle entre affectations PARIF, fiches de prestation et qualifications locales. */
(()=>{
'use strict';
if(document.getElementById('mt-post-check'))return;
const prestation=document.getElementById('prestation');
if(!prestation)return;
const A='myteam_parif_g4s_assignments_v1',P='myteam_agent_profiles_v1',R='myteam-post-requirements-v1',F='myteam.prestationAnalyses.v1';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const validDay=s=>/^\d{4}-\d\d-\d\d$/.test(s);
const human=s=>validDay(s)?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
const vals=[['male','Hommes min.'],['female','Femmes min.'],['rx','RX min.'],['piste','Permis piste valides min.']];
const section=document.createElement('div');section.id='mt-post-check';section.className='card';
section.innerHTML='<h2>Contrôle des postes</h2><p class="pc-help">Rapprochement des affectations G4S du plan PARIF avec les fiches agents et les analyses de prestation. Les contraintes par poste doivent être validées avant de conclure à une conformité.</p>'+
'<label>Date du plan<select id="pc-day"></select></label>'+
'<label>Poste à vérifier<select id="pc-post"></select></label>'+
'<div id="pc-rules"></div><div id="pc-results"></div>'+
'<p class="pc-help">Un agent d’une autre équipe n’est pas une anomalie. « Non renseigné » n’est pas « non qualifié ». Une analyse de prestation en texte libre ne prouve pas, à elle seule, la concordance nominative avec le plan PARIF.</p>';
const css=document.createElement('style');
css.textContent='#mt-post-check{margin:16px 0;padding:15px;border:1px solid #657f99;background:#20364c}#mt-post-check h2{font-size:20px;margin:0 0 8px}#mt-post-check .pc-help{font-size:12px;line-height:1.5;color:#cad9e8}#mt-post-check label{display:block;font-size:12px;margin:10px 0;color:#d9e6f1}#mt-post-check select{display:block;width:100%;box-sizing:border-box;padding:11px;min-height:43px;margin:7px 0;background:#132338;border:1px solid #6c849e;color:white;border-radius:9px}#mt-post-check .pc-settings{display:grid;grid-template-columns:1fr 1fr;gap:7px}#mt-post-check .pc-line{padding:10px;border-radius:11px;background:#2b4158;margin:8px 0;line-height:1.55}#mt-post-check .pc-line strong{display:block}#mt-post-check .pc-line small{font-size:12px;display:block;color:#c5d5e4}#mt-post-check .pc-warning{background:#5a4727;border-left:4px solid #f1bc6e}#mt-post-check .pc-bad{background:#66333b;border-left:4px solid #e87c83}#mt-post-check .pc-ok{background:#285846;border-left:4px solid #8ddbb4}#mt-post-check .pc-btn{width:100%;min-height:47px;background:#286b60}#mt-post-check .pc-heading{font-weight:750;margin:10px 0}';
section.prepend(css);
prestation.prepend(section);
const $=id=>document.getElementById(id);
const active=()=>{
 const data=read(A,[]);
 return Array.isArray(data)?data.filter(x=>x&&validDay(x.date)&&/^E\d{2,3}$/.test(String(x.post))&&x.agent):[]
};
const allProfiles=()=>Object.entries(read(P,{})).filter(([,p])=>p&&typeof p==='object');
function find(name){
 const list=allProfiles(),key=norm(name);
 const exact=list.filter(([n])=>norm(n)===key);
 if(exact.length===1)return exact[0];
 const prefix=list.filter(([n])=>key.length>=5&&norm(n).length>=5&&(key.startsWith(norm(n))||norm(n).startsWith(key)));
 return prefix.length===1?prefix[0]:null
}
function requirements(post){const map=read(R,{});return map&&typeof map==='object'?map[post]||{}:{}}
function sameDateAnalysis(day,post){
 const entries=read(F,[]);
 if(!Array.isArray(entries))return false;
 const french=human(day);
 return entries.some(a=>{
  const date=String(a?.date||'');
  const matches=date===day||date===french;
  const rows=Array.isArray(a?.rows)?a.rows:[];
  return matches&&rows.some(row=>new RegExp('(?:^|\\W)'+post+'(?:\\W|$)','i').test(String(row?.post||'')))
 })
}
function groupFor(day,post){
 return active().filter(x=>x.date===day&&x.post===post).sort((a,b)=>String(a.shift).localeCompare(String(b.shift),'fr')||String(a.agent).localeCompare(String(b.agent),'fr'));
}
function refreshRules(){
 const post=$('pc-post').value,r=requirements(post);
 $('pc-rules').innerHTML='<div class="pc-heading">Exigences à confirmer pour '+safe(post||'ce poste')+'</div><div class="pc-settings">'+vals.map(([key,label])=>{
  const value=Number.isInteger(r[key])?String(r[key]):'';
  return '<label>'+label+'<select data-pc-rule="'+key+'"><option value="">Non défini</option>'+[0,1,2,3,4,5].map(n=>'<option value="'+n+'" '+(value===String(n)?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'
 }).join('')+'</div><p class="pc-help">Ces exigences sont enregistrées sur ce téléphone. Ne saisis une valeur que si la règle de ce poste est confirmée par les consignes officielles.</p>';
}
function renderResults(){
 const day=$('pc-day').value,post=$('pc-post').value;const host=$('pc-results');
 if(!day||!post){host.textContent='Aucune affectation PARIF disponible.';return}
 const group=groupFor(day,post),rules=requirements(post);
 const shifts=[...new Set(group.map(x=>x.shift))];
 const activeRules=vals.filter(([key])=>Number.isInteger(rules[key]));
 const analyses=sameDateAnalysis(day,post);
 let html='<p class="pc-help">Fiche prestation : '+(analyses?'analyse du même poste et de la même date trouvée, concordance nominative non vérifiée':'aucune analyse structurée correspondante — rapprochement manuel nécessaire')+'.</p>';
 for(const shift of shifts){
  const people=group.filter(x=>x.shift===shift),profiles=people.map(x=>({agent:x.agent,matched:find(x.agent)}));
  const num={male:0,female:0,rx:0,piste:0},unknown=[];const problems=[];
  const lines=profiles.map(({agent,matched})=>{
   if(!matched){unknown.push(agent+' : fiche agent absente / homonyme');return '<div class="pc-line pc-warning"><strong>'+safe(agent)+'</strong><small>Profil non identifié avec certitude.</small></div>'}
   const [name,p]=matched;
   if(p.gender==='M')num.male++;else if(p.gender==='F')num.female++;else unknown.push(agent+' : sexe non renseigné');
   if(p.rxCertified===true)num.rx++;
   else if(p.rxCertified!==false)unknown.push(agent+' : qualification RX à confirmer');
   const expiry=String(p.permitExpiry||'');
   if(p.pistePermit===true&&validDay(expiry)&&expiry>=day)num.piste++;
   else if(p.pistePermit===true&&validDay(expiry)&&expiry<day)problems.push(agent+' : permis expiré au '+human(expiry));
   else if(p.pistePermit===true)unknown.push(agent+' : échéance du permis non renseignée');
   else if(p.pistePermit!==false)unknown.push(agent+' : permis non confirmé');
   const details=['Sexe '+(p.gender==='M'?'H':p.gender==='F'?'F':'?'),'RX '+(p.rxCertified===true?'oui':p.rxCertified===false?'non':'?'),'Permis '+(p.pistePermit===true?(validDay(expiry)?'au '+human(expiry):'date à vérifier'):p.pistePermit===false?'non':'?')];
   return '<div class="pc-line"><strong>'+safe(name)+'</strong><small>'+safe(details.join(' · '))+'</small></div>'
  }).join('');
  let status='pc-warning',label='À vérifier';
  if(activeRules.length){
   const missing=activeRules.filter(([key])=>num[key]<rules[key]);
   if(!missing.length&&!unknown.length&&!problems.length){status='pc-ok';label='Contrôles paramétrés satisfaits'}
   if(missing.length){
    const uncertain=unknown.length>0;
    if(!uncertain){status='pc-bad';label='Écart confirmé'}
    problems.push('Seuils non atteints : '+missing.map(([key,title])=>title+' '+num[key]+'/'+rules[key]).join(', '));
   }
  }else problems.push('Aucune exigence chiffrée paramétrée pour ce poste');
  if(!analyses)problems.push('Fiche de prestation non rapprochée nominativement');
  html+='<div class="pc-line '+status+'"><strong>'+safe(post)+' · '+safe(shift||'vacation non précisée')+' — '+label+'</strong><small>'+people.length+' agent(s) · '+num.male+' H · '+num.female+' F · '+num.rx+' RX confirmés · '+num.piste+' permis avec validité connue</small></div>'+lines;
  if(unknown.length)html+='<div class="pc-line pc-warning"><strong>À vérifier</strong><small>'+unknown.map(safe).join(' ; ')+'</small></div>';
  if(problems.length)html+='<div class="pc-line '+(status==='pc-bad'?'pc-bad':'pc-warning')+'"><strong>Points de contrôle</strong><small>'+problems.map(safe).join(' ; ')+'</small></div>'
 }
 host.innerHTML=html||'<p class="pc-help">Aucune ligne de ce poste pour la date sélectionnée.</p>';
}
function refresh(){
 const ds=[...new Set(active().map(x=>x.date))].sort().reverse();
 const oldD=$('pc-day').value;
 $('pc-day').innerHTML=ds.length?ds.map(d=>'<option value="'+safe(d)+'">'+safe(human(d))+'</option>').join(''):'<option value="">Aucun plan PARIF</option>';
 $('pc-day').value=ds.includes(oldD)?oldD:(ds[0]||'');
 const ps=[...new Set(active().filter(x=>x.date===$('pc-day').value).map(x=>x.post))].sort();
 const oldP=$('pc-post').value;
 $('pc-post').innerHTML=ps.length?ps.map(p=>'<option value="'+safe(p)+'">'+safe(p)+'</option>').join(''):'<option value="">Aucun poste</option>';
 $('pc-post').value=ps.includes(oldP)?oldP:(ps[0]||'');
 refreshRules();renderResults();
}
$('pc-day').addEventListener('change',refresh);
$('pc-post').addEventListener('change',()=>{refreshRules();renderResults()});
$('pc-rules').addEventListener('change',e=>{
 const input=e.target.closest('[data-pc-rule]');if(!input)return;
 const post=$('pc-post').value;if(!post)return;
 const map=read(R,{}),r={...(map[post]||{})};const key=input.dataset.pcRule;
 if(input.value==='')delete r[key];else r[key]=Number(input.value);
 map[post]=r;
 try{localStorage.setItem(R,JSON.stringify(map));renderResults()}catch(err){alert('Impossible d’enregistrer la règle du poste : '+err.message)}
});
window.addEventListener('focus',refresh);
window.addEventListener('storage',e=>{if([A,P,R,F].includes(e.key))refresh()});
refresh();
})();