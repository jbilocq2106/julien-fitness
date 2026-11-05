(()=>{
'use strict';
const main=document.querySelector('main'),nav=document.querySelector('nav.tabs');
if(!main||!nav||document.getElementById('mt-teams-v1'))return;
const K='myteam_equipes_privees_v1',Q='myteam_equipes_qualifs_v1',P='myteam_agent_profiles_v1';
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const safe=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
let team=4,query='',filter='all',current=[];
const section=document.createElement('section');section.id='mt-teams-v1';section.className='hidden card';
section.innerHTML='<h2>Équipes · qualifications</h2><p class="eq-info">Tous les agents par équipe, avec X-RAY et permis. Un point d’interrogation signifie « à vérifier ».</p><div id="eq-tabs" class="eq-tabs"></div><div id="eq-stats" class="eq-stats"></div><p id="eq-source" class="eq-info"></p><input id="eq-search" placeholder="Rechercher un nom ou matricule" type="search"><div id="eq-filters" class="eq-filters"></div><p id="eq-count" class="eq-info"></p><div id="eq-rows"></div><p class="eq-info">Appuyer pour changer : ? → Oui → Non → ?. Les données restent sur ce téléphone.</p><div class="eq-actions"><button id="eq-print-btn" type="button">Imprimer l’équipe A4</button><button id="eq-agents-btn" type="button">Fiches agents</button></div><details><summary>Actualiser la liste privée des équipes</summary><p class="eq-info">Choisir une seule fois le fichier MyTEAM_equipes_donnees_privees.json. Aucune liste nominative n’est publiée sur GitHub.</p><input type="file" id="eq-file" accept=".json,application/json"><p id="eq-message" role="status"></p></details>';
const style=document.createElement('style');
style.textContent='#mt-teams-v1{max-width:1050px;margin:auto}#mt-teams-v1 .eq-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}#mt-teams-v1 .eq-tabs button{padding:13px 2px;border:1px solid #71839b;background:#364860}#mt-teams-v1 .eq-tabs .active,#mt-teams-v1 .eq-filters .active{background:#a7587b}#mt-teams-v1 .eq-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}#mt-teams-v1 .eq-stats div{border-radius:12px;text-align:center;padding:11px;background:#34465d}#mt-teams-v1 .eq-stats div:nth-child(2){background:#654052}#mt-teams-v1 .eq-stats div:nth-child(3){background:#285b58}#mt-teams-v1 .eq-stats strong{display:block;font-size:25px}#mt-teams-v1 .eq-info{font-size:12px;color:#cbd7e5;line-height:1.55}#mt-teams-v1 #eq-search{width:100%;padding:14px;color:#fff;background:#15283e;border:1px solid #6d8299;border-radius:11px}#mt-teams-v1 .eq-filters{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}#mt-teams-v1 .eq-filters button{font-size:12px}#mt-teams-v1 .eq-row{padding:12px;border:1px solid #53687f;border-radius:12px;background:#293b4e;margin:8px 0}#mt-teams-v1 .eq-row.f{background:#5a3c4e;border-color:#a5738e}#mt-teams-v1 .eq-name{font-weight:750}#mt-teams-v1 .eq-choices{display:flex;gap:8px;margin-top:10px}#mt-teams-v1 .eq-choices button{flex:1;min-height:46px;border:1px solid #6c829b;background:#40566b}#mt-teams-v1 .eq-choices .yes{background:#22684f}#mt-teams-v1 .eq-choices .no{background:#713a44}#mt-teams-v1 .eq-actions{display:flex;gap:8px;margin-top:12px}#mt-teams-v1 .eq-actions button{flex:1}#mt-teams-v1 details{padding:13px;margin-top:17px;border:1px solid #627a90;border-radius:12px}#mt-teams-v1 input[type=file]{width:100%;margin:12px 0}#eq-print-view{display:none}@media print{@page{size:A4;margin:10mm}body>*:not(#eq-print-view){display:none!important}#eq-print-view{display:block!important;background:white!important;color:#29384c!important;font:9pt Arial}#eq-print-view h1{font-size:21pt}#eq-print-view table{width:100%;border-collapse:collapse;font-size:8.2pt}#eq-print-view th{background:#29384c!important;color:white!important;padding:6pt}#eq-print-view td{padding:5pt;border-bottom:1px solid #d2dae3}#eq-print-view tr.f td{background:#fbe8ee!important}#eq-print-view .check{text-align:center;font-size:14pt}#eq-print-view *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
section.prepend(style);
const anchor=document.getElementById('team');anchor?main.insertBefore(section,anchor):main.append(section);
const tab=document.createElement('button');tab.dataset.tab='mt-teams-v1';tab.textContent='👥 Équipes';
const anchorTab=nav.querySelector('[data-tab="team"]');anchorTab?anchorTab.before(tab):nav.append(tab);
const el=id=>document.getElementById(id);
function rows(t){
const roster=read(K,null);
if(roster&&roster.schema==='myteam-team-a4-v1')return(roster.teams[String(t)]||[]).map(x=>({...x,team:t})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
const deleted=new Set(read('myteam_deleted_agents_v1',[]).map(norm));
return Object.entries(read(P,{})).filter(([n,p])=>p&&Number(p.team)===t&&!deleted.has(norm(n))).map(([name,p])=>({name,gender:p.gender||'',workerNumber:String(p.workerNumber||''),team:t})).sort((a,b)=>a.name.localeCompare(b.name,'fr'))
}
const key=r=>r.team+':'+r.workerNumber+':'+norm(r.name);
function existing(r){
const entries=Object.entries(read(P,{})),exact=entries.find(([n])=>norm(n)===norm(r.name));
if(exact)return exact;
const same=entries.filter(([,p])=>r.workerNumber&&String(p.workerNumber||'')===String(r.workerNumber));
return same.length===1?same[0]:null
}
function qual(r,k){
const v=read(Q,{})[key(r)]?.[k];if(['yes','no','unknown'].includes(v))return v;
return existing(r)?.[1]?.[k==='rx'?'rxCertified':'pistePermit']===true?'yes':'unknown'
}
function change(r,k){
const old=qual(r,k),value=old==='unknown'?'yes':old==='yes'?'no':'unknown';
try{
const state=read(Q,{});state[key(r)]={...(state[key(r)]||{}),[k]:value};localStorage.setItem(Q,JSON.stringify(state));
const found=existing(r);if(found&&value!=='unknown'){const p=read(P,{});p[found[0]]={...p[found[0]],[k==='rx'?'rxCertified':'pistePermit']:value==='yes'};localStorage.setItem(P,JSON.stringify(p))}
render()
}catch(e){alert('Sauvegarde impossible : '+e.message)}
}
function render(){
el('eq-tabs').innerHTML=[1,2,3,4].map(n=>'<button data-team="'+n+'" class="'+(team===n?'active':'')+'">Équipe '+n+'</button>').join('');
const all=rows(team),f=all.filter(r=>r.gender==='F').length,m=all.filter(r=>r.gender==='M').length;
el('eq-stats').innerHTML='<div>Hommes<strong>'+m+'</strong></div><div>Femmes<strong>'+f+'</strong></div><div>Total<strong>'+all.length+'</strong></div>';
el('eq-source').textContent=read(K,null)?'Liste privée chargée sur cet appareil.':'Liste locale provisoire : charger le fichier privé pour les matricules et effectifs exacts.';
el('eq-filters').innerHTML=[['all','Tous'],['rx','X-RAY'],['piste','Permis'],['missing','À vérifier']].map(([v,label])=>'<button data-filter="'+v+'" class="'+(v===filter?'active':'')+'">'+label+'</button>').join('');
const q=norm(query);
current=all.filter(r=>(!q||norm(r.name).includes(q)||String(r.workerNumber).includes(q))&&(filter==='all'||filter==='rx'&&qual(r,'rx')==='yes'||filter==='piste'&&qual(r,'piste')==='yes'||filter==='missing'&&(qual(r,'rx')==='unknown'||qual(r,'piste')==='unknown')));
el('eq-count').textContent=current.length+' agent(s) affiché(s)';
el('eq-rows').innerHTML=current.map((r,i)=>'<div class="eq-row '+(r.gender==='F'?'f':'')+'"><div class="eq-name">'+safe(r.name)+'</div><div class="eq-info">Matricule '+safe(r.workerNumber||'non renseigné')+' · '+(r.gender==='F'?'Femme':r.gender==='M'?'Homme':'Genre à vérifier')+'</div><div class="eq-choices">'+['rx','piste'].map(k=>{const v=qual(r,k);return'<button type="button" data-i="'+i+'" data-q="'+k+'" class="'+v+'">'+(k==='rx'?'X-RAY':'Permis')+' '+(v==='yes'?'✓':v==='no'?'✕':'?')+'</button>'}).join('')+'</div></div>').join('')||'<p>Aucun agent trouvé.</p>'
}
el('eq-tabs').onclick=e=>{const b=e.target.closest('[data-team]');if(b){team=Number(b.dataset.team);render()}};
el('eq-filters').onclick=e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;render()}};
el('eq-search').oninput=e=>{query=e.target.value;render()};
el('eq-rows').onclick=e=>{const b=e.target.closest('[data-q]');if(b&&current[Number(b.dataset.i)])change(current[Number(b.dataset.i)],b.dataset.q)};
el('eq-agents-btn').onclick=()=>nav.querySelector('[data-tab="team"]')?.click();
el('eq-file').onchange=async e=>{
const file=e.target.files?.[0];if(!file)return;
try{
if(file.size>500000)throw Error('Fichier trop volumineux');
const data=JSON.parse(await file.text());if(data.schema!=='myteam-team-a4-v1'||!data.teams)throw Error('Format non reconnu');
const result={schema:'myteam-team-a4-v1',teams:{}};
for(let t=1;t<=4;t++){const list=data.teams[String(t)];if(!Array.isArray(list)||list.length<1||list.length>100)throw Error('Équipe '+t+' invalide');
result.teams[String(t)]=list.map(r=>{const name=String(r.name||'').trim(),gender=r.gender,workerNumber=String(r.workerNumber||'');
if(!name||name.length>120||!['F','M'].includes(gender)||!/^\d{3,8}$/.test(workerNumber))throw Error('Agent invalide');return{name,gender,workerNumber}})}
localStorage.setItem(K,JSON.stringify(result));el('eq-message').textContent='Chargé : '+Object.values(result.teams).reduce((n,a)=>n+a.length,0)+' agents. Données préexistantes conservées.';render()
}catch(err){el('eq-message').textContent='Impossible : '+err.message}
finally{e.target.value=''}
};
const printable=document.createElement('div');printable.id='eq-print-view';document.body.append(printable);
el('eq-print-btn').onclick=()=>{
const list=rows(team),m=list.filter(r=>r.gender==='M').length,f=list.filter(r=>r.gender==='F').length;
printable.innerHTML='<h1>ÉQUIPE '+team+'</h1><p>Qualifications à cocher à la main</p><table><thead><tr><th>Matricule</th><th>Genre</th><th>Nom et prénom</th><th>X-RAY</th><th>Permis</th></tr></thead><tbody>'+list.map(r=>'<tr class="'+(r.gender==='F'?'f':'')+'"><td>'+safe(r.workerNumber)+'</td><td>'+safe(r.gender)+'</td><td>'+safe(r.name)+'</td><td class="check">□</td><td class="check">□</td></tr>').join('')+'</tbody></table><h3>Hommes : '+m+' · Femmes : '+f+' · Total : '+list.length+'</h3>';window.print()
};
window.addEventListener('storage',e=>{if([K,Q,P].includes(e.key))render()});tab.addEventListener('click',render);render()
})();