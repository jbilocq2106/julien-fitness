/* MyTEAM — import manuel d'événements historiques privés.
 * Import explicite seulement ; aucun événement personnel n'est publié sur GitHub.
 */
(()=>{
'use strict';
const KEY='myteam_vacation_journal_v1';
const FORMAT='myteam-journal-import-v1';
const categories=new Set(['planning','event','call','extra','other']);
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&
 !Number.isNaN(new Date(s+'T12:00:00').getTime())&&new Date(s+'T12:00:00').getDate()===Number(String(s).slice(8));
const text=(s,n)=>String(s||'').trim().slice(0,n);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
function parse(input){
 if(!input||input.format!==FORMAT||!Array.isArray(input.events))throw Error('Ce fichier n’est pas un export d’événements MyTEAM reconnu.');
 if(input.events.length<1||input.events.length>150)throw Error('Le fichier doit contenir entre 1 et 150 événements.');
 const items=[];
 for(let i=0;i<input.events.length;i++){
  const item=input.events[i];
  if(!item||typeof item!=='object')throw Error('Ligne '+(i+1)+' incorrecte.');
  if(!validDate(item.date))throw Error('Date invalide à la ligne '+(i+1)+'.');
  if(!text(item.description,3000))throw Error('Description manquante à la ligne '+(i+1)+'.');
  if(!categories.has(item.category||'event'))throw Error('Catégorie inconnue à la ligne '+(i+1)+'.');
  const time=text(item.time,5);
  if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Heure invalide à la ligne '+(i+1)+'.');
  const rawId=text(item.id,110).replace(/[^a-zA-Z0-9_-]/g,'');
  const date=item.date;
  const description=text(item.description,3000);
  const post=text(item.post,30).toUpperCase();
  const agents=text(item.agents,250);
  // Un import d'archives ne peut pas valider des consignes, un rapport ou un rappel.
  items.push({id:rawId?'archive-'+rawId:'archive-'+date+'-'+i, date,time,
   category:item.category||'event',post,agents,description,
   activity:item.activity==='site_visit'?'site_visit':'',
   hasReminder:false,done:false,reminderText:'',due:'',dueTime:'',
   archiveSource:'Import historique vérifié par l’utilisateur',
   importedAt:'',createdAt:''});
 }
 return items;
}
function read(){
 try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}
}
function preview(items){
 if(!Array.isArray(items))throw Error('Aucun événement prêt à importer.');
 const days=[...new Set(items.map(x=>x.date))].sort();
 const existing=read();
 const found=items.filter(row=>existing.some(x=>String(x.id)===row.id||
  (x.date===row.date&&norm(x.description)===norm(row.description)&&norm(x.post)===norm(row.post))));
 return {count:items.length,duplicates:found.length,newCount:items.length-found.length,days};
}
function apply(items){
 if(!Array.isArray(items)||!items.length)throw Error('Aucun événement.');
 // Never use arbitrary file data without revalidation.
 const validated=parse({format:FORMAT,events:items.map(x=>({...x,id:String(x.id||'').replace(/^archive-/,'')}))});
 const rows=read(),added=[],duplicates=[];
 const now=new Date().toISOString();
 for(const item of validated){
  const dupe=rows.some(x=>String(x.id)===item.id||
   (x.date===item.date&&norm(x.description)===norm(item.description)&&norm(x.post)===norm(item.post)));
  if(dupe){duplicates.push(item.id);continue}
  const entry={...item,importedAt:now,createdAt:now};
  rows.push(entry);added.push(entry);
 }
 if(added.length){
  localStorage.setItem(KEY,JSON.stringify(rows));
  window.dispatchEvent(new Event('myteam-journal-updated'));
 }
 return {added,duplicates};
}
window.MyTeamVacationImport={FORMAT,parse,preview,apply,read};
})();