/* My Training — alertes audibles avec la musique : 3, 2, 1, puis double bip.
   Conserve le chrono et toutes les données de séance existants. */
(function(){
  'use strict';

  let audio=null;
  let output=null;
  let observedEnd=Number(timer.end)||0;
  const announced=new Set();

  function context(){
    try{
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

  function tone(ac,when,frequency,duration){
    // Deux composantes harmoniques et une attaque franche traversent mieux la musique.
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
    });
  }

  function play(count,final=false,secondsLeft=3){
    const ac=context();
    if(!ac)return;
    const schedule=()=>{
      const now=ac.currentTime+.025;
      for(let i=0;i<count;i++){
        const frequency=final?1510+i*110:1040+(3-secondsLeft)*190;
        tone(ac,now+i*(final?.33:.23),frequency,final?.27:.18);
      }
    };
    if(ac.state==='suspended')ac.resume().then(schedule).catch(()=>{});
    else schedule();
  }

  function finishDoubleBip(){
    if(navigator.vibrate)navigator.vibrate([175,95,175,95,175]);
    play(2,true);
  }

  // Remplace le signal précédent sans le superposer.
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
          play(1,false,left);
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

  // Le troisième emplacement du bandeau de chrono sert au test sonore.
  const actions=document.querySelector('#timerDock .timer-actions');
  if(actions&&!document.getElementById('mtTestRestSound')){
    const button=document.createElement('button');
    button.id='mtTestRestSound';
    button.type='button';
    button.textContent='🔊 Test';
    button.title='Écouter le double bip de fin avec la musique';
    button.setAttribute('aria-label','Tester le son de fin du chronomètre');
    button.addEventListener('click',finishDoubleBip);
    actions.appendChild(button);
  }

  document.addEventListener('pointerdown',prime,{capture:true});
  document.addEventListener('keydown',prime,{capture:true});
})();