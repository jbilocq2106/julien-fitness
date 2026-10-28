/* My Training — repos : 3, 2, 1 puis double bip.
   Les sons sont programmés dans l'horloge audio dès le départ du repos :
   un setInterval ralenti par Android n'est plus nécessaire pour les produire.
   L'OS peut malgré tout suspendre l'audio des PWA écran fermé. */
(function(){
  'use strict';

  let audio=null, output=null;
  let observedEnd=Number(timer.end)||0;
  let scheduledEnd=0;
  let scheduledOscillators=[];
  const announced=new Set();

  function context(){
    try {
      if(!audio){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return null;
        audio=new Audio({latencyHint:'interactive'});
        output=audio.createDynamicsCompressor();
        output.threshold.value=-12;
        output.knee.value=3;
        output.ratio.value=8;
        output.attack.value=.003;
        output.release.value=.14;
        output.connect(audio.destination);
      }
      return audio;
    }catch(e){return null;}
  }

  function prime(){
    const ac=context();
    if(ac&&ac.state==='suspended')ac.resume().catch(()=>{});
  }

  function tone(ac,when,frequency,duration,track=false){
    [
      {type:'square',hz:frequency,level:.37},
      {type:'sine',hz:frequency*1.52,level:.16}
    ].forEach(part=>{
      const oscillator=ac.createOscillator();
      const gain=ac.createGain();
      oscillator.type=part.type;
      oscillator.frequency.setValueAtTime(part.hz,when);
      gain.gain.setValueAtTime(.0001,when);
      gain.gain.exponentialRampToValueAtTime(part.level,when+.009);
      gain.gain.setValueAtTime(part.level,when+duration-.055);
      gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
      oscillator.connect(gain);
      gain.connect(output||ac.destination);
      oscillator.start(when);
      oscillator.stop(when+duration+.01);
      if(track)scheduledOscillators.push(oscillator);
      oscillator.addEventListener('ended',()=>{try{oscillator.disconnect();gain.disconnect();}catch(e){}},{once:true});
    });
  }

  function cancelScheduled(){
    scheduledOscillators.forEach(node=>{
      try{node.stop();}catch(e){}
      try{node.disconnect();}catch(e){}
    });
    scheduledOscillators=[];
    scheduledEnd=0;
  }

  function scheduleRestCues(){
    cancelScheduled();
    if(!timer.running)return;
    const ac=context();
    const end=Number(timer.end);
    if(!ac||!Number.isFinite(end))return;
    const secondsUntilEnd=(end-Date.now())/1000;
    if(secondsUntilEnd<=.03)return;

    const base=ac.currentTime+.03;
    [3,2,1].forEach(secondsLeft=>{
      const delay=secondsUntilEnd-secondsLeft;
      if(delay<0)return;
      const frequency=1040+(3-secondsLeft)*190;
      tone(ac,base+delay,frequency,.18,true);
    });
    for(let i=0;i<2;i++){
      tone(ac,base+secondsUntilEnd+i*.33,1510+i*110,.27,true);
    }
    scheduledEnd=end;
    prime();
  }

  function play(count,final=false,secondsLeft=3){
    const ac=context();
    if(!ac)return;
    const doPlay=()=>{
      const now=ac.currentTime+.025;
      for(let i=0;i<count;i++){
        const frequency=final?1510+i*110:1040+(3-secondsLeft)*190;
        tone(ac,now+i*(final?.33:.23),frequency,final?.27:.18);
      }
    };
    if(ac.state==='suspended')ac.resume().then(doPlay).catch(()=>{});
    else doPlay();
  }

  function finishDoubleBip(){
    if(navigator.vibrate)navigator.vibrate([175,95,175,95,175]);
    // Le double bip est déjà programmé dans l'horloge audio, sans attendre le JS.
    if(scheduledEnd===Number(timer.end)&&audio?.state==='running')return;
    play(2,true);
  }

  buzz=finishDoubleBip;
  window.buzz=finishDoubleBip;

  if(typeof timerRender==='function'){
    const previousRender=timerRender;
    timerRender=function(){
      if(timer.running){
        if(Number(timer.end)!==observedEnd){
          observedEnd=Number(timer.end);
          announced.clear();
          scheduleRestCues();
        }
        const left=Math.ceil((timer.end-Date.now())/1000);
        if(left>=1&&left<=3&&!announced.has(left)){
          announced.add(left);
          // Secours seulement si la programmation audio n'est pas active.
          if(scheduledEnd!==Number(timer.end))play(1,false,left);
        }
      }
      return previousRender();
    };
    window.timerRender=timerRender;
  }

  if(typeof startTimer==='function'){
    const previousStart=startTimer;
    startTimer=function(seconds){
      announced.clear();
      const result=previousStart(seconds);
      observedEnd=Number(timer.end)||0;
      if(timer.running&&scheduledEnd!==observedEnd)scheduleRestCues();
      return result;
    };
    window.startTimer=startTimer;
  }

  // L'arrêt manuel annule les bips futurs ; +15/-15 relancent le planning.
  document.getElementById('timerToggle')?.addEventListener('click',()=>{
    if(!timer.running)cancelScheduled();
  });

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible')return;
    if(!timer.running)return;
    if(Number(timer.end)>Date.now()){
      // Recalage si le navigateur a suspendu le contexte en arrière-plan.
      prime();
      scheduleRestCues();
    }else{
      cancelScheduled();
      timerRender();
    }
  });

  const actions=document.querySelector('#timerDock .timer-actions');
  if(actions&&!document.getElementById('mtTestRestSound')){
    const button=document.createElement('button');
    button.id='mtTestRestSound';
    button.type='button';
    button.textContent='🔊 Test';
    button.title='Tester le double bip de fin';
    button.setAttribute('aria-label','Tester le son de fin du chronomètre');
    button.addEventListener('click',()=>{prime();play(2,true);if(navigator.vibrate)navigator.vibrate([175,95,175]);});
    actions.appendChild(button);
  }

  document.addEventListener('pointerdown',prime,{capture:true});
  document.addEventListener('keydown',prime,{capture:true});
  if(timer.running&&Number(timer.end)>Date.now())scheduleRestCues();
})();