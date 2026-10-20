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
  const LEAVE_KEY = 'myteam_paid_leave_days_v1';
  const leaveDays = () => new Set((read(LEAVE_KEY, []) || []).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(String(date))));
  const isLeave = row => row?.type === 'leave' || /vacances?|cong[eé]/i.test(String(row?.post || ''));
  let leaveEditMode = false;
  const currentDate = new Date();
  let selected = Math.max(FIRST_MONTH, Math.min(LAST_MONTH, currentDate.getFullYear() * 12 + currentDate.getMonth()));
  let swipeStart = null;
  let blockClickUntil = 0;

  function luxHolidays(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  const easter=new Date(year,mo-1,day);
  const add=(date,n)=>{const x=new Date(date);x.setDate(x.getDate()+n);return x};
  const iso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  return new Set([new Date(year,0,1),add(easter,1),new Date(year,4,1),new Date(year,4,9),add(easter,39),add(easter,50),new Date(year,5,23),new Date(year,7,15),new Date(year,10,1),new Date(year,11,25),new Date(year,11,26)].map(iso));
}
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
    if (isLeave(row)) return 'leave';
    if (row.type === 'training' || /formation/i.test(String(row.post || ''))) return 'training';
    if (['morning', 'afternoon', 'night'].includes(row.type)) return row.type;
    if (/repos/i.test(String(row.post || ''))) return 'rest';
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
    const legalHolidays = luxHolidays(year);
    const monthKey = iso(year, monthIndex, 1).slice(0, 7);
    const activePlanning = read('myteam_shifts', []);
    const archive = read('myteam_planning_history', {});
    const meta = read('myteam_planning_meta', {});
    const declaredMonths = Array.isArray(meta?.months) ? meta.months : [];
    const currentPdfMonth = meta?.source === 'pdf-local' &&
      (declaredMonths.length ? declaredMonths.includes(monthKey) :
        Array.isArray(activePlanning) && activePlanning.some(r => String(r?.date || '').startsWith(monthKey)));
    const officialPdfMonth = currentPdfMonth || archive?.[monthKey]?.meta?.source === 'pdf-local';

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
    hint.textContent = 'Balaye vers la gauche · PDF importé prioritaire ; sinon cycle théorique 2M / 2A / 2N / 2R';
    monthEl.append(header, hint);
    const leaveTools = document.createElement('div');
    leaveTools.className = 'mt-cycle-leave-tools';
    const leaveButton = document.createElement('button');
    leaveButton.type = 'button';
    leaveButton.textContent = leaveEditMode ? '✓ Terminer les congés' : '🏖️ Entourer mes congés';
    leaveButton.className = leaveEditMode ? 'mt-cycle-leave-edit active' : 'mt-cycle-leave-edit';
    leaveButton.addEventListener('click', () => { leaveEditMode = !leaveEditMode; render(); });
    const leaveHelp = document.createElement('small');
    leaveHelp.textContent = leaveEditMode ? 'Touche une journée travaillée pour marquer ou retirer 8 h de congé payé.' : 'Cercles turquoise = congés payés · calculés dans Salaire';
    leaveTools.append(leaveButton, leaveHelp);
    monthEl.append(leaveTools);

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
      const importedLeave = rows.some(isLeave);
      const markedLeave = leaveDays().has(date);
      const paidLeave = importedLeave || markedLeave;
      const type = paidLeave ? 'leave' : actual ? rowType(rows[0]) : officialPdfMonth ? 'rest' : phase;
      const isHoliday = legalHolidays.has(date);
      const cde = !paidLeave && date >= CDE_START && (actual ? type !== 'rest' && type !== 'training' : !officialPdfMonth && phase !== 'rest');
      const col = (firstOffset + day - 1) % 7;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `day mt-cycle-day ${type}${col >= 5 ? ' we' : ''}${date === today ? ' mt-cycle-today' : ''}${isHoliday ? ' mt-cycle-holiday' : ''}${paidLeave ? ' mt-cycle-paid-leave' : ''}`;
      el.dataset.cycleDay = date;
      const number = document.createElement('b'); number.textContent = String(day);
      const summary = document.createElement('span');
      summary.textContent = paidLeave ? '🏖️ Congé payé' : actual ? rows.map(r => r.start || r.post || 'Vacation').join(' / ') : officialPdfMonth ? 'Non planifié' : TYPES[phase];
      const detail = document.createElement('small');
      detail.className = 'mt-cycle-detail';
      detail.textContent = paidLeave ? (importedLeave ? 'Congé du planning importé' : '8 h estimées · marquées') : actual ? `${rows[0]?.post || 'Importé'}${cde && !/CDE|chef d[e’']équipe/i.test(String(rows[0]?.post || '')) ? ' · CDE' : ''}` : officialPdfMonth ? 'Aucun poste sur le PDF' : phase === 'rest' ? 'Cycle' : `${SHIFT_HOURS[phase]}${cde ? ' · CDE' : ''}`;
      if (isHoliday) detail.textContent += ' · 🇱🇺 Férié';
      el.append(number, summary, detail);
      const fallbackDescription = officialPdfMonth ? 'aucune vacation sur le PDF' : `${TYPES[phase]} ${SHIFT_HOURS[phase] || ''}`.trim();
      const accessible = `${day} ${title} : ${paidLeave ? 'congé payé, ' : ''}${actual ? 'planning importé' : officialPdfMonth ? 'planning PDF importé' : 'cycle théorique'}, ${actual ? rows.map(r => `${r.start || ''}–${r.end || ''} ${r.post || ''}`).join(', ') : fallbackDescription}${cde ? ', chef d’équipe' : ''}${isHoliday ? ', jour férié légal luxembourgeois' : ''}`;
      el.setAttribute('aria-label', accessible);
      el.addEventListener('click', () => {
        if (Date.now() < blockClickUntil) return;
        if (leaveEditMode) {
          if (importedLeave) { alert('Congé déjà présent sur le planning importé. Modifie le planning source pour le retirer.'); return; }
          if (!markedLeave && (phase === 'rest' || isHoliday || (officialPdfMonth && !actual))) { alert('Jour non planifié sur le PDF, repos théorique ou jour férié : vérifie avant de poser un congé payé.'); return; }
          const marked = leaveDays();
          if (marked.has(date)) marked.delete(date); else marked.add(date);
          localStorage.setItem(LEAVE_KEY, JSON.stringify([...marked].sort()));
          window.dispatchEvent(new Event('myteam-paid-leave-updated'));
          render();
          return;
        }
        const description = paidLeave ? '🏖️ Congé payé (8 h estimées). Calculé dans le complément salarial.' : actual
          ? rows.map(r => `${r.start || '--:--'} – ${r.end || '--:--'} · ${r.post || 'Vacation'}`).join('\n') + (cde ? '\nFonction : chef d’équipe (CDE).' : '')
          : officialPdfMonth ? 'Aucune vacation indiquée sur le planning PDF importé.' : `${TYPES[phase]}${phase === 'rest' ? '' : ' · ' + SHIFT_HOURS[phase] + (phase === 'night' ? ' (fin le lendemain)' : '')}${cde ? ' · CDE (chef d’équipe)' : ''}\nRoulement théorique, à confirmer avec le planning officiel.`;
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
    #grid .mt-cycle-day.mt-cycle-paid-leave{background:#125c5b!important;outline:3px solid #46ffe0;outline-offset:-3px;box-shadow:inset 0 0 0 2px #0b383e,0 0 12px rgba(70,255,224,.38);color:white!important}
    #grid .mt-cycle-day.mt-cycle-paid-leave span{font-weight:900;font-size:11px}
    #grid .mt-cycle-day.mt-cycle-paid-leave .mt-cycle-detail{color:#ddfff9;font-weight:800}
    #grid .mt-cycle-day.mt-cycle-holiday.mt-cycle-paid-leave{border:2px dashed #ffe08c}
    .mt-cycle-leave-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px}
    .mt-cycle-leave-tools small{color:#a9dfd7;font-size:10px;flex:1;min-width:135px}
    .mt-cycle-leave-edit{padding:8px 10px;border:2px solid #36c7b5;background:#214a54;color:#f2fffc;font-size:12px;font-weight:800;border-radius:10px}
    .mt-cycle-leave-edit.active{background:#11a48c;color:#072d2b}
    #grid .mt-cycle-day.mt-cycle-today{box-shadow:inset 0 0 0 2px #fff}
    #grid .mt-cycle-day.mt-cycle-holiday{border:2px solid #f2d172;background-image:linear-gradient(0deg,rgba(242,209,114,.13),rgba(242,209,114,.13))}
    #grid .mt-cycle-day.mt-cycle-holiday.mt-cycle-today{box-shadow:inset 0 0 0 2px #fff}
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
    if (['myteam_shifts', 'myteam_planning_history', LEAVE_KEY].includes(event.key)) render();
  });

  window.MyTeamCycleCalendar = { render, projected, changeMonth };
  render();
})();
