(()=>{
  let imported=false,importError='';
  const decodeBase64Url=value=>{
    const base64=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');
    const binary=atob(base64);
    return new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
  };
  const validShift=x=>x&&typeof x==='object'&&/^\d{4}-\d\d-\d\d$/.test(x.date)&&/^\d\d:\d\d$/.test(x.start)&&/^\d\d:\d\d$/.test(x.end)&&typeof (x.post||'')==='string'&&['morning','afternoon','night','training'].includes(x.type);
  const match=location.hash.match(/^#planning=([A-Za-z0-9_-]+)$/);
  if(match){
    try{
      const payload=JSON.parse(decodeBase64Url(match[1]));
      const rows=Array.isArray(payload)?payload:payload.shifts;
      if(!Array.isArray(rows)||!rows.length||rows.length>100||!rows.every(validShift))throw Error('Format de planning invalide');
      localStorage.setItem('myteam_shifts',JSON.stringify(rows));
      if(payload&&payload.meta&&typeof payload.meta==='object')localStorage.setItem('myteam_planning_meta',JSON.stringify(payload.meta));
      imported=true;
      history.replaceState(null,'',location.pathname+location.search);
    }catch(err){
      importError=err?.message||'Import impossible';
      history.replaceState(null,'',location.pathname+location.search);
    }
  }

  const minutes=(start,end)=>{
    const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
    let a=sh*60+sm,b=eh*60+em;if(b<a)b+=1440;return b-a;
  };
  const fmt=m=>Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');
  const at=(date,time)=>new Date(date+'T'+time+':00');
  const shiftInterval=s=>{
    const a=at(s.date,s.start),b=at(s.date,s.end);
    if(b<=a)b.setDate(b.getDate()+1);
    return [a,b];
  };
  const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c))/60000;
  const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());

  function categoryMinutes(rows){
    let night=0,sunday=0,nightSunday=0,training=0,chef=0;
    for(const s of rows){
      const [a,b]=shiftInterval(s);
      if(/formation/i.test(s.post||''))training+=minutes(s.start,s.end);
      if(/chef d[’' ]?équipe/i.test(s.post||''))chef+=minutes(s.start,s.end);

      const first=dayStart(new Date(a.getTime()-86400000));
      const last=dayStart(new Date(b.getTime()+86400000));
      for(let d=new Date(first);d<=last;d.setDate(d.getDate()+1)){
        const n1=new Date(d);n1.setHours(22,0,0,0);
        const n2=new Date(n1);n2.setHours(n2.getHours()+8);
        night+=overlap(a,b,n1,n2);

        if(d.getDay()===0){
          const s1=new Date(d);s1.setHours(6,0,0,0);
          const s2=new Date(s1);s2.setDate(s2.getDate()+1);
          sunday+=overlap(a,b,s1,s2);

          const i1=new Date(Math.max(a,s1)),i2=new Date(Math.min(b,s2));
          if(i2>i1){
            for(let nd=new Date(d.getTime()-86400000);nd<=d;nd.setDate(nd.getDate()+1)){
              const nn1=new Date(nd);nn1.setHours(22,0,0,0);
              const nn2=new Date(nn1);nn2.setHours(nn2.getHours()+8);
              nightSunday+=overlap(i1,i2,nn1,nn2);
            }
          }
        }
      }
    }
    return {night,sunday,nightSunday,training,chef};
  }

  window.addEventListener('DOMContentLoaded',()=>{
    const status=document.querySelector('#status');
    if(imported&&status)status.textContent='Planning G4S intégré localement sur ce téléphone.';
    if(importError&&status)status.textContent='Import du planning impossible : '+importError;

    let rows=[];try{const data=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');if(Array.isArray(data))rows=data}catch{}
    let meta={};try{meta=JSON.parse(localStorage.getItem('myteam_planning_meta')||'{}')||{}}catch{}
    if(rows.length){
      const total=rows.reduce((sum,x)=>sum+minutes(x.start,x.end),0);
      const cats=categoryMinutes(rows);
      const hours=document.querySelector('#hours');
      if(hours){
        const title=meta.label||'Planning chargé';
        const source=meta.source||'Données enregistrées localement';
        hours.innerHTML=`<h2>Mes heures</h2>
          <div class="card">
            <strong>${title} : ${fmt(total)}</strong>
            <p class="muted">${source}</p>
            <p><b>🌙 Heures de nuit (22h → 6h)</b><br>${fmt(cats.night)}</p>
            <p><b>☀️ Heures du dimanche (dim. 6h → lun. 6h)</b><br>${fmt(cats.sunday)}</p>
            <p><b>🌙☀️ Dont nuit + dimanche</b><br>${fmt(cats.nightSunday)}</p>
            <p><b>👔 Chef d’équipe</b><br>${fmt(cats.chef)}</p>
            <p><b>🎓 Formation</b><br>${fmt(cats.training)}</p>
            <p class="muted">Les catégories peuvent se chevaucher : par exemple une heure peut être à la fois « nuit » et « dimanche ».</p>
          </div>`;
      }
      const planning=document.querySelector('#planning .card .muted');
      if(planning&&!document.querySelector('#planning-local-note')){
        const p=document.createElement('p');p.id='planning-local-note';p.className='muted';p.textContent=(meta.label||'Planning')+' • '+fmt(total)+' • stockage local';planning.after(p);
      }
    }
  });
})();
