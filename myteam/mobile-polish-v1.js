(()=>{
  'use strict';
  if(document.getElementById('mt-agent-edit-toggle'))return;
  const detail=document.getElementById('agent-detail');
  const summary=document.getElementById('agent-qual-summary');
  if(detail&&summary&&summary.parentElement===detail){
    const toggle=document.createElement('button');
    toggle.id='mt-agent-edit-toggle';toggle.type='button';
    toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','mt-agent-fields');
    toggle.textContent='✏️ Modifier les informations de cet agent';
    const fields=document.createElement('div');
    fields.id='mt-agent-fields';fields.className='mt-agent-closed';
    // Les champs existants (et leurs écouteurs de sauvegarde) sont déplacés sans être recréés.
    while(summary.nextSibling)fields.append(summary.nextSibling);
    detail.append(toggle,fields);
    const isMobile=()=>window.matchMedia('(max-width:780px)').matches;
    const close=()=>{fields.classList.add('mt-agent-closed');toggle.setAttribute('aria-expanded','false');toggle.textContent='✏️ Modifier les informations de cet agent'};
    toggle.addEventListener('click',()=>{
      const opening=fields.classList.contains('mt-agent-closed');
      fields.classList.toggle('mt-agent-closed',!opening);
      toggle.setAttribute('aria-expanded',String(opening));
      toggle.textContent=opening?'⌃ Masquer le formulaire':'✏️ Modifier les informations de cet agent';
      if(opening&&isMobile())fields.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
    document.getElementById('agent-select')?.addEventListener('change',()=>{if(isMobile())close()});
  }

  const prestation=document.getElementById('prestation');
  if(prestation&&!document.getElementById('mt-prestation-rules')){
    const rules=Array.from(prestation.children).find(el=>el.tagName==='P'&&el.classList.contains('muted')&&el.textContent.includes('E32'));
    if(rules){
      const d=document.createElement('details');d.id='mt-prestation-rules';
      const heading=document.createElement('summary');heading.textContent='📖 Consulter les règles par poste';
      rules.before(d);d.append(heading,rules);
      if(window.matchMedia('(min-width:781px)').matches)d.open=true;
    }
  }
})();
