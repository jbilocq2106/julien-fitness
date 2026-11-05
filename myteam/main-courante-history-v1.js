/* MyTEAM : main courante, lecture chronologique de l'historique privé. */
(()=>{
  'use strict';
  if(document.getElementById('mt-main-history'))return;
  const date=document.getElementById('date');
  const archives=document.getElementById('archives');
  if(!date||!archives)return;
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=(key,fall)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fall}catch{return fall}};
  const niceDate=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?m[3]+'/'+m[2]+'/'+m[1]:s};
  const wrap=document.createElement('section');
  wrap.className='card';wrap.id='mt-main-history';
  wrap.innerHTML='<h2>Historique de la main courante</h2>'+
    '<p class="mt-hint">Recherche dans les passages, visites, actions et transmissions enregistrés sur ce téléphone. Les entrées restent dans leur ordre de saisie ; aucun horaire n’est inventé.</p>'+
    '<label>Rechercher une date, un agent, un poste ou un sujet'+
    '<input id="mt-history-search" type="search" placeholder="Ex. E84, Scarpino, 03/11" autocomplete="off"></label>'+
    '<div id="mt-history-count" class="mt-hint" role="status"></div>'+
    '<div id="mt-history-results"></div>';
  const style=document.createElement('style');
  style.textContent='#mt-main-history{border:1px solid #536b83}#mt-main-history h2{margin:0 0 10px;font-size:21px}#mt-main-history .mt-hint{font-size:13px;color:#c5d4e5;line-height:1.5}#mt-main-history #mt-history-search{display:block;width:100%;box-sizing:border-box;margin:9px 0;padding:14px;background:#142338;color:#fff;border:1px solid #8295a9;border-radius:11px}#mt-main-history .mt-history-day{border:1px solid #53687d;border-radius:12px;margin-top:10px;overflow:hidden;background:#1d2e43}#mt-main-history .mt-history-header{display:flex;align-items:center;gap:8px;justify-content:space-between;background:#344b60;padding:9px 12px}#mt-main-history .mt-history-header button{padding:8px 11px;flex-shrink:0}#mt-main-history .mt-history-entry{padding:10px 12px;border-top:1px solid #405167;font-size:14px;overflow-wrap:anywhere}#mt-main-history .mt-history-entry small{display:block;color:#d0d9e4;margin-top:3px}#mt-main-history .mt-history-kind{font-weight:750}#mt-main-history .mt-history-end{padding:10px;color:#c5d4e5;font-size:13px}';
  wrap.prepend(style);
  // Keep legacy Archives available for compatibility; place consolidated history above it.
  const title=[...document.querySelectorAll('h2')].find(e=>e.textContent.trim()==='Archives');
  if(title)title.before(wrap);else archives.before(wrap);
  const input=wrap.querySelector('#mt-history-search');
  const results=wrap.querySelector('#mt-history-results');
  const count=wrap.querySelector('#mt-history-count');
  let maxDays=25;
  function allDays(){
    const journal=load('myteam-daily-v1',{});
    const briefs=load('myteam-private-briefings-v1',[]);
    const grouped=new Map();
    if(journal&&typeof journal==='object'&&!Array.isArray(journal)){
      for(const [day,data] of Object.entries(journal)){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
        const items=grouped.get(day)||[];
        for(const v of (Array.isArray(data?.visits)?data.visits:[])){
          items.push({kind:String(v.type||'Déplacement'),text:[v.poste,v.agents].filter(Boolean).join(' · '),notes:String(v.notes||'')});
        }
        for(const r of (Array.isArray(data?.reminders)?data.reminders:[])){
          items.push({kind:r.done?'Rappel terminé':'Rappel à faire',text:String(r.text||''),notes:''});
        }
        grouped.set(day,items);
      }
    }
    if(Array.isArray(briefs)){
      for(const v of briefs){
        if(!v||!(/^\d{4}-\d{2}-\d{2}$/.test(v.date)))continue;
        const items=grouped.get(v.date)||[];
        items.push({kind:String(v.kind||'Transmission')+(v.done?' · Fait':''),text:String(v.text||''),notes:''});
        grouped.set(v.date,items);
      }
    }
    return [...grouped.entries()].filter(([,entries])=>entries.length).sort((a,b)=>b[0].localeCompare(a[0]));
  }
  function renderHistory(){
    const q=norm(input.value).trim();
    const days=allDays().map(([day,entries])=>{
      const dayMatch=norm(day+' '+niceDate(day)).includes(q);
      return [day,q&&!dayMatch?entries.filter(e=>norm([e.kind,e.text,e.notes].join(' ')).includes(q)):entries];
    }).filter(([,entries])=>entries.length);
    const visible=days.slice(0,maxDays);
    const total=days.reduce((n,[,entries])=>n+entries.length,0);
    count.textContent=days.length+' journée(s) · '+total+' entrée(s) correspondant à la recherche';
    results.innerHTML=visible.length?visible.map(([day,entries])=>
      '<div class="mt-history-day"><div class="mt-history-header"><strong>'+esc(niceDate(day))+'</strong><button type="button" data-history-date="'+esc(day)+'">Voir la journée</button></div>'+
      entries.map(e=>'<div class="mt-history-entry"><span class="mt-history-kind">'+esc(e.kind)+'</span> — '+esc(e.text)+(e.notes?'<small>'+esc(e.notes)+'</small>':'')+'</div>').join('')+
      '</div>'
    ).join(''):'<p class="mt-hint">Aucune entrée correspondante.</p>';
    if(visible.length<days.length)results.innerHTML+='<button type="button" id="mt-history-more">Afficher les journées suivantes</button>';
  }
  input.addEventListener('input',()=>{maxDays=25;renderHistory()});
  results.addEventListener('click',e=>{
    const more=e.target.closest('#mt-history-more');
    if(more){maxDays+=25;renderHistory();return}
    const btn=e.target.closest('[data-history-date]');
    if(!btn)return;
    date.value=btn.dataset.historyDate;
    date.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('visits')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  // Reread after journal additions and archive refresh, without changing saved data.
  new MutationObserver(renderHistory).observe(archives,{childList:true});
  window.addEventListener('focus',renderHistory);
  window.addEventListener('storage',e=>{if(['myteam-daily-v1','myteam-private-briefings-v1'].includes(e.key))renderHistory()});
  renderHistory();
})();