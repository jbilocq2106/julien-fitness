/* Regroupements visuels MyTEAM : les donnees et onglets sources restent intacts. */
(()=>{
 'use strict';
 if(document.getElementById('mt-workspaces-style'))return;
 const nav=document.querySelector('nav.tabs'),main=document.querySelector('main');
 if(!nav||!main)return;
 const $=id=>document.getElementById(id);
 const tab=id=>Array.from(nav.querySelectorAll('button[data-tab]')).find(b=>b.dataset.tab===id);
 const open=(id,selector)=>{
   const button=tab(id);if(!button)return;
   button.click();
   if(selector)setTimeout(()=>document.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'}),90);
 };
 const css=document.createElement('style');
 css.id='mt-workspaces-style';
 css.textContent=[
  'nav.tabs button[data-desk-secondary="true"]{display:none!important}',
  '#mt-leave-workspace{padding:11px 12px 15px;margin:0 0 14px;border-bottom:1px solid #647b95;background:#19314a;border-radius:11px}',
  '#mt-leave-workspace h3{margin:3px 0 7px;font-size:18px}',
  '#mt-leave-workspace p{color:#cbd8e6;font-size:12px;line-height:1.55;margin:4px 0 11px}',
  '.mt-workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}',
  '.mt-workspace-grid button{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:7px;min-height:74px;text-align:left;padding:13px;background:#2a4463;border:1px solid #577697;color:#fff;border-radius:12px;white-space:normal}',
  '.mt-workspace-grid button strong{font-size:13px}',
  '.mt-workspace-grid button small{font-size:11px;color:#c6d8e8;font-weight:450}',
  '#mt-leave-workspace select{width:100%;margin:6px 0 10px;border-radius:10px;padding:12px;background:#111e31;color:#fff;border:1px solid #7f96ad;font:inherit}',
  '#mt-leave-workspace label{display:block;font-weight:750;font-size:12px;color:#e1edf8}',
  '#mt-leave-workspace .mt-ws-open{background:#ba662e;min-height:44px;padding:11px 13px;width:100%}',
  '#mt-leave-workspace .mt-ws-count{font-size:12px;font-weight:750;line-height:1.6;color:#ffdbb7}',
  '#mt-management-workspace{max-width:950px;margin:0 auto}',
  '#mt-management-workspace .card{margin:10px 0 12px}',
  '#mt-management-workspace h2{margin-top:0}',
  '@media(max-width:360px){.mt-workspace-grid{grid-template-columns:1fr}}'
 ].join('');
 document.head.append(css);
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
 const leave=$('leave'),photo=$('mt-leave-photo');
 if(leave&&photo&&!$('mt-leave-workspace')){
   const portal=document.createElement('div');
   portal.id='mt-leave-workspace';
   portal.innerHTML=[
    '<h3>Congés — espace central</h3>',
    '<p>Demandes par agent, décisions MyGesper, récapitulatif texte et tableau photo. Les déclarations des agents ne valent pas approbation officielle.</p>',
    '<div id="mt-leave-workspace-count" class="mt-ws-count" role="status"></div>',
    '<div class="mt-workspace-grid">',
    '<button type="button" id="mt-ws-leave-agents"><strong>👥 Fiches des agents</strong><small>Saisir et modifier les demandes</small></button>',
    '<button type="button" id="mt-ws-leave-recap"><strong>📝 Récapitulatif texte</strong><small>Consulter et copier les historiques</small></button>',
    '<button type="button" id="mt-ws-leave-interview"><strong>☑️ Agents interrogés</strong><small>Vérifier qui a été questionné</small></button>',
    '<button type="button" id="mt-ws-leave-photo"><strong>📷 Tableau des congés</strong><small>Voir la photo de référence</small></button>',
    '</div><label for="mt-ws-agent-select">Accès direct à la fiche agent</label>',
    '<select id="mt-ws-agent-select"><option value="">Choisir un agent…</option></select>',
    '<button type="button" id="mt-ws-open-agent" class="mt-ws-open">Ouvrir la fiche et ses demandes</button>'
   ].join('');
   photo.prepend(portal);
   const removed=()=>new Set((read('myteam_deleted_agents_v1',[])||[]).filter(x=>typeof x==='string'));
   const names=()=>{
     const profiles=read('myteam_agent_profiles_v1',{});
     const deleted=removed();
     return Object.keys(profiles||{}).filter(name=>!deleted.has(name)&&Number(profiles[name]?.team)===4)
       .sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
   };
   const refresh=()=>{
     const picker=$('mt-ws-agent-select'),selected=picker.value;
     picker.replaceChildren();
     const first=document.createElement('option');first.value='';first.textContent='Choisir un agent…';picker.append(first);
     const team=names();
     team.forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;picker.append(o)});
     if(team.includes(selected))picker.value=selected;
     const rows=read('myteam_agent_leave_requests_v1',[]);
     const active=Array.isArray(rows)?rows.filter(x=>x&&!x.archived):[];
     const follow=active.filter(x=>!['approved','rejected'].includes(x.gesperStatus)).length;
     const asked=read('myteam_leave_agent_interviews_v1',{});
     const count=team.filter(name=>asked?.[name]?.done===true).length;
     $('mt-leave-workspace-count').textContent=active.length+' demande(s) suivie(s) · '+follow+
       ' à confirmer · '+count+'/'+team.length+' agents interrogés (Team 4)';
   };
   const showAgent=(name,interviews)=>{
     open('team');
     if(interviews){
       document.querySelector('#agents-direct [data-ad-filter="toask"]')?.click();
       document.querySelector('#agents-direct')?.scrollIntoView({behavior:'smooth',block:'start'});
       return;
     }
     if(name){
       const select=$('agent-select');
       if(select&&Array.from(select.options).some(o=>o.value===name)){
         select.value=name;select.dispatchEvent(new Event('change',{bubbles:true}));
         $('agent-detail')?.scrollIntoView({behavior:'smooth',block:'start'});
         return;
       }
     }
     document.querySelector('#agents-direct')?.scrollIntoView({behavior:'smooth',block:'start'});
   };
   $('mt-ws-leave-agents').onclick=()=>showAgent('');
   $('mt-ws-leave-recap').onclick=()=>open('mtal-recap');
   $('mt-ws-leave-interview').onclick=()=>showAgent('',true);
   $('mt-ws-leave-photo').onclick=()=>$('mt-leave-photo-view')?.scrollIntoView({behavior:'smooth',block:'center'});
   $('mt-ws-open-agent').onclick=()=>{
     const name=$('mt-ws-agent-select').value;
     if(name)showAgent(name);else $('mt-ws-agent-select').focus();
   };
   tab('leave')?.addEventListener('click',refresh);
   window.MyTeamRefreshLeaveWorkspace=refresh;
   refresh();
 }
 if(!$('mt-management-workspace')&&tab('manager')&&tab('interviews')){
   const button=document.createElement('button');
   button.type='button';button.dataset.tab='mt-management-workspace';button.textContent='🤝 Management';
   (tab('team')||nav.lastElementChild).after(button);
   const section=document.createElement('section');section.id='mt-management-workspace';section.className='hidden';
   section.innerHTML=[
    '<div class="card"><h2>Management et entretiens</h2>',
    '<p>Accès commun sans mélanger les données de chaque module.</p>',
    '<div class="mt-workspace-grid">',
    '<button type="button" id="mt-ws-manager"><strong>🛡️ Manager</strong><small>Situations et mesures adaptées</small></button>',
    '<button type="button" id="mt-ws-interviews"><strong>🗣️ Entretiens individuels</strong><small>Fiches et suivis par agent</small></button>',
    '</div></div>'
   ].join('');
   main.append(section);
   button.onclick=()=>{
     nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b===button));
     main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));
     window.scrollTo(0,0);
   };
   $('mt-ws-manager').onclick=()=>open('manager');
   $('mt-ws-interviews').onclick=()=>open('interviews');
 }
 const docs=$('consignes');
 if(docs&&!$('mt-ws-consigne-tracking')){
   const controls=document.createElement('div');controls.className='mt-workspace-grid';
   controls.innerHTML=[
    '<button type="button" id="mt-ws-consigne-tracking"><strong>☑️ Suivi des lectures</strong><small>Confirmations agent par agent</small></button>',
    '<button type="button" id="mt-ws-consigne-agent"><strong>👥 Fiches agents</strong><small>Accéder aux agents</small></button>'
   ].join('');
   const card=docs.querySelector('.card');
   if(card)card.querySelector('h2')?.after(controls);else docs.prepend(controls);
   $('mt-ws-consigne-tracking').onclick=()=>open('today','#mt-ops-consignes-list');
   $('mt-ws-consigne-agent').onclick=()=>open('team','#agents-direct');
 }
 const parif=$('parif');
 if(parif&&!$('mt-ws-parif-advanced')){
   const modes=parif.querySelector('.mt-parif-view-modes');
   if(modes){
     const b=document.createElement('button');
     b.type='button';b.id='mt-ws-parif-advanced';b.textContent='⚙️ Édition avancée';
     b.onclick=()=>open('pariftools');
     modes.append(b);
   }
 }
 const secondary=[
   ['mtal-recap',!!$('mt-leave-workspace')],
   ['manager',!!$('mt-management-workspace')],
   ['interviews',!!$('mt-management-workspace')],
   ['pariftools',!!$('mt-ws-parif-advanced')]
 ];
 secondary.forEach(([id,ready])=>{const button=tab(id);if(ready&&button)button.dataset.deskSecondary='true'});
 if($('mt-bureau')&&!$('mt-bureau').classList.contains('hidden'))tab('mt-bureau')?.click();
})();