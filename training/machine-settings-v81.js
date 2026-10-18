/* My Training — mémo de réglage machine par exercice.
   Le mémo est conservé pour les prochaines séances sans modifier le programme. */
(function(){
  'use strict';

  const KEY='mt_machine_settings_v1';
  let preferences={};
  let editIndex=-1;

  try{
    const stored=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(stored&&typeof stored==='object'&&!Array.isArray(stored))preferences=stored;
  }catch(e){preferences={};}

  function settingFor(exercise){
    if(!exercise)return '';
    if(typeof exercise.machineSetting==='string')return exercise.machineSetting;
    const value=preferences[normText(exercise.name)];
    return typeof value==='string'?value:'';
  }

  function supportsMachineSetting(exercise){
    // Aucune configuration de machine pour les exercices aux haltères libres.
    return !!exercise&&!/\b(halteres?|dumbbells?|poids libres?)\b/.test(normText(exercise.name));
  }

  function closeModal(){
    document.getElementById('mtMachineSettingModal')?.classList.add('hidden');
    editIndex=-1;
  }

  function ensureModal(){
    let modal=document.getElementById('mtMachineSettingModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='mtMachineSettingModal';
    modal.className='modal hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','mtMachineTitle');
    modal.innerHTML=`
      <div class="modal-card mt-machine-modal-card">
        <div class="section-title">
          <div>
            <div class="eyebrow">MÉMO PERSONNEL</div>
            <h2 id="mtMachineTitle">Réglage machine</h2>
          </div>
          <button type="button" class="ghost" id="mtMachineClose">Fermer</button>
        </div>
        <p id="mtMachineExerciseName" class="muted"></p>
        <label for="mtMachineSettingInput">Position, hauteur, poignée, siège…</label>
        <textarea id="mtMachineSettingInput" rows="3" maxlength="180"
          placeholder="Ex. Poulie niveau 13, poignée à hauteur de poitrine"></textarea>
        <p class="muted mt-machine-hint">Ce mémo sera affiché sur l’exercice et retrouvé à la prochaine séance.</p>
        <div class="mt-machine-controls">
          <button type="button" class="ghost" id="mtMachineClear">Effacer</button>
          <button type="button" class="primary" id="mtMachineSave">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#mtMachineClose').onclick=closeModal;
    modal.querySelector('#mtMachineSave').onclick=()=>saveSetting(false);
    modal.querySelector('#mtMachineClear').onclick=()=>saveSetting(true);
    modal.onclick=event=>{if(event.target===modal)closeModal();};
    return modal;
  }

  function openSettings(index){
    const exercise=state.activeWorkout?.exercises[index];
    if(!supportsMachineSetting(exercise))return;
    editIndex=index;
    const modal=ensureModal();
    modal.querySelector('#mtMachineExerciseName').textContent=exercise.name;
    modal.querySelector('#mtMachineSettingInput').value=settingFor(exercise);
    modal.classList.remove('hidden');
    modal.querySelector('#mtMachineSettingInput').focus();
  }

  function saveSetting(clear){
    const workout=state.activeWorkout;
    const exercise=workout?.exercises[editIndex];
    if(!exercise)return;
    const modal=ensureModal();
    const value=clear?'':modal.querySelector('#mtMachineSettingInput').value.trim().slice(0,180);
    const key=normText(exercise.name);
    if(value)preferences[key]=value;
    else delete preferences[key];
    workout.exercises.forEach(item=>{
      if(normText(item.name)===key)item.machineSetting=value;
    });
    try{localStorage.setItem(KEY,JSON.stringify(preferences));}
    catch(err){alert('Le réglage est conservé dans la séance, mais sa sauvegarde pour les prochaines séances a échoué.');}
    save();
    closeModal();
    renderWorkout();
  }

  function decorateWorkout(){
    const workout=state.activeWorkout;
    const list=document.getElementById('exerciseList');
    if(!workout||!list)return;
    list.querySelectorAll('.exercise').forEach((card,index)=>{
      const exercise=workout.exercises[index];
      if(!supportsMachineSetting(exercise))return;
      const title=card.querySelector('.exercise-title-main h3');
      if(!title)return;
      const setting=settingFor(exercise);
      if(!title.querySelector('.mt-machine-setting-btn')){
        const button=document.createElement('button');
        button.type='button';
        button.className='ghost mt-machine-setting-btn';
        button.textContent='⚙';
        button.title=`Réglage machine : ${exercise.name}`;
        button.setAttribute('aria-label',`Réglage machine pour ${exercise.name}`);
        button.onclick=()=>openSettings(index);
        title.appendChild(button);
      }
      if(setting&&!card.querySelector('.mt-machine-setting-note')){
        const note=document.createElement('div');
        note.className='mt-machine-setting-note';
        note.textContent=`⚙ ${setting}`;
        card.querySelector('.exercise-title-row')?.insertAdjacentElement('afterend',note);
      }
    });
  }

  const css=document.createElement('style');
  css.textContent=`
    .mt-machine-setting-btn{display:inline-flex;align-items:center;justify-content:center;
      width:29px;height:29px;margin-left:7px;padding:0;vertical-align:middle;
      font-size:17px;line-height:1;border-radius:9px;color:#fcd34d}
    .mt-machine-setting-note{margin:8px 0 10px;padding:8px 10px;font-size:12px;line-height:1.35;
      background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.30);border-radius:10px;
      color:#fde68a;white-space:pre-wrap;overflow-wrap:anywhere}
    .mt-machine-modal-card textarea{display:block;width:100%;min-height:88px;box-sizing:border-box;
      margin:9px 0 7px;resize:vertical}
    .mt-machine-hint{font-size:12px;line-height:1.4}
    .mt-machine-controls{display:flex;justify-content:space-between;gap:10px;margin-top:14px}
    .mt-machine-controls button{flex:1;padding:11px 8px}
  `;
  document.head.appendChild(css);

  if(typeof renderWorkout==='function'){
    const previousRender=renderWorkout;
    renderWorkout=function(){const result=previousRender();decorateWorkout();return result;};
    window.renderWorkout=renderWorkout;
  }
  decorateWorkout();
})();
