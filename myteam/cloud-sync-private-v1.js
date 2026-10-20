(async function bootstrapMyTeamEncryptedCloud() {
  'use strict';
  const TAG = 'myteam_cloud_private_v1';
  const DATA_KEY = 'myteam_cloud_sync_state_v1';
  const KEY_PATTERN = /^myteam(?:[._-]|$)/i;
  const SKIP_PATTERN = /^myteam_cloud_/i;
  const MAX_BYTES = 12 * 1024 * 1024;
  const MAX_PARTS = 128;
  const PART_LENGTH = 170000;
  const KDF_ITERATIONS = 310000;
  const AAD = new TextEncoder().encode('MyTEAM/cloud/encrypted-snapshot/v1');
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', {fatal:true});
  const firebaseConfig = {
    apiKey:'AIzaSyBAnDv-forF-09hBca7iG2DZQBpDCHej7o',
    authDomain:'mytraining---myteam.firebaseapp.com',
    projectId:'mytraining---myteam',
    storageBucket:'mytraining---myteam.firebasestorage.app',
    messagingSenderId:'310395557508',
    appId:'1:310395557508:web:62d03317c0a8b5bdf894d1'
  };
  let panel, statusNode, connectedNode, unlockNode, actionNode, passwordInput, confirmationInput;
  let auth, firestore, sdk, user=null, vaultKey=null, configData=null;
  let signedIn=false, working=false, applying=false, timer=0, lastUpload=0, blocked='', activeRevision=null;
  const safeKey = name => KEY_PATTERN.test(name) && !SKIP_PATTERN.test(name);
  const byId = id => document.getElementById(id);
  function status(message,kind) {
    if(!statusNode)return;
    statusNode.textContent=message;
    statusNode.style.color=kind==='error'?'#ffb5a7':kind==='ok'?'#a8f5ce':'#d0e5ff';
  }
  function show(element,visible) {if(element)element.hidden=!visible;}
  function showChoice(type) {
    blocked=type||'';
    show(byId('mtc-restore'),!!type);
    show(byId('mtc-keep-local'),!!type);
    if(type) {
      byId('mtc-restore').textContent=type==='conflict'?'Récupérer la version en ligne':'Récupérer mes données en ligne';
      byId('mtc-keep-local').textContent=type==='conflict'?'Envoyer mes données locales':'Conserver mes données locales';
      status(type==='conflict'
        ?'⚠️ Deux appareils ont modifié MyTEAM. Choisis quelle version conserver ; une sauvegarde locale sera créée avant toute restauration.'
        :'Une sauvegarde en ligne existe déjà. Choisis si tu souhaites la récupérer ou conserver les données de cet appareil.');
    }
  }
  function renderAccount() {
    if(!panel)return;
    show(connectedNode,!user);
    show(unlockNode,!!user&&!vaultKey);
    show(actionNode,!!user&&!!vaultKey);
    const account=byId('mtc-account');
    if(account)account.textContent=user?.email?'Compte : '+user.email:'';
    const firstTime=!!user&&!configData;
    show(byId('mtc-confirm-row'),firstTime);
    const title=byId('mtc-unlock-title');
    if(title)title.textContent=firstTime?'Créer ma phrase secrète':'Déverrouiller ma sauvegarde';
    const button=byId('mtc-unlock-submit');
    if(button)button.textContent=firstTime?'Activer la sauvegarde chiffrée':'Déverrouiller';
  }
  function mount() {
    if(panel)return true;
    const host=document.getElementById('secure-backup');
    if(!host)return false;
    panel=document.createElement('div');
    panel.id='mtc-cloud';
    panel.className='card';
    panel.innerHTML=`
      <h2>☁️ Synchronisation privée MyTEAM</h2>
      <p style="font-size:13px;line-height:1.5;color:#cbdaeb">Les données sont chiffrées sur cet appareil avant l'envoi. Elles restent également enregistrées localement. MyTraining et MyTEAM utilisent des espaces distincts.</p>
      <p id="mtc-status" role="status" aria-live="polite" style="font-size:14px;line-height:1.5;padding:10px;background:#132a38;border-radius:10px">Initialisation…</p>
      <p id="mtc-account" style="font-size:12px;color:#a9d8ef"></p>
      <div id="mtc-connect"><button id="mtc-signin" type="button" style="background:#285c9a">Connecter mon compte Google</button></div>
      <div id="mtc-unlock" hidden>
        <h3 id="mtc-unlock-title">Phrase secrète</h3>
        <p style="font-size:13px;color:#f5d6ad">Ne communique jamais cette phrase à ChatGPT. Elle est nécessaire sur un nouvel appareil. Si tu la perds et perds ton appareil, les données en ligne ne pourront pas être déchiffrées.</p>
        <label style="display:grid;gap:6px;margin:10px 0">Phrase secrète (14 caractères minimum)
          <input id="mtc-password" type="password" autocomplete="new-password" minlength="14" style="padding:12px;border-radius:9px;background:#102033;border:1px solid #6f879a;color:white;font:16px system-ui;width:100%">
        </label>
        <label id="mtc-confirm-row" style="display:grid;gap:6px;margin:10px 0">Confirmer la phrase secrète
          <input id="mtc-password-confirm" type="password" autocomplete="new-password" minlength="14" style="padding:12px;border-radius:9px;background:#102033;border:1px solid #6f879a;color:white;font:16px system-ui;width:100%">
        </label>
        <label style="display:flex;gap:10px;align-items:flex-start;margin:12px 0;font-size:13px;line-height:1.5">
          <input id="mtc-authorized" type="checkbox" style="width:24px;height:24px;flex-shrink:0">
          <span>Je confirme avoir l'autorisation d'utiliser ce service pour conserver les informations professionnelles concernées. Le chiffrement ne remplace pas les règles de mon employeur.</span>
        </label>
        <button id="mtc-unlock-submit" type="button" style="background:#1d795d">Activer la sauvegarde chiffrée</button>
      </div>
      <div id="mtc-actions" hidden>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button id="mtc-manual" type="button" style="background:#1d795d">↻ Synchroniser maintenant</button>
          <button id="mtc-signout" type="button">Déconnecter Google</button>
          <button id="mtc-rollback" type="button">↶ Annuler une restauration</button>
        </div>
        <div id="mtc-choice" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button id="mtc-restore" type="button" style="background:#245f8a" hidden>Récupérer mes données en ligne</button>
          <button id="mtc-keep-local" type="button" style="background:#9a5f29" hidden>Conserver mes données locales</button>
        </div>
        <p style="font-size:12px;color:#b8c9db">Automatique après les modifications lorsque tu es connecté. En cas de conflit, aucun écrasement n'est effectué sans ton choix. Une copie des données remplacées est conservée sur cet appareil.</p>
      </div>`;
    host.insertBefore(panel,host.firstChild);
    statusNode=byId('mtc-status');
    connectedNode=byId('mtc-connect');
    unlockNode=byId('mtc-unlock');
    actionNode=byId('mtc-actions');
    passwordInput=byId('mtc-password');
    confirmationInput=byId('mtc-password-confirm');
    byId('mtc-signin').onclick=signIn;
    byId('mtc-unlock-submit').onclick=unlock;
    byId('mtc-manual').onclick=()=>performSync(true);
    byId('mtc-signout').onclick=async()=>{
      try {await sdk.signOut(auth);user=null;vaultKey=null;renderAccount();status('Déconnecté : tes données locales sont conservées.');}
      catch(e){status('Déconnexion impossible : '+safeError(e),'error')}
    };
    byId('mtc-restore').onclick=()=>restoreFromCloud();
    byId('mtc-keep-local').onclick=()=>uploadFromLocal(true);
    byId('mtc-rollback').onclick=()=>restorePreviousLocal();
    renderAccount();
    return true;
  }
  async function waitForPanel() {
    for(let i=0;i<35;i++){
      if(mount())return true;
      await new Promise(resolve=>setTimeout(resolve,450));
    }
    return false;
  }
  const PHOTO_STORES=[
    {db:'myteam_parif_photo_plans_v1',table:'photos'},
    {db:'myteam_leave_board_photos_v1',table:'documents'}
  ];
  async function photoDatabase(info) {
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(info.db,1);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains(info.table))request.result.createObjectStore(info.table);
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('Stockage photo inaccessible.'));
    });
  }
  async function serializePhoto(value) {
    if(value instanceof Blob)return {__myteamBinaryBlob:true,mime:value.type,bytes:bytesToB64(new Uint8Array(await value.arrayBuffer()))};
    if(Array.isArray(value))return Promise.all(value.map(serializePhoto));
    if(value&&typeof value==='object'){
      const out={};
      for(const [k,v] of Object.entries(value))out[k]=await serializePhoto(v);
      return out;
    }
    return value;
  }
  async function deserializePhoto(value) {
    if(value&&typeof value==='object'&&!Array.isArray(value)&&value.__myteamBinaryBlob===true){
      if(typeof value.bytes!=='string'||value.bytes.length>MAX_BYTES*2)throw Error('Image de sauvegarde invalide.');
      return new Blob([b64ToBytes(value.bytes)],{type:String(value.mime||'application/octet-stream').slice(0,120)});
    }
    if(Array.isArray(value))return Promise.all(value.map(deserializePhoto));
    if(value&&typeof value==='object'){
      const out={};
      for(const [k,v] of Object.entries(value))out[k]=await deserializePhoto(v);
      return out;
    }
    return value;
  }
  async function capturePhotos() {
    const result={};
    for(const info of PHOTO_STORES){
      const db=await photoDatabase(info);
      try{
        const records=await new Promise((resolve,reject)=>{
          const tx=db.transaction(info.table,'readonly');
          const os=tx.objectStore(info.table);
          const keys=os.getAllKeys(),values=os.getAll();
          tx.oncomplete=()=>resolve(keys.result.map((key,i)=>({key,value:values.result[i]})));
          tx.onerror=()=>reject(tx.error||Error('Photos illisibles.'));
        });
        result[info.db]=[];
        for(const record of records)result[info.db].push({key:record.key,value:await serializePhoto(record.value)});
      }finally{db.close()}
    }
    return result;
  }
  async function restorePhotos(photos) {
    if(!photos||typeof photos!=='object'||Array.isArray(photos))return;
    for(const info of PHOTO_STORES){
      if(!Array.isArray(photos[info.db]))continue;
      const records=[];
      for(const row of photos[info.db]){
        if(!row||!(typeof row.key==='string'||typeof row.key==='number'))throw Error('Clé de photo incorrecte.');
        records.push({key:row.key,value:await deserializePhoto(row.value)});
      }
      const db=await photoDatabase(info);
      try{
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(info.table,'readwrite'),os=tx.objectStore(info.table);
          os.clear();
          for(const row of records)os.put(row.value,row.key);
          tx.oncomplete=resolve;
          tx.onerror=()=>reject(tx.error||Error('Photos non restaurées.'));
          tx.onabort=()=>reject(tx.error||Error('Restauration photo annulée.'));
        });
      }finally{db.close()}
    }
  }
  async function capture() {
    const names=[];
    for(let i=0;i<localStorage.length;i++){
      const name=localStorage.key(i);
      if(name&&safeKey(name))names.push(name);
    }
    names.sort();
    const entries={};
    for(const name of names)entries[name]=localStorage.getItem(name)||'';
    const obj={schema:'myteam-cloud-snapshot-v1',entries,attachments:await capturePhotos()};
    const bytes=encoder.encode(JSON.stringify(obj));
    if(bytes.length>MAX_BYTES)throw Error('Données et photos trop volumineuses pour la sauvegarde chiffrée (12 Mo).');
    return obj;
  }
  async function fingerprint(snapshot) {
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(snapshot))));
    return [...hash].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function bytesToB64(bytes) {
    let s='';
    for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(s);
  }
  function b64ToBytes(text) {
    if(typeof text!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('Sauvegarde endommagée.');
    return Uint8Array.from(atob(text),c=>c.charCodeAt(0));
  }
  async function derive(password,salt) {
    const raw=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey(
      {name:'PBKDF2',salt,iterations:KDF_ITERATIONS,hash:'SHA-256'},raw,
      {name:'AES-GCM',length:256},false,['encrypt','decrypt']
    );
  }
  async function seal(key,plaintext) {
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const cipher=new Uint8Array(await crypto.subtle.encrypt(
      {name:'AES-GCM',iv,additionalData:AAD},key,encoder.encode(plaintext)
    ));
    return bytesToB64(iv)+'.'+bytesToB64(cipher);
  }
  async function unseal(key,sealed) {
    if(typeof sealed!=='string'||sealed.length>MAX_BYTES*2+300||sealed.split('.').length!==2)throw Error('Sauvegarde incorrecte.');
    const [ivText,dataText]=sealed.split('.');
    const iv=b64ToBytes(ivText);
    if(iv.length!==12)throw Error('Signature invalide.');
    const plain=await crypto.subtle.decrypt(
      {name:'AES-GCM',iv,additionalData:AAD},key,b64ToBytes(dataText)
    );
    return decoder.decode(plain);
  }
  function loadMarker() {
    try{
      const item=JSON.parse(localStorage.getItem(DATA_KEY)||'null');
      return item&&item.uid===user?.uid?item:null;
    }catch{return null;}
  }
  function saveMarker(revision,hash) {
    localStorage.setItem(DATA_KEY,JSON.stringify({uid:user.uid,revision,hash,at:new Date().toISOString()}));
  }
  function safeError(error) {
    const code=String(error?.code||'');
    if(code.includes('popup-closed'))return 'Fenêtre Google fermée.';
    if(code.includes('popup-blocked'))return 'Fenêtre bloquée : réessaie depuis Chrome.';
    if(code.includes('unauthorized-domain'))return 'Domaine non autorisé dans Firebase.';
    if(code.includes('permission-denied'))return 'Accès refusé : vérifie les règles Firebase.';
    if(code==='SYNC_CONFLICT'||String(error?.message||'').includes('SYNC_CONFLICT'))return 'Conflit : une autre version est apparue. Aucune donnée supprimée.';
    return String(error?.message||error||'Erreur inconnue').slice(0,240);
  }
  function refs() {
    const parent=['users',user.uid,'myteamCloud'];
    return {config:sdk.doc(firestore,...parent,'config'),
      manifest:sdk.doc(firestore,...parent,'manifest'),
      chunk: index=>sdk.doc(firestore,...parent,'manifest','chunks',index)};
  }
  function openIndexedDb() {
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('myteam_private_cloud',1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains('keys'))db.createObjectStore('keys');
        if(!db.objectStoreNames.contains('backups'))db.createObjectStore('backups');
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||Error('Stockage local indisponible.'));
    });
  }
  async function idbOp(storeName,method,key,value) {
    const db=await openIndexedDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,method==='get'?'readonly':'readwrite');
      const os=tx.objectStore(storeName);
      let req;
      if(method==='get')req=os.get(key);
      else if(method==='put')req=os.put(value,key);
      else req=os.delete(key);
      tx.oncomplete=()=>{const result=req?.result;db.close();resolve(result)};
      tx.onerror=()=>{const e=tx.error;db.close();reject(e||Error('Accès au stockage local impossible'))};
      tx.onabort=()=>{const e=tx.error;db.close();reject(e||Error('Opération de sauvegarde interrompue'))};
    });
  }
  function cachedKeyName() {return user.uid+':'+configData.salt}
  async function prepareAccount(account) {
    user=account;vaultKey=null;configData=null;activeRevision=null;showChoice('');
    if(!user){renderAccount();status('Non connecté. Aucune donnée MyTEAM n’est envoyée.');return;}
    renderAccount();
    status('Lecture des paramètres chiffrés…');
    try{
      const snapshot=await sdk.getDoc(refs().config);
      configData=snapshot.exists()?snapshot.data():null;
      if(configData) {
        if(configData.format!=='myteam-cloud-private-v1'||configData.iterations!==KDF_ITERATIONS)throw Error('Format de chiffrement non reconnu.');
        try{
          const cached=await idbOp('keys','get',cachedKeyName());
          if(cached&&await unseal(cached,configData.check)==='MyTEAM-private-key-check-v1')vaultKey=cached;
        }catch{vaultKey=null;}
      }
      renderAccount();
      if(vaultKey){status('Clé retrouvée sur cet appareil. Vérification de la sauvegarde…');schedule(100);}
      else if(configData)status('Saisis la phrase secrète pour accéder à ta sauvegarde chiffrée.');
      else status('Crée ta phrase secrète. Aucune donnée ne sera envoyée avant ton accord.');
    }catch(err){status('Impossible de lire la configuration : '+safeError(err),'error')}
  }
  async function signIn() {
    if(!auth)return;
    byId('mtc-signin').disabled=true;
    status('Connexion Google en cours…');
    try{await sdk.signInWithPopup(auth,new sdk.GoogleAuthProvider())}
    catch(e){status('Connexion Google : '+safeError(e),'error')}
    finally{byId('mtc-signin').disabled=false}
  }
  async function unlock() {
    if(!user||working)return;
    const password=passwordInput.value;
    if(password.length<14){status('Choisis une phrase secrète d’au moins 14 caractères.','error');return;}
    if(!byId('mtc-authorized').checked){status('Confirme d’abord ton autorisation professionnelle.','error');return;}
    if(!crypto?.subtle||!indexedDB){status('Chiffrement indisponible sur ce navigateur.','error');return;}
    working=true;
    byId('mtc-unlock-submit').disabled=true;
    status('Déverrouillage sécurisé…');
    try{
      if(!configData){
        if(password!==confirmationInput.value)throw Error('Les phrases secrètes ne correspondent pas.');
        const salt=crypto.getRandomValues(new Uint8Array(16));
        const key=await derive(password,salt);
        const check=await seal(key,'MyTEAM-private-key-check-v1');
        const candidate={format:'myteam-cloud-private-v1',iterations:KDF_ITERATIONS,salt:bytesToB64(salt),check,createdAt:sdk.serverTimestamp()};
        const ref=refs().config;
        await sdk.runTransaction(firestore,async tx=>{
          const doc=await tx.get(ref);
          if(doc.exists())throw Error('La configuration existe déjà. Recharge MyTEAM.');
          tx.set(ref,candidate);
        });
        configData=candidate;
        vaultKey=key;
      } else {
        const key=await derive(password,b64ToBytes(configData.salt));
        let verifier;
        try{verifier=await unseal(key,configData.check)}catch{throw Error('Phrase secrète incorrecte.');}
        if(verifier!=='MyTEAM-private-key-check-v1')throw Error('Phrase secrète incorrecte.');
        vaultKey=key;
      }
      try{await idbOp('keys','put',cachedKeyName(),vaultKey)}
      catch{status('Clé active pour cette session. Tu devras peut-être ressaisir ta phrase après fermeture.');}
      passwordInput.value='';confirmationInput.value='';byId('mtc-authorized').checked=false;
      renderAccount();status('Chiffrement actif. Première synchronisation…');
    }catch(err){status('Activation impossible : '+safeError(err),'error')}
    finally{working=false;byId('mtc-unlock-submit').disabled=false;}
    if(vaultKey)schedule(100);
  }
  async function getRemoteManifest() {
    const snap=await sdk.getDoc(refs().manifest);
    return snap.exists()?snap.data():null;
  }
  async function downloadRemote(manifest) {
    if(!manifest||!manifest.revision||!Number.isInteger(manifest.chunks)
      ||manifest.chunks<1||manifest.chunks>MAX_PARTS)throw Error('Manifestation de sauvegarde invalide.');
    const pieces=new Array(manifest.chunks);
    const {chunk}=refs();
    for(let start=0;start<manifest.chunks;start+=6){
      const tasks=[];
      for(let i=start;i<Math.min(start+6,manifest.chunks);i++){
        tasks.push(sdk.getDoc(chunk(manifest.revision+'_'+i)).then(snap=>{
          const val=snap.data()?.value;
          if(!snap.exists()||typeof val!=='string'||val.length>PART_LENGTH)throw Error('Sauvegarde incomplète.');
          pieces[i]=val;
        }));
      }
      await Promise.all(tasks);
    }
    const plain=await unseal(vaultKey,pieces.join(''));
    if(encoder.encode(plain).length>MAX_BYTES)throw Error('Sauvegarde distante trop volumineuse.');
    const snapshot=JSON.parse(plain);
    if(snapshot?.schema!=='myteam-cloud-snapshot-v1'||!snapshot.entries||typeof snapshot.entries!=='object'||Array.isArray(snapshot.entries))throw Error('Format sauvegarde invalide.');
    const names=Object.keys(snapshot.entries);
    if(names.length>500||names.some(n=>!safeKey(n)||n.length>180||typeof snapshot.entries[n]!=='string'))throw Error('Contenu non conforme.');
    return snapshot;
  }
  async function preserveBeforeRestore(snapshot) {
    const backupName=(user?.uid||'local')+'-'+Date.now();
    const copy={createdAt:new Date().toISOString(),snapshot};
    await idbOp('backups','put',backupName,copy);
    await idbOp('backups','put','latest:'+user.uid,copy);
    return backupName;
  }
  async function restorePreviousLocal() {
    if(!user||working)return;
    working=true;
    try{
      const record=await idbOp('backups','get','latest:'+user.uid);
      if(!record?.snapshot?.entries){status('Aucune version locale antérieure trouvée.');return;}
      if(!confirm('Restaurer les données conservées sur cet appareil avant la dernière récupération en ligne ? La version actuelle sera elle aussi sauvegardée.'))return;
      const previous=record.snapshot;
      await preserveBeforeRestore(await capture());
      applying=true;
      try{
        await restorePhotos(previous.attachments);
        for(const name of Object.keys((await capture()).entries))if(!(name in previous.entries))localStorage.removeItem(name);
        for(const [name,value] of Object.entries(previous.entries))if(safeKey(name)&&typeof value==='string')localStorage.setItem(name,value);
        localStorage.removeItem(DATA_KEY);
      }finally{applying=false;}
      status('Version locale précédente rétablie. Choisis la version à conserver après actualisation.','ok');
      setTimeout(()=>location.reload(),900);
    }catch(err){status('Restauration locale impossible : '+safeError(err),'error')}
    finally{working=false;}
  }
  async function applyRemote(remote,manifest) {
    const local=await capture();
    const oldBackup=await preserveBeforeRestore(local);
    applying=true;
    try{
      await restorePhotos(remote.attachments);
      const remoteEntries=remote.entries;
      for(const name of Object.keys(local.entries))if(!(name in remoteEntries))localStorage.removeItem(name);
      for(const [name,value] of Object.entries(remoteEntries))localStorage.setItem(name,value);
      const newHash=await fingerprint(await capture());
      saveMarker(manifest.revision,newHash);
      status('✅ Données récupérées et ancienne version sauvegardée sur cet appareil. Actualisation…','ok');
      setTimeout(()=>location.reload(),900);
      return oldBackup;
    }finally{applying=false;}
  }
  async function restoreFromCloud() {
    if(!user||!vaultKey||working)return;
    working=true;
    const button=byId('mtc-restore');button.disabled=true;
    status('Téléchargement et déchiffrement de la sauvegarde…');
    try{
      const manifest=await getRemoteManifest();
      if(!manifest)throw Error('Aucune sauvegarde en ligne.');
      const snapshot=await downloadRemote(manifest);
      const remoteCount=Object.keys(snapshot.entries).length;
      const localCount=Object.keys((await capture()).entries).length;
      if(!confirm('Récupérer '+remoteCount+' éléments depuis la sauvegarde chiffrée ? Les '+localCount+' éléments locaux actuels seront préservés dans une sauvegarde de sécurité sur cet appareil avant leur remplacement.')) {
        status('Restauration annulée. Aucune donnée modifiée.');return;
      }
      await applyRemote(snapshot,manifest);
      showChoice('');
    }catch(err){status('Récupération impossible : '+safeError(err),'error')}
    finally{working=false;button.disabled=false;}
  }
  async function uploadFromLocal(forced) {
    if(!user||!vaultKey||working)return;
    if(forced&&!confirm('Envoyer la version de ce téléphone sur Firebase ? L’ancienne version en ligne sera conservée temporairement.'))return;
    showChoice('');
    await performSync(true,forced===true);
  }
  async function uploadSnapshot(snapshot,expectedManifest,localHash) {
    const manifestRef=refs().manifest;
    const oldRevision=expectedManifest?.revision||null;
    const id=(crypto.randomUUID?crypto.randomUUID():Date.now()+'_'+Math.random()).replace(/[^A-Za-z0-9_-]/g,'');
    const sealed=await seal(vaultKey,JSON.stringify(snapshot));
    const parts=[];
    for(let start=0;start<sealed.length;start+=PART_LENGTH)parts.push(sealed.slice(start,start+PART_LENGTH));
    if(!parts.length||parts.length>MAX_PARTS)throw Error('Sauvegarde trop volumineuse.');
    const {chunk}=refs();
    for(let start=0;start<parts.length;start+=5){
      const tasks=[];
      for(let i=start;i<Math.min(start+5,parts.length);i++) {
        tasks.push(sdk.setDoc(chunk(id+'_'+i),{value:parts[i]}));
      }
      await Promise.all(tasks);
    }
    await sdk.runTransaction(firestore,async tx=>{
      const current=await tx.get(manifestRef);
      const revision=current.exists()?current.data().revision:null;
      if(revision!==oldRevision)throw Error('SYNC_CONFLICT');
      tx.set(manifestRef,{
        format:'myteam-cloud-private-v1',
        revision:id,
        chunks:parts.length,
        previous:expectedManifest?{revision:expectedManifest.revision,chunks:expectedManifest.chunks}:null,
        updatedAt:sdk.serverTimestamp()
      });
    });
    saveMarker(id,localHash);
    lastUpload=Date.now();
    activeRevision=id;
    // Conserve la version actuelle et la précédente, efface seulement la copie plus ancienne.
    const obsolete=expectedManifest?.previous;
    if(obsolete?.revision&&Number.isInteger(obsolete.chunks)&&obsolete.chunks>=1&&obsolete.chunks<=MAX_PARTS){
      for(let i=0;i<obsolete.chunks;i++){
        try{await sdk.deleteDoc(chunk(obsolete.revision+'_'+i))}catch{}
      }
    }
    return id;
  }
  async function performSync(manual,forceLocal) {
    if(working||applying||!user||!vaultKey||!navigator.onLine)return;
    if(blocked&&!forceLocal)return;
    working=true;
    try{
      const local=await capture();
      const hash=await fingerprint(local);
      const marker=loadMarker();
      const remote=await getRemoteManifest();
      const remoteRevision=remote?.revision||null;
      activeRevision=remoteRevision;
      if(!remote){
        status('Première sauvegarde chiffrée en cours…');
        await uploadSnapshot(local,null,hash);
        status('✅ Sauvegarde en ligne chiffrée. Synchronisation automatique active.','ok');
        return;
      }
      if(forceLocal){
        status('Envoi chiffré des données de ce téléphone…');
        await uploadSnapshot(local,remote,hash);
        status('✅ Données locales envoyées. Synchronisation automatique active.','ok');
        return;
      }
      if(!marker){
        showChoice('first');
        return;
      }
      if(remoteRevision!==marker.revision) {
        if(marker.hash!==hash) {
          showChoice('conflict');
          return;
        }
        status('Nouvelles données en ligne détectées. Récupération…');
        const downloaded=await downloadRemote(remote);
        await applyRemote(downloaded,remote);
        return;
      }
      if(marker.hash!==hash) {
        if(!manual&&Date.now()-lastUpload<45000) {
          status('Modifications locales enregistrées. Envoi automatique dans quelques secondes.');
          schedule(45000-(Date.now()-lastUpload)+500);
          return;
        }
        status('Envoi des modifications chiffrées…');
        await uploadSnapshot(local,remote,hash);
        status('✅ Synchronisé et chiffré.','ok');
        return;
      }
      showChoice('');
      status('✅ Synchronisé et chiffré. Dernière vérification : '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),'ok');
    }catch(err){
      const e=safeError(err);
      if(e.includes('Conflit'))showChoice('conflict');
      else status('⚠️ Synchronisation interrompue : '+e+'. Données locales conservées.','error');
    }finally{working=false;}
  }
  function schedule(delay) {
    if(!vaultKey||!user||applying)return;
    if(timer)clearTimeout(timer);
    timer=setTimeout(()=>{timer=0;performSync(false)},Math.max(100,delay??8000));
  }
  function watchStorage() {
    const originalSet=Storage.prototype.setItem;
    const originalRemove=Storage.prototype.removeItem;
    try{
      Storage.prototype.setItem=function(name,value){
        const out=originalSet.call(this,name,value);
        if(this===localStorage&&safeKey(String(name))&&!applying)schedule(8500);
        return out;
      };
      Storage.prototype.removeItem=function(name){
        const out=originalRemove.call(this,name);
        if(this===localStorage&&safeKey(String(name))&&!applying)schedule(8500);
        return out;
      };
    }catch{}
    window.addEventListener('storage',event=>{if(event.storageArea===localStorage&&safeKey(String(event.key||'')))schedule(1000)});
    window.addEventListener('online',()=>schedule(1000));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(300)});
    window.addEventListener('focus',()=>schedule(700));
    setInterval(()=>{if(!document.hidden&&user&&vaultKey)schedule(3000)},90000);
  }
  try{
    if(!(await waitForPanel()))return;
    if(!crypto?.subtle){status('Chiffrement indisponible dans ce navigateur.','error');return;}
    const [appPkg,authPkg,firestorePkg]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')
    ]);
    sdk={...authPkg,...firestorePkg};
    const firebase=appPkg.initializeApp(firebaseConfig,'myteam-private-cloud');
    auth=authPkg.getAuth(firebase);
    firestore=firestorePkg.getFirestore(firebase);
    watchStorage();
    authPkg.onAuthStateChanged(auth,account=>{prepareAccount(account).catch(e=>status('Connexion : '+safeError(e),'error'))});
  }catch(error){status('Sauvegarde en ligne indisponible : '+safeError(error),'error');}
})();