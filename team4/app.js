const root=document.querySelector('#grid'),status=document.querySelector('#status');
let shifts=[];try{shifts=JSON.parse(localStorage.getItem('myteam_shifts')||'[]')}catch{}
const today=new Date(),month=new Date(today.getFullYear(),today.getMonth(),1);
function render(){
 document.querySelector('#month').textContent=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(month);
 root.innerHTML='';for(const n of ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']){let e=document.createElement('div');e.className='weekday'+(['Sam','Dim'].includes(n)?' weekend':'');e.textContent=n;root.append(e)}
 const offset=(month.getDay()+6)%7,days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 for(let i=0;i<offset;i++)root.append(document.createElement('div'));
 for(let d=1;d<=days;d++){
  const date=month.getFullYear()+'-'+String(month.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const rows=shifts.filter(x=>x.date===date),e=document.createElement('div'),col=(offset+d-1)%7;
  e.className='day'+(col>=5?' we':'');
  if(rows.length)e.classList.add(rows[0].type||'morning');
  const number=document.createElement('b');number.textContent=d;e.append(number);
  const summary=document.createElement('span');summary.textContent=rows.length?rows.map(x=>x.start).join(' / '):'Repos';e.append(summary);
  e.onclick=()=>alert(rows.length?rows.map(x=>[x.start,x.end,x.post||''].join(' – ')).join('\n'):'Repos');
  root.append(e);
 }
}
render();
document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('main section').forEach(s=>s.classList.toggle('hidden',s.id!==btn.dataset.tab))});
document.querySelector('#import').onclick=()=>document.querySelector('#file').click();
document.querySelector('#file').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data)||!data.every(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&/^\d\d:\d\d$/.test(x.start)))throw Error('Format invalide');shifts=data;localStorage.setItem('myteam_shifts',JSON.stringify(shifts));render();if(window.MyTeamNotifyPlanningChanged)window.MyTeamNotifyPlanningChanged();status.textContent='Planning importé localement'}catch(err){alert('Import impossible : '+err.message)}};
document.querySelector('#clear').onclick=()=>{if(confirm('Effacer le planning local ?')){shifts=[];localStorage.removeItem('myteam_shifts');render();if(window.MyTeamNotifyPlanningChanged)window.MyTeamNotifyPlanningChanged()}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
let y=0;document.addEventListener('touchstart',e=>{if(scrollY===0)y=e.touches[0].clientY},{passive:true});
document.addEventListener('touchend',async e=>{if(y&&scrollY===0&&e.changedTouches[0].clientY-y>110){y=0;status.textContent='Recherche de mise à jour…';if(navigator.serviceWorker?.getRegistration){const r=await navigator.serviceWorker.getRegistration();if(r)await r.update()}location.reload()}y=0},{passive:true});

const voiceStart=document.querySelector('#voice-start'),voiceRequest=document.querySelector('#voice-request'),voiceStatus=document.querySelector('#voice-status'),voiceCopy=document.querySelector('#voice-copy');
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SpeechRecognition){
 const recognition=new SpeechRecognition();recognition.lang='fr-FR';recognition.interimResults=false;recognition.continuous=false;
 recognition.onresult=e=>{const heard=Array.from(e.results).map(r=>r[0].transcript).join(' ');voiceRequest.value=[voiceRequest.value.trim(),heard].filter(Boolean).join(' ');voiceStatus.textContent='Dictée terminée. Vérifie le texte avant de le copier.'};
 recognition.onerror=e=>{voiceStatus.textContent='Dictée indisponible : '+e.error+'. Tu peux saisir ta demande au clavier.'};
 recognition.onend=()=>{voiceStart.disabled=false;voiceStart.textContent='🎙️ Dicter'};
 voiceStart.onclick=()=>{try{recognition.start();voiceStart.disabled=true;voiceStart.textContent='Écoute…';voiceStatus.textContent='Parle maintenant.'}catch{voiceStatus.textContent='Impossible de démarrer le micro. Réessaie ou utilise le clavier.'}};
}else{voiceStart.disabled=true;voiceStatus.textContent='Reconnaissance vocale non disponible dans ce navigateur. Utilise le micro du clavier ou écris ta demande.'}
voiceCopy.onclick=async()=>{const value=voiceRequest.value.trim();if(!value){voiceStatus.textContent='Dicte ou écris une demande avant de copier.';return}try{await navigator.clipboard.writeText(value);voiceStatus.textContent='Demande copiée. Colle-la dans ChatGPT pour demander la modification.'}catch{voiceRequest.focus();voiceRequest.select();voiceStatus.textContent='Sélectionne et copie le texte, puis colle-le dans ChatGPT.'}};

