export const VERSION = 1;
export const STORAGE_KEY = 'mytraining_pro_v1';
export const limits = edition => edition === 'pro' ? {programs: 30} : {programs: 1};
export const templates = [
  {name:'Corps complet',exercises:[{name:'Squat au poids du corps',sets:3,reps:10,rest:90},{name:'Pompes adaptées',sets:3,reps:8,rest:90},{name:'Rowing haltère',sets:3,reps:10,rest:90}]},
  {name:'Haut du corps',exercises:[{name:'Développé haltères',sets:3,reps:10,rest:90},{name:'Tirage horizontal',sets:3,reps:10,rest:90},{name:'Curl haltères',sets:2,reps:12,rest:60}]},
  {name:'Jambes et mobilité',exercises:[{name:'Squat au poids du corps',sets:3,reps:10,rest:90},{name:'Pont fessier',sets:3,reps:12,rest:60},{name:'Montée sur marche',sets:2,reps:10,rest:90}]}
];
export function text(value,max=80){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Texte vide ou trop long.');return value.trim();}
export function number(value,min,max){const n=Number(value);if(value===''||value===null||typeof value==='boolean'||!Number.isFinite(n)||n<min||n>max)throw Error(`Valeur attendue entre ${min} et ${max}.`);return n;}
function integer(v,min,max){const n=number(v,min,max);if(!Number.isInteger(n))throw Error('Nombre entier attendu.');return n;}
export function exercise(e){return {name:text(e.name),sets:integer(e.sets,1,10),reps:integer(e.reps,1,100),rest:integer(e.rest,0,600)};}
export function program(p){if(!p||!Array.isArray(p.exercises)||p.exercises.length<1||p.exercises.length>30)throw Error('Un programme doit contenir de 1 à 30 exercices.');return {id:text(p.id,100),name:text(p.name),exercises:p.exercises.map(exercise)};}
export function initial(){return {version:VERSION,profile:{alias:'Sportif',goal:'Forme générale'},programs:[program({...templates[0],id:'starter'})],history:[],active:null};}
export function validate(data){
  if(!data||data.version!==VERSION)throw Error('Version de sauvegarde incompatible.');
  if(!Array.isArray(data.programs)||data.programs.length>30||!Array.isArray(data.history)||data.history.length>10000)throw Error('Sauvegarde trop volumineuse.');
  const programs=data.programs.map(program);if(new Set(programs.map(p=>p.id)).size!==programs.length)throw Error('Identifiants dupliqués.');
  const history=data.history.map(h=>{
    const date=new Date(h.date);if(!Number.isFinite(date.getTime()))throw Error('Date incorrecte.');
    if(!Array.isArray(h.sets)||h.sets.length>300)throw Error('Séries incorrectes.');
    return {id:text(h.id,100),name:text(h.name),date:date.toISOString(),sets:h.sets.map(s=>({name:text(s.name),reps:integer(s.reps,1,100),weight:number(s.weight,0,1000)}))};
  });
  if(new Set(history.map(h=>h.id)).size!==history.length)throw Error('Identifiants de séance dupliqués.');
  let active=null;
  if(data.active){const p=program(data.active.program);const done=data.active.done;if(!Array.isArray(done)||done.length>300)throw Error('Séance incorrecte.');const keys=new Set();active={program:p,done:done.map(s=>{const ei=integer(s.ei,0,p.exercises.length-1);const si=integer(s.si,0,p.exercises[ei].sets-1);const key=`${ei}:${si}`;if(keys.has(key))throw Error('Série dupliquée.');keys.add(key);return {ei,si,reps:integer(s.reps,1,100),weight:number(s.weight,0,1000)};})};}
  return {version:VERSION,profile:{alias:text(data.profile?.alias,40),goal:text(data.profile?.goal,80)},programs,history,active};
}
export function parseBackup(raw){if(typeof raw!=='string'||raw.length>5_000_000)throw Error('Fichier limité à 5 Mo.');return validate(JSON.parse(raw));}
export function recordSet(state,ei,si,reps,weight){if(!state.active)throw Error('Démarrez une séance.');const ex=state.active.program.exercises[ei];if(!ex||!Number.isInteger(si)||si<0||si>=ex.sets)throw Error('Série inconnue.');const done=state.active.done.filter(s=>!(s.ei===ei&&s.si===si));done.push({ei,si,reps:integer(reps,1,100),weight:number(weight,0,1000)});return {...state,active:{...state.active,done}};}
export function complete(state,date=new Date().toISOString(),id=crypto.randomUUID()){
  if(!state.active?.done.length)throw Error('Validez au moins une série.');if(state.history.length>=10000)throw Error('Exportez puis supprimez des séances avant de continuer.');
  const {program:p,done}=state.active;return {...state,active:null,history:[{id,name:p.name,date:new Date(date).toISOString(),sets:done.map(s=>({name:p.exercises[s.ei].name,reps:s.reps,weight:s.weight}))},...state.history]};
}
export function stats(history){return {sessions:history.length,sets:history.reduce((n,h)=>n+h.sets.length,0),volume:history.reduce((n,h)=>n+h.sets.reduce((v,s)=>v+s.reps*s.weight,0),0)};}
export function csv(history){const cell=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';return '\uFEFFDate;Séance;Exercice;Répétitions;Charge kg\n'+history.flatMap(h=>h.sets.map(s=>[h.date,h.name,s.name,s.reps,s.weight].map(cell).join(';'))).join('\n');}
