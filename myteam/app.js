(()=>{
  const voiceBox=document.querySelector('.voice-box');
  if(voiceBox)voiceBox.style.display='none';
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Chargement impossible : '+src));document.head.appendChild(s)});
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const fmtDate=v=>{if(!v)return '?';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}`:v};
  const deletedNames=()=>{try{const d=JSON.parse(localStorage.getItem('myteam_deleted_agents_v1')||'[]');return new Set(Array.isArray(d)?d:[])}catch{return new Set()}};
  // Migration : annuler uniquement le retrait de KRIEG, qui reste en Team 3.
  // À exécuter avant le chargement de l'éditeur agents.
  try{
    const k='myteam_deleted_agents_v1';
    const entries=JSON.parse(localStorage.getItem(k)||'[]');
    if(Array.isArray(entries)){
      const filtered=entries.filter(name=>String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase()!=='krieg');
      if(filtered.length!==entries.length)localStorage.setItem(k,JSON.stringify(filtered));
    }
  }catch(error){console.warn('Migration statut KRIEG non appliquée',error)}

  const INTERVIEWS_KEY='myteam_leave_agent_interviews_v1';
  const WHATSAPP_KEY='myteam_whatsapp_group_members_v1';
  const whatsappMembers=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(WHATSAPP_KEY)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {}}
  };
  const WA_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="23" height="23" fill="currentColor"><path d="M12.04 2a9.96 9.96 0 0 0-8.56 15.08L2 22.7l5.76-1.51A9.98 9.98 0 1 0 12.04 2zm0 18.16c-1.62 0-3.21-.44-4.6-1.27l-.33-.2-3.43.9.92-3.34-.22-.34a8.12 8.12 0 0 1-1.25-4.36A8.89 8.89 0 1 1 12.04 20.16zm4.83-6.43c-.26-.13-1.52-.75-1.76-.84-.24-.09-.41-.13-.59.13-.17.26-.67.84-.82 1.01-.15.17-.3.2-.56.07-.26-.13-1.1-.4-2.09-1.28-.78-.69-1.3-1.54-1.45-1.8-.15-.26-.01-.4.11-.53l.39-.46c.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.06-.13-.59-1.42-.81-1.94-.21-.5-.43-.43-.59-.44h-.5c-.18 0-.46.07-.7.33-.24.26-.92.9-.92 2.19 0 1.29.94 2.53 1.07 2.71.13.17 1.85 2.82 4.48 3.96.63.27 1.12.43 1.5.55.63.2 1.2.17 1.65.1.5-.07 1.52-.62 1.74-1.22.22-.6.22-1.12.15-1.22-.06-.11-.23-.17-.49-.3z"/></svg>';
  const leaveInterviewStates=()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(INTERVIEWS_KEY)||'{}');
      return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    }catch{return {}}
  };
  const dayKey=()=>{
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  };

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
        sickEnd:p?.sickEnd||'',
        workerNumber:p?.workerNumber||''
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
        .ad-identity{display:flex;flex-direction:column;gap:3px;min-width:0}.ad-worker{font-size:11px;color:#bfcfe1;font-weight:650}.ad-team-tabs{display:flex;gap:7px;overflow:auto;padding:2px 0 12px;scrollbar-width:none}.ad-team-tab{white-space:nowrap;padding:11px 14px;border-radius:999px;background:#27364c;color:#fff;border:1px solid #46566c;font-weight:850}.ad-team-tab.active{background:#e76b24;border-color:#e76b24}
        .ad-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:8px}.ad-count{font-size:12px;color:#aebacc;text-align:right}
        #ad-search{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #61748b;background:#111928;color:#fff;font:inherit;margin:6px 0 10px}
        .ad-filters{display:flex;gap:7px;overflow:auto;padding-bottom:10px}.ad-filter{white-space:nowrap;padding:9px 11px;border-radius:999px;background:#27364c;color:#fff;border:0;font-weight:750}.ad-filter.active{background:#e76b24}
        #ad-list{display:grid;gap:8px}.ad-row{width:100%;display:flex;align-items:stretch;justify-content:space-between;gap:7px;text-align:left;padding:7px 9px;border-radius:14px;border:1px solid #3b4e66;background:#26354a;color:#fff}.ad-open{display:flex;align-items:center;justify-content:space-between;flex:1;min-width:0;gap:7px;padding:7px;background:transparent;border:0;border-radius:10px;color:inherit;text-align:left;cursor:pointer}.ad-open:focus-visible,.ad-leave-check:focus-within{outline:2px solid #ffb473;outline-offset:2px}.ad-name{font-weight:800;min-width:0;overflow-wrap:anywhere}.ad-row.female .ad-name{color:#ff7fbd}.ad-tags{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.ad-tag{padding:5px 8px;border-radius:999px;background:#1f7a4d;font-size:11px;font-weight:850}.ad-tag.pending{background:#665126}.ad-sick{background:#9d2f36}.ad-arrow{font-size:20px;color:#aebacc}.ad-empty{padding:16px;text-align:center;border-radius:12px;background:#202e42;color:#aebacc}
        .ad-wa-mark{display:flex;align-items:center;justify-content:center;flex:0 0 40px;width:40px;height:46px;align-self:center;padding:0;border:1px solid #728298;border-radius:12px;background:#34445a;color:#abb8c6;cursor:pointer;transition:background .12s,color .12s}
        .ad-wa-mark.is-member{background:#1f9e5c;border-color:#35c87b;color:#fff;position:relative}
        .ad-wa-mark.is-member:after{content:'🔒';font-size:12px;position:absolute;right:-5px;bottom:-5px;border-radius:50%;background:#111928;border:1px solid #86deb0;padding:2px}
        .ad-wa-mark:disabled{opacity:1;cursor:default}
        .ad-wa-detail{margin:10px 0 14px;padding:12px;border:1px solid #497a64;background:#173a31;border-radius:12px}
        .ad-wa-detail p{margin:4px 0 10px;line-height:1.5;font-size:13px;color:#e2efe9}
        .ad-wa-unlock{padding:10px 12px;background:#344e5c;border:1px solid #6d9a89;border-radius:9px;min-height:42px}
        .ad-wa-mark:focus-visible{outline:3px solid #f4c290;outline-offset:2px}
        .ad-wa-info{margin:0 0 8px;color:#b9d8c5;font-size:12px;line-height:1.5}
        .ad-leave-check{display:flex;align-items:center;justify-content:center;flex:0 0 95px;gap:5px;min-height:53px;padding:5px 4px;border-left:1px solid #526681;color:#cbd7e5;cursor:pointer;user-select:none}.ad-leave-check input{appearance:auto!important;width:21px!important;height:21px!important;flex:0 0 21px;accent-color:#47c895;cursor:pointer}.ad-check-text{font-size:11px;line-height:1.25;font-weight:800}.ad-leave-check.is-done{color:#93f0c0}.ad-interview-info{margin:2px 0 9px;color:#c8d6e6;font-size:12px;line-height:1.5}
        @media(max-width:420px){.ad-row{padding:5px;gap:4px}.ad-leave-check{flex-basis:86px}.ad-check-text{font-size:10px}.ad-open{gap:5px;padding:6px}.ad-tag{font-size:10px;padding:4px 6px}}
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
        <button class="ad-filter" data-ad-filter="toask" type="button">Congés : à interroger</button>
        <button class="ad-filter" data-ad-filter="asked" type="button">Congés : interrogés</button>
        <button class="ad-filter" data-ad-filter="waconfirmed" type="button">WhatsApp : confirmés</button>
        <button class="ad-filter" data-ad-filter="watocheck" type="button">WhatsApp : à vérifier</button>
      </div>
      <p id="ad-interview-info" class="ad-interview-info" role="status"></p>
      <p id="ad-wa-info" class="ad-wa-info" role="status"></p>
      <div id="ad-list"></div>`;
      const first=section.querySelector('p');
      if(first)first.before(box);else section.prepend(box);
    }

    let team=Number(box.dataset.activeTeam||4);
    let filter=box.dataset.activeFilter||'all';
    const search=box.querySelector('#ad-search'),list=box.querySelector('#ad-list'),count=box.querySelector('#ad-count'),heading=box.querySelector('#ad-title');

    const draw=()=>{
      const all=currentRoster(team);
      const interviewed=leaveInterviewStates();
      const members=whatsappMembers();
      const isAsked=name=>interviewed[name]?.done===true;
      const isWhatsappMember=name=>members[name]?.member===true;
      const askedCount=all.filter(a=>isAsked(a.name)).length;
      const waCount=all.filter(a=>isWhatsappMember(a.name)).length;
      const q=(search.value||'').trim().toLocaleLowerCase('fr');
      const visible=all.filter(a=>{
        const searchOk=!q||a.name.toLocaleLowerCase('fr').includes(q)||String(a.workerNumber).includes(q);
        const filterOk=filter==='all'||(filter==='rx'&&a.rx===true)||(filter==='piste'&&a.piste===true)||(filter==='unknown'&&(typeof a.rx!=='boolean'||typeof a.piste!=='boolean'))||(filter==='asked'&&isAsked(a.name))||(filter==='toask'&&!isAsked(a.name))||(filter==='waconfirmed'&&isWhatsappMember(a.name))||(filter==='watocheck'&&!isWhatsappMember(a.name));
        return searchOk&&filterOk;
      });
      const women=all.filter(a=>a.gender==='F').length,men=all.filter(a=>a.gender==='M').length;
      const pending=all.filter(a=>typeof a.rx!=='boolean'||typeof a.piste!=='boolean').length;
      heading.textContent=`Team ${team} — ordre alphabétique`;
      count.textContent=`${all.length} agents • ${women} F • ${men} H${pending?` • ${pending} à compléter`:''}`;
      box.querySelector('#ad-interview-info').textContent=`Suivi congés : ${askedCount}/${all.length} agents interrogés · ${all.length-askedCount} restant(s). Coche après l’échange ; la date est conservée. La coche ne vaut pas validation des congés.`;
      box.querySelector('#ad-wa-info').textContent=`Groupe WhatsApp : ${waCount}/${all.length} présences confirmées · ${all.length-waCount} à vérifier. Icône verte + cadenas = présence confirmée et verrouillée ; grise = à vérifier. Pour corriger : ouvrir la fiche de l’agent.`;
      list.innerHTML=visible.length?visible.map(a=>`<div class="ad-row${a.gender==='F'?' female':''}">
        <button type="button" class="ad-open" data-ad-name="${esc(a.name)}" aria-label="Ouvrir la fiche de ${esc(a.name)}">
          <span class="ad-identity"><span class="ad-name">${esc(a.name)}</span>${a.workerNumber?`<span class="ad-worker">Mat. ${esc(a.workerNumber)}</span>`:''}</span>
          <span class="ad-tags">${a.rx===true?'<span class="ad-tag">RX</span>':''}${a.piste===true?'<span class="ad-tag">PISTE</span>':''}${(typeof a.rx!=='boolean'||typeof a.piste!=='boolean')?'<span class="ad-tag pending">À compléter</span>':''}${a.sickActive?`<span class="ad-tag ad-sick">🩺 ${fmtDate(a.sickEnd)}</span>`:''}<span class="ad-arrow">›</span></span>
        </button>
        <button type="button" class="ad-wa-mark${isWhatsappMember(a.name)?' is-member':''}" data-ad-whatsapp="${esc(a.name)}" aria-pressed="${isWhatsappMember(a.name)}" ${isWhatsappMember(a.name)?'disabled':''} aria-label="${isWhatsappMember(a.name)?'Présence confirmée et verrouillée':'Confirmer la présence'} dans le groupe WhatsApp : ${esc(a.name)}" title="${isWhatsappMember(a.name)?'Présence WhatsApp verrouillée · confirmation manuelle le '+(members[a.name]?.checkedOn||'date inconnue')+' · correction depuis la fiche agent':'Présence dans le groupe WhatsApp non vérifiée'}">
          ${WA_ICON}
        </button>
        <label class="ad-leave-check${isAsked(a.name)?' is-done':''}" title="${isAsked(a.name)?'Interrogé le '+fmtDate(interviewed[a.name].date):'Agent non interrogé pour les congés'}">
          <input type="checkbox" data-ad-interview="${esc(a.name)}" aria-label="Interrogé pour les congés : ${esc(a.name)}" ${isAsked(a.name)?'checked':''}>
          <span class="ad-check-text">${isAsked(a.name)?'Interrogé ✓':'À interroger'}${isAsked(a.name)&&interviewed[a.name].date?'<br>'+fmtDate(interviewed[a.name].date):''}</span>
        </label>
      </div>`).join(''):'<div class="ad-empty">Aucun agent dans ce filtre.</div>';
      list.querySelectorAll('[data-ad-whatsapp]').forEach(button=>button.onclick=()=>{
        const name=button.dataset.adWhatsapp,states=whatsappMembers();
        if(states[name]?.member===true)return; // Une confirmation ne peut être retirée ici.
        states[name]={member:true,checkedOn:dayKey()};
        try{localStorage.setItem(WHATSAPP_KEY,JSON.stringify(states));draw();}
        catch{
          button.title='Enregistrement WhatsApp impossible : stockage indisponible';
          box.querySelector('#ad-wa-info').textContent='Impossible d’enregistrer la présence WhatsApp sur cet appareil.';
        }
      });
      list.querySelectorAll('[data-ad-interview]').forEach(box=>box.onchange=()=>{
        const name=box.dataset.adInterview;
        const state=leaveInterviewStates();
        const before=localStorage.getItem(INTERVIEWS_KEY);
        if(box.checked)state[name]={done:true,date:dayKey()};
        else delete state[name];
        try{localStorage.setItem(INTERVIEWS_KEY,JSON.stringify(state));draw();}
        catch{box.checked=!box.checked;box.closest('label').title='Enregistrement impossible : stockage local indisponible';if(before===null)console.warn('Suivi congés non enregistré');}
      });
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
    setupWhatsappDetail();
  }

  // La correction volontaire d'une confirmation verrouillée se fait uniquement
  // depuis la fiche de l'agent, après une confirmation explicite.
  function setupWhatsappDetail(){
    const select=document.querySelector('#agent-select');
    const detail=document.querySelector('#agent-detail');
    const heading=document.querySelector('#agent-title');
    if(!select||!detail||!heading||detail.querySelector('#ad-wa-detail'))return;
    const panel=document.createElement('div');
    panel.id='ad-wa-detail';panel.className='ad-wa-detail';panel.hidden=true;
    const info=document.createElement('p');
    const action=document.createElement('button');
    action.type='button';action.className='ad-wa-unlock';
    action.textContent='Corriger la confirmation WhatsApp';
    panel.append(info,action);
    heading.after(panel);
    const refresh=()=>{
      const agent=select.value,entry=whatsappMembers()[agent];
      panel.hidden=!agent;
      if(!agent)return;
      if(entry?.member===true){
        info.textContent='WhatsApp : présence confirmée et verrouillée'+
          (entry.checkedOn?' le '+fmtDate(entry.checkedOn):'')+
          '. Pour retirer une confirmation erronée, utilise le bouton ci-dessous.';
        action.hidden=false;
      }else{
        info.textContent='WhatsApp : présence non confirmée. Utilise l’icône grise dans la liste pour la confirmer et la verrouiller.';
        action.hidden=true;
      }
    };
    action.onclick=()=>{
      const name=select.value;
      const members=whatsappMembers();
      if(!name||members[name]?.member!==true)return;
      if(!confirm('Retirer la confirmation verrouillée de présence WhatsApp pour '+name+' ? Cette correction nécessitera une nouvelle validation depuis la liste.'))return;
      delete members[name];
      try{
        localStorage.setItem(WHATSAPP_KEY,JSON.stringify(members));
        refresh();
        renderDirectAgents();
      }catch{
        info.textContent='Impossible de corriger la confirmation : enregistrement local indisponible.';
      }
    };
    select.addEventListener('change',refresh);
    new MutationObserver(refresh).observe(heading,{childList:true,characterData:true,subtree:true});
    refresh();
  }
  window.renderMyTeamAgentList=renderDirectAgents;

  (async()=>{
    try{
      await load('./pwa-install-v1.js?v=20261017-1');
      await load('../team4/app.js?v=20261026-2');
      document.querySelector('.voice-box')?.remove();
      await load('./hours-v1.js?v=20261021-4');
      await load('./salary-forecast-v3.js?v=20261027-1');
      await load('./agents-migration-v3.js?v=20261023-1');
      await load('./roster-v6.js?v=20261023-2');
      const visitsCss=document.createElement('link');
      visitsCss.rel='stylesheet';visitsCss.href='./post-visits-v1.css?v=20261019-1';
      document.head.append(visitsCss);
      await load('./post-visits-v1.js?v=20261019-1');
      await load('./composition-v1.js?v=20261026-2');
      renderDirectAgents();
      await load('./prestation-share-v1.js?v=2');
      await load('./prestation-rules-v1.js?v=20261017-1');
      await load('./prestation-analysis-demo-v1.js?v=20261017-3');
      await load('./planning-pdf-import-v2.js?v=20261021-2');
      await load('./planning-cycle-v1.js?v=20261029-4');
      renderDirectAgents();
    }catch(err){
      document.querySelector('.voice-box')?.remove();
      renderDirectAgents();
      const status=document.querySelector('#status');
      if(status)status.textContent='MyTEAM chargé avec fonctions principales. Actualise si un module manque.';
      console.error(err)
    }finally{
      try{await load('./parif-plan-v1.js?v=20261018-11')}catch(error){console.error('Plan PARIF indisponible :',error)}
      try{await load('./mobile-shell-v1.js?v=20261029-1')}catch(error){console.error('Navigation mobile indisponible :',error)}
      try{await load('./today-operations-v1.js?v=20261019-1')}catch(error){console.error('Suivi quotidien indisponible :',error)}
      try{await load('./mobile-polish-v1.js?v=20261018-1')}catch(error){console.error('Fiches mobiles indisponibles :',error)}
      try{await load('./secure-backup-v1.js?v=20261020-2')}catch(error){console.error('Sauvegarde privée indisponible :',error)}
      try{await load('./cloud-sync-private-v1.js?v=3')}catch(error){console.error('Synchronisation privée indisponible :',error)}
      try{await load('./quick-entry-v1.js?v=20261018-1')}catch(error){console.error('Saisie prédictive indisponible :',error)}
      try{await load('./leave-board-photo-v1.js?v=20261018-1')}catch(error){console.error('Tableau des congés indisponible :',error)}
      try{await load('./agent-leave-tracking-v1.js?v=20261023-10')}catch(error){console.error('Suivi des congés par agent indisponible :',error)}
      try{await load('./leave-recap-v1.js?v=20261023-7')}catch(error){console.error('Récapitulatif des congés indisponible :',error)}
      try{await load('./bureau-planning-errors-v1.js?v=20261028-3')}catch(error){console.error('Bureau MyTEAM et erreurs planning indisponibles :',error)}
      try{await load('./workspaces-v1.js?v=20261023-6')}catch(error){console.error('Regroupement des espaces MyTEAM indisponible :',error)}
      try{await load('./priority-panato-pay-v1.js?v=20261023-1')}catch(error){console.error('Dossier prioritaire PANATO non disponible :',error)}
      try{await load('./startup-reminders-v1.js?v=20261028-1')}catch(error){console.error('Rappels de démarrage indisponibles :',error)}
      try{await load('./planning-followup-simple-v1.js?v=20261028-3')}catch(error){console.error('Suivi simplifié des plannings indisponible :',error)}
      try{await load('./agent-annual-calendar-v1.js?v=20261028-2')}catch(error){console.error('Agenda annuel des agents indisponible :',error)}
      try{await load('./supervisors-rota-v1.js?v=20261029-4')}catch(error){console.error('Agenda des superviseurs indisponible :',error)}
    }
  })();
})();
