(()=>{
  const roster=[
    {name:'ADAM Manon',rx:0,piste:0},{name:'BORGESE Myriam',rx:1,piste:1},{name:'DAL FARRA Shirley',rx:1,piste:0},{name:"D'AVERSI Margaux",rx:1,piste:1},{name:'DIELS Elisa',rx:0,piste:0},{name:'GAGNANT Deborah',rx:1,piste:1},{name:'GARCIA Maeva',rx:0,piste:0},{name:'LUCK Océane',rx:0,piste:0},{name:'OUINNE Melyse',rx:0,piste:0},{name:'WILTGEN Ophélie',rx:0,piste:0},
    {name:'BERAUT Geoffrey',rx:1,piste:1},{name:'BIGONI-HOUDUSSE Alexandre',rx:1,piste:0},{name:'BILOCQ Julien',rx:1,piste:1},{name:'BURG Jeremy',rx:0,piste:1},{name:'CLESEUR Noah',rx:0,piste:1},{name:'DORRION Albert',rx:0,piste:0},{name:'FREZAL Joey',rx:1,piste:0},{name:'HENRAT Corentin',rx:1,piste:1},{name:'HUMMEL Aurelien',rx:0,piste:0},{name:'JACOTEZ Tim',rx:1,piste:1},{name:'MATEI Vitor',rx:0,piste:0},{name:'PANATO Joey',rx:0,piste:1},{name:'SANDSTROM Mike',rx:1,piste:0},{name:'SCARPINO Loic',rx:0,piste:1},{name:'STASIAK Valentin',rx:0,piste:0},{name:'TUMMINELLI Attilio',rx:0,piste:1},{name:'WILLEMS Jeremy',rx:1,piste:0}
  ];
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  function init(){
    const section=document.querySelector('#team');
    if(!section)return false;
    document.querySelector('[data-tab="team"]')?.replaceChildren(document.createTextNode('👥 Agents'));
    section.querySelector('h2')&&(section.querySelector('h2').textContent='Agents — Équipe 4');
    document.querySelector('#agents-quick-view')?.remove();
    document.querySelector('#agents-complete-view')?.remove();
    const box=document.createElement('div');box.id='agents-complete-view';
    box.innerHTML=`<style>
      #agents-complete-view{margin:0 0 18px}.agents-top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:10px}.agents-top strong{font-size:18px}.agents-summary{font-size:12px;color:#aebacc;text-align:right}
      #agents-search-v2{width:100%;padding:14px;border-radius:12px;border:1px solid #64748b;background:#111928;color:#fff;font:inherit;margin-bottom:10px}.agents-filterbar{display:flex;gap:7px;overflow:auto;padding:0 0 10px}.agents-filter-v2{white-space:nowrap;padding:9px 12px;border-radius:999px;background:#27364c;color:#fff}.agents-filter-v2.active{background:#e76b24}
      #agents-list-v2{display:grid;gap:8px}.agent-v2{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border-radius:14px;border:1px solid #3a4a60;background:#24344b;color:#fff;text-align:left}.agent-v2-name{font-weight:800;font-size:15px}.agent-v2-tags{display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.agent-v2-tag{background:#19794e;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:800}.agent-v2-arrow{font-size:19px;color:#aebacc}.agents-none{padding:14px;text-align:center;color:#aebacc}
    </style>
    <div class="agents-top"><strong>Liste complète</strong><span class="agents-summary">27 agents • 12 RX • 12 piste</span></div>
    <input id="agents-search-v2" type="search" placeholder="Rechercher un agent…" autocomplete="off">
    <div class="agents-filterbar"><button type="button" class="agents-filter-v2 active" data-af="all">Tous (27)</button><button type="button" class="agents-filter-v2" data-af="rx">RX (12)</button><button type="button" class="agents-filter-v2" data-af="piste">Piste (12)</button><button type="button" class="agents-filter-v2" data-af="both">RX + Piste</button></div>
    <div id="agents-list-v2"></div>`;
    const h2=section.querySelector('h2');h2?.after(box);
    const search=box.querySelector('#agents-search-v2'),list=box.querySelector('#agents-list-v2');let filter='all';
    function draw(){
      const q=search.value.trim().toLocaleLowerCase('fr');
      const rows=roster.filter(a=>(!q||a.name.toLocaleLowerCase('fr').includes(q))&&(filter==='all'||filter==='rx'&&a.rx||filter==='piste'&&a.piste||filter==='both'&&a.rx&&a.piste));
      list.innerHTML=rows.length?rows.map(a=>`<button type="button" class="agent-v2" data-name="${esc(a.name)}"><span class="agent-v2-name">${esc(a.name)}</span><span class="agent-v2-tags">${a.rx?'<span class="agent-v2-tag">RX</span>':''}${a.piste?'<span class="agent-v2-tag">PISTE</span>':''}<span class="agent-v2-arrow">›</span></span></button>`).join(''):'<div class="agents-none">Aucun agent trouvé.</div>';
      list.querySelectorAll('.agent-v2').forEach(btn=>btn.onclick=()=>{
        try{
          if(typeof agentSelect!=='undefined'&&agentSelect){agentSelect.value=btn.dataset.name;agentSelect.dispatchEvent(new Event('change'));document.querySelector('#agent-detail')?.classList.remove('hidden');document.querySelector('#agent-detail')?.scrollIntoView({behavior:'smooth',block:'start'});}
        }catch{}
      });
    }
    search.addEventListener('input',draw);
    box.querySelectorAll('[data-af]').forEach(btn=>btn.onclick=()=>{filter=btn.dataset.af;box.querySelectorAll('[data-af]').forEach(x=>x.classList.toggle('active',x===btn));draw()});
    draw();return true;
  }
  if(init())return;
  let n=0;const t=setInterval(()=>{n++;if(init()||n>40)clearInterval(t)},100);
})();
