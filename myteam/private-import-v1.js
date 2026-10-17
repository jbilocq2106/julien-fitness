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

  window.addEventListener('DOMContentLoaded',()=>{
    const status=document.querySelector('#status');
    if(imported&&status)status.textContent='Planning G4S intégré localement sur ce téléphone.';
    if(importError&&status)status.textContent='Import du planning impossible : '+importError;

    let rows=[];try{const data=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');if(Array.isArray(data))rows=data}catch{}
    let meta={};try{meta=JSON.parse(localStorage.getItem('myteam_planning_meta')||'{}')||{}}catch{}
    if(rows.length){
      const total=rows.reduce((sum,x)=>sum+minutes(x.start,x.end),0);
      const hours=document.querySelector('#hours');
      if(hours){
        const title=meta.label||'Planning chargé';
        const source=meta.source||'Données enregistrées localement';
        hours.innerHTML='<h2>Mes heures</h2><div class="card"><strong>'+title+' : '+fmt(total)+'</strong><p class="muted">'+source+'</p><p>'+rows.length+' lignes de prestation enregistrées sur ce téléphone.</p></div>';
      }
      const planning=document.querySelector('#planning .card .muted');
      if(planning&&!document.querySelector('#planning-local-note')){
        const p=document.createElement('p');p.id='planning-local-note';p.className='muted';p.textContent=(meta.label||'Planning')+' • '+fmt(total)+' • stockage local';planning.after(p);
      }
    }
  });
})();
