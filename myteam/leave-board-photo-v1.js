(()=>{
  'use strict';
  const section=document.getElementById('leave');
  if(!section||document.getElementById('mt-leave-photo'))return;

  const panel=document.createElement('div');
  panel.id='mt-leave-photo';panel.className='mt-leave-photo-card';
  panel.innerHTML=`
    <div class="mt-leave-photo-head"><h3>🖼️ Tableau des congés</h3>
      <button type="button" id="mt-leave-photo-attach">📎 Ajouter des photos</button></div>
    <input type="file" id="mt-leave-photo-input" multiple accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" hidden>
    <p id="mt-leave-photo-status" class="mt-leave-photo-status" role="status"></p>
    <div id="mt-leave-photo-view" class="mt-leave-photo-view"></div>
    <p class="mt-leave-photo-note">Tu peux ajouter les deux photos maintenant ou l’une après l’autre, sans remplacer la première. Conservées en privé sur cet appareil ; les congés ne sont pas modifiés automatiquement.</p>`;
  section.querySelector('h2')?.after(panel);
  section.classList.add('mt-leave-photo-only');

  const DB='myteam_leave_board_photos_v1',TABLE='documents',KEY='current',MAX_PAGES=12;
  const attach=panel.querySelector('#mt-leave-photo-attach');
  const input=panel.querySelector('#mt-leave-photo-input');
  const status=panel.querySelector('#mt-leave-photo-status');
  const view=panel.querySelector('#mt-leave-photo-view');
  let current=null,urls=[];

  function clearUrls(){urls.forEach(url=>URL.revokeObjectURL(url));urls=[];}
  const pageNames=record=>record?.pages?.map((_,i)=>record.pageNames?.[i]||(
    record.pages.length===1?record.name||'Photo du planning':'Photo du planning '+(i+1)))||[];
  function show(record){
    current=record;clearUrls();view.replaceChildren();
    if(!record?.pages?.length){
      const empty=document.createElement('p');empty.className='mt-leave-photo-empty';
      empty.textContent='Aucune photo enregistrée. Appuie sur « Ajouter des photos » pour joindre ton planning.';
      view.append(empty);attach.textContent='📎 Ajouter des photos';return;
    }
    attach.textContent='📎 Ajouter une autre photo';
    const file=document.createElement('p');file.className='mt-leave-photo-filename';
    const stored=record.savedAt?new Date(record.savedAt).toLocaleDateString('fr-LU'):'date inconnue';
    file.textContent=`${record.pages.length} photo(s) / page(s) enregistrée(s) · dernière mise à jour le ${stored}`;
    view.append(file);
    const names=pageNames(record);
    record.pages.forEach((blob,index)=>{
      if(!(blob instanceof Blob))return;
      const item=document.createElement('div');item.className='mt-leave-photo-item';
      const heading=document.createElement('div');heading.className='mt-leave-photo-item-head';
      const caption=document.createElement('strong');caption.textContent=`Photo ${index+1} · ${names[index]}`;
      const remove=document.createElement('button');remove.type='button';
      remove.dataset.removePhoto=String(index);remove.textContent='Supprimer cette photo';
      remove.setAttribute('aria-label',`Supprimer la photo ${index+1}`);
      heading.append(caption,remove);item.append(heading);
      const scroller=document.createElement('div');scroller.className='mt-leave-photo-scroller';
      const photo=document.createElement('img');photo.className='mt-leave-photo-image';
      photo.alt=`Tableau des congés — photo ${index+1} : ${names[index]}`;
      photo.tabIndex=0;photo.setAttribute('role','button');photo.setAttribute('aria-label','Toucher pour agrandir ou réduire cette photo');
      const url=URL.createObjectURL(blob);urls.push(url);photo.src=url;
      scroller.append(photo);item.append(scroller);view.append(item);
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
    const files=Array.from(event.target.files||[]);input.value='';if(!files.length)return;
    attach.disabled=true;status.textContent='Ajout des photos au tableau existant…';
    try{
      // Relire le dernier enregistrement pour ne pas écraser une photo déjà jointe.
      const existing=await readStored();
      const pages=[...(existing?.pages||[])],names=pageNames(existing);
      for(const file of files){
        const isImage=/\.(jpe?g|png)$/i.test(file.name)||['image/jpeg','image/png'].includes(file.type);
        const isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
        if(!isImage&&!isPdf)throw new Error('Choisis uniquement des images JPEG, PNG ou des PDF.');
        const limit=isPdf?20000000:15000000;
        if(!file.size||file.size>limit)throw new Error(file.name+' : fichier vide ou trop volumineux ('+(isPdf?'20':'15')+' Mo maximum).');
        if(pages.length>=MAX_PAGES)throw new Error('Maximum de '+MAX_PAGES+' photos ou pages. Supprime d’abord une ancienne photo.');
        const extracted=isPdf?await pagesFromPdf(file):[file];
        if(pages.length+extracted.length>MAX_PAGES)throw new Error('Les documents sélectionnés dépassent la limite de '+MAX_PAGES+' pages.');
        extracted.forEach((blob,index)=>{pages.push(blob);names.push(isPdf?file.name+' — page '+(index+1):file.name);});
      }
      const record={name:existing?.name||files[0].name,savedAt:new Date().toISOString(),pages,pageNames:names};
      await saveStored(record);
      show(record);
      status.textContent=`${files.length} fichier(s) ajouté(s). ${pages.length} photo(s) ou page(s) conservée(s) au total, sans remplacement des précédentes.`;
    }catch(error){status.textContent='Ajout impossible : '+error.message+'. Les photos déjà enregistrées ont été conservées.';}
    finally{attach.disabled=false;}
  };
  view.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-remove-photo]');if(!button)return;
    const index=Number(button.dataset.removePhoto),record=current;
    if(!record?.pages?.[index])return;
    if(!confirm('Supprimer uniquement cette photo du tableau des congés ?'))return;
    button.disabled=true;
    try{
      const pages=record.pages.filter((_,i)=>i!==index);
      const names=pageNames(record).filter((_,i)=>i!==index);
      const updated={name:record.name,savedAt:new Date().toISOString(),pages,pageNames:names};
      await saveStored(updated);show(updated);
      status.textContent='Photo supprimée. Les autres photos et les demandes de congés sont conservées.';
    }catch(error){button.disabled=false;status.textContent='Suppression impossible : les photos existantes sont conservées.';}
  });
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
