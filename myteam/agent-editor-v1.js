(()=>{
  let tries=0;
  const DELETED_KEY='myteam_deleted_agents_v1';
  let deletedNames=[];
  try{const d=JSON.parse(localStorage.getItem(DELETED_KEY)||'[]');if(Array.isArray(d))deletedNames=d.filter(x=>typeof x==='string')}catch{}
  const deletedSet=new Set(deletedNames);

  const baseNames=new Set([
    'ADAM Manon','BORGESE Myriam','DAL FARRA Shirley',"D'AVERSI Margaux",'DIELS Elisa','GAGNANT Deborah','GARCIA Maeva','LUCK Océane','OUINNE Melyse','WILTGEN Ophélie',
    'BERAUT Geoffrey','BIGONI-HOUDUSSE Alexandre','BILOCQ Julien','BURG Jeremy','CLESEUR Noah','DORRION Albert','FREZAL Joey','HENRAT Corentin','HUMMEL Aurelien','JACOTEZ Tim','MATEI Vitor','PANATO Joey','SANDSTROM Mike','SCARPINO Loic','STASIAK Valentin','TUMMINELLI Attilio','WILLEMS Jeremy'
  ]);

  const prestationSeed=[
    {name:'DACHOUFF Michael',workerNumber:'4216'},
    {name:"KOUAHO N'TAKPE Come Landry",workerNumber:'12763'},
    {name:'FINCK Carole',workerNumber:'12814',gender:'F'},
    {name:'MOUDEBER Ryan',workerNumber:'11499',gender:'M'},
    {name:'SCHMID Sebastien',workerNumber:'6065'},
    {name:'JULIA Melissa',workerNumber:'13203'},
    {name:'FRIESS SCHAEFFER Killian',workerNumber:'12813'},
    {name:'JACQUET Evan',workerNumber:'13333'},
    {name:'KIRSCHSTETTER Teddy',workerNumber:'12657'},
    {name:'KERGOAT Maxime',workerNumber:'13456'},
    {name:'MUNIER Eva',workerNumber:'13457'},
    {name:'MARINI Katia',workerNumber:'3359'},
    {name:'ANTONIOL Christophe',workerNumber:'13042'},
    {name:'SAUTEZ Jerome',workerNumber:'4605'},
    {name:'MIGNOT Auriane',workerNumber:'12981'},
    {name:'HILT Killian',workerNumber:'12762'},
    {name:'DOS SANTOS MARTINS Anabela',workerNumber:'4984'},
    {name:'LONGLY Lucie',workerNumber:'12373'},
    {name:'LALLOZ Steven',workerNumber:'12804',gender:'M'},
    {name:'KESSLER Jordan',workerNumber:'13254'},
    {name:'KARASU Laetitia',workerNumber:'11648'},
    {name:'BERNARD Noelya',workerNumber:'13130'},
    {name:'BRIDELANCE Damien',workerNumber:'11688'},
    {name:'VERDIN Romain',workerNumber:'13335'},
    {name:'FELTEN Laurent',workerNumber:'12856'},
    {name:'YOVE Rénaldo',workerNumber:'13332'},
    {name:'MIANO Marie',workerNumber:'10399'},
    {name:'LAMBERT Valentin',workerNumber:'12305'},
    {name:'SEBRIER Kevin',workerNumber:'12803'},
    {name:'TRIPODI Adrien',workerNumber:'11682'},
    {name:'FROUSSART Lucas',workerNumber:'12820'},
    {name:'GARRABI Omar',workerNumber:'11784'},
    {name:'MAILLOT Jean Gabriel Axel',workerNumber:'4776'},
    {name:'BODEVING Patrick',workerNumber:'10171'},
    {name:'SERJANTU Andrian',workerNumber:'12810'},
    {name:'RODRIGUEZ Mathias',workerNumber:'12375'},
    {name:'LEBRUN Celine',workerNumber:'10175'},
    {name:'RIBU Cassandra',workerNumber:'13136'},
    {name:'HANCE Clotilde',workerNumber:'13455'}
  ];

  const normalizeName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const refreshMainList=()=>{try{window.renderMyTeamAgentList?.()}catch{}};
  const saveDeleted=()=>{try{localStorage.setItem(DELETED_KEY,JSON.stringify([...deletedSet]))}catch{}};
  const fmtDate=v=>{if(!v)return '?';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}`:v};

  function pruneDeleted(){
    let changed=false;
    for(const name of Object.keys(agentProfiles)){
      if(deletedSet.has(name)){delete agentProfiles[name];changed=true}
    }
    if(changed){try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles))}catch{}}
  }

  function seedPrestationAgents(){
    const deletedNormalized=new Set([...deletedSet].map(normalizeName));
    const known=new Map(Object.keys(agentProfiles).map(name=>[normalizeName(name),name]));
    let added=0;
    for(const a of prestationSeed){
      const key=normalizeName(a.name);
      if(deletedNormalized.has(key))continue;
      if(known.has(key)){
        const existing=known.get(key),p=agentProfiles[existing]||{};
        if(!p.workerNumber&&a.workerNumber)p.workerNumber=a.workerNumber;
        if(!p.gender&&a.gender)p.gender=a.gender;
        continue;
      }
      agentProfiles[a.name]={
        gender:a.gender||'',
        team:0,
        rxCertified:undefined,
        pistePermit:undefined,
        workerNumber:a.workerNumber||'',
        prestationAdded:true,
        sourceNote:'Ajouté depuis la fiche de prestation du 20/06/2026'
      };
      known.set(key,a.name);
      added++;
    }
    if(added){try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles))}catch{}}
    return added;
  }

  function init(){
    tries++;
    if(typeof agentProfiles==='undefined'||typeof renderAgents!=='function'||typeof agentSelect==='undefined'){
      if(tries<30)setTimeout(init,150);
      return;
    }
    const addBtn=document.querySelector('#agent-add');
    const nameInput=document.querySelector('#agent-name');
    const detail=document.querySelector('#agent-detail');
    if(!addBtn||!nameInput||!detail){if(tries<30)setTimeout(init,150);return;}
    if(document.querySelector('#agent-create-extra'))return;

    pruneDeleted();
    const seeded=seedPrestationAgents();
    renderAgents();
    refreshMainList();

    const createBox=document.createElement('div');
    createBox.id='agent-create-extra';
    createBox.innerHTML=`<style>
      #agent-create-extra{background:#24344b;border:1px solid #3a4a60;border-radius:14px;padding:12px;margin:8px 0 10px}
      #agent-create-extra .ae-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px}
      #agent-create-extra select{width:100%;padding:11px;border-radius:10px;background:#111928;color:#fff;border:1px solid #65758a}
      #agent-create-extra label{display:block;font-size:13px}
      #agent-create-extra .ae-checks{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px}
      #agent-create-extra input[type=checkbox]{transform:scale(1.2);margin-right:6px}
      #agent-manual-list{margin:12px 0}.ae-added{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#26354a;border:1px solid #3b4e66;border-radius:12px;padding:10px 12px;margin:7px 0}.ae-added-name{font-weight:800}.ae-added.female .ae-added-name{color:#ff7fbd}.ae-tags{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.ae-tag{padding:4px 7px;border-radius:999px;background:#1f7a4d;font-size:10px;font-weight:800}.ae-team{background:#46566c}.ae-source{background:#7c5a1c}.ae-sick{background:#9d2f36}
      .ae-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:8px 0 12px}.ae-edit-grid select,.ae-sick-box input[type=date]{width:100%;padding:11px;background:#111928;color:#fff;border:1px solid #65758a;border-radius:10px}
      .ae-sick-box{background:#2a3342;border:1px solid #59677a;border-radius:12px;padding:12px;margin:10px 0}.ae-sick-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ae-sick-box label{display:block;margin-top:9px}.ae-sick-box input[type=checkbox]{transform:scale(1.25);margin-right:7px}.ae-sick-state{font-weight:800}.ae-danger-row{display:flex;justify-content:flex-end;margin:12px 0}.ae-delete{background:#9d2f36!important}.ae-help{font-size:12px;color:#aebacc;margin:6px 0 0}
      @media(max-width:520px){#agent-create-extra .ae-grid,.ae-edit-grid{grid-template-columns:1fr}}
    </style>
    <strong>Qualifications du nouvel agent</strong>
    <div class="ae-grid">
      <label>Sexe<select id="agent-new-gender"><option value="">Non renseigné</option><option value="F">Femme</option><option value="M">Homme</option></select></label>
      <label>Équipe<select id="agent-new-team"><option value="4">Équipe 4</option><option value="1">Équipe 1</option><option value="2">Équipe 2</option><option value="3">Équipe 3</option><option value="0">Autre / inconnue</option></select></label>
    </div>
    <div class="ae-checks"><label><input id="agent-new-rx" type="checkbox"> RX certifié</label><label><input id="agent-new-piste" type="checkbox"> Permis piste</label></div>`;
    addBtn.before(createBox);
    addBtn.textContent='➕ Ajouter l’agent';

    const manualWrap=document.createElement('div');
    manualWrap.id='agent-manual-list';
    addBtn.after(manualWrap);

    const editBox=document.createElement('div');
    editBox.className='ae-edit-grid';
    editBox.innerHTML=`<label>Sexe<select id="agent-edit-gender"><option value="">Non renseigné</option><option value="F">Femme</option><option value="M">Homme</option></select></label><label>Équipe<select id="agent-edit-team"><option value="4">Équipe 4</option><option value="1">Équipe 1</option><option value="2">Équipe 2</option><option value="3">Équipe 3</option><option value="0">Autre / inconnue</option></select></label>`;
    const qualSummary=document.querySelector('#agent-qual-summary');
    if(qualSummary)qualSummary.after(editBox);else detail.prepend(editBox);

    const sickBox=document.createElement('div');
    sickBox.className='ae-sick-box';
    sickBox.innerHTML=`<div class="ae-sick-head"><strong>🩺 Arrêt de travail</strong><span id="agent-sick-state" class="ae-sick-state"></span></div><label><input id="agent-sick-active" type="checkbox"> Agent actuellement en arrêt</label><label>Date de fin si connue <input id="agent-sick-end" type="date"></label><p class="ae-help">Si la date de fin n'est pas connue, laisse le champ vide : la liste affichera 🩺 ?.</p>`;
    editBox.after(sickBox);

    const danger=document.createElement('div');
    danger.className='ae-danger-row';
    danger.innerHTML='<button type="button" id="agent-delete" class="ae-delete">🗑️ Supprimer l’agent du groupe</button>';
    const statusEl=document.querySelector('#agent-status');
    if(statusEl)statusEl.before(danger);else detail.append(danger);

    const gEdit=document.querySelector('#agent-edit-gender');
    const tEdit=document.querySelector('#agent-edit-team');
    const sickActive=document.querySelector('#agent-sick-active');
    const sickEnd=document.querySelector('#agent-sick-end');
    const sickState=document.querySelector('#agent-sick-state');
    const deleteBtn=document.querySelector('#agent-delete');

    function persist(){try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles));return true}catch{return false}}
    function resetCreate(){nameInput.value='';document.querySelector('#agent-new-gender').value='';document.querySelector('#agent-new-team').value='4';document.querySelector('#agent-new-rx').checked=false;document.querySelector('#agent-new-piste').checked=false}
    function sickLabel(p){return p?.sickActive===true?`🩺 ${fmtDate(p.sickEnd)}`:''}
    function drawManual(){
      const rows=Object.entries(agentProfiles).filter(([name,p])=>p?.manualAdded===true||p?.prestationAdded===true||!baseNames.has(name)).sort((a,b)=>a[0].localeCompare(b[0],'fr',{sensitivity:'base'}));
      if(!rows.length){manualWrap.innerHTML='';return;}
      manualWrap.innerHTML='<strong>Agents ajoutés</strong>'+rows.map(([name,p])=>`<button type="button" class="ae-added${p.gender==='F'?' female':''}" data-ae-open="${name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><span class="ae-added-name">${name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><span class="ae-tags">${p.gender==='F'?'<span class="ae-tag">F</span>':p.gender==='M'?'<span class="ae-tag">H</span>':''}${p.rxCertified===true?'<span class="ae-tag">RX</span>':''}${p.pistePermit===true?'<span class="ae-tag">PISTE</span>':''}${p.sickActive===true?`<span class="ae-tag ae-sick">${sickLabel(p)}</span>`:''}${p.prestationAdded?'<span class="ae-tag ae-source">PRESTA</span>':''}<span class="ae-tag ae-team">Éq. ${p.team||'?'}</span></span></button>`).join('');
      manualWrap.querySelectorAll('[data-ae-open]').forEach(b=>b.onclick=()=>{agentSelect.value=b.dataset.aeOpen;agentSelect.dispatchEvent(new Event('change'));detail.scrollIntoView({behavior:'smooth',block:'start'})});
    }
    function updateSickState(){
      if(!sickState)return;
      sickState.textContent=sickActive.checked?`🩺 ${sickEnd.value?`fin ${fmtDate(sickEnd.value)}`:'?'}`:'';
      sickEnd.disabled=!sickActive.checked;
    }
    function loadEdit(){
      const p=agentProfiles[agentSelect.value];
      if(!p)return;
      gEdit.value=['F','M'].includes(p.gender)?p.gender:'';
      const team=Number(p.team);
      tEdit.value=[1,2,3,4].includes(team)?String(team):'0';
      sickActive.checked=p.sickActive===true;
      sickEnd.value=p.sickEnd||'';
      updateSickState();
    }
    agentSelect.addEventListener('change',loadEdit);
    sickActive.addEventListener('change',updateSickState);
    sickEnd.addEventListener('input',updateSickState);

    addBtn.onclick=()=>{
      const name=nameInput.value.trim();
      if(!name||name.length>100){alert('Saisis un nom ou identifiant valide.');return}
      if(agentProfiles[name]){
        agentSelect.value=name;agentSelect.dispatchEvent(new Event('change'));
        const s=document.querySelector('#agent-status');if(s)s.textContent='Cet agent existe déjà. Tu peux modifier ses qualifications ci-dessous.';
        detail.scrollIntoView({behavior:'smooth',block:'start'});return;
      }
      deletedSet.delete(name);saveDeleted();
      const team=Number(document.querySelector('#agent-new-team').value);
      agentProfiles[name]={gender:document.querySelector('#agent-new-gender').value,team:team||0,rxCertified:document.querySelector('#agent-new-rx').checked,pistePermit:document.querySelector('#agent-new-piste').checked,manualAdded:true,sickActive:false,sickEnd:''};
      if(!persist()){alert('Enregistrement local impossible.');delete agentProfiles[name];return}
      renderAgents(name);resetCreate();drawManual();loadEdit();refreshMainList();
      const s=document.querySelector('#agent-status');if(s)s.textContent='Agent ajouté avec ses qualifications sur cet appareil.';
      detail.classList.remove('hidden');detail.scrollIntoView({behavior:'smooth',block:'start'});
    };

    const saveBtn=document.querySelector('#agent-save');
    if(saveBtn)saveBtn.addEventListener('click',()=>{
      const name=agentSelect.value,p=agentProfiles[name];if(!name||!p)return;
      p.gender=gEdit.value;
      p.team=Number(tEdit.value)||0;
      p.sickActive=sickActive.checked;
      p.sickEnd=sickActive.checked?(sickEnd.value||''):'';
      p.manualAdded=p.manualAdded===true||(!baseNames.has(name)&&!p.prestationAdded);
      persist();drawManual();refreshMainList();updateSickState();
      const summary=document.querySelector('#agent-qual-summary');
      if(summary)summary.textContent=(p.gender==='F'?'Femme':p.gender==='M'?'Homme':'Genre non renseigné')+' • '+(p.rxCertified?'RX ✓':'RX non indiqué')+' • '+(p.pistePermit?'Permis piste ✓':'Permis non indiqué');
    });

    deleteBtn.addEventListener('click',()=>{
      const name=agentSelect.value;
      if(!name||!agentProfiles[name])return;
      if(!confirm(`Supprimer ${name} du groupe ?\n\nSa fiche locale sera supprimée. Tu pourras le recréer manuellement plus tard.`))return;
      deletedSet.add(name);saveDeleted();
      delete agentProfiles[name];persist();
      renderAgents();drawManual();refreshMainList();
      detail.classList.add('hidden');
      const s=document.querySelector('#agent-import-status');if(s)s.textContent=`${name} a été supprimé du groupe.`;
    });

    drawManual();loadEdit();refreshMainList();
    const s=document.querySelector('#agent-import-status');
    if(s&&seeded)s.textContent=`${seeded} agents absents ajoutés depuis la fiche de prestation du 20/06/2026. Qualifications non déduites sauf sexe explicitement indiqué par le poste E32.`;
  }
  init();
})();