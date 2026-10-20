/* MyTEAM — Entretiens de proximité.
   Outil de préparation et de suivi personnel, sans transmission ni notation automatique. */
(()=>{
  'use strict';
  if(document.getElementById('interviews'))return;
  const nav=document.querySelector('nav.tabs'),main=document.querySelector('main');
  if(!nav||!main)return;
  const KEY='myteam_interviews_v1',AGENTS_KEY='myteam_agent_profiles_v1';
  const $=id=>document.getElementById(id);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const short=x=>x?new Date(x+'T12:00:00').toLocaleDateString('fr-FR'):'—';
  const topics=[
    ['vigilance','Vigilance et rigueur','La sûreté passe avant tout : attention continue aux caméras, aux alarmes, aux personnes et à l’environnement du poste.'],
    ['telephone','Téléphone et oreillette','Le téléphone n’est pas interdit par principe dans le cadre évoqué, mais il ne doit jamais prendre le pas sur le service ni sur les consignes applicables. Dès qu’une personne entre dans le poste ou que le service demande de l’attention, on interrompt son utilisation, on pose le téléphone et on retire immédiatement l’oreillette.'],
    ['erreur','Dire les erreurs sans les cacher','Si une erreur ou une anomalie survient, prévenir immédiatement le chef d’équipe, expliquer les faits avec honnêteté et contribuer à la corriger. Le signalement rapide est une preuve de professionnalisme.'],
    ['doute','Poser une question dès qu’il y a un doute','Si une procédure n’est pas claire, appeler aussitôt. Mieux vaut demander une confirmation que faire semblant de savoir ou improviser.'],
    ['releve','Relèves et transmissions','Arriver prêt à prendre son poste, transmettre les informations utiles et laisser au collègue une situation claire.'],
    ['consignes','Consignes et traçabilité','Respecter les procédures en vigueur, signaler les incidents et consigner ce qui doit l’être sans approximation.'],
    ['equipe','Respect et entraide','Rester courtois, aider ses collègues, accueillir les remarques sans agressivité et traiter chacun avec équité.'],
    ['initiative','Initiative responsable','Proposer des améliorations et prévenir les difficultés, tout en respectant les limites de son rôle et les validations nécessaires.']
  ];
  const blank=(agent='')=>({id:'',agent,date:day(),status:'preparation',agentPositive:'',agentNeeds:'',agentTraining:'',agentIdeas:'',feedbackHelpful:'',feedbackImprove:'',managerPositive:'',managerFocus:'',topics:[],agentCommitment:'',managerCommitment:'',workingAgreement:'',followUp:'',createdAt:'',updatedAt:''});
  const fields=['date','status','agentPositive','agentNeeds','agentTraining','agentIdeas','feedbackHelpful','feedbackImprove','managerPositive','managerFocus','agentCommitment','managerCommitment','workingAgreement','followUp'];
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(r=>r&&typeof r.id==='string'&&typeof r.agent==='string'):[]}catch{return []}};
  let records=read(),agent='',currentId='',baseline='',currentPanel='agent';

  const style=document.createElement('style');style.textContent=`
    #interviews{max-width:1000px;margin:auto}#interviews .iv-hero{background:linear-gradient(145deg,#283e59,#1c2a3d);border:1px solid #506783}
    #interviews .iv-kicker{font-size:11px;font-weight:900;letter-spacing:.09em;color:#ffcc9d}
    #interviews h2{margin:7px 0}#interviews .iv-intro{line-height:1.55;color:#d2deea}
    #interviews .iv-trust{padding:16px;background:#193b36;border:1px solid #467c70;border-radius:14px;line-height:1.58}
    #interviews .iv-trust strong{color:#a3ffda}#interviews .iv-trust p{margin:8px 0 0}
    #interviews .iv-privacy{background:#403524;border-left:4px solid #ecaf59;padding:12px;border-radius:9px;font-size:12px;line-height:1.5;color:#ffe2b9}
    #interviews .iv-row{display:flex;gap:10px;align-items:end;flex-wrap:wrap}
    #interviews .iv-row>*{flex:1 1 170px}#interviews label.iv-label{display:grid;gap:7px;margin:12px 0;font-weight:750;font-size:13px}
    #interviews input:not([type=checkbox]),#interviews select,#interviews textarea{width:100%;min-height:46px;background:#111928;border:1px solid #688099;border-radius:10px;padding:11px;color:#fff;font:inherit;font-weight:400}
    #interviews textarea{min-height:88px;resize:vertical;line-height:1.5}#interviews .iv-sub{color:#aebed1;font-size:12px;line-height:1.48}
    #interviews .iv-panels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0 18px}
    #interviews .iv-panels button{min-width:0;background:#2e4058;border:1px solid #566a84;padding:13px 5px;font-size:13px}
    #interviews .iv-panels button[aria-selected=true]{background:#e76b24;border-color:#f3a675}
    #interviews .iv-topic{background:#26364b;border:1px solid #445875;border-radius:12px;padding:13px;margin:9px 0}
    #interviews .iv-topic>strong{display:block;font-size:15px;margin-bottom:6px}#interviews .iv-topic>p{margin:0 0 11px;color:#d8e2ed;line-height:1.5;font-size:13px}
    #interviews .iv-topic>label{display:flex;align-items:center;gap:9px;font-size:12px;color:#ffceaa;font-weight:750}
    #interviews input[type=checkbox]{width:19px;height:19px;accent-color:#e76b24}
    #interviews .iv-actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
    #interviews .iv-actions button{flex:1 1 155px}#interviews .iv-primary{background:#1b8060}#interviews .iv-secondary{background:#395170}
    #interviews .iv-record{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#25364a;padding:12px;border:1px solid #415775;border-radius:12px;margin:9px 0}
    #interviews .iv-record>div{min-width:0}#interviews .iv-record strong{display:block}#interviews .iv-record small{display:block;color:#b8c8d9;margin-top:4px}
    #interviews .iv-record button{background:#345272;flex-shrink:0}
    #interviews .iv-msg{min-height:22px;font-size:13px;color:#bcebd8;line-height:1.5}#interviews .iv-error{color:#ffada8}
    #interviews .iv-empty{color:#b8c8d9;padding:14px;background:#253449;border-radius:11px}
    #interviews .iv-separator{border:0;border-top:1px solid #3e526a;margin:19px 0}
    #interviews .iv-dictation-wrap{display:flex;align-items:flex-start;gap:8px}
    #interviews .iv-dictation-wrap textarea{flex:1 1 auto;min-width:0;width:100%}
    #interviews .iv-mic{flex:0 0 49px;min-height:49px;border:1px solid #7691aa;border-radius:11px;background:#37516d;padding:9px 4px;font-size:22px}
    #interviews .iv-mic[aria-pressed=true]{background:#a82b37;border-color:#ff97a0;animation:iv-pulse 1.4s infinite}
    #interviews .iv-mic:focus-visible{outline:3px solid #ffbb80;outline-offset:2px}
    @keyframes iv-pulse{50%{box-shadow:0 0 0 4px #f871712a}}
    #interviews .iv-hidden{display:none!important}
    @media(min-width:781px){#interviews .iv-fields-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
    @media(max-width:480px){#interviews .iv-panels button{font-size:11px;padding:12px 4px}#interviews .iv-actions button{flex-basis:100%}}
  `;document.head.append(style);

  const tab=document.createElement('button');tab.type='button';tab.dataset.tab='interviews';tab.textContent='🤝 Entretiens';
  const neighbour=nav.querySelector('[data-tab="team"]');
  if(neighbour)neighbour.insertAdjacentElement('afterend',tab);else nav.append(tab);
  const section=document.createElement('section');section.id='interviews';section.className='hidden';
  section.innerHTML=`
    <div class="card iv-hero"><span class="iv-kicker">TEAM 4 · MANAGEMENT DE PROXIMITÉ</span><h2>🤝 Entretiens individuels</h2>
      <p class="iv-intro">Un échange entre professionnels pour écouter, clarifier les attentes et avancer ensemble. Aucun classement, aucune note ni sanction automatique.</p>
      <p id="iv-progress" class="iv-sub"></p>
      <div class="iv-trust"><strong>Ma parole de chef d’équipe</strong>
        <p>« Tu peux me parler en confiance. Si tu me confies une difficulté personnelle, de santé ou une tension avec quelqu’un, je n’ai pas à l’ébruiter ni à en parler aux autres agents. Je prends mon devoir de discrétion et de confidentialité très à cœur. Je n’inscrirai pas ici les détails de ta vie privée. Si tu souhaites mon aide, nous verrons ensemble ce qu’il est utile de transmettre et à qui. Si une obligation ou un risque pour la sûreté ou la sécurité impose de signaler certains faits, je te l’expliquerai autant que possible et je ne partagerai que le nécessaire. »</p></div>
    </div>
    <div class="card"><div class="iv-row"><label class="iv-label">Agent de la Team 4<select id="iv-agent"><option value="">Sélectionner un agent…</option></select></label>
      <button type="button" id="iv-new" class="iv-secondary">+ Nouvel entretien</button></div>
      <p id="iv-agent-hint" class="iv-sub">Choisis un agent pour préparer son entretien.</p></div>
    <div id="iv-form" class="card iv-hidden">
      <div class="iv-row"><label class="iv-label">Date de l’entretien<input id="iv-date" type="date"></label>
        <label class="iv-label">Étape<select id="iv-status"><option value="preparation">En préparation</option><option value="realise">Entretien réalisé</option><option value="suivi">Suivi prévu</option></select></label></div>
      <div class="iv-panels" role="tablist" aria-label="Volets de l’entretien">
        <button type="button" data-iv-panel="agent" role="tab" aria-selected="true">💬 Ce que veut l’agent</button>
        <button type="button" data-iv-panel="manager" role="tab" aria-selected="false">🎯 Ce que j’attends</button>
        <button type="button" data-iv-panel="suite" role="tab" aria-selected="false">🤝 Engagements & suivi</button></div>
      <div id="iv-panel-agent" role="tabpanel">
        <h3>La parole de l’agent</h3><p class="iv-sub">Écouter sans interrompre. Reformuler pour vérifier qu’on a compris, sans imposer de réponse.</p>
        <label class="iv-label">Qu’est-ce qui fonctionne bien dans ton travail ?<textarea id="iv-agentPositive" maxlength="3000" placeholder="Ses réussites, ce dont il est fier, ce qu’il apprécie…"></textarea></label>
        <label class="iv-label">Qu’aimerais-tu voir améliorer ?<textarea id="iv-agentNeeds" maxlength="3000" placeholder="Organisation, moyens, communication, conditions de travail… sans informations médicales"></textarea></label>
        <label class="iv-label">De quoi aurais-tu besoin pour progresser ?<textarea id="iv-agentTraining" maxlength="3000" placeholder="Formation, accompagnement, clarification des consignes…"></textarea></label>
        <label class="iv-label">Quelles propositions aimerais-tu faire ?<textarea id="iv-agentIdeas" maxlength="3000" placeholder="Une idée concrète, un changement simple, un retour d’expérience…"></textarea></label>
        <hr class="iv-separator">
        <h3>Et moi, qu’est-ce que je peux améliorer ?</h3>
        <p class="iv-sub">Inviter l’agent à donner son avis sur la manière de manager, sans exiger une réponse immédiate ni se justifier à chaud. Écouter, demander un exemple si besoin, puis chercher une solution ensemble.</p>
        <div class="iv-trust"><strong>Comment ouvrir le sujet</strong>
          <p>« Je t’ai expliqué ce que j’attends de toi, mais ça fonctionne dans les deux sens. Dans ma manière de communiquer, de décider ou d’organiser le travail, il y a peut-être des choses que je pourrais mieux faire. Tu peux me le dire franchement et respectueusement : je ne t’en tiendrai pas rigueur. Je ne te promets pas qu’on sera toujours d’accord, mais je m’engage à t’écouter. Et si tu préfères y réfléchir, on pourra en reparler plus tard. »</p></div>
        <label class="iv-label">Qu’est-ce que je fais qui t’aide dans ton travail ?<textarea id="iv-feedbackHelpful" maxlength="3000" placeholder="Une façon de communiquer ou de travailler à conserver…"></textarea></label>
        <label class="iv-label">Qu’est-ce que je pourrais changer pour mieux travailler avec toi ?<textarea id="iv-feedbackImprove" maxlength="3000" placeholder="Un retour précis sur mon organisation, mes décisions ou ma communication, sans jugement personnel…"></textarea></label>
        <p class="iv-sub">Questions de relance possibles : « As-tu un exemple concret ? » · « Qu’est-ce qui serait plus simple pour toi ? » · « Comment pourrions-nous procéder autrement ? »</p>
      </div>
      <div id="iv-panel-manager" class="iv-hidden" role="tabpanel">
        <h3>Mes attentes, expliquées avec respect</h3><p class="iv-sub">Les cases indiquent uniquement que le point a été abordé ensemble. Elles ne jugent ni la personne ni son niveau de performance. Les procédures officielles prévalent toujours.</p>
        <div id="iv-topics">${topics.map(([id,title,body])=>`<div class="iv-topic"><strong>${esc(title)}</strong><p>${esc(body)}</p><label><input type="checkbox" data-iv-topic="${id}"> Point abordé ensemble</label></div>`).join('')}</div>
        <label class="iv-label">Points forts à reconnaître chez cet agent<textarea id="iv-managerPositive" maxlength="3000" placeholder="Exemples concrets de professionnalisme, d’efforts ou d’entraide…"></textarea></label>
        <label class="iv-label">Attentes particulières à clarifier<textarea id="iv-managerFocus" maxlength="3000" placeholder="Un objectif précis, observable, réaliste et expliqué à l’agent…"></textarea></label>
      </div>
      <div id="iv-panel-suite" class="iv-hidden" role="tabpanel">
        <h3>Ce que nous décidons ensemble</h3><p class="iv-sub">Ne rien supposer accepté : reformuler les décisions et laisser l’agent apporter des corrections.</p>
        <label class="iv-label">Engagement ou prochaine étape de l’agent<textarea id="iv-agentCommitment" maxlength="3000" placeholder="Une action concrète proposée ou discutée…"></textarea></label>
        <label class="iv-label">Mon engagement en tant que chef d’équipe<textarea id="iv-managerCommitment" maxlength="3000" placeholder="Une aide, une réponse à apporter, une remontée à faire, un retour promis…"></textarea></label>
        <label class="iv-label">Notre manière de fonctionner, convenue ensemble<textarea id="iv-workingAgreement" maxlength="3000" placeholder="Ex. clarifier les consignes dès la relève ; me faire un retour au calme ; je réponds à toute question sans reproche…"></textarea></label>
        <label class="iv-label">Date envisagée pour refaire le point<input id="iv-followUp" type="date"></label>
        <div class="iv-trust"><strong>Terminer l’entretien</strong><p>« Merci de m’avoir parlé franchement. Mon objectif n’est pas de te piéger, mais que tu saches ce que j’attends et que tu puisses aussi me dire ce dont tu as besoin. Si quelque chose ne va pas, viens m’en parler : on cherchera une solution. »</p></div>
      </div>
      <div class="iv-actions"><button type="button" id="iv-save" class="iv-primary">✓ Enregistrer la fiche</button><button type="button" id="iv-copy" class="iv-secondary">Copier la synthèse</button><button type="button" id="iv-delete">Supprimer cette fiche</button></div>
      <p id="iv-status-message" class="iv-msg" role="status" aria-live="polite"></p>
      <p class="iv-privacy">🎙️ Dictée vocale facultative : demande l’accord de l’agent et appuie sur le micro à côté de la réponse. Le navigateur peut transmettre la voix à son service de transcription. MyTEAM ne conserve aucun fichier audio. Vérifie les mots avant d’enregistrer et n’utilise pas ce micro pour des confidences médicales ou privées.</p>
      <p class="iv-privacy">🔒 Notes personnelles enregistrées uniquement dans le navigateur de cet appareil, sans chiffrement ni synchronisation. Aucune donnée n’est envoyée à G4S ou à un agent. Ne saisis pas de confidences sensibles, de données de santé ni de détails de sûreté confidentiels. Les notes ne constituent pas un compte rendu officiel ou disciplinaire.</p>
    </div>
    <div id="iv-history-card" class="card iv-hidden"><h3>Historique des entretiens de cet agent</h3><div id="iv-history"></div></div>`;
  main.append(section);

  function allAgents(){
    let data={},deleted=[];
    try{data=JSON.parse(localStorage.getItem(AGENTS_KEY)||'{}')||{}}catch{}
    try{deleted=JSON.parse(localStorage.getItem('myteam_deleted_agents_v1')||'[]')||[]}catch{}
    const excluded=new Set(Array.isArray(deleted)?deleted:[]);
    const all=Object.entries(data).filter(([name,p])=>name&&p&&Number(p.team)===4&&!excluded.has(name));
    const current=all.filter(([,p])=>p.rosterSeedCurrentV2===true||p.rosterSeed20260721===true||p.manualAdded===true||p.prestationAdded===true||p.teamManual===true);
    return (current.length?current:all).map(([name])=>name).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
  }
  function renderAgents(){
    const names=allAgents(),sel=$('iv-agent'),keep=agent;
    sel.innerHTML='<option value="">Sélectionner un agent…</option>'+names.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
    if(keep&&!names.includes(keep))sel.append(new Option(keep,keep));
    sel.value=keep;
    const done=new Set(records.filter(r=>r.status==='realise'||r.status==='suivi').map(r=>r.agent));
    $('iv-progress').textContent=`${names.filter(n=>done.has(n)).length} agent(s) avec un entretien réalisé ou en suivi sur ${names.length} dans la liste actuelle.`;
    $('iv-agent-hint').textContent=agent?`Agent sélectionné : ${agent} · les entretiens sont personnels à ce téléphone.`:'Choisis un agent pour commencer. La liste reprend la Team 4.';
  }
  function values(){
    const obj={id:currentId,agent,topics:[...section.querySelectorAll('[data-iv-topic]:checked')].map(el=>el.dataset.ivTopic)};
    fields.forEach(f=>obj[f]=$('iv-'+f).value.trim().slice(0,f==='date'||f==='followUp'?10:f==='status'?24:3000));
    return obj;
  }
  function isDirty(){return !!agent&&JSON.stringify(values())!==baseline}
  function confirmAway(){return !isDirty()||confirm('Cette fiche contient des changements non enregistrés. Les abandonner ?')}
  function panel(name){if(currentPanel!==name)stopDictation();currentPanel=name;section.querySelectorAll('[data-iv-panel]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ivPanel===name)));
    ['agent','manager','suite'].forEach(id=>$('iv-panel-'+id).classList.toggle('iv-hidden',id!==name))}
  function fill(record){
    currentId=record.id||'';fields.forEach(f=>$('iv-'+f).value=record[f]||'');
    section.querySelectorAll('[data-iv-topic]').forEach(el=>el.checked=Array.isArray(record.topics)&&record.topics.includes(el.dataset.ivTopic));
    $('iv-form').classList.remove('iv-hidden');$('iv-history-card').classList.remove('iv-hidden');
    $('iv-delete').disabled=!currentId;$('iv-delete').classList.toggle('iv-hidden',!currentId);
    $('iv-status-message').textContent='';panel('agent');baseline=JSON.stringify(values());
  }
  function renderHistory(){
    const list=records.filter(r=>r.agent===agent).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
    $('iv-history').innerHTML=list.length?list.map(r=>`<div class="iv-record"><div><strong>${esc(short(r.date))}</strong><small>${r.status==='realise'?'Entretien réalisé':r.status==='suivi'?'Suivi prévu':'En préparation'}${r.followUp?' · Prochain point : '+esc(short(r.followUp)):''}</small></div><button type="button" data-iv-open="${esc(r.id)}">Ouvrir</button></div>`).join(''):'<p class="iv-empty">Aucun entretien enregistré pour cet agent.</p>';
  }
  function openAgent(name){
    if(!confirmAway()){ $('iv-agent').value=agent;return }
    stopDictation();consentedAgent='';
    agent=name;currentId='';renderAgents();
    if(!name){$('iv-form').classList.add('iv-hidden');$('iv-history-card').classList.add('iv-hidden');baseline='';return}
    const latest=records.filter(r=>r.agent===name).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
    fill(latest||blank(name));renderHistory();
  }
  function newRecord(){if(!agent)return;if(!confirmAway())return;stopDictation();fill(blank(agent));$('iv-status-message').textContent='Nouvel entretien non enregistré.'}
  function save(){
    stopDictation();
    if(!agent)return;
    const next=values();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(next.date)||Number.isNaN(new Date(next.date+'T12:00:00').getTime())){message('Indique une date valide.',true);return}
    if(next.followUp&&(!/^\d{4}-\d{2}-\d{2}$/.test(next.followUp)||Number.isNaN(new Date(next.followUp+'T12:00:00').getTime()))){message('Date de suivi invalide.',true);return}
    const now=new Date().toISOString();
    if(!next.id)next.id=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const previous=records.find(r=>r.id===next.id);
    next.createdAt=previous?.createdAt||now;next.updatedAt=now;
    const updated=records.filter(r=>r.id!==next.id).concat(next);
    try{localStorage.setItem(KEY,JSON.stringify(updated));records=updated;currentId=next.id;baseline=JSON.stringify(values());$('iv-delete').disabled=false;$('iv-delete').classList.remove('iv-hidden');renderHistory();renderAgents();message('✓ Entretien enregistré sur ce téléphone. Aucune transmission effectuée.')}
    catch{message('Enregistrement impossible. Vérifie l’espace disponible.',true)}
  }
  function message(text,error=false){const el=$('iv-status-message');el.textContent=text;el.classList.toggle('iv-error',error)}

  // SpeechRecognition transcrit dans les zones de texte : aucun MediaRecorder,
  // aucun Blob audio, aucun envoi explicite effectué par MyTEAM.
  const SpeechEngine=window.SpeechRecognition||window.webkitSpeechRecognition;
  let dictation=null,consentedAgent='';
  function stopDictation(){
    if(!dictation)return;
    const run=dictation;
    try{run.recognition.stop()}catch{}
    if(dictation===run)finishDictation(run);
  }
  function finishDictation(run){
    if(dictation!==run)return;
    run.input.readOnly=false;
    run.button.setAttribute('aria-pressed','false');
    run.button.textContent='🎙️';
    run.button.title='Dicter cette réponse';
    dictation=null;
  }
  function startDictation(input,button){
    if(dictation){const same=dictation.input===input;stopDictation();message(same?'Dictée arrêtée. Relis le texte avant de sauvegarder.':'Dictée précédente arrêtée. Appuie de nouveau pour ce champ.');return}
    if(!agent)return message('Sélectionne un agent avant de dicter.',true);
    if(!SpeechEngine)return message('La transcription vocale intégrée n’est pas disponible dans ce navigateur. Utilise le micro du clavier Samsung ou Gboard.',true);
    if(consentedAgent!==agent){
      const accepted=confirm('L’agent a-t-il donné son accord pour une dictée vocale ?\n\nLe navigateur peut envoyer la voix à un service de reconnaissance en ligne. MyTEAM ne conserve pas l’audio. Ne dicte pas de confidences personnelles ou médicales.');
      if(!accepted){message('Micro non activé. Tu peux saisir la réponse au clavier.');return}
      consentedAgent=agent;
    }
    const recognition=new SpeechEngine();
    recognition.lang='fr-FR';recognition.interimResults=true;recognition.continuous=false;
    const base=input.value.trim(),run={recognition,input,button,base,finalText:'',interimText:'',error:''};
    dictation=run;input.readOnly=true;button.textContent='⏹️';button.setAttribute('aria-pressed','true');button.title='Arrêter la dictée';
    const compose=(final,interim)=>[base,final,interim].filter(Boolean).join(' ').trim().slice(0,input.maxLength||3000);
    recognition.onresult=event=>{
      if(dictation!==run)return;
      let final='',interim='';
      for(let i=0;i<event.results.length;i++){
        const transcript=String(event.results[i][0]?.transcript||'').trim();
        if(event.results[i].isFinal)final+=transcript+' ';else interim+=transcript+' ';
      }
      run.finalText=final.trim();run.interimText=interim.trim();
      input.value=compose(run.finalText,run.interimText);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    };
    recognition.onerror=event=>{
      run.error=event.error||'unknown';
      const messages={'not-allowed':'Microphone refusé. Autorise-le dans Chrome si tu souhaites dicter.',
        'audio-capture':'Aucun microphone disponible.','network':'Réseau indisponible pour la transcription.',
        'no-speech':'Aucune parole reconnue. Tu peux réessayer.',
        'service-not-allowed':'Service de transcription non autorisé.',
        'aborted':'Dictée interrompue.'};
      message(messages[run.error]||'La transcription a rencontré un problème. Vérifie le texte.',true);
    };
    recognition.onend=()=>{
      if(dictation!==run)return;
      // Conserver aussi le texte provisoire s’il n’y a pas eu de résultat final :
      // l’utilisateur le vérifie et le corrige avant de l’enregistrer.
      input.value=compose(run.finalText,run.finalText?'':run.interimText);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      finishDictation(run);
      if(!run.error)message('Dictée terminée. Relis et corrige la transcription, puis appuie sur « Enregistrer la fiche ».');
    };
    try{recognition.start();message('🎙️ Écoute en cours… Appuie sur ⏹️ pour arrêter.')}
    catch(error){finishDictation(run);message('Impossible de démarrer le micro. Vérifie les autorisations de Chrome.',true)}
  }
  section.querySelectorAll('textarea').forEach(input=>{
    const wrapper=document.createElement('span');wrapper.className='iv-dictation-wrap';
    input.parentNode.insertBefore(wrapper,input);wrapper.append(input);
    const button=document.createElement('button');button.type='button';button.className='iv-mic';
    button.textContent='🎙️';button.title='Dicter cette réponse';button.setAttribute('aria-pressed','false');
    const question=input.closest('label')?.textContent.trim()||'cette réponse';
    button.setAttribute('aria-label','Démarrer ou arrêter la dictée : '+question);
    wrapper.append(button);button.onclick=()=>startDictation(input,button);
  });
  function copySummary(){
    stopDictation();
    if(!agent)return;const v=values();
    const items=topics.filter(([id])=>v.topics.includes(id));
    const lines=[`MyTEAM — Entretien du ${short(v.date)} — ${agent}`,'',
      'PAROLE DE L’AGENT',`Points positifs : ${v.agentPositive||'—'}`,`Souhaits d’amélioration : ${v.agentNeeds||'—'}`,
      `Besoins d’accompagnement : ${v.agentTraining||'—'}`,`Propositions : ${v.agentIdeas||'—'}`,
      `Mon management — ce qui aide : ${v.feedbackHelpful||'—'}`,`Mon management — ce que je peux améliorer : ${v.feedbackImprove||'—'}`,'',
      'ATTENTES DU CHEF D’ÉQUIPE','Priorité à la sûreté, à la vigilance et au respect des consignes.',
      ...items.map(([,title])=>'Point abordé : '+title),`Forces reconnues : ${v.managerPositive||'—'}`,`Attentes individuelles : ${v.managerFocus||'—'}`,'',
      'ENGAGEMENTS & SUIVI',`Agent : ${v.agentCommitment||'—'}`,`Chef d’équipe : ${v.managerCommitment||'—'}`,`Fonctionnement convenu : ${v.workingAgreement||'—'}`,`Prochain point : ${short(v.followUp)}`,
      '',"Document de travail personnel — pas de compte rendu officiel ni d'engagement validé par une signature."];
    const content=lines.join('\n');
    if(!navigator.clipboard?.writeText){message('Copie automatique indisponible sur cet appareil.');return}
    navigator.clipboard.writeText(content).then(()=>message('Synthèse copiée. Vérifie son contenu avant tout partage.')).catch(()=>message('Copie impossible : autorisation refusée.',true));
  }
  function deleteRecord(){
    stopDictation();
    if(!currentId)return;
    if(!confirm(`Supprimer définitivement cet entretien du ${short($('iv-date').value)} pour ${agent} sur cet appareil ?`))return;
    const updated=records.filter(r=>r.id!==currentId);
    try{localStorage.setItem(KEY,JSON.stringify(updated));records=updated;fill(blank(agent));renderHistory();renderAgents();message('Fiche supprimée de ce téléphone.')}
    catch{message('Suppression impossible.',true)}
  }
  tab.addEventListener('click',()=>{
    nav.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));
    main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));
    records=read();renderAgents();if(agent)renderHistory();
  });
  $('iv-agent').addEventListener('change',e=>openAgent(e.target.value));
  $('iv-new').onclick=()=>newRecord();$('iv-save').onclick=save;$('iv-copy').onclick=copySummary;$('iv-delete').onclick=deleteRecord;
  section.querySelectorAll('[data-iv-panel]').forEach(b=>b.onclick=()=>panel(b.dataset.ivPanel));
  $('iv-history').onclick=e=>{const b=e.target.closest('[data-iv-open]');if(!b)return;if(!confirmAway())return;stopDictation();
    const r=records.find(v=>v.id===b.dataset.ivOpen&&v.agent===agent);if(!r)return;fill(r);$('iv-form').scrollIntoView({behavior:'smooth',block:'start'})};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDictation()});
  nav.addEventListener('click',event=>{const b=event.target.closest('[data-tab]');if(b&&b!==tab)stopDictation()});
  window.addEventListener('storage',e=>{if(e.key===AGENTS_KEY||e.key===KEY){if(e.key===KEY)records=read();renderAgents();if(agent)renderHistory()}});
  const detail=$('agent-detail');
  if(detail&&!$('iv-agent-shortcut')){
    const shortcut=document.createElement('button');shortcut.id='iv-agent-shortcut';shortcut.type='button';shortcut.textContent='🤝 Préparer un entretien avec cet agent';
    shortcut.style.cssText='display:block;margin:12px 0;background:#1b8060;width:100%';
    const title=$('agent-title');if(title)title.insertAdjacentElement('afterend',shortcut);else detail.prepend(shortcut);
    shortcut.onclick=()=>{const name=$('agent-select')?.value;if(!name)return;tab.click();openAgent(name);section.scrollIntoView({behavior:'smooth',block:'start'})};
  }
  window.MyTeamInterviews={openAgent(name){tab.click();openAgent(name)}};
  renderAgents();
})();
