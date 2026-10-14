
const DBKEY='mt_data_v1';
let state={history:[],sessions:[],program:null,nextSessionId:'S1',activeWorkout:null};
let timer={end:0,remaining:90,running:false,interval:null};
let workoutTick=null,wakeLock=null;

function save(){localStorage.setItem(DBKEY,JSON.stringify({history:state.history,sessions:state.sessions,nextSessionId:state.nextSessionId,activeWorkout:state.activeWorkout}));}
function load(){try{const d=JSON.parse(localStorage.getItem(DBKEY)||'{}');Object.assign(state,d);}catch(e){}}
async function loadProgram(){
  const old=state.program;
  try{state.program=await fetch('program.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json());}
  catch(e){ if(!old){document.getElementById('nextSessionName').textContent='Programme indisponible';return;} state.program=old; }
  renderProgram();renderHome();
}
function fmt(n){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n||0)}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));if(id==='historyView')renderHistory();if(id==='statsView')renderStatsSelect();}
document.querySelectorAll('.bottom-nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));

function getSession(id){return state.program?.sessions?.find(s=>s.id===id)||state.program?.sessions?.[0]}
function renderHome(){
  if(!state.program)return;
  const s=getSession(state.nextSessionId);
  document.getElementById('nextSessionName').textContent=s.name;
  document.getElementById('nextSessionFocus').textContent=s.focus;
  document.getElementById('statSessions').textContent=state.sessions.length||uniqueWorkouts(state.history).length;
  document.getElementById('statSets').textContent=state.history.filter(r=>num(r.reps)>0).length;
  document.getElementById('statVolume').textContent=fmt(state.history.reduce((a,r)=>a+(num(r.weight_kg)*num(r.reps)),0));
  const recent=uniqueWorkouts(state.history).slice(0,5);
  document.getElementById('recentList').innerHTML=recent.length?recent.map(w=>`<div class="list-item"><div><strong>${esc(w.title)}</strong><small>${esc(w.start_time)}</small></div><small>${w.sets} séries</small></div>`).join(''):'<div class="muted">Aucune séance importée.</div>';
}
function renderProgram(){
  if(!state.program)return;
  document.getElementById('programCards').innerHTML=state.program.sessions.map(s=>`<div class="card session-card"><div class="section-title"><div><h3>${esc(s.name)}</h3><div class="muted">${esc(s.focus)}</div></div><button class="primary" onclick="startWorkout('${s.id}')">Démarrer</button></div>${s.exercises.map(e=>`<div class="exercise-row"><span>${esc(e.name)}</span><span class="badge">${e.sets.length} série${e.sets.length>1?'s':''} • ${e.rest?e.rest+'s':'—'}</span></div>`).join('')}</div>`).join('');
}
function startWorkout(id){
  const s=getSession(id); if(!s)return;
  state.activeWorkout={id:s.id,name:s.name,started:Date.now(),exercises:s.exercises.map(e=>({name:e.name,note:e.note||'',rest:e.rest,sets:e.sets.map((x,i)=>({i:i+1,targetReps:x.reps,targetWeight:x.weight,weight:x.weight??'',reps:'',rpe:'',done:false}))}))};
  save();renderWorkout();showView('workoutView');startWorkoutClock();
}
window.startWorkout=startWorkout;
function renderWorkout(){
  const w=state.activeWorkout;if(!w)return;
  document.getElementById('workoutTitle').textContent=w.name;
  document.getElementById('exerciseList').innerHTML=w.exercises.map((e,ei)=>`<div class="exercise"><h3>${esc(e.name)}</h3>${e.note?`<div class="exercise-note">${esc(e.note)}</div>`:''}<div class="muted">Repos conseillé : ${e.rest||0}s</div>${e.sets.map((s,si)=>`<div class="set-row ${s.done?'completed':''}" data-e="${ei}" data-s="${si}"><div class="set-num">${s.i}</div><input inputmode="decimal" placeholder="${s.targetWeight??'kg'}" value="${s.weight}" data-field="weight"><input inputmode="numeric" placeholder="${esc(s.targetReps)}" value="${s.reps}" data-field="reps"><button class="done">${s.done?'✓':'OK'}</button></div>`).join('')}</div>`).join('');
  document.querySelectorAll('.set-row input').forEach(inp=>inp.onchange=(ev)=>{const row=ev.target.closest('.set-row');state.activeWorkout.exercises[+row.dataset.e].sets[+row.dataset.s][ev.target.dataset.field]=ev.target.value;save();});
  document.querySelectorAll('.set-row .done').forEach(btn=>btn.onclick=(ev)=>{const row=ev.target.closest('.set-row'),e=state.activeWorkout.exercises[+row.dataset.e],s=e.sets[+row.dataset.s];s.done=!s.done;save();renderWorkout();if(s.done&&e.rest)startTimer(e.rest);});
}
function startWorkoutClock(){clearInterval(workoutTick);workoutTick=setInterval(()=>{if(!state.activeWorkout)return;document.getElementById('workoutElapsed').textContent=timeFmt(Math.floor((Date.now()-state.activeWorkout.started)/1000));},1000)}
document.getElementById('finishWorkoutBtn').onclick=()=>{
  const w=state.activeWorkout;if(!w)return;
  const end=new Date(),start=new Date(w.started),title=w.name;
  w.exercises.forEach(e=>e.sets.filter(s=>s.done).forEach((s,i)=>state.history.unshift({title,start_time:start.toISOString(),end_time:end.toISOString(),description:'Mon Training',exercise_title:e.name,superset_id:'',exercise_notes:e.note,set_index:i,set_type:'normal',weight_kg:num(s.weight),reps:num(s.reps),distance_km:'',duration_seconds:'',rpe:num(s.rpe)||''})));
  state.sessions.unshift({title,start:start.toISOString(),end:end.toISOString()});
  const ids=state.program.sessions.map(s=>s.id),idx=ids.indexOf(w.id);state.nextSessionId=ids[(idx+1)%ids.length];
  state.activeWorkout=null;save();clearInterval(workoutTick);renderHome();showView('homeView');
};

function parseCSV(text){
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
    if(c==='"'){if(q&&n==='"'){cell+='"';i++;}else q=!q;}
    else if(c===','&&!q){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x!==''))rows.push(row);row=[];}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row);}
  const headers=rows.shift().map(h=>h.trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
document.getElementById('importBtn').onclick=()=>document.getElementById('csvInput').click();
document.getElementById('csvInput').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  const rows=parseCSV(await f.text());
  const needed=['title','start_time','exercise_title','weight_kg','reps'];
  if(!needed.every(k=>rows[0]&&k in rows[0])){document.getElementById('importStatus').textContent='CSV Hevy non reconnu.';return;}
  state.history=rows;save();document.getElementById('importStatus').textContent=`${rows.length} lignes importées. Données enregistrées uniquement sur ce téléphone.`;renderHome();
};
function uniqueWorkouts(rows){
  const m=new Map();rows.forEach(r=>{const k=(r.title||'')+'|'+(r.start_time||'');if(!m.has(k))m.set(k,{title:r.title,start_time:r.start_time,sets:0});m.get(k).sets++;});
  return [...m.values()].sort((a,b)=>dateVal(b.start_time)-dateVal(a.start_time));
}
function dateVal(s){const d=Date.parse(s);if(!Number.isNaN(d))return d;return 0}
function renderHistory(){const ws=uniqueWorkouts(state.history);document.getElementById('historyList').innerHTML=ws.length?ws.map(w=>`<div class="list-item"><div><strong>${esc(w.title)}</strong><small>${esc(w.start_time)}</small></div><small>${w.sets} lignes</small></div>`).join(''):'<div class="muted">Aucun historique.</div>'}
document.getElementById('exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify({history:state.history,sessions:state.sessions,nextSessionId:state.nextSessionId},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mon-training-backup.json';a.click();URL.revokeObjectURL(a.href);
};
let statsMetric='weight';

