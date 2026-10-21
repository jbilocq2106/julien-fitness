(()=>{
  const voiceBox=document.querySelector('.voice-box');
  if(voiceBox)voiceBox.style.display='none';
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Chargement impossible : '+src));document.head.appendChild(s)});
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const fmtDate=v=>{if(!v)return '?';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}`:v};
  const deletedNames=()=>{try{const d=JSON.parse(localStorage.getItem('myteam_deleted_agents_v1')||'[]');return new Set(Array.isArray(d)?d:[])}catch{return new Set()}};

  function restoreCurrentPlanningFromArchive(){
    try{
      const now=new Date(),month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const active=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');
      if(Array.isArray(active)&&active.some(s=>String(s?.date||'').startsWith(month)))return false;
      const history=JSON.parse(localStorage.getItem('myteam_planning_history')||'{}')||{};
      const saved=history?.[month]?.rows;
      if(!Array.isArray(saved)||!saved.length)return false;
      // Restaurer le mois courant sans effacer des mois futurs deja importes.
      const merged=[...active.filter(s=>String(s?.date||'').slice(0,7)!==month),...saved]
        .sort((x,y)=>String(x.date).localeCompare(String(y.date))||String(x.start).localeCompare(String(y.start)));
      localStorage.setItem('myteam_shifts',JSON.stringify(merged));
      if(!active.length&&history[month]?.meta)localStorage.setItem('myteam_planning_meta',JSON.stringify(history[month].meta));
      localStorage.setItem('myteam_planning_repair',JSON.stringify({month,restoredAt:new Date().toISOString(),reason:'current-month-missing'}));
      return true;
    }catch{return false}
  }
  restoreCurrentPlanningFromArchive();

  function currentRoster(team){
    const deleted=deletedNames();
    if(typeof agentProfiles==='undefined'||!agentProfiles)return [];
    return Object.entries(agentProfiles)
      .filter(([name,p])=>{
        if(deleted.has(name)||Number(p?.team)!==Number(team))return false;
        return p?.rosterSeedCurrentV2===true||p?.rosterSeed20260721===true||p?.manualAdded===true||p?.prestationAdded===true||p?.teamManual===true;
      })
      .map(([name,p])=>({
        name,
        rx:p?.rxCertified,
        piste:p?.pistePermit,
        gender:p?.gender||'',
        team:Number(p?.team)||0,
        sickActive:p?.sickActive===true,
        sickEnd:p?.sickEnd||''
      }))
      .sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
  }

  function renderDirectAgents(){
    const tab=document.querySelector('[data-tab="team"]');
    if(tab)tab.textContent='👥 Agents';
    const section=document.querySelector('#team');
    if(!section)return;
    const title=section.querySelector('h2');
    if(title)title.textContent='Agents — Équipes';
    document.querySelector('#agents-complete-view')?.remove();
    document.querySelector('#agents-quick-view')?.remove();

    let box=document.querySelector('#agents-direct');
    if(!box){
      box=document.createElement('div');
      box.id='agents-direct';
      box.innerHTML=`<style>
        #agents-direct{margin:0 0 18px}#agent-manual-list{display:none!important}
        .ad-team-tabs{display:flex;gap:7px;overflow:auto;padding:2px 0 12px;scrollbar-width:none}.ad-team-tab{white-space:nowrap;padding:11px 14px;border-radius:999px;background:#27364c;color:#fff;border:1px solid #46566c;font-weight:850}.ad-team-tab.active{background:#e76b24;border-color:#e76b24}
        .ad-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:8px}.ad-count{font-size:12px;color:#aebacc;text-align:right}
        #ad-search{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #61748b;background:#111928;color:#fff;font:inherit;margin:6px 0 10px}
        .ad-filters{display:flex;gap:7px;overflow:auto;padding-bottom:10px}.ad-filter{white-space:nowrap;padding:9px 11px;border-radius:999px;background:#27364c;color:#fff;border:0;font-weight:750}.ad-filter.active{background:#e76b24}
        #ad-list{display:grid;gap:8px}.ad-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;padding:13px 14px;border-radius:14px;border:1px solid #3b4e66;background:#26354a;color:#fff}.ad-name{font-weight:800}.ad-row.female .ad-name{color:#ff7fbd}.ad-tags{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.ad-tag{padding:5px 8px;border-radius:999px;background:#1f7a4d;font-size:11px;font-weight:850}.ad-tag.pending{background:#665126}.ad-sick{background:#9d2f36}.ad-arrow{font-size:20px;color:#aebacc}.ad-empty{padding:16px;text-align:center;border-radius:12px;background:#202e42;color:#aebacc}
      </style>
      <div class="ad-team-tabs">
        <button type="button" class="ad-team-tab active" data-ad-team="4">Team 4</button>
        <button type="button" class="ad-team-tab" data-ad-team="1">Team 1</button>
        <button type="button" class="ad-team-tab" data-ad-team="2">Team 2</button>
        <button type="button" class="ad-team-tab" data-ad-team="3">Team 3</button>
      </div>
      <div class="ad-top"><strong id="ad-title">Team 4 — ordre alphabétique</strong><span id="ad-count" class="ad-count"></span></div>
      <input id="ad-search" type="search" placeholder="Rechercher un agent…" autocomplete="off">
      <div class="ad-filters">
        <button class="ad-filter active" data-ad-filter="all" type="button">Tous</button>
        <button class="ad-filter" data-ad-filter="rx" type="button">RX</button>
        <button class="ad-filter" data-ad-filter="piste" type="button">Permis piste</button>
        <button class="ad-filter" data-ad-filter="unknown" type="button">Qualifications à compléter</button>
      </div>
      <div id="ad-list"></div>`;
      const first=section.querySelector('p');
      if(first)first.before(box);else section.prepend(box);
    }

    let team=Number(box.dataset.activeTeam||4);
    let filter=box.dataset.activeFilter||'all';
    const search=box.querySelector('#ad-search'),list=box.querySelector('#ad-list'),count=box.querySelector('#ad-count'),heading=box.querySelector('#ad-title');

    const draw=()=>{
      const all=currentRoster(team);
      const q=(search.value||'').trim().toLocaleLowerCase('fr');
      const visible=all.filter(a=>{
        const searchOk=!q||a.name.toLocaleLowerCase('fr').includes(q);
        const filterOk=filter==='all'||(filter==='rx'&&a.rx===true)||(filter==='piste'&&a.piste===true)||(filter==='unknown'&&(typeof a.rx!=='boolean'||typeof a.piste!=='boolean'));
        return searchOk&&filterOk;
      });
      const women=all.filter(a=>a.gender==='F').length,men=all.filter(a=>a.gender==='M').length;
      const pending=all.filter(a=>typeof a.rx!=='boolean'||typeof a.piste!=='boolean').length;
      heading.textContent=`Team ${team} — ordre alphabétique`;
      count.textContent=`${all.length} agents • ${women} F • ${men} H${pending?` • ${pending} à compléter`:''}`;
      list.innerHTML=visible.length?visible.map(a=>`<button type="button" class="ad-row${a.gender==='F'?' female':''}" data-ad-name="${esc(a.name)}"><span class="ad-name">${esc(a.name)}</span><span class="ad-tags">${a.rx===true?'<span class="ad-tag">RX</span>':''}${a.piste===true?'<span class="ad-tag">PISTE</span>':''}${(typeof a.rx!=='boolean'||typeof a.piste!=='boolean')?'<span class="ad-tag pending">À compléter</span>':''}${a.sickActive?`<span class="ad-tag ad-sick">🩺 ${fmtDate(a.sickEnd)}</span>`:''}<span class="ad-arrow">›</span></span></button>`).join(''):'<div class="ad-empty">Aucun agent dans ce filtre.</div>';
      list.querySelectorAll('[data-ad-name]').forEach(btn=>btn.onclick=()=>{
        const sel=document.querySelector('#agent-select');if(!sel)return;
        sel.value=btn.dataset.adName;
        sel.dispatchEvent(new Event('change'));
        const detail=document.querySelector('#agent-detail');
        if(detail){detail.classList.remove('hidden');detail.scrollIntoView({behavior:'smooth',block:'start'})}
      });
    };

    search.oninput=draw;
    box.querySelectorAll('[data-ad-team]').forEach(btn=>btn.onclick=()=>{
      team=Number(btn.dataset.adTeam);box.dataset.activeTeam=String(team);search.value='';
      box.querySelectorAll('[data-ad-team]').forEach(b=>b.classList.toggle('active',b===btn));draw();
    });
    box.querySelectorAll('[data-ad-filter]').forEach(btn=>btn.onclick=()=>{
      filter=btn.dataset.adFilter;box.dataset.activeFilter=filter;
      box.querySelectorAll('[data-ad-filter]').forEach(b=>b.classList.toggle('active',b===btn));draw();
    });
    box.querySelectorAll('[data-ad-team]').forEach(b=>b.classList.toggle('active',Number(b.dataset.adTeam)===team));
    box.querySelectorAll('[data-ad-filter]').forEach(b=>b.classList.toggle('active',b.dataset.adFilter===filter));
    draw();
  }

  window.renderMyTeamAgentList=renderDirectAgents;

  (async()=>{
    try{
      await load('./pwa-install-v1.js?v=20261017-1');
      await load('../team4/app.js?v=20261021-8');
      document.querySelector('.voice-box')?.remove();
      await load('./hours-v1.js?v=20261021-4');
      await load('./salary-forecast-v3.js?v=20261021-4');
      await load('./agents-migration-v3.js?v=5');
      await load('./roster-v6.js?v=20261018-3');
      const visitsCss=document.createElement('link');
      visitsCss.rel='stylesheet';visitsCss.href='./post-visits-v1.css?v=20261019-1';
      document.head.append(visitsCss);
      await load('./post-visits-v1.js?v=20261019-1');
      await load('./composition-v1.js?v=20261018-3');
      renderDirectAgents();
      await load('./prestation-share-v1.js?v=2');
      await load('./prestation-rules-v1.js?v=20261017-1');
      await load('./prestation-analysis-demo-v1.js?v=20261017-3');
      await load('./planning-pdf-import-v2.js?v=20261021-2');
      await load('./planning-cycle-v1.js?v=20261021-4');
      renderDirectAgents();
    }catch(err){
      document.querySelector('.voice-box')?.remove();
      renderDirectAgents();
      const status=document.querySelector('#status');
      if(status)status.textContent='MyTEAM chargé avec fonctions principales. Actualise si un module manque.';
      console.error(err)
    }finally{
      try{await load('./parif-plan-v1.js?v=20261018-11')}catch(error){console.error('Plan PARIF indisponible :',error)}
      try{await load('./mobile-shell-v1.js?v=20261019-1')}catch(error){console.error('Navigation mobile indisponible :',error)}
      try{await load('./today-operations-v1.js?v=20261019-1')}catch(error){console.error('Suivi quotidien indisponible :',error)}
      try{await load('./mobile-polish-v1.js?v=20261018-1')}catch(error){console.error('Fiches mobiles indisponibles :',error)}
      try{await load('./secure-backup-v1.js?v=20261020-2')}catch(error){console.error('Sauvegarde privée indisponible :',error)}
      try{await load('./cloud-sync-private-v1.js?v=3')}catch(error){console.error('Synchronisation privée indisponible :',error)}
      try{await load('./quick-entry-v1.js?v=20261018-1')}catch(error){console.error('Saisie prédictive indisponible :',error)}
      try{await load('./leave-board-photo-v1.js?v=20261018-1')}catch(error){console.error('Tableau des congés indisponible :',error)}
    }
  })();
})();
