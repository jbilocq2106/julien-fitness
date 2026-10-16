/* My Training v65 — countdown button for timed sets + strong triple beep */
(function(){
  const STORE='mt_timed_set_v65';
  let active=null;
  let tick=null;
  let audioContext=null;
  let endAlertPlayed=false;

  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function secondsFromTarget(target){
    const t=norm(target).replace(/,/g,'.').trim();
    // Timed sets are written like "20–30 s", "30 sec", "45 secondes".
    if(!/(^|\s)(s|sec|secs|seconde|secondes)(\s|$|\/)/.test(t))return 0;
    const nums=(t.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);
    if(!nums.length)return 0;
    // For a range such as 20–30 s, use the requested upper target (30 s).
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

  function tripleBeep(){
    const ac=getAudioContext();
    if(!ac)return;
    const play=()=>{
      const comp=ac.createDynamicsCompressor();
      comp.threshold.value=-20;
      comp.knee.value=8;
      comp.ratio.value=10;
      comp.attack.value=.002;
      comp.release.value=.12;
      const master=ac.createGain();
      master.gain.value=.82;
      master.connect(comp);comp.connect(ac.destination);

      const beep=(when)=>{
        const env=ac.createGain();
        env.gain.setValueAtTime(.0001,when);
        env.gain.exponentialRampToValueAtTime(.58,when+.01);
        env.gain.setValueAtTime(.58,when+.16);
        env.gain.exponentialRampToValueAtTime(.0001,when+.28);
        env.connect(master);

        const o1=ac.createOscillator();
        o1.type='square';o1.frequency.setValueAtTime(1260,when);
        o1.connect(env);o1.start(when);o1.stop(when+.29);

        const o2=ac.createOscillator(),g2=ac.createGain();
        o2.type='sine';o2.frequency.setValueAtTime(1880,when);g2.gain.value=.34;
        o2.connect(g2);g2.connect(env);o2.start(when);o2.stop(when+.29);
      };
      const t=ac.currentTime+.02;
      beep(t);beep(t+.36);beep(t+.72);
      setTimeout(()=>{try{master.disconnect();comp.disconnect();}catch(e){}},1400);
    };
    if(ac.state==='suspended')ac.resume().then(play).catch(()=>{}); else play();
    if(navigator.vibrate)navigator.vibrate([180,90,180,90,180]);
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
    if(!endAlertPlayed){endAlertPlayed=true;tripleBeep();}
    updateButtons();
    // Keep the finished state briefly so the user sees which set ended.
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
      // Second tap stops the current exercise timer without touching workout data.
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
      // Do not restore a timer from another completed/replaced workout.
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