function renderStatsSelect(){
  const names=[...new Set(state.history.map(r=>r.exercise_title).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  const sel=document.getElementById('exerciseSelect');
  const prev=sel.value;
  sel.innerHTML=names.map(n=>`<option>${esc(n)}</option>`).join('');
  if(names.includes(prev))sel.value=prev;
  sel.onchange=renderExerciseStats;
  document.querySelectorAll('.metric-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.metric===statsMetric);
    btn.onclick=()=>{
      statsMetric=btn.dataset.metric;
      document.querySelectorAll('.metric-btn').forEach(b=>b.classList.toggle('active',b===btn));
      renderExerciseStats();
    };
  });
  renderExerciseStats();
}

function exerciseSessions(name){
  const rows=state.history.filter(r=>r.exercise_title===name&&num(r.reps)>0);
  const byWorkout=new Map();
  rows.forEach(r=>{
    const key=r.start_time||'';
    if(!byWorkout.has(key))byWorkout.set(key,{date:key,rows:[]});
    byWorkout.get(key).rows.push(r);
  });
  return [...byWorkout.values()].sort((a,b)=>dateVal(a.date)-dateVal(b.date)).map(w=>{
    const sets=w.rows.map(r=>({
      weight:num(r.weight_kg),
      reps:num(r.reps),
      e1rm:e1rm(num(r.weight_kg),num(r.reps)),
      volume:num(r.weight_kg)*num(r.reps)
    }));
    const bestSet=sets.slice().sort((a,b)=>(b.e1rm-a.e1rm)||(b.weight-a.weight)||(b.reps-a.reps))[0]||{weight:0,reps:0,e1rm:0,volume:0};
    return {
      date:w.date,
      bestWeight:Math.max(0,...sets.map(s=>s.weight)),
      best1rm:Math.max(0,...sets.map(s=>s.e1rm)),
      volume:sets.reduce((a,s)=>a+s.volume,0),
      bestSet
    };
  });
}

function metricValue(s){
  if(statsMetric==='e1rm')return s.best1rm;
  if(statsMetric==='volume')return s.volume;
  return s.bestWeight;
}
function metricUnit(){return statsMetric==='volume'?'kg':statsMetric==='e1rm'?'kg':'kg'}
function metricLabel(){return statsMetric==='volume'?'Volume par séance':statsMetric==='e1rm'?'Meilleur 1RM estimé par séance':'Meilleure charge par séance'}
function fmtMetric(v){return statsMetric==='volume'?fmt(v):Number(v||0).toFixed(statsMetric==='e1rm'?1:0)}
function shortDate(s){
  const d=new Date(s);if(Number.isNaN(d.getTime()))return '';
  return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
}
function pctChange(a,b){
  if(!a)return null;
  return ((b-a)/a)*100;
}

function renderExerciseStats(){
  const name=document.getElementById('exerciseSelect').value;
  const rows=state.history.filter(r=>r.exercise_title===name&&num(r.reps)>0);
  const sessions=exerciseSessions(name);
  if(!rows.length||!sessions.length){
    document.getElementById('exerciseStats').innerHTML='<div class="muted">Pas de données</div>';
    document.getElementById('exerciseSummary').innerHTML='';
    drawChart([]);
    return;
  }

  const bestWeight=Math.max(...rows.map(r=>num(r.weight_kg)));
  const best1rm=Math.max(...rows.map(r=>e1rm(num(r.weight_kg),num(r.reps))));
  const totalVolume=rows.reduce((a,r)=>a+num(r.weight_kg)*num(r.reps),0);
  document.getElementById('exerciseStats').innerHTML=
    `<div><strong>${bestWeight} kg</strong><small>meilleure charge</small></div>`+
    `<div><strong>${best1rm.toFixed(1)} kg</strong><small>1RM estimé max</small></div>`+
    `<div><strong>${fmt(totalVolume)}</strong><small>volume total</small></div>`;

  const latest=sessions[sessions.length-1];
  const previous=sessions.length>1?sessions[sessions.length-2]:null;
  const first=sessions[0];
  const latestVal=metricValue(latest);
  const prevVal=previous?metricValue(previous):null;
  const firstVal=metricValue(first);
  const vsPrev=previous?pctChange(prevVal,latestVal):null;
  const sinceFirst=sessions.length>1?pctChange(firstVal,latestVal):null;
  const previousBest=sessions.length>1?Math.max(...sessions.slice(0,-1).map(metricValue)):0;
  const isPR=sessions.length>1&&latestVal>previousBest+1e-9;

  const diffClass=vsPrev==null?'':vsPrev>=0?'progress-positive':'progress-negative';
  const diffText=vsPrev==null?'—':`${vsPrev>=0?'+':''}${vsPrev.toFixed(1)} %`;
  const overallClass=sinceFirst==null?'':sinceFirst>=0?'progress-positive':'progress-negative';
  const overallText=sinceFirst==null?'—':`${sinceFirst>=0?'+':''}${sinceFirst.toFixed(1)} %`;

  document.getElementById('exerciseSummary').innerHTML=
    `<div class="progress-box"><small>Dernière performance</small><strong>${latest.bestSet.weight} kg × ${latest.bestSet.reps}${isPR?'<span class="pr-badge">PR</span>':''}</strong><small>${shortDate(latest.date)}</small></div>`+
    `<div class="progress-box"><small>Séances sur cet exercice</small><strong>${sessions.length}</strong><small>${rows.length} séries</small></div>`+
    `<div class="progress-box"><small>Vs séance précédente</small><strong class="${diffClass}">${diffText}</strong><small>${metricLabel().toLowerCase()}</small></div>`+
    `<div class="progress-box"><small>Depuis la 1re séance</small><strong class="${overallClass}">${overallText}</strong><small>${shortDate(first.date)} → ${shortDate(latest.date)}</small></div>`;

  document.getElementById('chartMetricTitle').textContent=metricLabel();
  document.getElementById('chartUnit').textContent=metricUnit();
  drawChart(sessions.slice(-20).map(s=>({value:metricValue(s),date:s.date})));
}

function drawChart(points){
  const svg=document.getElementById('progressChart');
  if(points.length<2){
    svg.innerHTML='<text x="14" y="82">Pas assez de données pour la courbe.</text>';
    return;
  }
  const vals=points.map(p=>p.value);
  const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
  const left=20,right=324,top=22,bottom=128;
  const pts=points.map((p,i)=>[
    left+i*((right-left)/(points.length-1)),
    bottom-(p.value-min)/span*(bottom-top)
  ]);
  const d=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const mid=Math.floor((points.length-1)/2);
  const maxLabel=statsMetric==='volume'?fmt(max):max.toFixed(statsMetric==='e1rm'?1:0);
  const minLabel=statsMetric==='volume'?fmt(min):min.toFixed(statsMetric==='e1rm'?1:0);
  const circles=pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===pts.length-1?4:2.6}" fill="#22c55e"/>`).join('');
  svg.innerHTML=
    `<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#334155"/>`+
    `<path d="${d}" fill="none" stroke="#22c55e" stroke-width="3"/>${circles}`+
    `<text x="${left}" y="14">${maxLabel}</text>`+
    `<text x="${left}" y="${bottom+14}">${minLabel}</text>`+
    `<text x="${left}" y="162">${shortDate(points[0].date)}</text>`+
    `<text x="${pts[mid][0]}" y="162" text-anchor="middle">${shortDate(points[mid].date)}</text>`+
    `<text x="${right}" y="162" text-anchor="end">${shortDate(points[points.length-1].date)}</text>`;
}
function e1rm(w,r){return w>0&&r>0?w*(1+r/30):0}function num(v){const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function timeFmt(s){s=Math.max(0,s|0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function timerRender(){const left=timer.running?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer.remaining;document.getElementById('timerToggle').textContent=timeFmt(left);if(timer.running&&left<=0){timer.running=false;timer.remaining=0;clearInterval(timer.interval);buzz();}}
function startTimer(sec){timer.remaining=sec;timer.end=Date.now()+sec*1000;timer.running=true;clearInterval(timer.interval);timer.interval=setInterval(timerRender,250);timerRender();}
function buzz(){if(navigator.vibrate)navigator.vibrate([300,120,300]);try{const ac=new (window.AudioContext||window.webkitAudioContext)(),o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;g.gain.value=.08;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.25);}catch(e){}}
document.querySelectorAll('[data-timer]').forEach(b=>b.onclick=()=>startTimer(+b.dataset.timer));
document.getElementById('plus15').onclick=()=>{const l=timer.running?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer.remaining;startTimer(l+15)};
document.getElementById('minus15').onclick=()=>{const l=timer.running?Math.max(0,Math.ceil((timer.end-Date.now())/1000)):timer.remaining;startTimer(Math.max(0,l-15))};
document.getElementById('timerToggle').onclick=()=>{if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.end-Date.now())/1000));timer.running=false;clearInterval(timer.interval);}else startTimer(timer.remaining||90);timerRender();};
document.getElementById('startNextBtn').onclick=()=>startWorkout(state.nextSessionId);
document.getElementById('refreshProgramBtn').onclick=loadProgram;
document.getElementById('wakeBtn').onclick=async()=>{try{if(!('wakeLock'in navigator))return alert('Wake Lock non disponible sur ce navigateur.');if(wakeLock){await wakeLock.release();wakeLock=null;document.getElementById('wakeBtn').textContent='Écran allumé';}else{wakeLock=await navigator.wakeLock.request('screen');document.getElementById('wakeBtn').textContent='Écran verrouillé';}}catch(e){}};
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&wakeLock){try{wakeLock=await navigator.wakeLock.request('screen')}catch(e){}}});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
load();loadProgram();if(state.activeWorkout){renderWorkout();startWorkoutClock()}timerRender();
