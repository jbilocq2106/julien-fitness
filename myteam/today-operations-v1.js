(() => {
  'use strict';
  const todaySection = document.getElementById('today');
  if (!todaySection || document.getElementById('mt-ops-host')) return;
  const LOG_KEY = 'myteam_main_courante_v1';
  const CONSIGNES_KEY = 'myteam_consignes_tracking_v1';
  const VISITS_KEY = 'myteam_post_visits_v1';
  const AGENTS_KEY = 'myteam_agent_profiles_v1';
  const isoDay = (d = new Date()) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  const nowTime = () => new Date().toTimeString().slice(0, 5);
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
  const save = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { alert('Enregistrement impossible : vérifie le stockage du téléphone.'); return false; } };
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('fr');
  const $ = id => document.getElementById(id);

  const host = document.createElement('div');
  host.id = 'mt-ops-host';
  host.innerHTML = `
    <style id="mt-ops-style">
      #mt-ops-host{display:grid;gap:12px;margin:0 0 14px}
      .mt-ops-box{background:#1d293d;border-radius:16px;padding:16px}
      .mt-ops-box h3{margin:0 0 10px}
      .mt-ops-box label{display:block;margin:9px 0;color:#dce4ef;font-size:13px}
      .mt-ops-box input,.mt-ops-box select,.mt-ops-box textarea{width:100%;margin-top:5px;padding:11px;border-radius:9px;border:1px solid #64758e;background:#111928;color:#fff;font:inherit}
      .mt-ops-box textarea{min-height:78px;resize:vertical}
      .mt-ops-box button{min-height:42px}
      .mt-ops-action{background:#d66b2b!important}
      .mt-ops-flex{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
      .mt-ops-flex>label{flex:1 1 130px}
      .mt-ops-item{padding:10px 0;border-top:1px solid #46556a}
      .mt-ops-item p{white-space:pre-wrap;margin:6px 0}
      .mt-ops-item small{color:#aebacc}
      .mt-ops-item button{padding:8px 11px;margin-top:7px}
      .mt-ops-confirmed{color:#77dfae}
      .mt-ops-pending{color:#ffd18a}
      .mt-ops-hint{font-size:12px;color:#b7c6d7;line-height:1.5;margin:8px 0}
      .mt-ops-agent{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #33445d}
      .mt-ops-agent strong{font-size:13px}
      .mt-ops-agent select{max-width:150px;min-width:140px;flex:0 0 140px;margin:0}
      #mt-ops-consignes-list{max-height:390px;overflow-y:auto}
    </style>
    <div class="mt-ops-box"><h3>📝 Main courante</h3>
      <form id="mt-ops-log-form">
        <div class="mt-ops-flex"><label>Date<input name="date" type="date" required></label><label>Heure<input name="time" type="time" required></label></div>
        <div class="mt-ops-flex"><label>Type<select name="kind"><option>Observation</option><option>Incident</option><option>Consigne</option><option>Information</option></select></label><label>Poste (facultatif)<input name="post" maxlength="60" placeholder="Ex. E85"></label></div>
        <label>Agents concernés (facultatif)<input name="agents" maxlength="250" placeholder="Noms des agents"></label>
        <label>Faits / main courante<textarea name="description" maxlength="3000" required placeholder="Que s’est-il passé ?"></textarea></label>
        <label>Suite à donner (facultatif)<textarea name="followup" maxlength="1000" placeholder="Action réalisée ou à prévoir"></textarea></label>
        <div class="mt-ops-flex"><button type="submit" class="mt-ops-action" id="mt-ops-save-log">Enregistrer</button><button type="button" id="mt-ops-cancel-log" hidden>Annuler la modification</button></div>
      </form>
      <p id="mt-ops-log-status" role="status" class="mt-ops-hint"></p>
      <label>Consulter une journée<input id="mt-ops-view-date" type="date"></label><div id="mt-ops-log-list"></div>
      <p class="mt-ops-hint">Brouillons privés sur ce téléphone, modifiables après enregistrement. Aucune transmission à l’employeur.</p>
    </div>
    <div class="mt-ops-box"><h3>✅ Visites sur poste</h3><div id="mt-ops-visits-summary"></div>
      <button type="button" id="mt-ops-open-visits" class="mt-ops-action">Saisir / modifier mes visites</button>
    </div>
    <div class="mt-ops-box"><h3>📋 Consignes — suivi des agents</h3>
      <p class="mt-ops-hint">« Demandé » et « Confirmé » sont différents. Les confirmations restent mémorisées pour les consignes en vigueur.</p>
      <div class="mt-ops-flex"><label>Référence des consignes suivies<input id="mt-ops-revision" maxlength="100" placeholder="Ex. Consignes du 19/10/2026"></label><button type="button" id="mt-ops-change-revision">Suivre cette version</button></div>
      <p class="mt-ops-hint" id="mt-ops-consignes-summary"></p>
      <div class="mt-ops-flex"><label>Rechercher<input id="mt-ops-agent-search" type="search" placeholder="Nom d’un agent"></label><label>Afficher<select id="mt-ops-agent-filter"><option value="todo">À vérifier</option><option value="all">Tous</option><option value="confirmed">Déjà confirmés</option></select></label></div>
      <div id="mt-ops-consignes-list"></div><p class="mt-ops-hint">Liste de l’équipe 4. Une nouvelle référence de consignes crée un suivi vierge sans effacer les anciens résultats.</p>
    </div>`;
  todaySection.querySelector('.mt-hero')?.after(host);

  let editingId = null;
  const form = $('mt-ops-log-form');
  const resetLog = () => {
    editingId = null;
    form.reset();
    form.elements.date.value = isoDay();
    form.elements.time.value = nowTime();
    $('mt-ops-save-log').textContent = 'Enregistrer';
    $('mt-ops-cancel-log').hidden = true;
  };
  const allLogs = () => { const rows = read(LOG_KEY, []); return Array.isArray(rows) ? rows : []; };
  const renderLogs = () => {
    const date = $('mt-ops-view-date').value;
    const rows = allLogs().filter(row => row.date === date).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    $('mt-ops-log-list').innerHTML = rows.length ? rows.map(row => `<article class="mt-ops-item">
      <strong>${esc(row.time)} · ${esc(row.kind || 'Observation')}${row.post ? ' · ' + esc(row.post) : ''}</strong>
      ${row.agents ? `<small>Agents : ${esc(row.agents)}</small>` : ''}
      <p>${esc(row.description)}</p>${row.followup ? `<small>Suite : ${esc(row.followup)}</small>` : ''}
      <div class="mt-ops-flex"><button type="button" data-log-edit="${esc(row.id)}">Modifier</button><button type="button" data-log-delete="${esc(row.id)}">Supprimer</button></div>
    </article>`).join('') : '<p class="mt-ops-hint">Aucune entrée pour cette journée.</p>';
  };
  resetLog();
  $('mt-ops-view-date').value = isoDay();
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const row = Object.fromEntries(['date', 'time', 'kind', 'post', 'agents', 'description', 'followup'].map(k => [k, String(data.get(k) || '').trim()]));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !/^\d{2}:\d{2}$/.test(row.time) || !row.description) return;
    const old = allLogs();
    const id = editingId || String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    const original = old.find(r => r.id === id);
    const record = { ...row, id, createdAt: original?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (!save(LOG_KEY, editingId ? old.map(r => r.id === id ? record : r) : [...old, record])) return;
    $('mt-ops-view-date').value = row.date;
    $('mt-ops-log-status').textContent = '✓ Entrée enregistrée sur ce téléphone';
    resetLog(); renderLogs();
  });
  $('mt-ops-cancel-log').onclick = () => { resetLog(); $('mt-ops-log-status').textContent = ''; };
  $('mt-ops-view-date').onchange = renderLogs;
  $('mt-ops-log-list').addEventListener('click', e => {
    const button = e.target.closest('[data-log-edit],[data-log-delete]');
    if (!button) return;
    const id = button.dataset.logEdit || button.dataset.logDelete;
    const old = allLogs(), entry = old.find(r => r.id === id);
    if (!entry) return;
    if (button.dataset.logDelete) {
      if (!confirm('Supprimer définitivement cette entrée de main courante ?')) return;
      if (save(LOG_KEY, old.filter(r => r.id !== id))) renderLogs();
    } else {
      editingId = id;
      ['date', 'time', 'kind', 'post', 'agents', 'description', 'followup'].forEach(k => { form.elements[k].value = entry[k] || ''; });
      $('mt-ops-save-log').textContent = 'Enregistrer la correction';
      $('mt-ops-cancel-log').hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  const renderVisits = () => {
    const all = read(VISITS_KEY, {}), day = Array.isArray(all?.[isoDay()]) ? all[isoDay()] : [];
    const count = day.filter(v => v?.done && v?.post).length;
    $('mt-ops-visits-summary').innerHTML = `<p><strong>${count}/3 visites réalisées aujourd’hui</strong></p>` +
      Array.from({ length: 3 }, (_, i) => {
        const v = day[i] || {};
        return `<div class="mt-ops-item"><strong>${v.post && v.done ? '✅' : '⚪'} Visite ${i + 1} : ${esc(v.post || 'Poste non renseigné')}</strong><small>${esc((Array.isArray(v.agents) ? v.agents : []).join(' · '))}</small></div>`;
      }).join('');
  };
  $('mt-ops-open-visits').onclick = () => document.querySelector('nav.tabs button[data-tab="visits"]')?.click();

  const baseConsignes = () => ({ revision: 'Consignes en vigueur', versions: {} });
  const loadConsignes = () => {
    const value = read(CONSIGNES_KEY, baseConsignes());
    return value && typeof value === 'object' && !Array.isArray(value) ?
      { revision: String(value.revision || 'Consignes en vigueur'), versions: value.versions && typeof value.versions === 'object' ? value.versions : {} } : baseConsignes();
  };
  let consignes = loadConsignes();
  const currentRecords = () => consignes.versions[consignes.revision] || {};
  const teamAgents = () => {
    const profiles = read(AGENTS_KEY, {}), removed = new Set(read('myteam_deleted_agents_v1', []));
    return Object.keys(profiles && typeof profiles === 'object' && !Array.isArray(profiles) ? profiles : {})
      .filter(name => !removed.has(name) && Number(profiles[name]?.team) === 4)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  };
  const renderConsignes = () => {
    $('mt-ops-revision').value = consignes.revision;
    const agents = teamAgents(), records = currentRecords();
    const confirmed = agents.filter(name => records[norm(name)]?.status === 'confirmed').length;
    const pending = agents.filter(name => records[norm(name)]?.status === 'asked').length;
    $('mt-ops-consignes-summary').textContent = `${confirmed} confirmé(s) · ${pending} demandé(s), en attente · ${agents.length - confirmed - pending} à demander`;
    const search = norm($('mt-ops-agent-search').value), filter = $('mt-ops-agent-filter').value;
    const visible = agents.filter(name => {
      const status = records[norm(name)]?.status || 'none';
      return (!search || norm(name).includes(search)) && (filter === 'all' || (filter === 'confirmed' ? status === 'confirmed' : status !== 'confirmed'));
    });
    $('mt-ops-consignes-list').innerHTML = visible.length ? visible.map(name => {
      const rec = records[norm(name)] || {}, status = rec.status || 'none';
      return `<div class="mt-ops-agent"><div><strong class="${status === 'confirmed' ? 'mt-ops-confirmed' : status === 'asked' ? 'mt-ops-pending' : ''}">${esc(name)}</strong>
        <small>${rec.updatedAt ? 'Suivi le ' + esc(new Date(rec.updatedAt).toLocaleDateString('fr-FR')) : 'Pas encore demandé'}</small></div>
        <select data-consignes-agent="${esc(name)}" aria-label="Statut consignes de ${esc(name)}">
          <option value="none" ${status === 'none' ? 'selected' : ''}>À demander</option>
          <option value="asked" ${status === 'asked' ? 'selected' : ''}>Demandé</option>
          <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmé ✓</option>
        </select></div>`;
    }).join('') : '<p class="mt-ops-hint">Aucun agent correspondant. Vérifie la liste dans l’onglet Agents.</p>';
  };
  $('mt-ops-consignes-list').addEventListener('change', e => {
    const input = e.target.closest('[data-consignes-agent]');
    if (!input) return;
    const key = norm(input.dataset.consignesAgent), statuses = { ...currentRecords() };
    if (input.value === 'none') delete statuses[key];
    else statuses[key] = { name: input.dataset.consignesAgent, status: input.value, updatedAt: new Date().toISOString() };
    const next = { ...consignes, versions: { ...consignes.versions, [consignes.revision]: statuses } };
    if (save(CONSIGNES_KEY, next)) { consignes = next; renderConsignes(); }
    else input.value = currentRecords()[key]?.status || 'none';
  });
  $('mt-ops-agent-search').oninput = renderConsignes;
  $('mt-ops-agent-filter').onchange = renderConsignes;
  $('mt-ops-change-revision').onclick = () => {
    const revision = $('mt-ops-revision').value.trim().slice(0, 100);
    if (!revision || revision === consignes.revision) return;
    if (!confirm(`Passer au suivi « ${revision} » ? Les validations précédentes seront conservées dans leur ancienne version.`)) return;
    const next = { ...consignes, revision };
    if (save(CONSIGNES_KEY, next)) { consignes = next; renderConsignes(); }
  };

  const refresh = () => { renderLogs(); renderVisits(); consignes = loadConsignes(); renderConsignes(); };
  document.getElementById('mt-mobile-nav')?.addEventListener('click', e => { if (e.target.closest('[data-mt-open="today"]')) setTimeout(refresh, 0); });
  document.querySelector('nav.tabs button[data-tab="today"]')?.addEventListener('click', () => setTimeout(refresh, 0));
  window.addEventListener('focus', refresh);
  window.addEventListener('storage', e => { if ([LOG_KEY, VISITS_KEY, CONSIGNES_KEY, AGENTS_KEY].includes(e.key)) refresh(); });
  refresh();
})();
