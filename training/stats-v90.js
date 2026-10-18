/* My Training — onglet Stats enrichi (sans migration ni modification des historiques). */
(function () {
  'use strict';

  const APPROVED_KEY = 'mt_stats_approved_advice_v1';
  const number = value => {
    if (value === '' || value == null) return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const round = (value, digits = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value || 0);
  const timestamp = value => { const t = Date.parse(value || ''); return Number.isFinite(t) ? t : NaN; };
  const dateShort = value => new Date(value).toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'});
  const calendarMonth = value => new Date(value).toLocaleDateString('fr-FR', {month:'long',year:'numeric'});
  const minutesLabel = n => n >= 60 ? `${Math.floor(n / 60)} h ${Math.round(n % 60)} min` : `${Math.round(n)} min`;
  const cardioKind = row => {
    const name = String(row.exercise_title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/tapis|treadmill|marche/.test(name)) return 'tapis';
    if (/velo|bike|cycling|spinning|vtt/.test(name)) return 'velo';
    if (/course|running|jogging|run\b/.test(name)) return 'course';
    return row.set_type === 'cardio' || /rameur|elliptique|cardio/.test(name) ? 'autre' : null;
  };
  const strengthRow = r => !cardioKind(r) && (number(r.reps) || 0) > 0;
  const volume = r => (number(r.weight_kg) || 0) * (number(r.reps) || 0);
  const e1rmValue = r => {
    const kg = number(r.weight_kg) || 0, reps = number(r.reps) || 0;
    return kg > 0 && reps > 0 ? kg * (1 + reps / 30) : 0;
  };
  const rowsNow = () => Array.isArray(state?.history) ? state.history : [];
  const validRows = () => rowsNow().filter(r => Number.isFinite(timestamp(r.start_time)));
  const workoutKey = r => `${r.title || 'Séance'}|${r.start_time || ''}`;
  function workouts(rows) {
    const map = new Map();
    rows.forEach(r => {
      const key = workoutKey(r);
      if (!map.has(key)) map.set(key, { key, title:r.title || 'Séance', start:r.start_time, end:0, rows:[] });
      const w = map.get(key);
      w.rows.push(r);
      const end = timestamp(r.end_time);
      if (Number.isFinite(end)) w.end = Math.max(w.end, end);
    });
    return Array.from(map.values()).sort((a,b) => timestamp(b.start) - timestamp(a.start));
  }
  function workoutMinutes(w) {
    const elapsed = (w.end - timestamp(w.start)) / 60000;
    if (Number.isFinite(elapsed) && elapsed > 0 && elapsed < 12 * 60) return elapsed;
    return w.rows.filter(r => cardioKind(r)).reduce((n,r) => n + (number(r.duration_seconds) || 0)/60, 0);
  }
  function cardioEntry(r) {
    const minutes = (number(r.duration_seconds) || 0)/60;
    const givenDistance = number(r.distance_km);
    const speed = number(r.speed_kmh);
    const distance = givenDistance > 0 ? givenDistance : (minutes > 0 && speed > 0 ? speed * minutes / 60 : null);
    const climb = cardioKind(r) === 'tapis'
      ? (typeof window.mtTreadmillElevation === 'function' ? window.mtTreadmillElevation(r) : number(r.elevation_gain_m))
      : number(r.elevation_gain_m);
    const hr = number(r.avg_hr_bpm ?? r.avg_hr ?? r.heart_rate_bpm ?? r.avgHr);
    return {kind:cardioKind(r), title:r.exercise_title || 'Cardio', date:r.start_time, minutes, distance,
      estimated: !(givenDistance > 0) && distance !== null, speed: speed > 0 ? speed : (minutes > 0 && distance ? distance*60/minutes : null),
      incline:number(r.incline_percent), ascent:climb == null ? null : climb, hr:hr > 0 ? hr : null};
  }
  const startOfDay = () => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); };
  const daysBack = days => startOfDay() - (days - 1) * 86400000;
  const periodRows = days => validRows().filter(r => timestamp(r.start_time) >= daysBack(days));
  const statsFor = rows => {
    const ws = workouts(rows), cardio = rows.filter(r=>cardioKind(r)).map(cardioEntry);
    const durationMinutes = ws.reduce((a,w) => a + workoutMinutes(w), 0);
    return {ws,cardio,count:ws.length,durationMinutes,
      volume:rows.filter(strengthRow).reduce((a,r)=>a+volume(r),0),
      cardioMinutes:cardio.reduce((a,c)=>a+c.minutes,0),
      cardioDistance:cardio.reduce((a,c)=>a+(c.distance || 0),0),
      ascent:cardio.reduce((a,c)=>a+(c.ascent || 0),0)};
  };
  let selectedDays = 30, selectedWeeks = 8, selectedKind = 'tous';

  function summaryHtml() {
    const s = statsFor(periodRows(selectedDays));
    const cards = [
      ['calendar-check', 'Séances', round(s.count), 'effectuées'],
      ['clock', 'Durée totale', minutesLabel(s.durationMinutes), 'durées connues'],
      ['dumbbell', 'Volume', `${round(s.volume)} kg`, 'charge × répétitions'],
      ['heart-pulse', 'Cardio', minutesLabel(s.cardioMinutes), `${round(s.cardioDistance,1)} km consignés/estimés`]
    ];
    return `<div class="mtstats-filter"><span>Vue d’ensemble</span><select id="mtStatsDays" aria-label="Période du tableau de bord"><option value="7" ${selectedDays===7?'selected':''}>7 jours</option><option value="30" ${selectedDays===30?'selected':''}>30 jours</option></select></div>
      <div class="mtstats-grid">${cards.map(([icon,title,value,subtitle])=>`<div class="mtstats-kpi"><span>${safe(title)}</span><strong>${safe(value)}</strong><small>${safe(subtitle)}</small></div>`).join('')}</div>
      <p class="mtstats-note">Les durées proviennent des séances horodatées ; les informations absentes ne sont pas inventées.</p>`;
  }

  function routineName(title) {
    const n = String(title || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const num = n.match(/(?:seance|routine|training)\s*([1-4])\b/);
    if (num) return `Séance ${num[1]}`;
    const abc = n.match(/(?:routine|seance|programme)\s*([abc])\b/);
    if (abc) return `Routine ${abc[1].toUpperCase()}`;
    return String(title || 'Autre séance').trim().slice(0,48);
  }
  function routineComparison() {
    const boundary = daysBack(selectedWeeks * 7);
    const preceding = boundary - selectedWeeks * 7 * 86400000;
    const ws = workouts(validRows());
    const grouped = new Map();
    ws.forEach(w => {
      const t = timestamp(w.start), title = routineName(w.title);
      if (t < preceding) return;
      if (!grouped.has(title)) grouped.set(title, {recent:[],previous:[]});
      grouped.get(title)[t >= boundary ? 'recent' : 'previous'].push(w);
    });
    const metric = w => w.rows.filter(strengthRow).reduce((a,r)=>a+volume(r),0);
    const groups = Array.from(grouped, ([title,g])=>({title,...g})).filter(g=>g.recent.length).sort((a,b)=>b.recent.length-a.recent.length);
    const lines = groups.map(g=>{
      const now = g.recent.reduce((a,w)=>a+metric(w),0)/g.recent.length;
      const before = g.previous.length ? g.previous.reduce((a,w)=>a+metric(w),0)/g.previous.length : null;
      const delta = before > 0 ? (now/before-1)*100 : null;
      const trend = delta == null ? '—' : `${delta >= 0 ? '+' : ''}${round(delta,1)} %`;
      return `<tr><td><strong>${safe(g.title)}</strong><small>${g.recent.length} séance(s)</small></td><td>${round(now)} kg</td><td class="${delta==null?'':delta>=0?'mtstats-up':'mtstats-down'}">${trend}</td></tr>`;
    }).join('');
    return `<div class="mtstats-filter"><span>Comparer les routines</span><select id="mtStatsWeeks" aria-label="Période de comparaison"><option value="4" ${selectedWeeks===4?'selected':''}>4 semaines</option><option value="8" ${selectedWeeks===8?'selected':''}>8 semaines</option><option value="12" ${selectedWeeks===12?'selected':''}>12 semaines</option></select></div>
      ${groups.length?`<div class="mtstats-scroll"><table class="mtstats-table"><thead><tr><th>Routine</th><th>Volume moyen</th><th>Évolution</th></tr></thead><tbody>${lines}</tbody></table></div>`:'<p class="mtstats-empty">Aucune séance sur cette période.</p>'}
      <p class="mtstats-note">Évolution du volume moyen par séance par rapport à la période précédente, pour une même routine. À interpréter avec le nombre de séries et les exercices réalisés.</p>`;
  }

  function plot(entries) {
    const points = entries.filter(e=>e.distance>0).slice(-12);
    if (points.length < 2) return '<p class="mtstats-empty">Deux relevés de distance sont nécessaires pour dessiner la courbe.</p>';
    const width=320, low=106, high=18, left=20, right=308;
    const ys=points.map(e=>e.distance), max=Math.max(...ys), min=Math.min(...ys), range=max-min||1;
    const coords=ys.map((v,i)=>[left+(right-left)*i/(ys.length-1),low-(v-min)/range*(low-high)]);
    const path=coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    return `<svg class="mtstats-chart" viewBox="0 0 ${width} 148" role="img" aria-label="Distance cardio par séance, en kilomètres"><line x1="20" y1="106" x2="308" y2="106" stroke="#516079"/><path d="${path}" fill="none" stroke="#22c55e" stroke-width="3"/>${coords.map(([x,y])=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#86efac"/>`).join('')}<text x="20" y="13">${safe(round(max,2))} km</text><text x="20" y="122">${safe(round(min,2))} km</text><text x="20" y="141">${dateShort(points[0].date)}</text><text x="308" y="141" text-anchor="end">${dateShort(points[points.length-1].date)}</text></svg>`;
  }
  function cardioHtml() {
    const all = periodRows(selectedDays).filter(r=>cardioKind(r)).map(cardioEntry).sort((a,b)=>timestamp(a.date)-timestamp(b.date));
    const selected = all.filter(c=>selectedKind==='tous'||selectedKind===c.kind);
    const total = selected.reduce((acc,c)=>({minutes:acc.minutes+c.minutes,distance:acc.distance+(c.distance||0),ascent:acc.ascent+(c.ascent||0)}),{minutes:0,distance:0,ascent:0});
    const recent = selected.slice(-5).reverse();
    return `<div class="mtstats-filter"><span>Cardio</span><select id="mtStatsKind" aria-label="Type de cardio">${[['tous','Tous'],['tapis','Tapis'],['velo','Vélo'],['course','Course'],['autre','Autre']].map(([id,name])=>`<option value="${id}" ${selectedKind===id?'selected':''}>${name}</option>`).join('')}</select></div>
      <div class="mtstats-inline-kpis"><span><b>${minutesLabel(total.minutes)}</b> de cardio</span><span><b>${round(total.distance,2)} km</b> de distance</span><span><b>+${round(total.ascent)} m</b> D+ enregistré/estimé</span></div>
      ${plot(selected)}
      <div class="mtstats-recent">${recent.length?recent.map(c=>`<div class="mtstats-record"><div><strong>${safe(c.title)}</strong><small>${dateShort(c.date)}</small></div><div><b>${round(c.minutes)} min</b><small>${c.distance!=null?`${c.estimated?'≈':''}${round(c.distance,2)} km`:'Distance —'} · ${c.speed!=null?round(c.speed,1)+' km/h':'Vitesse —'}</small><small>${c.incline!=null?'Pente '+round(c.incline,1)+' % · ':''}${c.ascent!=null?'D+ ≈'+round(c.ascent)+' m · ':''}${c.hr!=null?'FC '+round(c.hr)+' bpm':'FC non renseignée'}</small></div></div>`).join(''):'<p class="mtstats-empty">Aucune donnée de cardio correspondante.</p>'}</div>
      <p class="mtstats-note">Les données estimées (≈) sont distinguées des mesures saisies. Une pente constante est supposée pour le dénivelé du tapis. La FC apparaît seulement si elle a été enregistrée.</p>`;
  }

  function adviceItems() {
    const rows = validRows().filter(strengthRow);
    const grouped = new Map();
    rows.forEach(r=>{const n=r.exercise_title||''; if(!n)return;
      const key=`${n}|${r.start_time}`;
      const previous=grouped.get(key);
      const score=e1rmValue(r);
      if(!previous||score>previous.score)grouped.set(key,{name:n,date:r.start_time,score});
    });
    const byName=new Map();
    grouped.forEach(item=>{if(!byName.has(item.name))byName.set(item.name,[]);byName.get(item.name).push(item);});
    const advice=[];
    byName.forEach((sessions,name)=>{
      sessions.sort((a,b)=>timestamp(a.date)-timestamp(b.date));
      if(sessions.length<4)return;
      const last4=sessions.slice(-4), before=(last4[0].score+last4[1].score)/2, after=(last4[2].score+last4[3].score)/2;
      if(before<=0)return;
      const change=(after-before)/before*100;
      const focus=safe(name);
      if(Math.abs(change)<=2)advice.push({id:`plateau:${name}`,kind:'Stagnation possible',text:`${name} : performances proches sur quatre séances comparables. Pour la prochaine séance, vise une répétition propre supplémentaire avant d'augmenter la charge ; maintiens la charge si la technique ou la récupération le demande.`});
      else if(change>=3)advice.push({id:`progress:${name}`,kind:'Progression',text:`${name} : 1RM estimé en hausse d'environ ${round(change,1)} % entre deux paires de séances. Poursuis avec la même technique et vérifie que les répétitions restent maîtrisées avant de relever l'objectif.`});
      else if(change<=-5)advice.push({id:`down:${name}`,kind:'À surveiller',text:`${name} : performance récente inférieure d'environ ${round(-change,1)} %. Avant de durcir l'entraînement, examine fatigue, sommeil, douleur et conditions de la machine.`});
    });
    const cardioLast7=statsFor(periodRows(7)).cardioMinutes;
    const cardioPrev7=validRows().filter(r=>{const t=timestamp(r.start_time);return t<daysBack(7)&&t>=daysBack(14);}).filter(r=>cardioKind(r)).map(cardioEntry).reduce((a,c)=>a+c.minutes,0);
    if(cardioLast7>0&&cardioPrev7>0&&cardioLast7<cardioPrev7*.75)advice.push({id:'cardio:slowdown',kind:'Cardio',text:`Le temps de cardio enregistré sur les 7 derniers jours est inférieur à la semaine précédente (${round(cardioLast7)} contre ${round(cardioPrev7)} min). Vérifie si c'est lié à tes repos ou à ta récupération avant d'ajuster.`});
    return advice.slice(0,4);
  }
  function getApproved() {try {const x=JSON.parse(localStorage.getItem(APPROVED_KEY)||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
  function saveApproved(items) {localStorage.setItem(APPROVED_KEY,JSON.stringify(items));}
  function adviceHtml() {
    const choices = adviceItems(), accepted=getApproved();
    const html=choices.length?choices.map(a=>{
      const approved=accepted.some(x=>x.id===a.id&&x.text===a.text);
      return `<div class="mtstats-advice"><span class="mtstats-pill">${safe(a.kind)}</span><p>${safe(a.text)}</p><button type="button" class="${approved?'ghost':'secondary'}" data-mt-advice="${safe(a.id)}">${approved?'✓ Conseil validé · Annuler':'Valider ce conseil'}</button></div>`;
    }).join(''):'<p class="mtstats-empty">Après quatre séances sur un même exercice, je pourrai détecter des tendances et proposer des ajustements concrets.</p>';
    return `${html}<p class="mtstats-note">Conseils indicatifs, fondés sur les données disponibles. Valider conserve une consigne pour ta prochaine séance, sans changer automatiquement les charges ni le programme.</p>`;
  }
  function selectedMonth() {
    const now=new Date();
    const defaultMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const val=document.getElementById('mtStatsMonth')?.value||defaultMonth;
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(val)?val:defaultMonth;
  }
  function monthlyRows(month) {
    const [year,m]=month.split('-').map(Number);
    const start=new Date(year,m-1,1).getTime(),end=new Date(year,m,1).getTime();
    return validRows().filter(r=>timestamp(r.start_time)>=start&&timestamp(r.start_time)<end);
  }
  function reportHtml(month) {
    const data=monthlyRows(month), s=statsFor(data), byEx=new Map();
    data.filter(strengthRow).forEach(r=>{
      const name=r.exercise_title||'Exercice',old=byEx.get(name)||{name,weight:0,reps:0,e1rm:0,volume:0};
      old.volume+=volume(r);
      const score=e1rmValue(r);
      if(score>old.e1rm){old.e1rm=score;old.weight=number(r.weight_kg)||0;old.reps=number(r.reps)||0;}
      byEx.set(name,old);
    });
    const strongest=[...byEx.values()].sort((a,b)=>b.e1rm-a.e1rm).slice(0,15);
    const cardio=s.cardio.slice().sort((a,b)=>timestamp(b.date)-timestamp(a.date));
    const section=(header,body)=>`<section><h2>${header}</h2>${body}</section>`;
    const monthLabel=safe(calendarMonth(`${month}-01T12:00:00`));
    const summary=`<div class="report-kpis"><p><b>${s.count}</b><span>séances</span></p><p><b>${safe(minutesLabel(s.durationMinutes))}</b><span>durée connue</span></p><p><b>${round(s.volume)} kg</b><span>volume musculation</span></p><p><b>${safe(minutesLabel(s.cardioMinutes))}</b><span>cardio</span></p></div>`;
    const exerciseTable=strongest.length?`<table><thead><tr><th>Exercice</th><th>Meilleure série</th><th>1RM estimé</th><th>Volume</th></tr></thead><tbody>${strongest.map(e=>`<tr><td>${safe(e.name)}</td><td>${round(e.weight,1)} kg × ${round(e.reps)}</td><td>${round(e.e1rm,1)} kg</td><td>${round(e.volume)} kg</td></tr>`).join('')}</tbody></table>`:'<p>Aucune série de musculation enregistrée.</p>';
    const cardioTable=cardio.length?`<table><thead><tr><th>Date et activité</th><th>Durée</th><th>Distance</th><th>D+ et FC</th></tr></thead><tbody>${cardio.map(c=>`<tr><td>${dateShort(c.date)} · ${safe(c.title)}</td><td>${round(c.minutes)} min</td><td>${c.distance!=null?`${c.estimated?'≈ ':''}${round(c.distance,2)} km`:'—'}</td><td>${c.ascent!=null?'≈ '+round(c.ascent)+' m':'—'} / ${c.hr!=null?round(c.hr)+' bpm':'—'}</td></tr>`).join('')}</tbody></table>`:'<p>Aucun cardio enregistré.</p>';
    const comments=adviceItems().map(a=>`<li>${safe(a.text)}</li>`).join('')||'<li>Pas encore assez de séries comparables pour une analyse automatique fiable.</li>';
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bilan My Training — ${monthLabel}</title><style>
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#162235;font-size:11px;line-height:1.45;margin:0 auto;max-width:900px;padding:22px}header{border-bottom:3px solid #16a34a;padding-bottom:10px;margin-bottom:20px}h1{font-size:24px;margin:0}h2{font-size:15px;color:#166534;border-bottom:1px solid #cbd5e1;padding-bottom:5px}section{margin:20px 0;break-inside:avoid}.report-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.report-kpis p{background:#edf7f0;padding:12px;border-radius:8px;margin:0}.report-kpis b{display:block;font-size:16px}.report-kpis span{color:#475569}table{border-collapse:collapse;width:100%;font-size:10px}th{text-align:left;background:#edf7f0}th,td{border:1px solid #cbd5e1;padding:7px;vertical-align:top}tr{break-inside:avoid}small,.note{color:#526174}.printbtn{background:#166534;color:white;border:0;border-radius:8px;padding:11px 15px;font-size:14px}.printhelp{margin-top:8px}@media print{body{padding:0}.noprint{display:none!important}}@media(max-width:580px){.report-kpis{grid-template-columns:repeat(2,1fr)}body{padding:12px}table{font-size:9px}}
      </style></head><body><div class="noprint"><button class="printbtn" onclick="window.print()">Imprimer / enregistrer en PDF</button><p class="printhelp">Sur Android, choisis « Enregistrer au format PDF » dans les options d'impression.</p></div><header><h1>My Training — Bilan mensuel</h1><p>${monthLabel} · Julien</p></header>
      ${section('Résumé',summary)}${section('Musculation — meilleures performances',exerciseTable)}${section('Cardio',cardioTable)}${section('Tendances et pistes à examiner',`<ul>${comments}</ul>`)}
      <p class="note">Rapport calculé sur l'historique enregistré. 1RM : estimation théorique, non test maximal. Distance et dénivelé marqués ≈ : valeurs estimées. Aucune charge ni séance n'a été modifiée.</p></body></html>`;
  }
  function openReport() {
    const month=selectedMonth(), page=window.open('', '_blank');
    if(!page){alert('Le navigateur a bloqué la fenêtre du bilan. Autorise les fenêtres pour My Training, puis réessaie.');return;}
    page.document.open(); page.document.write(reportHtml(month)); page.document.close();
  }
  function monthControl() {
    const today=new Date(),month=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    return `<div class="mtstats-report"><label for="mtStatsMonth">Mois du bilan</label><input id="mtStatsMonth" type="month" value="${month}"><button id="mtStatsPdf" class="primary" type="button">Préparer le bilan PDF</button><p class="mtstats-note">Une page imprimable s’ouvre. Sur ton Samsung, utilise « Enregistrer au format PDF ».</p></div>`;
  }
  function render() {
    const host=document.getElementById('mtStatsExtra');if(!host)return;
    const preservedMonth=document.getElementById('mtStatsMonth')?.value;
    host.innerHTML=`<div class="card mtstats-card">${summaryHtml()}</div>
      <div class="card mtstats-card"><h3>Comparer mes séances</h3>${routineComparison()}</div>
      <div class="card mtstats-card"><h3>Progression cardio</h3>${cardioHtml()}</div>
      <div class="card mtstats-card"><h3>Analyse et conseils à valider</h3>${adviceHtml()}</div>
      <div class="card mtstats-card"><h3>Bilan mensuel PDF</h3>${monthControl()}</div>
      <div class="mtstats-muscle-heading"><h3>Musculation — détail par exercice</h3><span>Graphiques conservés</span></div>`;
    if(preservedMonth)document.getElementById('mtStatsMonth').value=preservedMonth;
    document.getElementById('mtStatsDays').onchange=e=>{selectedDays=Number(e.target.value);render();};
    document.getElementById('mtStatsWeeks').onchange=e=>{selectedWeeks=Number(e.target.value);render();};
    document.getElementById('mtStatsKind').onchange=e=>{selectedKind=e.target.value;render();};
    document.getElementById('mtStatsPdf').onclick=openReport;
    host.querySelectorAll('[data-mt-advice]').forEach(button=>button.onclick=()=>{
      const item=adviceItems().find(a=>a.id===button.dataset.mtAdvice); if(!item)return;
      const approved=getApproved(),exists=approved.some(a=>a.id===item.id&&a.text===item.text);
      saveApproved(exists?approved.filter(a=>!(a.id===item.id&&a.text===item.text)):[...approved.filter(a=>a.id!==item.id),{...item,at:new Date().toISOString()}].slice(-12));
      render();renderApprovedWorkoutNotes();
    });
  }
  function renderApprovedWorkoutNotes() {
    const view=document.getElementById('workoutView');if(!view)return;
    let notes=document.getElementById('mtStatsApprovedNotes');
    if(!notes){notes=document.createElement('div');notes.id='mtStatsApprovedNotes';view.querySelector('.workout-head')?.after(notes);}
    const approved=getApproved().slice(-3);
    notes.innerHTML=approved.length?`<div class="mtstats-approved"><strong>Consignes que tu as validées</strong>${approved.map(a=>`<p>${safe(a.text)}</p>`).join('')}<small>Ces rappels ne changent pas automatiquement tes charges.</small></div>`:'';
  }
  function install() {
    const stats=document.getElementById('statsView');if(!stats||typeof showView!=='function')return;
    const host=document.createElement('div');host.id='mtStatsExtra';stats.insertBefore(host,stats.querySelector('.card'));
    const original=showView;
    showView=function(id){original(id);if(id==='statsView')render();if(id==='workoutView')renderApprovedWorkoutNotes();};
    const style=document.createElement('style');style.textContent=`
      #statsView .metric-tabs{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}#statsView .metric-btn{padding:10px 4px;font-size:11px}
      .mtstats-card{margin-bottom:12px}.mtstats-card h3{font-size:17px;margin-bottom:12px}.mtstats-filter{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}.mtstats-filter>span{font-size:14px;font-weight:800}.mtstats-filter select{width:auto;max-width:56%;padding:8px 10px;background:#0e1727;color:#f8fafc;border-radius:10px;font-size:13px}
      .mtstats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mtstats-kpi{background:#1a2940;border:1px solid #2f4159;border-radius:13px;padding:12px;min-width:0;display:grid;gap:5px}.mtstats-kpi span{font-size:12px;color:#b5c4d6}.mtstats-kpi strong{font-size:21px;letter-spacing:-.025em;overflow-wrap:anywhere}.mtstats-kpi small{font-size:11px;color:#91a4bd}.mtstats-note{font-size:11px;color:#94a3b8;line-height:1.45;margin-top:11px}.mtstats-empty{color:#94a3b8;font-size:13px;padding:14px 0}
      .mtstats-scroll{width:100%;overflow:auto}.mtstats-table{border-collapse:collapse;width:100%;font-size:12px;min-width:285px}.mtstats-table th{text-align:left;font-size:10px;color:#94a3b8;padding:8px 6px;border-bottom:1px solid #304054}.mtstats-table td{padding:12px 6px;border-bottom:1px solid #26344c;vertical-align:top}.mtstats-table small{display:block;color:#94a3b8;margin-top:4px}.mtstats-up{color:#86efac;font-weight:800}.mtstats-down{color:#fca5a5;font-weight:800}
      .mtstats-inline-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.mtstats-inline-kpis>span{font-size:10px;color:#b1bfd1;background:#1a2940;padding:9px;border-radius:10px;line-height:1.4}.mtstats-inline-kpis b{display:block;color:#f8fafc;font-size:13px}.mtstats-chart{display:block;width:100%;max-height:170px;margin:13px 0}.mtstats-record{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #2f4057}.mtstats-record>div:first-child{max-width:48%}.mtstats-record>div:last-child{text-align:right;max-width:52%}.mtstats-record strong,.mtstats-record b{display:block;font-size:12px}.mtstats-record small{display:block;font-size:10px;color:#a9b9ce;margin-top:3px}
      .mtstats-advice{border:1px solid #354766;background:#16243a;padding:12px;border-radius:12px;margin-bottom:9px}.mtstats-advice p{font-size:13px;line-height:1.5;margin:8px 0 11px}.mtstats-advice button{font-size:12px;padding:9px 11px}.mtstats-pill{display:inline-block;font-size:10px;color:#86efac;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.mtstats-report{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:8px}.mtstats-report label{grid-column:1/-1;margin:0}.mtstats-report input{background:#0e1727;border:1px solid #34445c;border-radius:10px;color:white;min-width:0;width:100%;padding:10px;font-size:14px}.mtstats-report button{white-space:nowrap;font-size:12px}.mtstats-report .mtstats-note{grid-column:1/-1;margin:0}.mtstats-muscle-heading{display:flex;justify-content:space-between;align-items:center;margin:16px 3px 10px;gap:8px}.mtstats-muscle-heading h3{font-size:16px}.mtstats-muscle-heading span{font-size:10px;color:#86efac;flex-shrink:0}
      .mtstats-approved{border:1px solid #22c55e;background:#0c251a;padding:12px;border-radius:12px;margin-bottom:14px}.mtstats-approved strong{display:block;color:#bbf7d0;font-size:13px;margin-bottom:8px}.mtstats-approved p{font-size:12px;line-height:1.45;margin:8px 0}.mtstats-approved small{font-size:11px;color:#86efac}
      @media(max-width:365px){.mtstats-kpi strong{font-size:17px}.mtstats-record small{font-size:9px}.mtstats-report{grid-template-columns:1fr}.mtstats-report button{width:100%}}
    `;document.head.append(style);
    window.mtStatsRender=render;
    if(stats.classList.contains('active'))render();
  }
  install();
})();