const prestationNote=document.querySelector('#prestation-note'),prestationStatus=document.querySelector('#prestation-status');
if(prestationNote){prestationNote.value=localStorage.getItem('myteam_prestation_notes')||'';document.querySelector('#prestation-save').onclick=()=>{localStorage.setItem('myteam_prestation_notes',prestationNote.value);prestationStatus.textContent='Notes enregistrées uniquement sur cet appareil.'};}

for(const kind of ['planning','prestation']){
 const input=document.getElementById(kind+'-pdf'),message=document.getElementById(kind+'-pdf-status');
 if(input)input.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return;if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){message.textContent='Choisis un fichier PDF.';return}message.textContent='PDF sélectionné : '+file.name+'. Lecture automatique non encore disponible ; aucune donnée importée ni envoyée.';});
}

const prestationPhoto=document.querySelector('#prestation-photo'),prestationPhotoStatus=document.querySelector('#prestation-photo-status');
if(prestationPhoto)prestationPhoto.addEventListener('change',()=>{const file=prestationPhoto.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){prestationPhotoStatus.textContent='Sélectionne une photo.';return}prestationPhotoStatus.textContent='Photo sélectionnée : '+file.name+'. La reconnaissance et le contrôle automatique restent à développer. Aucune photo envoyée.';});

