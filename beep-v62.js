(()=>{
  let restAudioContext=null;

  function getRestAudioContext(){
    try{
      if(!restAudioContext){
        const AudioCtx=window.AudioContext||window.webkitAudioContext;
        if(!AudioCtx)return null;
        restAudioContext=new AudioCtx();
      }
      return restAudioContext;
    }catch(e){
      return null;
    }
  }

  function primeRestAudio(){
    const ac=getRestAudioContext();
    if(ac&&ac.state==='suspended')ac.resume().catch(()=>{});
  }

  function playDoubleBeep(ac){
    const beep=(when)=>{
      const osc=ac.createOscillator();
      const gain=ac.createGain();
      osc.type='sine';
      osc.frequency.setValueAtTime(980,when);
      gain.gain.setValueAtTime(0.0001,when);
      gain.gain.exponentialRampToValueAtTime(0.14,when+0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001,when+0.17);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(when);
      osc.stop(when+0.18);
    };
    const start=ac.currentTime+0.02;
    beep(start);
    beep(start+0.30);
  }

  // Déverrouille l'audio lors d'une interaction utilisateur afin que le bip
  // fonctionne ensuite quand le chrono arrive à zéro en arrière-plan de la séance.
  document.addEventListener('pointerdown',primeRestAudio,{capture:true,once:true});
  document.addEventListener('keydown',primeRestAudio,{capture:true,once:true});

  // Remplace le signal de fin d'origine : double bip + double vibration.
  window.buzz=function(){
    if(navigator.vibrate)navigator.vibrate([220,120,220]);
    const ac=getRestAudioContext();
    if(!ac)return;
    const play=()=>playDoubleBeep(ac);
    if(ac.state==='suspended')ac.resume().then(play).catch(()=>{});
    else play();
  };
})();
