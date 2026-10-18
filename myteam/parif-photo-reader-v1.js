(()=>{
  'use strict';
  if(window.MyTeamParifPhotoReader)return;

  // Modèle du document paysage PARIF fourni comme exemple. Coordonnées relatives
  // à 1536 × 1045. Les autres mises en page restent en lecture libre, sans affectation.
  const WIDTH=1536,HEIGHT=1045,PITCH=66,ATLAS_WIDTH=720;
  const ORIGINS=[40,530,1020];
  const SESSIONS=['morning','afternoon','night'];
  const ROWS=[
    ['E14','right',[260,279]],
    ['E40','left',[335,354]],['E30','right',[335,354]],
    ['E50','left',[414,432]],['MIDDLE','right',[414,432]],
    ['E51','left',[491,510,529]],['E84','right',[491,510,529]],
    ['E52','left',[590,609]],['E85','right',[590,609]],
    ['E111','left',[667,686,705]],['E112','right',[667,686,705]],
    ['E121','left',[764,783]],['E121_RIGHT','right',[764,783]]
  ];
  const MIDDLE=['E43','E80','E80'];
  const AVAILABLE=[
    ['E14','E40','E32','E50','E43','E51','E84','E52','E85','E111','E112','E121'],
    ['E14','E40','E32','E50','E80','E51','E84','E52','E85','E111','E112','E121'],
    ['E14','E40','E30','E50','E80','E51','E84','E52','E85','E111','E112','E121']
  ];
  const MAX_SLOTS={E14:2,E40:2,E30:2,E32:2,E43:2,E50:2,E80:2,E51:3,E84:3,E52:2,E85:2,E111:3,E112:3,E121:3};

  function segments(shift){
    const origin=ORIGINS[shift],result=[];
    if(shift===0){
      result.push({path:'_title',x:886,y:90,width:110,height:25});
      result.push({path:'_date',x:795,y:122,width:93,height:20});
    }
    result.push({path:'supervisor',x:origin+121,y:185,width:113,height:28});
    result.push({path:'patrol.0',x:origin+357,y:184,width:117,height:16});
    result.push({path:'patrol.1',x:origin+357,y:202,width:117,height:16});
    for(const [key,side,ys] of ROWS){
      const post=key==='MIDDLE'?MIDDLE[shift]:key==='E121_RIGHT'?'E121':key;
      ys.forEach((y,i)=>result.push({
        path:`posts.${post}.${key==='E121_RIGHT'?i+2:i}`,
        x:origin+(side==='left'?4:243),y:y+1,width:224,height:17
      }));
    }
    return result;
  }
  function parseTsv(tsv,refs){
    const rows=Array.from({length:refs.length},()=>[]);
    if(typeof tsv!=='string')return rows.map(()=>({raw:'',confidence:0}));
    for(const line of tsv.split(/\r?\n/).slice(1)){
      const fields=line.split('\t');
      if(fields[0]!=='5'||!fields[11]?.trim())continue;
      const top=Number(fields[7]),height=Number(fields[9]),left=Number(fields[6]);
      const n=Math.floor((top+height/2)/PITCH);
      if(n<0||n>=rows.length)continue;
      rows[n].push({value:fields.slice(11).join('\t').trim(),confidence:Number(fields[10])||0,left});
    }
    return rows.map(words=>{
      words.sort((a,b)=>a.left-b.left);
      const chars=words.reduce((sum,x)=>sum+x.value.length,0);
      return {raw:words.map(x=>x.value).join(' ').trim(),confidence:chars?Math.round(words.reduce((sum,x)=>sum+x.confidence*x.value.length,0)/chars):0};
    });
  }
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function normalizeCandidate(raw,path){
    let s=norm(raw).replace(/[\u2014\u2013|~_"“”«»=+*\[\]{};:]/g,' ').replace(/\s+/g,' ').trim();
    s=s.replace(/G\s*[4&]\s*[S8$]|G\s*48|G\s*&S/gi,' G4S ')
      .replace(/\b[OD]USS\b/gi,' DUSS ').replace(/\s+/g,' ').trim();
    // Ne pas considérer les lignes, pictogrammes, nombres ou suffixes seuls comme des noms.
    s=s.replace(/^[^A-ZÀ-Ÿ']+|[^A-ZÀ-Ÿ0-9' -]+$/g,'').replace(/\s+/g,' ').trim();
    if(!s||!/[A-Z]{3}/.test(s)||/^(POSTE|DUSS|G4S|PARIF|LXP|HORAIRES|SUPERVISEUR)$/.test(s))return'';
    if(path.startsWith('posts.E40.')&&!/\bDUSS$/.test(s))s+=' DUSS';
    if(/^posts\.(E14|E32|E84|E85|E112)\./.test(path)&&!/\bG4S$/.test(s))s+=' G4S';
    if(s.length>90)return'';
    return s;
  }
  function interpret(atlases){
    const items=[],warnings=[],meta={dateText:'',title:''},seen=new Set();
    for(let shift=0;shift<3;shift++){
      const refs=segments(shift),rows=parseTsv(atlases[shift]||'',refs);
      for(let i=0;i<refs.length;i++){
        const ref=refs[i],record=rows[i];
        if(ref.path==='_title'){meta.title=record.raw;continue;}
        if(ref.path==='_date'){meta.dateText=record.raw;continue;}
        const value=normalizeCandidate(record.raw,ref.path);
        if(!value)continue;
        const parts=ref.path.split('.'),post=parts[0]==='posts'?parts[1]:null;
        const slot=parts[0]==='posts'?Number(parts[2]):parts[0]==='patrol'?Number(parts[1]):0;
        const label=`${['Matin','Après-midi','Nuit'][shift]} · ${post|| (parts[0]==='patrol'?'Patrouille':'Superviseur')} · ${slot+1}`;
        const allowed=!post||(AVAILABLE[shift].includes(post)&&slot<(MAX_SLOTS[post]||0));
        const key=`${shift}:${ref.path}`;
        if(seen.has(key))continue;seen.add(key);
        const suspicious=/[^A-ZÀ-Ÿ0-9' -]/.test(value)||/\b[0-9]{2,}\b/.test(value)||/\b[AOUI]{1}\b/.test(value);
        const confident=record.confidence>=88&&!suspicious;
        const item={shift:SESSIONS[shift],path:ref.path,label,value,confidence:record.confidence,allowed,checked:allowed&&confident};
        items.push(item);
        if(!allowed)warnings.push(`${label} : poste/case absent(e) du référentiel actuel — ne pas déplacer « ${value} » automatiquement.`);
      }
    }
    const heading=norm(meta.title);
    const supported=heading.includes('PARIF')&&items.length>=8;
    return {supported,items:supported?items:[],dateText:meta.dateText,issues:supported?warnings:['Modèle PARIF non reconnu avec assez de certitude. Prévisualisation manuelle conservée.']};
  }
  async function prepareCanvas(source){
    let img=source,close=false;
    if(!(source instanceof HTMLCanvasElement)){
      img=await createImageBitmap(source);close=true;
    }
    try{
      const width=img.width,height=img.height;
      if(!width||!height||Math.abs(width/height-WIDTH/HEIGHT)>.15)return null;
      const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.fillStyle='#fff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.drawImage(img,0,0,WIDTH,HEIGHT);
      return canvas;
    }finally{if(close)img.close();}
  }
  function makeAtlas(sheet,shift){
    const refs=segments(shift),canvas=document.createElement('canvas');
    canvas.width=ATLAS_WIDTH;canvas.height=refs.length*PITCH;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let i=0;i<refs.length;i++){
      const r=refs[i];
      ctx.drawImage(sheet,r.x,r.y,r.width,r.height,8,i*PITCH+7,r.width*3,r.height*3);
    }
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
    for(let i=0;i<d.length;i+=4){
      const luminance=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);
      const v=luminance<115?0:255;d[i]=v;d[i+1]=v;d[i+2]=v;d[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    return canvas;
  }
  async function scan(source,tesseract,onProgress=()=>{}){
    const sheet=await prepareCanvas(source);
    if(!sheet)return {supported:false,items:[],issues:['Format de page différent du modèle PARIF paysage.']};
    const worker=await tesseract.createWorker('eng',1,{logger:m=>{
      if(m?.status==='recognizing text')onProgress(`Reconnaissance locale : ${Math.round((m.progress||0)*100)} %`);
    }});
    try{
      // Le plan présente des noms dispersés dans des cases espacées.
      // Le mode texte dispersé conserve les cases que le mode bloc ignore.
      await worker.setParameters({tessedit_pageseg_mode:tesseract.PSM.SPARSE_TEXT});
      const tsv=[];
      for(let shift=0;shift<3;shift++){
        onProgress(`Lecture des affectations : ${['matin','après-midi','nuit'][shift]}…`);
        const atlas=makeAtlas(sheet,shift);
        const {data}=await worker.recognize(atlas,{}, {text:true,tsv:true});
        tsv.push(data?.tsv||'');
      }
      return interpret(tsv);
    }finally{await worker.terminate();}
  }
  window.MyTeamParifPhotoReader={scan,interpret,parseTsv};
})();
