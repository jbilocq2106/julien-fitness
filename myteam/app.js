(()=>{
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  (async()=>{
    try{
      await load('../team4/app.js?v=20261017-2');
      await load('./hours-v1.js?v=20261017-2');
    }catch(err){
      const status=document.querySelector('#status');
      if(status)status.textContent='Erreur de chargement MyTEAM. Actualise la page.';
      console.error(err);
    }
  })();
})();
