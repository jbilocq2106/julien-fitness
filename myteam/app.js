(()=>{
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Chargement impossible : '+src));document.head.appendChild(s)});
  (async()=>{
    try{
      await load('../team4/app.js?v=20261017-4');
      await load('./hours-v1.js?v=20261017-4');
      await load('./agents-migration-v3.js?v=3');
      await load('./roster-v5.js?v=20261017-4');
      await load('./agents-page-v2.js?v=20261017-1');
      await load('./prestation-share-v1.js?v=1');
      await load('./planning-pdf-import-v1.js?v=1');
    }catch(err){
      const status=document.querySelector('#status');
      if(status)status.textContent='Erreur de chargement MyTEAM. Actualise la page.';
      console.error(err);
    }
  })();
})();
