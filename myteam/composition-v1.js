(()=>{
  'use strict';
  if(document.querySelector('#composition'))return;
  const KEY='myteam_composition_drafts_v1';
  const HIST_DATE='2026-07-16'; // date du nom de fichier, pas date d'effet garantie
  const groups=['Chef d’équipe','RX + P','RX','Permis','Agent','CMA (à confirmer)','Autre','Backup chef d’équipe'];
  const photo={
    1:[
      [['EL GAMAH'],0],[['LALLOZ'],7],[['MIGNOT','HILT','VALENTIN','WEISSE'],1],[['MARIE','BERNARD','DA SILVA MARTINS'],2],
      [['KARASU','RODRIGUEZ','MALICK','SCHMID'],3],
      [['DACHOUFFE','MARIE Su.','ANTONIOL','GARRABI','KERGOAT','VIEL','COLLELA','DIELS','GIANOLI','MUNIER','MOURER','MOLTER Certif'],4],
      [['MAURICE'],5]
    ],
    2:[
      [['BILOCQ'],0],[['BORGESE'],7],[['GAGNANT','BERAUT','JACOTEZ','LONGLY'],1],[['SANDSTROM','BIGONI','WILLEMS'],2],
      [['BURG','PANATO','TUMMINELLI','HENRAT','CLESEUR'],3],
      [['KRIEG','HUMMEL','JACQUET','MATEI','DORRION','STATISIAK','LECLERC','LUCK','FROSIO','ADAM Manon','GARCIA certif'],4],
      [['OUINNE'],5]
    ],
    3:[
      [['PILLA'],0],[['TRIPODI'],7],[['CAIROLI','SAUTEZ'],1],[['HAUDIQUET','MOURON','THIBAUD','MOUDEBER','NETO'],2],
      [['FELTEN','MAILLOT','KIRSCHTETTER','DOS SANTOS','LEBRUN'],3],
      [['VILLI','BRIDELANCE','REHAMNIA','SCARPINO','DURLI','GUFFROY','KESSLER','BEHARI','FINCK','HANCE','HOFFART','LECLERE'],4],
      [['DURET'],5]
    ],
    4:[
      [['SEBRIER'],0],[['RIBU'],7],[['FRANCESCHINI','DOSIL','MALAINHO'],1],[['TERRIEN','JULIA','MIANO','CLAREN','DA ROCHA'],2],
      [['BODEVING','FRANGIAMORE','FROUSSART','DURAND'],3],
      [['YOVE','ALI VELOU','FRIESS','GUGLIETTI','KOUAHO','VERDIN','SERJANTU','KIZILDAG','MARINI','WILTGEN','CHOUMAKER'],4],
      [['CHAOUACHI'],5]
    ]
  };
  const oldToCurrent={1:1,2:4,3:3,4:2};
  const currentToOld={1:1,2:4,3:3,4:2};
  const photoTeamLabel=n=>`Équipe ${n} (sur la photo : équipe ${currentToOld[n]})`;
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const blank={name:'',workerNumber:'',team:4,group:'Agent',gender:'',rx:'',piste:'',note:''};
  const normalizeRow=r=>({id:String(r.id||makeId()),name:String(r.name||'').slice(0,100),workerNumber:/^\d{1,20}$/.test(String(r.workerNumber??'').trim())?String(r.workerNumber).trim():'',team:[1,2,3,4].includes(Number(r.team))?Number(r.team):4,
    group:groups.includes(r.group)||r.group==='En-tête (à préciser)'?r.group:'Autre',gender:['F','M'].includes(r.gender)?r.gender:'',rx:['oui','non'].includes(r.rx)?r.rx:'',
    piste:['oui','non'].includes(r.piste)?r.piste:'',note:String(r.note||'').slice(0,250)});

  // Matricule : la fiche agent est la source de référence, y compris pour les brouillons existants.
  // On ne publie pas les matricules dans le code ; ils restent dans les données privées de l'appareil.
  const activeProfiles=()=>{
    let profiles={},deleted=[];
    try{const parsed=JSON.parse(localStorage.getItem('myteam_agent_profiles_v1')||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))profiles=parsed}catch{}
    try{const parsed=JSON.parse(localStorage.getItem('myteam_deleted_agents_v1')||'[]');if(Array.isArray(parsed))deleted=parsed}catch{}
    const blocked=new Set(deleted.map(norm));
    return Object.entries(profiles).filter(([name])=>!blocked.has(norm(name)));
  };
  const profileNumber=(row,profiles)=>{
    const normalized=norm(row.name);
    if(!normalized)return row.workerNumber||'';
    const exact=profiles.filter(([name])=>norm(name)===normalized);
    let match=exact.length===1?exact[0]:null;
    // La photo historique comporte des noms abrégés ; rapprocher seulement les correspondances uniques.
    if(!match&&exact.length===0&&normalized.length>=4){
      const potential=profiles.filter(([name])=>norm(name).startsWith(normalized));
      if(potential.length===1)match=potential[0];
    }
    return match&&/^\d{1,20}$/.test(String(match[1]?.workerNumber||'').trim())
      ?String(match[1].workerNumber).trim():(row.workerNumber||'');
  };

  function photoRows(){
    const known=(()=>{try{return JSON.parse(localStorage.getItem('myteam_agent_profiles_v1')||'{}')}catch{return {}}})();
    const profiles=Object.entries(known);
    const rows=[];for(const [oldTeam,sections] of Object.entries(photo))for(const [names,gi] of sections)for(const raw of names){
      const name=raw.replace(/ certif$/i,'');
      const matches=profiles.filter(([key])=>norm(key)===norm(name)||norm(key.split(' ')[0])===norm(name));
      const gender=matches.length===1&&['F','M'].includes(matches[0][1]?.gender)?matches[0][1].gender:'';
      const note=`Photo ancienne équipe ${oldTeam} : vérifier nom et habilitations`+(/ certif$/i.test(raw)?' ; mention « certif » sur la photo':'')+(gi===5?' ; CMA indiqué en pied de colonne':'');
      rows.push(normalizeRow({...blank,name,team:oldToCurrent[oldTeam],group:groups[gi],rx:gi===1||gi===2?'oui':gi===4?'non':'',piste:gi===1||gi===3?'oui':gi===4?'non':'',gender,note}));
    }
    return rows;
  }
  function currentRows(){
    const stored=(()=>{try{return JSON.parse(localStorage.getItem('myteam_agent_profiles_v1')||'{}')}catch{return {}}})();
    const deleted=(()=>{try{return new Set(JSON.parse(localStorage.getItem('myteam_deleted_agents_v1')||'[]'))}catch{return new Set()}})();
    const seeds=window.myteamTeamSeed||{};
    const approved=new Set(Object.values(seeds).flat().map(x=>norm(x[0])));
    const rows=[];
    for(const [name,p] of Object.entries(stored)){
      if(deleted.has(name)||![1,2,3,4].includes(Number(p?.team)))continue;
      if(!approved.has(norm(name))&&!p?.manualAdded&&!p?.teamManual)continue;
      const rx=p?.rxCertified===true?'oui':'',piste=p?.pistePermit===true?'oui':'';
      const group=rx&&piste?'RX + P':rx?'RX':piste?'Permis':'Agent';
      rows.push(normalizeRow({...blank,name,workerNumber:p?.workerNumber||'',team:Number(p.team),group,gender:p?.gender||'',rx,piste,note:''}));
    }
    return rows;
  }
  const defaults={current:currentRows(),photo:photoRows()};
  let state;
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'null');
    state={version:4,current:Array.isArray(parsed?.current)?parsed.current.map(normalizeRow):defaults.current,
      photo:Array.isArray(parsed?.photo)?parsed.photo.map(normalizeRow):defaults.photo};
    if(parsed&&parsed.version!==4){
      // Mettre les anciennes colonnes en correspondance avec les numéros actuels.
      for(const r of state.photo)r.team=oldToCurrent[r.team]||r.team;
      // Corriger aussi les deux équipes inversées dans le premier brouillon actuel,
      // sans modifier les lignes déjà enrichies manuellement.
      const wanted=new Map();
      for(const key of [1,3])for(const [name] of (window.myteamTeamSeed?.[key]||[]))wanted.set(norm(name),key);
      for(const r of state.current){
        const target=wanted.get(norm(r.name));
        if(target&&(r.team===1||r.team===3)&&r.team!==target&&!r.note&&r.group==='Agent'&&r.rx===''&&r.piste==='')r.team=target;
      }
      const oldHeads={1:['EL GAMAH','LALLOZ'],4:['BILOCQ','BORGESE'],3:['PILLA','TRIPODI'],2:['SEBRIER','RIBU']};
      for(const r of state.photo){
        if(r.group!=='En-tête (à préciser)')continue;
        const [chief,backup]=oldHeads[r.team]||[];
        if(norm(r.name)===norm(chief))r.group='Chef d’équipe';
        else if(norm(r.name)===norm(backup))r.group='Backup chef d’équipe';
        else r.group='Autre';
      }
      for(const base of defaults.photo.filter(r=>r.group==='CMA (à confirmer)')){
        if(!state.photo.some(r=>r.team===base.team&&norm(r.name)===norm(base.name)))state.photo.push(base);
      }
      for(const r of state.photo.filter(r=>r.group==='Agent')){
        if(r.rx==='')r.rx='non';if(r.piste==='')r.piste='non';
      }
      localStorage.setItem(KEY,JSON.stringify(state));
    }
  }catch{state={version:4,...defaults}}
  let mode='current',team=4,search='',snapshot=null;
  const expanded=new Set();

  const section=document.createElement('section');section.id='composition';section.className='hidden';
  section.innerHTML=`<style>
    #composition .cmp-wrap{overflow-x:auto;max-width:100%;border:1px solid #3e526b;border-radius:13px}
    #composition table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;min-width:870px}
    #composition th,#composition td{padding:7px;border-bottom:1px solid #39485c;text-align:left}
    #composition th{background:#293a51;position:sticky;top:0;z-index:1}
    #composition td input,#composition td select{width:100%;min-height:37px;padding:7px;border-radius:7px;border:1px solid #61738d;background:#121c2b;color:#fff;font:inherit}
    #composition td:first-child{min-width:155px;position:sticky;left:0;background:#202f44;z-index:1}
    #composition tr.cmp-female td:first-child input{color:#ff8bc3;font-weight:800}
    #composition .cmp-worker{font-weight:750;font-variant-numeric:tabular-nums;white-space:nowrap}
    #composition .cmp-tools,#composition .cmp-teams{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}
    #composition .cmp-teams button[aria-pressed=true]{background:#e76b24}
    #composition .cmp-tools button{font-size:12px;padding:10px 12px}
    #composition input[type=search],#composition select.cmp-mode{width:100%;min-height:43px;padding:9px;border-radius:10px;border:1px solid #70819a;background:#121c2b;color:#fff;font:inherit}
    #composition .cmp-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0}
    #composition .cmp-stat{padding:11px;background:#26364a;border-radius:11px;text-align:center;font-size:12px}
    #composition .cmp-stat b{display:block;font-size:23px}
    #composition .cmp-hint{padding:10px 12px;border-radius:11px;background:#302e22;color:#ffdda4;font-size:12px;line-height:1.5}
    #composition .cmp-del{background:#913b42;padding:9px}
    #composition .cmp-expand{display:none;background:#2766bf;padding:9px}
    #composition .cmp-brief{display:none}
    #composition .cmp-status{font-size:12px;color:#b9dcff;min-height:20px}
    #composition .cmp-preview{background:#132a30;padding:11px;border-radius:11px;margin-top:8px;font-size:12px;line-height:1.5}
    @media(max-width:660px){
      #composition .cmp-wrap{overflow:visible;border:0}
      #composition table{display:block;min-width:0;width:100%}
      #composition thead{display:none}
      #composition tbody{display:grid;gap:9px}
      #composition tbody tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;background:#24344b;
        border:1px solid #465c76;border-radius:13px;padding:11px;align-items:start}
      #composition tbody td{border:0;padding:0;min-width:0}
      #composition tbody td:first-child{grid-column:1;position:static;background:transparent}
      #composition tbody td:last-child{grid-column:2;grid-row:1;display:flex;gap:5px;align-items:center}
      #composition tbody tr:not(.cmp-open) td:nth-child(n+2):nth-child(-n+8){display:none}
      #composition tbody tr.cmp-open td:nth-child(n+2):nth-child(-n+8){grid-column:1 / -1;display:block}
      #composition tbody tr.cmp-open td:nth-child(n+2):nth-child(-n+8)::before{content:attr(data-label);
        color:#aebacc;display:block;font-size:12px;font-weight:750;margin:3px 0 5px}
      #composition tbody td input,#composition tbody td select{min-height:45px;font-size:15px}
      #composition .cmp-brief{display:block;margin:5px 2px 0;color:#b9cde0;font-size:12px}
      #composition .cmp-expand{display:inline-block;white-space:nowrap;font-size:12px}
      #composition .cmp-del{font-size:13px}
      #composition .cmp-stats{gap:5px}
      #composition .cmp-stat{padding:9px 5px}
    }
  </style>
  <div class="card"><h2>🧩 Composition des équipes</h2>
    <p class="muted">Tableau modifiable comme dans Excel : touche une cellule pour corriger le nom, l'équipe, le groupe ou les qualifications. Les matricules se mettent à jour depuis les fiches Agents et restent modifiables dans celles-ci. Les modifications sont privées et enregistrées <strong>sur ce téléphone</strong>.</p>
    <label for="cmp-mode">Base de travail</label><select class="cmp-mode" id="cmp-mode">
      <option value="current">Équipes actuelles (base MyTEAM)</option>
      <option value="photo">Photo de référence (${HIST_DATE}, répartition historique)</option>
    </select>
    <div class="cmp-teams" id="cmp-teams"></div>
    <input type="search" id="cmp-search" placeholder="Rechercher un agent dans cette équipe…">
    <div class="cmp-stats" id="cmp-stats"></div>
    <div class="cmp-wrap"><table aria-label="Composition éditable des équipes"><thead><tr>
      <th>Agent</th><th>Matricule</th><th>Équipe</th><th>Groupe</th><th>F/H</th><th>RX</th><th>Permis</th><th>Note</th><th></th>
    </tr></thead><tbody id="cmp-body"></tbody></table></div>
    <div class="cmp-tools"><button id="cmp-add" type="button">+ Agent / ligne</button><button id="cmp-undo" type="button">↶ Annuler</button>
      <button id="cmp-csv" type="button">⬇ Export Excel (CSV)</button><button id="cmp-import-button" type="button">⬆ Import CSV</button>
      <button id="cmp-restore" type="button">Restaurer cette base</button></div>
    <input id="cmp-file" type="file" accept=".csv,text/csv" hidden>
    <p class="cmp-status" id="cmp-status" role="status"></p>
    <p class="cmp-hint">Correspondance confirmée : ancienne 1 → actuelle 1 ; ancienne 2 → actuelle 4 ; ancienne 3 → actuelle 3 ; ancienne 4 → actuelle 2. Les qualifications de la photo doivent être revérifiées. Les noms sous « Agent » sont sans qualification RX ni permis piste. Le premier nom est le chef d’équipe et le deuxième son backup. Les mentions « CMA » restent à vérifier. Rien ici ne modifie automatiquement les fiches agents ni les affectations officielles.</p>
  </div><div class="card"><h3>Équilibrage des équipes</h3><p class="muted">Les compteurs sont indicatifs et reposent sur les cases du tableau, sans validation des habilitations.</p><div id="cmp-overview"></div></div>`;
  document.querySelector('main').append(section);
  const nav=document.querySelector('.tabs');
  const tab=document.createElement('button');tab.type='button';tab.dataset.tab='composition';tab.textContent='🧩 Composition';
  const agentTab=nav.querySelector('[data-tab="team"]');if(agentTab)agentTab.insertAdjacentElement('afterend',tab);else nav.append(tab);
  tab.onclick=()=>{
    nav.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));
    document.querySelectorAll('main section').forEach(s=>s.classList.toggle('hidden',s!==section));
    draw();
  };
  const $=id=>document.getElementById(id);
  const save=message=>{try{localStorage.setItem(KEY,JSON.stringify(state));$('cmp-status').textContent=message||'Brouillon enregistré sur ce téléphone.'}catch{$('cmp-status').textContent='⚠️ Enregistrement impossible : exporte une copie CSV.'}};
  const rows=()=>state[mode];
  const stats=all=>({total:all.length,rx:all.filter(r=>r.rx==='oui').length,piste:all.filter(r=>r.piste==='oui').length});
  const select=(options,value)=>options.map(([v,t])=>`<option value="${esc(v)}"${v===value?' selected':''}>${esc(t)}</option>`).join('');
  function remember(){snapshot=JSON.stringify(state)}
  function draw(){
    $('cmp-mode').value=mode;
    $('cmp-teams').innerHTML=[4,1,2,3].map(n=>`<button type="button" data-team="${n}" aria-pressed="${n===team}">${esc(mode==='photo'?photoTeamLabel(n):'Équipe '+n)} (${rows().filter(r=>r.team===n).length})</button>`).join('');
    $('cmp-teams').querySelectorAll('[data-team]').forEach(b=>b.onclick=()=>{team=Number(b.dataset.team);search='';$('cmp-search').value='';draw()});
    const all=rows().filter(r=>r.team===team),s=stats(all);
    $('cmp-stats').innerHTML=`<div class="cmp-stat"><b>${s.total}</b>Agents</div><div class="cmp-stat"><b>${s.rx}</b>RX indiqués</div><div class="cmp-stat"><b>${s.piste}</b>Permis indiqués</div>`;
    const profiles=activeProfiles();
    const subset=all.filter(r=>norm(r.name).includes(norm(search))||profileNumber(r,profiles).includes(search.trim()));
    $('cmp-body').innerHTML=subset.map(r=>`<tr data-id="${esc(r.id)}" class="${r.gender==='F'?'cmp-female ':''}${expanded.has(r.id)?'cmp-open':''}">
      <td data-label="Agent"><input data-field="name" aria-label="Nom" maxlength="100" value="${esc(r.name)}"><small class="cmp-brief">${profileNumber(r,profiles)?'Mat. '+esc(profileNumber(r,profiles))+' · ':''}${esc(r.group)} · RX ${esc(r.rx||'?')} · Permis ${esc(r.piste||'?')}</small></td>
      <td data-label="Matricule"><span class="cmp-worker">${esc(profileNumber(r,profiles)||'—')}</span></td>
      <td data-label="Équipe"><select data-field="team" aria-label="Équipe">${select([1,2,3,4].map(n=>[String(n),'Équipe '+n]),String(r.team))}</select></td>
      <td data-label="Groupe"><select data-field="group" aria-label="Groupe">${select(groups.map(x=>[x,x]),r.group)}</select></td>
      <td data-label="F/H"><select data-field="gender" aria-label="Femme ou homme">${select([['','—'],['F','F'],['M','H']],r.gender)}</select></td>
      <td data-label="RX"><select data-field="rx" aria-label="RX">${select([['','?'],['oui','Oui'],['non','Non']],r.rx)}</select></td>
      <td data-label="Permis"><select data-field="piste" aria-label="Permis piste">${select([['','?'],['oui','Oui'],['non','Non']],r.piste)}</select></td>
      <td data-label="Note"><input data-field="note" aria-label="Note" maxlength="250" value="${esc(r.note)}"></td>
      <td><button class="cmp-expand" data-expand type="button" aria-expanded="${expanded.has(r.id)}">${expanded.has(r.id)?'Fermer':'Modifier'}</button><button class="cmp-del" data-delete type="button" aria-label="Supprimer la ligne">✕</button></td>
    </tr>`).join('')||'<tr><td colspan="9">Aucun agent. Ajoute une ligne si nécessaire.</td></tr>';
    $('cmp-body').querySelectorAll('tr[data-id]').forEach(tr=>{
      const id=tr.dataset.id;
      tr.querySelectorAll('[data-field]').forEach(input=>{
        input.addEventListener('focus',remember,{once:true});
        input.addEventListener(input.tagName==='INPUT'?'change':'change',()=>{
          const r=rows().find(x=>x.id===id);if(!r)return;
          r[input.dataset.field]=input.dataset.field==='team'?Number(input.value):input.value;
          save('Modification enregistrée dans le brouillon.');
          if(input.dataset.field!=='note'&&input.dataset.field!=='name')draw();
          else if(input.dataset.field==='name')drawCounts();
        });
      });
      tr.querySelector('[data-expand]').onclick=()=>{const open=!expanded.has(id);if(open)expanded.add(id);else expanded.delete(id);
        tr.classList.toggle('cmp-open',open);const btn=tr.querySelector('[data-expand]');btn.textContent=open?'Fermer':'Modifier';btn.setAttribute('aria-expanded',String(open))};
      tr.querySelector('[data-delete]').onclick=()=>{
        const r=rows().find(x=>x.id===id);if(!r||!confirm(`Retirer ${r.name||'cette ligne'} du brouillon ?`))return;
        remember();state[mode]=rows().filter(x=>x.id!==id);save('Ligne retirée du brouillon.');draw();
      };
    });
    drawOverview();
  }
  function drawCounts(){
    const s=stats(rows().filter(r=>r.team===team));
    $('cmp-stats').innerHTML=`<div class="cmp-stat"><b>${s.total}</b>Agents</div><div class="cmp-stat"><b>${s.rx}</b>RX indiqués</div><div class="cmp-stat"><b>${s.piste}</b>Permis indiqués</div>`;
  }
  function drawOverview(){
    const counts=[4,1,2,3].map(n=>({team:n,...stats(rows().filter(r=>r.team===n))}));
    $('cmp-overview').innerHTML=counts.map(c=>`<p>${esc(mode==='photo'?photoTeamLabel(c.team):'Équipe '+c.team)} : <b>${c.total}</b> agents · ${c.rx} RX · ${c.piste} permis</p>`).join('')+
      '<p class="cmp-preview">Suggestion : comparer les effectifs et vérifier la présence des qualifications nécessaires à chaque poste. Une différence de compteur ne justifie pas à elle seule un changement d’agent.</p>';
  }
  $('cmp-mode').onchange=e=>{mode=e.target.value;team=4;search='';$('cmp-search').value='';draw()};
  $('cmp-search').oninput=e=>{search=e.target.value;draw()};
  $('cmp-add').onclick=()=>{remember();const r=normalizeRow({...blank,team});rows().push(r);save('Nouvelle ligne ajoutée au brouillon.');search='';$('cmp-search').value='';draw();
    const target=$('cmp-body').querySelector(`[data-id="${r.id}"] [data-field=name]`);target?.focus()};
  $('cmp-undo').onclick=()=>{if(!snapshot){$('cmp-status').textContent='Aucune modification récente à annuler.';return}const old=JSON.parse(snapshot);snapshot=JSON.stringify(state);state=old;save('Modification annulée.');draw()};
  $('cmp-restore').onclick=()=>{if(!confirm('Restaurer la base de ce mode ? Toutes ses modifications locales seront remplacées.'))return;
    remember();state[mode]=mode==='photo'?photoRows():currentRows();save('Base restaurée pour ce mode.');draw()};
  function csvCell(v){let s=String(v??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  $('cmp-csv').onclick=()=>{
    const header=['Équipe','Groupe','Agent','Matricule','F/H','RX','Permis','Note'];
    const profiles=activeProfiles();
    const body=rows().map(r=>[r.team,r.group,r.name,profileNumber(r,profiles),r.gender,r.rx,r.piste,r.note]);
    const csv='\ufeff'+[header,...body].map(row=>row.map(csvCell).join(';')).join('\r\n');
    const a=document.createElement('a');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.href=url;a.download=`MyTEAM_composition_${mode}_${new Date().toISOString().slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('cmp-status').textContent='CSV exporté : tu peux le modifier dans Excel et le réimporter.';
  };
  $('cmp-import-button').onclick=()=>$('cmp-file').click();
  function parseCsv(raw){
    const out=[];let row=[],field='',quotes=false;
    const s=raw.replace(/^\ufeff/,'');
    for(let i=0;i<s.length;i++){
      const c=s[i];if(c==='"'){if(quotes&&s[i+1]==='"'){field+='"';i++}else quotes=!quotes}
      else if(c===';'&&!quotes){row.push(field);field=''}
      else if((c==='\n'||c==='\r')&&!quotes){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))out.push(row);row=[];field=''}
      else field+=c;
    }
    if(quotes)throw Error('Guillemets non fermés');row.push(field);if(row.some(v=>v.trim()))out.push(row);
    if(!out.length)throw Error('CSV vide');
    const header=out[0].map(x=>x.trim()).join(';');
    const hasWorker=header==='Équipe;Groupe;Agent;Matricule;F/H;RX;Permis;Note';
    if(!hasWorker&&header!=='Équipe;Groupe;Agent;F/H;RX;Permis;Note')throw Error('En-têtes incorrects : exporte d’abord un modèle depuis MyTEAM');
    return out.slice(1).map((cells,i)=>{
      if(cells.length!==(hasWorker?8:7)||![1,2,3,4].includes(Number(cells[0]))||!groups.includes(cells[1]))throw Error('Ligne '+(i+2)+' invalide');
      const workerNumber=hasWorker?cells[3].trim():'';
      if(workerNumber&&!/^\d{1,20}$/.test(workerNumber))throw Error('Matricule invalide, ligne '+(i+2));
      const k=hasWorker?1:0;
      return normalizeRow({...blank,team:Number(cells[0]),group:cells[1],name:cells[2],workerNumber,gender:cells[3+k],rx:cells[4+k],piste:cells[5+k],note:cells[6+k]});
    });
  }
  $('cmp-file').onchange=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      if(file.size>300000)throw Error('Fichier trop volumineux (max. 300 Ko)');
      const imported=parseCsv(await file.text());if(imported.length>500)throw Error('Maximum 500 lignes');
      if(!confirm(`Importer ${imported.length} lignes dans « ${mode==='current'?'Équipes actuelles':'Photo'} » ? Le brouillon de ce mode sera remplacé.`))return;
      remember();state[mode]=imported;save(`${imported.length} lignes importées dans le brouillon.`);draw();
    }catch(err){$('cmp-status').textContent='Import impossible : '+err.message}
    finally{e.target.value=''}
  };
  draw();
})();
