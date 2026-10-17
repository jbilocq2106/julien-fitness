(()=>{
  const section=document.querySelector('#prestation');
  if(!section)return;

  const pdfInput=document.querySelector('#prestation-pdf');
  const photoInput=document.querySelector('#prestation-photo');
  const pdfStatus=document.querySelector('#prestation-pdf-status');
  const photoStatus=document.querySelector('#prestation-photo-status');
  const prestationStatus=document.querySelector('#prestation-status');
  const note=document.querySelector('#prestation-note');
  let selectedFile=null;

  const box=document.createElement('div');
  box.className='card';
  box.style.margin='14px 0';
  box.style.background='#24344b';

  const title=document.createElement('strong');
  title.textContent='Test de lecture de la fiche';

  const info=document.createElement('p');
  info.className='muted';
  info.textContent='Choisis un PDF ou prends une photo. Le fichier reste sur ton téléphone jusqu’à ce que tu utilises le bouton d’envoi.';

  const chosen=document.createElement('p');
  chosen.id='prestation-selected-file';
  chosen.textContent='Aucune fiche sélectionnée.';

  const send=document.createElement('button');
  send.type='button';
  send.id='prestation-share-chatgpt';
  send.textContent='↗ Envoyer à ChatGPT';
  send.disabled=true;
  send.style.background='#2766bf';

  const help=document.createElement('p');
  help.className='muted';
  help.textContent='Dans le menu de partage Android, choisis ChatGPT. Je commencerai par te restituer ce que je lis dans la fiche avant toute modification de My Team.';

  box.append(title,info,chosen,send,help);
  if(note)note.before(box);else section.append(box);

  function choose(file,kind){
    if(!file)return;
    const isPdf=file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf');
    const isImage=file.type.startsWith('image/');
    if(!isPdf&&!isImage){
      selectedFile=null;
      send.disabled=true;
      chosen.textContent='Format non pris en charge.';
      return;
    }
    selectedFile=file;
    send.disabled=false;
    const size=file.size<1024*1024?Math.max(1,Math.round(file.size/1024))+' Ko':(file.size/1024/1024).toFixed(1)+' Mo';
    chosen.textContent='Fiche prête : '+file.name+' • '+size;
    const target=kind==='pdf'?pdfStatus:photoStatus;
    if(target)target.textContent=(isPdf?'PDF':'Photo')+' sélectionné(e) : '+file.name+'. Prêt(e) à être envoyé(e) à ChatGPT pour test.';
    if(prestationStatus)prestationStatus.textContent='Aucune donnée n’a encore été enregistrée ni modifiée.';
  }

  if(pdfInput)pdfInput.addEventListener('change',()=>choose(pdfInput.files?.[0],'pdf'));
  if(photoInput)photoInput.addEventListener('change',()=>choose(photoInput.files?.[0],'photo'));

  send.addEventListener('click',async()=>{
    if(!selectedFile){
      if(prestationStatus)prestationStatus.textContent='Choisis d’abord une fiche PDF ou une photo.';
      return;
    }
    const text='Analyse cette fiche de prestation My Team. Commence par me restituer exactement les données que tu lis : date, horaires, postes, agents et contraintes ou qualifications visibles. Signale ce qui est incertain. Ne modifie rien dans My Team et attends ma validation.';
    const data={title:'Fiche de prestation My Team',text,files:[selectedFile]};
    try{
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[selectedFile]}))){
        await navigator.share(data);
        if(prestationStatus)prestationStatus.textContent='Partage lancé. Choisis ChatGPT pour tester la lecture de la fiche.';
        return;
      }
      if(navigator.clipboard)await navigator.clipboard.writeText(text);
      if(prestationStatus)prestationStatus.textContent='Le partage direct de fichier n’est pas disponible ici. La consigne a été copiée : joins la fiche dans ChatGPT.';
    }catch(err){
      if(err?.name==='AbortError'){
        if(prestationStatus)prestationStatus.textContent='Envoi annulé. La fiche est toujours prête.';
      }else{
        if(prestationStatus)prestationStatus.textContent='Impossible d’ouvrir le partage. Réessaie depuis Chrome ou joins la fiche directement dans ChatGPT.';
      }
    }
  });
})();
