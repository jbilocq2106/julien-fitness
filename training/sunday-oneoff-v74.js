/* My Training — adaptation exceptionnelle du dimanche 18 octobre 2026.
   La séance S4 de référence dans program.json reste inchangée. */
(function () {
  'use strict';

  const specialDate = '2026-10-18';
  const exerciseChanges = {
    'Presse à cuisses': {
      name: 'Pec Fly machine',
      sets: [{ reps: '12', weight: 45 }, { reps: '10–12', weight: 52 }, { reps: '8–10', weight: 52 }],
      rest: 75,
      note: 'Remplace la presse uniquement aujourd’hui. Garde 1–2 répétitions en réserve.'
    },
    'Leg Curl assis': {
      name: 'Curl pupitre machine',
      sets: [{ reps: '12', weight: 23 }, { reps: '10–14', weight: 27 }],
      rest: 60,
      note: 'Remplace le leg curl uniquement aujourd’hui. Pas d’élan.'
    }
  };
  const treadmillNote = 'Aujourd’hui seulement : 15–20 min à 4,5–5,0 km/h, pente 0–1 %, uniquement si la marche est indolore. Arrêter si le mollet fait mal.';

  function parisDate(dateLike) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(dateLike));
    const get = type => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  function todayIsSpecial() {
    return parisDate(Date.now()) === specialDate;
  }

  function adaptProgramForToday() {
    if (!todayIsSpecial() || !state.program?.sessions) return false;
    const sunday = state.program.sessions.find(s => s.id === 'S4');
    if (!sunday || sunday.oneOffCalves20261018) return false;

    sunday.exercises = sunday.exercises.map(e => {
      const replacement = exerciseChanges[e.name];
      if (replacement) return { ...replacement, sets: replacement.sets.map(s => ({ ...s })) };
      if (e.name === 'Tapis incliné') {
        return { ...e, sets: [{ reps: '15–20 min', weight: 0 }], note: treadmillNote };
      }
      return e;
    });
    sunday.focus = 'Exception du 18 octobre : pecs et biceps à la place des jambes • tapis doux';
    sunday.day_hint = 'Aujourd’hui seulement • mollets ménagés';
    sunday.oneOffCalves20261018 = true;
    return true;
  }

  function adaptWorkoutAlreadyStarted() {
    const workout = state.activeWorkout;
    if (!workout || workout.id !== 'S4' || parisDate(workout.started) !== specialDate || workout.oneOffCalves20261018) return;
    let changed = false;

    workout.exercises = workout.exercises.map(e => {
      const replacement = exerciseChanges[e.name];
      if (replacement && !(e.sets || []).some(s => s.done)) {
        changed = true;
        return {
          ...e, name: replacement.name, note: replacement.note,
          rest: replacement.rest, superset: null, autoTarget: null, cardio: null,
          sets: replacement.sets.map((s, i) => ({
            i: i + 1, targetReps: s.reps, targetWeight: s.weight,
            weight: s.weight, reps: '', rir: '', done: false
          }))
        };
      }
      if (e.name === 'Tapis incliné' && e.cardio && !e.cardio.done) {
        e.note = treadmillNote;
        if (String(e.cardio.incline || '') === '10') e.cardio.incline = '0';
        if (String(e.cardio.speed || '') === '5.5') e.cardio.speed = '4.8';
        if (!e.cardio.duration) e.cardio.duration = '15';
        changed = true;
      }
      return e;
    });

    if (changed) {
      workout.name = 'Séance 4 — Full Body (mollets ménagés)';
      workout.oneOffCalves20261018 = true;
      save();
      renderWorkout();
    }
  }

  const oldRenderProgram = renderProgram;
  renderProgram = function () {
    adaptProgramForToday();
    return oldRenderProgram();
  };
  window.renderProgram = renderProgram;

  if (state.program) {
    adaptProgramForToday();
    renderProgram();
    renderHome();
  }
  adaptWorkoutAlreadyStarted();
})();
