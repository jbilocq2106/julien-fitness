/* My Training — trois bips courts à la fin du repos, sans annonce vocale.
   Ne change ni le chrono ni la sauvegarde de la séance en cours. */
(function(){
  'use strict';
  let audioContext=null;

  function context(){
    try{
      if(!audioContext){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return null;
        audioContext=new Audio({latencyHint:'interactive'});
      }
      return audioContext;
    }catch(e){return null;}
  }

  function prime(){
    const ac=context();
    if(ac?.state==='suspended')ac.resume().catch(()=>{});
  }

  // Un toucher pour valider la série déverrouille aussi le son sur Android.
  document.addEventListener('pointerdown',prime,{capture:true});
  document.addEventListener('keydown',prime,{capture:true});

  function tripleBip(){
    if(navigator.vibrate)navigator.vibrate([130,85,130,85,130]);
    const ac=context();
    if(!ac)return;

    const play=()=>{
      const start=ac.currentTime+0.02;
      [0,0.22,0.44].forEach(delay=>{
        const t=start+delay;
        const oscillator=ac.createOscillator();
        const gain=ac.createGain();
        oscillator.type='sine';
        oscillator.frequency.setValueAtTime(980,t);
        gain.gain.setValueAtTime(0.0001,t);
        gain.gain.exponentialRampToValueAtTime(0.20,t+0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001,t+0.12);
        oscillator.connect(gain);
        gain.connect(ac.destination);
        oscillator.start(t);
        oscillator.stop(t+0.13);
      });
    };

    if(ac.state==='suspended')ac.resume().then(play).catch(()=>{});
    else play();
  }

  // Le chronomètre existant appelle cette fonction lors du passage à zéro.
  buzz=tripleBip;
  window.buzz=tripleBip;
})();
