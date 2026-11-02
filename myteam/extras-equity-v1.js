/* MyTEAM — suivi local des propositions et activations d'extras.
   Aucun nom ni événement professionnel n'est intégré au code public. */
(()=>{
  'use strict';
  const day=document.getElementById('today');
  if(!day||document.getElementById('mt-extras'))return;
  const KEY='myteam_extras_equity_v1';
  const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
  const host=document.createElement('div');host.id='mt-extras';host.className='card';
  host.innerHTML=[
   '<style>#mt-extras{margin-bottom:14px}#mt-extras input,#mt-extras select{width:100%;min-height:42px;margin-top:5px;padding:9px;border-radius:9px;border:1px solid #7b91ad;background:#102034;color:white;font:inherit}#mt-extras label{display:block;font-size:13px;margin:8px 0}#mt-extras .mx-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#mt-extras .mx-entries{max-height:330px;overflow:auto}#mt-extras .mx-item{border-top:1px solid #4b6079;padding:10px 0}#mt-extras .mx-item strong{font-size:13px}#mt-extras .mx-small{color:#c2d0e0;font-size:12px;line-height:1.5}#mt-extras button{min-height:42px;margin:4px}#mt-extras .mx-primary{background:#286695}#mt-extras table{width:100%;border-collapse:collapse;font-size:12px}#mt-extras th,#mt-extras td{text-align:left;border-bottom:1px solid #50647a;padding:8px 3px}#mt-extras [hidden]{display:none!important}</style>',
   '<h3>Suivi équitable des extras</h3><p class="mx-small">Historique privé des propositions, acceptations et refus. La comparaison tient aussi compte des disponibilités et qualifications, non connues automatiquement.</p>',
   '<div id="mx-summary"></div><button type="button" id="mx-toggle" class="mx-primary">+ Noter une activation / proposition</button>',
   '<form id="mx-form" hidden><div class="mx-grid"><label>Date<input type="date" name="date" required></label><label>Agent<input type="text" name="agent" maxlength="100" required placeholder="Nom"></label></div>',
   '<div class="mx-grid"><label>Statut<select name="status"><option value="accepted">Extra accepté</option><option value="offered">Proposé / en attente</option><option value="declined">Refusé</option><option value="cancelled">Annulé</option></select></label><label>Durée (heures, facultatif)<input type="number" name="hours" min="0" max="24" step="0.25" placeholder="Inconnue"></label></div>',
   '<label>Poste / précision (facultatif)<input name="post" maxlength="150" placeholder="Ex. E51, horaire à préciser"></label>',
   '<button class="mx-primary" type="submit" id="mx-save">Enregistrer</button><button type="button" id="mx-cancel">Annuler</button></form>',
   '<p class="mx-small" id="mx-status" role="status"></p><div id="mx-list" class="mx-entries"></div>'
  ].join('');
  (document.getElementById('mt-ops-host')||day.querySelector('.mt-hero'))?.after(host);
  const $=id=>document.getElementById(id),form=$('mx-form');
  let editing='';
  const states={accepted:'Accepté',offered:'Proposé / en attente',declined:'Refusé',cancelled:'Annulé'};
  const clear=()=>{editing='';form.reset();form.elements.date.value=iso(new Date());form.hidden=true;$('mx-save').textContent='Enregistrer'};
  const render=()=>{
    const items=read().filter(r=>r&&typeof r==='object'&&typeof r.agent==='string');
    const cutoff=iso(new Date(Date.now()-90*86400000));
    const recent=items.filter(r=>r.date>=cutoff&&r.date<=iso(new Date()));
    const counts=new Map();
    recent.forEach(r=>{const key=r.agent.trim();if(!key)return;const c=counts.get(key)||{accepted:0,offered:0,declined:0,hours:0};if(r.status==='accepted'){c.accepted++;c.hours+=Number(r.hours)||0}else if(r.status==='offered')c.offered++;else if(r.status==='declined')c.declined++;counts.set(key,c)});
    $('mx-summary').innerHTML=counts.size?'<p class="mx-small">Activations recensées sur les 90 derniers jours :</p><div style="overflow:auto"><table><thead><tr><th>Agent</th><th>Acceptées</th><th>Proposées</th><th>Refusées</th></tr></thead><tbody>'+[...counts].sort((a,b)=>a[1].accepted-b[1].accepted||a[0].localeCompare(b[0],'fr')).map(([name,c])=>'<tr><td>'+safe(name)+'</td><td>'+c.accepted+'</td><td>'+c.offered+'</td><td>'+c.declined+'</td></tr>').join('')+'</tbody></table></div>':'<p class="mx-small">Aucun extra encore renseigné.</p>';
    $('mx-list').innerHTML=items.length?items.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,50).map(r=>'<div class="mx-item"><strong>'+safe(r.date)+' · '+safe(r.agent)+' · '+safe(states[r.status]||r.status)+'</strong><div class="mx-small">'+safe(r.post||'Poste / horaire à préciser')+(r.hours?' · '+safe(r.hours)+' h':'')+'</div><button type="button" data-mx-edit="'+safe(r.id)+'">Modifier</button><button type="button" data-mx-del="'+safe(r.id)+'">Supprimer</button></div>').join(''):'';
  };
  $('mx-toggle').onclick=()=>{clear();form.hidden=false;form.elements.agent.focus()};
  $('mx-cancel').onclick=clear;
  form.onsubmit=e=>{
    e.preventDefault();const f=form.elements,agent=f.agent.value.trim(),date=f.date.value;
    if(!agent||!/^20\d\d-\d\d-\d\d$/.test(date))return;
    const items=read(),id=editing||('extra-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));
    const record={id,date,agent,status:f.status.value,post:f.post.value.trim(),hours:f.hours.value===''?null:Number(f.hours.value),updatedAt:new Date().toISOString()};
    try{localStorage.setItem(KEY,JSON.stringify(editing?items.map(r=>r.id===id?record:r):[...items,record]));clear();$('mx-status').textContent='Extra enregistré sur cet appareil.';render()}catch{$('mx-status').textContent='Stockage local indisponible.'}
  };
  $('mx-list').addEventListener('click',e=>{
    const b=e.target.closest('[data-mx-edit],[data-mx-del]');if(!b)return;
    const id=b.dataset.mxEdit||b.dataset.mxDel,r=read().find(v=>v.id===id);if(!r)return;
    if(b.dataset.mxDel){if(!confirm('Supprimer cette activation / proposition ?'))return;try{localStorage.setItem(KEY,JSON.stringify(read().filter(v=>v.id!==id)));render()}catch{$('mx-status').textContent='Suppression impossible.'};return}
    editing=id;form.hidden=false;form.elements.date.value=r.date||'';form.elements.agent.value=r.agent||'';form.elements.status.value=r.status||'accepted';form.elements.post.value=r.post||'';form.elements.hours.value=r.hours??'';$('mx-save').textContent='Enregistrer la correction';form.scrollIntoView({behavior:'smooth',block:'start'});
  });
  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  window.MyTeamRefreshExtras=render;clear();render();
})();