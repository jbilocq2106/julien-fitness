(() => {
  'use strict';
  const R = { base: 3608.63, sun: 14.6014, night: 4.1718, holiday: 41.7182, otBase: 20.8591, otSup: 10.4296, chefDay: 9.2475, xray: 75, leaveHour: 4.0789, fixedDed: 165, depAllowance: 692.83, care: .028, sick: .0025, pension: .085, dep: .014, credit: 46.64 };
  const TAX = [[3153.62, 304.90], [3195.37, 316.50], [3241.43, 328], [3537.44, 411.70]];
  const ACTUAL = {
    '2026-09': { net: 3273.11, gross: 4045.57, taxable: 3153.62, tax: 304.90, social: 467.26, dependency: 46.94, totalH: 164, sunH: 8, nightH: 34.25, chefDays: 4, leaveH: 16, sunGross: 116.81, nightGross: 142.88, chefGross: 36.99, leaveGross: 65.26, xrayGross: 75, holidayGross: 0, otGross: 0, source: 'Fiche de paie septembre 2026' }
  };
  const PATTERN = ['morning', 'morning', 'afternoon', 'afternoon', 'night', 'night', 'rest', 'rest'];
  const HOURS = { morning: ['05:00', '13:00'], afternoon: ['13:00', '21:00'], night: ['21:00', '05:00'] };
  const ANCHOR = Date.UTC(2026, 9, 17); // 17-18 octobre 2026 : matin
  const CDE_START = '2026-11-01';
  const euro = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
  const hm = n => `${Math.floor((Number(n) || 0) / 60)} h ${String(Math.round((Number(n) || 0) % 60)).padStart(2, '0')}`;
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const monthNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const label = m => { const [y, mo] = m.split('-').map(Number); return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(y, mo - 1, 1)); };
  const payLabel = m => { const [y, mo] = m.split('-').map(Number); return `15 ${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(y, mo, 15))}`; };
  const read = (key, fallback) => { try { const obj = JSON.parse(localStorage.getItem(key) || 'null'); return obj ?? fallback; } catch { return fallback; } };
  const rDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, days) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };
  const isLeave = s => /vacances?|cong[eé]/i.test(String(s.post || ''));
  const isTraining = s => s.type === 'training' || /formation/i.test(String(s.post || ''));
  let selectedMonth = monthNow();

  function holidays(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1, easter = new Date(year, mo - 1, day);
    return new Set([new Date(year, 0, 1), addDays(easter, 1), new Date(year, 4, 1), new Date(year, 4, 9), addDays(easter, 39), addDays(easter, 50), new Date(year, 5, 23), new Date(year, 7, 15), new Date(year, 10, 1), new Date(year, 11, 25), new Date(year, 11, 26)].map(rDate));
  }

  function weekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return `${d.getUTCFullYear()}-${Math.ceil((((d - start) / 86400000) + 1) / 7)}`;
  }
  const overlap = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c)) / 60000;
  function interpolateTax(amount) {
    if (amount <= TAX[0][0]) {
      const [a, b] = TAX[0], [c, d] = TAX[1]; return Math.max(0, b + (amount - a) * (d - b) / (c - a));
    }
    for (let i = 0; i < TAX.length - 1; i++) {
      const [a, b] = TAX[i], [c, d] = TAX[i + 1];
      if (amount <= c) return b + (amount - a) * (d - b) / (c - a);
    }
    const [a, b] = TAX[TAX.length - 2], [c, d] = TAX[TAX.length - 1];
    return Math.max(0, d + (amount - c) * (d - b) / (c - a));
  }

  function estimate(rows) {
    let total = 0, night = 0, sunday = 0, holiday = 0, leaveMinutes = 0;
    const cdeDates = new Set(), weeks = new Map();
    for (const s of rows) {
      if (!s?.date || !s?.start || !s?.end) continue;
      const a = new Date(`${s.date}T${s.start}:00`), b = new Date(`${s.date}T${s.end}:00`);
      if (b <= a) b.setDate(b.getDate() + 1);
      const rawDuration = (b - a) / 60000;
      const minutes = s.plannedMinutes == null ? (isLeave(s) ? 480 : rawDuration) : Number(s.plannedMinutes);
      if (!Number.isFinite(minutes) || minutes < 0) continue;
      total += minutes;
      if (isLeave(s)) { leaveMinutes += minutes; continue; }
      if ((s.date >= CDE_START && !isTraining(s)) || /chef d[’' ]?équipe|\bCDE\b/i.test(String(s.post || ''))) cdeDates.add(s.date);
      weeks.set(weekKey(a), (weeks.get(weekKey(a)) || 0) + minutes);
      const first = new Date(a); first.setHours(0, 0, 0, 0); first.setDate(first.getDate() - 1);
      const last = new Date(b); last.setHours(0, 0, 0, 0); last.setDate(last.getDate() + 1);
      const holidaySet = new Set([...holidays(a.getFullYear()), ...holidays(b.getFullYear())]);
      for (let date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
        const n1 = new Date(date); n1.setHours(22, 0, 0, 0);
        const n2 = new Date(n1); n2.setHours(n2.getHours() + 8);
        night += overlap(a, b, n1, n2);
        if (date.getDay() === 0) {
          const d1 = new Date(date); d1.setHours(6, 0, 0, 0);
          const d2 = new Date(d1); d2.setDate(d2.getDate() + 1);
          sunday += overlap(a, b, d1, d2);
        }
        if (holidaySet.has(rDate(date))) {
          const d1 = new Date(date); d1.setHours(0, 0, 0, 0);
          const d2 = new Date(d1); d2.setDate(d2.getDate() + 1);
          holiday += overlap(a, b, d1, d2);
        }
      }
    }
    let overtime = 0;
    for (const minutes of weeks.values()) overtime += Math.max(0, minutes - 2880);
    const sunGross = round(sunday / 60 * R.sun), nightGross = round(night / 60 * R.night);
    const holidayGross = round(holiday / 60 * R.holiday), leaveGross = round(leaveMinutes / 60 * R.leaveHour);
    const otGross = round(overtime / 60 * (R.otBase + R.otSup)), chefGross = round(cdeDates.size * R.chefDay);
    const xrayGross = localStorage.getItem('myteam_salary_xray') === '0' ? 0 : R.xray;
    const gross = round(R.base + sunGross + nightGross + holidayGross + leaveGross + otGross + chefGross + xrayGross);
    const care = round((gross - overtime / 60 * R.otSup) * R.care);
    const otherBase = gross - otGross;
    const social = round(care + round(otherBase * R.sick) + round(otherBase * R.pension));
    const dependency = round(Math.max(0, gross - R.depAllowance) * R.dep);
    const taxable = round(Math.max(0, gross - social - sunGross - nightGross - holidayGross - otGross - R.fixedDed));
    const tax = round(interpolateTax(taxable));
    const net = round(gross - social - dependency - tax + R.credit);
    return { total, night, sunday, holiday, leaveMinutes, overtime, chefDays: cdeDates.size, sunGross, nightGross, holidayGross, leaveGross, otGross, chefGross, xrayGross, gross, taxable, social, dependency, tax, net };
  }

  function monthKeys(history, actuals) {
    const all = new Set([...Object.keys(history), ...Object.keys(actuals)]);
    for (let y = 2026; y <= 2027; y++) for (let m = y === 2026 ? 9 : 1; m <= 12; m++) all.add(`${y}-${String(m).padStart(2, '0')}`);
    // The archive begins with the confirmed September payslip; forecasts start in October.
    return [...all].filter(m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m >= '2026-09').sort();
  }

  function monthRows(month, active, history) {
    const imported = new Map();
    const record = s => {
      if (!s || !String(s.date || '').startsWith(month)) return;
      imported.set([s.date, s.start, s.end, s.post].join('|'), s);
    };
    const archived = history[month]?.rows;
    if (Array.isArray(archived)) archived.forEach(record);
    active.forEach(record);
    const rows = [...imported.values()];
    const covered = new Set(rows.map(s => s.date));
    let projectedDays = 0;
    if (month >= monthNow() && month <= '2027-12') {
      const [y, mo] = month.split('-').map(Number);
      for (let d = 1, count = new Date(y, mo, 0).getDate(); d <= count; d++) {
        const date = `${month}-${String(d).padStart(2, '0')}`;
        if (covered.has(date)) continue;
        const offset = Math.round((Date.UTC(y, mo - 1, d) - ANCHOR) / 86400000);
        const phase = PATTERN[((offset % 8) + 8) % 8];
        if (phase === 'rest') continue;
        rows.push({ date, start: HOURS[phase][0], end: HOURS[phase][1], type: phase, post: date >= CDE_START ? 'Chef d’équipe (CDE)' : 'Agent', plannedMinutes: 480, forecast: true });
        projectedDays++;
      }
    }
    return { rows, importedCount: imported.size, projectedDays };
  }

  function monthData(month, active, history, actuals) {
    const source = monthRows(month, active, history);
    const actual = actuals[month] && Number.isFinite(Number(actuals[month].net)) ? actuals[month] : null;
    const available = !!actual || source.rows.length > 0;
    const calc = available ? estimate(source.rows) : null;
    return { ...source, actual, calc, available, net: actual ? Number(actual.net) : calc?.net, gross: actual && Number.isFinite(Number(actual.gross)) ? Number(actual.gross) : calc?.gross };
  }

  function ensureSection() {
    const nav = document.querySelector('.tabs'), main = document.querySelector('main');
    if (!nav || !main) return null;
    let button = nav.querySelector('[data-tab="salary"]');
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.dataset.tab = 'salary'; button.textContent = '💶 Salaire';
      nav.querySelector('[data-tab="hours"]')?.after(button);
    }
    let section = document.querySelector('#salary');
    if (!section) { section = document.createElement('section'); section.id = 'salary'; section.className = 'hidden card'; main.append(section); }
    button.onclick = () => {
      document.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('active', el === button));
      main.querySelectorAll('section').forEach(el => el.classList.toggle('hidden', el !== section));
      render();
    };
    return section;
  }

  function render() {
    const section = ensureSection(); if (!section) return;
    const active = read('myteam_shifts', []), history = read('myteam_planning_history', {}), stored = read('myteam_salary_actuals', {});
    const actuals = { ...ACTUAL, ...(stored && !Array.isArray(stored) ? stored : {}) };
    const months = monthKeys(history && !Array.isArray(history) ? history : {}, actuals);
    if (!months.includes(selectedMonth)) selectedMonth = months.includes(monthNow()) ? monthNow() : months[months.length - 1];
    const items = months.map(m => ({ month: m, data: monthData(m, Array.isArray(active) ? active : [], history || {}, actuals) }));
    const index = items.findIndex(x => x.month === selectedMonth);
    const data = items[index]?.data; if (!data) return;
    const actual = data.actual, c = data.calc, available = data.available;
    const state = actual ? 'Paie réelle' : selectedMonth < monthNow() ? 'Mois terminé · estimation' : 'Salaire prévisionnel';
    const source = data.projectedDays && data.importedCount ? 'Planning importé + cycle estimé' : data.projectedDays ? 'Roulement 2-2-2 estimé' : data.importedCount ? 'Planning enregistré' : 'Aucun planning enregistré';
    const amount = n => n == null ? 'À préciser' : euro(n);
    section.innerHTML = `
      <h2>💶 Salaire</h2>
      <p class="muted mt-salary-intro">Prévisions basées sur le planning et les montants de la fiche de paie de septembre 2026, jusqu’à décembre 2027.</p>
      <div class="mt-salary-selector">
        <button type="button" id="mt-salary-prev" aria-label="Mois précédent" ${index === 0 ? 'disabled' : ''}>‹</button>
        <label for="mt-salary-month">Mois de travail<select id="mt-salary-month">${months.map(m => `<option value="${m}" ${m === selectedMonth ? 'selected' : ''}>${label(m)}</option>`).join('')}</select></label>
        <button type="button" id="mt-salary-next" aria-label="Mois suivant" ${index === items.length - 1 ? 'disabled' : ''}>›</button>
      </div>
      <div class="mt-salary-hero">
        <div class="mt-salary-state">${state}</div><h3>${label(selectedMonth)}</h3>
        <div class="mt-salary-net">${available ? (actual ? '' : '≈ ') + amount(data.net) : 'Indisponible'}</div>
        <div class="mt-salary-gross">${available ? `${amount(data.gross)} brut ${actual ? 'réel' : 'estimé'}` : 'Planning de ce mois non disponible'}</div>
        <div class="mt-salary-source">${source}${selectedMonth >= '2026-11' ? ' · CDE prévu' : ''}</div>
      </div>
      ${available ? `<div class="mt-salary-detail"><h3>Détail du mois</h3>
        <div><span>Heures au planning</span><b>${actual?.totalH != null ? hm(Number(actual.totalH) * 60) : hm(c?.total)}</b></div>
        <div><span>Dimanche</span><b>${actual?.sunH != null ? hm(Number(actual.sunH) * 60) : hm(c?.sunday)} · + ${amount(actual?.sunGross ?? c?.sunGross)}</b></div>
        <div><span>Nuit (22 h – 6 h)</span><b>${actual ? (actual.nightH == null ? 'Heures non détaillées' : hm(Number(actual.nightH) * 60)) : hm(c?.night)} · + ${amount(actual?.nightGross ?? c?.nightGross)}</b></div>
        <div><span>Prime de fonction / CDE</span><b>${actual ? (actual.chefDays == null ? 'Jours non détaillés' : `${actual.chefDays} jours`) : `${c?.chefDays ?? 0} jours`} · + ${amount(actual?.chefGross ?? c?.chefGross)}</b></div>
        ${(actual?.holidayGross ?? c?.holidayGross) > 0 ? `<div><span>Fériés 🇱🇺 (200 % selon fiche)</span><b>${actual ? (actual.holidayH == null ? '' : `${hm(Number(actual.holidayH) * 60)} · `) : `${hm(c?.holiday)} · `}+ ${amount(actual?.holidayGross ?? c?.holidayGross)}</b></div>` : ''}
        ${(actual?.otGross ?? c?.otGross) > 0 ? `<div><span>Heures supplémentaires</span><b>+ ${amount(actual?.otGross ?? c?.otGross)}</b></div>` : ''}
        ${(actual?.leaveGross ?? c?.leaveGross) > 0 ? `<div><span>Congés payés</span><b>+ ${amount(actual?.leaveGross ?? c?.leaveGross)}</b></div>` : ''}
        <div><span>Prime RX / X-ray</span><b>+ ${amount(actual?.xrayGross ?? c?.xrayGross)}</b></div></div>` : ''}
      <div class="mt-salary-note"><b>Quand est-ce payé ?</b>
        <p>Le salaire de base est versé en fin de mois. Les majorations de nuit, du dimanche et les autres suppléments sont versés le <b>${payLabel(selectedMonth)}</b>, le mois suivant.</p>
        <p>Le net affiché correspond au travail de <b>${label(selectedMonth)}</b>, pas au total des virements reçus pendant ce mois. ${actual ? 'Montant confirmé par la fiche de paie.' : 'Estimation indicative : planning réel, impôt, cotisations, absences et primes peuvent modifier la paie.'}</p>
      </div>
      <div class="mt-salary-timeline"><h3>Les salaires mois par mois</h3><div class="mt-salary-month-list">${items.map(({ month, data: item }) => {
        const tag = item.actual ? 'Réel' : !item.available ? 'Sans données' : month < monthNow() ? 'Estimé' : 'Prévision';
        return `<button type="button" class="mt-salary-month-card${month === selectedMonth ? ' selected' : ''}" data-salary-month="${month}" aria-pressed="${month === selectedMonth}"><span><b>${label(month)}</b><small>${tag}${item.projectedDays ? ' · cycle 2-2-2' : ''}</small></span><strong>${item.available ? (item.actual ? '' : '≈ ') + amount(item.net) : '—'}</strong></button>`;
      }).join('')}</div></div>
      <p class="muted mt-salary-disclaimer">Horaires projetés : matin 05 h–13 h, après-midi 13 h–21 h, nuit 21 h–05 h. Fonction CDE estimée sur les jours travaillés dès novembre 2026. Jours fériés légaux luxembourgeois inclus quand travaillés ; taux SFER 200 % (8 h = 333,75 € sur la fiche de juin 2026). La régularisation exceptionnelle de 347 € n’est pas répétée chaque mois.</p>`;
    section.querySelector('#mt-salary-month').onchange = e => { selectedMonth = e.target.value; render(); };
    section.querySelector('#mt-salary-prev').onclick = () => { if (index > 0) { selectedMonth = items[index - 1].month; render(); } };
    section.querySelector('#mt-salary-next').onclick = () => { if (index < items.length - 1) { selectedMonth = items[index + 1].month; render(); } };
    section.querySelectorAll('[data-salary-month]').forEach(button => button.onclick = () => { selectedMonth = button.dataset.salaryMonth; render(); section.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  const css = document.createElement('style'); css.id = 'mt-salary-style';
  css.textContent = `
    #salary{background:transparent;padding:0}#salary>h2,#salary>.mt-salary-intro{padding:0 3px}
    .mt-salary-selector{display:flex;gap:8px;align-items:center;margin:14px 0}.mt-salary-selector>button{font-size:24px;min-width:46px;background:#314762}.mt-salary-selector>button:disabled{opacity:.4}
    .mt-salary-selector label{min-width:0;flex:1;font-size:11px;color:#b7c8dd}.mt-salary-selector select{display:block;min-width:0;width:100%;margin-top:5px;border:1px solid #546a84;border-radius:11px;padding:12px 8px;background:#233650;color:white;font-size:15px;text-transform:capitalize}
    .mt-salary-hero{background:linear-gradient(140deg,#16445a,#20364c 67%,#1d293d);border:1px solid #37788b;border-radius:16px;padding:18px;margin:10px 0 14px}.mt-salary-state{font-size:12px;color:#d5e6ee}.mt-salary-hero h3{margin:8px 0;text-transform:capitalize}
    .mt-salary-net{font-size:34px;line-height:1.2;font-weight:900;color:#baf6dc}.mt-salary-gross{margin-top:7px;font-weight:750}.mt-salary-source{font-size:12px;color:#d2e5ef;margin-top:8px}
    .mt-salary-detail{background:#1d293d;border-radius:16px;padding:16px;margin-bottom:12px}.mt-salary-detail h3{margin:0 0 12px}.mt-salary-detail>div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #405064;padding:10px 0;font-size:13px;flex-wrap:wrap}.mt-salary-detail>div:last-child{border-bottom:0}.mt-salary-detail b{text-align:right}
    .mt-salary-note{border:1px solid #50677b;background:#23344a;border-radius:14px;padding:14px;font-size:13px;line-height:1.55}.mt-salary-note p{margin:8px 0 0}.mt-salary-timeline{margin:20px 0}.mt-salary-timeline h3{margin:0 0 10px}.mt-salary-month-list{display:grid;gap:7px}
    .mt-salary-month-card{display:flex;width:100%;justify-content:space-between;align-items:center;gap:9px;text-align:left;background:#25364b;border:1px solid #43556e;border-radius:12px;padding:12px 13px;color:white}.mt-salary-month-card.selected{border-color:#67dfbd;background:#1b4a4a}.mt-salary-month-card span{display:grid;gap:3px;min-width:0}.mt-salary-month-card span b{text-transform:capitalize}.mt-salary-month-card small{color:#bdd0df;font-size:11px}.mt-salary-month-card strong{white-space:nowrap;font-size:16px;text-align:right}
    .mt-salary-disclaimer{font-size:12px;line-height:1.5}@media(max-width:360px){.mt-salary-net{font-size:29px}.mt-salary-month-card strong{font-size:14px}}
  `;
  document.head.append(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(render, 0)); else setTimeout(render, 0);
  document.addEventListener('click', e => { if (e.target?.dataset?.tab === 'salary') setTimeout(render, 0); });
  window.MyTeamRenderSalary = render;
})();
