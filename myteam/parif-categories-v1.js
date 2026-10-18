(()=>{
  'use strict';
  const root=document.getElementById('parif'),target=document.getElementById('mt-parif-content');
  if(!root||!target||document.getElementById('mt-parif-categories'))return;
  const STORE='myteam_parif_post_categories_drafts_v1';
  const POST_IDS=['E14','E32','E84','E85','E112','E20','E30','E40','E43','E50','E51','E52','E80','E111','E121'];
  const PROPOSED={E14:'g4s',E32:'g4s',E84:'g4s',E85:'g4s',E112:'g4s',E40:'duss',E20:'lxp',E30:'lxp',E43:'lxp',E50:'lxp',E51:'lxp',E52:'lxp',E80:'lxp',E111:'lxp',E121:'lxp'};
  const read=()=>{try{const data=JSON.parse(localStorage.getItem(STORE)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return{}}};
  const normalized=value=>value==='g4s'||value==='lxp'||value==='duss'?value:'';
  const clone=source=>Object.fromEntries(POST_IDS.map(id=>[id,normalized(source[id])]));
  let previous='',saved=clone(read()),pending=clone(saved),preview='';
  const panel=document.createElement('div');panel.className='card mt-parif-classification';panel.id='mt-parif-categories';
  panel.innerHTML=`<h3>🏷️ À qui appartient chaque poste ?</h3>
    <p>Choisis la <strong>catégorie du poste</strong>, indépendamment de l’employeur de l’agent qui l’occupe. Un poste PARIF relève de Luxairport mais peut accueillir des agents G4S. Le poste E40 relève exclusivement de Dussmann d’après tes dernières précisions.</p>
    <button type="button" id="mt-parif-categories-open" class="mt-primary">☑️ Cocher les catégories des postes</button>
    <p id="mt-parif-categories-count" class="mt-parif-categories-count"></p>
    <div id="mt-parif-categories-form" class="hidden">
      <p class="mt-parif-categories-note">Coche <strong>une seule réponse par poste</strong>. E32 est repris de tes fiches G4S, même s’il n’apparaît pas sur cette photo PARIF.</p>
      <button type="button" id="mt-parif-categories-proposal">↺ Préremplir avec mes derniers choix (non validés)</button>
      <div id="mt-parif-categories-rows">${POST_IDS.map(post=>`<fieldset data-parif-type="${post}"><legend>Poste ${post}</legend>
        <label><input type="radio" name="mt-type-${post}" value="g4s"> G4S exclusivement</label>
        <label><input type="radio" name="mt-type-${post}" value="lxp"> PARIF / LXP (agents G4S possibles)</label>
        <label><input type="radio" name="mt-type-${post}" value="duss"> Dussmann exclusivement</label>
        <label><input type="radio" name="mt-type-${post}" value=""> À confirmer</label>
      </fieldset>`).join('')}</div>
      <div class="actions"><button id="mt-parif-categories-preview" type="button" class="mt-primary">Prévisualiser mon classement</button><button id="mt-parif-categories-cancel" type="button">Annuler</button></div>
      <div id="mt-parif-categories-review" class="hidden" role="status"></div>
      <button id="mt-parif-categories-save" class="mt-primary hidden" type="button">Enregistrer ce classement en brouillon</button>
      <p id="mt-parif-categories-status" role="status"></p>
    </div>
    <p class="mt-parif-disclaimer">Aucune catégorie de poste n’est officialisée automatiquement. Seul Julien peut valider le classement de référence.</p>`;
  target.before(panel);
  const $=id=>document.getElementById(id);
  const form=$('mt-parif-categories-form'),review=$('mt-parif-categories-review'),status=$('mt-parif-categories-status');
  function resetPreview(){preview='';review.classList.add('hidden');review.replaceChildren();$('mt-parif-categories-save').classList.add('hidden')}
  function summary(){const n=Object.values(saved).filter(Boolean).length;$('mt-parif-categories-count').textContent=n+' poste'+(n>1?'s':'')+' classé'+(n>1?'s':'')+' sur '+POST_IDS.length+' · Brouillon uniquement';}
  function showRadios(){
    for(const post of POST_IDS){const value=pending[post];const radio=panel.querySelector(`input[name="mt-type-${post}"][value="${value}"]`);if(radio)radio.checked=true;}
  }
  function showSaved(){
    const current=localStorage.getItem(STORE);previous=current||'';saved=clone(read());pending=current===null?clone(PROPOSED):clone(saved);
    showRadios();summary();resetPreview();
    status.textContent=current===null?'Tes 15 choix sont préremplis pour prévisualisation. Rien n’est encore enregistré ni officiel.':'';
  }
  function close(){form.classList.add('hidden');$('mt-parif-categories-open').setAttribute('aria-expanded','false');resetPreview()}
  $('mt-parif-categories-open').onclick=()=>{
    const opening=form.classList.contains('hidden');if(opening){showSaved();form.classList.remove('hidden')}else close();
    $('mt-parif-categories-open').setAttribute('aria-expanded',String(opening));
    $('mt-parif-categories-open').textContent=opening?'Masquer les catégories':'☑️ Cocher les catégories des postes';
  };
  $('mt-parif-categories-cancel').onclick=()=>{showSaved();close();$('mt-parif-categories-open').textContent='☑️ Cocher les catégories des postes'};
  $('mt-parif-categories-proposal').onclick=()=>{pending=clone(PROPOSED);showRadios();resetPreview();status.textContent='Derniers choix de Julien préremplis. Prévisualise avant d’enregistrer un brouillon.'};
  $('mt-parif-categories-rows').onchange=event=>{
    const input=event.target;if(!input.matches('input[type=radio]'))return;
    const post=input.closest('[data-parif-type]')?.dataset.parifType;
    if(post&&POST_IDS.includes(post))pending[post]=normalized(input.value);
    resetPreview();status.textContent='Classement en cours de modification ; rien n’est enregistré.';
  };
  $('mt-parif-categories-preview').onclick=()=>{
    resetPreview();const changes=POST_IDS.filter(post=>pending[post]!==saved[post]);
    if(!changes.length){status.textContent='Aucun changement à enregistrer.';return;}
    const lines=changes.map(post=>{
      const labels={g4s:'G4S exclusivement',lxp:'PARIF / LXP (G4S possibles)',duss:'Dussmann exclusivement','':'À confirmer'};
      return`${post} : ${labels[saved[post]]} → ${labels[pending[post]]}`;
    });
    const title=document.createElement('strong');title.textContent='Prévisualisation · '+changes.length+' poste(s) modifié(s)';
    review.append(title);
    for(const line of lines){const p=document.createElement('p');p.textContent=line;review.append(p)}
    const note=document.createElement('p');note.textContent='Cette confirmation conserve seulement un brouillon privé. Elle ne change aucun agent ni plan officiel.';review.append(note);
    review.classList.remove('hidden');preview=JSON.stringify(pending);$('mt-parif-categories-save').classList.remove('hidden');status.textContent='Relis le classement, puis confirme.';
  };
  $('mt-parif-categories-save').onclick=()=>{
    if(!preview||preview!==JSON.stringify(pending)){resetPreview();status.textContent='Les choix ont changé. Prévisualise à nouveau.';return;}
    if((localStorage.getItem(STORE)||'')!==previous){resetPreview();status.textContent='Le classement a changé entre-temps. Ferme puis rouvre pour éviter un écrasement.';return;}
    const toStore=Object.fromEntries(POST_IDS.filter(post=>pending[post]).map(post=>[post,pending[post]]));
    try{localStorage.setItem(STORE,JSON.stringify(toStore));saved=clone(toStore);previous=localStorage.getItem(STORE)||'';resetPreview();summary();status.textContent='Classement provisoire enregistré sur cet appareil. Aucune affectation officielle modifiée.';window.dispatchEvent(new Event('myteam:parif-types-changed'));}
    catch{status.textContent='Échec du stockage. Aucun classement n’a été enregistré.';}
  };
  showSaved();
})();
