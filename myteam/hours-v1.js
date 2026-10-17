(()=>{
  const fmt=min=>Math.floor(min/60)+' h '+String(Math.round(min%60)).padStart(2,'0');
  const toDate=(date,time)=>new Date(date+'T'+time+':00');
  const interval=s=>{const a=toDate(s.date,s.start),b=toDate(s.date,s.end);if(b<=a)b.setDate(b.getDate()+1);return[a,b]};
  const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c))/60000;
  const duration=s=>{const[a,b]=interval(s);return(b-a)/60000};
  function read(){try{const x=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function calc(rows){
    let total=0,night=0,sunday=0,both=0,training=0,chef=0;
    for(const s of rows){
      if(!s?.date||!s?.start||!s?.end)continue;
      const[a,b]=interval(s);total+=duration(s);
      if(/formation/i.test(s.post||''))training+=duration(s);
      if(/chef d[’' ]?équipe/i.test(s.post||''))chef+=duration(s);
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
            const sn1=new Date(d);sn1.setHours(22,0,0,0);const sn2=new Date(sn1);sn2.setHours(sn2.getHours()+8);
            both+=overlap(lo,hi,sn1,sn2);
          }
        }
      }
    }
    return{total,night,sunday,both,training,chef};
  }
  function render(){
    const box=document.querySelector('#hours');if(!box)return;
    const rows=read();
    if(!rows.length){box.innerHTML='<h2>Mes heures</h2><div class="card"><strong>Aucun planning chargé</strong><p class="muted">Importe ton planning pour calculer automatiquement les heures.</p></div>';return}
    const c=calc(rows);
    box.innerHTML=`<h2>Mes heures</h2><div class="card">
      <p><strong>Total planning : ${fmt(c.total)}</strong></p>
      <p><b>🌙 Nuit — 22h à 6h</b><br>${fmt(c.night)}</p>
      <p><b>☀️ Dimanche — dimanche 6h à lundi 6h</b><br>${fmt(c.sunday)}</p>
      <p><b>🌙☀️ Nuit + dimanche</b><br>${fmt(c.both)}</p>
      <p><b>👔 Chef d’équipe</b><br>${fmt(c.chef)}</p>
      <p><b>🎓 Formation</b><br>${fmt(c.training)}</p>
      <p class="muted">Les catégories se chevauchent : une même heure peut compter à la fois en nuit et en dimanche.</p>
    </div>`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  document.addEventListener('click',e=>{if(e.target?.dataset?.tab==='hours')setTimeout(render,0)});
  window.MyTeamRenderHours=render;
})();
