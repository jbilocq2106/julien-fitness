(()=>{
  const RATES={
    baseMonthly:3608.63,
    sunday:14.6014,
    night:4.1718,
    holiday:41.7182,
    overtimeBase:20.8591,
    overtimeSupplement:10.4296,
    chefPerDay:9.2475,
    xray:75,
    fixedTaxDeduction:165,
    dependencyAllowance:692.83,
    careRate:0.028,
    sicknessRate:0.0025,
    pensionRate:0.085,
    dependencyRate:0.014,
    creditEstimate:46.5
  };
  const TAX_POINTS=[[3153.62,304.90],[3195.37,316.50],[3241.43,328.00],[3537.44,411.70]];
  const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n||0);
  const hours=m=>`${Math.floor(m/60)} h ${String(Math.round(m%60)).padStart(2,'0')}`;
  const at=(date,time)=>new Date(`${date}T${time}:00`);
  const interval=s=>{const a=at(s.date,s.start),b=at(s.date,s.end);if(b<=a)b.setDate(b.getDate()+1);return[a,b]};
  const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c))/60000;
  const duration=s=>{const[a,b]=interval(s);return(b-a)/60000};
  const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  function readRows(){try{const x=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function monthRows(rows){
    const counts={};for(const s of rows){const m=String(s.date||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))counts[m]=(counts[m]||0)+1}
    const month=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
    return {month,rows:rows.filter(s=>String(s.date||'').startsWith(month))};
  }
  function monthLabel(m){if(!m)return'';const[y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1))}

  function easterSunday(year){
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
    return new Date(year,month-1,day);
  }
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
  function luxHolidays(year){
    const easter=easterSunday(year);
    const dates=[new Date(year,0,1),addDays(easter,1),new Date(year,4,1),new Date(year,4,9),addDays(easter,39),addDays(easter,50),new Date(year,5,23),new Date(year,7,15),new Date(year,10,1),new Date(year,11,25),new Date(year,11,26)];
    return new Set(dates.map(dayKey));
  }
  function isoWeekKey(date){
    const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
    const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));const w=Math.ceil((((d-y0)/86400000)+1)/7);
    return `${d.getUTCFullYear()}-W${String(w).padStart(2,'0')}`;
  }
  function empiricalTax(taxable){
    const pts=TAX_POINTS;
    if(taxable<=pts[0][0]){const[a,b]=pts[0], [c,d]=pts[1];return Math.max(0,b+(taxable-a)*(d-b)/(c-a));}
    for(let i=0;i<pts.length-1;i++){const[a,b]=pts[i],[c,d]=pts[i+1];if(taxable<=c)return b+(taxable-a)*(d-b)/(c-a)}
    const[a,b]=pts[pts.length-2],[c,d]=pts[pts.length-1];return Math.max(0,d+(taxable-c)*(d-b)/(c-a));
  }

  function calculate(rows,includeXray=true){
    let total=0,night=0,sunday=0,holiday=0;
    const chefDays=new Set(),weekly=new Map();
    for(const s of rows){
      if(!s?.date||!s?.start||!s?.end)continue;
      const[a,b]=interval(s),dur=duration(s);total+=dur;
      if(/chef d[’' ]?équipe/i.test(s.post||''))chefDays.add(s.date);
      const wk=isoWeekKey(a);weekly.set(wk,(weekly.get(wk)||0)+dur);
      const first=new Date(a);first.setHours(0,0,0,0);first.setDate(first.getDate()-1);
      const last=new Date(b);last.setHours(0,0,0,0);last.setDate(last.getDate()+1);
      const years=new Set([a.getFullYear(),b.getFullYear()]);const holidays=new Set();for(const y of years)for(const x of luxHolidays(y))holidays.add(x);
      for(let d=new Date(first);d<=last;d.setDate(d.getDate()+1)){
        const n1=new Date(d);n1.setHours(22,0,0,0);const n2=new Date(n1);n2.setHours(n2.getHours()+8);night+=overlap(a,b,n1,n2);
        if(d.getDay()===0){const s1=new Date(d);s1.setHours(6,0,0,0);const s2=new Date(s1);s2.setDate(s2.getDate()+1);sunday+=overlap(a,b,s1,s2)}
        if(holidays.has(dayKey(d))){const h1=new Date(d);h1.setHours(0,0,0,0);const h2=new Date(h1);h2.setDate(h2.getDate()+1);holiday+=overlap(a,b,h1,h2)}
      }
    }
    let overtime=0;for(const h of weekly.values())overtime+=Math.max(0,h-48*60);
    const sundayGross=sunday/60*RATES.sunday,nightGross=night/60*RATES.night,holidayGross=holiday/60*RATES.holiday;
    const overtimeHours=overtime/60,overtimeBaseGross=overtimeHours*RATES.overtimeBase,overtimeSuppGross=overtimeHours*RATES.overtimeSupplement;
    const chefGross=chefDays.size*RATES.chefPerDay,xrayGross=includeXray?RATES.xray:0;
    const gross=RATES.baseMonthly+sundayGross+nightGross+holidayGross+overtimeBaseGross+overtimeSuppGross+chefGross+xrayGross;
    const careBase=Math.max(0,gross-overtimeSuppGross),otherSocialBase=Math.max(0,gross-overtimeBaseGross-overtimeSuppGross);
    const care=careBase*RATES.careRate,sickness=otherSocialBase*RATES.sicknessRate,pension=otherSocialBase*RATES.pensionRate,social=care+sickness+pension;
    const dependency=Math.max(0,gross-RATES.dependencyAllowance)*RATES.dependencyRate;
    const taxExempt=sundayGross+nightGross+holidayGross+overtimeBaseGross+overtimeSuppGross;
    const taxable=Math.max(0,gross-social-taxExempt-RATES.fixedTaxDeduction);
    const tax=empiricalTax(taxable),credit=RATES.creditEstimate;
    const net=gross-social-dependency-tax+credit;
    return {total,night,sunday,holiday,overtime,chefDays:chefDays.size,sundayGross,nightGross,holidayGross,overtimeGross:overtimeBaseGross+overtimeSuppGross,chefGross,xrayGross,gross,social,dependency,taxable,tax,credit,net};
  }

  function ensureUI(){
    const nav=document.querySelector('.tabs');const main=document.querySelector('main');if(!nav||!main)return null;
    let tab=document.querySelector('[data-tab="salary"]');
    if(!tab){tab=document.createElement('button');tab.type='button';tab.dataset.tab='salary';tab.textContent='💶 Salaire';const hoursTab=document.querySelector('[data-tab="hours"]');hoursTab?.after(tab);}
    let section=document.querySelector('#salary');
    if(!section){section=document.createElement('section');section.id='salary';section.className='hidden card';main.append(section)}
    tab.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));document.querySelectorAll('main section').forEach(s=>s.classList.toggle('hidden',s!==section));render()};
    return section;
  }

  function render(){
    const section=ensureUI();if(!section)return;
    const all=readRows(),picked=monthRows(all),label=monthLabel(picked.month);
    if(!picked.rows.length){section.innerHTML='<h2>Salaire</h2><p>Aucun planning chargé.</p>';return}
    const includeXray=localStorage.getItem('myteam_salary_xray')!=='0';
    const c=calculate(picked.rows,includeXray);
    section.innerHTML=`<h2>Salaire — ${label}</h2>
      <div style="background:#132033;border:1px solid #40536a;border-radius:14px;padding:15px;margin-bottom:12px">
        <div style="font-size:13px;color:#aebacc">Prévision à partir du planning et de tes dernières fiches G4S</div>
        <div style="font-size:28px;font-weight:900;margin:5px 0">≈ ${euro(c.net)} net</div>
        <div style="font-size:17px;font-weight:800">${euro(c.gross)} brut estimé</div>
      </div>
      <div class="card" style="margin:0 0 12px;background:#17263a">
        <p><b>Base mensuelle</b><span style="float:right">${euro(RATES.baseMonthly)}</span></p>
        <p><b>Dimanche</b> — ${hours(c.sunday)}<span style="float:right">+ ${euro(c.sundayGross)}</span></p>
        <p><b>Nuit 22h–6h</b> — ${hours(c.night)}<span style="float:right">+ ${euro(c.nightGross)}</span></p>
        ${c.holiday?`<p><b>Férié</b> — ${hours(c.holiday)}<span style="float:right">+ ${euro(c.holidayGross)}</span></p>`:''}
        ${c.overtime?`<p><b>Dépassement 48 h/semaine</b> — ${hours(c.overtime)}<span style="float:right">+ ${euro(c.overtimeGross)}</span></p>`:''}
        <p><b>Chef d’équipe</b> — ${c.chefDays} jour${c.chefDays>1?'s':''}<span style="float:right">+ ${euro(c.chefGross)}</span></p>
        <p><label style="display:flex;justify-content:space-between;gap:10px"><span><b>Prime RX/X-ray</b> (prévision)</span><input id="salary-xray" type="checkbox" ${includeXray?'checked':''}></label><span style="float:right">${includeXray?'+ '+euro(c.xrayGross):'0 €'}</span><br style="clear:both"></p>
      </div>
      <div class="card" style="margin:0;background:#17263a">
        <p><b>Total planning</b><span style="float:right">${hours(c.total)}</span></p>
        <p><b>Cotisations sociales estimées</b><span style="float:right">− ${euro(c.social+c.dependency)}</span></p>
        <p><b>Imposable estimé</b><span style="float:right">${euro(c.taxable)}</span></p>
        <p><b>Impôt estimé</b><span style="float:right">− ${euro(c.tax)}</span></p>
        <p><b>Crédits d’impôt estimés</b><span style="float:right">+ ${euro(c.credit)}</span></p>
        <hr style="border:0;border-top:1px solid #46576b"><p><b>NET PRÉVISIONNEL</b><span style="float:right;font-size:20px">${euro(c.net)}</span></p>
        <p class="muted" style="clear:both;font-size:12px">Estimation, pas une fiche de paie. Paramètres calibrés sur tes bulletins 2026 : base 3 608,63 €, dimanche 70 %, nuit 20 %, prime de fonction par journée chef, cotisations et barème d’impôt observés. La prime RX peut varier selon l’éligibilité du mois. Quand une nouvelle fiche de paie est disponible, les paramètres peuvent être recalibrés.</p>
      </div>`;
    const x=section.querySelector('#salary-xray');if(x)x.onchange=()=>{localStorage.setItem('myteam_salary_xray',x.checked?'1':'0');render()};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,0));else setTimeout(render,0);
  document.addEventListener('click',e=>{if(e.target?.dataset?.tab==='salary')setTimeout(render,0)});
  window.MyTeamRenderSalary=render;
})();
