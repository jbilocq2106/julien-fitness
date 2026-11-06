/* MyTEAM · Rappels datés : alertes quand l'application est active et ajout au calendrier.
 * Pas de serveur push : aucune garantie de notification si MyTEAM est fermé.
 */
(()=>{
'use strict';
const core=window.MyTeamVisitsCore,api=window.MyTeamReboot;
if(!api||!core)return;
const $=id=>document.getElementById(id),valid=api.validDate;
const DATE=()=>api.dateNow(),KEY='myteam_local_notification_seen_v1';
const read=(key,def)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?def:v}catch{return def}};
const items=()=>{const rows=[];
 for(const s of core.pendingReminders())rows.push({...s,time:'09:00'});
 const journal=read('myteam_vacation_journal_v1',[]);
 if(Array.isArray(journal))journal.filter(x=>x?.hasReminder&&valid(x.due)&&x.done!==true).forEach(x=>rows.push({
  id:x.id,source:'journal',agent:x.agents||'',title:'Journal · '+(x.reminderText||x.description||'Relance'),detail:x.description||'',date:x.due,time:x.dueTime||'09:00'}));
 const notes=read('myteam_agent_casebook_v1',{});
 if(notes&&typeof notes==='object'&&!Array.isArray(notes))for(const [name,events] of Object.entries(notes)){
  if(!Array.isArray(events))continue;
  events.filter(e=>e?.done!==true&&['rappel','alarme'].includes(e.type)&&valid(e.due)).forEach(e=>rows.push({
   id:e.id,source:'note',agent:name,title:'Agent · '+name,detail:e.text||'',date:e.due,time:'09:00'}));
 }
 const general=read('myteam_general_notes_v2',[]);
 if(Array.isArray(general))general.filter(e=>e?.done!==true&&['rappel','alarme'].includes(e.type)&&valid(e.due)).forEach(e=>rows.push({
  id:e.id,source:'general',title:'Rappel général',detail:e.text||'',date:e.due,time:'09:00'}));
 const manual=read('myteam_manual_reminders_v1',[]);
 if(Array.isArray(manual))manual.filter(e=>e?.done!==true&&valid(e.date||e.due)).forEach((e,i)=>rows.push({
  id:String(e.id??i),source:'manual',agent:e.agent||'',title:e.title||e.text||'Rappel',detail:e.description||'',date:e.date||e.due,time:e.time||'09:00'}));
 const context=read('myteam_agent_context_reminders_v1',[]);
 if(Array.isArray(context))context.filter(e=>e&&e.status!=='done'&&valid(e.due||e.date)).forEach((e,i)=>rows.push({
   id:String(e.id??i),source:'context',agent:e.agent||'',title:'Suivi · '+String(e.agent||'Agent'),
   detail:String(e.text||''),date:e.due||e.date,time:e.time||'09:00'
 }));
 /* Dates planifiées depuis l'accueil : complètent l'échéance, sans la remplacer. */
 const plans=read('myteam_reminder_plans_v1',{});
 if(plans&&typeof plans==='object'&&!Array.isArray(plans)){
  const current=rows.slice();
  for(const [key,slot] of Object.entries(plans)){
   if(!valid(slot?.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot?.time||''))continue;
   let descriptor;
   try{descriptor=JSON.parse(key)}catch{continue}
   if(!Array.isArray(descriptor)||descriptor.length!==3)continue;
   const [source,id,who]=descriptor;
   const matched=current.find(r=>{
    const converted=r.source==='note'?'case':r.source;
    const agent=r.source==='note'?String(r.title||'').replace(/^Agent · /,''):'';
    return converted===source&&String(r.id)===String(id)&&(source!=='case'||agent===who);
   });
   if(matched)rows.push({id:key,source:'planned',agent:matched.agent||who||'',title:'Prévu · '+matched.title,detail:matched.detail||'',
    date:slot.date,time:slot.time});
  }
 }
 const seen=new Set();
 return rows.filter(x=>!window.MyTeamAbsences?.shouldDeferReminder?.({agent:x.agent||''},api.dateNow()))
  .filter(x=>{const key=x.source+'|'+x.id;if(seen.has(key))return false;seen.add(key);return true})
  .sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));
};
const card=document.createElement('div');
card.className='card';card.id='mt-alert-settings';
card.innerHTML=[
 '<div class="row-between"><h3>Rappels et calendrier</h3><span id="mt-alert-state" class="hint">Non configuré</span></div>',
 '<p class="hint">Les alertes de l’application fonctionnent uniquement lorsqu’elle est ouverte ou active. Pour être prévenu même fermée, ajoute les rappels au calendrier du téléphone.</p>',
 '<div class="visit-buttons"><button type="button" id="mt-alert-allow">Activer les alertes locales</button><button type="button" id="mt-alert-ics">Exporter les rappels (.ics)</button></div>',
 '<div id="mt-alert-next"></div>'
].join('');
const home=$('home');home?.insertBefore(card,home.querySelector('.backup-card'));
function calendarUrl(x){
 const day=x.date.replace(/-/g,''),time=/^\d\d:\d\d$/.test(x.time||'')?x.time:'09:00';
 const [hh,mm]=time.split(':').map(Number);
 const start=day+'T'+String(hh).padStart(2,'0')+String(mm).padStart(2,'0')+'00';
 const endDate=new Date(x.date+'T'+time+':00');endDate.setMinutes(endDate.getMinutes()+15);
 const finish=[endDate.getFullYear(),String(endDate.getMonth()+1).padStart(2,'0'),String(endDate.getDate()).padStart(2,'0')].join('')+
 'T'+String(endDate.getHours()).padStart(2,'0')+String(endDate.getMinutes()).padStart(2,'0')+'00';
 const params=new URLSearchParams({action:'TEMPLATE',text:'MyTEAM : '+x.title,dates:start+'/'+finish,details:(x.detail||'')+'\nRappel MyTEAM : confirmer une fois effectué.',ctz:'Europe/Paris'});
 return 'https://calendar.google.com/calendar/render?'+params.toString();
}
function render(){
 const all=items(),shown=all.slice(0,5);
 $('mt-alert-state').textContent=typeof Notification==='undefined'?'Non pris en charge':
 Notification.permission==='granted'?'Alertes autorisées':Notification.permission==='denied'?'Alertes refusées':'Autorisation non donnée';
 $('mt-alert-next').innerHTML=shown.length?shown.map(x=>'<div class="visit-alert"><div><strong>'+x.title.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+
 '</strong><small>'+api.fmtDate(x.date)+' · '+(x.time||'09:00')+'</small></div><button type="button" class="small-button" data-v-calendar="'+x.source+'|'+x.id+'">Calendrier</button></div>').join(''):
 '<p class="empty">Aucun rappel à échéance trouvé.</p>';
}
async function notifyDue(){
 if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
 const now=new Date(),day=DATE(),clock=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
 const due=items().filter(x=>x.date<day||x.date===day&&(x.time||'09:00')<=clock);
 if(!due.length)return;
 const seen=read(KEY,{}),bucket=seen&&typeof seen==='object'&&!Array.isArray(seen)?seen:{};
 const fresh=due.filter(x=>bucket[x.source+'|'+x.id]!==day);
 if(!fresh.length)return;
 const body=fresh.slice(0,3).map(x=>x.title+' · '+api.fmtDate(x.date)).join('\n')+(fresh.length>3?'\nEt '+(fresh.length-3)+' autre(s).':'');
 try{
  if('serviceWorker' in navigator&&navigator.serviceWorker.controller){
   const reg=await navigator.serviceWorker.ready;
   await reg.showNotification('MyTEAM · '+fresh.length+' rappel(s) à traiter',{body,tag:'myteam-alert-'+day,icon:'./myteam-192-hd.png',data:{url:'./'}});
  }else new Notification('MyTEAM · '+fresh.length+' rappel(s)',{body});
  for(const x of fresh)bucket[x.source+'|'+x.id]=day;
  localStorage.setItem(KEY,JSON.stringify(bucket));
 }catch(e){$('mt-alert-state').textContent='Notification indisponible : utilise le calendrier.'}
}
$('mt-alert-allow').onclick=async()=>{
 if(typeof Notification==='undefined')return alert('Notifications indisponibles dans ce navigateur.');
 if(Notification.permission==='denied')return alert('Autorise les notifications de MyTEAM dans les paramètres du navigateur Android.');
 const result=await Notification.requestPermission();
 render();
 if(result==='granted')notifyDue();
};
$('mt-alert-next').onclick=e=>{
 const b=e.target.closest('[data-v-calendar]');if(!b)return;
 const [source,id]=b.dataset.vCalendar.split('|');
 const row=items().find(x=>x.source===source&&String(x.id)===id);
 if(row)window.open(calendarUrl(row),'_blank','noopener,noreferrer');
};
function ics(){
 const all=items();
 if(!all.length)return alert('Aucun rappel daté à exporter.');
 const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyTEAM//Rappels//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 for(let i=0;i<all.length;i++){
  const r=all[i],time=/^\d\d:\d\d$/.test(r.time||'')?r.time:'09:00';
  const day=r.date.replace(/-/g,''),start=day+'T'+time.replace(':','')+'00';
  const endDate=new Date(r.date+'T'+time+':00');endDate.setMinutes(endDate.getMinutes()+15);
  const end=[endDate.getFullYear(),String(endDate.getMonth()+1).padStart(2,'0'),String(endDate.getDate()).padStart(2,'0')].join('')+
   'T'+String(endDate.getHours()).padStart(2,'0')+String(endDate.getMinutes()).padStart(2,'0')+'00';
  out.push('BEGIN:VEVENT','UID:myteam-'+r.source+'-'+String(r.id).replace(/[^a-zA-Z0-9_-]/g,'')+'@local',
   'DTSTAMP:'+stamp+'Z','DTSTART;TZID=Europe/Paris:'+start,'DTEND;TZID=Europe/Paris:'+end,
   'SUMMARY:'+escape('MyTEAM : '+r.title),'DESCRIPTION:'+escape(r.detail||'Rappel MyTEAM'),
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+escape(r.title),'TRIGGER:-PT1H','END:VALARM','END:VEVENT');
 }
 out.push('END:VCALENDAR');
 const blob=new Blob([out.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='MyTEAM-rappels-'+DATE()+'.ics';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 alert('Fichier de calendrier créé. Il reste à l’importer dans ton agenda Android pour recevoir ses notifications.');
}
$('mt-alert-ics').onclick=ics;
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();notifyDue()}});
window.addEventListener('focus',()=>{render();notifyDue()});
window.addEventListener('myteam-visits-updated',()=>{render();notifyDue()});
window.addEventListener('myteam-journal-updated',()=>{render();notifyDue()});
window.addEventListener('myteam-reminder-planned',()=>{render();notifyDue()});
setInterval(()=>{if(!document.hidden){render();notifyDue()}},60000);
window.MyTeamAlertScheduler={items,render,calendarUrl,ics,notifyDue};
render();notifyDue();
})();