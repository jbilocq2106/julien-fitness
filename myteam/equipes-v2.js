(function(){
  "use strict";
  if(document.getElementById("equipes")) return;
  const KEY="myteam_agent_profiles_v1";
  const DEL="myteam_deleted_agents_v1";
  const main=document.querySelector("main");
  const nav=document.querySelector("nav.tabs");
  if(!main||!nav) return;
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
  const getProfiles=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}catch{return {}}};
  const getDeleted=()=>{try{const a=JSON.parse(localStorage.getItem(DEL)||"[]");return new Set((Array.isArray(a)?a:[]).map(norm))}catch{return new Set()}};
  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const profiles=()=>Object.entries(getProfiles()).filter(([name,p])=>
    p&&[1,2,3,4].includes(Number(p.team))&&!getDeleted().has(norm(name))
  ).map(([name,p])=>({name:name,workerNumber:String(p.workerNumber||""),gender:String(p.gender||"").toUpperCase(),team:Number(p.team),rx:p.rxCertified,piste:p.pistePermit}))
    .sort((a,b)=>a.name.localeCompare(b.name,"fr",{sensitivity:"base"}));
  let team=4,filter="all",query="";
  const style=document.createElement("style");
  style.id="equipes-v2-style";
  style.textContent=[
    "#equipes{padding-bottom:120px}",
    "#equipes .eq-title{display:flex;justify-content:space-between;align-items:center;gap:8px}",
    "#equipes .eq-title h2{margin:0;font-size:23px}",
    "#equipes .eq-sub{color:#bdcddd;font-size:12px;line-height:1.5}",
    "#equipes .eq-teams{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:16px 0}",
    "#equipes .eq-teams button{padding:12px 3px;min-width:0;background:#31435a;border:1px solid #576780;border-radius:13px;font-size:14px}",
    "#equipes .eq-teams button[aria-pressed=true]{background:#cb6732;border-color:#ffa879;color:#fff}",
    "#equipes .eq-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0 15px}",
    "#equipes .eq-stat{border-radius:12px;padding:12px 10px;color:#20324b;display:flex;justify-content:space-between;gap:5px;align-items:end;min-width:0}",
    "#equipes .eq-stat span{font-size:11px;font-weight:800;line-height:1.3}",
    "#equipes .eq-stat b{font-size:21px}",
    "#equipes .eq-stat.m{background:#e7f1fc}",
    "#equipes .eq-stat.f{background:#fbe5ed}",
    "#equipes .eq-stat.t{background:#e5f3ea}",
    "#equipes #eq-search{width:100%;padding:13px;background:#111c2d;color:#fff;border:1px solid #60738d;border-radius:12px;font-size:16px}",
    "#equipes .eq-filters{display:flex;gap:6px;overflow:auto;margin:12px 0 15px}",
    "#equipes .eq-filters button{white-space:nowrap;background:#31435a;border:1px solid #516780;border-radius:100px;padding:9px 10px;min-height:39px;font-size:12px}",
    "#equipes .eq-filters button[aria-pressed=true]{background:#425a79;color:white;border-color:#92b5dc}",
    "#equipes .eq-table{overflow:hidden;border-radius:11px;border:1px solid #52637a}",
    "#equipes .eq-head,#equipes .eq-row{display:grid;grid-template-columns:61px 1fr 58px 60px;align-items:center;gap:4px;padding:0 7px}",
    "#equipes .eq-head{background:#1c314e;color:#fff;font-size:10px;min-height:42px;font-weight:800}",
    "#equipes .eq-head span:not(:nth-child(2)){text-align:center}",
    "#equipes .eq-row{min-height:49px;background:#fff;color:#162940;border-bottom:1px solid #d9e0e8}",
    "#equipes .eq-row:nth-child(odd){background:#f5f8fb}",
    "#equipes .eq-row.f{background:#fce7ee}",
    "#equipes .eq-num{font-size:10px;text-align:center;overflow-wrap:anywhere}",
    "#equipes .eq-name{font-size:12px;font-weight:800;line-height:1.25;overflow-wrap:anywhere;text-align:left;border:0;background:transparent;padding:5px 0;min-height:45px;cursor:pointer;color:inherit;width:100%}",
    "#equipes .eq-name small{display:block;font-size:10px;font-weight:500;color:#52657a}",
    "#equipes .eq-qual{border:1px solid #8195ac;background:#f3f6fa;color:#25405b;border-radius:9px;min-height:34px;padding:5px 2px;text-align:center;font-weight:900}",
    "#equipes .eq-qual.yes{background:#d5f1de;border-color:#6ca784;color:#27653c}",
    "#equipes .eq-qual.no{background:#e7e9ed;border-color:#a3a9b1;color:#646d77}",
    "#equipes .eq-muted{color:#b7c7db;font-size:12px}",
    "#equipes .eq-foot{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px;margin-top:14px}",
    "#equipes .eq-help{color:#b7c8dd;font-size:12px;line-height:1.55}",
    "#equipes .eq-privacy{border:1px solid #48617d;border-radius:12px;padding:12px;margin-top:12px}",
    "#equipes .eq-privacy summary{font-weight:750;cursor:pointer}",
    "#equipes .eq-privacy input{width:100%}",
    "#equipes .eq-hint{padding:20px 8px;color:#afc3d8}",
    "@media(min-width:781px){#equipes{max-width:900px;margin:auto}#equipes .eq-head,#equipes .eq-row{grid-template-columns:112px 1fr 100px 100px;padding:0 17px}#equipes .eq-name{font-size:15px}#equipes .eq-num{font-size:13px}}",
    "@media print{@page{size:A4 portrait;margin:11mm}body{background:white!important;color:#172d45!important}body>*:not(main){display:none!important}main>*:not(#equipes){display:none!important}main{padding:0!important}#equipes{display:block!important;padding:0!important;max-width:none!important}#equipes .eq-teams,#equipes .eq-filters,#equipes #eq-search,#equipes .eq-foot,#equipes .eq-privacy,#equipes .eq-sub{display:none!important}#equipes .eq-row{min-height:21px!important;break-inside:avoid}#equipes .eq-name{font-size:9px}#equipes .eq-num{font-size:9px}#equipes .eq-head{min-height:28px}#equipes .eq-qual{min-height:15px;padding:0 2px;border-radius:1px;font-size:0!important;background:transparent!important;color:transparent!important}#equipes .eq-qual::after{content:'□';font-size:12px;color:#263248}#equipes .eq-stats{margin:8px 0}#equipes .eq-stat{padding:6px 10px}#equipes .eq-stat b{font-size:15px}}"
  ].join("\n");
  document.head.append(style);
  const section=document.createElement("section");
  section.id="equipes";
  section.className="hidden";
  section.innerHTML=[
    '<div class="card"><div class="eq-title"><h2>Équipes · Qualifications</h2><span aria-hidden="true">👥</span></div>',
    '<p class="eq-sub">Toutes les équipes, matricules et qualifications. Données privées enregistrées sur ce téléphone.</p>',
    '<div class="eq-teams" id="eq-teams" aria-label="Choisir une équipe"></div>',
    '<div class="eq-stats" id="eq-stats" aria-live="polite"></div>',
    '<input type="search" id="eq-search" placeholder="Rechercher un agent ou matricule" autocomplete="off" aria-label="Rechercher un agent ou matricule">',
    '<div class="eq-filters" id="eq-filters" aria-label="Filtrer les qualifications"></div>',
    '<div class="eq-table"><div class="eq-head"><span>Matricule</span><span>Nom / Genre</span><span>RX</span><span>Permis</span></div><div id="eq-rows"></div></div>',
    '<div class="eq-foot"><button type="button" id="eq-print">Imprimer cette équipe A4</button><span class="eq-muted" id="eq-count"></span></div>',
    '<p class="eq-help">Appuie sur une qualification : ? (à vérifier) → ✓ (oui) → — (non). Les modifications sont locales et conservées dans la fiche agent. Les fiches papier ont des cases vides pour cocher à la main.</p>',
    '<details class="eq-privacy"><summary>Annuaire privé : compléter les matricules et les équipes</summary><p class="eq-help">Une seule importation depuis le fichier privé MyTEAM suffit. Les informations déjà saisies sur les qualifications sont conservées. Aucun envoi à GitHub.</p><input type="file" id="eq-import" accept=".json,application/json"><p id="eq-import-status" class="eq-help" role="status"></p></details>',
    '</div>'
  ].join("");
  main.append(section);
  const tab=document.createElement("button");
  tab.type="button";tab.dataset.tab="equipes";tab.textContent="👥 Équipes";
  nav.insertBefore(tab,nav.querySelector('[data-tab="team"]')||null);
  const $=id=>document.getElementById(id);
  function render(){
    const rows=profiles(), all=rows.filter(x=>x.team===team);
    const m=all.filter(x=>x.gender==="M").length,f=all.filter(x=>x.gender==="F").length;
    $("eq-teams").innerHTML=[1,2,3,4].map(n=>'<button type="button" data-eq-team="'+n+'" aria-pressed="'+String(n===team)+'">Équipe '+n+'</button>').join("");
    $("eq-stats").innerHTML=[
      '<div class="eq-stat m"><span>HOMMES</span><b>'+m+'</b></div>',
      '<div class="eq-stat f"><span>FEMMES</span><b>'+f+'</b></div>',
      '<div class="eq-stat t"><span>TOTAL</span><b>'+all.length+'</b></div>'
    ].join("");
    const labels=[["all","Tous"],["rx","RX"],["piste","Permis"],["missing","À vérifier"]];
    $("eq-filters").innerHTML=labels.map(([v,l])=>'<button type="button" data-eq-filter="'+v+'" aria-pressed="'+String(filter===v)+'">'+l+'</button>').join("");
    const q=norm(query);
    let found=all.filter(r=>!q||norm(r.name).includes(q)||norm(r.workerNumber).includes(q));
    if(filter==="rx") found=found.filter(r=>r.rx===true);
    else if(filter==="piste") found=found.filter(r=>r.piste===true);
    else if(filter==="missing") found=found.filter(r=>r.rx!==true&&r.rx!==false||r.piste!==true&&r.piste!==false);
    $("eq-count").textContent=found.length+" / "+all.length+" agents affichés";
    function qual(name,field,v){
      const cls=v===true?"yes":v===false?"no":"unknown";
      const label=v===true?"✓":v===false?"—":"?";
      const title=(field==="rx"?"RX":"Permis")+" : "+(v===true?"oui":v===false?"non":"à vérifier");
      return '<button class="eq-qual '+cls+'" type="button" data-eq-name="'+esc(name)+'" data-eq-field="'+field+'" title="'+title+'" aria-label="'+esc(name)+' '+title+'">'+label+'</button>';
    }
    $("eq-rows").innerHTML=found.length?found.map(r=>
      '<div class="eq-row '+(r.gender==="F"?"f":"")+'"><span class="eq-num">'+esc(r.workerNumber||"—")+'</span><button type="button" class="eq-name" data-eq-agent="'+esc(r.name)+'" aria-label="Ouvrir la fiche de '+esc(r.name)+'">'+esc(r.name)+'<small>'+(r.gender==="F"?"Femme":r.gender==="M"?"Homme":"Genre à préciser")+'</small></button>'+qual(r.name,"rx",r.rx)+qual(r.name,"piste",r.piste)+'</div>'
    ).join(""):'<p class="eq-hint">Aucun agent dans ce filtre. Vérifie les données enregistrées sur ton téléphone.</p>';
  }
  $("eq-teams").addEventListener("click",e=>{const b=e.target.closest("[data-eq-team]");if(!b)return;team=Number(b.dataset.eqTeam);render()});
  $("eq-filters").addEventListener("click",e=>{const b=e.target.closest("[data-eq-filter]");if(!b)return;filter=b.dataset.eqFilter;render()});
  $("eq-search").addEventListener("input",e=>{query=e.target.value;render()});
  $("eq-rows").addEventListener("click",e=>{
    const b=e.target.closest("button[data-eq-field]");if(!b)return;
    const current=getProfiles();
    const name=b.dataset.eqName,field=b.dataset.eqField;
    if(!current[name])return;
    const key=field==="rx"?"rxCertified":"pistePermit";
    const old=current[name][key];
    const next=old===true?false:old===false?null:true;
    current[name][key]=next;
    try{localStorage.setItem(KEY,JSON.stringify(current))}catch{alert("Enregistrement local impossible.");return}
    // Synchroniser également l'objet mémoire de MyTEAM, s'il est disponible.
    try{if(typeof agentProfiles!=="undefined"&&agentProfiles[name])agentProfiles[name][key]=next}catch{}
    try{window.renderMyTeamAgentList&&window.renderMyTeamAgentList()}catch{}
    render();
  });
  $("eq-print").addEventListener("click",()=>window.print());
  $("eq-import").addEventListener("change",async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    const status=$("eq-import-status");status.textContent="Lecture du fichier local...";
    try{
      if(file.size>2000000)throw Error("Fichier trop volumineux");
      const data=JSON.parse(await file.text());
      if(!data||!data.teams||typeof data.teams!=="object")throw Error("Format d'annuaire non reconnu");
      const current=getProfiles(),originalNames=Object.keys(current),normMap=new Map(Object.keys(current).map(k=>[norm(k),k]));
      let changed=0;const seen=new Set(),retained=new Set();
      for(let t=1;t<=4;t++){
        const entries=data.teams[String(t)];
        if(!Array.isArray(entries))continue;
        for(const r of entries){
          if(!r||typeof r.name!=="string"||r.name.length>100||!["M","F"].includes(r.gender)||!(/^\d{2,10}$/.test(String(r.workerNumber))))continue;
          const key=norm(r.name);if(seen.has(key))continue;seen.add(key);
          const candidates=Object.keys(current).filter(name=>!retained.has(name)&&Number(current[name]?.team)===t&&norm(name).length>=5&&(key.startsWith(norm(name))||norm(name).startsWith(key)));
          const knownName=normMap.get(key)||(candidates.length===1?candidates[0]:r.name);
          retained.add(knownName);
          const p=current[knownName]&&typeof current[knownName]==="object"?current[knownName]:{};
          current[knownName]=Object.assign({},p,{team:t,gender:r.gender,workerNumber:String(r.workerNumber),rosterSeedCurrentV2:true,rosterPrivateImport:true});
          normMap.set(key,knownName);changed++;
        }
      }
      if(changed<1)throw Error("Aucune ligne exploitable dans le fichier");
      // Les fiches historiques restent conservées, mais hors équipe si absentes de la liste de référence.
      let toReview=0;
      for(const name of originalNames){
        const p=current[name];
        if(p&&[1,2,3,4].includes(Number(p.team))&&!retained.has(name)){
          current[name]=Object.assign({},p,{team:0,rosterNeedsReview:true});toReview++;
        }
      }
      const deleted=getDeleted();
      for(const key of Array.from(deleted)){if(seen.has(key))deleted.delete(key)}
      const oldDel=JSON.parse(localStorage.getItem(DEL)||"[]");
      try{
        localStorage.setItem(KEY,JSON.stringify(current));
        localStorage.setItem(DEL,JSON.stringify((Array.isArray(oldDel)?oldDel:[]).filter(name=>!seen.has(norm(name)))));
      }catch{throw Error("Stockage de ce téléphone indisponible")}
      try{if(typeof agentProfiles!=="undefined")Object.assign(agentProfiles,current)}catch{}
      try{window.renderMyTeamAgentList&&window.renderMyTeamAgentList()}catch{}
      status.textContent=changed+" fiches mises à jour. "+(toReview?toReview+" ancienne(s) fiche(s) à vérifier dans Agents. ":"")+"Qualifications précédentes conservées.";
      render();
    }catch(err){status.textContent="Import non effectué : "+err.message}
    e.target.value="";
  });
  tab.addEventListener("click",()=>{
    main.querySelectorAll(":scope > section").forEach(s=>s.classList.toggle("hidden",s!==section));
    nav.querySelectorAll("button[data-tab]").forEach(b=>b.classList.toggle("active",b===tab));
    render();
    window.scrollTo(0,0);
  });
  nav.addEventListener("click",e=>{
    const b=e.target.closest("button[data-tab]");
    if(b&&b!==tab)section.classList.add("hidden");
  },true);
  window.addEventListener("focus",()=>{if(!section.classList.contains("hidden"))render()});
  window.addEventListener("storage",e=>{if(e.key===KEY&&!section.classList.contains("hidden"))render()});
  window.myteamRenderEquipes=render;
  render();
})();