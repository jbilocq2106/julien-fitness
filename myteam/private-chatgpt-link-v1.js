/* MyTEAM : liaison ChatGPT -> rappels par enveloppe chiffrée.
   La clé privée RSA-OAEP non exportable reste sur cet appareil (IndexedDB).
   Aucun nom, rappel ou clé privée n'est publié dans le dépôt. */
(()=>{
'use strict';
if(window.MyTeamPrivateInbox)return;
const PREFIX='#mt-private-reminders-v1=';
const incoming=location.hash.startsWith(PREFIX)?location.hash.slice(PREFIX.length):'';
if(incoming)history.replaceState(null,'',location.pathname+location.search);
const root=document.getElementById('myteam-private-link-root')||document.getElementById('mt-context-reminders');
if(!root)return;
const STORE='myteam_agent_context_reminders_v1';
const DB='myteam_private_inbox_keys_v1', BUCKET='pair';
const AAD=new TextEncoder().encode('MyTEAM/private-reminders/v1');
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const $=id=>document.getElementById(id);
const style=document.createElement('style');
style.textContent=[
'#mt-private-inbox{border:1px solid #547a85;background:#192e42;border-radius:14px;padding:14px;margin:11px 0}',
'#mt-private-inbox p{font-size:13px;line-height:1.5;color:#d8e6ef}',
'#mt-private-inbox button{min-height:45px;margin:5px 7px 5px 0;background:#286d63}',
'#mt-private-inbox textarea{font-size:12px!important;height:70px;width:100%}',
'#mt-private-inbox-overlay{position:fixed;inset:0;z-index:2400;background:#060f1ae9;display:flex;align-items:center;justify-content:center;padding:14px}',
'#mt-private-inbox-dialog{width:min(100%,570px);max-height:88dvh;overflow:auto;padding:19px;border-radius:16px;border:1px solid #6f8a9f;background:#1c3048;color:white}',
'#mt-private-inbox-dialog p{line-height:1.5;color:#dbe7f3}',
'#mt-private-inbox-dialog .mt-pi-item{padding:11px 0;border-top:1px solid #536982;white-space:pre-wrap}',
'#mt-private-inbox-dialog button{min-height:47px;margin:8px 8px 0 0}',
'#mt-private-inbox-dialog .mt-pi-apply{background:#216d52}'
].join('');document.head.append(style);
const panel=document.createElement('div');panel.id='mt-private-inbox';
panel.innerHTML='<h3>Connexion privée avec ChatGPT</h3><p>Active une fois la liaison sur ce téléphone, puis copie ici ta clé publique dans ChatGPT. Tu ne dois jamais transmettre ta clé privée ni la phrase secrète de ta sauvegarde.</p><button type="button" id="mt-pi-public">Copier ma clé publique</button><p id="mt-pi-status" role="status">Vérification de la liaison…</p><textarea id="mt-pi-public-fallback" hidden readonly aria-label="Clé publique à copier"></textarea><p class="muted">Les rappels reçus par lien chiffré sont d’abord affichés pour confirmation. Rien n’est publié sur GitHub.</p>';
root.append(panel);
function setStatus(s){$('mt-pi-status').textContent=s}
function dbOpen(){
 return new Promise((resolve,reject)=>{
  const q=indexedDB.open(DB,1);
  q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(BUCKET))q.result.createObjectStore(BUCKET,{keyPath:'id'})};
  q.onsuccess=()=>resolve(q.result);
  q.onerror=()=>reject(q.error||Error('Stockage privé inaccessible'));
 });
}
async function dbAction(mode,method,arg){
 const db=await dbOpen();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(BUCKET,mode),store=tx.objectStore(BUCKET);
   const req=method==='get'?store.get(arg):store.put(arg);
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Stockage impossible'));
   tx.onabort=()=>reject(tx.error||Error('Transaction annulée'));
  });
 }finally{db.close()}
}
const b64=bytes=>{
 let result='';for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return btoa(result).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const unb64=value=>{
 if(typeof value!=='string'||value.length>18000||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Lien chiffré incorrect.');
 return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),x=>x.charCodeAt(0));
};
async function getPair(create){
 const old=await dbAction('readonly','get','primary');
 if(old?.privateKey&&old?.publicKey)return old;
 if(!create)return null;
 const keys=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:Uint8Array.from([1,0,1]),hash:'SHA-256'},false,['encrypt','decrypt']);
 const record={id:'primary',privateKey:keys.privateKey,publicKey:keys.publicKey};
 await dbAction('readwrite','put',record);
 return record;
}
function validate(body){
 if(body?.schema!=='myteam-private-reminders-v1'||body.version!==1||!Array.isArray(body.items)||body.items.length<1||body.items.length>25)throw Error('Format des rappels non reconnu.');
 const seen=new Set();
 return body.items.map(item=>{
  if(!item||typeof item.id!=='string'||!/^ctx-[a-z0-9-]{8,90}$/i.test(item.id)||seen.has(item.id))throw Error('Identifiant de rappel incorrect.');
  seen.add(item.id);
  if(typeof item.agent!=='string'||!item.agent.trim()||item.agent.length>100)throw Error('Nom d’agent incorrect.');
  if(typeof item.text!=='string'||!item.text.trim()||item.text.length>500)throw Error('Texte de rappel incorrect.');
  if(!['present','afternoon-night','visit'].includes(item.condition))throw Error('Condition de rappel incorrecte.');
  const due=item.due===undefined?'':item.due;
  if(due&&(typeof due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due)||Number.isNaN(new Date(due+'T12:00:00').getTime())||new Date(due+'T12:00:00').toISOString().slice(0,10)!==due))throw Error('Échéance de rappel invalide.');
  return {id:item.id,agent:item.agent.trim(),text:item.text.trim(),condition:item.condition,due,status:'open'};
 });
}
async function openCapsule(token){
 const envelope=JSON.parse(decoder.decode(unb64(token)));
 if(envelope?.v!==1)throw Error('Version de liaison inconnue.');
 const ek=unb64(envelope.k),iv=unb64(envelope.i),cipher=unb64(envelope.d);
 if(iv.length!==12||ek.length!==256||cipher.length>11000)throw Error('Enveloppe chiffrée invalide.');
 const pair=await getPair(false);
 if(!pair)throw Error('Ce téléphone n’a pas encore de clé privée. Active la liaison avant de recevoir des rappels.');
 const aesRaw=await crypto.subtle.decrypt({name:'RSA-OAEP'},pair.privateKey,ek);
 const key=await crypto.subtle.importKey('raw',aesRaw,{name:'AES-GCM'},false,['decrypt']);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:AAD},key,cipher);
 return validate(JSON.parse(decoder.decode(plain)));
}
function modal(items,error){
 const overlay=document.createElement('div');overlay.id='mt-private-inbox-overlay';
 const dialog=document.createElement('div');dialog.id='mt-private-inbox-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 const title=document.createElement('h2');title.textContent=error?'Liaison impossible':'Rappels reçus depuis ChatGPT';dialog.append(title);
 const info=document.createElement('p');info.textContent=error||'Lis les rappels avant de les enregistrer sur cet appareil. Les données existantes seront conservées.';dialog.append(info);
 if(items)items.forEach(item=>{
  const row=document.createElement('div');row.className='mt-pi-item';
  const name=document.createElement('strong');name.textContent=item.agent;
  const detail=document.createElement('p');detail.textContent=item.text;
  const condition=document.createElement('small');condition.textContent=(item.due?'Échéance '+item.due+' · ':'')+(item.condition==='afternoon-night'?'Afficher en après-midi ou nuit':item.condition==='visit'?'À vérifier lors de la visite du poste':'Afficher si l’agent figure au plan');
  row.append(name,detail,condition);dialog.append(row);
 });
 const status=document.createElement('p');status.setAttribute('role','status');dialog.append(status);
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent=error?'Fermer':'Annuler';cancel.onclick=()=>overlay.remove();dialog.append(cancel);
 if(items){
  const apply=document.createElement('button');apply.type='button';apply.className='mt-pi-apply';apply.textContent='Valider ces rappels dans MyTEAM';
  apply.onclick=()=>{
   try{
    const old=JSON.parse(localStorage.getItem(STORE)||'[]');
    if(!Array.isArray(old))throw Error('Données précédentes non reconnues.');
    const ids=new Set(old.map(r=>r?.id));
    const now=new Date().toISOString();
    const fresh=items.filter(r=>!ids.has(r.id)).map(r=>({...r,createdAt:now,source:'Lien privé ChatGPT'}));
    if(fresh.length)localStorage.setItem(STORE,JSON.stringify([...old,...fresh]));
    window.MyTeamContextReminders?.refresh();
    window.MyTeamReboot?.renderHome?.();
    window.dispatchEvent(new Event('myteam-private-imported'));
    title.textContent='Rappels enregistrés';
    info.textContent=fresh.length+' nouveau(x) rappel(s). '+(items.length-fresh.length)+' rappel(s) déjà présents, sans doublon.';
    Array.from(dialog.querySelectorAll('.mt-pi-item')).forEach(x=>x.remove());
    apply.remove();cancel.textContent='Voir mes rappels';
    cancel.onclick=()=>{overlay.remove();window.MyTeamReboot?.activate?.('home')};
   }catch(e){status.textContent='Enregistrement impossible : '+e.message}
  };
  dialog.append(apply);
 }
 overlay.append(dialog);document.body.append(overlay);
}
async function copyPublic(){
 const button=$('mt-pi-public');button.disabled=true;
 try{
  if(!crypto?.subtle||typeof indexedDB==='undefined')throw Error('Ce navigateur ne permet pas ce chiffrement.');
  const pair=await getPair(true);
  const spki=new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey));
  const output='MYTEAM-PUB1:'+b64(spki);
  try{
   await navigator.clipboard.writeText(output);
   setStatus('Clé publique copiée. Colle-la dans la conversation ChatGPT pour que je puisse préparer tes rappels chiffrés.');
  }catch{
   const area=$('mt-pi-public-fallback');area.hidden=false;area.value=output;area.select();
   setStatus('Copie la clé publique affichée ci-dessous puis colle-la dans ChatGPT.');
  }
 }catch(e){setStatus('Liaison indisponible : '+(e.message||'échec'))}
 finally{button.disabled=false}
}
$('mt-pi-public').onclick=copyPublic;
async function start(){
 try{
  if(!crypto?.subtle||typeof indexedDB==='undefined')throw Error('Chiffrement local non disponible.');
  const pair=await getPair(false);
  setStatus(pair?'Liaison prête sur ce téléphone. Tu peux recopier ta clé publique à tout moment.':'Liaison non activée. Touche « Copier ma clé publique » pour commencer.');
  if(incoming){
   try{modal(await openCapsule(incoming),null)}
   catch(e){modal(null,e.name==='OperationError'?'Ce lien ne correspond pas à la clé privée de ce téléphone, ou il a été modifié.':(e.message||'Lien illisible.'))}
  }
 }catch(e){setStatus('Liaison indisponible : '+(e.message||'échec'));if(incoming)modal(null,'Liaison privée indisponible sur cet appareil.')}
}
window.MyTeamPrivateInbox={publicKey:copyPublic};
start();
})();