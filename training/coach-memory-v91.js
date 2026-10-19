/* My Training v91 — mémoire du tapis, cible modérée et compléments de séance 1.
   Ne remplace jamais une saisie existante dans une séance déjà commencée. */
(function () {
  'use strict';

  const readNumber = value => {
    if (value == null || String(value).trim() === '') return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const decimal = value => String(Math.round(value * 10) / 10);
  const fr = value => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
  const namesMatch = name => /\btapis\b/i.test(String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  function latestTreadmill(exerciseName) {
    const rows = (state.history || []).filter(row => {
      if (!namesMatch(row.exercise_title)) return false;
      if (row.set_type !== 'cardio' && !(readNumber(row.distance_km) > 0)) return false;
      return [row.speed_kmh, row.incline_percent, row.duration_seconds, row.distance_km].some(v => readNumber(v) != null);
    }).sort((a, b) => Date.parse(b.start_time || '') - Date.parse(a.start_time || ''));
    const exact = rows.find(row => normText(row.exercise_title) === normText(exerciseName));
    return exact || rows[0] || null;
  }

  function lastMetrics(row) {
    if (!row) return null;
    const durationSeconds = readNumber(row.duration_seconds);
    return {
      date: row.start_time || '',
      duration: durationSeconds != null && durationSeconds > 0 ? durationSeconds / 60 : null,
      speed: readNumber(row.speed_kmh),
      incline: readNumber(row.incline_percent),
      distance: readNumber(row.distance_km),
      heartRate: readNumber(row.avg_hr_bpm)
    };
  }

  function plannedDuration(note) {
    const range = String(note || '').match(/(\d+)\s*[–-]\s*(\d+)\s*min/i);
    if (range) return [Number(range[1]), Number(range[2])];
    const exact = String(note || '').match(/(\d+)\s*min/i);
    return exact ? [Number(exact[1]), Number(exact[1])] : null;
  }

  function suggestedCardio(exercise, initial) {
    const previous = lastMetrics(latestTreadmill(exercise.name));
    const cardio = { ...initial };
    const durationRange = plannedDuration(exercise.note);
    if (!previous) {
      if (durationRange && !cardio.duration) cardio.duration = String(durationRange[0]);
      return cardio;
    }

    // Se rapprocher des performances enregistrées sans sauter brutalement
    // d'intensité : le tapis suit une séance de musculation et reste modulable.
    if (durationRange && previous.duration != null) {
      cardio.duration = String(Math.round(Math.min(durationRange[1], Math.max(durationRange[0], previous.duration))));
    } else if (!cardio.duration && previous.duration != null) {
      cardio.duration = String(Math.round(previous.duration));
    }
    const targetSpeed = readNumber(initial.speed);
    if (previous.speed != null && previous.speed > 0) {
      cardio.speed = targetSpeed != null && targetSpeed > 0
        ? decimal(previous.speed > targetSpeed
          ? (targetSpeed + previous.speed) / 2
          : Math.min(targetSpeed, previous.speed + 0.1))
        : decimal(previous.speed);
    }
    const targetIncline = readNumber(initial.incline);
    if (previous.incline != null && previous.incline >= 0) {
      cardio.incline = targetIncline != null && targetIncline >= 0
        ? decimal(previous.incline > targetIncline
          ? Math.min(targetIncline + 4, (targetIncline + previous.incline) / 2)
          : Math.min(targetIncline, previous.incline + 1))
        : decimal(previous.incline);
    }
    cardio.lastRecorded = previous;
    return cardio;
  }

  if (typeof parseCardioDefaults === 'function') {
    const previousDefaults = parseCardioDefaults;
    parseCardioDefaults = function (exercise) {
      return suggestedCardio(exercise, previousDefaults(exercise));
    };
    window.parseCardioDefaults = parseCardioDefaults;
  }

  const EXTRA_DATE = '2026-10-19';
  const luxDay = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Luxembourg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const extrasTonight = [
    { name: 'Curl incliné haltères (supination)', coachOrder: 7, sets: [{ reps: '10–12', weight: null }, { reps: '10–12', weight: null }], rest: 60, note: 'Biceps : bras légèrement derrière le buste, supination contrôlée, 1–2 répétitions en réserve.' },
    { name: 'Extensions des poignets haltères', coachOrder: 8, sets: [{ reps: '15–20', weight: null }, { reps: '15–20', weight: null }], rest: 45, note: 'Avant-bras/extenseurs : avant-bras appuyés, poignets seuls en mouvement, charge légère.' }
  ];
  function injectExtrasTonight() {
    if (luxDay(new Date()) !== EXTRA_DATE) return false;
    const planned = state.program?.sessions?.find(session => session.id === 'S1');
    if (!planned || extrasTonight.every(extra => planned.exercises.some(e => e.name === extra.name))) return false;
    planned.exercises.forEach(exercise => { if (Number(exercise.coachOrder) >= 7) exercise.coachOrder += 2; });
    extrasTonight.forEach(extra => {
      if (!planned.exercises.some(e => e.name === extra.name)) planned.exercises.push({ ...extra, sets: extra.sets.map(set => ({ ...set })) });
    });
    planned.exercises.sort((a, b) => Number(a.coachOrder) - Number(b.coachOrder));
    return true;
  }
  function preserveActiveS1() {
    const workout = state.activeWorkout;
    if (!workout || workout.id !== 'S1' || workout.testMode) return false;
    if (luxDay(new Date(workout.started)) !== EXTRA_DATE) return false;
    const planned = state.program?.sessions?.find(session => session.id === 'S1');
    if (!planned) return false;
    let changed = false;
    for (const name of extrasTonight.map(extra => extra.name)) {
      if (workout.exercises.some(e => normText(e.name) === normText(name))) continue;
      const item = planned.exercises.find(e => normText(e.name) === normText(name));
      if (!item) continue;
      const exercise = {
        name: item.name, note: item.note || '', rest: item.rest || 0,
        superset: item.superset || null, autoTarget: item.autoTarget || null,
        cardio: null,
        sets: item.sets.map((set, i) => ({
          i: i + 1, targetReps: set.reps, targetWeight: set.weight,
          weight: set.weight ?? '', reps: '', rir: '', done: false
        }))
      };
      const firstCore = workout.exercises.findIndex(e => /crunch|pallof|vacuum/i.test(e.name));
      workout.exercises.splice(firstCore < 0 ? workout.exercises.length : firstCore, 0, exercise);
      changed = true;
    }
    const treadmill = workout.exercises.find(e => namesMatch(e.name) && e.cardio && !e.cardio.done);
    const plannedTreadmill = planned.exercises.find(e => namesMatch(e.name));
    if (treadmill && plannedTreadmill) {
      const suggested = parseCardioDefaults(plannedTreadmill);
      for (const key of ['duration', 'speed', 'incline']) {
        if ((treadmill.cardio[key] == null || treadmill.cardio[key] === '') && suggested[key] != null && suggested[key] !== '') {
          treadmill.cardio[key] = suggested[key]; changed = true;
        }
      }
    }
    if (changed) save();
    return changed;
  }

  function decorateWorkout() {
    if (!state.activeWorkout) return;
    document.querySelectorAll('#exerciseList .cardio-grid').forEach(grid => {
      const index = Number(grid.dataset.e), exercise = state.activeWorkout.exercises[index];
      if (!exercise?.cardio || !namesMatch(exercise.name)) return;
      const previous = lastMetrics(latestTreadmill(exercise.name));
      if (!previous || grid.parentElement?.querySelector('.mt-treadmill-memory')) return;
      const parts = [
        previous.duration != null ? `${fr(previous.duration)} min` : null,
        previous.speed != null ? `${fr(previous.speed)} km/h` : null,
        previous.incline != null ? `${fr(previous.incline)} %` : null,
        previous.distance != null ? `${fr(previous.distance)} km` : null,
        previous.heartRate != null ? `${fr(previous.heartRate)} bpm` : null
      ].filter(Boolean);
      const date = new Date(previous.date);
      const dateText = Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR') : 'précédemment';
      const card = document.createElement('div');
      card.className = 'mt-treadmill-memory';
      const heading = document.createElement('strong'); heading.textContent = `Dernier tapis enregistré (${dateText})`;
      const details = document.createElement('div'); details.textContent = parts.join(' • ');
      const advice = document.createElement('small'); advice.textContent = 'La proposition tient compte du dernier résultat et réduit la charge pour le tapis après musculation. Adapte vitesse, inclinaison et durée à tes sensations.';
      card.append(heading, details, advice);
      grid.after(card);
    });
  }

  const style = document.createElement('style');
  style.textContent = `.mt-treadmill-memory{margin:10px 0 13px;padding:12px;border:1px solid #438b80;border-radius:12px;background:rgba(13,148,136,.12);display:grid;gap:5px;font-size:13px}.mt-treadmill-memory strong{color:#b8fae6}.mt-treadmill-memory small{color:#c5d7dc;font-size:11px;line-height:1.5}`;
  document.head.appendChild(style);

  if (typeof renderWorkout === 'function') {
    const previousRender = renderWorkout;
    renderWorkout = function () { const result = previousRender(); decorateWorkout(); return result; };
    window.renderWorkout = renderWorkout;
  }
  if (typeof renderProgram === 'function') {
    const previousProgram = renderProgram;
    renderProgram = function () {
      injectExtrasTonight();
      const result = previousProgram();
      if (preserveActiveS1() && state.activeWorkout) renderWorkout();
      return result;
    };
    window.renderProgram = renderProgram;
  }
  if (injectExtrasTonight()) renderProgram();
  else if (preserveActiveS1() && state.activeWorkout) renderWorkout();
  else decorateWorkout();
})();
