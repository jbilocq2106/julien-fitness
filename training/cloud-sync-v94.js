/* MyTraining: sauvegarde Firestore privee, additive et sans suppression locale. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {
  getFirestore, doc, collection, getDoc, getDocs, setDoc
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const config = {
  apiKey: 'AIzaSyBAnDv-forF-09hBca7iG2DZQBpDCHej7o',
  authDomain: 'mytraining---myteam.firebaseapp.com',
  projectId: 'mytraining---myteam',
  storageBucket: 'mytraining---myteam.firebasestorage.app',
  messagingSenderId: '310395557508',
  appId: '1:310395557508:web:62d03317c0a8b5bdf894d1'
};

const app = initializeApp(config, 'mytraining');
const auth = getAuth(app);
const db = getFirestore(app);
const PREF_KEYS = [
  'mt_show_rir', 'mt_exercise_feedback_v1', 'mt_exercise_replacements_v70',
  'mt_machine_settings_v1', 'mt_known_gym_locations_v1',
  'mt_stats_approved_advice_v1'
];
const SIGNATURES_KEY = 'mt_cloud_workout_signatures_v1';
const META_KEY = 'mt_cloud_meta_signature_v1';
const EDITED_KEY = 'mt_cloud_last_local_edit_v1';
const BACKUP_KEY = 'mt_cloud_before_first_sync_v1';
let currentUser = null;
let initialised = false;
let busy = false;
let queued = false;
let debounce = null;
let message = 'Non connecté — les séances restent enregistrées sur ce téléphone.';
const hashes = new Map();
const lastSynced = {};
let lastMetaSignature = '';

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function groupKey(row) { return `${row.title || ''}\u0000${row.start_time || row.start || ''}`; }
function signature(value) { return JSON.stringify(value); }
function timestamp(s) { const n = Date.parse(s || ''); return Number.isFinite(n) ? n : 0; }
function orderedRows(rows) {
  return [...rows].sort((a, b) => {
    const x = `${a.exercise_order || 0}|${a.exercise_title || ''}|${a.set_index || 0}`;
    const y = `${b.exercise_order || 0}|${b.exercise_title || ''}|${b.set_index || 0}`;
    return x.localeCompare(y) || signature(a).localeCompare(signature(b));
  });
}
function groups() {
  const found = new Map();
  (Array.isArray(state.history) ? state.history : []).forEach(row => {
    const key = groupKey(row);
    if (!found.has(key)) found.set(key, { key, rows: [], summary: null });
    found.get(key).rows.push(row);
  });
  (Array.isArray(state.sessions) ? state.sessions : []).forEach(summary => {
    const key = groupKey(summary);
    if (!found.has(key)) found.set(key, { key, rows: [], summary: null });
    found.get(key).summary = summary;
  });
  for (const group of found.values()) group.rows = orderedRows(group.rows);
  return found;
}
function groupSignature(group) { return signature({ rows: group.rows, summary: group.summary }); }
async function documentId(key) {
  if (hashes.has(key)) return hashes.get(key);
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const id = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
  hashes.set(key, id);
  return id;
}
function metadata() {
  const extras = {};
  PREF_KEYS.forEach(key => { const value = localStorage.getItem(key); if (value !== null) extras[key] = value; });
  return {
    nextSessionId: state.nextSessionId || 'S1',
    progressionOverrides: state.progressionOverrides || {},
    activeWorkout: state.activeWorkout || null,
    v4Migrated: !!state.v4Migrated,
    extras
  };
}
function persistWithoutCloud() {
  const value = {
    history: state.history, sessions: state.sessions, nextSessionId: state.nextSessionId,
    activeWorkout: state.activeWorkout, progressionOverrides: state.progressionOverrides,
    v4Migrated: !!state.v4Migrated
  };
  localStorage.setItem('mt_data_v1', JSON.stringify(value));
}
function restoreGroup(group) {
  state.history = (state.history || []).filter(row => groupKey(row) !== group.key).concat(group.rows || []);
  state.sessions = (state.sessions || []).filter(row => groupKey(row) !== group.key);
  if (group.summary) state.sessions.push(group.summary);
  state.history.sort((a, b) => timestamp(b.start_time) - timestamp(a.start_time));
  state.sessions.sort((a, b) => timestamp(b.start) - timestamp(a.start));
}
function restoreMeta(remote, useRemoteSequence = false) {
  if (!remote || typeof remote !== 'object') return;
  const before = metadata();
  const remoteOverrides = remote.progressionOverrides || {};
  const merged = { ...remoteOverrides, ...before.progressionOverrides };
  Object.keys(merged).forEach(key => {
    const a = Number(remoteOverrides[key]), b = Number(before.progressionOverrides[key]);
    if (Number.isFinite(a) && Number.isFinite(b)) merged[key] = Math.max(a, b);
  });
  state.progressionOverrides = merged;
  if (!state.activeWorkout && remote.activeWorkout) {
    const lastEnd = Math.max(0, ...(state.sessions || []).map(s => timestamp(s.end)));
    if (timestamp(remote.activeWorkout.started) > lastEnd) state.activeWorkout = remote.activeWorkout;
  }
  const mostRecentLocal = Math.max(0, ...(state.sessions || []).map(s => timestamp(s.start)));
  if ((useRemoteSequence || !mostRecentLocal) && remote.nextSessionId) {
    state.nextSessionId = remote.nextSessionId;
  }
  state.v4Migrated = !!(state.v4Migrated || remote.v4Migrated);
  for (const [key, value] of Object.entries(remote.extras || {})) {
    if (PREF_KEYS.includes(key) && localStorage.getItem(key) === null && typeof value === 'string') {
      localStorage.setItem(key, value);
    }
  }
}
function refreshViews() {
  try {
    if (state.program) { applyProgressionOverrides(); renderProgram(); renderHome(); }
    if (document.getElementById('historyView')?.classList.contains('active')) renderHistory();
    if (document.getElementById('statsView')?.classList.contains('active')) renderStatsSelect();
  } catch (error) { console.warn('Rafraichissement apres synchro', error); }
}
function status(value) {
  message = value;
  const label = document.getElementById('mtCloudStatus');
  if (label) label.textContent = value;
}
function updateControls() {
  const login = document.getElementById('mtCloudLogin');
  const sync = document.getElementById('mtCloudSync');
  const logout = document.getElementById('mtCloudLogout');
  if (login) login.hidden = !!currentUser;
  if (sync) sync.hidden = !currentUser;
  if (logout) logout.hidden = !currentUser;
}
function protectLocalCopy() {
  if (localStorage.getItem(BACKUP_KEY)) return true;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      createdAt: new Date().toISOString(),
      state: readJson('mt_data_v1', {}),
      preferences: metadata().extras
    }));
    return true;
  } catch (error) {
    console.warn('Copie locale de precaution indisponible', error);
    return false;
  }
}
function persistSignatures() {
  if (!currentUser) return;
  localStorage.setItem(`${SIGNATURES_KEY}_${currentUser.uid}`, JSON.stringify(lastSynced));
  localStorage.setItem(`${META_KEY}_${currentUser.uid}`, lastMetaSignature);
}
function selectUserSignatures(uid) {
  Object.keys(lastSynced).forEach(key => delete lastSynced[key]);
  const saved = readJson(`${SIGNATURES_KEY}_${uid}`, {});
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) Object.assign(lastSynced, saved);
  lastMetaSignature = localStorage.getItem(`${META_KEY}_${uid}`) || '';
}
function changedLocally(id, localSignature) {
  return Object.prototype.hasOwnProperty.call(lastSynced, id) && lastSynced[id] !== localSignature;
}

async function syncNow(pull = true) {
  if (!currentUser || !navigator.onLine) {
    status('Hors connexion : les données restent sauvegardées sur ce téléphone.');
    return;
  }
  if (busy) { queued = true; return; }
  busy = true;
  status('Synchronisation en cours…');
  try {
    if (!protectLocalCopy()) throw new Error('Copie locale de precaution impossible');
    const root = doc(db, 'users', currentUser.uid, 'apps', 'mytraining');
    const workoutsRef = collection(root, 'workouts');
    let remoteMeta = null;
    const remoteGroups = new Map();
    if (pull || !initialised) {
      const [metaSnap, workoutSnap] = await Promise.all([getDoc(root), getDocs(workoutsRef)]);
      if (metaSnap.exists()) remoteMeta = metaSnap.data();
      workoutSnap.forEach(snap => remoteGroups.set(snap.id, snap.data()));
    }
    const localGroups = groups();
    const localIds = new Map();
    for (const group of localGroups.values()) localIds.set(await documentId(group.key), group);
    let imported = false;
    for (const [id, remote] of remoteGroups) {
      if (typeof remote.key !== 'string' || !Array.isArray(remote.rows)) continue;
      const local = localIds.get(id);
      const localSig = local ? groupSignature(local) : '';
      const remoteSig = groupSignature(remote);
      if (!local || (localSig !== remoteSig && !changedLocally(id, localSig))) {
        restoreGroup(remote);
        imported = true;
        lastSynced[id] = remoteSig;
      }
    }
    if (remoteMeta?.payload) {
      try {
        const remote = JSON.parse(remoteMeta.payload);
        const localMetaUnchanged = !!lastMetaSignature && signature(metadata()) === lastMetaSignature;
        if (remoteMeta.signature !== lastMetaSignature && (!lastMetaSignature || localMetaUnchanged)) {
          restoreMeta(remote, !lastMetaSignature);
          imported = true;
        }
      } catch (error) { console.warn('Metadonnees distantes ignorees', error); }
    }
    if (imported) { persistWithoutCloud(); refreshViews(); }

    const freshGroups = groups();
    for (const group of freshGroups.values()) {
      const id = await documentId(group.key);
      const sig = groupSignature(group);
      const known = lastSynced[id];
      if (sig !== known || ((pull || !initialised) && !remoteGroups.has(id))) {
        // Document deterministe : un exercice termine ne se duplique pas au rechargement.
        const payload = JSON.parse(JSON.stringify({
          key: group.key, rows: group.rows, summary: group.summary,
          signature: sig, updatedAt: Date.now()
        }));
        await setDoc(doc(workoutsRef, id), payload);
        lastSynced[id] = sig;
      }
    }

    const meta = metadata();
    const metaSig = signature(meta);
    if (metaSig !== lastMetaSignature || ((pull || !initialised) && !remoteMeta)) {
      await setDoc(root, { schema: 1, payload: metaSig, signature: metaSig, updatedAt: Date.now() });
      lastMetaSignature = metaSig;
    }
    persistSignatures();
    initialised = true;
    status(`Synchronisé ✓ — ${new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}`);
  } catch (error) {
    console.warn('Synchronisation MyTraining', error);
    status('Synchronisation impossible pour le moment. Tes données locales sont conservées.');
  } finally {
    busy = false;
    if (queued) { queued = false; queueSync(); }
  }
}
function queueSync() {
  clearTimeout(debounce);
  if (currentUser && initialised) debounce = setTimeout(() => syncNow(false), 2400);
}

function panel() {
  const home = document.getElementById('homeView');
  if (!home || document.getElementById('mtCloudPanel')) return;
  const section = document.createElement('section');
  section.id = 'mtCloudPanel';
  section.className = 'card';
  section.style.marginTop = '14px';
  section.innerHTML = `<div class="section-title"><h3>☁️ Sauvegarde en ligne</h3></div>
    <p id="mtCloudStatus" class="muted" aria-live="polite"></p>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      <button id="mtCloudLogin" type="button" class="primary">Connecter Google</button>
      <button id="mtCloudSync" type="button" class="secondary" hidden>Synchroniser</button>
      <button id="mtCloudLogout" type="button" class="ghost" hidden>Déconnecter</button>
    </div>`;
  home.appendChild(section);
  document.getElementById('mtCloudLogin').onclick = async () => {
    status('Connexion à Google…');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (error) {
      console.warn('Connexion Google', error);
      status('Connexion Google impossible. Vérifie le domaine autorisé dans Firebase.');
    }
  };
  document.getElementById('mtCloudSync').onclick = () => syncNow(true);
  document.getElementById('mtCloudLogout').onclick = () => signOut(auth);
  status(message);
  updateControls();
}

panel();
// Toutes les modifications existantes continuent a etre sauvegardees en local.
if (typeof window.save === 'function') {
  const previousSave = window.save;
  window.save = function(...args) {
    const result = previousSave.apply(this, args);
    localStorage.setItem(EDITED_KEY, String(Date.now()));
    queueSync();
    return result;
  };
}
onAuthStateChanged(auth, user => {
  currentUser = user;
  initialised = false;
  if (user) selectUserSignatures(user.uid);
  updateControls();
  if (user) {
    status('Compte Google connecté. Vérification des sauvegardes…');
    syncNow(true);
  } else status('Non connecté — tes séances restent enregistrées sur ce téléphone.');
});
window.addEventListener('online', () => syncNow(true));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentUser && initialised) syncNow(true);
});
