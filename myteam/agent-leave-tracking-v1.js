/* MyTEAM : demandes de conges par fiche agent (suivi prive, sans action MyGesper). */
(()=>{
 'use strict';
 if(document.getElementById('mt-agent-leaves'))return;
 const select=document.getElementById('agent-select');
 const details=document.getElementById('agent-detail');
 const summary=document.getElementById('agent-qual-summary');
 if(!select||!details||!summary)return;
 const KEY='myteam_agent_leave_requests_v1';
 const $=id=>document.getElementById(id);
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const formatDate=value=> /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?value.split('-').reverse().join('/'): '—';
 const read=()=>{try{const r=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(r)?r.filter(x=>x&&typeof x==='object'&&typeof x.id==='string'&&typeof x.agent==='string'):[]}catch{return []}};
 const save=r=>{try{localStorage.setItem(KEY,JSON.stringify(r));return true}catch{return false}};
 const cdeLabels={todo:'À faire',sent:'Envoyée au chef'};
 const chefLabels={pending:'En attente',approved:'Validée',rejected:'Refusée'};
 const filingLabels={no:'Non déposée',yes:'Déposée'};
 const gesperLabels={none:'Non déposée',pending:'En attente',approved:'Accordée',rejected:'Refusée'};
 const normalize=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('fr');
 const css=document.createElement('style');css.id='mt-agent-leave-style';
 css.textContent=[
 '#mt-agent-leaves{margin:14px 0 16px;padding:15px;background:#20334c;border:1px solid #536d87;border-radius:15px}',
 '#mt-agent-leaves h3{margin:0 0 5px;font-size:18px}',
 '#mt-agent-leaves .mtal-help{font-size:12px;color:#c9d7e6;line-height:1.5;margin:7px 0 12px}',
 '#mt-agent-leaves .mtal-action{background:#d56f31;min-height:46px}',
 '#mt-agent-leaves .mtal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
 '#mt-agent-leaves label{display:grid;gap:5px;margin:10px 0;font-size:12px;font-weight:750;color:#e8eef6}',
 '#mt-agent-leaves input,#mt-agent-leaves select,#mt-agent-leaves textarea{width:100%;min-height:45px;background:#111d2d;color:#fff;border:1px solid #7187a3;border-radius:10px;padding:9px;font:inherit}',
 '#mt-agent-leaves textarea{min-height:72px;resize:vertical}',
 '#mt-agent-leaves .mtal-form{margin:12px 0;padding:12px;background:#17283b;border-radius:12px;border:1px solid #4d6884}',
 '#mt-agent-leaves .mtal-actions{display:flex;gap:8px;flex-wrap:wrap}',
 '#mt-agent-leaves .mtal-actions button{min-height:43px}',
 '#mt-agent-leaves .mtal-item{padding:12px 0;border-top:1px solid #465d79}',
 '#mt-agent-leaves .mtal-item:first-child{border-top:0}',
 '#mt-agent-leaves .mtal-item strong{display:block;font-size:14px}',
 '#mt-agent-leaves .mtal-steps{display:grid;gap:5px;font-size:12px;line-height:1.45;margin:8px 0}',
 '#mt-agent-leaves .mtal-step{background:#243e59;border-left:3px solid #8397ae;border-radius:7px;padding:7px 9px}',
 '#mt-agent-leaves .mtal-step.done{border-color:#51c196}',
 '#mt-agent-leaves .mtal-step.warn{border-color:#eeaf5b}',
 '#mt-agent-leaves .mtal-step.no{border-color:#e58484}',
 '#mt-agent-leaves .mtal-item p{margin:8px 0;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}',
 '#mt-agent-leaves .mtal-count{color:#cbd9e9;font-size:12px}',
 '#mt-agent-leaves .mtal-warning{color:#f8ca98;font-size:12px;line-height:1.5}',
 '#mt-agent-leaves .mtal-smsg{font-size:12px;line-height:1.4;min-height:18px;color:#bdeccb}',
 '#mt-agent-leaves .mtal-muted{color:#b8c9d9;font-size:12px}',
 '#mt-leave-photo .mtal-overview{margin-top:18px;border-top:1px solid #637d98;padding-top:13px}',
 '#mt-leave-photo .mtal-overview h3{margin:0 0 5px}',
 '#mt-leave-photo .mtal-overview-row{padding:9px 0;border-top:1px solid #445e79;font-size:12px;line-height:1.45}',
 '#mt-leave-photo .mtal-overview-row strong{display:block}',
 '@media(max-width:650px){#mt-agent-leaves .mtal-grid{grid-template-columns:1fr}#mt-agent-leaves{padding:13px}}'
 ].join('');
 document.head.append(css);
 const panel=document.createElement('div');
 panel.id='mt-agent-leaves';
 panel.innerHTML=[
 '<h3>🏖️ Demandes de congés</h3><p id="mtal-agent-name" class="mtal-help"></p>',
 '<p id="mtal-stats" class="mtal-count"></p>',
 '<button id="mtal-new" class="mtal-action" type="button">+ Nouvelle demande</button>',
 '<div id="mtal-editor" class="mtal-form" hidden><h4 id="mtal-editor-title">Nouvelle demande de congés</h4>',
 '<form id="mtal-form">',
 '<div class="mtal-grid"><label>Du (inclus)<input type="date" name="from" required></label>',
 '<label>Au (inclus)<input type="date" name="to" required></label></div>',
 '<div class="mtal-grid"><label>Demande au chef d’équipe<select name="cdeRequest">',
 '<option value="todo">À faire</option><option value="sent">Envoyée</option></select></label>',
 '<label>Date d’envoi au chef<input type="date" name="cdeSentAt"></label></div>',
 '<div class="mtal-grid"><label>Décision du chef d’équipe<select name="chefStatus">',
 '<option value="pending">En attente</option><option value="approved">Validée</option><option value="rejected">Refusée</option></select></label>',
 '<label>Date de décision du chef<input type="date" name="chefStatusAt"></label></div>',
 '<div class="mtal-grid"><label>Dépôt sur MyGesper<select name="gesperFiled">',
 '<option value="no">Non déposée</option><option value="yes">Déposée</option></select></label>',
 '<label>Date de dépôt MyGesper<input type="date" name="gesperFiledAt"></label></div>',
 '<div class="mtal-grid"><label>Statut MyGesper<select name="gesperStatus">',
 '<option value="none">Non déposée</option><option value="pending">En attente</option><option value="approved">Accordée</option><option value="rejected">Refusée</option></select></label>',
 '<label>Date de décision MyGesper<input type="date" name="gesperStatusAt"></label></div>',
 '<label>Note de suivi (facultative, sans motif personnel)<textarea name="note" maxlength="700" placeholder="Ex. mail transmis, réponse reçue, précision administrative"></textarea></label>',
 '<p id="mtal-consistency" class="mtal-warning"></p>',
 '<div class="mtal-actions"><button type="submit" class="mtal-action" id="mtal-save">Enregistrer</button>',
 '<button type="button" id="mtal-cancel">Annuler</button></div></form></div>',
 '<p class="mtal-smsg" id="mtal-message" role="status"></p>',
 '<div id="mtal-history"></div>',
 '<p class="mtal-help">Ces statuts sont saisis manuellement et ne constituent pas une confirmation de MyGesper. Aucun congé ni planning officiel n’est modifié par ce formulaire.</p>'
 ].join('');
 summary.after(panel);

 let editing='',boundAgent='',dirty=false;
 const editor=$('mtal-editor'),form=$('mtal-form'),history=$('mtal-history'),message=$('mtal-message');
 const activeName=()=>select.value.trim();
 function safeAgent(){
   const name=activeName();
   return name && !details.classList.contains('hidden') ? name : '';
 }
 function resetEditor(){
   editing='';dirty=false;form.reset();editor.hidden=true;
   $('mtal-editor-title').textContent='Nouvelle demande de congés';
   $('mtal-save').textContent='Enregistrer';
   $('mtal-consistency').textContent='';
 }
 function openEditor(item){
   if(!safeAgent())return;
   if(item){
     editing=item.id;
     ['from','to','cdeRequest','cdeSentAt','chefStatus','chefStatusAt','gesperFiled','gesperFiledAt','gesperStatus','gesperStatusAt','note'].forEach(k=>{
       const input=form.elements.namedItem(k);
       if(input)input.value=String(item[k]??'');
     });
     $('mtal-editor-title').textContent='Modifier la demande';
     $('mtal-save').textContent='Enregistrer les modifications';
   }else{
     resetEditor();editor.hidden=false;
     editing='';
   }
   editor.hidden=false;dirty=false;checkConsistency();
   editor.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 function checkConsistency(){
   const values=Object.fromEntries(new FormData(form));
   const warnings=[];
   if(values.cdeRequest==='todo' && values.chefStatus!=='pending')warnings.push('Une décision du chef est indiquée alors que la demande n’est pas marquée comme envoyée.');
   if(values.gesperFiled==='no' && values.gesperStatus!=='none')warnings.push('Le statut MyGesper nécessite de marquer la demande comme déposée.');
   if(values.gesperFiled==='yes' && values.gesperStatus==='none')warnings.push('Indique le statut MyGesper après dépôt (en attente, accordée ou refusée).');
   $('mtal-consistency').textContent=warnings.join(' ');
   return warnings;
 }
 form.addEventListener('input',()=>{dirty=true;checkConsistency()});
 form.addEventListener('change',()=>{dirty=true;checkConsistency()});
 function step(text,condition){
   const line=document.createElement('div');line.className='mtal-step '+(condition||'');
   line.textContent=text;return line;
 }
 function drawHistory(){
   const agent=safeAgent();boundAgent=agent;
   panel.hidden=!agent;
   if(!agent)return;
   $('mtal-agent-name').textContent='Fiche de '+agent+' · demandes, validations et réponses MyGesper';
   const rows=read().filter(r=>normalize(r.agent)===normalize(agent))
     .sort((a,b)=>String(b.from||'').localeCompare(String(a.from||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
   const accepted=rows.filter(r=>r.gesperStatus==='approved').length;
   const pending=rows.filter(r=>r.gesperStatus!=='approved'&&r.gesperStatus!=='rejected').length;
   $('mtal-stats').textContent=rows.length+' demande(s) · '+accepted+' accordée(s) MyGesper · '+pending+' à suivre';
   history.replaceChildren();
   if(!rows.length){
     const p=document.createElement('p');p.className='mtal-muted';
     p.textContent='Aucune demande enregistrée pour cet agent.';history.append(p);
   }
   rows.forEach(r=>{
     const container=document.createElement('article');container.className='mtal-item';
     const heading=document.createElement('strong');
     heading.textContent=formatDate(r.from)+' → '+formatDate(r.to);
     container.append(heading);
     const steps=document.createElement('div');steps.className='mtal-steps';
     steps.append(
       step('Demande au chef : '+(cdeLabels[r.cdeRequest]||'À faire')+(r.cdeSentAt?' · '+formatDate(r.cdeSentAt):''),r.cdeRequest==='sent'?'done':'warn'),
       step('Chef d’équipe : '+(chefLabels[r.chefStatus]||'En attente')+(r.chefStatusAt?' · '+formatDate(r.chefStatusAt):''),r.chefStatus==='approved'?'done':r.chefStatus==='rejected'?'no':'warn'),
       step('MyGesper : '+(filingLabels[r.gesperFiled]||'Non déposée')+(r.gesperFiledAt?' · '+formatDate(r.gesperFiledAt):''),r.gesperFiled==='yes'?'done':'warn'),
       step('Statut MyGesper : '+(gesperLabels[r.gesperStatus]||'Non déposée')+(r.gesperStatusAt?' · '+formatDate(r.gesperStatusAt):''),r.gesperStatus==='approved'?'done':r.gesperStatus==='rejected'?'no':'warn')
     );
     container.append(steps);
     if(r.note){const note=document.createElement('p');note.textContent=r.note;container.append(note);}
     const footer=document.createElement('div');footer.className='mtal-actions';
     const edit=document.createElement('button');edit.type='button';edit.textContent='Modifier';
     edit.onclick=()=>openEditor(r);
     const del=document.createElement('button');del.type='button';del.textContent='Supprimer';
     del.onclick=()=>{
       if(!confirm('Supprimer cette demande enregistrée pour '+agent+' ?'))return;
       if(!save(read().filter(item=>item.id!==r.id))){message.textContent='Impossible de supprimer : stockage indisponible.';return;}
       if(editing===r.id)resetEditor();message.textContent='Demande supprimée localement.';
       drawHistory();renderLeaveOverview();
     };
     footer.append(edit,del);container.append(footer);history.append(container);
   });
 }
 function changeAgent(){
   const agent=safeAgent();
   if(agent===boundAgent)return;
   if(!editor.hidden&&dirty){
     if(!confirm('Tu as une demande de congés non enregistrée. Changer d’agent sans sauvegarder ?')){
       if(boundAgent){
         select.value=boundAgent;
         // Conserver la fiche sélectionnée à l’écran.
         if(typeof showAgent==='function')showAgent();
       }
       return;
     }
   }
   resetEditor();drawHistory();
 }
 select.addEventListener('change',()=>{resetEditor();drawHistory()});
 const title=$('agent-title');
 if(title) new MutationObserver(()=>{if(safeAgent()!==boundAgent){resetEditor();drawHistory()}}).observe(title,{childList:true,characterData:true,subtree:true});
 $('mtal-new').onclick=()=>openEditor(null);
 $('mtal-cancel').onclick=resetEditor;
 form.onsubmit=e=>{
   e.preventDefault();const agent=safeAgent();if(!agent){message.textContent='Sélectionne un agent.';return;}
   const fields=Object.fromEntries(new FormData(form));
   const from=String(fields.from||''),to=String(fields.to||'');
   const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00').toISOString().slice(0,10)===v;
   if(!validDate(from)||!validDate(to)||to<from){
     message.textContent='Vérifie les dates de début et de fin.';return;
   }
   const duration=Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
   if(duration>370){message.textContent='Une demande ne peut pas dépasser 371 jours.';return;}
   if(checkConsistency().length){
     message.textContent='Corrige les incohérences de statut indiquées sous le formulaire.';return;
   }
   const list=read();
   const old=editing?list.find(r=>r.id===editing):null;
   if(editing&&(!old||normalize(old.agent)!==normalize(agent))){
     message.textContent='Cette demande n’est plus accessible pour cet agent.';return;
   }
   const key=editing||((crypto.randomUUID&&crypto.randomUUID())||('leave-'+Date.now()+'-'+Math.random().toString(36).slice(2,9)));
   const now=new Date().toISOString();
   const item={
     ...fields,
     agent,from,to,id:key,
     cdeRequest:['todo','sent'].includes(fields.cdeRequest)?fields.cdeRequest:'todo',
     chefStatus:['pending','approved','rejected'].includes(fields.chefStatus)?fields.chefStatus:'pending',
     gesperFiled:['no','yes'].includes(fields.gesperFiled)?fields.gesperFiled:'no',
     gesperStatus:['none','pending','approved','rejected'].includes(fields.gesperStatus)?fields.gesperStatus:'none',
     note:String(fields.note||'').trim().slice(0,700),
     createdAt:old?.createdAt||now,updatedAt:now
   };
   if(item.cdeRequest==='todo')item.cdeSentAt='';
   if(item.chefStatus==='pending')item.chefStatusAt='';
   if(item.gesperFiled==='no')item.gesperFiledAt='';
   if(item.gesperStatus==='none'||item.gesperStatus==='pending')item.gesperStatusAt='';
   const newRows=old?list.map(r=>r.id===key?item:r):[...list,item];
   if(!save(newRows)){message.textContent='Enregistrement impossible : stockage indisponible.';return;}
   resetEditor();drawHistory();renderLeaveOverview();
   message.textContent='Demande enregistrée pour '+agent+'. Aucun envoi à MyGesper effectué.';
 };
 function renderLeaveOverview(){
   const box=$('mtal-leave-overview');if(!box)return;
   const rows=read().sort((a,b)=>String(a.from||'').localeCompare(String(b.from||'')));
   const now=today();const relevant=rows.filter(r=>r.to>=now||r.gesperStatus==='none'||r.gesperStatus==='pending').slice(0,40);
   const pending=rows.filter(r=>r.gesperStatus==='pending').length;
   const approved=rows.filter(r=>r.gesperStatus==='approved').length;
   const refused=rows.filter(r=>r.gesperStatus==='rejected').length;
   const recap=$('mtal-overview-summary');
   if(recap)recap.textContent=rows.length+' demandes enregistrées · '+pending+' en attente MyGesper · '+approved+' accordées · '+refused+' refusées.';
   box.replaceChildren();
   if(!rows.length){const p=document.createElement('p');p.className='mtal-muted';p.textContent='Aucune demande suivie depuis les fiches agents.';box.append(p);return;}
   relevant.forEach(r=>{
     const div=document.createElement('div');div.className='mtal-overview-row';
     const bold=document.createElement('strong');bold.textContent=r.agent+' · '+formatDate(r.from)+' au '+formatDate(r.to);
     const status=document.createElement('span');
     status.textContent='Chef : '+(chefLabels[r.chefStatus]||'En attente')+' · MyGesper : '+(gesperLabels[r.gesperStatus]||'Non déposée');
     div.append(bold,status);box.append(div);
   });
   if(rows.length>relevant.length){const extra=document.createElement('p');extra.className='mtal-muted';extra.textContent='Liste limitée aux 40 demandes à suivre. Ouvre la fiche d’un agent pour son historique complet.';box.append(extra);}
 }
 // En complément du tableau photo, afficher la synthèse sans modifier ses pièces jointes.
 function mountOverview(){
   const photo=$('mt-leave-photo');if(!photo||$('mtal-overview-card'))return;
   const block=document.createElement('div');block.id='mtal-overview-card';block.className='mtal-overview';
   const heading=document.createElement('h3');heading.textContent='Suivi des demandes par agent';
   const caption=document.createElement('p');caption.id='mtal-overview-summary';caption.className='mtal-muted';
   const host=document.createElement('div');host.id='mtal-leave-overview';
   block.append(heading,caption,host);photo.append(block);
   renderLeaveOverview();
 }
 // Le tableau de synthèse n’est pas une approbation opérationnelle.
 const leaveTab=document.querySelector('nav.tabs [data-tab="leave"]');
 leaveTab?.addEventListener('click',renderLeaveOverview);
 select.addEventListener('change',()=>{message.textContent='';});
 mountOverview();drawHistory();
 window.MyTeamAgentLeaveRefresh=()=>{drawHistory();renderLeaveOverview()};
})();
