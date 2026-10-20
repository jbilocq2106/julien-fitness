/* My Training v95 — séries chronométrées avec dépassement de l'objectif. */
(function () {
  'use strict';
  function targetSeconds(value) {
    const text = String(value || '').trim();
    const match = text.match(/(\d+)\s*(?:[–—-]\s*(\d+)\s*)?(?:s\b|sec(?:onde)?s?\b)/i);
    return match ? Math.max(1, Number(match[2] || match[1])) : 0;
  }
  function fmt(seconds) {
    const n = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(n / 3600);
    const m = Math.floor(n % 3600 / 60);
    const s = n % 60;
    return (h ? String(h).padStart(2, '0') + ':' : '') +
      String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function elapsedMs(set) {
    const prior = Math.max(0, Number(set.timedElapsedMs) || 0);
    const since = set.timedStartedAt ? Math.max(0, Date.now() - Number(set.timedStartedAt)) : 0;
    return prior + since;
  }
  function timedSets() {
    const found = [];
    (state.activeWorkout?.exercises || []).forEach((exercise, ei) => {
      (exercise.sets || []).forEach((set, si) => {
        const target = targetSeconds(set.targetReps);
        if (target) found.push({exercise, set, ei, si, target});
      });
    });
    return found;
  }
  function stopRunning(set) {
    if (set.timedStartedAt) {
      set.timedElapsedMs = elapsedMs(set);
      set.timedStartedAt = null;
    }
  }
  function setAction(ei, si, action) {
    const workout = state.activeWorkout;
    const exercise = workout?.exercises?.[ei];
    const set = exercise?.sets?.[si];
    if (!set || !targetSeconds(set.targetReps)) return;
    if (action === 'start') {
      timedSets().forEach(item => {
        if (item.set !== set) stopRunning(item.set);
      });
      set.done = false;
      set.durationSeconds = 0;
      set.timedStartedAt = Date.now();
    } else if (action === 'pause') {
      stopRunning(set);
    } else if (action === 'stop') {
      set.durationSeconds = Math.max(1, Math.round(elapsedMs(set) / 1000));
      set.timedElapsedMs = 0;
      set.timedStartedAt = null;
      set.reps = '';
      set.done = true;
    } else if (action === 'reset') {
      set.durationSeconds = 0;
      set.timedElapsedMs = 0;
      set.timedStartedAt = null;
      set.reps = '';
      set.done = false;
    }
    save();
    renderWorkout();
    if (action === 'stop' && exercise.rest && shouldStartRestAfter(ei)) startTimer(exercise.rest);
  }
  function updateDisplays() {
    const workout = state.activeWorkout;
    if (!workout) return;
    document.querySelectorAll('.mt-timed-controls').forEach(control => {
      const row = control.closest('.set-row');
      const set = workout.exercises?.[Number(row?.dataset.e)]?.sets?.[Number(row?.dataset.s)];
      if (!set) return;
      const target = targetSeconds(set.targetReps);
      const elapsed = Math.floor(elapsedMs(set) / 1000);
      const running = Boolean(set.timedStartedAt);
      const paused = !running && elapsed > 0 && !set.done;
      const clock = control.querySelector('.mt-timed-display');
      clock.textContent = set.done ? fmt(set.durationSeconds) :
        elapsed <= target ? fmt(target - elapsed) : '+' + fmt(elapsed - target);
      clock.classList.toggle('mt-timed-overtime', (running || paused || set.done) &&
        (set.done ? Number(set.durationSeconds) > target : elapsed > target));
      control.querySelector('[data-timed-action="start"]').hidden = running || set.done;
      control.querySelector('[data-timed-action="start"]').textContent = paused ? 'Reprendre' : 'Démarrer';
      control.querySelector('[data-timed-action="pause"]').hidden = !running;
      control.querySelector('[data-timed-action="stop"]').hidden = !running && !paused;
      control.querySelector('[data-timed-action="reset"]').hidden = !running && !paused && !set.done;
      control.querySelector('.mt-timed-status').textContent = set.done ? 'Durée enregistrée' :
        running ? 'En cours' : paused ? 'En pause' : 'Prêt';
    });
  }
  function decorateWorkout() {
    if (!state.activeWorkout) return;
    document.querySelectorAll('#exerciseList .set-row').forEach(row => {
      const ei = Number(row.dataset.e);
      const si = Number(row.dataset.s);
      const set = state.activeWorkout.exercises?.[ei]?.sets?.[si];
      if (!set) return;
      const target = targetSeconds(set.targetReps);
      if (!target) return;
      row.classList.add('mt-timed-set-row');
      if (row.querySelector('.mt-timed-controls')) return;
      const controls = document.createElement('div');
      controls.className = 'mt-timed-controls';
      controls.innerHTML =
        '<div class="mt-timed-information"><span class="mt-timed-label">Objectif ' + fmt(target) +
        '</span><strong class="mt-timed-display" aria-live="off">' + fmt(target) +
        '</strong><small class="mt-timed-status">Prêt</small></div>' +
        '<div class="mt-timed-buttons">' +
        '<button type="button" class="primary" data-timed-action="start">Démarrer</button>' +
        '<button type="button" class="ghost" data-timed-action="pause" hidden>Pause</button>' +
        '<button type="button" class="primary" data-timed-action="stop" hidden>Arrêter et enregistrer</button>' +
        '<button type="button" class="ghost" data-timed-action="reset" hidden>Recommencer</button>' +
        '</div>';
      row.appendChild(controls);
      controls.querySelectorAll('[data-timed-action]').forEach(button => {
        button.onclick = () => setAction(ei, si, button.dataset.timedAction);
      });
    });
    updateDisplays();
  }
  const css = document.createElement('style');
  css.textContent = [
    '.mt-timed-set-row > input[data-field], .mt-timed-set-row > .done {display:none!important}',
    '.mt-timed-set-row .mt-timed-controls {grid-column:1/-1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:10px 2px}',
    '.mt-timed-information {display:flex;align-items:center;flex-wrap:wrap;gap:10px}',
    '.mt-timed-label,.mt-timed-status {font-size:12px;opacity:.78}',
    '.mt-timed-display {font-variant-numeric:tabular-nums;font-size:26px;line-height:1.2}',
    '.mt-timed-overtime {color:#f59e0b}',
    '.mt-timed-buttons {display:flex;flex-wrap:wrap;gap:7px}',
    '.mt-timed-buttons button {min-height:39px;padding:8px 11px}',
    '.mt-timed-buttons button[hidden] {display:none!important}',
    '.timed-history-row {display:flex;justify-content:space-between;gap:12px;padding:7px 2px;border-bottom:1px solid rgba(150,150,150,.2)}',
    '.timed-history-row strong {font-variant-numeric:tabular-nums}'
  ].join('\n');
  document.head.appendChild(css);
  const previousRender = renderWorkout;
  renderWorkout = function () {
    const result = previousRender.apply(this, arguments);
    decorateWorkout();
    return result;
  };
  window.renderWorkout = renderWorkout;
  const finishButton = document.getElementById('finishWorkoutBtn');
  const previousFinish = finishButton.onclick;
  finishButton.onclick = function (event) {
    let changed = false;
    timedSets().forEach(item => {
      if (!item.set.timedStartedAt) return;
      const set = item.set;
      set.durationSeconds = Math.max(1, Math.round(elapsedMs(set) / 1000));
      set.timedElapsedMs = 0;
      set.timedStartedAt = null;
      set.reps = '';
      set.done = true;
      changed = true;
    });
    if (changed) save();
    return previousFinish.call(this, event);
  };
  setInterval(updateDisplays, 250);
  document.addEventListener('visibilitychange', updateDisplays);
  if (state.activeWorkout) renderWorkout();
})();