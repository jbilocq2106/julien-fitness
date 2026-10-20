(()=>{
  'use strict';
  if(document.getElementById('secure-backup'))return;
  const main=document.querySelector('main'),nav=document.querySelector('nav.tabs');
  if(!main||!nav)return;

  const FORMAT='myteam-encrypted-backup-v1';
  const AAD=new TextEncoder().encode('MyTEAM/backup/v1');
  const ITERATIONS=310000;
  const KEY=/^myteam(?:[._-]|$)/i;
  const maxFileSize=8*1024*1024;
  const section=document.createElement('section');
  section.id='secure-backup';section.className='hidden';
  section.innerHTML=`<style>
    #secure-backup{max-width:900px;margin:0 auto}
    #secure-backup .sb-help{font-size:13px;line-height:1.5;color:#c8d5e5}
    #secure-backup label{display:grid;gap:6px;margin:10px 0;font-weight:750}
    #secure-backup input[type=password]{min-height:50px;border-radius:12px;border:1px solid #7e94ad;background:#101c2b;color:#fff;padding:12px;font:16px system-ui;width:100%}
    #secure-backup input[type=file]{display:block;max-width:100%;font:14px system-ui;margin:8px 0;padding:10px;background:#24364d;border-radius:12px}
    #secure-backup button{min-height:50px;background:#e76b24;margin:7px 0}
    #secure-backup button:disabled{opacity:.45;cursor:not-allowed}
    #secure-backup .sb-status{min-height:25px;color:#c2e0ff;font-size:13px;line-height:1.45}
    #secure-backup .sb-preview{padding:13px;background:#1a3c34;border:1px solid #3e8668;border-radius:12px;margin:12px 0;line-height:1.55}
    #secure-backup .sb-caution{padding:12px;background:#483323;border-left:4px solid #f1a44e;border-radius:10px;font-size:13px;line-height:1.5}
    #secure-backup .sb-only{background:#1c6b51}
    @media(max-width:780px){#secure-backup .card{padding:16px}#secure-backup button{width:100%;font-size:15px}}
  </style>
    <div class="card"><h2>🔐 Sauvegarde privée MyTEAM</h2>
      <p class="sb-help">Cette fonction crée un fichier chiffré sur ton appareil, à conserver par exemple sur ton Drive personnel. Elle n’envoie rien par elle-même. Si tu actives séparément la synchronisation cloud, seules les données déjà chiffrées sont transmises à Firebase.</p>
      <p class="sb-caution"><b>Important :</b> cette sauvegarde télécharge un fichier manuel. La synchronisation chiffrée en ligne se configure séparément plus haut sur cette page. N’oublie pas ta phrase secrète : sans elle, personne ne pourra ouvrir la sauvegarde.</p>
    </div>
    <div class="card"><h3>1. Créer une sauvegarde chiffrée</h3>
      <label for="sb-password">Phrase secrète (12 caractères minimum)</label>
      <input id="sb-password" type="password" autocomplete="new-password" minlength="12" placeholder="Choisis une phrase longue et mémorable">
      <label for="sb-password-confirm">Confirmer la phrase secrète</label>
      <input id="sb-password-confirm" type="password" autocomplete="new-password" minlength="12">
      <button id="sb-download" type="button">⬇ Télécharger ma sauvegarde chiffrée</button>
      <p class="sb-status" id="sb-export-status" role="status"></p>
    </div>
    <div class="card"><h3>2. Restaurer sans écraser</h3>
      <p class="sb-help">Choisis une sauvegarde chiffrée, saisis sa phrase secrète et consulte le bilan avant confirmation. Par sécurité, seules les données <b>absentes</b> de cet appareil seront ajoutées ; les données existantes seront conservées.</p>
      <label for="sb-file">Fichier de sauvegarde MyTEAM</label>
      <input id="sb-file" type="file" accept=".myteam,application/json">
      <label for="sb-import-password">Phrase secrète du fichier</label>
      <input id="sb-import-password" type="password" autocomplete="off" placeholder="Phrase utilisée lors de l’export">
      <button id="sb-inspect" type="button">🔎 Examiner avant restauration</button>
      <div id="sb-preview" class="sb-preview hidden" role="status"></div>
      <button id="sb-restore" type="button" class="sb-only hidden">✓ Ajouter les données absentes</button>
      <button id="sb-reload" type="button" class="hidden">↻ Recharger MyTEAM</button>
      <p class="sb-status" id="sb-import-status" role="status"></p>
    </div>`;
  main.append(section);
  const tab=document.createElement('button');tab.type='button';tab.dataset.tab='secure-backup';tab.textContent='🔐 Sauvegarde';nav.append(tab);
  tab.onclick=()=>{nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section))};
  const $=id=>document.getElementById(id);
  const bytesToB64=bytes=>{
    let out='';for(let start=0;start<bytes.length;start+=32768)out+=String.fromCharCode(...bytes.subarray(start,start+32768));return btoa(out);
  };
  const b64ToBytes=s=>{if(typeof s!=='string'||s.length>maxFileSize*2||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error('Fichier invalide');return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
  async function keyFromPassword(password,salt){
    const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  function capture(){
    const entries=Object.create(null);
    for(let i=0;i<localStorage.length;i++){
      const name=localStorage.key(i);
      if(name&&KEY.test(name))entries[name]=localStorage.getItem(name)||'';
    }
    return {schema:'myteam-local-snapshot-v1',createdAt:new Date().toISOString(),entries};
  }
  async function encrypt(snapshot,password){
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await keyFromPassword(password,salt);
    const plain=new TextEncoder().encode(JSON.stringify(snapshot));
    if(plain.length>maxFileSize)throw Error('Les données dépassent la taille maximale de sauvegarde.');
    const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD},key,plain));
    return JSON.stringify({format:FORMAT,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,algorithm:'AES-256-GCM',salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(encrypted)});
  }
  async function decrypt(raw,password){
    const file=JSON.parse(raw);
    if(!file||file.format!==FORMAT||file.kdf!=='PBKDF2-SHA256'||file.algorithm!=='AES-256-GCM'||file.iterations!==ITERATIONS)throw Error('Format de sauvegarde non reconnu');
    const salt=b64ToBytes(file.salt),iv=b64ToBytes(file.iv),cipher=b64ToBytes(file.data);
    if(salt.length!==16||iv.length!==12||!cipher.length)throw Error('Sauvegarde incomplète');
    const key=await keyFromPassword(password,salt);
    let plain;
    try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:AAD},key,cipher)}
    catch{throw Error('Phrase secrète incorrecte ou sauvegarde altérée')}
    const snapshot=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain));
    if(snapshot?.schema!=='myteam-local-snapshot-v1'||!snapshot.entries||Array.isArray(snapshot.entries)||typeof snapshot.entries!=='object')throw Error('Contenu de sauvegarde invalide');
    const names=Object.keys(snapshot.entries);
    if(names.length>400||names.some(n=>!KEY.test(n)||n.length>150||typeof snapshot.entries[n]!=='string'))throw Error('Contenu non conforme aux données MyTEAM');
    return snapshot;
  }
  let pending=null;
  $('sb-download').onclick=async()=>{
    const btn=$('sb-download'),status=$('sb-export-status');
    const password=$('sb-password').value,confirmation=$('sb-password-confirm').value;
    if(password.length<12){status.textContent='Choisis au moins 12 caractères pour ta phrase secrète.';return}
    if(password!==confirmation){status.textContent='Les deux phrases secrètes sont différentes.';return}
    if(!crypto?.subtle){status.textContent='Le chiffrement n’est pas disponible dans ce navigateur.';return}
    btn.disabled=true;status.textContent='Création de la sauvegarde chiffrée…';
    try{
      const snapshot=capture(),raw=await encrypt(snapshot,password);
      const blob=new Blob([raw],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`MyTEAM_prive_${new Date().toISOString().slice(0,10)}.myteam`;document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      status.textContent=`Sauvegarde chiffrée préparée (${Object.keys(snapshot.entries).length} éléments). Conserve le fichier et ta phrase secrète séparément.`;
    }catch(err){status.textContent='Sauvegarde impossible : '+err.message}
    finally{$('sb-password').value='';$('sb-password-confirm').value='';btn.disabled=false}
  };
  $('sb-file').onchange=()=>{pending=null;$('sb-preview').classList.add('hidden');$('sb-restore').classList.add('hidden');$('sb-import-status').textContent=''};
  $('sb-inspect').onclick=async()=>{
    const file=$('sb-file').files?.[0],password=$('sb-import-password').value,status=$('sb-import-status');
    pending=null;$('sb-restore').classList.add('hidden');$('sb-preview').classList.add('hidden');
    if(!file||!password){status.textContent='Sélectionne le fichier et sa phrase secrète.';return}
    if(file.size>maxFileSize){status.textContent='Fichier trop volumineux (maximum 8 Mo).';return}
    $('sb-inspect').disabled=true;status.textContent='Vérification et déchiffrement local…';
    try{
      const snapshot=await decrypt(await file.text(),password);
      const names=Object.keys(snapshot.entries),missing=names.filter(n=>localStorage.getItem(n)===null),existing=names.filter(n=>localStorage.getItem(n)!==null);
      pending={entries:snapshot.entries,missing};
      const preview=$('sb-preview');
      preview.textContent=`Sauvegarde du ${new Date(snapshot.createdAt).toLocaleString('fr-FR')} : ${names.length} éléments, ${missing.length} absents à ajouter, ${existing.length} déjà présents (ils resteront intacts).`;
      preview.classList.remove('hidden');
      $('sb-restore').classList.toggle('hidden',missing.length===0);
      status.textContent=missing.length?'Aucune donnée existante ne sera écrasée. Vérifie le bilan avant de confirmer.':'Aucune donnée absente à ajouter. Tes données actuelles sont inchangées.';
    }catch(err){status.textContent='Lecture impossible : '+err.message}
    finally{$('sb-import-password').value='';$('sb-inspect').disabled=false}
  };
  $('sb-restore').onclick=()=>{
    if(!pending)return;
    const missing=pending.missing.filter(n=>localStorage.getItem(n)===null);
    if(!confirm(`Ajouter ${missing.length} éléments absents ? Les données existantes ne seront pas modifiées.`))return;
    const written=[];
    try{
      for(const name of missing){localStorage.setItem(name,pending.entries[name]);written.push(name)}
      $('sb-import-status').textContent=`${written.length} éléments ajoutés. Recharge MyTEAM pour afficher ces données.`;
      $('sb-reload').classList.remove('hidden');
    }catch{
      for(const name of written)localStorage.removeItem(name);
      $('sb-import-status').textContent='Espace insuffisant : restauration annulée, éléments nouvellement ajoutés retirés.';
    }finally{pending=null;$('sb-restore').classList.add('hidden')}
  };
  $('sb-reload').onclick=()=>location.reload();
  window.MyTeamSecureBackup={capture,encrypt,decrypt};
})();
