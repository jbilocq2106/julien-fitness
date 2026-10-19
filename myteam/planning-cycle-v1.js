(() => {
  'use strict';
  const section = document.querySelector('#planning');
  const grid = section?.querySelector('#grid');
  const monthEl = section?.querySelector('#month');
  if (!grid || !monthEl || window.MyTeamCycleCalendar) return;

  // Team 4 reference: 17–18 October 2026 = mornings, then A/A, N/N, R/R.
  const ANCHOR = Date.UTC(2026, 9, 17);
  const FIRST_MONTH = 2026 * 12 + 9;
  const LAST_MONTH = 2027 * 12 + 11;
  const CDE_START = '2026-11-01';
  const PATTERN = ['morning', 'morning', 'afternoon', 'afternoon', 'night', 'night', 'rest', 'rest'];
  const TYPES = { morning: 'Matin', afternoon: 'Après-midi', night: 'Nuit', rest: 'Repos' };
  const SHIFT_HOURS = { morning: '05h–13h', afternoon: '13h–21h', night: '21h–05h' };
  const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
  const currentDate = new Date();
  let selected = Math.max(FIRST_MONTH, Math.min(LAST_MONTH, currentDate.getFullYear() * 12 + currentDate.getMonth()));
  let swipeStart = null;
  let blockClickUntil = 0;

  function projected(date) {
    const [year, month, day] = date.split('-').map(Number);
    const days = Math.round((Date.UTC(year, month - 1, day) - ANCHOR) / 86400000);
    return PATTERN[((days % 8) + 8) % 8];
  }
  function officialRows(date) {
    const active = read('myteam_shifts', []);
    const rows = Array.isArray(active) ? active.filter(s => s?.date === date) : [];
    if (rows.length) return rows;
    const history = read('myteam_planning_history', {});
    const archived = history?.[date.slice(0, 7)]?.rows;
    return Array.isArray(archived) ? archived.filter(s => s?.date === date) : [];
  }
  function rowType(row) {
    if (row.type === 'training' || /formation/i.test(String(row.post || ''))) return 'training';
    if (['morning', 'afternoon', 'night'].includes(row.type)) return row.type;
    if (/cong[eé]|repos|vacances?/i.test(String(row.post || ''))) return 'rest';
    const hour = Number(String(row.start || '').slice(0, 2));
    if (!Number.isFinite(hour)) return 'morning';
    return hour >= 20 || hour < 4 ? 'night' : hour >= 12 ? 'afternoon' : 'morning';
  }
  function changeMonth(delta) {
    const next = Math.max(FIRST_MONTH, Math.min(LAST_MONTH, selected + delta));
    if (next === selected) return;
    selected = next;
    render();
  }
  function render() {
    const year = Math.floor(selected / 12);
    const monthIndex = selected % 12;
    const dateMonth = new Date(year, monthIndex, 1);
    const title = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(dateMonth);
    const firstOffset = (dateMonth.getDay() + 6) % 7;
    const daysCount = new Date(year, monthIndex + 1, 0).getDate();
    const today = iso(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    monthEl.innerHTML = '';
    const header = document.createElement('span');
    header.className = 'mt-cycle-header';
    header.dataset.cycleHeader = '1';
    const previous = document.createElement('button');
    previous.type = 'button'; previous.className = 'mt-cycle-arrow'; previous.textContent = '‹';
    previous.disabled = selected === FIRST_MONTH;
    previous.setAttribute('aria-label', 'Mois précédent');
    previous.addEventListener('click', () => changeMonth(-1));
    const monthLabel = document.createElement('strong');
    monthLabel.textContent = title;
    monthLabel.setAttribute('aria-live', 'polite');
    const next = document.createElement('button');
    next.type = 'button'; next.className = 'mt-cycle-arrow'; next.textContent = '›';
    next.disabled = selected === LAST_MONTH;
    next.setAttribute('aria-label', 'Mois suivant');
    next.addEventListener('click', () => changeMonth(1));
    header.append(previous, monthLabel, next);
    const hint = document.createElement('small');
    hint.className = 'mt-cycle-hint';
    hint.textContent = 'Balaye vers la gauche pour le mois suivant · Cycle théorique 2M / 2A / 2N / 2R';
    monthEl.append(header, hint);

    const fragment = document.createDocumentFragment();
    WEEKDAYS.forEach((name, index) => {
      const el = document.createElement('div');
      el.className = 'weekday' + (index >= 5 ? ' weekend' : '');
      el.textContent = name;
      fragment.append(el);
    });
    for (let index = 0; index < firstOffset; index++) fragment.append(document.createElement('div'));
    for (let day = 1; day <= daysCount; day++) {
      const date = iso(year, monthIndex, day);
      const rows = officialRows(date);
      const phase = projected(date);
      const actual = rows.length > 0;
      const type = actual ? rowType(rows[0]) : phase;
      const cde = date >= CDE_START && (actual ? type !== 'rest' && type !== 'training' : phase !== 'rest');
      const col = (firstOffset + day - 1) % 7;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `day mt-cycle-day ${type}${col >= 5 ? ' we' : ''}${date === today ? ' mt-cycle-today' : ''}`;
      el.dataset.cycleDay = date;
      const number = document.createElement('b'); number.textContent = String(day);
      const summary = document.createElement('span');
      summary.textContent = actual ? rows.map(r => r.start || r.post || 'Vacation').join(' / ') : TYPES[phase];
      const detail = document.createElement('small');
      detail.className = 'mt-cycle-detail';
      detail.textContent = actual ? `${rows[0]?.post || 'Importé'}${cde && !/CDE|chef d[e’']équipe/i.test(String(rows[0]?.post || '')) ? ' · CDE' : ''}` : phase === 'rest' ? 'Cycle' : `${SHIFT_HOURS[phase]}${cde ? ' · CDE' : ''}`;
      el.append(number, summary, detail);
      const accessible = `${day} ${title} : ${actual ? 'planning importé' : 'cycle théorique'}, ${actual ? rows.map(r => `${r.start || ''}–${r.end || ''} ${r.post || ''}`).join(', ') : `${TYPES[phase]} ${SHIFT_HOURS[phase] || ''}`.trim()}${cde ? ', chef d’équipe' : ''}`;
      el.setAttribute('aria-label', accessible);
      el.addEventListener('click', () => {
        if (Date.now() < blockClickUntil) return;
        const description = actual
          ? rows.map(r => `${r.start || '--:--'} – ${r.end || '--:--'} · ${r.post || 'Vacation'}`).join('\n') + (cde ? '\nFonction : chef d’équipe (CDE).' : '')
          : `${TYPES[phase]}${phase === 'rest' ? '' : ' · ' + SHIFT_HOURS[phase] + (phase === 'night' ? ' (fin le lendemain)' : '')}${cde ? ' · CDE (chef d’équipe)' : ''}\nRoulement théorique, à confirmer avec le planning officiel.`;
        alert(`${date}\n${description}`);
      });
      fragment.append(el);
    }
    grid.replaceChildren(fragment);
    grid.dataset.cycleMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  }

  const style = document.createElement('style');
  style.id = 'mt-cycle-style';
  style.textContent = `
    #month{margin:10px 0 12px}
    .mt-cycle-header{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .mt-cycle-header strong{font-size:18px;text-transform:capitalize;color:#f5f7fb;text-align:center}
    .mt-cycle-arrow{flex:0 0 41px;padding:7px 12px;font-size:26px;line-height:1;background:#314762;border:1px solid #526581}
    .mt-cycle-arrow:disabled{opacity:.3;cursor:default}
    .mt-cycle-hint{display:block;margin:8px 1px 0;color:#bac8d9;font-size:11px;line-height:1.45}
    #grid{touch-action:pan-y;overscroll-behavior-x:contain}
    #grid .mt-cycle-day{min-width:0;width:100%;font:inherit;font-size:12px;font-weight:400;color:#fff;border:0;cursor:pointer;padding:5px 2px}
    #grid .mt-cycle-day b{font-size:13px;margin-bottom:6px}
    #grid .mt-cycle-day span{font-size:11px;font-weight:650;overflow-wrap:anywhere}
    #grid .mt-cycle-day .mt-cycle-detail{display:block;font-size:9px;line-height:1.3;margin-top:5px;color:#eef2f8;overflow-wrap:anywhere}
    #grid .mt-cycle-day.rest{background:#354052}
    #grid .mt-cycle-day.mt-cycle-today{box-shadow:inset 0 0 0 2px #fff}
    #grid .mt-cycle-day:focus-visible{outline:3px solid #fff;outline-offset:1px}
    @media(max-width:390px){#grid .mt-cycle-day{min-height:74px}#grid .mt-cycle-day .mt-cycle-detail{font-size:8px}}
  `;
  document.head.append(style);

  grid.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { swipeStart = null; return; }
    swipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  grid.addEventListener('touchend', event => {
    if (!swipeStart || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - swipeStart.x;
    const dy = event.changedTouches[0].clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      blockClickUntil = Date.now() + 500;
      changeMonth(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
  grid.addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });
  grid.addEventListener('click', event => {
    if (Date.now() < blockClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);

  // The legacy JSON importer redraws #month and #grid; restore this navigation afterward.
  const observer = new MutationObserver(() => {
    const count = new Date(Math.floor(selected / 12), selected % 12 + 1, 0).getDate();
    if (!monthEl.querySelector('[data-cycle-header]') || grid.querySelectorAll('[data-cycle-day]').length !== count) {
      queueMicrotask(render);
    }
  });
  observer.observe(monthEl, { childList: true });
  observer.observe(grid, { childList: true });
  window.addEventListener('storage', event => {
    if (['myteam_shifts', 'myteam_planning_history'].includes(event.key)) render();
  });

  window.MyTeamCycleCalendar = { render, projected, changeMonth };
  render();
})();
