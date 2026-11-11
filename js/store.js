// Veri katmanı: tüm veriler cihazda (localStorage) tutulur.
import { uid, startOfDay, DAY, ageAt, parseDay } from './util.js';

const KEY = 'pitir_v1';
const blank = () => ({
  v: 1, babies: [], activeId: null, records: [],
  vaccines: {}, visits: [], supps: [], allergies: [], teeth: {}, milestones: {}, products: [], foodNotes: {}, timers: {},
  chat: [], settings: { theme: 'auto', apiKey: '', model: 'claude-opus-5-5', apiBase: '', parent: '' },
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(blank(), JSON.parse(raw));
  } catch (e) { console.warn('Veri okunamadı', e); }
  return blank();
}
export let db = load();
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export function save(silent = false) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.error('Kaydedilemedi', e); }
  if (!silent) listeners.forEach((fn) => fn());
}
export function replaceDb(next) { db = Object.assign(blank(), next); save(); }
export function resetDb() { db = blank(); save(); }

// --- Bebek ---
export const baby = () => db.babies.find((b) => b.id === db.activeId) || db.babies[0] || null;
export const birthTs = (b = baby()) => parseDay(b.birth);
export const age = (at = Date.now(), b = baby()) => ageAt(birthTs(b), at);
// Prematüre bebeklerde düzeltilmiş yaş (2 yaşa kadar)
export function correctedMonths(at = Date.now(), b = baby()) {
  const a = age(at, b);
  if (b.gestWeeks && b.gestWeeks < 37 && a.exactMonths < 24) return Math.max(0, a.exactMonths - (40 - b.gestWeeks) / 4.345);
  return a.exactMonths;
}
export function addBaby(data) {
  const b = { id: uid(), name: '', birth: '', gender: 'M', ...data };
  db.babies.push(b); db.activeId = b.id; save();
  return b;
}
// Bebeğe özel sözlük (aşılar, dişler, basamaklar, zamanlayıcılar...)
export function per(name, b = baby()) {
  if (!db[name] || Array.isArray(db[name])) db[name] = {};
  if (!db[name][b.id]) db[name][b.id] = {};
  return db[name][b.id];
}
export const mine = (name) => db[name].filter((x) => x.babyId === db.activeId);

// --- Kayıtlar ---
let cache = null, cacheFor = null;
onChange(() => { cache = null; });
function all() {
  if (!cache || cacheFor !== db.activeId) {
    cache = db.records.filter((r) => r.babyId === db.activeId).sort((a, b) => b.ts - a.ts);
    cacheFor = db.activeId;
  }
  return cache;
}
export const recs = (type) => (type ? all().filter((r) => (Array.isArray(type) ? type.includes(r.type) : r.type === type)) : all());
export const last = (type) => recs(type)[0] || null;
export const between = (from, to, type) => recs(type).filter((r) => r.ts >= from && r.ts < to);
export const onDay = (dayTs, type) => between(startOfDay(dayTs), startOfDay(dayTs) + DAY, type);
export function addRec(type, data = {}) {
  const r = { id: uid(), babyId: db.activeId, type, ts: Date.now(), ...data };
  db.records.push(r); cache = null; save();
  return r;
}
export function updateRec(id, data) {
  const r = db.records.find((x) => x.id === id);
  if (r) { Object.assign(r, data); cache = null; save(); }
  return r;
}
export function delRec(id) { db.records = db.records.filter((x) => x.id !== id); cache = null; save(); }
export const getRec = (id) => db.records.find((x) => x.id === id);

// Liste koleksiyonları (visits, supps, allergies, products)
export function addTo(name, data) { const x = { id: uid(), babyId: db.activeId, ...data }; db[name].push(x); save(); return x; }
export function updateIn(name, id, data) { const x = db[name].find((y) => y.id === id); if (x) { Object.assign(x, data); save(); } }
export function delFrom(name, id) { db[name] = db[name].filter((y) => y.id !== id); save(); }

// --- Eski sürümden (BabyAI prototipi) veri aktarımı ---
export function legacyLogs() {
  try { return JSON.parse(localStorage.getItem('baby_logs')) || []; } catch { return []; }
}
export function importLegacy() {
  const logs = legacyLogs().sort((a, b) => a.timestamp - b.timestamp);
  let open = null, n = 0;
  for (const l of logs) {
    if (l.type === 'sleep') {
      if (/Uyudu/.test(l.title)) open = l.timestamp;
      else if (open) { db.records.push({ id: uid(), babyId: db.activeId, type: 'sleep', ts: open, end: l.timestamp }); open = null; n++; }
    } else if (l.type === 'feed') {
      const m = String(l.title).match(/(\d+)\s*(cc|ml)/i);
      db.records.push(m ? { id: uid(), babyId: db.activeId, type: 'bottle', ts: l.timestamp, kind: 'formula', ml: +m[1] } : { id: uid(), babyId: db.activeId, type: 'breast', ts: l.timestamp, note: l.title });
      n++;
    } else if (l.type) {
      db.records.push({ id: uid(), babyId: db.activeId, type: 'diaper', ts: l.timestamp, kind: 'wet', note: l.title }); n++;
    }
  }
  if (open && Date.now() - open < 14 * 3600000) per('timers').sleep = { start: open };
  localStorage.setItem('baby_logs_imported', '1');
  save();
  return n;
}
export const hasLegacy = () => legacyLogs().length > 0 && !localStorage.getItem('baby_logs_imported');
