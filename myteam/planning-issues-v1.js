/* MyTEAM — Suivi privé des signalements de planning. Aucun nom d'agent en dur dans ce fichier public. */
(function(){
  'use strict';
  if(document.getElementById('planning-issues'))return;
  var main=document.querySelector('main'),nav=document.querySelector('nav.tabs');
  if(!main||!nav)return;
  var KEY='myteam_planning_issues_v1';
  var STATES=['À vérifier','Remonté à la planification','En attente de réponse','Corrigé','Non retenu'];
  function clean(x,max){return String(x==null?'':x).trim().slice(0,max||500);}
  function esc(x){return clean(x,4000).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];});}
  function getRows(){try{var v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.filter(function(x){return x&&typeof x==='object'&&typeof x.id==='string';}):[];}catch(e){return [];}}
  function saveRows(rows){localStorage.setItem(KEY,JSON.stringify(rows));}
  function decode(s){var base=s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=');return new TextDecoder().decode(Uint8Array.from(atob(base),function(c){return c.charCodeAt(0);}));}
  function validDate(v){return !v||/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(v);}
  function normalize(src){
    if(!src||typeof src!=='object')throw Error('Entrée manquante');
    var item={
      id:clean(src.id,120),
      agent:clean(src.agent,100),
      date:clean(src.date,10),
      period:clean(src.period,100),
      category:clean(src.category,80),
      post:clean(src.post,60),
      start:clean(src.start,5),
      end:clean(src.end,5),
      detail:clean(src.detail,800),
      status:STATES.includes(src.status)?src.status:STATES[0],
      source:clean(src.source||'Signalement de l’agent — non vérifié',150),
      reportedAt:clean(src.reportedAt,10),
      note:clean(src.note,800),
      updatedAt:clean(src.updatedAt,30)
    };
    if(!item.id||!item.agent||!item.detail||!validDate(item.date)||
      (item.start&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.start))||
      (item.end&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.end)))throw Error('Signalement invalide');
    return item;
  }
  var button=document.createElement('button');button.type='button';button.dataset.tab='planning-issues';
  button.textContent='⚠️ Erreurs planning';
  var neighbour=nav.querySelector('[data-tab="prestation"]');
  if(neighbour)neighbour.insertAdjacentElement('afterend',button);else nav.append(button);
  var section=document.createElement('section');section.className='hidden';section.id='planning-issues';
  section.innerHTML=[
    '<div class="card pi-hero"><div class="pi-kicker">TEAM 4 · SUIVI INTERNE</div><h2>⚠️ Erreurs de planning</h2>',
    '<p>Recueil des signalements des agents. Les anomalies restent <strong>à vérifier</strong> avant une remontée ou une correction officielle.</p>',
    '<div class="pi-stats" id="pi-stats"></div>',
    '<label class="pi-label" for="pi-search">Rechercher un agent ou une date</label>',
    '<input id="pi-search" class="pi-input" type="search" placeholder="Ex. Dal Farra, 19/11, E32">',
    '<p id="pi-import-status" role="status" class="pi-note"></p></div>',
    '<div id="pi-list"></div>',
    '<div class="card"><h3>Ajouter un signalement</h3>',
    '<form id="pi-add">',
    '<label class="pi-label">Agent <input class="pi-input" name="agent" maxlength="100" required placeholder="Nom de l’agent"></label>',
    '<label class="pi-label">Date (facultative) <input class="pi-input" name="date" type="date"></label>',
    '<label class="pi-label">Période ou date à préciser <input class="pi-input" name="period" maxlength="100" placeholder="Ex. dates non précisées"></label>',
    '<label class="pi-label">Poste <input class="pi-input" name="post" maxlength="60" placeholder="Ex. E85"></label>',
    '<div class="pi-pair"><label class="pi-label">Début <input class="pi-input" name="start" type="time"></label>',
    '<label class="pi-label">Fin <input class="pi-input" name="end" type="time"></label></div>',
    '<label class="pi-label">Signalement <textarea class="pi-input" name="detail" rows="3" maxlength="800" required placeholder="Décrire les faits rapportés, sans conclure trop tôt à une erreur"></textarea></label>',
    '<button type="submit" class="pi-primary">+ Enregistrer le signalement</button>',
    '</form><p id="pi-add-status" role="status" class="pi-note"></p></div>',
    '<div class="card"><button type="button" id="pi-copy">Copier la synthèse</button>',
    '<p class="pi-note">Ces données sont stockées sur cet appareil, sans publication GitHub. Elles sont incluses dans la sauvegarde chiffrée MyTEAM si la synchronisation privée est activée. Ne pas communiquer la synthèse en dehors des canaux professionnels autorisés.</p></div>'
  ].join('');
  main.append(section);
  var css=document.createElement('style');
  css.textContent=[
    '#planning-issues{max-width:880px;margin:auto;font-size:16px;line-height:1.45}',
    '#planning-issues .card{border:1px solid #43556d}',
    '#planning-issues h2{font-size:26px;line-height:1.2;margin:6px 0 11px}',
    '#planning-issues h3{font-size:18px;margin:0 0 12px}',
    '#planning-issues .pi-hero{background:linear-gradient(130deg,#253e5b,#1d2d43)}',
    '#planning-issues .pi-kicker{color:#c2d8f3;font-weight:800;font-size:12px;letter-spacing:.06em}',
    '#planning-issues .pi-stats{display:flex;flex-wrap:wrap;gap:9px;margin:14px 0}',
    '#planning-issues .pi-pill{display:inline-block;padding:8px 11px;border-radius:99px;background:#344a65;font-size:13px;font-weight:750}',
    '#planning-issues .pi-label{display:grid;gap:6px;font-size:14px;font-weight:700;margin:12px 0}',
    '#planning-issues .pi-input{width:100%;background:#101b2a;color:white;border:1px solid #627895;border-radius:11px;padding:12px;font:inherit;min-width:0}',
    '#planning-issues .pi-pair{display:grid;grid-template-columns:1fr 1fr;gap:11px}',
    '#planning-issues .pi-note{color:#b9c7d6;font-size:12px;line-height:1.5}',
    '#planning-issues .pi-agent{border-left:5px solid #e4a656}',
    '#planning-issues .pi-entry{padding:14px 0;border-top:1px solid #44576e}',
    '#planning-issues .pi-entry:first-child{border-top:none}',
    '#planning-issues .pi-entry-title{font-weight:800;font-size:16px;margin:0 0 6px}',
    '#planning-issues .pi-line{margin:6px 0;color:#d8e4f1}',
    '#planning-issues .pi-line strong{color:#fff}',
    '#planning-issues .pi-state{width:100%;padding:11px;background:#344963;color:#fff;border:1px solid #667b93;border-radius:10px;font:inherit;margin-top:9px}',
    '#planning-issues .pi-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
    '#planning-issues .pi-actions button{font-size:13px;padding:10px 12px}',
    '#planning-issues .pi-primary{background:#2369b0}',
    '#planning-issues .pi-warning{color:#ffcc97;font-size:12px;font-weight:700}',
    '#planning-issues .pi-empty{padding:14px;background:#22344b;border-radius:11px}'
  ].join('');
  document.head.append(css);
  var list=section.querySelector('#pi-list'),search=section.querySelector('#pi-search');
  function fmtDate(v){return v&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'';}
  function fmt(r){return [fmtDate(r.date),r.period].filter(Boolean).join(' · ')||'Dates à préciser';}
  function render(){
    var rows=getRows(),q=search.value.trim().toLocaleLowerCase('fr');
    var visible=q?rows.filter(function(r){return [r.agent,fmt(r),r.post,r.detail,r.start,r.end,r.category].join(' ').toLocaleLowerCase('fr').includes(q);}):rows;
    visible.sort(function(a,b){return a.agent.localeCompare(b.agent,'fr')||(a.date||'9999').localeCompare(b.date||'9999');});
    var agents=[...new Set(rows.map(function(r){return r.agent;}))].length;
    section.querySelector('#pi-stats').innerHTML='<span class="pi-pill">'+rows.length+' signalement(s)</span>'+
      '<span class="pi-pill">'+agents+' agent(s)</span>'+
      '<span class="pi-pill">'+rows.filter(function(r){return r.status===STATES[0];}).length+' à vérifier</span>';
    if(!visible.length){list.innerHTML='<div class="card pi-empty">Aucun signalement correspondant.</div>';return;}
    var map={};
    visible.forEach(function(r){(map[r.agent]||(map[r.agent]=[])).push(r);});
    list.innerHTML=Object.keys(map).map(function(agent){
      return '<div class="card pi-agent"><h3>'+esc(agent)+' · '+map[agent].length+' point(s)</h3>'+
        map[agent].map(function(r){
          var times=r.start&&r.end?r.start+'–'+r.end:'';
          var choices=STATES.map(function(status){return '<option value="'+esc(status)+'"'+(r.status===status?' selected':'')+'>'+esc(status)+'</option>';}).join('');
          return '<div class="pi-entry" data-pi-id="'+esc(r.id)+'">'+
            '<p class="pi-entry-title">'+esc(fmt(r))+'</p>'+
            (r.post?'<p class="pi-line">Poste : <strong>'+esc(r.post)+'</strong></p>':'')+
            (times?'<p class="pi-line">Horaire indiqué : <strong>'+esc(times)+'</strong></p>':'')+
            '<p class="pi-line">'+esc(r.detail)+'</p>'+
            (r.note?'<p class="pi-note">Note : '+esc(r.note)+'</p>':'')+
            '<p class="pi-warning">Non vérifié · '+esc(r.source)+'</p>'+
            '<label class="pi-label">État du suivi<select data-pi-status class="pi-state">'+choices+'</select></label>'+
            '<div class="pi-actions"><button type="button" data-pi-note>Ajouter une note</button><button type="button" data-pi-remove>Supprimer</button></div>'+
          '</div>';
        }).join('')+'</div>';
    }).join('');
  }
  search.addEventListener('input',render);
  list.addEventListener('change',function(e){
    var select=e.target.closest('[data-pi-status]');if(!select)return;
    var id=select.closest('[data-pi-id]')?.dataset.piId;
    var rows=getRows(),item=rows.find(function(x){return x.id===id;});
    if(!item||!STATES.includes(select.value))return;
    item.status=select.value;item.updatedAt=new Date().toISOString();
    try{saveRows(rows);}catch(error){alert('Impossible de sauvegarder ce statut.');}
    render();
  });
  list.addEventListener('click',function(e){
    var btn=e.target.closest('button[data-pi-note],button[data-pi-remove]');if(!btn)return;
    var id=btn.closest('[data-pi-id]')?.dataset.piId,rows=getRows();
    var item=rows.find(function(x){return x.id===id;});if(!item)return;
    if(btn.hasAttribute('data-pi-note')){
      var value=prompt('Note de suivi (sans données médicales ni détails personnels)',item.note||'');
      if(value===null)return;
      item.note=clean(value,800);item.updatedAt=new Date().toISOString();
    }else{
      if(!confirm('Supprimer ce signalement de '+item.agent+' ?'))return;
      rows=rows.filter(function(x){return x.id!==id;});
    }
    try{saveRows(rows);render();}catch(error){alert('Enregistrement impossible.');}
  });
  section.querySelector('#pi-add').addEventListener('submit',function(e){
    e.preventDefault();
    var f=new FormData(e.currentTarget);
    try{
      var row=normalize({
        id:'manual-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
        agent:f.get('agent'),date:f.get('date'),period:f.get('period'),
        post:f.get('post'),start:f.get('start'),end:f.get('end'),
        detail:f.get('detail'),source:'Saisi manuellement — non vérifié',
        reportedAt:new Date().toISOString().slice(0,10)
      });
      var rows=getRows();rows.push(row);saveRows(rows);
      e.currentTarget.reset();render();
      section.querySelector('#pi-add-status').textContent='Signalement enregistré localement, statut À vérifier.';
    }catch(err){section.querySelector('#pi-add-status').textContent='Impossible de sauvegarder : '+err.message;}
  });
  section.querySelector('#pi-copy').addEventListener('click',async function(){
    var text=getRows().map(function(r){return r.agent+' — '+fmt(r)+(r.post?' — '+r.post:'')+
      (r.start&&r.end?' — '+r.start+'–'+r.end:'')+'\n'+r.detail+'\nStatut : '+r.status+
      (r.note?'\nNote : '+r.note:'');}).join('\n\n');
    if(!text){alert('Aucun signalement à copier.');return;}
    try{await navigator.clipboard.writeText(text);this.textContent='✓ Synthèse copiée';}catch(e){alert('Copie indisponible sur ce téléphone.');}
  });
  async function importFromHash(){
    var prefix='#planning-issues=';
    if(!location.hash.startsWith(prefix))return;
    var raw=location.hash.slice(prefix.length);
    history.replaceState(history.state,'',location.pathname+location.search);
    var msg=section.querySelector('#pi-import-status');
    try{
      if(!/^[A-Za-z0-9_-]{1,9000}$/.test(raw))throw Error('Lien invalide');
      var pack=JSON.parse(decode(raw));
      if(pack.schema!=='myteam-planning-issues-v1'||!Array.isArray(pack.items)||!pack.items.length||pack.items.length>35)throw Error('Format invalide');
      var items=pack.items.map(normalize),distinct=new Set(items.map(function(x){return x.id;}));
      if(distinct.size!==items.length)throw Error('Doublons dans la liste');
      var rows=getRows(),known=new Set(rows.map(function(x){return x.id;}));
      var fresh=items.filter(function(x){return !known.has(x.id);});
      if(!fresh.length){msg.textContent='Ces signalements sont déjà présents dans MyTEAM. Aucun doublon créé.';show();return;}
      if(!confirm('Ajouter '+fresh.length+' signalement(s) de planning dans MyTEAM, uniquement sur ce téléphone ?\n\nLes plannings officiels ne seront pas modifiés.')){msg.textContent='Import annulé. Rien n’a été enregistré.';show();return;}
      saveRows(rows.concat(fresh));
      msg.textContent='✓ '+fresh.length+' signalement(s) ajoutés. Les données sont privées et les plannings officiels inchangés.';
      show();render();
    }catch(error){msg.textContent='Import impossible : '+error.message;}
  }
  function show(){
    nav.querySelectorAll('[data-tab]').forEach(function(b){b.classList.toggle('active',b===button);});
    main.querySelectorAll('section').forEach(function(s){s.classList.toggle('hidden',s!==section);});
    window.scrollTo(0,0);
  }
  button.addEventListener('click',function(){show();render();});
  window.addEventListener('hashchange',importFromHash);
  render();
  importFromHash();
})();