const leaveKey='myteam_leave_v1',leaveMsg=document.querySelector('#leave-message'),leaveList=document.querySelector('#leave-list');
let leaves=[];try{const parsed=JSON.parse(localStorage.getItem(leaveKey)||'[]');if(Array.isArray(parsed))leaves=parsed}catch{}
function leaveDays(a,b){const out=[];let d=new Date(a+'T12:00:00'),end=new Date(b+'T12:00:00');for(let n=0;d<=end&&n<370;n++,d.setDate(d.getDate()+1))out.push([d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'));return out}
function renderLeaves(){leaveList.replaceChildren();const counts=new Map();for(const l of leaves){for(const day of leaveDays(l.from,l.to)){if(!counts.has(day))counts.set(day,new Set());counts.get(day).add(l.agent.toLocaleLowerCase('fr'))}}const excess=[...counts].filter(([day,agents])=>agents.size>4).sort((a,b)=>a[0].localeCompare(b[0]));const alert=document.querySelector('#leave-alert');if(excess.length){const peak=Math.max(...excess.map(x=>x[1].size));alert.textContent='🔴 ALERTE : '+peak+' agents simultanément en congé (limite recommandée : 4). Dates : '+excess.map(([day,agents])=>day+' ('+agents.size+')').join(', ');alert.style.background='#7f1d1d';alert.style.color='#fff';alert.style.border='3px solid #ff7777'}else{alert.textContent='Aucun dépassement du seuil de 4 agents.';alert.style.background='transparent';alert.style.color='inherit';alert.style.border='1px solid #777'}for(const [i,l] of leaves.entries()){const p=document.createElement('p');p.textContent=l.agent+' : '+l.from+' au '+l.to+' ';const b=document.createElement('button');b.type='button';b.textContent='Supprimer';b.onclick=()=>{leaves.splice(i,1);localStorage.setItem(leaveKey,JSON.stringify(leaves));renderLeaves()};p.append(b);leaveList.append(p)}}
document.querySelector('#leave-add').onclick=()=>{const agent=document.querySelector('#leave-agent').value.trim(),from=document.querySelector('#leave-from').value,to=document.querySelector('#leave-to').value;if(!agent||!from||!to||to<from){leaveMsg.textContent='Renseigne un agent et une période valide.';return}const days=leaveDays(from,to);if(!days.length||days.length>366){leaveMsg.textContent='Période limitée à 366 jours.';return}if(leaves.some(l=>l.agent.toLocaleLowerCase('fr')===agent.toLocaleLowerCase('fr')&&l.from<=to&&l.to>=from)){leaveMsg.textContent='Une demande existe déjà pour cet agent sur cette période.';return}leaves.push({agent,from,to});localStorage.setItem(leaveKey,JSON.stringify(leaves));renderLeaves();leaveMsg.textContent='Demande enregistrée localement, même en cas de dépassement. Vérifier l’alerte rouge et les contraintes opérationnelles avant accord.'};
renderLeaves();

const agentKey='myteam_agent_profiles_v1',agentSelect=document.querySelector('#agent-select'),agentDetail=document.querySelector('#agent-detail');
let agentProfiles={};try{const data=JSON.parse(localStorage.getItem(agentKey)||'{}');if(data&&typeof data==='object'&&!Array.isArray(data))agentProfiles=data}catch{}
const agentFields={workerNumber:'agent-worker-number',notes:'agent-notes',instructions:'agent-instructions-date',rx:'agent-rx-date',reminders:'agent-reminders',reminderNotes:'agent-reminder-notes',sickLog:'agent-sick-log',lateLog:'agent-late-log',rxLog:'agent-rx-log'};
function showAgent(){const key=agentSelect.value,p=agentProfiles[key];agentDetail.classList.toggle('hidden',!p);if(!p)return;document.querySelector('#agent-title').textContent=key;document.querySelector('#agent-qual-rx').checked=p.rxCertified===true;document.querySelector('#agent-qual-piste').checked=p.pistePermit===true;document.querySelector('#agent-qual-summary').textContent=(p.gender==='F'?'Femme':p.gender==='M'?'Homme':'Genre non renseigné')+' • '+(p.rxCertified?'RX ✓':'RX non indiqué')+' • '+(p.pistePermit?'Permis piste ✓':'Permis non indiqué');for(const [field,id] of Object.entries(agentFields))document.getElementById(id).value=p[field]??'';document.querySelector('#agent-status').textContent=''}
function renderAgents(selected){agentSelect.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Sélectionner un agent';agentSelect.append(empty);for(const key of Object.keys(agentProfiles).sort((a,b)=>a.localeCompare(b,'fr'))){const o=document.createElement('option');o.value=key;o.textContent=key;agentSelect.append(o)}agentSelect.value=selected&&agentProfiles[selected]?selected:'';showAgent()}
agentSelect.addEventListener('change',showAgent);
document.querySelector('#agent-add').onclick=()=>{const name=document.querySelector('#agent-name').value.trim();if(!name||name.length>100){alert('Saisis un identifiant ou un nom valide.');return}if(!agentProfiles[name])agentProfiles[name]={};try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles));renderAgents(name);document.querySelector('#agent-name').value=''}catch{alert('Enregistrement local impossible.')}};
document.querySelector('#agent-save').onclick=()=>{const name=agentSelect.value;if(!name)return;const p={...agentProfiles[name]};for(const [field,id] of Object.entries(agentFields))p[field]=document.getElementById(id).value.trim();const count=Number(p.reminders||0);if(!Number.isInteger(count)||count<0||count>999){document.querySelector('#agent-status').textContent='Nombre de rappels invalide.';return}p.reminders=count;p.rxCertified=document.querySelector('#agent-qual-rx').checked;p.pistePermit=document.querySelector('#agent-qual-piste').checked;p.gender=agentProfiles[name]?.gender||'';p.team=agentProfiles[name]?.team||4;agentProfiles[name]=p;try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles));document.querySelector('#agent-status').textContent='Fiche enregistrée sur cet appareil uniquement.'}catch{document.querySelector('#agent-status').textContent='Enregistrement impossible.'}};
renderAgents();

