(()=>{
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Chargement impossible : '+src));document.head.appendChild(s)});
  const roster=[
    {name:'ADAM Manon',rx:false,piste:false},{name:'BORGESE Myriam',rx:true,piste:true},{name:'DAL FARRA Shirley',rx:true,piste:false},{name:"D'AVERSI Margaux",rx:true,piste:true},{name:'DIELS Elisa',rx:false,piste:false},{name:'GAGNANT Deborah',rx:true,piste:true},{name:'GARCIA Maeva',rx:false,piste:false},{name:'LUCK Océane',rx:false,piste:false},{name:'OUINNE Melyse',rx:false,piste:false},{name:'WILTGEN Ophélie',rx:false,piste:false},
    {name:'BERAUT Geoffrey',rx:true,piste:true},{name:'BIGONI-HOUDUSSE Alexandre',rx:true,piste:false},{name:'BILOCQ Julien',rx:true,piste:true},{name:'BURG Jeremy',rx:false,piste:true},{name:'CLESEUR Noah',rx:false,piste:true},{name:'DORRION Albert',rx:false,piste:false},{name:'FREZAL Joey',rx:true,piste:false},{name:'HENRAT Corentin',rx:true,piste:true},{name:'HUMMEL Aurelien',rx:false,piste:false},{name:'JACOTEZ Tim',rx:true,piste:true},{name:'MATEI Vitor',rx:false,piste:false},{name:'PANATO Joey',rx:false,piste:true},{name:'SANDSTROM Mike',rx:true,piste:false},{name:'SCARPINO Loic',rx:false,piste:true},{name:'STASIAK Valentin',rx:false,piste:false},{name:'TUMMINELLI Attilio',rx:false,piste:true},{name:'WILLEMS Jeremy',rx:true,piste:false}
  ];

  function renderDirectAgents(){
    const tab=document.querySelector('[data-tab="team"]');
    if(tab)tab.textContent='👥 Agents';
    const section=document.querySelector('#team');
    if(!section)return;
    const title=section.querySelector('h2');if(title)title.textContent='Agents — Équipe 4';
    let box=document.querySelector('#agents-direct');
    if(!box){
      box=document.createElement('div');box.id='agents-direct';
      box.innerHTML=`<style>
      #agents-direct{margin:0 0 18px}.ad-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.ad-count{font-size:12px;color:#aebacc}
      #ad-search{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #61748b;background:#111928;color:#fff;font:inherit;margin:6px 0 10px}
      .ad-filters{display:flex;gap:7px;overflow:auto;padding-bottom:10px}.ad-filter{white-space:nowrap;padding:9px 11px;border-radius:999px;background:#27364c;color:#fff;border:0;font-weight:750}.ad-filter.active{background:#e76b24}
      #ad-list{display:grid;gap:8px}.ad-row{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;padding:13px 14px;border-radius:14px;border:1px solid #3b4e66;background:#26354a;color:#fff}.ad-name{font-weight:800}.ad-tags{display:flex;gap:6px;align-items:center}.ad-tag{padding:5px 8px;border-radius:999px;background:#1f7a4d;font-size:11px;font-weight:850}.ad-arrow{font-size:20px;color:#aebacc}</style>
      <div class="ad-top"><strong>Liste complète</strong><span id="ad-count" class="ad-count"></span></div>
      <input id="ad-search" type="search" placeholder="Rechercher un agent…" autocomplete="off">
      <div class="ad-filters"><button class="ad-filter active" data-ad-filter="all" type="button">Tous</button><button class="ad-filter" data-ad-filter="rx" type="button">RX</button><button class="ad-filter" data-ad-filter="piste" type="button">Permis piste</button><button class="ad-filter" data-ad-filter="both" type="button">RX + Piste</button></div>
      <div id="ad-list"></div>`;
      const first=section.querySelector('p');if(first)first.before(box);else section.prepend(box);
    }
    let filter='all';
    const search=box.querySelector('#ad-search'),list=box.querySelector('#ad-list'),count=box.querySelector('#ad-count');
    count.textContent=`${roster.length} agents • ${roster.filter(a=>a.rx).length} RX • ${roster.filter(a=>a.piste).length} piste`;
    const draw=()=>{
      const q=(search.value||'').trim().toLocaleLowerCase('fr');
      const data=roster.filter(a=>(!q||a.name.toLocaleLowerCase('fr').includes(q))&&(filter==='all'||(filter==='rx'&&a.rx)||(filter==='piste'&&a.piste)||(filter==='both'&&a.rx&&a.piste)));
      list.innerHTML=data.map(a=>`<button type="button" class="ad-row" data-ad-name="${a.name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><span class="ad-name">${a.name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><span class="ad-tags">${a.rx?'<span class="ad-tag">RX</span>':''}${a.piste?'<span class="ad-tag">PISTE</span>':''}<span class="ad-arrow">›</span></span></button>`).join('');
      list.querySelectorAll('[data-ad-name]').forEach(btn=>btn.onclick=()=>{
        const sel=document.querySelector('#agent-select');if(!sel)return;
        sel.value=btn.dataset.adName;sel.dispatchEvent(new Event('change'));
        const detail=document.querySelector('#agent-detail');if(detail){detail.classList.remove('hidden');detail.scrollIntoView({behavior:'smooth',block:'start'});}
      });
    };
    search.oninput=draw;
    box.querySelectorAll('[data-ad-filter]').forEach(btn=>btn.onclick=()=>{filter=btn.dataset.adFilter;box.querySelectorAll('[data-ad-filter]').forEach(b=>b.classList.toggle('active',b===btn));draw();});
    draw();
  }

  (async()=>{
    try{
      await load('../team4/app.js?v=20261017-6');
      renderDirectAgents();
      await load('./hours-v1.js?v=20261017-6');
      await load('./salary-v1.js?v=20261017-1');
      await load('./agents-migration-v3.js?v=4');
      await load('./roster-v5.js?v=20261017-6');
      renderDirectAgents();
      await load('./prestation-share-v1.js?v=2');
      await load('./planning-pdf-import-v1.js?v=2');
    }catch(err){
      renderDirectAgents();
      const status=document.querySelector('#status');if(status)status.textContent='MyTEAM chargé avec fonctions principales. Actualise si un module manque.';
      console.error(err);
    }
  })();
})();
