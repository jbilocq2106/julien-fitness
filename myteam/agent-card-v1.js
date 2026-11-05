/* MyTEAM - Fiche individuelle depuis Equipes.
   Les informations professionnelles sont stockees sur l'appareil, jamais dans GitHub. */
(()=>{
  "use strict";
  if(window.MyTeamAgentCard)return;
  const root=document.getElementById("equipes");
  const rows=document.getElementById("eq-rows");
  if(!root||!rows)return;
  const AGENTS="myteam_agent_profiles_v1";
  const CASES="myteam_agent_casebook_v1";
  const CONTEXT="myteam_agent_context_reminders_v1";
  const PERMITS="myteam-permit-validities-v1";
  let selected="";
  const $=id=>document.getElementById(id);
  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||"null");return v===null?fallback:v}catch{return fallback}};
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const isoToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
  const validDate=s=>typeof s==="string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s+"T12:00:00")) && new Date(s+"T12:00:00").getDate()===Number(s.slice(8));
  const fmt=s=>validDate(s)?s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4):"Non renseignée";
  const monthBefore=s=>{if(!validDate(s))return "";const [y,m,d]=s.split("-").map(Number);const v=new Date(y,m-2,Math.min(d,new Date(y,m-1,0).getDate()),12);return [v.getFullYear(),String(v.getMonth()+1).padStart(2,"0"),String(v.getDate()).padStart(2,"0")].join("-")};
  const dateState=s=>!validDate(s)?"unknown":s<isoToday()?"expired":isoToday()>=monthBefore(s)?"soon":"valid";
  const stateLabel=s=>({expired:"Expirée",soon:"Expire dans le mois",valid:"Date enregistrée",unknown:"Date à ajouter"})[dateState(s)];
  const profiles=()=>{const p=read(AGENTS,{});return p&&typeof p==="object"&&!Array.isArray(p)?p:{}};
  const details=()=>profiles()[selected]||null;
  const cases=()=>{const c=read(CASES,{});return c&&typeof c==="object"&&!Array.isArray(c)?c:{}};
  const ownCases=()=>{const all=cases();return Array.isArray(all[selected])?all[selected].filter(x=>x&&typeof x==="object"):[]};
  function saveAgent(p){
    const all=profiles();if(!Object.hasOwn(all,selected))return false;
    all[selected]={...all[selected],...p};
    try{
      localStorage.setItem(AGENTS,JSON.stringify(all));
      try{if(typeof agentProfiles!=="undefined"&&agentProfiles)agentProfiles[selected]={...agentProfiles[selected],...all[selected]}}catch{}
      window.myteamRenderEquipes?.();
      window.dispatchEvent(new Event("myteam:agent-profile-changed"));
      return true;
    }catch{return false}
  }
  function saveCases(list){
    const all=cases();all[selected]=list;
    try{localStorage.setItem(CASES,JSON.stringify(all));return true}catch{return false}
  }
  function syncPermit(date,p){
    const worker=String(p.workerNumber||"").trim();
    const all=read(PERMITS,[]);
    if(!Array.isArray(all))return;
    const index=all.findIndex(x=>x&&(worker&&String(x.workerNumber||"")===worker || norm(x.name)===norm(selected)));
    if(index<0&&!worker)return;
    const row={name:selected,workerNumber:worker,expires:date||null,needsReview:!date};
    if(index<0)all.push(row);
    else all[index]={...all[index],...row};
    try{localStorage.setItem(PERMITS,JSON.stringify(all))}catch{}
  }

  const style=document.createElement("style");
  style.id="myteam-agent-card-style";
  style.textContent=[
    "#equipes.ap-open>.card:not(#eq-agent-profile){display:none!important}",
    "#eq-agent-profile[hidden]{display:none!important}",
    "#eq-agent-profile{padding:15px!important;margin:0 0 18px;border:1px solid #5d7590}",
    "#eq-agent-profile .ap-back{min-height:43px;background:#385371;margin-bottom:13px;border:1px solid #8194ab}",
    "#eq-agent-profile .ap-title{margin:0;font-size:21px;overflow-wrap:anywhere}",
    "#eq-agent-profile .ap-sub{font-size:12px;color:#c9d7e5;line-height:1.55;margin:6px 0 12px}",
    "#eq-agent-profile .ap-section{border-top:1px solid #516b86;padding-top:14px;margin-top:15px}",
    "#eq-agent-profile h3{font-size:17px;margin:0 0 9px}",
    "#eq-agent-profile h4{font-size:14px;margin:12px 0 6px}",
    "#eq-agent-profile .ap-pills{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}",
    "#eq-agent-profile .ap-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:12px;line-height:1.35;font-weight:800;background:#394c64;border:1px solid #75879d;color:#fff}",
    "#eq-agent-profile .ap-pill.ok{background:#244d3e;border-color:#43876a}",
    "#eq-agent-profile .ap-pill.soon{background:#71501f;border-color:#b99048}",
    "#eq-agent-profile .ap-pill.expired{background:#662e38;border-color:#b75e6d}",
    "#eq-agent-profile .ap-pill.unknown{background:#38495d;border-color:#76879d}",
    "#eq-agent-profile .ap-formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
    "#eq-agent-profile .ap-formgrid label,#eq-agent-profile .ap-entry-form label{display:grid;gap:5px;font-size:13px;font-weight:700}",
    "#eq-agent-profile select,#eq-agent-profile input,#eq-agent-profile textarea{box-sizing:border-box;min-width:0;width:100%;min-height:45px;padding:10px 11px;border-radius:10px;border:1px solid #7890ab;background:#112035;color:#fff;font:inherit}",
    "#eq-agent-profile textarea{min-height:83px;resize:vertical}",
    "#eq-agent-profile .ap-wide{grid-column:1/-1}",
    "#eq-agent-profile .ap-save{margin-top:10px;background:#bc642c;min-height:45px;width:100%}",
    "#eq-agent-profile .ap-note{font-size:12px;color:#bacce0;line-height:1.5}",
    "#eq-agent-profile .ap-entry-form{display:grid;gap:10px}",
    "#eq-agent-profile .ap-item{padding:11px 12px;margin:8px 0;background:#253a52;border-radius:12px;border:1px solid #4c6986}",
    "#eq-agent-profile .ap-item p{margin:7px 0;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}",
    "#eq-agent-profile .ap-item button{min-height:39px;padding:8px 12px;background:#345d56;font-size:12px}",
    "#eq-agent-profile details{border:1px solid #4c6580;border-radius:12px;padding:12px;margin:9px 0}",
    "#eq-agent-profile summary{font-weight:750;cursor:pointer}",
    "#eq-agent-profile .ap-old{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.5;color:#e2eaf3}",
    "#eq-agent-profile .ap-status{font-size:13px;font-weight:700;margin:9px 0}",
    "@media(max-width:390px){#eq-agent-profile .ap-formgrid{grid-template-columns:1fr}}",
    "@media print{#eq-agent-profile .ap-back,#eq-agent-profile .ap-save,#eq-agent-profile .ap-entry-form,#eq-agent-profile .ap-item button{display:none!important}}"
  ].join("\n");
  document.head.append(style);

  const view=document.createElement("div");
  view.id="eq-agent-profile";
  view.className="card";
  view.hidden=true;
  view.innerHTML=[
    '<button type="button" class="ap-back" id="ap-back">← Retour aux équipes</button>',
    '<h2 class="ap-title" id="ap-name"></h2>',
    '<p class="ap-sub" id="ap-info"></p>',
    '<div class="ap-pills" id="ap-summary"></div>',
    '<section class="ap-section"><h3>Qualifications et fin de validité</h3>',
    '<div class="ap-formgrid">',
    '<label>Qualification RX<select id="ap-rx-qual"><option value="">À confirmer</option><option value="true">Oui</option><option value="false">Non</option></select></label>',
    '<label>Permis piste<select id="ap-piste-qual"><option value="">À confirmer</option><option value="true">Oui</option><option value="false">Non</option></select></label>',
    '<label>Fin de certification RX<input id="ap-rx-expiry" type="date"></label>',
    '<label>Fin de validité permis piste<input id="ap-permit-expiry" type="date"></label>',
    '<label class="ap-wide">Échéance du recyclage RX (historique existant)<input id="ap-rx-renewal" type="date"></label>',
    '</div><div class="ap-pills" id="ap-cert-status"></div>',
    '<button type="button" class="ap-save" id="ap-save-quals">Enregistrer qualifications et dates</button>',
    '<p class="ap-status" id="ap-qual-message" role="status"></p>',
    '<h4>Autres habilitations ou certifications</h4><div id="ap-extra-list"></div>',
    '<form id="ap-extra-form" class="ap-entry-form"><div class="ap-formgrid"><label>Nom de la certification<input name="label" required maxlength="100" placeholder="Ex. qualification supplémentaire"></label>',
    '<label>Date de fin (si connue)<input name="expiry" type="date"></label></div><button type="submit">+ Ajouter</button></form>',
    '</section>',
    '<section class="ap-section"><h3>Rappels et alertes actifs</h3><div id="ap-active"></div></section>',
    '<section class="ap-section"><h3>Journal individuel</h3>',
    '<p class="ap-note">Consigner uniquement des faits professionnels datés et vérifiables. Un rappel n’est marqué fait qu’après confirmation.</p>',
    '<form id="ap-entry-form" class="ap-entry-form">',
    '<div class="ap-formgrid"><label>Type<select name="type"><option value="rappel">Rappel / action à faire</option><option value="alarme">Alerte / point de vigilance</option><option value="positif">Comportement positif</option><option value="remarque">Remarque factuelle</option></select></label>',
    '<label>Date du fait<input name="date" type="date" required></label>',
    '<label class="ap-wide">Échéance éventuelle<input name="due" type="date"></label></div>',
    '<label>Fait ou action<textarea name="text" maxlength="1000" required placeholder="Décrire le fait précis, sans appréciation personnelle ni donnée médicale"></textarea></label>',
    '<button class="ap-save" type="submit">Enregistrer dans la fiche</button><p id="ap-entry-status" class="ap-status" role="status"></p></form>',
    '<div id="ap-history"></div></section>',
    '<section class="ap-section"><h3>Informations déjà enregistrées</h3><div id="ap-existing"></div></section>',
    '<p class="ap-note">Données conservées dans ce navigateur. Aucune note nominative n’est publiée sur GitHub. Les alertes sont visuelles, sans notification automatique du téléphone.</p>'
  ].join("");
  root.prepend(view);

  function pill(text,state){
    const span=document.createElement("span");
    span.className="ap-pill "+(state||"unknown");span.textContent=text;return span;
  }
  function addTextCard(host,title,body){
    const d=document.createElement("details"),sum=document.createElement("summary"),p=document.createElement("div");
    sum.textContent=title;p.className="ap-old";p.textContent=String(body||"");d.append(sum,p);host.append(d);
  }
  function expiryPill(text,date){
    const st=dateState(date);return pill(text+": "+fmt(date)+" · "+stateLabel(date),st==="valid"?"ok":st);
  }
  function ownReminders(){
    const all=read(CONTEXT,[]);
    return Array.isArray(all)?all.filter(r=>r&&r.agent&&(norm(r.agent)===norm(selected)||(norm(r.agent).length>=7&&norm(selected).startsWith(norm(r.agent))))) :[];
  }
  function render(){
    const p=details();if(!p){close();return}
    $("ap-name").textContent=selected;
    $("ap-info").textContent="Équipe "+(p.team||"à confirmer")+"  ·  Matricule "+(p.workerNumber||"non renseigné")+(p.gender?"  ·  "+(p.gender==="F"?"Femme":p.gender==="M"?"Homme":"Genre à confirmer"):"");
    $("ap-rx-qual").value=p.rxCertified===true?"true":p.rxCertified===false?"false":"";
    $("ap-piste-qual").value=p.pistePermit===true?"true":p.pistePermit===false?"false":"";
    $("ap-rx-expiry").value=validDate(p.rxExpiry)?p.rxExpiry:"";
    $("ap-permit-expiry").value=validDate(p.permitExpiry)?p.permitExpiry:"";
    $("ap-rx-renewal").value=validDate(p.rx)?p.rx:"";
    $("ap-summary").replaceChildren(
      pill("RX "+(p.rxCertified===true?"✓":p.rxCertified===false?"non":"?"),p.rxCertified===true?"ok":"unknown"),
      pill("Piste "+(p.pistePermit===true?"✓":p.pistePermit===false?"non":"?"),p.pistePermit===true?"ok":"unknown"),
      pill("Suivi personnel", "ok")
    );
    $("ap-cert-status").replaceChildren(expiryPill("RX",p.rxExpiry),expiryPill("Permis piste",p.permitExpiry));
    const extras=$("ap-extra-list");extras.replaceChildren();
    const list=Array.isArray(p.otherCertifications)?p.otherCertifications:[];
    if(!list.length){const msg=document.createElement("p");msg.className="ap-note";msg.textContent="Aucune autre certification renseignée.";extras.append(msg)}
    list.forEach((r,index)=>{
      const box=document.createElement("div");box.className="ap-item";
      const label=document.createElement("strong");label.textContent=String(r.label||"Certification");
      const tags=document.createElement("div");tags.className="ap-pills";tags.append(expiryPill("Fin de validité",r.expiry));
      const del=document.createElement("button");del.type="button";del.dataset.apDeleteCert=String(index);del.textContent="Retirer cette certification";
      box.append(label,tags,del);extras.append(box);
    });
    const active=$("ap-active");active.replaceChildren();
    const logged=ownCases();
    const outstanding=logged.filter(x=>["rappel","alarme"].includes(x.type)&&x.done!==true)
      .sort((a,b)=>String(a.due||a.date||"9999").localeCompare(String(b.due||b.date||"9999")));
    const ctx=ownReminders().filter(x=>x.status!=="done");
    if(!outstanding.length&&!ctx.length){const el=document.createElement("p");el.className="ap-note";el.textContent="Aucun rappel ou alerte individuel en attente dans les données locales.";active.append(el)}
    outstanding.forEach(x=>active.append(renderEvent(x,true)));
    ctx.forEach(x=>{
      const card=document.createElement("div");card.className="ap-item";
      const tags=document.createElement("div");tags.className="ap-pills";
      tags.append(pill("Rappel lié à l’agent","soon"),pill(x.status==="postponed"?"Reporté":"À faire","unknown"));
      const body=document.createElement("p");body.textContent=x.text;
      const info=document.createElement("p");info.className="ap-note";info.textContent="Depuis le suivi Rappels (gérer le statut dans cette rubrique).";
      card.append(tags,body,info);active.append(card);
    });
    const hist=$("ap-history");hist.replaceChildren();
    const old=logged.slice().sort((a,b)=>String(b.date||b.createdAt||"").localeCompare(String(a.date||a.createdAt||"")));
    if(!old.length){const empty=document.createElement("p");empty.className="ap-note";empty.textContent="Aucun fait structuré enregistré pour l’instant.";hist.append(empty)}
    old.forEach(x=>hist.append(renderEvent(x,false)));
    const existing=$("ap-existing");existing.replaceChildren();
    const fields=[
      ["Remarques et appréciations historiques",p.notes],
      ["Rappels historiques",p.reminderNotes],
      ["Historique RX",p.rxLog],
      ["Retards et ponctualité",p.lateLog],
      ["Absences administratives (sans diagnostic)",p.sickLog],
      ["Dernière vérification des consignes",p.instructions?fmt(p.instructions):""]
    ];
    fields.forEach(([label,body])=>{if(body)addTextCard(existing,label,body)});
    if(p.reminders!==undefined&&p.reminders!==""){const v=document.createElement("p");v.className="ap-note";v.textContent="Nombre de rappels historiques indiqué dans la fiche : "+p.reminders;existing.prepend(v)}
    if(!existing.childElementCount){const el=document.createElement("p");el.className="ap-note";el.textContent="Aucune autre information enregistrée pour cet agent.";existing.append(el)}
    window.scrollTo(0,0);
  }
  function renderEvent(x,active){
    const card=document.createElement("div");card.className="ap-item";
    const top=document.createElement("div");top.className="ap-pills";
    const labels={rappel:"Rappel",alarme:"Alerte",positif:"Point positif",remarque:"Remarque"};
    top.append(pill(labels[x.type]||"Suivi",x.type==="positif"?"ok":x.type==="alarme"?"soon":"unknown"));
    top.append(pill("Fait le "+fmt(x.date),"unknown"));
    if(x.due)top.append(expiryPill("Échéance",x.due));
    if(x.done===true)top.append(pill("Terminé","ok"));
    const body=document.createElement("p");body.textContent=x.text||"";
    card.append(top,body);
    if(active){
      const done=document.createElement("button");done.type="button";done.dataset.apDone=x.id;done.textContent="✓ Marquer comme fait";card.append(done);
    }
    return card;
  }
  function open(name){
    if(!Object.hasOwn(profiles(),name))return;
    selected=name;
    view.hidden=false;root.classList.add("ap-open");
    $("ap-entry-form").reset();$("ap-entry-form").elements.date.value=isoToday();
    $("ap-qual-message").textContent="";$("ap-entry-status").textContent="";
    render();
  }
  function close(){
    selected="";view.hidden=true;root.classList.remove("ap-open");window.scrollTo(0,0);
  }
  rows.addEventListener("click",e=>{
    const btn=e.target.closest("button[data-eq-agent]");
    if(!btn)return;
    e.preventDefault();open(btn.dataset.eqAgent);
  });
  $("ap-back").onclick=close;
  $("ap-save-quals").onclick=()=>{
    const p=details();if(!p)return;
    const rx=$("ap-rx-expiry").value,permit=$("ap-permit-expiry").value,renewal=$("ap-rx-renewal").value;
    if([rx,permit,renewal].some(d=>d&&!validDate(d))){$("ap-qual-message").textContent="Une date renseignée est invalide.";return}
    const val=s=>s==="true"?true:s==="false"?false:null;
    if(!saveAgent({rxCertified:val($("ap-rx-qual").value),pistePermit:val($("ap-piste-qual").value),rxExpiry:rx||"",permitExpiry:permit||"",rx:renewal||""})){
      $("ap-qual-message").textContent="Échec de l’enregistrement sur cet appareil.";return;
    }
    syncPermit(permit,p);
    render();$("ap-qual-message").textContent="Qualifications et dates enregistrées sur cet appareil.";
  };
  $("ap-extra-form").addEventListener("submit",e=>{
    e.preventDefault();const p=details();if(!p)return;
    const f=e.currentTarget,label=f.elements.label.value.trim(),expiry=f.elements.expiry.value;
    if(!label||expiry&&!validDate(expiry))return;
    const old=Array.isArray(p.otherCertifications)?p.otherCertifications:[];
    if(!saveAgent({otherCertifications:[...old,{label:label.slice(0,100),expiry:expiry||""}]})){alert("Enregistrement impossible.");return}
    f.reset();render();
  });
  $("ap-extra-list").addEventListener("click",e=>{
    const b=e.target.closest("[data-ap-delete-cert]");if(!b)return;
    const p=details(),certs=Array.isArray(p?.otherCertifications)?p.otherCertifications:[];
    const n=Number(b.dataset.apDeleteCert);if(!Number.isInteger(n)||!certs[n])return;
    if(!confirm("Retirer cette certification de la fiche ?"))return;
    if(saveAgent({otherCertifications:certs.filter((_,i)=>i!==n)}))render();
  });
  $("ap-entry-form").addEventListener("submit",e=>{
    e.preventDefault();if(!selected)return;
    const f=e.currentTarget,type=f.elements.type.value,date=f.elements.date.value,due=f.elements.due.value,text=f.elements.text.value.trim();
    if(!["rappel","alarme","positif","remarque"].includes(type)||!validDate(date)||due&&!validDate(due)||!text)return;
    const record={id:"agent-"+Date.now()+"-"+Math.random().toString(36).slice(2,9),type,date,due,text:text.slice(0,1000),done:false,createdAt:new Date().toISOString()};
    if(!saveCases([...ownCases(),record])){$("ap-entry-status").textContent="Enregistrement impossible.";return}
    f.reset();f.elements.date.value=isoToday();render();$("ap-entry-status").textContent="Fait enregistré dans la fiche.";
  });
  $("ap-active").addEventListener("click",e=>{
    const b=e.target.closest("[data-ap-done]");if(!b)return;
    const list=ownCases(),item=list.find(x=>x.id===b.dataset.apDone);if(!item||item.done===true)return;
    if(!confirm("Confirmer que ce rappel ou cette alerte est traité ?"))return;
    if(saveCases(list.map(x=>x.id===item.id?{...x,done:true,doneAt:new Date().toISOString()}:x)))render();
  });
  const nav=document.querySelector("nav.tabs");
  nav?.addEventListener("click",e=>{
    const b=e.target.closest("button[data-tab]");
    if(b&&b.dataset.tab!=="equipes"&&selected)close();
  });
  window.addEventListener("focus",()=>{if(selected&&!root.classList.contains("hidden"))render()});
  window.MyTeamAgentCard={open,close,refresh:()=>{if(selected)render()}};
})();