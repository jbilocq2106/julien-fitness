
/* Rotation dropset et 3/7 - MyTraining v114. */
(function(){
'use strict';
const VERSION='v114';
const DESIGN={
 S1:[['Pec Fly à la machine','drop'],['Écartés poulie vis-à-vis','37'],['Extension triceps corde','drop'],['Curl poulie basse corde','37']],
 S2:[['Face pull corde','drop'],['Curl pupitre machine','37'],['Curl marteau haltères','37'],['Extension triceps corde','drop']],
 S3:[['Pec Fly à la machine','drop'],['Écartés poulie vis-à-vis','37'],['Élévations latérales','drop'],['Curl incliné haltères','37'],['Extension triceps corde','drop']],
 S4:[['Pec Fly à la machine','37'],['Leg Curl assis','drop'],['Élévations latérales','37'],['Curl poulie basse corde','drop'],['Extension triceps corde','37']]
};
const LABELS={classic:'Classique',drop:'Dropset','37':'3/7'};
function recommendation(id,name){
 const pair=(DESIGN[id]||[]).find(x=>x[0]===name);
 if(!pair)return null;
 const session=state.program?.sessions?.find(s=>s.id===id);
 const count=session?(state.sessions||[]).filter(s=>s.title===session.name).length:0;
 return count%2?(pair[1]==='drop'?'37':'drop'):pair[1];
}
function pristine(e){return (e.sets||[]).every(s=>!s.done&&!String(s.reps??'').trim()&&!Number(s.durationSeconds));}
function baseWeight(sets){
 const s=sets[sets.length-1]||{};
 const n=Number(String(s.weight??'').replace(',','.'));
 const t=Number(String(s.targetWeight??'').replace(',','.'));
 return Number.isFinite(n)&&n>0?n:Number.isFinite(t)&&t>0?t:0;
}
function build(e,method){
 if(!pristine(e))return false;
 if(!e.mtNormalSets)e.mtNormalSets=JSON.parse(JSON.stringify(e.sets.filter(s=>!s.dropSet&&!s.threeSeven)));
 const normal=JSON.parse(JSON.stringify(e.mtNormalSets));
 const base=baseWeight(normal);
 const fresh=(index,reps,weight,extras)=>Object.assign({
  i:index+1,targetReps:String(reps),targetWeight:weight??null,
  weight:weight??'',reps:'',rir:'',done:false
 },extras||{});
 if(method==='37'){
  const weight=base>0?Math.round(base*.75*2)/2:null;
  e.sets=[3,4,5,6,7].map((reps,idx)=>fresh(idx,reps,weight,{threeSeven:true}));
 }else if(method==='drop'){
  e.sets=normal.concat([.75,.55].map((ratio,idx)=>fresh(
    normal.length+idx,'8–10',base>0?Math.round(base*ratio*2)/2:null,
    {dropSet:true,dropRatio:ratio}
  )));
 }else e.sets=normal;
 e.sets.forEach((set,idx)=>{set.i=idx+1;});
 e.mtMethod=method;
 return true;
}
function prepare(){
 const w=state.activeWorkout;
 if(!w||!DESIGN[w.id]||w.mtTechVersion===VERSION)return;
 w.exercises.forEach(e=>{
  const method=recommendation(w.id,e.name);
  if(!method)return;
  if(pristine(e))build(e,method);
  else e.mtMethod=e.sets.some(x=>x.threeSeven)?'37':e.sets.some(x=>x.dropSet)?'drop':'classic';
 });
 w.mtTechVersion=VERSION;
 save();
}
function switchMethod(index,newMethod){
 const e=state.activeWorkout?.exercises?.[index];
 if(!e||!pristine(e)){renderWorkout();return;}
 build(e,newMethod);save();renderWorkout();
}
function decorateWorkout(){
 const w=state.activeWorkout;
 if(!w||!DESIGN[w.id])return;
 document.querySelectorAll('#exerciseList .exercise').forEach((card,index)=>{
  const ex=w.exercises[index];
  if(!ex||!recommendation(w.id,ex.name))return;
  const bar=document.createElement('div');
  bar.className='mt-v114-method-bar';
  const label=document.createElement('label');
  label.textContent='Méthode ';
  const select=document.createElement('select');
  select.setAttribute('aria-label','Méthode pour '+ex.name);
  ['classic','drop','37'].forEach(key=>{
   const option=document.createElement('option');
   option.value=key;option.textContent=LABELS[key];
   select.appendChild(option);
  });
  select.value=ex.mtMethod||'classic';
  select.disabled=!pristine(ex);
  select.onchange=()=>switchMethod(index,select.value);
  label.appendChild(select);bar.appendChild(label);
  const help=document.createElement('span');
  help.textContent=ex.mtMethod==='37'?'3, 4, 5, 6, 7 répétitions ; 15 s de repos ; charge constante à ajuster':
    ex.mtMethod==='drop'?'Dernière série puis deux baisses de charge sans repos':
    'Récupération habituelle';
  bar.appendChild(help);
  const guide=card.querySelector('.exercise-guide');
  if(guide)guide.before(bar);else card.querySelector('.exercise-title-row')?.after(bar);
  card.querySelectorAll('.set-row').forEach((row,idx)=>{
   if(ex.sets[idx]?.threeSeven)row.classList.add('mt-v114-37');
  });
 });
}
function decorateProgram(){
 document.querySelectorAll('#programCards .session-card').forEach((card,index)=>{
  const session=state.program?.sessions?.[index];
  if(!session||!DESIGN[session.id])return;
  card.querySelectorAll('.program-exercise-row').forEach((row,exIndex)=>{
   const method=recommendation(session.id,session.exercises[exIndex]?.name);
   if(!method)return;
   const target=row.querySelector('.target-line');
   if(target){const span=document.createElement('span');span.className='mt-v114-plan';span.textContent=' • '+LABELS[method];target.appendChild(span);}
  });
 });
}
const css=document.createElement('style');
css.textContent='.mt-v114-method-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0;padding:8px;border:1px solid #818cf8;border-radius:8px;background:rgba(99,102,241,.1);font-size:12px}.mt-v114-method-bar label{display:flex;gap:6px;align-items:center;font-weight:700}.mt-v114-method-bar select{max-width:135px;padding:6px;border-radius:6px;background:#111827;color:#fff;border:1px solid #818cf8}.mt-v114-method-bar select:disabled{opacity:.6}.mt-v114-method-bar span{font-size:11px;color:#c7d2fe}.mt-v114-37{border-left:3px solid #60a5fa;padding-left:3px;background:rgba(59,130,246,.08)}.mt-v114-plan{color:#c4b5fd;font-weight:800}';
document.head.appendChild(css);
const oldWorkout=renderWorkout;
renderWorkout=function(){prepare();const result=oldWorkout.apply(this,arguments);decorateWorkout();return result;};
window.renderWorkout=renderWorkout;
const oldProgram=renderProgram;
renderProgram=function(){prepare();const result=oldProgram.apply(this,arguments);decorateProgram();return result;};
window.renderProgram=renderProgram;
if(state.activeWorkout)renderWorkout();
if(state.program)renderProgram();
})();