(()=>{
  'use strict';
  const section=document.getElementById('leave');
  if(!section||document.getElementById('mt-leave-photo'))return;

  const panel=document.createElement('div');
  panel.id='mt-leave-photo';panel.className='mt-leave-photo-card';
  panel.innerHTML=`
    <div class="mt-leave-photo-head"><h3>🖼️ Tableau des congés</h3>
      <button type="button" id="mt-leave-photo-attach">📎 Joindre le tableau</button></div>
    <input type="file" id="mt-leave-photo-input" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" hidden>
    <p id="mt-leave-photo-status" class="mt-leave-photo-status" role="status"></p>
    <div id="mt-leave-photo-view" class="mt-leave-photo-view"></div>
    <p class="mt-leave-photo-note">Photo privée enregistrée sur cet appareil. Elle n’ajoute pas de congé et ne valide aucune absence automatiquement.</p>`;
  section.querySelector('h2')?.after(panel);
  section.classList.add('mt-leave-photo-only');

  const DB='myteam_leave_board_photos_v1',TABLE='documents',KEY='current';
  const attach=panel.querySelector('#mt-leave-photo-attach');
  const input=panel.querySelector('#mt-leave-photo-input');
  const status=panel.querySelector('#mt-leave-photo-status');
  const view=panel.querySelector('#mt-leave-photo-view');
  let current=null,urls=[];

  function clearUrls(){urls.forEach(url=>URL.revokeObjectURL(url));urls=[];}
  function show(record){
    current=record;clearUrls();view.replaceChildren();
    if(!record?.pages?.length){
      const empty=document.createElement('p');empty.className='mt-leave-photo-empty';
      empty.textContent='Aucun tableau photographié pour le moment. Appuie sur « Joindre le tableau » pour l’ajouter.';
      view.append(empty);attach.textContent='📎 Joindre le tableau';return;
    }
    attach.textContent='📎 Remplacer la photo';
    const file=document.createElement('p');file.className='mt-leave-photo-filename';
    const stored=record.savedAt?new Date(record.savedAt).toLocaleDateString('fr-LU'):'date inconnue';
    file.textContent=`${record.name||'Tableau des congés'} · ajouté le ${stored}`;view.append(file);
    record.pages.forEach((blob,index)=>{
      const scroller=document.createElement('div');scroller.className='mt-leave-photo-scroller';
      const photo=document.createElement('img');photo.className='mt-leave-photo-image';
      photo.alt=`Tableau des congés${record.pages.length>1?` — page ${index+1}`:''}`;
      photo.tabIndex=0;photo.setAttribute('role','button');photo.setAttribute('aria-label','Toucher pour agrandir ou réduire le tableau');
      const url=URL.createObjectURL(blob);urls.push(url);photo.src=url;
      scroller.append(photo);view.append(scroller);
    });
  }

  function dbOpen(){
    return new Promise((resolve,reject)=>{
      if(!window.indexedDB)return reject(new Error('Stockage local indisponible'));
      const request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>request.result.createObjectStore(TABLE);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Ouverture du stockage impossible'));
    });
  }
  async function readStored(){
    const db=await dbOpen();
    try{return await new Promise((resolve,reject)=>{
      const request=db.transaction(TABLE,'readonly').objectStore(TABLE).get(KEY);
      request.onsuccess=()=>resolve(request.result||null);
      request.onerror=()=>reject(request.error);
    });}finally{db.close();}
  }
  async function saveStored(record){
    const db=await dbOpen();
    try{await new Promise((resolve,reject)=>{
      const tx=db.transaction(TABLE,'readwrite');tx.objectStore(TABLE).put(record,KEY);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });}finally{db.close();}
  }
  function canvasBlob(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('La page ne peut pas être convertie en image')),'image/jpeg',.9));
  }
  const pdfLib=async()=>{
    if(!window.pdfjsLib){
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload=resolve;script.onerror=()=>reject(new Error('Le lecteur PDF est indisponible. Essaie une photo JPEG ou PNG.'));
        document.head.append(script);
      });
    }
    if(!window.pdfjsLib)throw new Error('Lecteur PDF indisponible');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib;
  };
  async function pagesFromPdf(file){
    const lib=await pdfLib();
    const documentPdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    try{
      if(documentPdf.numPages>12)throw new Error('PDF de plus de 12 pages : sélectionne un extrait du tableau pour un affichage lisible.');
      const pages=[];
      for(let pageIndex=1;pageIndex<=documentPdf.numPages;pageIndex++){
        status.textContent=`Préparation du tableau : page ${pageIndex}/${documentPdf.numPages}…`;
        const page=await documentPdf.getPage(pageIndex),natural=page.getViewport({scale:1});
        const scale=Math.min(2.2,1800/natural.width),viewport=page.getViewport({scale});
        const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        pages.push(await canvasBlob(canvas));
      }
      return pages;
    }finally{await documentPdf.destroy();}
  }

  attach.onclick=()=>input.click();
  input.onchange=async event=>{
    const file=event.target.files?.[0];input.value='';if(!file)return;
    const isImage=/\.(jpe?g|png)$/i.test(file.name)||['image/jpeg','image/png'].includes(file.type);
    const isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
    if(!isImage&&!isPdf){status.textContent='Choisis une image JPEG, PNG ou un PDF.';return;}
    const limit=isPdf?20000000:15000000;
    if(!file.size||file.size>limit){status.textContent=`Fichier vide ou trop volumineux (${isPdf?'20':'15'} Mo maximum).`;return;}
    if(current?.pages?.length&&!confirm('Remplacer la photo actuelle du tableau des congés ? Les demandes de congés déjà enregistrées ne seront pas modifiées.'))return;
    attach.disabled=true;status.textContent='Préparation du tableau…';
    try{
      const pages=isPdf?await pagesFromPdf(file):[file];
      const record={name:file.name,savedAt:new Date().toISOString(),pages};
      let stored=true;
      try{await saveStored(record);}catch(error){stored=false;console.warn('Sauvegarde locale du tableau impossible',error);}
      show(record);
      status.textContent=stored?'Tableau affiché et enregistré sur cet appareil. Aucun congé modifié.':
        'Tableau affiché, mais sauvegarde locale indisponible : il faudra le joindre à nouveau après actualisation.';
    }catch(error){status.textContent=`Impossible d’afficher ce document : ${error.message}`;}
    finally{attach.disabled=false;}
  };
  const zoom=event=>{
    const image=event.target.closest?.('.mt-leave-photo-image');if(!image)return;
    image.classList.toggle('is-zoomed');
  };
  view.addEventListener('click',zoom);
  view.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target.matches('.mt-leave-photo-image')){event.preventDefault();zoom(event);}
  });
  window.addEventListener('pagehide',clearUrls);
  show(null);
  readStored().then(show).catch(()=>{status.textContent='Les images seront affichées ici. Le stockage privé est indisponible sur cet appareil.';});
})();
