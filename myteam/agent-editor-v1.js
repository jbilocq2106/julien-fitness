(()=>{
  let tries=0;
  const baseNames=new Set([
    'ADAM Manon','BORGESE Myriam','DAL FARRA Shirley',"D'AVERSI Margaux",'DIELS Elisa','GAGNANT Deborah','GARCIA Maeva','LUCK Océane','OUINNE Melyse','WILTGEN Ophélie',
    'BERAUT Geoffrey','BIGONI-HOUDUSSE Alexandre','BILOCQ Julien','BURG Jeremy','CLESEUR Noah','DORRION Albert','FREZAL Joey','HENRAT Corentin','HUMMEL Aurelien','JACOTEZ Tim','MATEI Vitor','PANATO Joey','SANDSTROM Mike','SCARPINO Loic','STASIAK Valentin','TUMMINELLI Attilio','WILLEMS Jeremy'
  ]);

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

    const createBox=document.createElement('div');
    createBox.id='agent-create-extra';
    createBox.innerHTML=`<style>
      #agent-create-extra{background:#24344b;border:1px solid #3a4a60;border-radius:14px;padding:12px;margin:8px 0 10px}
      #agent-create-extra .ae-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px}
      #agent-create-extra select{width:100%;padding:11px;border-radius:10px;background:#111928;color:#fff;border:1px solid #65758a}
      #agent-create-extra label{display:block;font-size:13px}
      #agent-create-extra .ae-checks{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px}
      #agent-create-extra input[type=checkbox]{transform:scale(1.2);margin-right:6px}
      #agent-manual-list{margin:12px 0}.ae-added{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#26354a;border:1px solid #3b4e66;border-radius:12px;padding:10px 12px;margin:7px 0}.ae-added-name{font-weight:800}.ae-tags{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.ae-tag{padding:4px 7px;border-radius:999px;background:#1f7a4d;font-size:10px;font-weight:800}.ae-team{background:#46566c}
      .ae-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:8px 0 12px}.ae-edit-grid select{width:100%;padding:11px;background:#111928;color:#fff;border:1px solid #65758a;border-radius:10px}
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

    const gEdit=document.querySelector('#agent-edit-gender');
    const tEdit=document.querySelector('#agent-edit-team');

    function persist(){try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles));return true}catch{return false}}
    function resetCreate(){nameInput.value='';document.querySelector('#agent-new-gender').value='';document.querySelector('#agent-new-team').value='4';document.querySelector('#agent-new-rx').checked=false;document.querySelector('#agent-new-piste').checked=false}
    function drawManual(){
      const rows=Object.entries(agentProfiles).filter(([name,p])=>p?.manualAdded===true||!baseNames.has(name)).sort((a,b)=>a[0].localeCompare(b[0],'fr'));
      if(!rows.length){manualWrap.innerHTML='';return;}
      manualWrap.innerHTML='<strong>Agents ajoutés</strong>'+rows.map(([name,p])=>`<button type="button" class="ae-added" data-ae-open="${name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><span class="ae-added-name">${name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><span class="ae-tags">${p.gender==='F'?'<span class="ae-tag">F</span>':p.gender==='M'?'<span class="ae-tag">H</span>':''}${p.rxCertified?'<span class="ae-tag">RX</span>':''}${p.pistePermit?'<span class="ae-tag">PISTE</span>':''}<span class="ae-tag ae-team">Éq. ${p.team||'?'}</span></span></button>`).join('');
      manualWrap.querySelectorAll('[data-ae-open]').forEach(b=>b.onclick=()=>{agentSelect.value=b.dataset.aeOpen;agentSelect.dispatchEvent(new Event('change'));detail.scrollIntoView({behavior:'smooth',block:'start'})});
    }
    function loadEdit(){
      const p=agentProfiles[agentSelect.value];
      if(!p)return;
      gEdit.value=['F','M'].includes(p.gender)?p.gender:'';
      const team=Number(p.team);
      tEdit.value=[1,2,3,4].includes(team)?String(team):'0';
    }
    agentSelect.addEventListener('change',loadEdit);

    addBtn.onclick=()=>{
      const name=nameInput.value.trim();
      if(!name||name.length>100){alert('Saisis un nom ou identifiant valide.');return}
      if(agentProfiles[name]){
        agentSelect.value=name;agentSelect.dispatchEvent(new Event('change'));
        const s=document.querySelector('#agent-status');if(s)s.textContent='Cet agent existe déjà. Tu peux modifier ses qualifications ci-dessous.';
        detail.scrollIntoView({behavior:'smooth',block:'start'});return;
      }
      const team=Number(document.querySelector('#agent-new-team').value);
      agentProfiles[name]={gender:document.querySelector('#agent-new-gender').value,team:team||0,rxCertified:document.querySelector('#agent-new-rx').checked,pistePermit:document.querySelector('#agent-new-piste').checked,manualAdded:true};
      if(!persist()){alert('Enregistrement local impossible.');delete agentProfiles[name];return}
      renderAgents(name);resetCreate();drawManual();loadEdit();
      const s=document.querySelector('#agent-status');if(s)s.textContent='Agent ajouté avec ses qualifications sur cet appareil.';
      detail.classList.remove('hidden');detail.scrollIntoView({behavior:'smooth',block:'start'});
    };

    const saveBtn=document.querySelector('#agent-save');
    if(saveBtn)saveBtn.addEventListener('click',()=>{
      const name=agentSelect.value,p=agentProfiles[name];if(!name||!p)return;
      p.gender=gEdit.value;
      p.team=Number(tEdit.value)||0;
      p.manualAdded=p.manualAdded===true||!baseNames.has(name);
      persist();drawManual();
      const summary=document.querySelector('#agent-qual-summary');
      if(summary)summary.textContent=(p.gender==='F'?'Femme':p.gender==='M'?'Homme':'Genre non renseigné')+' • '+(p.rxCertified?'RX ✓':'RX non indiqué')+' • '+(p.pistePermit?'Permis piste ✓':'Permis non indiqué');
    });

    drawManual();loadEdit();
  }
  init();
})();