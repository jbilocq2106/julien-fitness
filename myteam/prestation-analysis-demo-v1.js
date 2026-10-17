(()=>{
  const section=document.querySelector('#prestation');
  if(!section)return;

  const STORE='myteam.prestationAnalyses.v1';
  const SEEDED='myteam.prestationDemoSeeded.v1';
  const CORR='myteam.prestationCorrections.v1';
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

  let corrections={};
  try{const c=JSON.parse(localStorage.getItem(CORR)||'{}');if(c&&typeof c==='object'&&!Array.isArray(c))corrections=c}catch{}
  window.myteamPrestationCorrections=corrections;

  const wrap=document.createElement('div');
  wrap.id='prestation-analyses';
  wrap.innerHTML=`<style>
    #prestation-analyses{margin:14px 0}.pa-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.pa-count{font-size:12px;color:#aebacc}.pa-card{background:#24344b;border:1px solid #3a4a60;border-radius:15px;padding:14px;margin-bottom:12px}.pa-card h3{margin:0 0 4px;font-size:18px}.pa-sub{margin:0 0 12px;color:#aebacc;font-size:12px}.pa-list{display:grid;gap:8px}.pa-row{background:#111928;border-radius:11px;border-left:4px solid #64748b;overflow:hidden}.pa-row.ok{border-left-color:#2ea66f}.pa-row.warn{border-left-color:#e5a748}.pa-row.bad{border-left-color:#e34b55}.pa-row.neutral{border-left-color:#77869a}.pa-row-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:transparent!important;color:inherit;border:0!important;padding:11px;box-shadow:none!important}.pa-post{font-weight:800}.pa-arrow{font-size:18px;color:#aebacc}.pa-detail{font-size:12px;line-height:1.45;color:#dbe3ed}.pa-explain{display:none;border-top:1px solid #33445b;padding:11px;background:#172235}.pa-row.open .pa-explain{display:block}.pa-why{margin:0 0 10px}.pa-legend{font-size:11px;color:#aebacc;margin:5px 0 10px}.pa-review{background:#202e42;border-radius:10px;padding:10px;margin-top:9px}.pa-review label{display:block;font-size:12px;margin:7px 0 4px}.pa-review select,.pa-review textarea{width:100%;box-sizing:border-box;padding:10px;border-radius:9px;border:1px solid #61748b;background:#0e1725;color:#fff;font:inherit}.pa-review textarea{min-height:76px;resize:vertical}.pa-review-check{display:flex!important;gap:7px;align-items:flex-start}.pa-review-check input{margin-top:3px}.pa-review-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.pa-review-actions button{padding:9px 11px}.pa-save-review{background:#1f7a4d!important}.pa-reset-review{background:#46566c!important}.pa-forget{background:#7c5a1c!important}.pa-reviewed{display:inline-block;margin-left:7px;padding:3px 6px;border-radius:999px;background:#315a82;font-size:10px}.pa-learned{display:inline-block;margin-left:7px;padding:3px 6px;border-radius:999px;background:#7c5a1c;font-size:10px}.pa-actions{display:flex;justify-content:flex-end;margin-top:12px}.pa-delete{background:#9d2f36!important}.pa-empty{padding:14px;border-radius:12px;background:#24344b;color:#aebacc;text-align:center}.pa-msg{font-size:12px;margin-top:7px;color:#aebacc}
  </style><div class="pa-head"><strong>Analyses enregistrées</strong><span class="pa-count" id="pa-count"></span></div><div id="pa-list"></div>`;

  const note=document.querySelector('#prestation-note');
  if(note)note.before(wrap);else section.append(wrap);
  const list=wrap.querySelector('#pa-list');
  const count=wrap.querySelector('#pa-count');
  let openKey='';

  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const postKey=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const icon=s=>s==='ok'?'🟢':s==='warn'?'🟠':s==='bad'?'🔴':'⚪';
  const label=s=>s==='ok'?'Conforme':s==='warn'?'À vérifier':s==='bad'?'Non conforme':'Sans conclusion';
  function save(){localStorage.setItem(STORE,JSON.stringify(analyses))}
  function saveCorrections(){localStorage.setItem(CORR,JSON.stringify(corrections));window.myteamPrestationCorrections=corrections}
  function effective(row){
    if(row.manualStatus)return {status:row.manualStatus,source:'manual'};
    const learned=corrections[postKey(row.post)];
    if(learned?.applyFuture===true&&learned.status)return {status:learned.status,source:'learned'};
    return {status:row.status||'neutral',source:'auto'};
  }
  function draw(){
    count.textContent=analyses.length?`${analyses.length} fiche${analyses.length>1?'s':''}`:'';
    if(!analyses.length){list.innerHTML='<div class="pa-empty">Aucune analyse enregistrée.</div>';return;}
    list.innerHTML=analyses.map(a=>`<article class="pa-card" data-pa-id="${esc(a.id)}"><h3>${esc(a.title)}</h3><p class="pa-sub">${esc(a.subtitle||'')}</p><div class="pa-list">${(a.rows||[]).map((r,i)=>{
      const key=`${a.id}:${i}`,eff=effective(r),learned=corrections[postKey(r.post)];
      const why=r.detail||'Aucun détail enregistré pour cette conclusion.';
      const justification=r.manualJustification||((eff.source==='learned'&&learned?.justification)?learned.justification:'');
      return `<div class="pa-row ${esc(eff.status)}${openKey===key?' open':''}" data-row-key="${esc(key)}">
        <button type="button" class="pa-row-btn" data-open-row="${esc(key)}"><span class="pa-post">${icon(eff.status)} ${esc(r.post)}${eff.source==='manual'?'<span class="pa-reviewed">corrigé</span>':eff.source==='learned'?'<span class="pa-learned">précédent appliqué</span>':''}</span><span class="pa-arrow">${openKey===key?'⌃':'›'}</span></button>
        <div class="pa-explain" data-explain-row="${esc(key)}">
          <p class="pa-why"><b>Pourquoi ${label(eff.status).toLowerCase()} ?</b><br><span class="pa-detail">${esc(why)}</span></p>
          <p class="pa-legend">🟢 conforme · 🟠 information/qualification manquante · 🔴 anomalie confirmée · ⚪ pas de règle suffisante</p>
          ${eff.source!=='auto'&&justification?`<p class="pa-detail"><b>Ta correction :</b> ${esc(justification)}</p>`:''}
          <div class="pa-review" data-review-box="${esc(key)}">
            <b>Corriger mon analyse</b>
            <label>Conclusion correcte</label>
            <select data-review-status="${esc(key)}">
              <option value="ok"${eff.status==='ok'?' selected':''}>🟢 Conforme</option>
              <option value="warn"${eff.status==='warn'?' selected':''}>🟠 À vérifier</option>
              <option value="bad"${eff.status==='bad'?' selected':''}>🔴 Non conforme</option>
              <option value="neutral"${eff.status==='neutral'?' selected':''}>⚪ Sans conclusion</option>
            </select>
            <label>Justification / ce que j'ai mal interprété</label>
            <textarea data-review-note="${esc(key)}" placeholder="Ex. Cet agent est bien RX ; la base n'était pas à jour.">${esc(justification)}</textarea>
            <label class="pa-review-check"><input type="checkbox" data-review-future="${esc(key)}"${learned?.applyFuture===true?' checked':''}> <span>Réutiliser cette correction pour les prochaines analyses portant exactement sur « ${esc(r.post)} ».</span></label>
            <div class="pa-review-actions"><button type="button" class="pa-save-review" data-save-review="${esc(key)}">✓ Enregistrer la correction</button>${r.manualStatus?`<button type="button" class="pa-reset-review" data-reset-review="${esc(key)}">↩ Revenir à l'analyse automatique</button>`:''}${learned?.applyFuture===true?`<button type="button" class="pa-forget" data-forget-review="${esc(key)}">Oublier pour les prochaines fiches</button>`:''}</div>
            <div class="pa-msg" data-review-msg="${esc(key)}"></div>
          </div>
        </div>
      </div>`;
    }).join('')}</div><div class="pa-actions"><button type="button" class="pa-delete" data-delete-id="${esc(a.id)}">🗑️ Delete</button></div></article>`).join('');

    list.querySelectorAll('[data-open-row]').forEach(btn=>btn.onclick=()=>{openKey=openKey===btn.dataset.openRow?'':btn.dataset.openRow;draw()});
    list.querySelectorAll('.pa-explain').forEach(x=>x.onclick=e=>e.stopPropagation());

    list.querySelectorAll('[data-save-review]').forEach(btn=>btn.onclick=()=>{
      const key=btn.dataset.saveReview,[aid,idxText]=key.split(':');
      const a=analyses.find(x=>String(x.id)===aid),idx=Number(idxText),r=a?.rows?.[idx];if(!r)return;
      const status=list.querySelector(`[data-review-status="${CSS.escape(key)}"]`)?.value||'neutral';
      const justification=(list.querySelector(`[data-review-note="${CSS.escape(key)}"]`)?.value||'').trim();
      const applyFuture=!!list.querySelector(`[data-review-future="${CSS.escape(key)}"]`)?.checked;
      const msg=list.querySelector(`[data-review-msg="${CSS.escape(key)}"]`);
      if(!justification){if(msg)msg.textContent='Ajoute une justification pour que la correction soit exploitable.';return}
      r.manualStatus=status;r.manualJustification=justification;r.reviewedAt=new Date().toISOString();
      if(applyFuture)corrections[postKey(r.post)]={status,justification,applyFuture:true,updatedAt:new Date().toISOString()};
      else if(corrections[postKey(r.post)]?.applyFuture===true)delete corrections[postKey(r.post)];
      save();saveCorrections();openKey=key;draw();
      const general=document.querySelector('#prestation-status');if(general)general.textContent=`Correction enregistrée pour ${r.post}.`;
    });

    list.querySelectorAll('[data-reset-review]').forEach(btn=>btn.onclick=()=>{
      const key=btn.dataset.resetReview,[aid,idxText]=key.split(':');
      const a=analyses.find(x=>String(x.id)===aid),r=a?.rows?.[Number(idxText)];if(!r)return;
      delete r.manualStatus;delete r.manualJustification;delete r.reviewedAt;save();openKey=key;draw();
    });

    list.querySelectorAll('[data-forget-review]').forEach(btn=>btn.onclick=()=>{
      const key=btn.dataset.forgetReview,[aid,idxText]=key.split(':');
      const a=analyses.find(x=>String(x.id)===aid),r=a?.rows?.[Number(idxText)];if(!r)return;
      delete corrections[postKey(r.post)];saveCorrections();openKey=key;draw();
    });

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
