/* My Training v68 — spoken rest alert, headphone routing, and top progress bar */
(function(){
  const REST_STORE='mt_rest_timer_v63';
  let restTotalSeconds=0;
  let restAudioContext=null;
  let lastRunning=false;

  function ensureProgress(){
    let shell=document.getElementById('mtRestProgress');
    if(shell)return shell;
    shell=document.createElement('div');
    shell.id='mtRestProgress';
    shell.className='mt-rest-progress hidden';
    shell.setAttribute('aria-live','polite');
    shell.innerHTML='<div class="mt-rest-progress-track"><div class="mt-rest-progress-fill"></div></div><div class="mt-rest-progress-label"></div>';
    document.body.appendChild(shell);
    return shell;
  }

  function getAudioContext(){
    try{
      if(!restAudioContext){
        const AudioCtx=window.AudioContext||window.webkitAudioContext;
        if(!AudioCtx)return null;
        restAudioContext=new AudioCtx({latencyHint:'interactive'});
      }
      return restAudioContext;
    }catch(e){return null;}
  }

  function primeAudio(){
    const ac=getAudioContext();
    if(ac&&ac.state==='suspended')ac.resume().catch(()=>{});
  }

  function englishVoice(){
    try{
      const voices=window.speechSynthesis?.getVoices?.()||[];
      return voices.find(v=>/^en[-_]/i.test(v.lang)&&/google|samsung|microsoft/i.test(v.name)) ||
             voices.find(v=>/^en[-_]/i.test(v.lang)) || null;
    }catch(e){return null;}
  }

  function speakLetsGo(){
    try{
      if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return false;
      const u=new SpeechSynthesisUtterance("Let's go!");
      u.lang='en-US';
      u.volume=1;
      u.rate=1.16;
      u.pitch=1.04;
      const voice=englishVoice();
      if(voice)u.voice=voice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return true;
    }catch(e){return false;}
  }

  function playFallbackBeep(){
    const ac=getAudioContext();
    if(!ac)return;
    const play=()=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.type='square';o.frequency.value=1240;
      g.gain.setValueAtTime(.0001,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.34,ac.currentTime+.01);
      g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.25);
      o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.27);
    };
    if(ac.state==='suspended')ac.resume().then(play).catch(()=>{}); else play();
  }

  function restLeft(){
    return timer.running?Math.max(0,(timer.end-Date.now())/1000):Math.max(0,Number(timer.remaining)||0);
  }

  function persistRest(){
    try{
      if(timer.running&&timer.end>Date.now()){
        localStorage.setItem(REST_STORE,JSON.stringify({end:timer.end,total:restTotalSeconds||Math.ceil(restLeft()),running:true}));
      }else{
        localStorage.removeItem(REST_STORE);
      }
    }catch(e){}
  }

  function updateProgress(){
    const shell=ensureProgress();
    const fill=shell.querySelector('.mt-rest-progress-fill');
    const label=shell.querySelector('.mt-rest-progress-label');
    const left=restLeft();

    if(timer.running&&left>0){
      if(!restTotalSeconds)restTotalSeconds=Math.max(1,Math.ceil(left));
      const pct=Math.max(0,Math.min(100,(left/restTotalSeconds)*100));
      shell.classList.remove('hidden');
      shell.classList.toggle('urgent',left<=10);
      fill.style.transform=`scaleX(${pct/100})`;
      label.textContent=`Repos ${timeFmt(Math.ceil(left))}`;
      persistRest();
      lastRunning=true;
    }else{
      shell.classList.add('hidden');
      shell.classList.remove('urgent');
      fill.style.transform='scaleX(0)';
      label.textContent='';
      if(lastRunning)persistRest();
      lastRunning=false;
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-rest-progress{position:fixed;top:0;left:0;right:0;z-index:9999;height:8px;pointer-events:none;background:rgba(2,6,23,.74);box-shadow:0 1px 8px rgba(0,0,0,.35)}
    .mt-rest-progress-track{position:absolute;inset:0;overflow:hidden}
    .mt-rest-progress-fill{height:100%;width:100%;transform-origin:left center;transform:scaleX(1);background:var(--accent,#22c55e);transition:transform .22s linear}
    .mt-rest-progress-label{position:absolute;top:9px;left:50%;transform:translateX(-50%);padding:3px 8px;border-radius:999px;background:rgba(8,14,25,.92);border:1px solid var(--line,#26344c);color:var(--text,#f8fafc);font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.28)}
    .mt-rest-progress.urgent .mt-rest-progress-fill{background:var(--danger,#ef4444)}
    .mt-rest-progress.hidden{display:none!important}
  `;
  document.head.appendChild(style);

  document.addEventListener('pointerdown',primeAudio,{capture:true});
  document.addEventListener('keydown',primeAudio,{capture:true});

  if(typeof buzz==='function'){
    buzz=function(){
      if(navigator.vibrate)navigator.vibrate([220,90,220]);
      if(!speakLetsGo())playFallbackBeep();
    };
    window.buzz=buzz;
  }

  if(typeof startTimer==='function'){
    const previousStartTimer=startTimer;
    startTimer=function(sec){
      restTotalSeconds=Math.max(1,Number(sec)||1);
      primeAudio();
      const result=previousStartTimer(sec);
      persistRest();
      updateProgress();
      return result;
    };
    window.startTimer=startTimer;
  }

  if(typeof timerRender==='function'){
    const previousTimerRender=timerRender;
    timerRender=function(){
      previousTimerRender();
      updateProgress();
    };
    window.timerRender=timerRender;
  }

  function restoreRestTimer(){
    if(!state.activeWorkout)return;
    try{
      const saved=JSON.parse(localStorage.getItem(REST_STORE)||'null');
      if(!saved?.running||!saved.end||saved.end<=Date.now()){
        localStorage.removeItem(REST_STORE);
        updateProgress();
        return;
      }
      restTotalSeconds=Math.max(1,Number(saved.total)||Math.ceil((saved.end-Date.now())/1000));
      timer.end=Number(saved.end);
      timer.remaining=Math.max(0,Math.ceil((timer.end-Date.now())/1000));
      timer.running=true;
      clearInterval(timer.interval);
      timer.interval=setInterval(timerRender,250);
      timerRender();
    }catch(e){updateProgress();}
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')persistRest();
    else {primeAudio();updateProgress();}
  });
  window.addEventListener('pagehide',persistRest);

  ensureProgress();
  restoreRestTimer();
})();
