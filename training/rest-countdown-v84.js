/* My Training — un bip à 3, 2 et 1 s, puis deux bips à la fin du repos.
   Réutilise le chrono existant ; n'ajoute aucun minuteur parallèle. */
(function(){
  'use strict';

  let audio=null;
  let observedEnd=Number(timer.end)||0;
  const announced=new Set();

  function context(){
    try{
      if(!audio){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return null;
        audio=new Audio({latencyHint:'interactive'});
      }
      return audio;
    }catch(e){return null;}
  }

  function prime(){
    const ac=context();
    if(ac?.state==='suspended')ac.resume().catch(()=>{});
  }

  function tone(ac,when,frequency,duration,volume){
    const oscillator=ac.createOscillator();
    const gain=ac.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(frequency,when);
    gain.gain.setValueAtTime(.0001,when);
    gain.gain.exponentialRampToValueAtTime(volume,when+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    oscillator.connect(gain);gain.connect(ac.destination);
    oscillator.start(when);oscillator.stop(when+duration+.01);
  }

  function play(count,final=false){
    const ac=context();
    if(!ac)return;
    const schedule=()=>{
      const now=ac.currentTime+.02;
      for(let i=0;i<count;i++){
        tone(ac,now+i*(final?0.26:0.20),final?1120:870,final?0.17:0.10,final?0.22:0.13);
      }
    };
    if(ac.state==='suspended')ac.resume().then(schedule).catch(()=>{});
    else schedule();
  }

  function finishDoubleBip(){
    if(navigator.vibrate)navigator.vibrate([120,85,120]);
    play(2,true);
  }

  // L'ancien signal à trois bips est entièrement remplacé.
  buzz=finishDoubleBip;
  window.buzz=finishDoubleBip;

  if(typeof timerRender==='function'){
    const previousRender=timerRender;
    timerRender=function(){
      if(timer.running){
        if(Number(timer.end)!==observedEnd){
          observedEnd=Number(timer.end);
          announced.clear();
        }
        const left=Math.ceil((timer.end-Date.now())/1000);
        if(left>=1&&left<=3&&!announced.has(left)){
          announced.add(left);
          play(1);
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
      return result;
    };
    window.startTimer=startTimer;
  }

  document.addEventListener('pointerdown',prime,{capture:true});
  document.addEventListener('keydown',prime,{capture:true});
})();
