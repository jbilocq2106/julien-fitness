(()=>{
  const section=document.querySelector('#planning');
  if(!section)return;

  const CURRENT_KEY=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const label=m=>{const [y,mo]=String(m).split('-').map(Number);return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1));};
  const dateLabel=d=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(`${d}T12:00:00`));
  const money=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const hm=min=>`${Math.floor(min/60)} h ${String(Math.round(min%60)).padStart(2,'0')}`;
  const isLeave=s=>/(vacances?|cong[eé])/i.test(String(s?.post||''));
  const isTraining=s=>s?.type==='training'||/formation/i.test(String(s?.post||''));
  const minutes=s=>{
    if(Number.isFinite(Number(s?.plannedMinutes)))return Number(s.plannedMinutes);
    if(!s?.start||!s?.end)return 0;
    const [ah,am]=s.start.split(':').map(Number),[bh,bm]=s.end.split(':').map(Number);
    let a=ah*60+am,b=bh*60+bm;if(b<a)b+=1440;
    return Math.max(0,b-a);
  };
  const readHistory=()=>{try{const x=JSON.parse(localStorage.getItem('myteam_planning_history')||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return{}}};
  const readActive=()=>{try{const x=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');return Array.isArray(x)?x:[]}catch{return[]}};

  function combinedHistory(){
    const history=readHistory(),current=CURRENT_KEY(),active=readActive();
    for(const row of active){
      const m=String(row?.date||'').slice(0,7);
      if(!/^\d{4}-\d{2}$/.test(m)||m>=current)continue;
      if(!history[m])history[m]={rows:[],meta:{source:'planning-local'},savedAt:''};
      if(!Array.isArray(history[m].rows))history[m].rows=[];
      const key=[row.date,row.start,row.end,row.post].join('|');
      if(!history[m].rows.some(x=>[x.date,x.start,x.end,x.post].join('|')===key))history[m].rows.push(row);
    }
    return history;
  }

  function summary(rows){
    rows=Array.isArray(rows)?rows:[];
    const dates=new Set(rows.map(s=>s.date).filter(Boolean));
    const workDates=new Set(rows.filter(s=>!isLeave(s)).map(s=>s.date).filter(Boolean));
    const leaveDates=new Set(rows.filter(isLeave).map(s=>s.date).filter(Boolean));
    const nightRows=rows.filter(s=>s.type==='night'||(/^\d{2}:\d{2}$/.test(s.start||'')&&(Number((s.start||'00').slice(0,2))>=20||Number((s.start||'00').slice(0,2))<4)));
    const sundayDates=new Set(rows.filter(s=>{if(!s.date)return false;return new Date(`${s.date}T12:00:00`).getDay()===0;}).map(s=>s.date));
    const trainingDates=new Set(rows.filter(isTraining).map(s=>s.date).filter(Boolean));
    return {
      total:rows.reduce((n,s)=>n+minutes(s),0),
      dates:dates.size,
      work:workDates.size,
      leave:leaveDates.size,
      nights:nightRows.length,
      sundays:sundayDates.size,
      training:trainingDates.size
    };
  }

  function detailHtml(rows){
    const grouped={};
    for(const r of [...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start).localeCompare(String(b.start))))(grouped[r.date]||(grouped[r.date]=[])).push(r);
    return Object.entries(grouped).map(([date,items])=>`<div class="ph-day"><b>${esc(dateLabel(date))}</b><div>${items.map(r=>`<span>${esc(r.start||'--:--')}–${esc(r.end||'--:--')} · ${esc(r.post||'Prestation')}</span>`).join('')}</div></div>`).join('');
  }

  function renderHistory(){
    const host=document.querySelector('#planning-history-panel');if(!host)return;
    const current=CURRENT_KEY(),history=combinedHistory(),months=Object.keys(history).filter(m=>/^\d{4}-\d{2}$/.test(m)&&m<current).sort().reverse();
    if(!months.length){host.innerHTML='<div class="ph-empty">Aucun mois passé archivé pour le moment. Les plannings importés d’un mois terminé apparaîtront ici automatiquement.</div>';return;}
    const actuals=window.MyTeamSalaryActuals||{};
    host.innerHTML=months.map(m=>{
      const item=history[m]||{},rows=Array.isArray(item.rows)?item.rows:[],s=summary(rows),pay=actuals[m];
      const saved=item.savedAt?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(item.savedAt)):'';
      const source=item?.meta?.fileName||item?.meta?.source||'';
      return `<article class="ph-card">
        <div class="ph-head"><div><h3>${esc(label(m))}</h3><div class="ph-sub">Mois terminé${saved?` · archivé le ${esc(saved)}`:''}</div></div><div class="ph-hours">${hm(s.total)}</div></div>
        <div class="ph-grid">
          <div><span>Jours travaillés</span><b>${s.work}</b></div>
          <div><span>Nuits</span><b>${s.nights}</b></div>
          <div><span>Dimanches</span><b>${s.sundays}</b></div>
          <div><span>Congés</span><b>${s.leave} j</b></div>
          <div><span>Formation</span><b>${s.training} j</b></div>
          <div><span>Vacations</span><b>${rows.length}</b></div>
        </div>
        ${pay?`<div class="ph-pay"><span>Paie réelle</span><b>${money(pay.net)} net</b><small>${money(pay.gross)} brut · ${esc(pay.source||'fiche de paie')}</small></div>`:''}
        ${source?`<div class="ph-source">Source : ${esc(source)}</div>`:''}
        <details><summary>Voir le détail du planning</summary><div class="ph-details">${detailHtml(rows)}</div></details>
      </article>`;
    }).join('');
  }

  const firstCard=section.querySelector('.card');
  const personalCard=section.querySelectorAll(':scope > .card')[1]||null;
  if(!firstCard)return;
  let tabs=document.querySelector('#planning-period-tabs');
  if(!tabs){
    tabs=document.createElement('div');tabs.id='planning-period-tabs';tabs.className='ph-tabs';
    tabs.innerHTML='<button type="button" class="active" data-ph-view="current">Mois en cours</button><button type="button" data-ph-view="past">Mois passés</button>';
    const h2=firstCard.querySelector('h2');h2?.after(tabs);
  }
  let panel=document.querySelector('#planning-history-panel');
  if(!panel){panel=document.createElement('div');panel.id='planning-history-panel';panel.className='hidden';firstCard.append(panel);}

  if(!document.querySelector('#planning-history-style')){
    const style=document.createElement('style');style.id='planning-history-style';style.textContent=`
      .ph-tabs{display:flex;gap:8px;margin:12px 0 14px}.ph-tabs button{flex:1;background:#27364c;border:1px solid #46566c}.ph-tabs button.active{background:#e76b24;border-color:#e76b24}
      #planning-history-panel{display:grid;gap:12px}.ph-card{background:#132033;border:1px solid #3b4e66;border-radius:15px;padding:14px}.ph-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ph-head h3{margin:0;text-transform:capitalize}.ph-sub,.ph-source{font-size:12px;color:#aebacc;margin-top:4px}.ph-hours{font-size:21px;font-weight:900;white-space:nowrap}.ph-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.ph-grid div{background:#1d293d;border-radius:10px;padding:9px}.ph-grid span{display:block;color:#aebacc;font-size:11px}.ph-grid b{font-size:16px}.ph-pay{display:grid;grid-template-columns:1fr auto;gap:2px 10px;background:#173b2d;border:1px solid #2e7656;border-radius:11px;padding:10px;margin:10px 0}.ph-pay span{font-size:12px;color:#b9d8ca}.ph-pay b{text-align:right}.ph-pay small{grid-column:1/-1;color:#b9d8ca}.ph-card details{margin-top:10px}.ph-card summary{cursor:pointer;font-weight:800}.ph-details{display:grid;gap:7px;margin-top:10px}.ph-day{padding:9px;background:#1d293d;border-radius:9px}.ph-day>div{display:grid;gap:3px;margin-top:4px}.ph-day span{font-size:12px;color:#dce4ef}.ph-empty{padding:18px;text-align:center;background:#132033;border:1px dashed #55677d;border-radius:12px;color:#aebacc}
    `;document.head.append(style);
  }

  const monthEl=firstCard.querySelector('#month'),legend=firstCard.querySelector('.legend'),grid=firstCard.querySelector('#grid');
  function setView(view){
    const past=view==='past';
    tabs.querySelectorAll('[data-ph-view]').forEach(b=>b.classList.toggle('active',b.dataset.phView===view));
    monthEl?.classList.toggle('hidden',past);legend?.classList.toggle('hidden',past);grid?.classList.toggle('hidden',past);panel.classList.toggle('hidden',!past);personalCard?.classList.toggle('hidden',past);
    if(past)renderHistory();
    try{sessionStorage.setItem('myteam_planning_period_view',view)}catch{}
  }
  tabs.querySelectorAll('[data-ph-view]').forEach(b=>b.onclick=()=>setView(b.dataset.phView));
  let initial='current';try{if(sessionStorage.getItem('myteam_planning_period_view')==='past')initial='past'}catch{}
  setView(initial);

  const oldHistoryBtn=document.querySelector('[data-tab="history"]');
  const oldHistorySection=document.querySelector('#history');
  if(oldHistoryBtn){oldHistoryBtn.textContent='📅 Mois passés';oldHistoryBtn.onclick=()=>{
    const planningBtn=document.querySelector('[data-tab="planning"]');
    document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===planningBtn));
    document.querySelectorAll('main section').forEach(s=>s.classList.toggle('hidden',s.id!=='planning'));
    setView('past');
  };}
  if(oldHistorySection)oldHistorySection.classList.add('hidden');

  window.MyTeamRenderPlanningHistory=renderHistory;
})();
