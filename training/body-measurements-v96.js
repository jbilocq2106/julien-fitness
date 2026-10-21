/* My Training v96 — mensurations individuelles, stockage prive. Aucune donnee personnelle dans le depot public. */
import { getApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getFirestore, doc, collection, getDocs, setDoc } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

(function () {
  'use strict';
  const KEY='mt_body_measurements_v1';
  const MEASUREMENTS=[
    ['heightCm','Taille (hauteur)','cm'], ['neckCm','Cou','cm'], ['chestCm','Poitrine','cm'],
    ['waistCm','Taille anatomique','cm'], ['navelCm','Ventre au nombril','cm'],
    ['hipsCm','Hanches','cm'], ['armLeftCm','Bras gauche','cm'],
    ['armRightCm','Bras droit','cm'], ['forearmLeftCm','Avant-bras gauche','cm'],
    ['forearmRightCm','Avant-bras droit','cm'], ['thighLeftCm','Cuisse gauche','cm'],
    ['thighRightCm','Cuisse droite','cm'], ['calfLeftCm','Mollet gauche','cm'],
    ['calfRightCm','Mollet droit','cm']
  ];
  const RENPHO=[
    ['weightKg','Poids','kg'], ['bmi','IMC',''], ['bodyFatPct','Graisse corporelle','%'],
    ['bodyFatKg','Masse grasse','kg'], ['subcutaneousFatPct','Gras sous-cutane','%'],
    ['visceralFat','Graisse viscerale (indice RENPHO)',''],
    ['musclePct','Masse musculaire','%'], ['muscleKg','Masse musculaire','kg'],
    ['skeletalMusclePct','Muscles squelettiques','%'],
    ['skeletalMuscleKg','Masse musculaire squelettique','kg'],
    ['bonePct','Masse osseuse','%'], ['boneKg','Masse osseuse','kg'],
    ['leanKg','Poids hors masse grasse','kg'], ['metabolicAge','Age metabolique','ans'],
    ['bmrKcal','Metabolisme de base estime','kcal'],
    ['waterPct','Eau corporelle','%'], ['waterKg','Masse d’eau','kg'],
    ['proteinPct','Proteines','%'], ['proteinKg','Masse proteique','kg']
  ];
  const FIELDS=[...MEASUREMENTS,...RENPHO];
  const KNOWN=new Set(FIELDS.map(item=>item[0]));
  let user=null, syncing=false, pending=false, syncTimer=null, cloudStatus='Enregistre sur cet appareil.';
  const number=v=>{
    if(v===null||v===undefined||String(v).trim()==='')return null;
    const n=Number(String(v).replace(',','.'));
    return Number.isFinite(n)&&n>=0&&n<=10000?n:null;
  };
  const fmt=(v,unit)=>{
    if(v===null||v===undefined)return '—';
    return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(v)+(unit?' '+unit:'');
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validDate=d=>typeof d==='string'&&/^\d{4}-\d\d-\d\d$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00'));
  const today=()=>{
    const d=new Date(),p=v=>String(v).padStart(2,'0');
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  };
  function clean(raw){
    if(!raw||!validDate(raw.date))return null;
    const data={date:raw.date,source:raw.source==='RENPHO + ruban'?'RENPHO + ruban':'Saisie manuelle',updatedAt:Number(raw.updatedAt)||0};
    if(raw.deleted===true){data.deleted=true;return data;}
    FIELDS.forEach(([key])=>{const v=number(raw[key]);if(v!==null)data[key]=v;});
    return data;
  }
  function read(){
    try{
      const rows=JSON.parse(localStorage.getItem(KEY)||'[]');
      return Array.isArray(rows)?rows.map(clean).filter(Boolean):[];
    }catch(e){return [];}
  }
  function write(rows){
    try{localStorage.setItem(KEY,JSON.stringify(rows));return true;}
    catch(e){alert('Enregistrement impossible : stockage du telephone indisponible.');return false;}
  }
  function live(){return read().filter(x=>!x.deleted).sort((a,b)=>b.date.localeCompare(a.date));}
  function saveRecord(record){
    const rows=read(),index=rows.findIndex(x=>x.date===record.date);
    if(index>=0)rows[index]=record;else rows.push(record);
    if(!write(rows))return false;
    render();updateHome();queueSync();
    return true;
  }
  function grid(fields){
    return '<div class="mtb-fields">'+fields.map(([key,label,unit])=>
      '<label class="mtb-field"><span>'+esc(label)+(unit?' ('+esc(unit)+')':'')+'</span><input data-mtb="'+key+'" type="number" min="0" max="10000" step="any" inputmode="decimal" autocomplete="off" placeholder="—"></label>'
    ).join('')+'</div>';
  }
  const view=document.getElementById('bodyMeasurementsView');
  if(!view)return;
  view.innerHTML='<h2>Mensurations</h2><p class="muted mtb-intro">Suivi personnel du poids, de la graisse abdominale et des volumes musculaires. Donnees privees, modifiables par date.</p>'+
    '<div class="card"><div class="section-title"><h3>Bilan et evolution</h3></div><div id="mtbSummary"></div><div id="mtbCloud" class="muted" aria-live="polite"></div></div>'+
    '<div class="card"><div class="section-title"><h3>Ajouter ou corriger une mesure</h3></div>'+
    '<form id="mtbForm"><label for="mtbDate">Date de mesure</label><input id="mtbDate" required type="date">'+
    '<details open><summary>Mensurations au metre ruban</summary>'+grid(MEASUREMENTS)+'</details>'+
    '<details><summary>Composition corporelle RENPHO</summary>'+grid(RENPHO)+'</details>'+
    '<p class="muted mtb-footnote">Les mesures de graisse et de muscle RENPHO sont des estimations. Comparer sur plusieurs semaines, dans les memes conditions.</p>'+
    '<div class="mtb-actions"><button type="submit" class="primary">Enregistrer le bilan</button><button type="button" id="mtbReset" class="ghost">Nouveau bilan</button></div></form></div>'+
    '<div class="card"><div class="section-title"><h3>Historique</h3></div><div id="mtbHistory"></div></div>';
  const form=document.getElementById('mtbForm');
  const dateInput=document.getElementById('mtbDate');
  function fill(row){
    dateInput.value=row?.date||today();
    FIELDS.forEach(([key])=>{const el=form.querySelector('[data-mtb="'+key+'"]');el.value=row?.[key]??'';});
    view.querySelector('details').open=true;
  }
  function render(){
    const rows=live(),latest=rows[0],prev=rows[1],sum=document.getElementById('mtbSummary');
    if(!latest)sum.innerHTML='<p class="muted">Aucune mesure enregistree.</p>';
    else{
      const delta=(key,unit)=>prev&&latest[key]!=null&&prev[key]!=null?
        ' ('+(latest[key]-prev[key]>0?'+':'')+fmt(Math.round((latest[key]-prev[key])*100)/100,unit)+')':'';
      sum.innerHTML='<div class="mtb-kpis">'+
        '<div><small>Poids</small><strong>'+fmt(latest.weightKg,'kg')+'</strong><small>'+delta('weightKg','kg')+'</small></div>'+
        '<div><small>Ventre au nombril</small><strong>'+fmt(latest.navelCm,'cm')+'</strong><small>'+delta('navelCm','cm')+'</small></div>'+
        '<div><small>Masse grasse RENPHO</small><strong>'+fmt(latest.bodyFatPct,'%')+'</strong></div></div>'+
        '<p class="muted">Derniere mesure : '+esc(latest.date.split('-').reverse().join('/'))+' · Objectif initial : suivre la tendance, pas une mesure isolee.</p>';
    }
    document.getElementById('mtbCloud').textContent=cloudStatus;
    const root=document.getElementById('mtbHistory');
    root.innerHTML=rows.length?rows.map(row=>
      '<div class="mtb-entry"><div><strong>'+esc(row.date.split('-').reverse().join('/'))+'</strong><small>'+
      'Poids '+fmt(row.weightKg,'kg')+' · Ventre '+fmt(row.navelCm,'cm')+' · Graisse '+fmt(row.bodyFatPct,'%')+
      '</small><small>'+esc(row.source)+'</small></div><div class="mtb-entry-actions">'+
      '<button type="button" data-mtbedit="'+row.date+'" class="ghost">Modifier</button>'+
      '<button type="button" data-mtbdelete="'+row.date+'" class="ghost">Supprimer</button></div></div>'
    ).join(''):'<p class="muted">L’historique apparaitra ici.</p>';
    root.querySelectorAll('[data-mtbedit]').forEach(b=>b.onclick=()=>{
      const row=live().find(x=>x.date===b.dataset.mtbedit);
      if(row){fill(row);view.scrollIntoView({behavior:'smooth'});}
    });
    root.querySelectorAll('[data-mtbdelete]').forEach(b=>b.onclick=()=>{
      const row=live().find(x=>x.date===b.dataset.mtbdelete);
      if(row&&confirm('Supprimer la mesure du '+row.date+' de cet appareil et de la synchronisation ?')){
        saveRecord({date:row.date,deleted:true,updatedAt:Date.now()});
      }
    });
  }
  function updateHome(){
    const home=document.getElementById('homeView');
    if(!home)return;
    let card=document.getElementById('mtbHomeCard');
    if(!card){
      card=document.createElement('div');card.id='mtbHomeCard';card.className='card';
      const stats=home.querySelector('.stats-grid');(stats?.parentNode||home).insertBefore(card,stats?stats.nextSibling:null);
    }
    const x=live()[0];
    card.innerHTML='<div class="section-title"><h3>Composition corporelle</h3><button type="button" class="ghost" id="mtbOpen">Voir</button></div>'+
      (x?'<p><strong>'+fmt(x.weightKg,'kg')+'</strong> · Ventre '+fmt(x.navelCm,'cm')+' · Graisse '+fmt(x.bodyFatPct,'%')+'</p>':
      '<p class="muted">Ajouter ton premier bilan de mensurations.</p>');
    card.querySelector('#mtbOpen').onclick=()=>window.showView('bodyMeasurementsView');
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const date=dateInput.value;
    if(!validDate(date)){alert('Choisis une date valide.');return;}
    const previous=read().find(x=>x.date===date);
    if(previous&&!previous.deleted&&!confirm('Remplacer les donnees du '+date+' par celles du formulaire ?'))return;
    const record={date,source:'Saisie manuelle',updatedAt:Date.now()};
    FIELDS.forEach(([key])=>{const value=number(form.querySelector('[data-mtb="'+key+'"]').value);if(value!==null)record[key]=value;});
    if(Object.keys(record).length<4){alert('Indique au moins une mesure.');return;}
    if(saveRecord(record))alert('Bilan enregistre sur cet appareil. La sauvegarde privee sera synchronisee si Google est connecte.');
  });
  dateInput.addEventListener('change',()=>{
    const existing=read().find(x=>x.date===dateInput.value&&!x.deleted);
    if(existing)fill(existing);
    else fill({date:dateInput.value});
  });
  document.getElementById('mtbReset').onclick=()=>fill({date:today()});
  const makeHashImport=()=>{
    const hash=location.hash||'';
    if(!hash.startsWith('#mt-bilan='))return;
    // Effacement immediat : les mensurations ne restent pas dans l'URL.
    history.replaceState(history.state,'',location.pathname+location.search);
    try{
      const b64=hash.slice('#mt-bilan='.length).replace(/-/g,'+').replace(/_/g,'/');
      const decoded=JSON.parse(atob(b64));
      const payload=Array.isArray(decoded)?Object.fromEntries([['date',decoded[0]],['source','RENPHO + ruban'],...FIELDS.map(([key],i)=>[key,decoded[i+1]])]):decoded;
      const row=clean(payload);
      if(!row||row.deleted||!KNOWN.has('weightKg')||!Object.keys(row).some(k=>KNOWN.has(k)))throw new Error('Format invalide');
      const previous=read().find(x=>x.date===row.date&&!x.deleted);
      if(previous&&!confirm('Un bilan existe deja pour le '+row.date+'. Le remplacer ?'))return;
      row.updatedAt=Date.now();
      if(saveRecord(row)){fill(row);window.showView('bodyMeasurementsView');alert('Bilan du '+row.date+' importe et enregistre !');}
    }catch(e){alert('Import du bilan impossible. Ouvre Mensurations pour le saisir.');}
  };
  fill({date:today()});render();updateHome();makeHashImport();
  // Synchronisation dediee par date. Les donnees restent sous /users/{uid}/apps/mytraining.
  const firebaseApp=getApp('mytraining');
  const auth=getAuth(firebaseApp),db=getFirestore(firebaseApp);
  function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncCloud,900);}
  async function syncCloud(){
    if(!user||!navigator.onLine){cloudStatus='Enregistre localement ; connexion Google necessaire pour synchroniser.';render();return;}
    if(syncing){pending=true;return;}
    syncing=true;cloudStatus='Synchronisation des mensurations…';render();
    try{
      const ref=collection(doc(db,'users',user.uid,'apps','mytraining'),'bodyMeasurements');
      const snapshots=await getDocs(ref);
      const local=new Map(read().map(x=>[x.date,x]));
      const remote=new Map();
      snapshots.forEach(docSnap=>{const x=clean(docSnap.data());if(x&&x.date===docSnap.id)remote.set(x.date,x);});
      const dates=new Set([...local.keys(),...remote.keys()]);
      for(const date of dates){
        const l=local.get(date),r=remote.get(date);
        if(r&&(!l||r.updatedAt>l.updatedAt)){local.set(date,r);continue;}
        if(l&&(!r||l.updatedAt>r.updatedAt))await setDoc(doc(ref,date),l);
      }
      write([...local.values()]);
      cloudStatus='Mensurations synchronisees et privees ✓';
      render();updateHome();
    }catch(e){
      console.warn('My Training mensurations : synchronisation indisponible',e);
      cloudStatus='Enregistre sur ce telephone ; sauvegarde cloud non confirmee.';
      render();
    }finally{syncing=false;if(pending){pending=false;queueSync();}}
  }
  onAuthStateChanged(auth,current=>{
    user=current;
    cloudStatus=user?'Compte Google connecte — synchronisation en cours…':'Enregistre sur cet appareil ; connecte Google depuis Accueil pour synchroniser.';
    render();
    if(user)queueSync();
  });
  window.addEventListener('online',queueSync);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)queueSync();});
})();