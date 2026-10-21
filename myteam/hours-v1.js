(()=>{
  'use strict';
  const fmt=min=>Math.floor(min/60)+' h '+String(Math.round(min%60)).padStart(2,'0');
  const toDate=(date,time)=>new Date(date+'T'+time+':00');
  const interval=s=>{const a=toDate(s.date,s.start),b=toDate(s.date,s.end);if(b<=a)b.setDate(b.getDate()+1);return[a,b]};
  const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c))/60000;
  const isLeave=s=>s?.type==='leave'||/(vacances?|cong[eé])/i.test(s?.post||'');
  const duration=s=>{
    if(s?.plannedMinutes!==undefined&&s.plannedMinutes!==null&&Number.isFinite(Number(s.plannedMinutes)))return Number(s.plannedMinutes);
    if(isLeave(s))return 480;
    const[a,b]=interval(s);return(b-a)/60000;
  };
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const currentMonth=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
  let selectedMonth=currentMonth();
  function rowsForMonth(month){
    const active=read('myteam_shifts',[]);
    const found=Array.isArray(active)?active.filter(s=>String(s?.date||'').slice(0,7)===month):[];
    if(found.length)return found;
    const historical=read('myteam_planning_history',{});
    const archived=historical?.[month]?.rows;
    return Array.isArray(archived)?archived.filter(s=>String(s?.date||'').slice(0,7)===month):[];
  }
  function monthsAvailable(){
    const data=read('myteam_shifts',[]);
    const history=read('myteam_planning_history',{});
    const months=new Set([selectedMonth]);
    if(Array.isArray(data))for(const row of data){
      const month=String(row?.date||'').slice(0,7);
      if(/^\d{4}-\d{2}$/.test(month))months.add(month);
    }
    if(history&&typeof history==='object')for(const month of Object.keys(history))if(/^\d{4}-\d{2}$/.test(month))months.add(month);
    return [...months].sort();
  }
  function calc(rows){
    let worked=0,night=0,sunday=0,both=0,training=0,chef=0;
    const importedLeave=new Set();
    for(const s of rows){
      if(!s?.date||!s?.start||!s?.end)continue;
      if(isLeave(s)){importedLeave.add(s.date);continue;}
      const dur=duration(s);worked+=dur;
      if(/formation/i.test(s.post||''))training+=dur;
      if(/chef d[’' ]?équipe/i.test(s.post||''))chef+=dur;
      const[a,b]=interval(s);
      const startDay=new Date(a);startDay.setHours(0,0,0,0);startDay.setDate(startDay.getDate()-1);
      const endDay=new Date(b);endDay.setHours(0,0,0,0);endDay.setDate(endDay.getDate()+1);
      for(let d=new Date(startDay);d<=endDay;d.setDate(d.getDate()+1)){
        const n1=new Date(d);n1.setHours(22,0,0,0);const n2=new Date(n1);n2.setHours(n2.getHours()+8);
        night+=overlap(a,b,n1,n2);
        if(d.getDay()===0){
          const s1=new Date(d);s1.setHours(6,0,0,0);const s2=new Date(s1);s2.setDate(s2.getDate()+1);
          sunday+=overlap(a,b,s1,s2);
          const lo=new Date(Math.max(a,s1)),hi=new Date(Math.min(b,s2));
          if(hi>lo){
            const sn1=new Date(d);sn1.setHours(22,0,0,0);
            const sn2=new Date(sn1);sn2.setHours(sn2.getHours()+8);
            both+=overlap(lo,hi,sn1,sn2);
          }
        }
      }
    }
    const leave=read('myteam_paid_leave_days_v1',[]);
    if(Array.isArray(leave))for(const day of leave){
      if(String(day).startsWith(selectedMonth))importedLeave.add(day);
    }
    const leaveMinutes=importedLeave.size*480;
    const credit=selectedMonth==='2026-11'&&!rows.some(x=>x?.date==='2026-11-01')&&!importedLeave.has('2026-11-01')?480:0;
    return{worked,leaveMinutes,credit,total:worked+leaveMinutes+credit,night,sunday,both,training,chef,leaveDays:importedLeave.size};
  }
  function render(){
    const box=document.querySelector('#hours');if(!box)return;
    const options=monthsAvailable().map(month=>{
      const label=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(month+'-01T12:00:00'));
      return '<option value="'+month+'"'+(month===selectedMonth?' selected':'')+'>'+label+'</option>';
    }).join('');
    const c=calc(rowsForMonth(selectedMonth));
    const hasRows=rowsForMonth(selectedMonth).length>0;
    box.innerHTML='<h2>Mes heures</h2><label for="mt-hours-month" style="display:block;margin-bottom:12px;font-weight:750">Mois consulté</label>'+
      '<select id="mt-hours-month" style="width:100%;background:#27364c;border:1px solid #50647d;color:white;border-radius:10px;font-size:16px;padding:12px;margin-bottom:12px">'+options+'</select>'+
      '<div class="card">'+
      (!hasRows&&!c.leaveDays&&!c.credit?'<p class="muted">Aucun poste enregistré pour ce mois. Le roulement théorique ne remplace pas le planning officiel.</p>':
        '<p><strong>Total comptabilisé : '+fmt(c.total)+'</strong></p>'+
        '<p>Heures travaillées : <b>'+fmt(c.worked)+'</b></p>'+
        '<p>Congés payés : <b>'+fmt(c.leaveMinutes)+'</b> ('+c.leaveDays+' jour(s) × 8 h)</p>'+ (c.credit?'<p>1er novembre, férié comptabilisé : <b>+8 h</b></p>':'')+
        '<hr style="border:0;border-top:1px solid #41536a;margin:14px 0">'+
        '<p><b>🌙 Nuit — 22 h à 6 h</b><br>'+fmt(c.night)+'</p>'+
        '<p><b>☀️ Dimanche — dimanche 6 h à lundi 6 h</b><br>'+fmt(c.sunday)+'</p>'+
        '<p><b>🌙☀️ Nuit + dimanche</b><br>'+fmt(c.both)+'</p>'+
        '<p><b>👔 Chef d’équipe</b><br>'+fmt(c.chef)+'</p>'+
        '<p><b>🎓 Formation</b><br>'+fmt(c.training)+'</p>'+
        '<p class="muted">Les catégories peuvent se chevaucher : les heures de nuit et de dimanche sont comprises dans les heures travaillées. Les congés ne sont pas du travail effectif.</p>')+
      '</div>';
    box.querySelector('#mt-hours-month').onchange=e=>{selectedMonth=e.target.value;render()};
  }
  const syncMonthFromPlanner=()=>{
    const plannerMonth=document.querySelector('#grid')?.dataset?.cycleMonth;
    if(/^\d{4}-\d{2}$/.test(plannerMonth||''))selectedMonth=plannerMonth;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  document.addEventListener('click',e=>{if(e.target?.dataset?.tab==='hours')setTimeout(()=>{syncMonthFromPlanner();render()},0)});
  window.addEventListener('storage',e=>{if(['myteam_shifts','myteam_planning_history','myteam_paid_leave_days_v1'].includes(e.key))render()});
  window.MyTeamRenderHours=render;
})();
window.MyTeamSalaryActuals=window.MyTeamSalaryActuals||{'2026-09':{net:3273.11,gross:4045.57,source:'Fiche de paie septembre 2026'}};
(()=>{if(document.querySelector('script[data-myteam-planning-history]'))return;const s=document.createElement('script');s.src='./planning-history-v1.js?v=20261017-1';s.dataset.myteamPlanningHistory='1';document.head.appendChild(s);setTimeout(()=>{const b=document.querySelector('[data-tab="history"]');if(b)b.style.display='none'},0)})();
