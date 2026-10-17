(()=>{
  const section=document.querySelector('#prestation');
  if(!section)return;

  const STORE='myteam.prestationAnalyses.v1';
  const SEEDED='myteam.prestationDemoSeeded.v1';
  const demo={
    id:'2026-06-20-demo',
    date:'20/06/2026',
    title:'Analyse prestation — 20/06/2026',
    subtitle:'Test importé depuis la fiche fournie',
    rows:[
      {status:'warn',post:'E32 matin',detail:'04:00–13:30 • FINCK Carole + MOUDEBER Ryan • 2 agents. Mixité / RX à confirmer avec les profils agents.'},
      {status:'warn',post:'E32 midi',detail:'13:30–22:45 • DIELS Elisa + LALLOZ Steven. E32 13:30–22:00 + Extra E30 22:00–22:45 fusionnés. DIELS = F ; LALLOZ non référencé ; RX à confirmer.'},
      {status:'ok',post:'E14 matin',detail:'06:00–14:00 • BILOCQ Julien + MUNIER Eva • 2 agents. BILOCQ = H + RX + permis piste : exigences connues couvertes.'},
      {status:'warn',post:'E14 midi',detail:'14:00–22:00 • FELTEN Laurent + YOVE Rénaldo • 2 agents. Sexe / permis piste à confirmer.'},
      {status:'warn',post:'E14 nuit',detail:'22:00–06:00 • BODEVING Patrick + SERJANTU Andrian • 2 agents. Sexe / permis piste à confirmer.'},
      {status:'warn',post:'E84 matin',detail:'06:00–14:00 • MARINI Katia + ANTONIOL Christophe + SAUTEZ Jérôme X-Ray • 3 agents. Mixité / RX à confirmer dans la base agents.'},
      {status:'ok',post:'E84 midi',detail:'14:00–22:00 • BIGONI-HOUDUSSE Alexandre + MIANO Marie + BORGESE Myriam X-Ray • 3 agents. BIGONI = H/RX ; BORGESE = F/RX/PISTE : exigences connues couvertes.'},
      {status:'warn',post:'E84 nuit',detail:'22:00–06:00 • RODRIGUEZ Mathias + LEBRUN Céline + RIBU Cassandra X-Ray • 3 agents. Mixité / RX à confirmer dans la base agents.'},
      {status:'warn',post:'E85 06:00–13:00',detail:'MIGNOT Auriane + HILT Killian X-Ray • 2 agents. Mixité / RX à confirmer.'},
      {status:'warn',post:'E85 13:00–14:00',detail:'MIGNOT Auriane + BERAUT Geoffrey X-Ray • relais détecté à 13:00. BERAUT = H/RX/PISTE ; profil MIGNOT à confirmer.'},
      {status:'ok',post:'E85 14:00–22:00',detail:'GAGNANT Deborah + BERAUT Geoffrey X-Ray • GAGNANT = F/RX/PISTE ; BERAUT = H/RX/PISTE : exigences connues couvertes.'},
      {status:'warn',post:'E85 nuit',detail:'22:00–06:00 • HANCE Clotilde + SANDSTRÖM Mike X-Ray • SANDSTRÖM = H/RX ; profil HANCE à confirmer.'},
      {status:'ok',post:'E112 / ECO',detail:'Aucune ligne sur la fiche. Le 20/06/2026 est un samedi : poste fermé le week-end selon la règle enregistrée.'},
      {status:'neutral',post:'PARIF / PIF / Chef / K9',detail:'Aucune règle de contrôle détaillée enregistrée pour ces postes : affichés sans conclusion automatique.'}
    ]
  };

  let analyses=[];
  try{analyses=JSON.parse(localStorage.getItem(STORE)||'[]')}catch{analyses=[]}
  if(!Array.isArray(analyses))analyses=[];
  if(!localStorage.getItem(SEEDED)){
    analyses.unshift(demo);
    localStorage.setItem(STORE,JSON.stringify(analyses));
    localStorage.setItem(SEEDED,'1');
  }

  const wrap=document.createElement('div');
  wrap.id='prestation-analyses';
  wrap.innerHTML=`<style>
    #prestation-analyses{margin:14px 0}.pa-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.pa-count{font-size:12px;color:#aebacc}.pa-card{background:#24344b;border:1px solid #3a4a60;border-radius:15px;padding:14px;margin-bottom:12px}.pa-card h3{margin:0 0 4px;font-size:18px}.pa-sub{margin:0 0 12px;color:#aebacc;font-size:12px}.pa-list{display:grid;gap:8px}.pa-row{background:#111928;border-radius:11px;padding:10px 11px;border-left:4px solid #64748b}.pa-row.ok{border-left-color:#2ea66f}.pa-row.warn{border-left-color:#e5a748}.pa-row.neutral{border-left-color:#77869a}.pa-post{font-weight:800;margin-bottom:3px}.pa-detail{font-size:12px;line-height:1.45;color:#dbe3ed}.pa-actions{display:flex;justify-content:flex-end;margin-top:12px}.pa-delete{background:#9d2f36!important}.pa-empty{padding:14px;border-radius:12px;background:#24344b;color:#aebacc;text-align:center}
  </style><div class="pa-head"><strong>Analyses enregistrées</strong><span class="pa-count" id="pa-count"></span></div><div id="pa-list"></div>`;

  const note=document.querySelector('#prestation-note');
  if(note)note.before(wrap);else section.append(wrap);
  const list=wrap.querySelector('#pa-list');
  const count=wrap.querySelector('#pa-count');

  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  function save(){localStorage.setItem(STORE,JSON.stringify(analyses))}
  function draw(){
    count.textContent=analyses.length?`${analyses.length} fiche${analyses.length>1?'s':''}`:'';
    if(!analyses.length){list.innerHTML='<div class="pa-empty">Aucune analyse enregistrée.</div>';return;}
    list.innerHTML=analyses.map(a=>`<article class="pa-card" data-pa-id="${esc(a.id)}"><h3>${esc(a.title)}</h3><p class="pa-sub">${esc(a.subtitle||'')}</p><div class="pa-list">${(a.rows||[]).map(r=>`<div class="pa-row ${esc(r.status)}"><div class="pa-post">${r.status==='ok'?'🟢':r.status==='warn'?'🟠':'⚪'} ${esc(r.post)}</div><div class="pa-detail">${esc(r.detail)}</div></div>`).join('')}</div><div class="pa-actions"><button type="button" class="pa-delete" data-delete-id="${esc(a.id)}">🗑️ Delete</button></div></article>`).join('');
    list.querySelectorAll('[data-delete-id]').forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.deleteId;
      const item=analyses.find(a=>a.id===id);
      if(!item)return;
      if(!confirm(`Supprimer ${item.title} ?`))return;
      analyses=analyses.filter(a=>a.id!==id);
      save();draw();
      const status=document.querySelector('#prestation-status');
      if(status)status.textContent='Analyse supprimée de ce téléphone.';
    });
  }
  draw();
})();
