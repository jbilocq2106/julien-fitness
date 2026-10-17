/* My Training v61 — prioritize dumbbell, then bodyweight swap suggestions */
(function(){
  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function priorityFor(btn){
    const text=norm(btn.textContent);
    // 1) Dumbbells/free weights first: usually the easiest equipment to find.
    if(/haltere|halteres|goblet|suitcase/.test(text))return 0;
    // 2) Then bodyweight / elastic-band options.
    if(/poids du corps|pompe|planche|dead bug|hollow|bird dog|sissy|fente|bulgare|nordic|releve|crunch au sol|sit-up|elastique|sans machine/.test(text))return 1;
    // 3) Other machines/cables last.
    return 2;
  }

  function labelFor(rank){
    if(rank===0)return 'Priorité haltères';
    if(rank===1)return 'Poids du corps / simple';
    return 'Autre option';
  }

  function reorderSwapChoices(){
    const list=document.querySelector('#sessionDetailBody .mt-swap-list');
    if(!list)return;
    const buttons=[...list.querySelectorAll('.mt-swap-choice')];
    if(!buttons.length)return;

    const ranked=buttons
      .map((btn,index)=>({btn,index,rank:priorityFor(btn)}))
      .sort((a,b)=>a.rank-b.rank||a.index-b.index);

    ranked.forEach(({btn,rank})=>{
      let tag=btn.querySelector('.mt-swap-priority');
      if(!tag){
        tag=document.createElement('span');
        tag.className='mt-swap-priority';
        btn.prepend(tag);
      }
      const label=labelFor(rank);
      if(tag.textContent!==label)tag.textContent=label;
    });

    const orderChanged=ranked.some(({btn},i)=>btn!==buttons[i]);
    if(orderChanged)ranked.forEach(({btn})=>list.appendChild(btn));

    const intro=document.querySelector('#sessionDetailBody .mt-swap-intro');
    const message='Machine occupée ? Je te propose d’abord une alternative aux haltères, puis au poids du corps, et seulement ensuite une autre machine.';
    if(intro&&intro.textContent!==message)intro.textContent=message;
  }

  const style=document.createElement('style');
  style.textContent=`
    .mt-swap-priority{display:inline-block;margin:0 0 7px;padding:4px 8px;border-radius:999px;background:rgba(59,130,246,.16);font-size:.72rem;font-weight:700;letter-spacing:.01em}
  `;
  document.head.appendChild(style);

  // swap-v60 opens its modal from a local function, so observe the modal body
  // and reorder the choices every time replacement options are rendered.
  const body=document.getElementById('sessionDetailBody');
  if(body){
    const observer=new MutationObserver(()=>reorderSwapChoices());
    observer.observe(body,{childList:true,subtree:true});
  }

  // Also keep direct calls compatible.
  const originalOpen=window.mtOpenExerciseSwap;
  if(typeof originalOpen==='function'){
    window.mtOpenExerciseSwap=function(index){
      originalOpen(index);
      reorderSwapChoices();
    };
  }
})();

/* Rest timer end signal — double beep + double vibration */
(function(){
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

  // Prime audio on the first interaction so a timer callback can sound later.
  document.addEventListener('pointerdown',primeRestAudio,{capture:true,once:true});
  document.addEventListener('keydown',primeRestAudio,{capture:true,once:true});

  window.buzz=function(){
    if(navigator.vibrate)navigator.vibrate([220,120,220]);
    const ac=getRestAudioContext();
    if(!ac)return;
    const play=()=>playDoubleBeep(ac);
    if(ac.state==='suspended')ac.resume().then(play).catch(()=>{});
    else play();
  };
})();
