/* MyTEAM — Consignes & Manager (v1).
   L'analyse par IA est déclenchée volontairement par partage vers ChatGPT.
   Aucune consigne n'est validée, partagée ou appliquée automatiquement. */
(function(){
  'use strict';

  const KEY='myteam_consigne_drafts_v1';
  const nav=document.querySelector('.tabs');
  const main=document.querySelector('main');
  if(!nav||!main||document.getElementById('consignes'))return;

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const get=id=>document.getElementById(id);
  function getDocs(){
    try{
      const parsed=JSON.parse(localStorage.getItem(KEY)||'[]');
      return Array.isArray(parsed)?parsed.filter(item=>item&&typeof item.id==='string'):[];
    }catch(e){return [];}
  }
  let docs=getDocs();
  let selected=null;
  let currentId=null;

  const tabs=[['consignes','📘 Consignes'],['manager','🤝 Manager']];
  tabs.forEach(([id,label])=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.tab=id;button.textContent=label;
    nav.append(button);
    button.addEventListener('click',()=>{
      nav.querySelectorAll('[data-tab]').forEach(tab=>tab.classList.toggle('active',tab.dataset.tab===id));
      main.querySelectorAll('section').forEach(section=>section.classList.toggle('hidden',section.id!==id));
      if(id==='consignes')renderDocs();
    });
  });

  const instructions=document.createElement('section');
  instructions.id='consignes';instructions.className='hidden';
  instructions.innerHTML=`
    <div class="card">
      <h2>📘 Consignes</h2>
      <p class="muted">Dépose une photo ou un PDF, puis demande son résumé à ChatGPT. Le résultat reste un <strong>brouillon</strong> jusqu’à ce que tu l'aies relu et validé.</p>
      <p class="mtmg-privacy">🔒 Les fichiers ne sont ni enregistrés sur ce site ni envoyés automatiquement. Le partage vers ChatGPT nécessite ton action ; vérifie les règles de confidentialité de ton employeur avant de transmettre un document.</p>
      <div class="mtmg-files">
        <label class="mtmg-file-button">📄 Choisir un PDF ou une photo<input id="mtmg-doc-file" type="file" accept="application/pdf,.pdf,image/*" hidden></label>
        <label class="mtmg-file-button">📷 Photographier<input id="mtmg-doc-camera" type="file" accept="image/*" capture="environment" hidden></label>
      </div>
      <p class="muted" id="mtmg-selected">Aucun document sélectionné.</p>
      <button type="button" id="mtmg-analyse" class="mtmg-blue" disabled>↗ Faire résumer dans ChatGPT</button>
      <p id="mtmg-share-status" class="muted" role="status">Tu pourras relire le résumé avant toute validation.</p>
      <a class="mtmg-chatlink" href="https://chatgpt.com/" target="_blank" rel="noopener">Ouvrir ChatGPT si le partage n’est pas proposé</a>
    </div>
    <div class="card">
      <h3>Résumé à examiner</h3>
      <p class="muted">Colle ici la synthèse de ChatGPT et corrige-la si nécessaire. Ne recopie pas de données personnelles ou de détails opérationnels confidentiels sans autorisation.</p>
      <label class="mtmg-label">Titre de la consigne<input id="mtmg-title" maxlength="180" placeholder="Ex. Procédure d'accueil du matin"></label>
      <label class="mtmg-label">Résumé proposé<textarea id="mtmg-summary" rows="9" maxlength="20000" placeholder="Objectif, règles, étapes, exceptions, date d’application, points à confirmer…"></textarea></label>
      <p id="mtmg-draft-state" class="muted">Nouvelle consigne — non validée</p>
      <div class="mtmg-actions">
        <button type="button" id="mtmg-new">Nouvelle</button>
        <button type="button" id="mtmg-paste">Coller la synthèse</button>
        <button type="button" id="mtmg-save-draft">Enregistrer le brouillon</button>
      </div>
      <label class="mtmg-approval"><input id="mtmg-approve-check" type="checkbox"> J’ai vérifié le document source, corrigé les éventuelles erreurs et je valide personnellement cette version.</label>
      <button type="button" id="mtmg-approve" class="mtmg-approve-btn">✓ Valider cette consigne sur mon appareil</button>
      <p id="mtmg-doc-status" role="status" class="muted">Aucune officialisation sans validation explicite. Une validation ici ne remplace pas les procédures internes de ton employeur.</p>
    </div>
    <div class="card"><h3>Mes consignes</h3><div id="mtmg-doc-list"></div>
      <p class="muted">Seuls les résumés que tu enregistres sont conservés localement sur cet appareil, sans chiffrement ni synchronisation. Ne conserve pas d’informations sensibles ici.</p>
    </div>`;
  main.append(instructions);

  const manager=document.createElement('section');
  manager.id='manager';manager.className='hidden';
  manager.innerHTML=`
    <div class="card">
      <h2>🤝 Manager — réfléchir avant d’agir</h2>
      <p class="muted">Un espace pour préparer une réaction juste, bienveillante et crédible face à un comportement d’agent. Ici, aucune évaluation ou mesure disciplinaire n’est déclenchée.</p>
      <p class="mtmg-privacy">🔒 Décris une situation sans nom, donnée de santé, information disciplinaire nominative ou détail confidentiel. Les questions ne sont pas enregistrées dans les fiches agents.</p>
      <label class="mtmg-label">Situation à analyser<textarea id="mtmg-situation" rows="6" maxlength="10000" placeholder="Ex. Un agent arrive régulièrement quelques minutes après l'heure prévue et évoque des contraintes de transport. Comment ouvrir le dialogue ?"></textarea></label>
      <div class="mtmg-actions">
        <button type="button" id="mtmg-local-guidance">Préparer mon entretien</button>
        <button type="button" id="mtmg-ask" class="mtmg-blue">↗ Demander à ChatGPT</button>
      </div>
      <p id="mtmg-manager-status" class="muted" role="status">Favoriser l’écoute, l'équité, des faits vérifiables et une réponse proportionnée.</p>
      <div id="mtmg-manager-preview" class="mtmg-preview hidden" aria-live="polite"></div>
    </div>
    <div class="card">
      <h3>Ma ligne de conduite</h3>
      <ul class="mtmg-principles">
        <li><strong>Écouter d’abord :</strong> demander le contexte et distinguer les faits des suppositions.</li>
        <li><strong>Appliquer le même cadre :</strong> situations comparables, critères comparables ; pas de favoritisme.</li>
        <li><strong>Reconnaître les efforts :</strong> valoriser volontariat, ponctualité et assiduité sans pénaliser les autres.</li>
        <li><strong>Agir proportionnellement :</strong> expliquer l’attendu, proposer un soutien, fixer un point de suivi avant d’envisager une escalade.</li>
        <li><strong>Rester professionnel :</strong> communication calme et factuelle ; consulter la hiérarchie/RH et les règles applicables avant toute mesure formelle.</li>
      </ul>
    </div>`;
  main.append(manager);

  const style=document.createElement('style');
  style.textContent=`
    .mtmg-privacy{font-size:12px;line-height:1.5;padding:11px 12px;border-radius:11px;
      background:rgba(251,191,36,.09);border:1px solid rgba(251,191,36,.25);color:#fcdba6}
    .mtmg-files,.mtmg-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
    .mtmg-file-button{display:inline-block;background:#27364c;color:#fff;padding:12px 14px;
      border-radius:12px;font-weight:700;cursor:pointer}
    .mtmg-label{display:grid;gap:7px;margin:14px 0;font-weight:750;font-size:13px}
    .mtmg-label input,.mtmg-label textarea{width:100%;background:#111928;color:white;
      border:1px solid #657791;border-radius:11px;padding:12px;font:inherit;font-weight:450}
    .mtmg-blue{background:#2766bf!important}.mtmg-approve-btn{width:100%;background:#1f7a4d!important}
    .mtmg-approval{display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.45;
      margin:16px 0;padding:12px;background:#24344b;border-radius:10px}
    .mtmg-approval input{flex-shrink:0;width:20px;height:20px}
    .mtmg-chatlink{display:inline-block;color:#9ac4ff;font-size:12px;margin-top:8px}
    .mtmg-doc-item{padding:12px;border:1px solid #46566c;border-radius:12px;
      margin:9px 0;background:#24344b;display:grid;gap:7px}
    .mtmg-doc-row{display:flex;align-items:center;justify-content:space-between;gap:9px}
    .mtmg-doc-item small{color:#aebacc;line-height:1.4}
    .mtmg-chip{font-size:11px;border-radius:99px;padding:5px 8px;background:#6b4d20;white-space:nowrap}
    .mtmg-chip.approved{background:#176140}.mtmg-doc-item button{justify-self:start}
    .mtmg-preview{margin:12px 0 0;padding:13px;background:#24344b;border-radius:12px;
      border:1px solid #4b6581;font-size:13px;line-height:1.55}
    .mtmg-preview p{margin:9px 0}.mtmg-principles{padding-left:20px;line-height:1.55}
    .mtmg-principles li{margin:9px 0}.mtmg-actions button{flex:1 1 140px}
  `;
  document.head.append(style);

  const fileInput=get('mtmg-doc-file'),cameraInput=get('mtmg-doc-camera');
  const titleInput=get('mtmg-title'),summaryInput=get('mtmg-summary');
  const approval=get('mtmg-approve-check');
  function status(message){get('mtmg-doc-status').textContent=message;}
  function chooseFile(file){
    if(!file)return;
    const pdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
    const photo=file.type.startsWith('image/');
    if(!pdf&&!photo){selected=null;get('mtmg-selected').textContent='Choisis un PDF ou une image.';return;}
    selected=file;
    get('mtmg-selected').textContent=`${pdf?'PDF':'Photo'} : ${file.name} (${(file.size/1024/1024).toFixed(1)} Mo) — non envoyé`;
    get('mtmg-analyse').disabled=false;
    get('mtmg-share-status').textContent='Prêt pour un partage volontaire vers ChatGPT.';
  }
  fileInput.onchange=()=>chooseFile(fileInput.files?.[0]);
  cameraInput.onchange=()=>chooseFile(cameraInput.files?.[0]);

  async function copyText(message){
    if(!navigator.clipboard?.writeText)return false;
    try{await navigator.clipboard.writeText(message);return true;}catch(e){return false;}
  }
  async function shareToChatGPT(text,file,statusElement){
    const data={title:'MyTEAM — analyse à valider',text};
    if(file)data.files=[file];
    try{
      if(navigator.share&&(!file||!navigator.canShare||navigator.canShare({files:[file]}))){
        await navigator.share(data);
        statusElement.textContent='Partage lancé. Choisis ChatGPT puis vérifie sa réponse. Aucune donnée enregistrée dans MyTEAM.';
        return;
      }
      if(await copyText(text)){
        statusElement.textContent=file
          ?'Demande copiée. Ouvre ChatGPT et joins toi-même le document ; rien n’a été envoyé.'
          :'Demande copiée. Ouvre ChatGPT et colle-la pour obtenir une analyse.';
      }else{
        statusElement.textContent='Le partage n’est pas disponible : ouvre ChatGPT et joins le document avec une demande de résumé à vérifier.';
      }
    }catch(err){
      statusElement.textContent=err?.name==='AbortError'
        ?'Partage annulé. Aucun document envoyé.'
        :'Le partage a échoué. Réessaie ou joins le document manuellement dans ChatGPT.';
    }
  }

  get('mtmg-analyse').onclick=()=>{
    if(!selected)return;
    const prompt=`Analyse le document joint pour MyTEAM. Prépare UNIQUEMENT un brouillon de résumé de consigne, structuré en : 1) objet et champ d’application ; 2) obligations et étapes ; 3) dates ou délais ; 4) exceptions ; 5) ambiguïtés et informations à vérifier. Reste fidèle au document, cite les pages si possible, n’invente pas de règles. Signale les passages illisibles. Ne modifie, n'enregistre et n'officialise rien dans MyTEAM : attends ma validation explicite. Évite de reproduire inutilement des données personnelles.`;
    shareToChatGPT(prompt,selected,get('mtmg-share-status'));
  };

  function formValues(){
    return {title:titleInput.value.trim(),summary:summaryInput.value.trim(),fileName:selected?.name||''};
  }
  function renderDocs(){
    const host=get('mtmg-doc-list');
    if(!docs.length){host.innerHTML='<p class="muted">Aucun brouillon ni consigne validée.</p>';return;}
    host.innerHTML=docs.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).map(doc=>`
      <div class="mtmg-doc-item"><div class="mtmg-doc-row"><strong>${esc(doc.title)}</strong>
        <span class="mtmg-chip ${doc.status==='approved'?'approved':''}">${doc.status==='approved'?'✓ Validée':'Brouillon'}</span></div>
        <small>${esc(doc.fileName||'Source non précisée')} • Version ${Number(doc.version)||1}
          ${doc.approvedAt?' • validée le '+new Date(doc.approvedAt).toLocaleDateString('fr-FR'):''}</small>
        <button type="button" data-mtmg-open="${esc(doc.id)}">Ouvrir / réviser</button></div>`).join('');
    host.querySelectorAll('[data-mtmg-open]').forEach(btn=>btn.onclick=()=>openDoc(btn.dataset.mtmgOpen));
  }
  function openDoc(id){
    const doc=docs.find(d=>d.id===id);if(!doc)return;
    currentId=id;selected=null;titleInput.value=doc.title||'';summaryInput.value=doc.summary||'';
    approval.checked=false;fileInput.value='';cameraInput.value='';get('mtmg-analyse').disabled=true;
    get('mtmg-selected').textContent=doc.fileName?`Source précédente : ${doc.fileName} (non conservée)`:'Aucune source conservée';
    get('mtmg-draft-state').textContent=doc.status==='approved'
      ?`Version ${doc.version||1} validée — toute modification enregistrée repassera en brouillon.`
      :`Version ${doc.version||1} en brouillon — validation nécessaire.`;
    status('Relis les informations avant toute nouvelle validation.');
    instructions.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function clearForm(){
    currentId=null;selected=null;titleInput.value='';summaryInput.value='';
    approval.checked=false;fileInput.value='';cameraInput.value='';get('mtmg-analyse').disabled=true;
    get('mtmg-selected').textContent='Aucun document sélectionné.';
    get('mtmg-draft-state').textContent='Nouvelle consigne — non validée';
    status('Nouveau brouillon. Aucune validation automatique.');
  }
  get('mtmg-new').onclick=clearForm;
  get('mtmg-paste').onclick=async()=>{
    if(!navigator.clipboard?.readText){status('Pour coller : maintiens le doigt dans le champ résumé, puis choisis « Coller ».');return;}
    try{
      const copied=(await navigator.clipboard.readText()).trim();
      if(!copied){status('Le presse-papiers est vide. Copie d’abord la synthèse depuis ChatGPT.');return;}
      summaryInput.value=copied.slice(0,20000);
      approval.checked=false;
      status('Synthèse collée en brouillon. Relis-la, corrige-la puis valide-la seulement si elle est exacte.');
    }catch(e){status('Accès au presse-papiers refusé. Fais un appui long dans le champ résumé pour coller.');}
  };

  function commit(approved){
    const values=formValues();
    if(!values.title||!values.summary){status('Renseigne un titre et un résumé avant d’enregistrer.');return;}
    if(approved&&!approval.checked){status('Coche d’abord ta confirmation de relecture et de validation.');return;}
    if(approved&&!confirm('Confirmer la validation personnelle de cette consigne ? Aucune publication ni transmission externe ne sera faite.'))return;
    let doc=docs.find(d=>d.id===currentId);
    const now=new Date().toISOString();
    if(!doc){
      doc={id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:now,version:1};
      docs.push(doc);currentId=doc.id;
    }else{
      const changed=doc.title!==values.title||doc.summary!==values.summary||
        (values.fileName&&doc.fileName!==values.fileName);
      if(!approved&&doc.status==='approved'&&!changed){
        status('Cette version est déjà validée et inchangée. Aucun nouveau brouillon nécessaire.');
        return;
      }
      if(changed)doc.version=(Number(doc.version)||1)+1;
    }
    doc.title=values.title;doc.summary=values.summary;
    if(values.fileName)doc.fileName=values.fileName;
    doc.status=approved?'approved':'draft';doc.updatedAt=now;
    doc.approvedAt=approved?now:null;
    try{localStorage.setItem(KEY,JSON.stringify(docs));}
    catch(e){status('Espace de stockage insuffisant : rien n’a pu être enregistré.');return;}
    approval.checked=false;
    get('mtmg-draft-state').textContent=approved?`Version ${doc.version} validée personnellement`:`Version ${doc.version} en brouillon`;
    status(approved?'✓ Version validée sur cet appareil. Aucune transmission ni officialisation externe.':'Brouillon enregistré localement — validation toujours requise.');
    renderDocs();
  }
  get('mtmg-save-draft').onclick=()=>commit(false);
  get('mtmg-approve').onclick=()=>commit(true);
  titleInput.addEventListener('input',()=>approval.checked=false);
  summaryInput.addEventListener('input',()=>approval.checked=false);
  renderDocs();

  const situation=get('mtmg-situation');
  const managerStatus=get('mtmg-manager-status');
  get('mtmg-local-guidance').onclick=()=>{
    if(!situation.value.trim()){managerStatus.textContent='Décris d’abord la situation, sans données personnelles.';return;}
    const preview=get('mtmg-manager-preview');
    preview.classList.remove('hidden');
    preview.innerHTML=`<strong>Trame pour un échange constructif</strong>
      <p>1. <b>Établir les faits</b> : qu’a-t-on observé, quand, et avec quelle certitude ?</p>
      <p>2. <b>Écouter</b> : quelles difficultés ou explications l’agent souhaite-t-il partager ?</p>
      <p>3. <b>Clarifier le cadre</b> : quel comportement est attendu, et est-il demandé équitablement à tous ?</p>
      <p>4. <b>Agir avec mesure</b> : soutien concret, objectif vérifiable, suivi convenu et reconnaissance des progrès.</p>
      <p><b>Formulation possible :</b> « J’aimerais comprendre ce qui s’est passé et avoir ton point de vue. Mon objectif est qu’on trouve une solution juste et praticable, en respectant le même cadre pour tout le monde. »</p>
      <p><small>Avant toute mesure formelle : consulter les règles internes, la hiérarchie/RH et le droit applicable.</small></p>`;
    managerStatus.textContent='Trame générique préparée localement ; aucune donnée transmise.';
  };
  get('mtmg-ask').onclick=()=>{
    const facts=situation.value.trim();
    if(!facts){managerStatus.textContent='Décris une situation anonymisée pour demander conseil.';return;}
    const prompt=`Agis comme conseiller de management pour un responsable d’équipe. Situation anonymisée : ${facts}\n\nAide-moi à réagir avec bienveillance, équité, écoute et proportionnalité, tout en restant un manager fiable et positif grâce à une communication honnête (sans manipulation ni favoritisme). Structure ta réponse : faits et incertitudes à vérifier ; points de vue à écouter ; 2 ou 3 réponses graduées non répressives ; exemple de formulation orale ; reconnaissance éventuelle des efforts ; conditions dans lesquelles solliciter RH/la hiérarchie. N'invente pas de règlement, ne conclus pas à une faute disciplinaire sans procédure et ne propose aucune action automatique dans MyTEAM. Vérifie les règles internes et le droit applicable avant des décisions formelles. Reste factuel et protège la confidentialité.`;
    shareToChatGPT(prompt,null,managerStatus);
  };
})();
