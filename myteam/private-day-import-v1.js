/* MyTEAM — import ponctuel de notes privées depuis un lien local.
   Le contenu est dans le fragment # (jamais envoyé au serveur GitHub).
   Aucune donnée personnelle n'est publiée avec le code de l'application. */
(()=>{
 'use strict';
 const prefix='#mt-import-v1=';
 if(!location.hash.startsWith(prefix))return;
 const TAG='myteam-private-intake';
 if(document.getElementById(TAG))return;
 const keys={logs:'myteam_main_courante_v1',reminders:'myteam_manual_reminders_v1',extras:'myteam_extras_equity_v1',assignments:'myteam_parif_g4s_assignments_v1',certs:'myteam_agent_certifications_v1'};
 const text=v=>String(v??'');
 const decode=(token)=>{
   if(!/^[A-Za-z0-9_-]{1,18000}$/.test(token))throw Error('Lien non valide.');
   const raw=atob(token.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-token.length%4)%4));
   return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
 };
 const validDate=d=>/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(text(d));
 const validate=p=>{
   if(!p||!validDate(p.day))throw Error('Format du transfert incorrect.');
   // Version 2 : groupes compacts PARIF / certification, sans noms dans le code public.
   if(p.version===2){
     throw Error('L’import des affectations PARIF est désactivé dans MyTEAM. Les anciennes données restent conservées.');
     if(!Array.isArray(p.parif)||p.parif.length>8||!Array.isArray(p.certifications)||p.certifications.length>30)throw Error('Listes de planning incorrectes.');
     const assignments=[],certs=[];
     p.parif.forEach((g,gi)=>{
       if(!g||!validDate(g.date)||typeof g.shift!=='string'||!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(g.shift)||!Array.isArray(g.posts)||g.posts.length>40)throw Error('Vacation incorrecte.');
       g.posts.forEach((row,pi)=>{
         if(!Array.isArray(row)||row.length<2||row.length>20||!/^E\d{2,3}$/.test(row[0]))throw Error('Poste incorrect.');
         row.slice(1).forEach((name,ni)=>{
           if(typeof name!=='string'||!name.trim()||name.length>100)throw Error('Nom incorrect.');
           assignments.push({id:'mt-'+g.date.replace(/-/g,'')+'-parif-'+gi+'-'+pi+'-'+ni,date:g.date,shift:g.shift,post:row[0],agent:name.trim(),source:'Photo planning PARIF',status:'planned'});
         });
       });
     });
     p.certifications.forEach((g,gi)=>{
       if(!g||!validDate(g.date)||!Array.isArray(g.sessions)||g.sessions.length>50)throw Error('Liste de certifications incorrecte.');
       g.sessions.forEach((row,i)=>{
         if(!Array.isArray(row)||row.length!==2||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row[0])||typeof row[1]!=='string'||!row[1].trim()||row[1].length>100)throw Error('Session incorrecte.');
         certs.push({id:'mt-'+g.date.replace(/-/g,'')+'-cert-'+gi+'-'+i,date:g.date,time:row[0],agent:row[1].trim(),status:'scheduled',source:'Email horaires de certification'});
       });
     });
     if(assignments.length>180||certs.length>150)throw Error('Transfert trop volumineux.');
     return {version:2,day:p.day,logs:[],reminders:[],extras:[],assignments,certs};
   }
   if(p.version!==1)throw Error('Version du transfert inconnue.');
   for(const k of ['logs','reminders','extras']){
     if(!Array.isArray(p[k])||p[k].length>15)throw Error('Liste invalide : '+k);
     for(const e of p[k]){
       if(!e||typeof e!=='object'||typeof e.id!=='string'||!/^mt-\d{8}-[a-z0-9-]{2,80}$/.test(e.id))throw Error('Identifiant invalide.');
       if(!validDate(e.date))throw Error('Date invalide.');
       if(k==='logs'&&(typeof e.description!=='string'||!e.description.trim()||e.description.length>3000))throw Error('Entrée incorrecte.');
       if(k==='reminders'&&(typeof e.title!=='string'||!e.title.trim()||e.title.length>120))throw Error('Rappel incorrect.');
       if(k==='extras'&&(!e.agent||!['accepted','offered','declined','cancelled'].includes(e.status)))throw Error('Extra incorrect.');
     }
   }
   return {...p,assignments:[],certs:[]};
 };
 let payload=null,error='';
 try{payload=validate(decode(location.hash.slice(prefix.length)))}catch(e){error=e.message||'Lien illisible.'}
 const box=document.createElement('section');box.id=TAG;
 box.style.cssText='position:fixed;inset:0;z-index:2500;background:#07121bea;display:flex;align-items:center;justify-content:center;padding:14px';
 const dialog=document.createElement('div');dialog.style.cssText='width:min(100%,600px);max-height:90dvh;overflow:auto;background:#213149;color:#fff;border:1px solid #8298b2;border-radius:16px;padding:18px;box-shadow:0 15px 70px #000b;font:15px system-ui';
 const title=document.createElement('h2');title.textContent='Importer dans MyTEAM';title.style.margin='0 0 10px';dialog.append(title);
 const sub=document.createElement('p');sub.style.cssText='font-size:13px;line-height:1.6;color:#d5e4f4';sub.textContent=error||'Prévisualisation : les notes seront enregistrées uniquement sur cet appareil après confirmation. Aucune modification des données officielles.';dialog.append(sub);
 if(payload){
   const summary=document.createElement('p');summary.textContent='Date : '+payload.day+' · '+payload.logs.length+' entrées de main courante · '+payload.reminders.length+' rappel(s) · '+payload.extras.length+' activation(s) extra · '+payload.assignments.length+' affectation(s) G4S · '+payload.certs.length+' certification(s).';dialog.append(summary);
   const list=document.createElement('div');list.style.cssText='max-height:46dvh;overflow:auto;border-top:1px solid #546a85;border-bottom:1px solid #546a85;margin-bottom:12px';
   const all=[...payload.logs.map(v=>({kind:'Main courante',value:(v.post?v.post+' · ':'')+(v.agents?v.agents+' · ':'')+v.description})),...payload.reminders.map(v=>({kind:'Rappel',value:v.title})),...payload.extras.map(v=>({kind:'Extra accepté',value:v.agent+(v.post?' · '+v.post:'')})),...payload.assignments.map(v=>({kind:'Affectation '+v.date+' '+v.shift,value:v.post+' · '+v.agent})),...payload.certs.map(v=>({kind:'Certification '+v.date+' '+v.time,value:v.agent}))];
   for(const item of all){const wrap=document.createElement('p');wrap.style.cssText='font-size:13px;line-height:1.5;padding:8px 0;border-bottom:1px solid #3c5069;white-space:pre-wrap';const strong=document.createElement('strong');strong.textContent=item.kind+' : ';wrap.append(strong,document.createTextNode(item.value));list.append(wrap)}dialog.append(list);
 }
 const status=document.createElement('p');status.style.fontSize='13px';status.setAttribute('role','status');dialog.append(status);
 const buttons=document.createElement('div');buttons.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 const close=document.createElement('button');close.type='button';close.textContent='Annuler';close.style.cssText='background:#405873;color:white;padding:12px 17px';
 const apply=document.createElement('button');apply.type='button';apply.textContent='Confirmer et enregistrer dans MyTEAM';apply.style.cssText='background:#16805e;color:white;padding:12px 17px';apply.disabled=!payload;buttons.append(close,apply);dialog.append(buttons);box.append(dialog);document.body.append(box);
 const clearHash=()=>{history.replaceState(null,'',location.pathname+location.search)};
 close.onclick=()=>{clearHash();box.remove()};
 apply.onclick=()=>{
   if(!payload)return;
   const backup={};const changed=[];
   try{
     for(const key of Object.values(keys)){backup[key]=localStorage.getItem(key)}
     for(const [bucket,key] of Object.entries(keys)){
       const current=backup[key]?JSON.parse(backup[key]):[];
       if(!Array.isArray(current))throw Error('Les données existantes '+bucket+' ne sont pas une liste. Import interrompu.');
       const ids=new Set(current.map(x=>x&&x.id));
       const fresh=payload[bucket].filter(x=>!ids.has(x.id));
       if(!fresh.length)continue;
       const now=new Date().toISOString();
       const mapped=fresh.map(row=>({...row,createdAt:now,updatedAt:now}));
       localStorage.setItem(key,JSON.stringify([...current,...mapped]));changed.push(key);
     }
   }catch(e){
     for(const key of changed){try{backup[key]===null?localStorage.removeItem(key):localStorage.setItem(key,backup[key])}catch{}}
     status.textContent='Import non effectué : '+(e.message||'Erreur de stockage');return;
   }
   for(const key of changed){window.dispatchEvent(new StorageEvent('storage',{key}))}
   window.MyTeamRefreshReminders?.();window.MyTeamRefreshExtras?.();window.MyTeamRefreshParifBoard?.();
   clearHash();title.textContent='Notes enregistrées';sub.textContent=changed.length?'Les entrées ont été ajoutées sans écraser les données existantes.':'Ces notes étaient déjà présentes. Aucun doublon créé.';
   dialog.querySelector('div[style*="max-height: 46dvh"]')?.remove();
   apply.remove();close.textContent='Ouvrir ma journée';close.onclick=()=>{box.remove();document.querySelector('nav.tabs [data-tab="today"]')?.click();(payload.version===2?document.getElementById('mt-parif-g4s-board'):document.getElementById('mt-ops-host'))?.scrollIntoView({behavior:'smooth'})};
   status.textContent='Retrouve ces données dans la main courante, les rappels et le suivi des extras.';
 };
})();