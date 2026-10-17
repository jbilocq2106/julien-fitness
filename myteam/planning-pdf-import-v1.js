(()=>{
  const input=document.querySelector('#planning-pdf');
  const status=document.querySelector('#planning-pdf-status');
  if(!input||!status)return;

  async function ensurePdfJs(){
    if(window.pdfjsLib)return window.pdfjsLib;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Bibliothèque PDF indisponible'));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib;
  }

  function hhmm(v){
    const m=v.match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;
    return String(Number(m[1])).padStart(2,'0')+':'+m[2];
  }
  function minutes(a,b){
    const [ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number);
    let x=ah*60+am,y=bh*60+bm;if(y<x)y+=1440;return y-x;
  }
  function typeFor(start,end,post){
    if(/formation/i.test(post))return 'training';
    const h=Number(start.slice(0,2));
    if(minutes(start,end)>0&&Number(end.slice(0,2))*60+Number(end.slice(3))<h*60+Number(start.slice(3)))return 'night';
    if(h>=20||h<4)return 'night';
    if(h<12)return 'morning';
    return 'afternoon';
  }
  function fmtTotal(min){return Math.floor(min/60)+' h '+String(min%60).padStart(2,'0');}
  function archiveRows(rows,meta){
    if(!Array.isArray(rows)||!rows.length)return;
    const byMonth={};
    for(const s of rows){const m=String(s?.date||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(m))(byMonth[m]||(byMonth[m]=[])).push(s)}
    let history={};try{history=JSON.parse(localStorage.getItem('myteam_planning_history')||'{}')||{}}catch{}
    for(const [month,monthRows] of Object.entries(byMonth))history[month]={rows:monthRows,meta:meta||{},savedAt:new Date().toISOString()};
    localStorage.setItem('myteam_planning_history',JSON.stringify(history));
  }

  function rowFromItems(items){
    const sorted=[...items].sort((a,b)=>a.x-b.x);
    let out='',lastEnd=null;
    for(const it of sorted){
      const str=(it.str||'').trim();if(!str)continue;
      if(out){const gap=lastEnd==null?0:it.x-lastEnd;out+=gap>12?' | ':' ';}
      out+=str;
      lastEnd=it.x+(it.width||0);
    }
    return out.replace(/\s+/g,' ').trim();
  }

  async function extractRows(file){
    const lib=await ensurePdfJs();
    const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const rows=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p),tc=await page.getTextContent();
      const groups=[];
      for(const it of tc.items){
        if(!it.str||!it.str.trim())continue;
        const y=it.transform?.[5]??0,x=it.transform?.[4]??0;
        let g=groups.find(v=>Math.abs(v.y-y)<1.7);
        if(!g){g={y,items:[]};groups.push(g)}
        g.items.push({str:it.str,x,width:it.width||0});
      }
      groups.sort((a,b)=>b.y-a.y);
      for(const g of groups){const text=rowFromItems(g.items);if(text)rows.push(text)}
    }
    return rows;
  }

  function parse(rows){
    let currentDate=null,creationDate='',declaredTotal='';
    const shifts=[];
    const all=rows.join('\n');
    let m=all.match(/Creation\s*:\s*(\d{2})-(\d{2})-(\d{4})/i);
    if(m)creationDate=`${m[1]}/${m[2]}/${m[3]}`;
    m=all.match(/Dur[eé]e\s+totale\s*:\s*(\d{1,3}):(\d{2})/i);
    if(m)declaredTotal=`${Number(m[1])} h ${m[2]}`;

    for(const raw of rows){
      const dateM=raw.match(/(?:Lu|Ma|Me|Je|Ve|Sa|Di)\.?\s*(\d{2})-(\d{2})-(\d{2})/i);
      if(dateM)currentDate=`20${dateM[3]}-${dateM[2]}-${dateM[1]}`;
      if(!currentDate)continue;
      const timeM=raw.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      if(!timeM)continue;
      const start=hhmm(timeM[1]),end=hhmm(timeM[2]);
      if(!start||!end)continue;
      if(/Planning du|Creation|Gsm|E-mail|Dur[eé]e totale/i.test(raw))continue;

      const parts=raw.split(/\s+\|\s+/).map(s=>s.trim()).filter(Boolean);
      const timeIndex=parts.findIndex(x=>/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.test(x));
      const clientIndex=parts.findIndex(x=>/^(LUXAIR-|G4S_)/i.test(x));
      let client=clientIndex>=0?parts[clientIndex]:'';
      let desc='';
      if(timeIndex>=0){
        const startDesc=clientIndex>=0?clientIndex+1:Math.max(0,timeIndex-1);
        desc=parts.slice(startDesc,timeIndex).filter(x=>!/^LOGIN/i.test(x)&&!/^\d{3,}$/.test(x)).join(' • ');
      }
      if(!desc){
        const before=raw.slice(0,raw.indexOf(timeM[0]));
        const known=before.match(/(Formation prévue|Chef d[’' ]?équipe|E85 X Ray (?:Nuit|Matin)|New Parif Nuit|Parif [^|]+|E32 Agent (?:Mascu|Fémin)|1 as Extra E30|E14 (?:Nuit|Matin) Permi?s?|E84 X Ray (?:Matin|Après)|Aérogare aprem|Extra Renfort)/i);
        desc=known?known[1].trim():'';
      }
      if(!client){const cm=raw.match(/(LUXAIR-[A-Z0-9/]+)/i);if(cm)client=cm[1]}
      const post=[client,desc].filter(Boolean).join(' • ')||'Prestation G4S';
      shifts.push({date:currentDate,start,end,post,type:typeFor(start,end,post)});
    }

    const unique=[];const seen=new Set();
    for(const s of shifts){const k=[s.date,s.start,s.end,s.post].join('|');if(!seen.has(k)){seen.add(k);unique.push(s)}}
    return {shifts:unique,creationDate,declaredTotal};
  }

  function changedDays(oldShifts,newShifts){
    const dates=new Set([...oldShifts,...newShifts].map(x=>x.date));
    const norm=(arr,d)=>arr.filter(x=>x.date===d).map(x=>[x.start,x.end,x.post].join('|')).sort().join(';;');
    return [...dates].filter(d=>norm(oldShifts,d)!==norm(newShifts,d)).sort();
  }

  input.addEventListener('change',async e=>{
    e.stopImmediatePropagation();
    const file=input.files?.[0];if(!file)return;
    if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){status.textContent='Choisis un fichier PDF.';return}
    status.textContent='Lecture du planning en cours…';
    try{
      const rows=await extractRows(file),parsed=parse(rows);
      if(parsed.shifts.length<8)throw new Error('Je n’ai pas reconnu assez de lignes de planning. Aucun changement effectué.');
      let old=[];try{const x=JSON.parse(localStorage.getItem('myteam_shifts')||'[]');if(Array.isArray(x))old=x}catch{}
      let oldMeta={};try{oldMeta=JSON.parse(localStorage.getItem('myteam_planning_meta')||'{}')||{}}catch{}
      const diff=changedDays(old,parsed.shifts);
      const computed=parsed.shifts.reduce((n,s)=>n+minutes(s.start,s.end),0);
      const source=parsed.creationDate?`créé le ${parsed.creationDate}`:file.name;
      const total=parsed.declaredTotal||fmtTotal(computed);
      const msg=`Planning détecté : ${source}\n${parsed.shifts.length} lignes • total ${total}\n${diff.length} jour(s) différent(s) de MyTEAM.\n\nRemplacer le planning actuel ?`;
      if(!confirm(msg)){status.textContent='Import annulé. Le planning actuel est conservé.';input.value='';return}
      archiveRows(old,oldMeta);
      localStorage.setItem('myteam_shifts',JSON.stringify(parsed.shifts));
      localStorage.setItem('myteam_planning_meta',JSON.stringify({fileName:file.name,creationDate:parsed.creationDate,total,importedAt:new Date().toISOString(),source:'pdf-local'}));
      localStorage.setItem('myteam_planning_seed_version','pdf-import');
      status.textContent=`Planning importé depuis ${file.name} • ${parsed.shifts.length} lignes • ${total}. Actualisation…`;
      setTimeout(()=>location.reload(),700);
    }catch(err){
      status.textContent='Import impossible : '+(err?.message||'erreur inconnue')+' Le planning actuel n’a pas été modifié.';
    }finally{input.value=''}
  },true);
})();
