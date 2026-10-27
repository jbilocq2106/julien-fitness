/* MyTEAM — Memo CDE: contenu interne chiffre AES-GCM, cle jamais publiee dans le depot. */
(function(){
  'use strict';
  const nav=document.querySelector('nav.tabs'),main=document.querySelector('main');
  if(!nav||!main||document.getElementById('cde-memo'))return;
  const CONTENT='KEOcfFxMEXwzZDPGsbrupxOdayO42CWSGkfEwHceO_uIQ0VeLYV2elznj8bzDZrcuwhXPRvmK_ZIMx3G_z0IcnMTxBp2AZ6cd8hJWsFYXwefbyrOdQTT3ThTBJw5xA3pRp4kQkNh1gms6Hzl4esMm3FZwN1ip5-_ZdIygHQF1NmlVjBddOgbhN3xGGQLoScQx9gZtoW3d5ZaIjyaFE5i62QQZFIADYtyHrRzrpHg_01QS9_zP29CAJcXUU0rcXZvRNl60a5K1Cw92ji9bqSvQAsFyfbP-tAjswnAxCZZGmPRdTNDaY6i3n-HWBs8tp41aktXAo5uXtEuCwJQ0-WPFVXMG_CpbR05GB-mPVkX-axHo5TT9bjxc9IjyYv1XeS8lIKQoNJg17z4BJ_XUqnKNu2rp4dXCQOmShyswfUBxYYEKpYizJxKTVTif5TR1XHtLBhaadw2q_e0aUNgVbc-DlsK4l8FE9bQjkSFqd59ks0eJVgq-MdVTq8m6F8ZpTuHiCKmBvkK8XQ2q-2BBj_1dCLWlRa_VBTChyky4M3VcqnG7Qk6vv7JArVk7yvSoe7AIioX315aQWsIG4zIFqTkfT_SFjHxdXtfssogkoDzPKnjExO0gUEwUIng5y9z2Wp9t7KUs2tHE1smlAtG-ElWQK8hxhFj7ewUscTBV5mfrwoaFXbj79i6lJWHo0Z41h7vOAH4cJ1e4VQWoMGC4dzoZ-xd0KPhfOSvCD78K4uqKlF6TVhoeCCpN7Oiv_e7dRt43bPD-FYsG6cDXdCIK-aGUjT2_3JTf5Y5uUPHQc4lQN3QefD9T56cP0HKWr36s6QJmPdT4NMHiAE2V23fL8wLnAtINJhfQIflSwHPwBEPRK9WvBd87l3PK6HJPNUhOUQAQDFvsug982ZtChhHMu7SNuZd4VkkZ2fJF5Fzgbt4VMOVRnR8VBzIQAY56ngZxpHZWSl3xGc_DTUurq4SzttJ1rLmgOtlRHfYojhtmaLGMr0TzfWoZh3sJ4krNLxP1d9jbWV37wrGTE17nRytFgQuYc3MMfA5-en-r4_iFKP4nJm8ugeAGe42AAWssk4gI9gLryzA-GtawFKYeRSA0CnygXjrzNDUAwHoWcCUO-Xvz7xm0np1bTJVfn6fNvr7lnK7Uag3U7_sKwnC4G1EbpPTmsduqt3ht8IGe6r9iz3_U-4p1ZFPgy7lOLpM8RBRYCG3lQtUvguAKZyaXCO_PvpJetIKDpz4wo6lZTPlMojVWRJ3IGTxSGaxmY_dVPNNGjdWh2fCSO8lnq_927Sv5jjB954S08l1eNSEeBpSoTiv519sHsmO_cHnZSbk-oRbzU80A4H42M3-jLE8G1Rw6Yq7nzmNR_4HUbKZWLOoqZ_sjhqtPgfzMKYhZCqAyDgsAv9hQB3Ec3v0EJpoN6dwWdCfNoGfC9iIcnylTXmIg_eqDlKwRgIKB_ciJzeQZdqsUAxiTNx_AKSxTs7dNb9x7bdXuwbbHH-rSwazEnpyXJUr2cHdADZd-5t9BILJnp9O4wW_z4dj3Uhxcb40yV96nvCwpsesJ9ax0C8umFCSBNE';
  const CHECK_KEY='myteam_cde_memo_checks_v1',ACCESS_KEY='myteam_cde_memo_access_v1';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const decode=v=>{const s=v.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(s.padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0))};
  const tab=document.createElement('button');
  tab.type='button';tab.dataset.tab='cde-memo';tab.textContent='📌 Mémo CDE';
  const before=nav.querySelector('[data-tab="consignes"]')||nav.querySelector('[data-tab="prestation"]');
  if(before)before.insertAdjacentElement('afterend',tab);else nav.append(tab);
  const section=document.createElement('section');section.id='cde-memo';section.className='hidden';
  section.innerHTML=[
    '<div class="card cdem-hero"><div class="cdem-eyebrow">G4S Luxembourg · Chef d’équipe</div>',
    '<h2>📌 Mémo CDE</h2><p>Rappels de mission à consulter pendant tes postes.</p></div>',
    '<div id="cdem-locked" class="card">',
    '<h3>🔐 Consignes internes protégées</h3>',
    '<p>Le contenu de ce mémo est chiffré dans le site public. Utilise la clé privée transmise dans la conversation pour l’ouvrir sur ton appareil.</p>',
    '<form id="cdem-unlock"><label for="cdem-key">Clé du mémo</label><input id="cdem-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Coller la clé ici" required>',
    '<button type="submit">Déverrouiller sur cet appareil</button></form><p id="cdem-unlock-status" role="status"></p></div>',
    '<div id="cdem-body" class="hidden"></div>'
  ].join('');
  main.append(section);
  const style=document.createElement('style');
  style.textContent=[
    '#cde-memo{max-width:880px;margin:auto;line-height:1.5}',
    '#cde-memo .card{border:1px solid #41526b}',
    '#cde-memo h2{font-size:27px;margin:6px 0 10px}',
    '#cde-memo h3{font-size:19px;line-height:1.3;margin:0 0 12px;color:#fff}',
    '#cde-memo p{margin:7px 0 11px}',
    '#cde-memo .cdem-hero{background:linear-gradient(135deg,#28415d,#1d2d43)}',
    '#cde-memo .cdem-eyebrow{font-size:12px;font-weight:800;color:#bbd7f3}',
    '#cde-memo #cdem-unlock{display:grid;gap:12px}',
    '#cde-memo #cdem-key{width:100%;font:inherit;border:1px solid #637a92;background:#111928;border-radius:10px;color:#fff;padding:13px}',
    '#cde-memo .cdem-shortcuts{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}',
    '#cde-memo .cdem-shortcuts button{background:#365777;border:1px solid #6382a1;font-size:14px;padding:11px}',
    '#cde-memo .cdem-alert{background:#4c3427;border:1px solid #f2ab69}',
    '#cde-memo .cdem-alert h3{color:#ffcf9d}',
    '#cde-memo .cdem-alert p{font-size:17px}',
    '#cde-memo .cdem-progress-head{display:flex;justify-content:space-between;gap:10px;font-size:17px}',
    '#cde-memo .cdem-track{height:8px;background:#42536b;border-radius:99px;overflow:hidden;margin:13px 0 7px}',
    '#cde-memo #cdem-bar{height:100%;width:0%;background:#48b47b}',
    '#cde-memo .cdem-note{font-size:12px;color:#c6d3e0}',
    '#cde-memo #cdem-reset{background:#30445e;border:1px solid #60748a;font-size:14px}',
    '#cde-memo .cdem-group{scroll-margin-top:105px}',
    '#cde-memo .cdem-check{display:flex;align-items:flex-start;gap:13px;padding:14px 0;border-top:1px solid #3e4f66;font-size:16px;line-height:1.43;cursor:pointer}',
    '#cde-memo .cdem-check:first-of-type{border-top:0}',
    '#cde-memo .cdem-check input{margin:2px 0 0;flex:0 0 auto;width:23px;height:23px;accent-color:#51c38b}',
    '#cde-memo .cdem-check input:checked+span{color:#aebacc}',
    '#cde-memo .cdem-group ul{padding-left:22px;font-size:16px}',
    '#cde-memo .cdem-group li{margin:10px 0}',
    '@media(max-width:420px){#cde-memo h2{font-size:25px}#cde-memo .cdem-shortcuts button{flex:1 1 130px}}'
  ].join('');
  document.head.append(style);
  let checks={};try{checks=JSON.parse(localStorage.getItem(CHECK_KEY)||'{}')||{};}catch{}
  let loaded=false;
  function render(data){
    if(loaded)return;loaded=true;
    const groupHTML=data.groups.map(g=>'<div class="card cdem-group" id="'+esc(g.id)+'"><h3>'+esc(g.title)+'</h3>'+
      g.items.map((line,i)=>'<label class="cdem-check"><input type="checkbox" data-cdem-check="'+esc(g.id)+'-'+i+'"><span>'+esc(line)+'</span></label>').join('')+'</div>').join('');
    const list=items=>items.map(x=>'<li>'+esc(x)+'</li>').join('');
    section.querySelector('#cdem-body').innerHTML=[
      '<div class="card cdem-alert"><h3>⚠️ '+esc(data.alert_title)+'</h3><p>'+esc(data.alert)+'</p></div>',
      '<div class="card cdem-progress"><div class="cdem-progress-head"><strong>Checklist du shift</strong><span id="cdem-counter"></span></div>',
      '<div class="cdem-track"><div id="cdem-bar"></div></div><p class="cdem-note">Cases locales. Réinitialiser à chaque nouveau shift.</p>',
      '<button type="button" id="cdem-reset">↻ Nouveau shift : tout décocher</button></div>',
      '<div class="card"><div class="cdem-shortcuts"><button data-cdem-jump="cde-start">Prise de poste</button>',
      '<button data-cdem-jump="cde-during">Pendant le shift</button><button data-cdem-jump="cde-night">Nuit / week-end</button></div></div>',
      groupHTML,
      '<div class="card cdem-group" id="cde-night"><h3>'+esc(data.autonomy_title)+'</h3><ul>'+list(data.autonomy)+'</ul></div>',
      '<div class="card cdem-group"><h3>'+esc(data.sim_title)+'</h3><ul>'+list(data.sim)+'</ul></div>',
      '<div class="card"><strong>À retenir</strong><p>'+esc(data.last)+'</p><p class="cdem-note">'+esc(data.notes)+'</p></div>'
    ].join('');
    const boxes=Array.from(section.querySelectorAll('[data-cdem-check]'));
    const refresh=()=>{boxes.forEach(b=>b.checked=!!checks[b.dataset.cdemCheck]);const n=boxes.filter(b=>b.checked).length;
      section.querySelector('#cdem-counter').textContent=n+'/'+boxes.length;
      section.querySelector('#cdem-bar').style.width=(100*n/boxes.length)+'%';};
    boxes.forEach(b=>b.addEventListener('change',()=>{checks[b.dataset.cdemCheck]=b.checked;
      try{localStorage.setItem(CHECK_KEY,JSON.stringify(checks));}catch{}refresh();}));
    section.querySelector('#cdem-reset').addEventListener('click',()=>{checks={};
      try{localStorage.setItem(CHECK_KEY,'{}');}catch{}refresh();});
    section.querySelectorAll('[data-cdem-jump]').forEach(b=>b.addEventListener('click',()=>
      section.querySelector('#'+b.dataset.cdemJump)?.scrollIntoView({behavior:'smooth',block:'start'})));
    section.querySelector('#cdem-locked').classList.add('hidden');
    section.querySelector('#cdem-body').classList.remove('hidden');
    refresh();
  }
  async function unlock(keyString){
    try{
      if(!/^[A-Za-z0-9_-]{43}$/.test(keyString))throw new Error('Clé incorrecte.');
      const raw=decode(keyString),payload=decode(CONTENT),key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
      const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:payload.slice(0,12)},key,payload.slice(12));
      const stream=new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
      const unzipped=await new Response(stream).arrayBuffer();
      const data=JSON.parse(new TextDecoder().decode(unzipped));
      if(!Array.isArray(data.groups))throw new Error('Format de mémo incorrect.');
      try{localStorage.setItem(ACCESS_KEY,keyString);}catch{}
      render(data);return true;
    }catch(error){
      section.querySelector('#cdem-unlock-status').textContent='Déverrouillage impossible : vérifier la clé et la connexion sécurisée du navigateur.';
      return false;
    }
  }
  section.querySelector('#cdem-unlock').addEventListener('submit',event=>{
    event.preventDefault();unlock(section.querySelector('#cdem-key').value.trim());
  });
  tab.addEventListener('click',()=>{
    nav.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===tab));
    main.querySelectorAll('section').forEach(s=>s.classList.toggle('hidden',s!==section));
  });
  const consignes=document.querySelector('#consignes .card');
  if(consignes){
    const button=document.createElement('button');
    button.type='button';button.textContent='📌 Ouvrir le mémo CDE';
    button.style.cssText='display:block;width:100%;margin:10px 0;background:#365777';
    consignes.querySelector('h2')?.insertAdjacentElement('afterend',button);
    button.addEventListener('click',()=>tab.click());
  }
  const fragment=new URLSearchParams(location.hash.slice(1)).get('cde-key');
  const stored=(()=>{try{return localStorage.getItem(ACCESS_KEY);}catch{return null}})();
  if(fragment){
    unlock(fragment).then(success=>{
      if(success)history.replaceState(null,'',location.pathname+location.search);
    });
  }else if(stored){unlock(stored);}
})();
