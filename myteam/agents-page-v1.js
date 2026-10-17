(()=>{
  function init(){
    if(typeof agentProfiles==='undefined'||typeof agentSelect==='undefined')return;
    const tab=document.querySelector('[data-tab="team"]');
    if(tab)tab.textContent='👥 Agents';
    const section=document.querySelector('#team');
    if(!section)return;

    const oldTitle=section.querySelector('h2');
    if(oldTitle)oldTitle.textContent='Agents — Équipe 4';

    const old=document.querySelector('#agents-quick-view');
    if(old)old.remove();

    const box=document.createElement('div');
    box.id='agents-quick-view';
    box.innerHTML=`
      <style>
        #agents-quick-view{margin-bottom:18px}
        .agent-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
        .agent-count{font-size:12px;color:#aebacc}
        #agent-quick-search{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #65758a;background:#111928;color:#fff;font:inherit;margin:4px 0 10px}
        .agent-filters{display:flex;gap:7px;overflow:auto;padding-bottom:10px}
        .agent-filter{white-space:nowrap;padding:9px 11px;border-radius:999px;background:#27364c;color:#fff;border:0;font-weight:700}
        .agent-filter.active{background:#e76b24}
        #agent-quick-list{display:grid;gap:8px}
        .agent-card{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;background:#26354a;border:1px solid #344860;border-radius:14px;padding:13px 14px;color:#fff}
        .agent-name{font-weight:800;font-size:15px}
        .agent-badges{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
        .agent-badge{display:inline-block;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:800;background:#1f7a4d;color:#fff}
        .agent-arrow{color:#aebacc;font-size:18px;margin-left:4px}
        .agent-empty{padding:14px;color:#aebacc;text-align:center}
        @media(max-width:520px){.agent-card{padding:12px}.agent-name{font-size:14px}}
      </style>
      <div class="agent-head"><strong>Liste rapide</strong><span class="agent-count" id="agent-quick-count"></span></div>
      <input id="agent-quick-search" type="search" placeholder="Rechercher un agent…" autocomplete="off">
      <div class="agent-filters" aria-label="Filtres qualifications">
        <button class="agent-filter active" type="button" data-filter="all">Tous</button>
        <button class="agent-filter" type="button" data-filter="rx">RX</button>
        <button class="agent-filter" type="button" data-filter="piste">Permis piste</button>
        <button class="agent-filter" type="button" data-filter="both">RX + Piste</button>
      </div>
      <div id="agent-quick-list"></div>`;

    const firstPara=section.querySelector('p');
    if(firstPara)firstPara.before(box);else section.prepend(box);

    const search=box.querySelector('#agent-quick-search');
    const list=box.querySelector('#agent-quick-list');
    const count=box.querySelector('#agent-quick-count');
    let filter='all';

    function rows(){
      const q=(search.value||'').trim().toLocaleLowerCase('fr');
      return Object.entries(agentProfiles)
        .filter(([,p])=>!p.team||Number(p.team)===4)
        .filter(([name,p])=>{
          if(q&&!name.toLocaleLowerCase('fr').includes(q))return false;
          if(filter==='rx'&&!p.rxCertified)return false;
          if(filter==='piste'&&!p.pistePermit)return false;
          if(filter==='both'&&!(p.rxCertified&&p.pistePermit))return false;
          return true;
        })
        .sort((a,b)=>a[0].localeCompare(b[0],'fr'));
    }

    function draw(){
      const all=Object.entries(agentProfiles).filter(([,p])=>!p.team||Number(p.team)===4);
      const rx=all.filter(([,p])=>p.rxCertified===true).length;
      const piste=all.filter(([,p])=>p.pistePermit===true).length;
      count.textContent=`${all.length} agents • ${rx} RX • ${piste} piste`;
      const data=rows();
      if(!data.length){list.innerHTML='<div class="agent-empty">Aucun agent trouvé.</div>';return;}
      list.innerHTML=data.map(([name,p])=>{
        const badges=[];
        if(p.rxCertified===true)badges.push('<span class="agent-badge">RX</span>');
        if(p.pistePermit===true)badges.push('<span class="agent-badge">PISTE</span>');
        return `<button type="button" class="agent-card" data-agent="${name.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><span class="agent-name">${name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span><span class="agent-badges">${badges.join('')}<span class="agent-arrow">›</span></span></button>`;
      }).join('');
      list.querySelectorAll('[data-agent]').forEach(btn=>btn.onclick=()=>{
        agentSelect.value=btn.dataset.agent;
        agentSelect.dispatchEvent(new Event('change'));
        const detail=document.querySelector('#agent-detail');
        if(detail){detail.classList.remove('hidden');detail.scrollIntoView({behavior:'smooth',block:'start'});}
      });
    }

    search.addEventListener('input',draw);
    box.querySelectorAll('[data-filter]').forEach(btn=>btn.onclick=()=>{
      filter=btn.dataset.filter;
      box.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===btn));
      draw();
    });
    draw();

    // Dans la fiche détaillée, n'affiche que les qualifications réellement présentes.
    const originalShow=window.showAgent;
    if(typeof originalShow==='function'){
      window.showAgent=function(){
        originalShow();
        const key=agentSelect.value,p=agentProfiles[key];
        const summary=document.querySelector('#agent-qual-summary');
        if(summary&&p){
          const labels=[];
          if(p.rxCertified===true)labels.push('RX ✓');
          if(p.pistePermit===true)labels.push('Permis piste ✓');
          summary.textContent=labels.join(' • ');
          summary.style.display=labels.length?'':'none';
        }
      };
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
  else setTimeout(init,0);
})();
