/* MyTEAM - Correction de nom : OUINNE -> OUNINE.
 * Migration locale non destructive : les notes et anciennes versions restent accessibles.
 */
(()=>{
'use strict';
const OLD='OUINNE Melyse',NEW='OUNINE Melyse',STAMP='myteam_spelling_migration_ounine_2026_v1';
try{if(localStorage.getItem(STAMP)==='1')return}catch{return}
const canonical=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const old=canonical(OLD),now=canonical(NEW);
function renamable(s){return canonical(s)===old}
function mapName(s){return renamable(s)?NEW:s}
function run(key,modify){
 try{
  const original=localStorage.getItem(key);if(original===null)return;
  const data=JSON.parse(original),next=modify(data);
  if(JSON.stringify(data)!==JSON.stringify(next))localStorage.setItem(key,JSON.stringify(next));
 }catch{}
}
function renameFields(v){
 if(!v||typeof v!=='object')return v;
 const r={...v};
 if(typeof r.agent==='string')r.agent=mapName(r.agent);
 if(typeof r.name==='string')r.name=mapName(r.name);
 if(typeof r.agents==='string')r.agents=r.agents.split(/([,;])/).map(s=>mapName(s.trim())===NEW?NEW:s).join('');
 return r;
}
run('myteam_agent_profiles_v1',v=>{
 if(!v||typeof v!=='object'||Array.isArray(v))return v;
 const o={...v},keys=Object.keys(o).filter(renamable);
 for(const k of keys){
  const original=o[k],existing=o[NEW];
  o[NEW]=existing&&typeof existing==='object'?{...original,...existing}:original;
  delete o[k];
 }
 return o;
});
run('myteam_agent_casebook_v1',v=>{
 if(!v||typeof v!=='object'||Array.isArray(v))return v;
 const o={...v};
 for(const k of Object.keys(o).filter(renamable)){
  const left=Array.isArray(o[k])?o[k]:[],right=Array.isArray(o[NEW])?o[NEW]:[];
  const ids=new Set(right.map(x=>x?.id).filter(Boolean));
  o[NEW]=[...right,...left.filter(x=>!x?.id||!ids.has(x.id))];
  delete o[k];
 }
 return o;
});
run('myteam_agent_archives_v2',v=>{
 if(!v||typeof v!=='object'||Array.isArray(v))return v;
 const o={...v};
 for(const k of Object.keys(o).filter(renamable)){
  o[now]=renameFields(o[k]);delete o[k];
 }
 return o;
});
run('myteam_deleted_agents_v1',v=>Array.isArray(v)?[...new Set(v.map(mapName))]:v);
run('myteam_field_visits_v1',v=>Array.isArray(v)?v.map(x=>({
 ...x,agents:Array.isArray(x.agents)?x.agents.map(renameFields):x.agents
})):v);
for(const key of ['myteam_visit_followups_v1','myteam_agent_context_reminders_v1','myteam_manual_reminders_v1','myteam_vacation_journal_v1','myteam_agent_absences_v1']){
 run(key,v=>Array.isArray(v)?v.map(renameFields):v);
}
try{localStorage.setItem(STAMP,'1')}catch{}
})();