const workerImport=document.querySelector('#agent-worker-import');
workerImport?.addEventListener('change',async event=>{
  const status=document.querySelector('#agent-worker-import-status');
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(file.size>100000)throw Error('Fichier trop volumineux');
    const data=JSON.parse(await file.text());
    if(data.schema!=='myteam-worker-numbers-v1'||!Array.isArray(data.agents)||data.agents.length<1||data.agents.length>200)throw Error('Format de matricules non reconnu');
    const normal=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
    const names=new Map();
    for(const name of Object.keys(agentProfiles)){
      const key=normal(name);
      if(names.has(key))names.set(key,null);
      else names.set(key,name);
    }
    const deletedRaw=JSON.parse(localStorage.getItem('myteam_deleted_agents_v1')||'[]');
    const deleted=new Set((Array.isArray(deletedRaw)?deletedRaw:[]).map(normal));
    const seen=new Set(),updated={};
    let missing=0;
    for(const item of data.agents){
      if(!item||typeof item.name!=='string'||!item.name.trim()||typeof item.workerNumber!=='string'||!/^\d{1,20}$/.test(item.workerNumber.trim()))throw Error('Nom ou matricule invalide');
      const key=normal(item.name);
      if(seen.has(key))throw Error('Agent présent deux fois dans le fichier');
      seen.add(key);
      const name=names.get(key);
      if(!name||deleted.has(key)){missing++;continue}
      updated[name]={...agentProfiles[name],workerNumber:item.workerNumber.trim()};
    }
    const count=Object.keys(updated).length;
    if(!count)throw Error('Aucun agent actif correspondant. Aucune donnée modifiée.');
    localStorage.setItem(agentKey,JSON.stringify({...agentProfiles,...updated}));
    Object.assign(agentProfiles,updated);
    renderAgents(agentSelect.value);
    try{window.renderMyTeamAgentList?.()}catch{}
    status.textContent=count+' matricule(s) intégré(s) aux fiches existantes'+(missing?' ; '+missing+' agent(s) absent(s) ou retiré(s) ignoré(s)':'')+'. Les autres informations sont conservées.';
  }catch(error){
    status.textContent='Import impossible : '+error.message;
  }finally{
    event.target.value='';
  }
});

document.querySelector('#agent-import').addEventListener('change',async e=>{
 const el=document.querySelector('#agent-import-status'),file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>200000)throw Error('Fichier trop volumineux');
  const data=JSON.parse(await file.text());
  if(data.schema!=='myteam-agents-v1'||!Array.isArray(data.agents)||!data.agents.length||data.agents.length>150)throw Error('Format de liste non reconnu');
  const names=new Set();
  for(const a of data.agents){
   if(typeof a.name!=='string'||!a.name.trim()||a.name.length>100||names.has(a.name.trim())||!['F','M'].includes(a.gender)||typeof a.rx!=='boolean'||typeof a.piste!=='boolean')throw Error('Ligne agent invalide ou en double');
   names.add(a.name.trim());
  }
  const updated={...agentProfiles};
  for(const a of data.agents){const key=a.name.trim();updated[key]={...(updated[key]||{}),gender:a.gender,team:4,rxCertified:a.rx,pistePermit:a.piste};}
  localStorage.setItem(agentKey,JSON.stringify(updated));agentProfiles=updated;renderAgents();
  el.textContent=data.agents.length+' agents importés localement. Les notes existantes ont été conservées.';
 }catch(err){el.textContent='Import impossible : '+err.message}
 e.target.value='';
});
