/* MyTEAM — affectations G4S PARIF et certifications.
   Toutes les données nominatives proviennent du stockage privé du téléphone. */
(()=>{
 'use strict';
 const today=document.getElementById('today');
 if(!today||document.getElementById('mt-parif-g4s-board'))return;
 const AKEY='myteam_parif_g4s_assignments_v1', CKEY='myteam_agent_certifications_v1';
 const read=k=>{try{const r=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(r)?r:[]}catch{return []}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nice=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):String(s||'');
 const todayStr=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
 const wrap=document.createElement('section');wrap.className='card';wrap.id='mt-parif-g4s-board';
 wrap.innerHTML=[
  '<style>#mt-parif-g4s-board{margin:0 0 14px}#mt-parif-g4s-board h3{margin:6px 0 9px}#mt-parif-g4s-board h4{margin:12px 0 6px}#mt-parif-g4s-board p.mpg-sub{font-size:12px;color:#c9d7e9;line-height:1.5}#mt-parif-g4s-board label{display:block;font-size:12px;color:#cbdbed;margin:8px 0}#mt-parif-g4s-board select,#mt-parif-g4s-board input{width:100%;min-height:43px;background:#13243a;border:1px solid #7188a2;color:white;padding:10px;border-radius:10px;font:inherit}#mt-parif-g4s-board .mpg-row{padding:9px 0;border-top:1px solid #415675}#mt-parif-g4s-board .mpg-shift{margin:14px 0 0;padding:8px 10px;background:#354e6c;border-radius:8px;font-weight:800}#mt-parif-g4s-board .mpg-alert{padding:10px;border-left:3px solid #f4bb70;background:#443b35;font-size:12px;line-height:1.5}#mt-parif-g4s-board .mpg-status{display:flex;align-items:center;justify-content:space-between;gap:8px}#mt-parif-g4s-board .mpg-status select{max-width:150px;min-width:130px;font-size:12px}#mt-parif-g4s-board .mpg-divider{border-top:1px solid #56687d;margin:15px 0}</style>',
  '<h3>Affectations G4S — plan PARIF</h3>',
  '<p class="mpg-sub">Relevé des affectations G4S depuis la photo du planning. Les autres sociétés ne sont pas importées. Le remplacement temporaire de Garcia reste dans la main courante, sans changer le planning source.</p>',
  '<label>Date du planning<select id="mpg-day"></select></label>',
  '<label>Rechercher un agent / poste<input id="mpg-search" type="search" placeholder="Ex. Garcia, E51, Julia" autocomplete="off"></label>',
  '<div id="mpg-planning" aria-live="polite"></div><div class="mpg-divider"></div>',
  '<h3>Certifications agents</h3>',
  '<p class="mpg-sub">Horaires de certification, et non horaires de prise de poste. Un contrôle de disponibilité est nécessaire avant la date prévue.</p>',
  '<div id="mpg-certs"></div>'
 ].join('');
 (document.getElementById('mt-extras')||document.getElementById('mt-ops-host')||today.querySelector('.mt-hero'))?.after(wrap);
 const $=id=>document.getElementById(id);
 function draw(){
   const a=read(AKEY),c=read(CKEY);const days=[...new Set(a.map(x=>x.date).filter(Boolean))].sort().reverse();
   const daySelect=$('mpg-day'),current=daySelect.value;daySelect.replaceChildren();
   if(!days.length)daySelect.add(new Option('Aucun planning importé',''));
   else {for(const date of days)daySelect.add(new Option(nice(date),date));daySelect.value=days.includes(current)?current:(days.includes(todayStr())?todayStr():days[0]);}
   const query=$('mpg-search').value.trim().toLocaleLowerCase('fr');
   const all=a.filter(x=>x.date===daySelect.value).sort((x,y)=>String(x.shift).localeCompare(String(y.shift))||String(x.post).localeCompare(String(y.post),undefined,{numeric:true})||String(x.agent).localeCompare(String(y.agent),'fr'));
   const found=all.filter(x=>!query||[x.agent,x.post,x.shift].some(s=>String(s||'').toLocaleLowerCase('fr').includes(query)));
   const shiftNames=[...new Set(found.map(x=>x.shift))];
   let html=all.length?'<p class="mpg-sub">'+all.length+' affectation(s) G4S relevée(s) · '+new Set(all.map(x=>x.agent)).size+' noms distincts</p>':'<p class="mpg-sub">Aucune affectation importée. Utilise ton lien d’import privé.</p>';
   for(const shift of shiftNames){
     html+='<div class="mpg-shift">'+esc(shift)+'</div>';
     const list=found.filter(x=>x.shift===shift);
     for(const post of [...new Set(list.map(x=>x.post))]){
       html+='<div class="mpg-row"><strong>'+esc(post)+'</strong><div>'+list.filter(x=>x.post===post).map(x=>esc(x.agent)).join(' · ')+'</div></div>';
     }
   }
   if(all.length){
     const byAgent=new Map();
     for(const x of all){const key=x.shift+'|'+String(x.agent).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();const prev=byAgent.get(key)||[];prev.push(x.post);byAgent.set(key,prev)}
     const conflicts=[...byAgent].filter(([key,posts])=>new Set(posts).size>1);
     if(conflicts.length)html+='<p class="mpg-alert"><strong>À vérifier :</strong> '+conflicts.map(([key,posts])=>esc(key.split('|')[1])+' apparaît sur '+esc([...new Set(posts)].join(' et '))+' pour la même vacation. Ne pas conclure à un doublon certain sans confirmation.').join(' ')+'</p>';
   }
   $('mpg-planning').innerHTML=html;
   const certDates=[...new Set(c.map(r=>r.date))].sort(),groups=[];
   for(const date of certDates){
     const rows=c.filter(r=>r.date===date).sort((x,y)=>String(x.time).localeCompare(String(y.time))||String(x.agent).localeCompare(String(y.agent),'fr'));
     const delta=Math.round((Date.parse(date+'T12:00:00')-Date.parse(todayStr()+'T12:00:00'))/86400000);
     groups.push('<h4>'+nice(date)+(delta===1?' · demain':delta===0?" · aujourd'hui":'')+'</h4>');
     if(delta===1)groups.push('<p class="mpg-alert">Demain : vérifier les cinq horaires et la disponibilité des agents.</p>');
     for(const r of rows){
       groups.push('<div class="mpg-row mpg-status"><div><strong>'+esc(r.time)+' · '+esc(r.agent)+'</strong><div class="mpg-sub">'+esc(r.status==='confirmed'?'Confirmée':r.status==='done'?'Réalisée':'À préparer / à confirmer')+'</div></div><select data-cert-id="'+esc(r.id)+'" aria-label="Statut certification '+esc(r.agent)+'"><option value="scheduled" '+(r.status==='scheduled'?'selected':'')+'>À préparer</option><option value="confirmed" '+(r.status==='confirmed'?'selected':'')+'>Confirmée</option><option value="done" '+(r.status==='done'?'selected':'')+'>Réalisée</option></select></div>');
     }
   }
   $('mpg-certs').innerHTML=groups.join('')||'<p class="mpg-sub">Aucune certification importée.</p>';
 }
 $('mpg-day').addEventListener('change',draw);
 $('mpg-search').addEventListener('input',()=>{
   const current=$('mpg-day').value;draw();$('mpg-day').value=current;
 });
 $('mpg-certs').addEventListener('change',event=>{
   const sel=event.target.closest('[data-cert-id]');if(!sel)return;
   const current=read(CKEY),record=current.find(r=>r.id===sel.dataset.certId);if(!record)return;
   if(!['scheduled','confirmed','done'].includes(sel.value))return;
   try{localStorage.setItem(CKEY,JSON.stringify(current.map(r=>r.id===record.id?{...r,status:sel.value,updatedAt:new Date().toISOString()}:r)));draw()}catch{alert('Statut non enregistré.')}
 });
 window.MyTeamRefreshParifBoard=draw;
 window.addEventListener('storage',e=>{if([AKEY,CKEY].includes(e.key))draw()});
 draw();
})();