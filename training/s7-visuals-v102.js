/* MyTraining S7 — illustrations originales et préparation maison.
   Aucun historique ni programme S1-S6 modifié. Images SVG autonomes, hors connexion. */
(function(){
  'use strict';
  const DETAILS={
    "Curl biceps élastique — prise supination":{key:'curl',short:'Curl supination',step:'1',cues:['Élastique sous les pieds, paumes vers le haut.','Coudes fixes, descente lente de 2 secondes.']},
    "Pushdown triceps à l'élastique (ancrage haut)":{key:'pushdown',short:'Pushdown triceps',step:'2',cues:['Ancre l’élastique en hauteur, point fixe solide.','Garde les coudes contre le corps.']},
    "Curl biceps aux sangles de suspension":{key:'suspCurl',short:'Curl aux sangles',step:'1',cues:['Corps gainé, pieds bien stables.','Fléchis les coudes vers le front, sans tirer avec le dos.']},
    "Pompes serrées (mains largeur d'épaules)":{key:'pushup',short:'Pompes serrées',step:'2',cues:['Mains à la largeur des épaules, coudes près du buste.','Réduis l’amplitude ou surélève les mains si besoin.']},
    "Curl marteau à l'élastique":{key:'hammer',short:'Curl marteau',step:'1',cues:['Garde les paumes face à face.','Pas d’élan avec le dos ni de mouvement d’épaule.']},
    "Kickback triceps à l'élastique":{key:'kickback',short:'Kickback triceps',step:'2',cues:['Buste légèrement incliné et dos neutre.','Coude immobile, étends le bras vers l’arrière.']},
    "Rowing aux sangles de suspension":{key:'row',short:'Rowing sangles',step:'',cues:['Tire la poitrine vers les poignées.','Reste gainé, rapproche les omoplates.']},
    "Roue abdominale à genoux":{key:'wheel',short:'Roue abdominale',step:'',cues:['Commence à genoux avec une petite amplitude.','Reviens avant que les lombaires se creusent.']}
  };
  const SS={
    A:{title:'Superset A',rounds:3,rest:'30 s',description:'Curl supination → Pushdown triceps'},
    B:{title:'Superset B',rounds:3,rest:'35 s',description:'Curl aux sangles → Pompes serrées'},
    C:{title:'Superset C',rounds:2,rest:'25 s',description:'Curl marteau → Kickback triceps'}
  };
  const blue='#48b4ff',yellow='#f2c46c',red='#fb7185',skin='#e9b98c',light='#e2e8f0';
  const path=(d,color=light,w=9)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
  const circ=(x,y,r,fill)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"/>';
  function front(x,pose){
    const head=circ(x,97,21,skin);
    const torso='<path d="M'+(x-38)+' 125 Q'+x+' 113 '+(x+38)+' 125 L'+(x+31)+' 209 Q'+x+' 222 '+(x-31)+' 209 Z" fill="#2563a6" stroke="#82caff" stroke-width="3"/>';
    const legs=path('M'+(x-20)+' 211 L'+(x-21)+' 260 L'+(x-31)+' 295',light,11)+path('M'+(x+20)+' 211 L'+(x+21)+' 260 L'+(x+31)+' 295',light,11);
    let arms='',band='';
    if(pose==='curl0'||pose==='curl1'||pose==='hammer0'||pose==='hammer1'){
      const up=pose.endsWith('1');
      const a=up?137:241;
      arms=path('M'+(x-37)+' 139 L'+(x-65)+' 180 L'+(x-67)+' '+a,skin,13)+path('M'+(x+37)+' 139 L'+(x+65)+' 180 L'+(x+67)+' '+a,skin,13);
      band=path('M'+(x-29)+' 294 L'+(x-67)+' '+a,red,4)+path('M'+(x+29)+' 294 L'+(x+67)+' '+a,red,4);
    }else if(pose==='pushdown0'||pose==='pushdown1'){
      const low=pose.endsWith('1'), y=low?225:145;
      arms=path('M'+(x-37)+' 140 L'+(x-53)+' 173 L'+(x-52)+' '+y,skin,13)+path('M'+(x+37)+' 140 L'+(x+53)+' 173 L'+(x+52)+' '+y,skin,13);
      band=path('M'+x+' 58 L'+(x-52)+' '+y,red,4)+path('M'+x+' 58 L'+(x+52)+' '+y,red,4)+circ(x,55,8,yellow);
    }
    return legs+torso+head+arms+band;
  }
  function side(x,pose){
    const end=pose.endsWith('1');
    const key=pose.slice(0,-1);
    if(key==='pushup'){
      const y=end?220:172;
      return path('M'+(x-133)+' 271 L'+(x+125)+' 271','#7d97b6',3)+
        path('M'+(x-116)+' '+(y+48)+' L'+(x-35)+' '+(y+20)+' L'+(x+60)+' '+y,light,16)+
        circ(x+86,y-14,19,skin)+
        path('M'+(x+50)+' '+(y+1)+' L'+(x+77)+' 268',skin,10)+
        path('M'+(x+17)+' '+(y+14)+' L'+(x+35)+' 268',skin,10);
    }
    if(key==='wheel'){
      const reach=end?x+104:x+46;
      return circ(x+112,280,22,'#263f59')+circ(x+112,280,10,blue)+
        path('M'+(x-125)+' 281 L'+(x-67)+' 281 L'+(x-42)+' 229',light,13)+
        path('M'+(x-41)+' 227 L'+(x+5)+' 169 L'+reach+' 265',light,13)+
        circ(x+22,144,19,skin)+path('M'+(x+5)+' 183 L'+reach+' 277',skin,10);
    }
    if(key==='kickback'){
      const armEnd=end?x+135:x+46;
      return path('M'+(x-110)+' 274 L'+(x-78)+' 214 L'+(x-40)+' 218',light,13)+
        path('M'+(x-65)+' 210 L'+(x+28)+' 156','#2563a6',25)+circ(x+53,133,20,skin)+
        path('M'+(x+13)+' 166 L'+(x+42)+' 198 L'+armEnd+' '+(end?155:240),skin,12)+
        path('M'+(x-115)+' 283 L'+armEnd+' '+(end?155:240),red,4);
    }
    const isCurl=key==='suspCurl';
    const shoulders=x+12,headx=x+40;
    const handX=end?(isCurl?x+42:x+6):(isCurl?x+96:x+91);
    const handY=end?(isCurl?147:165):199;
    return path('M'+(x-118)+' 288 L'+(x-42)+' 226 L'+shoulders+' 167',light,15)+
      '<path d="M'+(x-44)+' 228 L'+(x+9)+' 155" stroke="#2563a6" stroke-width="27" stroke-linecap="round"/>'+
      circ(headx,137,20,skin)+
      path('M'+shoulders+' 172 L'+(x+33)+' 196 L'+handX+' '+handY,skin,12)+
      path('M'+(x+126)+' 60 L'+handX+' '+handY,yellow,5)+
      circ(x+126,55,7,yellow);
  }
  function graphic(key){
    const pict=(x,end)=>['curl','hammer','pushdown'].includes(key)
      ?front(x,key+(end?'1':'0')):side(x,key+(end?'1':'0'));
    const caption={curl:'BICEPS • ÉLASTIQUE',pushdown:'TRICEPS • ÉLASTIQUE',suspCurl:'BICEPS • SANGLES',pushup:'TRICEPS • POIDS DU CORPS',hammer:'BRACHIAL • ÉLASTIQUE',kickback:'TRICEPS • ÉLASTIQUE',row:'DOS • SANGLES',wheel:'ABDOMINAUX • ROUE'}[key]||'MAISON';
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" aria-label="Illustration du mouvement : départ à gauche, arrivée à droite">'
      +'<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#172b46"/><stop offset="1" stop-color="#081726"/></linearGradient></defs>'
      +'<rect width="720" height="360" rx="22" fill="url(#bg)"/>'
      +'<rect x="14" y="14" width="337" height="331" rx="18" fill="#1b3651" opacity=".50"/>'
      +'<rect x="367" y="14" width="339" height="331" rx="18" fill="#13304a" opacity=".65"/>'
      +'<path d="M360 32 V328" stroke="#476988" stroke-dasharray="6 9" opacity=".8"/>'
      +'<text x="30" y="40" fill="#d5ecff" font-size="17" font-family="Arial,sans-serif" font-weight="bold">DÉPART</text>'
      +'<text x="384" y="40" fill="#c9f6d3" font-size="17" font-family="Arial,sans-serif" font-weight="bold">CONTRACTION</text>'
      +'<path d="M30 305 H333 M387 305 H688" stroke="#50718e" stroke-width="2"/>'
      +pict(172,false)+pict(530,true)
      +'<text x="360" y="340" text-anchor="middle" fill="#a5c9eb" font-size="16" font-family="Arial,sans-serif">'+caption+'</text>'
      +'</svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  const PHOTO_FOLDERS={
    curl:'Close-Grip_EZ-Bar_Curl_with_Band',
    pushdown:'Triceps_Pushdown_-_Rope_Attachment',
    suspCurl:'Standing_Biceps_Cable_Curl',
    pushup:'Push-Ups_-_Close_Triceps_Position',
    hammer:'Hammer_Curls',
    kickback:'Tricep_Dumbbell_Kickback',
    row:'Suspended_Row',
    wheel:'Ab_Roller'
  };
  const photoSrc=(key,index)=>'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'+PHOTO_FOLDERS[key]+'/'+index+'.jpg';
  // Photographies libres de droits Free Exercise DB.
  // Pour quatre variantes avec élastiques/sangles, le support photographié peut différer ;
  // les consignes du programme restent celles du matériel réel de l'utilisateur.
  const IMAGES={};
  Object.values(DETAILS).forEach(v=>{IMAGES[v.key]=graphic(v.key);});
  function imgEl(name,cls){
    const detail=DETAILS[name];
    if(!detail)return null;
    const pair=document.createElement('div');
    pair.className=cls+' mt-s7-photo-pair';
    pair.setAttribute('role','img');
    pair.setAttribute('aria-label','Photos du mouvement '+detail.short+' : début et fin');
    const count=cls==='mt-s7-thumb'?1:2;
    for(let i=0;i<count;i++){
      const photo=document.createElement('img');
      photo.className='mt-s7-photo';
      photo.src=photoSrc(detail.key,i);
      photo.alt=detail.short+(i===0?' : position de départ':' : position contractée');
      photo.loading='lazy';
      photo.decoding='async';
      photo.referrerPolicy='no-referrer';
      photo.onerror=()=>{
        photo.onerror=null;
        photo.src=IMAGES[detail.key]; // Schéma de secours si la photo est bloquée.
      };
      pair.appendChild(photo);
    }
    return pair;
  }
  function supersetGuide(group){
    const s=SS[group];
    const div=document.createElement('div');
    div.className='mt-s7-ss-guide';
    div.innerHTML='<strong>SS '+group+' · '+s.rounds+' tours</strong><span>'+s.description+'</span><small>Enchaîner les deux exercices, puis '+s.rest+' de repos</small>';
    return div;
  }
  function prep(){
    let card=document.querySelector('#mtS7Prep');
    if(card)return;
    const trigger=document.querySelector('#homeView .special-workout-card button[onclick*="S7"]')?.closest('.special-workout-card');
    if(!trigger)return;
    card=document.createElement('details');
    card.id='mtS7Prep';
    card.className='card mt-s7-preparation';
    card.innerHTML='<summary>Avant la séance : préparer le matériel <span>▾</span></summary>'
      +'<div class="mt-s7-prep-description">Vérifie ces éléments avant les supersets : zéro déplacement inutile pendant les 30 minutes.</div>'
      +'<div id="mtS7PrepChecklist"></div><p class="mt-s7-prep-hint">Matériel : élastiques, ancrage haut sécurisé, sangles, tapis et roue.</p>';
    trigger.insertAdjacentElement('afterend',card);
    const things=[
      'Deux résistances d’élastiques à portée de main',
      'Point d’ancrage haut solide, élastique inspecté',
      'Sangles solidement fixées, testées sous tension progressive',
      'Tapis et roue abdominale installés',
      'Eau et téléphone avec MyTraining prêts'
    ];
    const box=card.querySelector('#mtS7PrepChecklist');
    things.forEach((item,i)=>{
      const label=document.createElement('label');
      label.className='mt-s7-check';
      const input=document.createElement('input');
      input.type='checkbox';
      input.checked=false;
      input.onchange=()=>{label.classList.toggle('checked',input.checked);};
      label.appendChild(input);
      const span=document.createElement('span');span.textContent=item;label.appendChild(span);
      box.appendChild(label);
    });
  }
  function decorateProgram(){
    if(!state.program?.sessions)return;
    const i=state.program.sessions.findIndex(s=>s.id==='S7');
    const card=document.querySelectorAll('#programCards .session-card')[i];
    const s=state.program.sessions[i];
    if(!card||!s)return;
    const rows=card.querySelectorAll('.program-exercise-row');
    rows.forEach((row,j)=>{
      const e=s.exercises[j];
      if(!e||row.querySelector('.mt-s7-thumb'))return;
      const pic=imgEl(e.name,'mt-s7-thumb');
      if(pic){
        row.querySelector('.video-mini')?.classList.add('mt-s7-hidden');
        row.insertBefore(pic,row.firstChild);
        row.classList.add('mt-s7-program-row');
      }
      if(e.superset){
        const badge=document.createElement('span');
        badge.className='mt-s7-pair-step';
        badge.textContent='SS '+e.superset+' · '+(DETAILS[e.name]?.step||'');
        row.querySelector('.program-exercise-main')?.appendChild(badge);
        if(j===0||s.exercises[j-1]?.superset!==e.superset)
          row.before(supersetGuide(e.superset));
      }
    });
    if(!card.querySelector('.mt-s7-photo-credit')){
      const credit=document.createElement('div');
      credit.className='mt-s7-photo-credit';
      credit.textContent='Photos : Free Exercise DB (domaine public). Pour les variantes à l’élastique ou aux sangles, le matériel photographié peut différer : suis les consignes de MyTraining.';
      card.appendChild(credit);
    }
    prep();
  }
  let overlay=null;
  function showFullImage(name){
    const d=DETAILS[name];
    if(!d)return;
    if(!overlay){
      overlay=document.createElement('div');
      overlay.className='mt-s7-fullscreen';
      overlay.id='mtS7Fullscreen';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-label','Illustration de l’exercice');
      overlay.innerHTML='<div class="mt-s7-overlay-card"><button class="mt-s7-close" type="button" aria-label="Fermer l’image">Fermer ×</button><h3></h3><div class="mt-s7-big-img"></div><ul></ul></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('.mt-s7-close').onclick=()=>overlay.classList.remove('open');
      overlay.onclick=e=>{if(e.target===overlay)overlay.classList.remove('open');};
      document.addEventListener('keydown',e=>{if(e.key==='Escape')overlay.classList.remove('open');});
    }
    overlay.querySelector('h3').textContent=d.short;
    const area=overlay.querySelector('.mt-s7-big-img');
    area.replaceChildren(imgEl(name,'mt-s7-image-expanded'));
    const ul=overlay.querySelector('ul');ul.replaceChildren();
    d.cues.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.appendChild(li)});
    overlay.classList.add('open');
    overlay.querySelector('.mt-s7-close').focus();
  }
  function decorateWorkout(){
    const w=state.activeWorkout;
    if(!w||w.id!=='S7')return;
    const cards=document.querySelectorAll('#exerciseList .exercise');
    w.exercises.forEach((e,i)=>{
      const card=cards[i],d=DETAILS[e.name];
      if(!card||!d||card.querySelector('.mt-s7-workout-image'))return;
      const holder=document.createElement('div');
      holder.className='mt-s7-workout-image';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='mt-s7-photo-button';
      btn.setAttribute('aria-label','Agrandir le mouvement '+d.short);
      btn.appendChild(imgEl(e.name,'mt-s7-workout-photo'));
      const expand=document.createElement('span');expand.textContent='Agrandir l’image ↗';btn.appendChild(expand);
      btn.onclick=()=>showFullImage(e.name);
      holder.appendChild(btn);
      const description=document.createElement('div');
      description.className='mt-s7-cues';
      description.textContent=d.cues.join(' • ');
      holder.appendChild(description);
      const header=card.querySelector('.exercise-title-row');
      if(header)header.insertAdjacentElement('afterend',holder);else card.prepend(holder);
      if(e.superset){
        const label=document.createElement('div');
        label.className='mt-s7-active-pair';
        const pair=SS[e.superset];
        label.textContent='SS '+e.superset+' · exercice '+(d.step||'')+'/2 — '+pair.description+(d.step==='2'?' · repos '+pair.rest+' ensuite':' · enchaîner sans repos');
        holder.insertAdjacentElement('beforebegin',label);
      }
    });
  }
  if(typeof renderProgram==='function'){
    const old=renderProgram;
    renderProgram=function(){const result=old.apply(this,arguments);decorateProgram();return result;};
    window.renderProgram=renderProgram;
  }
  if(typeof renderWorkout==='function'){
    const old=renderWorkout;
    renderWorkout=function(){const result=old.apply(this,arguments);decorateWorkout();return result;};
    window.renderWorkout=renderWorkout;
  }
  if(state.program)decorateProgram();
  if(state.activeWorkout)decorateWorkout();
  prep();
})();