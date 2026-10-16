/* My Training v73 — countdown button for timed sets + stronger male motivating voice */
(function(){
  const STORE='mt_timed_set_v65';
  let active=null;
  let tick=null;
  let audioContext=null;
  let endAlertPlayed=false;
  let cachedEnglishVoices=[];

  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function secondsFromTarget(target){
    const t=norm(target).replace(/,/g,'.').trim();
    if(!/(^|\s)(s|sec|secs|seconde|secondes)(\s|$|\/)/.test(t))return 0;
    const nums=(t.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);
    if(!nums.length)return 0;
    return Math.max(...nums);
  }

  function loadActive(){
    try{
      const s=JSON.parse(localStorage.getItem(STORE)||'null');
      if(!s?.end||!Number.isFinite(Number(s.end)))return null;
      return s;
    }catch(e){return null;}
  }

  function persist(){
    try{
      if(active)localStorage.setItem(STORE,JSON.stringify(active));
      else localStorage.removeItem(STORE);
    }catch(e){}
  }

  function getAudioContext(){
    try{
      if(!audioContext){
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC)return null;
        audioContext=new AC({latencyHint:'interactive'});
      }
      return audioContext;
    }catch(e){return null;}
  }

  function primeAudio(){
    const ac=getAudioContext();
    if(ac&&ac.state==='suspended')ac.resume().catch(()=>{});
  }

  function refreshVoices(){
    try{
      cachedEnglishVoices=(window.speechSynthesis?.getVoices?.()||[]).filter(v=>/^en[-_]/i.test(v.lang));
    }catch(e){cachedEnglishVoices=[];}
    return cachedEnglishVoices;
  }

  function englishMaleVoice(){
    const en=refreshVoices();
    const exact=[
      /google uk english male/i,
      /microsoft (guy|david|mark|ryan|george|james|thomas|daniel)/i,
      /\b(male|masculine|man)\b/i,
      /\b(david|mark|guy|ryan|daniel|christopher|eric|brian|matthew|george|james|john|aaron|arthur|oliver|thomas|alex)\b/i
    ];
    for(const re of exact){
      const hit=en.find(v=>re.test(`${v.name} ${v.voiceURI||''}`));
      if(hit)return hit;
    }
    return en.find(v=>/^en-GB/i.test(v.lang)&&!/female|woman/i.test(`${v.name} ${v.voiceURI||''}`)) ||
           en.find(v=>/^en-AU/i.test(v.lang)&&!/female|woman/i.test(`${v.name} ${v.voiceURI||''}`)) ||
           en.find(v=>/^en-US/i.test(v.lang)&&!/female|woman/i.test(`${v.name} ${v.voiceURI||''}`)) ||
           en[0] || null;
  }

  function speakComeOn(){
    try{
      if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return false;
      const speak=()=>{
        const u=new SpeechSynthesisUtterance('Come on!');
        const voice=englishMaleVoice();
        u.lang=voice?.lang||'en-GB';
        u.volume=1;
        u.rate=1.00;
        u.pitch=.44;
        if(voice)u.voice=voice;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      };
      if(!refreshVoices().length){setTimeout(speak,180);}else speak();
      return true;
    }catch(e){return false;}
  }

  try{
    window.speechSynthesis?.addEventListener?.('voiceschanged',refreshVoices);
    refreshVoices();
  }catch(e){}

  function fallbackBeep(){
    const ac=getAudioContext();
    if(!ac)return;
    const play=()=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.type='square';o.frequency.value=1300;
      g.gain.setValueAtTime(.0001,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.34,ac.currentTime+.01);
      g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.22);
      o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.24);
    };
    if(ac.state==='suspended')ac.resume().then(play).catch(()=>{}); else play();
  }

  function motivateEnd(){
    if(navigator.vibrate)navigator.vibrate([180,90,180]);
    if(!speakComeOn())fallbackBeep();
  }

  function key(ei,si){return `${ei}:${si}`;}
  function leftSeconds(){return active?Math.max(0,Math.ceil((Number(active.end)-Date.now())/1000)):0;}

  function format(sec){
    sec=Math.max(0,Math.ceil(sec));
    return sec>=60?`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`:`${sec}s`;
  }

  function updateButtons(){
    document.querySelectorAll('[data-mt-timed-key]').forEach(btn=>{
      const same=!!active&&btn.dataset.mtTimedKey===key(active.ei,active.si);
      if(!same){
        const d=Number(btn.dataset.mtTimedDuration)||0;
        btn.classList.remove('running','finished');
        btn.textContent=`⏱ ${d}s`;
        return;
      }
      const left=leftSeconds();
      btn.classList.toggle('running',left>0);
      btn.classList.toggle('finished',left<=0);
      btn.textContent=left>0?`⏱ ${format(left)} · arrêter`:'✓ Temps fini';
    });
  }

  function finishIfDue(){
    if(!active)return;
    if(leftSeconds()>0){updateButtons();return;}
    clearInterval(tick);tick=null;
    if(!endAlertPlayed){endAlertPlayed=true;motivateEnd();}
    updateButtons();
    setTimeout(()=>{
      if(active&&leftSeconds()<=0){active=null;persist();updateButtons();}
    },3500);
  }

  function startTicker(){
    clearInterval(tick);
    tick=setInterval(finishIfDue,200);
    finishIfDue();
  }

  function startTimed(ei,si,duration){
    primeAudio();
    const k=key(ei,si);
    if(active&&key(active.ei,active.si)===k&&leftSeconds()>0){
      active=null;endAlertPlayed=false;persist();clearInterval(tick);tick=null;updateButtons();
      return;
    }
    active={ei,si,duration,end:Date.now()+duration*1000,workoutStarted:state.activeWorkout?.started||null};
    endAlertPlayed=false;persist();startTicker();updateButtons();
  }

  function attachTimedButtons(){
    const w=state.activeWorkout;
    if(!w)return;
    document.querySelectorAll('#exerciseList .set-row').forEach(row=>{
      const ei=Number(row.dataset.e),si=Number(row.dataset.s);
      const s=w.exercises?.[ei]?.sets?.[si];
      if(!s)return;
      const duration=secondsFromTarget(s.targetReps);
      if(!duration)return;
      if(row.nextElementSibling?.classList?.contains('mt-timed-row'))return;

      const wrap=document.createElement('div');
      wrap.className='mt-timed-row';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='secondary mt-timed-btn';
      btn.dataset.mtTimedKey=key(ei,si);
      btn.dataset.mtTimedDuration=String(duration);
      btn.textContent=`⏱ ${duration}s`;
      btn.setAttribute('aria-label',`Lancer le chrono de ${duration} secondes pour cette série`);
      btn.onclick=()=>startTimed(ei,si,duration);
      wrap.appendChild(btn);
      row.insertAdjacentElement('afterend',wrap);
    });
    updateButtons();
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-timed-row{display:flex;justify-content:flex-end;margin:5px 0 2px;padding-left:34px}
    .mt-timed-btn{min-width:118px;padding:8px 11px;font-size:12px;border:1px solid rgba(96,165,250,.45)}
    .mt-timed-btn.running{background:#2563eb;color:#fff;box-shadow:0 0 0 2px rgba(59,130,246,.12)}
    .mt-timed-btn.finished{background:var(--accent,#22c55e);color:#05200d}
    .mt-exercise-locked .mt-timed-btn{pointer-events:none;opacity:.55}
  `;
  document.head.appendChild(style);

  document.addEventListener('pointerdown',primeAudio,{capture:true});
  document.addEventListener('keydown',primeAudio,{capture:true});

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){
      previousRender();
      attachTimedButtons();
    };
    window.renderWorkout=renderWorkout;
  }

  function restore(){
    const stored=loadActive();
    if(stored){
      if(state.activeWorkout&&(!stored.workoutStarted||stored.workoutStarted===state.activeWorkout.started)){
        active=stored;
        endAlertPlayed=false;
        startTicker();
      }else{
        localStorage.removeItem(STORE);
      }
    }
    attachTimedButtons();
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      primeAudio();
      finishIfDue();
      attachTimedButtons();
    }else persist();
  });
  window.addEventListener('pagehide',persist);

  setTimeout(restore,0);
})();
