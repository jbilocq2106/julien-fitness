(()=>{
  const section=document.querySelector('#history');
  if(!section)return;

  const R={base:3608.63,sun:14.6014,night:4.1718,holiday:41.7182,otBase:20.8591,otSup:10.4296,chefDay:9.2475,xray:75,leaveHour:4.0789,fixedDed:165,depAllowance:692.83,care:.028,sick:.0025,pension:.085,dep:.014,credit:46.64};
  const TAX=[[3153.62,304.90],[3195.37,316.50],[3241.43,328.00],[3537.44,411.70]];
  const DEFAULT_ACTUAL={
    '2026-09':{net:3273.11,gross:4045.57,taxable:3153.62,tax:304.90,social:467.26,dependency:46.94,totalH:164,sunH:8,nightH:34.25,chefDays:4,leaveH:16,sunGross:116.81,nightGross:142.88,chefGross:36.99,leaveGross:65.26,xrayGross:75,holidayGross:0,otGross:0,source:'Fiche de paie septembre 2026'}
  };
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(n)||0);
  const hm=min=>`${Math.floor((Number(min)||0)/60)} h ${String(Math.round((Number(min)||0)%60)).padStart(2,'0')}`;
  const r2=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
  const currentKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
  const monthLabel=m=>{const [y,mo]=String(m).split('-').map(Number);return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1))};
  const payLabel=m=>{const [y,mo]=String(m).split('-').map(Number),d=new Date(y,mo,15);return `15 ${new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(d)}`};
  const dateLabel=d=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(new Date(`${d}T12:00:00`));
  const readObj=(key)=>{try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return{}}};
  const readRows=()=>{try{const x=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const isLeave=s=>/(vacances?|cong[eé])/i.test(String(s?.post||''));
  const isTraining=s=>s?.type==='training'||/formation/i.test(String(s?.post||''));
  const dt=(date,time)=>new Date(`${date}T${time}:00`);
  const interval=s=>{const a=dt(s.date,s.start),b=dt(s.date,s.end);if(b<=a)b.setDate(b.getDate()+1);return[a,b]};
  const rawDur=s=>{if(!s?.date||!s?.start||!s?.end)return 0;const [a,b]=interval(s);return Math.max(0,(b-a)/60000)};
  const dur=s=>Number.isFinite(Number(s?.plannedMinutes))?Number(s.plannedMinutes):(isLeave(s)?480:rawDur(s));
  const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c))/60000;
  const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da)}
  const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  function holidays(y){const e=easter(y);return new Set([new Date(y,0,1),add(e,1),new Date(y,4,1),new Date(y,4,9),add(e,39),add(e,50),new Date(y,5,23),new Date(y,7,15),new Date(y,10,1),new Date(y,11,25),new Date(y,11,26)].map(dayKey))}
  function weekKey(date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())),day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return `${d.getUTCFullYear()}-${Math.ceil((((d-y0)/86400000)+1)/7)}`}
  function tax(x){if(x<=TAX[0][0]){const[a,b]=TAX[0],[c,d]=TAX[1];return Math.max(0,b+(x-a)*(d-b)/(c-a))}for(let i=0;i<TAX.length-1;i++){const[a,b]=TAX[i],[c,d]=TAX[i+1];if(x<=c)return b+(x-a)*(d-b)/(c-a)}const[a,b]=TAX[TAX.length-2],[c,d]=TAX[TAX.length-1];return Math.max(0,d+(x-c)*(d-b)/(c-a))}

  function estimate(rows){
    let total=0,night=0,sunday=0,holiday=0,leaveM=0;const chefs=new Set(),weeks=new Map();
    for(const s of rows){
      if(!s?.date||!s?.start||!s?.end)continue;
      const minutes=dur(s);total+=minutes;
      if(isLeave(s)){leaveM+=minutes;continue}
      const [a,b]=interval(s);
      if(/chef d[’' ]?équipe/i.test(String(s.post||'')))chefs.add(s.date);
      weeks.set(weekKey(a),(weeks.get(weekKey(a))||0)+minutes);
      const first=new Date(a);first.setHours(0,0,0,0);first.setDate(first.getDate()-1);
      const last=new Date(b);last.setHours(0,0,0,0);last.setDate(last.getDate()+1);
      const hset=new Set([...holidays(a.getFullYear()),...holidays(b.getFullYear())]);
      for(let x=new Date(first);x<=last;x.setDate(x.getDate()+1)){
        const n1=new Date(x);n1.setHours(22,0,0,0);const n2=new Date(n1);n2.setHours(n2.getHours()+8);night+=overlap(a,b,n1,n2);
        if(x.getDay()===0){const s1=new Date(x);s1.setHours(6,0,0,0);const s2=new Date(s1);s2.setDate(s2.getDate()+1);sunday+=overlap(a,b,s1,s2)}
        if(hset.has(dayKey(x))){const h1=new Date(x);h1.setHours(0,0,0,0);const h2=new Date(h1);h2.setDate(h2.getDate()+1);holiday+=overlap(a,b,h1,h2)}
      }
    }
    let overtime=0;for(const m of weeks.values())overtime+=Math.max(0,m-2880);
    const sunGross=r2(sunday/60*R.sun),nightGross=r2(night/60*R.night),holidayGross=r2(holiday/60*R.holiday),leaveGross=r2(leaveM/60*R.leaveHour),otGross=r2(overtime/60*(R.otBase+R.otSup)),chefGross=r2(chefs.size*R.chefDay),xrayGross=localStorage.getItem('myteam_salary_xray')==='0'?0:R.xray;
    const gross=r2(R.base+sunGross+nightGross+holidayGross+leaveGross+otGross+chefGross+xrayGross),care=r2((gross-(overtime/60*R.otSup))*R.care),otherBase=gross-otGross,sick=r2(otherBase*R.sick),pen=r2(otherBase*R.pension),social=r2(care+sick+pen),dependency=r2(Math.max(0,gross-R.depAllowance)*R.dep),taxable=r2(Math.max(0,gross-social-sunGross-nightGross-holidayGross-otGross-R.fixedDed)),incomeTax=r2(tax(taxable)),net=r2(gross-social-dependency-incomeTax+R.credit);
    return{total,night,sunday,leave:leaveM,holiday,overtime,chefDays:chefs.size,sunGross,nightGross,leaveGross,holidayGross,otGross,chefGross,xrayGross,gross,net,taxable,tax:incomeTax,social,dependency};
  }

  function archivePastRows(){
    const current=currentKey(),history=readObj('myteam_planning_history'),active=readRows();let changed=false;
    for(const row of active){
      const m=String(row?.date||'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(m)||m>=current)continue;
      if(!history[m]){history[m]={rows:[],meta:{source:'planning-local'},savedAt:new Date().toISOString()};changed=true}
      if(!Array.isArray(history[m].rows))history[m].rows=[];
      const key=[row.date,row.start,row.end,row.post].join('|');
      if(!history[m].rows.some(x=>[x.date,x.start,x.end,x.post].join('|')===key)){history[m].rows.push(row);changed=true}
    }
    if(changed)try{localStorage.setItem('myteam_planning_history',JSON.stringify(history))}catch{}
    return history;
  }

  function summary(rows,calc,actual){
    const workDates=new Set(rows.filter(s=>!isLeave(s)).map(s=>s.date).filter(Boolean));
    const leaveDates=new Set(rows.filter(isLeave).map(s=>s.date).filter(Boolean));
    const trainingDates=new Set(rows.filter(isTraining).map(s=>s.date).filter(Boolean));
    const nightRows=rows.filter(s=>s.type==='night'||(/^\d{2}:\d{2}$/.test(s.start||'')&&(Number((s.start||'00').slice(0,2))>=20||Number((s.start||'00').slice(0,2))<4)));
    return{
      total:actual?.totalH!=null?actual.totalH*60:calc.total,
      work:workDates.size,
      leave:leaveDates.size||(actual?.leaveH?Math.round(actual.leaveH/8):0),
      training:trainingDates.size,
      nights:nightRows.length,
      nightMinutes:actual?.nightH!=null?actual.nightH*60:calc.night,
      sundayMinutes:actual?.sunH!=null?actual.sunH*60:calc.sunday,
      vacations:rows.length
    };
  }

  function details(rows){
    if(!rows.length)return '<div class="mh-empty">Planning non archivé pour ce mois.</div>';
    const grouped={};
    for(const r of [...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start).localeCompare(String(b.start))))(grouped[r.date]||(grouped[r.date]=[])).push(r);
    return Object.entries(grouped).map(([date,items])=>`<div class="mh-day"><b>${esc(dateLabel(date))}</b><div>${items.map(r=>`<span>${esc(r.start||'--:--')}–${esc(r.end||'--:--')} · ${esc(r.post||'Prestation')}</span>`).join('')}</div></div>`).join('');
  }

  function payBreakdown(calc,actual){
    const v=actual||calc;
    const lines=[
      ['Dimanche',v.sunGross],['Nuit 22h–6h',v.nightGross],['Chef d’équipe',v.chefGross],['Prime RX / X-ray',v.xrayGross],['Congés payés',v.leaveGross],['Jour férié',v.holidayGross],['Heures supplémentaires',v.otGross]
    ].filter(([,n])=>Number(n)>0);
    return lines.map(([name,n])=>`<div><span>${esc(name)}</span><b>+ ${euro(n)}</b></div>`).join('');
  }

  function removeSalaryPastCards(){
    document.querySelectorAll('#salary .card h3').forEach(h=>{if(/mois termin[eé]s/i.test(h.textContent||''))h.closest('.card')?.remove()});
  }

  function cleanupPlanningPast(){
    document.querySelector('#planning-period-tabs')?.remove();
    document.querySelector('#planning-history-panel')?.remove();
    const planning=document.querySelector('#planning');
    planning?.querySelectorAll(':scope > .card').forEach(c=>c.classList.remove('hidden'));
  }

  function render(){
    const tab=document.querySelector('[data-tab="history"]');if(tab)tab.textContent='📚 Historique';
    cleanupPlanningPast();removeSalaryPastCards();
    const current=currentKey(),history=archivePastRows(),storedActual=readObj('myteam_salary_actuals'),actuals={...DEFAULT_ACTUAL,...storedActual};
    const months=new Set([...Object.keys(history),...Object.keys(actuals)]);
    const list=[...months].filter(m=>/^\d{4}-\d{2}$/.test(m)&&m<current).sort().reverse();
    section.innerHTML='<h2>Historique</h2><p class="muted">Chaque mois terminé regroupe le planning, les heures, les primes et la paie du mois.</p><div id="mh-list"></div>';
    const host=section.querySelector('#mh-list');
    if(!list.length){host.innerHTML='<div class="mh-empty">Aucun mois terminé enregistré pour le moment.</div>';return}
    host.innerHTML=list.map(m=>{
      const item=history[m]||{},rows=Array.isArray(item.rows)?item.rows:[],calc=estimate(rows),actual=actuals[m]||null,s=summary(rows,calc,actual),pay=actual||calc;
      const saved=item.savedAt?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(item.savedAt)):'';
      const source=item?.meta?.fileName||item?.meta?.source||'';
      return `<article class="mh-card">
        <div class="mh-head"><div><h3>${esc(monthLabel(m))}</h3><div class="mh-sub">Mois terminé${saved?` · archivé le ${esc(saved)}`:''}</div></div><span class="mh-badge ${actual?'real':'estimate'}">${actual?'Paie réelle':'Paie estimée'}</span></div>
        <div class="mh-pay"><div><span>Net</span><b>${actual?'':'≈ '}${euro(pay.net)}</b></div><div><span>Brut</span><b>${euro(pay.gross)}</b></div><small>Versement : ${esc(payLabel(m))}${actual?.source?` · ${esc(actual.source)}`:''}</small></div>
        <div class="mh-stats">
          <div><span>Total planning</span><b>${hm(s.total)}</b></div><div><span>Jours travaillés</span><b>${s.work}</b></div>
          <div><span>Nuit 22h–6h</span><b>${hm(s.nightMinutes)}</b></div><div><span>Dimanche</span><b>${hm(s.sundayMinutes)}</b></div>
          <div><span>Congés</span><b>${s.leave} j</b></div><div><span>Formation</span><b>${s.training} j</b></div>
        </div>
        <details class="mh-pay-details"><summary>Détail de la paie et des primes</summary><div class="mh-breakdown">${payBreakdown(calc,actual)}${actual?`<div><span>Impôt</span><b>− ${euro(actual.tax)}</b></div><div><span>Cotisations sociales</span><b>− ${euro(actual.social)}</b></div>`:''}</div></details>
        ${source?`<div class="mh-source">Planning : ${esc(source)}</div>`:''}
        <details><summary>Voir le planning du mois</summary><div class="mh-days">${details(rows)}</div></details>
      </article>`;
    }).join('');
  }

  if(!document.querySelector('#myteam-history-v2-style')){
    const style=document.createElement('style');style.id='myteam-history-v2-style';style.textContent=`
      #history{background:transparent;padding:0}#history>h2,#history>p{padding-left:3px}.mh-card{background:#1d293d;border:1px solid #40536a;border-radius:16px;padding:15px;margin-bottom:12px}.mh-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.mh-head h3{margin:0;text-transform:capitalize}.mh-sub,.mh-source{font-size:12px;color:#aebacc;margin-top:4px}.mh-badge{font-size:11px;font-weight:850;border-radius:999px;padding:7px 9px;white-space:nowrap}.mh-badge.real{background:#1f6a49}.mh-badge.estimate{background:#6a5523}.mh-pay{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#132033;border-radius:12px;padding:11px;margin:12px 0}.mh-pay div{display:grid;gap:3px}.mh-pay div:last-of-type{text-align:right}.mh-pay span,.mh-pay small{font-size:11px;color:#aebacc}.mh-pay b{font-size:20px}.mh-pay small{grid-column:1/-1}.mh-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}.mh-stats div{background:#25344a;border-radius:10px;padding:9px}.mh-stats span{display:block;color:#aebacc;font-size:11px}.mh-stats b{font-size:15px}.mh-card details{margin-top:11px}.mh-card summary{cursor:pointer;font-weight:800}.mh-breakdown{display:grid;gap:6px;margin-top:9px}.mh-breakdown div{display:flex;justify-content:space-between;gap:10px;background:#17263a;border-radius:9px;padding:8px}.mh-breakdown span{color:#c6d0dd}.mh-days{display:grid;gap:7px;margin-top:10px}.mh-day{padding:9px;background:#25344a;border-radius:9px}.mh-day>div{display:grid;gap:3px;margin-top:4px}.mh-day span{font-size:12px;color:#dce4ef}.mh-empty{padding:18px;text-align:center;background:#1d293d;border:1px dashed #55677d;border-radius:12px;color:#aebacc}
    `;document.head.append(style)
  }

  document.addEventListener('click',e=>{
    if(e.target?.dataset?.tab==='history')setTimeout(render,0);
    if(e.target?.dataset?.tab==='salary')setTimeout(removeSalaryPastCards,30);
  });
  const salary=document.querySelector('#salary');if(salary)new MutationObserver(removeSalaryPastCards).observe(salary,{childList:true,subtree:true});
  render();
  window.MyTeamRenderHistory=render;
})();
