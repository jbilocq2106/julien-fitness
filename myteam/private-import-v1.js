(()=>{
  let imported=false,importError='';
  const decodeBase64Url=value=>{
    const base64=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');
    const binary=atob(base64);
    return new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
  };
  const validShift=x=>x&&typeof x==='object'&&/^\d{4}-\d\d-\d\d$/.test(x.date)&&/^\d\d:\d\d$/.test(x.start)&&/^\d\d:\d\d$/.test(x.end)&&typeof (x.post||'')==='string'&&['morning','afternoon','night','training'].includes(x.type);
  const archiveRows=(rows,meta)=>{
    if(!Array.isArray(rows)||!rows.length)return;
    const byMonth={};for(const s of rows){const m=String(s?.date||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))(byMonth[m]||(byMonth[m]=[])).push(s)}
    let history={};try{history=JSON.parse(localStorage.getItem('myteam_planning_history')||'{}')||{}}catch{}
    for(const [month,monthRows] of Object.entries(byMonth))history[month]={rows:monthRows,meta:meta||{},savedAt:new Date().toISOString()};
    localStorage.setItem('myteam_planning_history',JSON.stringify(history));
  };
  // Import par mois depuis un lien personnel. Le contenu est uniquement dans
  // le fragment local (#) et est efface avant tout traitement.
  const monthlyMatch=location.hash.match(/^#planning2=([A-Za-z0-9_-]+)$/);
  if(monthlyMatch){
    history.replaceState(history.state,'',location.pathname+location.search);
    try{
      const pack=JSON.parse(decodeBase64Url(monthlyMatch[1]));
      if(pack?.schema!=='myteam-month-v3'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(pack.month)
          ||!Array.isArray(pack.r)||pack.r.length<1||pack.r.length>100
          ||!Array.isArray(pack.l)||pack.l.length>31||typeof pack.post!=='string'
          ||!pack.post.trim()||pack.post.length>130)throw Error('Format mensuel invalide');
      const month=pack.month, lastDay=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
      const rows=pack.r.map(item=>{
        if(!Array.isArray(item)||item.length<3||item.length>4)throw Error('Ligne invalide');
        const day=Number(item[0]),start=item[1],end=item[2];
        const post=item[3]??pack.post;
        if(!Number.isInteger(day)||day<1||day>lastDay||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)
          ||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
          ||typeof post!=='string'||!post.trim()||post.length>160)throw Error('Horaire invalide');
        const [aH,aM]=start.split(':').map(Number),[bH,bM]=end.split(':').map(Number);
        let minutes=(bH*60+bM)-(aH*60+aM);
        if(minutes<0)minutes+=1440;
        if(minutes<=0||minutes>960)throw Error('Duree de vacation invalide');
        const type=/formation/i.test(post)?'training':
          (bH*60+bM<aH*60+aM||aH>=20||aH<4)?'night':aH<12?'morning':'afternoon';
        return {date:month+'-'+String(day).padStart(2,'0'),start,end,post,type,plannedMinutes:minutes};
      });
      const unique=new Set(rows.map(x=>[x.date,x.start,x.end,x.post].join('|')));
      if(unique.size!==rows.length)throw Error('Doublons dans les vacations');
      const leaveDays=[...new Set(pack.l.map(value=>{
        const day=Number(value);
        if(!Number.isInteger(day)||day<1||day>lastDay)throw Error('Jour de conge invalide');
        return month+'-'+String(day).padStart(2,'0');
      }))];
      if(rows.some(x=>leaveDays.includes(x.date)))throw Error('Conge et vacation sur la meme journee');
      const minutes=rows.reduce((sum,x)=>sum+x.plannedMinutes,0)+leaveDays.length*480;
      if(!Number.isInteger(pack.total)||pack.total!==minutes)throw Error('Le total horaire ne correspond pas');
      let old=[];try{const parsed=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');if(Array.isArray(parsed))old=parsed}catch{}
      let oldMeta={};try{oldMeta=JSON.parse(localStorage.getItem('myteam_planning_meta')||'{}')||{}}catch{}
      const existing=old.filter(x=>String(x?.date||'').slice(0,7)===month);
      const display=month.slice(5,7)+'/'+month.slice(0,4);
      if(confirm('Importer mon planning G4S '+display+' ?\n\n'+rows.length+' postes • '+leaveDays.length+' jours de conge • '+(minutes/60)+' h (conges inclus).\n\nCe mois sera remplace dans MyTEAM uniquement. Les autres mois et calendriers resteront inchanges.')){
        if(existing.length)archiveRows(existing,oldMeta);
        const keep=old.filter(x=>String(x?.date||'').slice(0,7)!==month);
        const merged=[...keep,...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.start.localeCompare(b.start));
        let prevLeaves=[];try{const p=JSON.parse(localStorage.getItem('myteam_paid_leave_days_v1')||'[]');if(Array.isArray(p))prevLeaves=p}catch{}
        const mergedLeaves=[...new Set([...prevLeaves.filter(d=>String(d).slice(0,7)!==month),...leaveDays])].sort();
        const months=[...new Set([...(oldMeta?.source==='pdf-local'&&Array.isArray(oldMeta.months)?oldMeta.months:[]),month])].sort();
        const meta={
          ...oldMeta,source:'pdf-local',fileName:'Planning G4S '+display,
          creationDate:'21/10/2026',total:(minutes/60)+' h 00',months,
          importedAt:new Date().toISOString()
        };
        // Donnees locales seulement ; synchronisation privee geree separement.
        localStorage.setItem('myteam_shifts',JSON.stringify(merged));
        localStorage.setItem('myteam_paid_leave_days_v1',JSON.stringify(mergedLeaves));
        localStorage.setItem('myteam_planning_meta',JSON.stringify(meta));
        localStorage.setItem('myteam_planning_seed_version','pdf-import-v2-safe');
        imported=true;
      }
    }catch(err){importError=err?.message||'Import mensuel impossible';}
  }

  const match=location.hash.match(/^#planning=([A-Za-z0-9_-]+)$/);
  if(match){
    try{
      const payload=JSON.parse(decodeBase64Url(match[1]));
      const rows=Array.isArray(payload)?payload:payload.shifts;
      if(!Array.isArray(rows)||!rows.length||rows.length>100||!rows.every(validShift))throw Error('Format de planning invalide');
      let old=[];try{const x=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');if(Array.isArray(x))old=x}catch{}
      let oldMeta={};try{oldMeta=JSON.parse(localStorage.getItem('myteam_planning_meta')||'{}')||{}}catch{}
      archiveRows(old,oldMeta);
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
