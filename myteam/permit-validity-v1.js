/* MyTEAM : suivi local et alertes de validité permis piste, sans publication de données nominatives */
(()=>{
'use strict';
if(document.getElementById('mt-permits'))return;
const KEY='myteam-permit-validities-v1',AGENTS='myteam_agent_profiles_v1';
const read=(k,def)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??def}catch{return def}};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const isoToday=()=>{const n=new Date();return [n.getFullYear(),String(n.getMonth()+1).padStart(2,'0'),String(n.getDate()).padStart(2,'0')].join('-')};
function parseDate(s){if(typeof s!=='string'||!/^\d{4}-\d\d-\d\d$/.test(s))return null;const y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10));const t=new Date(Date.UTC(y,m-1,d));return t.getUTCFullYear()===y&&t.getUTCMonth()+1===m&&t.getUTCDate()===d?t:null}
function monthBefore(iso){const d=parseDate(iso);if(!d)return'';const y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();const end=new Date(Date.UTC(y,m,0)).getUTCDate();return new Date(Date.UTC(y,m-1,Math.min(day,end))).toISOString().slice(0,10)}
const fmt=iso=>parseDate(iso)?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'À confirmer';
function status(r){if(!parseDate(r.expires))return'unknown';const today=isoToday();if(today>r.expires)return'expired';if(today>=monthBefore(r.expires))return'warning';return'valid'}
const stateLabels={expired:'Expiré',warning:'Échéance dans le mois',valid:'Validité enregistrée',unknown:'Date à confirmer'};
function getRecords(){const v=read(KEY,[]);return Array.isArray(v)?v.filter(r=>r&&typeof r==='object'):[]}
const host=document.createElement('section');host.id='mt-permits';host.className='card';
host.innerHTML='<h3>Permis piste · validités</h3><p class="pm-help">Alerte affichée à partir d’un mois calendaire avant l’échéance, et après expiration. Une date non vérifiée ne génère pas d’alerte datée.</p><div id="pm-alerts" role="status"></div>'+
'<div id="pm-rows"></div>'+
'<details><summary>Importer les dates depuis la feuille équipe 4</summary><p class="pm-help">Importer le fichier privé JSON reçu dans ChatGPT. Les dates seront gardées sur ce téléphone, pas publiées sur GitHub.</p><input type="file" id="pm-file" accept=".json,application/json"><p id="pm-import-status" role="status"></p></details>';
const css=document.createElement('style');
css.textContent='#mt-permits{margin:14px 0;border:1px solid #526f8a;padding:14px}#mt-permits h3{margin:0 0 8px;font-size:19px}#mt-permits .pm-help{font-size:12px;line-height:1.45;color:#c3d3e3}#mt-permits .pm-grid{display:grid;grid-template-columns:1fr auto;align-items:center;gap:5px;border-bottom:1px solid #425c74;padding:7px 0}#mt-permits .pm-grid strong{display:block;font-size:14px}#mt-permits .pm-grid small{display:block;color:#cadae8}#mt-permits .pm-grid input{padding:9px;max-width:155px;background:#17283b;color:#fff;border:1px solid #7893ab;border-radius:10px;font:inherit}#mt-permits .pm-item{padding:9px;border-radius:10px;margin:7px 0;background:#2a4654}#mt-permits .pm-item.warning{background:#65471a}#mt-permits .pm-item.expired{background:#713240}#mt-permits .pm-item.unknown{background:#38465c}#mt-permits details{margin-top:14px;border:1px solid #596f87;border-radius:10px;padding:12px}#mt-permits input[type=file]{display:block;margin-top:14px;width:100%}@media print{#mt-permits,#mt-permit-home{display:none!important}}#mt-permit-home{margin:12px 0;padding:12px 14px;border-radius:12px;background:#64471d;border:1px solid #b68a47}#mt-permit-home h3{margin:0 0 6px}#mt-permit-home p{font-size:13px;margin:5px 0}#mt-permit-home .expired{color:#ffb6bf}';
host.prepend(css);
let eq=document.getElementById('equipes');
if(eq){eq.append(host)}else{document.querySelector('main')?.append(host)}
let hero=null;
function attachHome(){
 const today=document.getElementById('today');if(!today)return;
 if(!hero){hero=document.createElement('div');hero.id='mt-permit-home';hero.hidden=true}
 if(!today.contains(hero)){const anchor=today.querySelector('.mt-columns');anchor?today.insertBefore(hero,anchor):today.append(hero)}
}
function matchAgent(r){
 const profiles=read(AGENTS,{});
 const all=Object.entries(profiles).filter(([,p])=>p&&typeof p==='object');
 const sameNumber=all.filter(([,p])=>String(p.workerNumber||'')===String(r.workerNumber||'')&&r.workerNumber);
 if(sameNumber.length===1)return sameNumber[0];
 const sameName=all.filter(([name])=>norm(name)===norm(r.name));
 if(sameName.length===1)return sameName[0];
 const prefix=all.filter(([name])=>norm(name).length>5&&norm(r.name).startsWith(norm(name)));
 return prefix.length===1?prefix[0]:null
}
function applyToProfiles(records){
 const profiles=read(AGENTS,{});let n=0;
 for(const r of records){
  if(!parseDate(r.expires))continue;
  const found=matchAgent(r);
  if(!found)continue;
  const [key,p]=found;
  if(!profiles[key])continue;
  profiles[key]={...profiles[key],permitExpiry:r.expires};
  n++;
 }
 if(n){localStorage.setItem(AGENTS,JSON.stringify(profiles));try{window.renderMyTeamAgentList?.();window.myteamRenderEquipes?.()}catch{}}
 return n
}
function render(){
 attachHome();const records=getRecords(),dates=records.filter(r=>parseDate(r.expires));
 const active=records.filter(r=>['warning','expired'].includes(status(r))).sort((a,b)=>a.expires.localeCompare(b.expires));
 const toReview=records.filter(r=>status(r)==='unknown');
 const alertBox=document.getElementById('pm-alerts');
 if(alertBox)alertBox.innerHTML=active.length?
 active.map(r=>'<div class="pm-item '+status(r)+'"><strong>'+safe(r.name)+'</strong> · '+safe(fmt(r.expires))+' — '+stateLabels[status(r)]+'</div>').join(''):
 '<p class="pm-help">Aucune échéance à moins d’un mois parmi les dates enregistrées ('+dates.length+' connues).</p>';
 const sorted=[...records].sort((a,b)=>(a.expires||'9999').localeCompare(b.expires||'9999')||a.name.localeCompare(b.name,'fr'));
 const rows=document.getElementById('pm-rows');
 if(rows)rows.innerHTML=sorted.length?sorted.map(r=>'<div class="pm-grid"><div><strong>'+safe(r.name)+'</strong><small>Matricule '+safe(r.workerNumber||'—')+' · '+stateLabels[status(r)]+'</small></div><input type="date" data-pm-number="'+safe(r.workerNumber)+'" aria-label="Validité du permis de '+safe(r.name)+'" value="'+safe(parseDate(r.expires)?r.expires:'')+'"></div>').join(''):'<p class="pm-help">Aucune date de permis importée. Utilise le fichier privé JSON pour les ajouter.</p>';
 if(hero){hero.hidden=!active.length;hero.innerHTML=active.length?'<h3>Permis piste · alertes</h3>'+active.map(r=>'<p class="'+(status(r)==='expired'?'expired':'')+'"><strong>'+safe(r.name)+'</strong> · '+safe(fmt(r.expires))+' — '+stateLabels[status(r)]+'</p>').join(''):''}
 const msg=document.getElementById('pm-import-status');
 if(msg&&toReview.length)msg.title=toReview.length+' date(s) restent à confirmer';
}
document.getElementById('pm-rows')?.addEventListener('change',e=>{
 const input=e.target.closest('input[data-pm-number]');if(!input)return;
 const rows=getRecords(),r=rows.find(x=>String(x.workerNumber)===input.dataset.pmNumber);
 if(!r)return;
 if(input.value&&!parseDate(input.value)){alert('Date invalide');return}
 const next=rows.map(x=>x===r?{...x,expires:input.value||null,needsReview:!input.value}:x);
 try{localStorage.setItem(KEY,JSON.stringify(next));if(input.value)applyToProfiles([next.find(x=>x.workerNumber===r.workerNumber)]);render()}
 catch(err){alert('Enregistrement impossible : '+err.message)}
});
document.getElementById('pm-file')?.addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 const message=document.getElementById('pm-import-status');
 try{
  if(file.size>200000)throw Error('Fichier trop volumineux');
  const payload=JSON.parse(await file.text());
  if(payload?.schema!=='myteam-permit-validity-v1'||!Array.isArray(payload.entries))throw Error('Format non reconnu');
  const merged=getRecords();let count=0;
  for(const x of payload.entries){
   if(!x||typeof x.name!=='string'||!x.name.trim()||!/^\d{3,8}$/.test(String(x.workerNumber||'')))continue;
   const expires=x.expires===null?null:parseDate(x.expires)?x.expires:null;
   const row={name:x.name.trim().slice(0,120),workerNumber:String(x.workerNumber),expires,needsReview:!!x.needsReview||!expires};
   const ix=merged.findIndex(r=>String(r.workerNumber)===row.workerNumber);
   if(ix===-1)merged.push(row);
   else if(!merged[ix].expires)merged[ix]={...merged[ix],...row};
   count++;
  }
  if(!count)throw Error('Aucune entrée exploitable');
  localStorage.setItem(KEY,JSON.stringify(merged));
  const applied=applyToProfiles(merged);
  message.textContent=count+' date(s)/fiche(s) importée(s), '+applied+' liée(s) aux agents existants. Les valeurs non lisibles restent à vérifier.';
  render()
 }catch(err){message.textContent='Import non effectué : '+err.message}finally{e.target.value=''}
});
window.addEventListener('storage',e=>{if([KEY,AGENTS].includes(e.key))render()});
window.addEventListener('focus',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
render()
})();