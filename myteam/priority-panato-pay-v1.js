/* MyTEAM — dossier de vérification prioritaire PANATO / paie.
 * Suivi privé, factuel, sans conclusion automatique ni envoi à la hiérarchie.
 * Rappel visible les 12 et 13 novembre 2026 et maintenu après échéance
 * tant que le dossier n'est pas clôturé manuellement.
 */
(()=>{
  'use strict';
  const bureau=document.getElementById('mt-bureau');
  const todayPanel=document.getElementById('today');
  if(!bureau||!todayPanel||document.getElementById('mt-panato-pay-case'))return;

  const KEY='myteam_panato_training_pay_case_v1';
  const FROM='2026-11-12',TO='2026-11-13';
  const base={
    id:'panato-training-extra-nov-2026',
    agent:'PANATO Joey',
    recordedOn:'2026-10-23',
    dueFrom:FROM,dueTo:TO,
    state:'awaiting',
    verificationDate:'',
    notes:'',
    reportedAt:'',
    events:[]
  };
  const states={
    awaiting:'En attente de la fiche de paie',
    checking:'Vérification en cours',
    discrepancy:'Écart à éclaircir ou constaté',
    compliant:'Aucune anomalie retenue après vérification',
    escalated:'Remontée effectuée à la hiérarchie'
  };
  const settled=value=>value==='compliant'||value==='escalated';
  const day=()=>{
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  };
  const read=()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||'null');
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
        return {...base,...raw,state:Object.hasOwn(states,raw.state)?raw.state:'awaiting',
          events:Array.isArray(raw.events)?raw.events:[]};
      }
    }catch{}
    return {...base,events:[]};
  };
  const save=value=>{
    try{localStorage.setItem(KEY,JSON.stringify(value));return true}
    catch{return false}
  };
  if(!localStorage.getItem(KEY))save(base);

  const style=document.createElement('style');
  style.id='mt-panato-pay-style';
  style.textContent=[
    '#mt-panato-pay-case{margin:0 0 14px;padding:15px;background:#2c302d;border:1px solid #a67943;border-radius:14px;color:#eef4f6}',
    '#mt-panato-pay-case.is-due{background:#483728;border-color:#eda85b}',
    '#mt-panato-pay-case.is-settled{background:#1c382e;border-color:#4caa82}',
    '#mt-panato-pay-case h3{margin:5px 0 7px;font-size:17px;line-height:1.3}',
    '#mt-panato-pay-case p{font-size:13px;line-height:1.5;margin:7px 0;white-space:pre-wrap}',
    '#mt-panato-pay-case .mtpc-caption{color:#c9d7df;font-size:12px}',
    '#mt-panato-pay-case .mtpc-phase{font-size:12px;font-weight:800;color:#ffca93}',
    '#mt-panato-pay-case.is-settled .mtpc-phase{color:#9be0c3}',
    '#mt-panato-pay-case details{margin-top:11px;border-top:1px solid #7a6c58;padding-top:10px}',
    '#mt-panato-pay-case summary{font-size:13px;font-weight:800;cursor:pointer;padding:6px 0}',
    '#mt-panato-pay-case label{display:grid;gap:6px;font-weight:750;font-size:12px;margin:11px 0}',
    '#mt-panato-pay-case textarea,#mt-panato-pay-case input,#mt-panato-pay-case select{width:100%;min-height:44px;font:inherit;background:#111c2b;color:#fff;border:1px solid #7d95a7;padding:10px;border-radius:9px}',
    '#mt-panato-pay-case textarea{min-height:90px;resize:vertical}',
    '#mt-panato-pay-case button{min-height:44px;background:#995e2c;color:#fff;padding:10px 13px}',
    '#mt-panato-pay-case .mtpc-actions{display:flex;gap:9px;flex-wrap:wrap;margin:9px 0}',
    '#mt-panato-pay-case .mtpc-message{color:#d4f3e1;font-size:12px}',
    '#mt-panato-pay-case .mtpc-history{color:#b8c9d8;font-size:11px}',
    '#mt-panato-today{padding:15px;margin:12px 0;border:2px solid #db9856;background:#483525;border-radius:13px;color:#fff}',
    '#mt-panato-today[hidden]{display:none!important}',
    '#mt-panato-today h3{margin:0 0 7px;font-size:17px}',
    '#mt-panato-today p{font-size:13px;line-height:1.5;margin:6px 0 9px}',
    '#mt-panato-today button{background:#bd722d;min-height:44px}'
  ].join('');
  document.head.append(style);

  const card=document.createElement('div');
  card.id='mt-panato-pay-case';
  card.innerHTML=[
    '<div class="mtpc-phase" id="mtpc-phase"></div>',
    '<h3>⚠️ Dossier prioritaire : PANATO Joey — formation / extra / paie</h3>',
    '<p class="mtpc-caption"><strong>Échéance de contrôle : 12 et 13 novembre 2026.</strong> Dossier conservé ensuite jusqu’à clôture.</p>',
    '<p><strong>Faits signalés, à confirmer :</strong> deux journées initialement prévues en formation auraient été retirées par la planification. PANATO serait resté en repos ces deux jours, mais deux journées auraient été ajoutées en « extra » pour compléter le total d’heures.</p>',
    '<p><strong>Contrôle à réaliser :</strong> comparer le planning d’origine, les modifications et la fiche de paie (heures de formation, repos, extras et rémunération effective). Vérifier avant toute conclusion.</p>',
    '<p><strong>Suite envisagée :</strong> si un écart est confirmé, constituer un compte rendu factuel et le remonter à la hiérarchie. Aucune transmission automatique.</p>',
    '<details id="mtpc-details"><summary>Ouvrir le dossier, vérifier et noter la suite</summary>',
    '<label>État du dossier<select id="mtpc-state">',
    '<option value="awaiting">En attente de la fiche de paie</option>',
    '<option value="checking">Vérification en cours</option>',
    '<option value="discrepancy">Écart à éclaircir ou constaté</option>',
    '<option value="compliant">Aucune anomalie retenue après vérification</option>',
    '<option value="escalated">Remontée effectuée à la hiérarchie</option>',
    '</select></label>',
    '<label>Date de vérification réelle<input type="date" id="mtpc-verification-date"></label>',
    '<label>Constat et éléments à vérifier (sans données de salaire détaillées)<textarea maxlength="1200" id="mtpc-notes" placeholder="Ex. vérifier la ligne formation, les 2 jours en extra et le compteur d’heures…"></textarea></label>',
    '<div class="mtpc-actions"><button id="mtpc-save" type="button">Enregistrer le suivi</button>',
    '<button id="mtpc-open-agent" type="button">Fiche PANATO</button></div>',
    '<p class="mtpc-message" id="mtpc-message" role="status"></p>',
    '<p class="mtpc-history" id="mtpc-history"></p>',
    '<p class="mtpc-caption">Enregistrement sur ton appareil. Aucun document de paie n’est transmis automatiquement. Une information signalée n’est pas une anomalie démontrée.</p>',
    '</details>'
  ].join('');
  const planningAlert=document.getElementById('mtb-planning-alert');
  if(planningAlert)planningAlert.before(card);else bureau.prepend(card);

  const todayCard=document.createElement('div');
  todayCard.id='mt-panato-today';
  todayCard.hidden=true;
  todayCard.innerHTML=[
    '<h3>⚠️ Vérification prioritaire PANATO — fiche de paie</h3>',
    '<p id="mtpc-today-text"></p>',
    '<button id="mtpc-open-case" type="button">Ouvrir le dossier de suivi</button>'
  ].join('');
  const hero=todayPanel.querySelector('.mt-hero');
  if(hero)hero.after(todayCard);else todayPanel.prepend(todayCard);

  const $=id=>document.getElementById(id);
  const stateInput=$('mtpc-state');
  const dateInput=$('mtpc-verification-date');
  const noteInput=$('mtpc-notes');
  const deadline=()=>day()>=FROM;
  const update=()=>{
    const item=read(),now=day(),active=!settled(item.state),due=now>=FROM;
    card.classList.toggle('is-due',due&&active);
    card.classList.toggle('is-settled',settled(item.state));
    $('mtpc-phase').textContent=settled(item.state)?'Dossier traité · '+states[item.state]:
      now<FROM?'Rappel programmé pour les 12 et 13 novembre 2026':
      now<=TO?'À VÉRIFIER AUJOURD’HUI · '+states[item.state]:
      'EN ATTENTE DE TRAITEMENT DEPUIS LE 13/11/2026 · '+states[item.state];
    stateInput.value=item.state;
    dateInput.value=item.verificationDate||'';
    noteInput.value=item.notes||'';
    $('mtpc-history').textContent=item.events.length
      ?'Dernier changement enregistré : '+new Date(item.events[item.events.length-1].at).toLocaleString('fr-FR')+' · '+item.events.length+' mise(s) à jour'
      :'Aucune vérification de la fiche de paie encore enregistrée.';
    todayCard.hidden=!(active&&due);
    $('mtpc-today-text').textContent=now<=TO
      ?'12–13 novembre : consulter la fiche de paie et comparer les deux jours de formation supprimés avec les deux journées en extra. Ne pas conclure sans documents.'
      :'Contrôle non clôturé : vérifier planning, justificatifs et fiche de paie ; si un écart est confirmé, préparer une remontée factuelle.';
  };

  $('mtpc-open-case').onclick=()=>{
    const bureauTab=document.querySelector('nav.tabs [data-tab="mt-bureau"]');
    bureauTab?.click();
    $('mtpc-details').open=true;
    card.scrollIntoView({behavior:'smooth',block:'start'});
  };
  $('mtpc-open-agent').onclick=()=>{
    const button=document.querySelector('nav.tabs [data-tab="team"]');
    if(!button)return;
    button.click();
    const select=$('agent-select');
    if(select&&Array.from(select.options).some(opt=>opt.value==='PANATO Joey')){
      select.value='PANATO Joey';
      select.dispatchEvent(new Event('change',{bubbles:true}));
      $('agent-detail')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  };
  $('mtpc-save').onclick=()=>{
    const old=read(),state=stateInput.value,when=dateInput.value,note=noteInput.value.trim();
    if(!Object.hasOwn(states,state)){ $('mtpc-message').textContent='Choisis un état reconnu.';return;}
    if(when&&!/^\d{4}-\d{2}-\d{2}$/.test(when)){
      $('mtpc-message').textContent='Date de contrôle incorrecte.';return;
    }
    if(state==='escalated'&&old.state!=='escalated'){
      if(old.state!=='discrepancy'&&!note){
        $('mtpc-message').textContent='Avant de noter une remontée, décris les éléments factuels vérifiés.';return;
      }
      if(!confirm('Confirmer que le signalement concernant PANATO a réellement été transmis à la hiérarchie ? MyTEAM ne l’enverra pas.'))return;
    }
    if(state==='compliant'&&old.state!=='compliant'){
      if(!confirm('Confirmer que tu as vérifié les documents et qu’aucune anomalie n’est retenue ?'))return;
    }
    if(state==='discrepancy'&&!note&&!old.notes){
      $('mtpc-message').textContent='Note l’écart observé et les pièces à vérifier avant de signaler un problème.';return;
    }
    if(old.state===state&&old.verificationDate===when&&old.notes===note){
      $('mtpc-message').textContent='Aucune modification à enregistrer.';return;
    }
    const at=new Date().toISOString();
    const next={...old,state,verificationDate:when,notes:note,
      reportedAt:state==='escalated'?(old.reportedAt||at):'',
      events:[...old.events,{at,before:old.state,after:state,verificationDate:when,notesChanged:old.notes!==note}]};
    if(!save(next)){$('mtpc-message').textContent='Enregistrement impossible sur cet appareil.';return;}
    update();
    $('mtpc-message').textContent='Suivi de PANATO enregistré. Aucune transmission automatique effectuée.';
  };
  document.querySelector('nav.tabs [data-tab="mt-bureau"]')?.addEventListener('click',update);
  document.querySelector('nav.tabs [data-tab="today"]')?.addEventListener('click',update);
  window.addEventListener('focus',update);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  window.MyTeamPanatoCaseRefresh=update;
  update();
})();