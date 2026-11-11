// Kayıtlardan türetilen hesaplar: günlük özetler, uyku durumu, persentiller, aşı takvimi...
import { db, baby, birthTs, age, correctedMonths, recs, between, per, mine } from './store.js';
import { startOfDay, DAY, MIN, HOUR, addMonths, addDays, trLower, cap, avg } from './util.js';
import { isNight, breastMin } from './types.js';
import { VACCINES, CHECKUPS, percentile } from './data/health.js';
import { sleepNorm, LEAPS, GROWTH_SPURTS } from './data/development.js';
import { FOODS } from './data/nutrition.js';

// --- Uyku ---
export function sleepSessions() {
  const list = recs('sleep').map((r) => ({ ts: r.ts, end: r.end || r.ts, id: r.id }));
  const t = per('timers').sleep;
  if (t) list.unshift({ ts: t.start, end: Date.now(), live: true });
  return list;
}
export function status() {
  const t = per('timers').sleep;
  if (t) return { asleep: true, since: t.start };
  const lastSleep = recs('sleep').find((r) => r.end);
  return { asleep: false, since: lastSleep ? lastSleep.end : null };
}

export function dayStats(dayTs) {
  const from = startOfDay(dayTs), to = from + DAY;
  const s = { day: from, sleepMs: 0, napMs: 0, nightMs: 0, naps: 0, feeds: 0, breastN: 0, breastMin: 0, bottleN: 0, bottleMl: 0, solidN: 0, pumpMl: 0, wet: 0, dirty: 0, diapers: 0, tummyMin: 0, blocks: [], maxTemp: null };
  for (const x of sleepSessions()) {
    const a = Math.max(x.ts, from), b = Math.min(x.end, to);
    if (b <= a) continue;
    s.sleepMs += b - a; s.blocks.push([a, b]);
    if (isNight(x.ts)) s.nightMs += b - a; else { s.napMs += b - a; if (x.ts >= from) s.naps++; }
  }
  for (const r of between(from, to)) {
    if (r.type === 'breast') { s.feeds++; s.breastN++; s.breastMin += breastMin(r); }
    else if (r.type === 'bottle') { if (r.kind !== 'water') { s.feeds++; s.bottleN++; s.bottleMl += r.ml || 0; } }
    else if (r.type === 'solid') s.solidN++;
    else if (r.type === 'pump') s.pumpMl += r.ml || 0;
    else if (r.type === 'diaper') { s.diapers++; if (r.kind === 'wet' || r.kind === 'both') s.wet++; if (r.kind === 'dirty' || r.kind === 'both') s.dirty++; }
    else if (r.type === 'activity' && r.kind === 'Karın üstü') s.tummyMin += r.min || 0;
    else if (r.type === 'temp') s.maxTemp = Math.max(s.maxTemp || 0, r.val || 0);
  }
  return s;
}
export const rangeStats = (days, endTs = Date.now()) => Array.from({ length: days }, (_, i) => dayStats(addDays(startOfDay(endTs), -(days - 1 - i))));
// Kayıt içeren tam günlerin ortalaması (bugün hariç)
export function weekAvg(days = 7) {
  const list = rangeStats(days + 1).slice(0, days).filter((d) => d.feeds || d.sleepMs || d.diapers);
  if (!list.length) return null;
  const m = (f) => avg(list.map(f));
  const sleepDays = list.filter((d) => d.sleepMs);
  return { n: list.length, sleepH: sleepDays.length ? avg(sleepDays.map((d) => d.sleepMs)) / HOUR : null, naps: sleepDays.length ? avg(sleepDays.map((d) => d.naps)) : null, feeds: m((d) => d.feeds), bottleMl: m((d) => d.bottleMl), solidN: m((d) => d.solidN), wet: m((d) => d.wet), dirty: m((d) => d.dirty), diapers: m((d) => d.diapers) };
}

// Sıradaki uyku tahmini: yaşa göre uyanıklık aralığı + bebeğin son 7 gündeki kendi ortalaması
export function nextSleep() {
  const st = status();
  const norm = sleepNorm(correctedMonths());
  if (st.asleep || !st.since) return { norm, st };
  const ss = recs('sleep').filter((r) => r.end && r.ts > Date.now() - 7 * DAY).sort((a, b) => a.ts - b.ts);
  const gaps = [];
  for (let i = 1; i < ss.length; i++) { const g = (ss[i].ts - ss[i - 1].end) / MIN; if (g > 20 && g < norm.wake[1] * 1.6 && !isNight(ss[i - 1].end - HOUR * 3)) gaps.push(g); }
  const personal = gaps.length >= 4 ? avg(gaps) : null;
  let lo = norm.wake[0], hi = norm.wake[1];
  if (personal) { const mid = Math.min(hi * 1.15, Math.max(lo * 0.85, personal)); lo = Math.round(mid * 0.9); hi = Math.round(mid * 1.1); }
  return { norm, st, from: st.since + lo * MIN, to: st.since + hi * MIN, personal, awakeMin: (Date.now() - st.since) / MIN, lo, hi };
}

// --- Büyüme ---
export function growthPoints(metric) {
  const b = baby(), out = [];
  if (b[{ weight: 'bw', height: 'bh', head: 'bhc' }[metric]]) out.push({ ts: birthTs(), v: b[{ weight: 'bw', height: 'bh', head: 'bhc' }[metric]], birth: true });
  for (const r of recs('growth').slice().reverse()) if (r[metric]) out.push({ ts: r.ts, v: r[metric], id: r.id });
  return out.map((p) => ({ ...p, m: Math.max(0, (p.ts - birthTs()) / (DAY * 30.4375)) })).sort((a, c) => a.ts - c.ts);
}
export function latestGrowth(metric) {
  const pts = growthPoints(metric);
  if (!pts.length) return null;
  const p = pts[pts.length - 1], b = baby();
  const corr = b.gestWeeks && b.gestWeeks < 37 && p.m < 24 ? Math.max(0, p.m - (40 - b.gestWeeks) / 4.345) : p.m;
  const prev = pts.length > 1 ? pts[pts.length - 2] : null;
  return { ...p, pct: percentile(metric, b.gender, corr, p.v), prev, prevPct: prev ? percentile(metric, b.gender, prev.m, prev.v) : null };
}

// --- Aşılar ve izlemler ---
export function vaccineList() {
  const done = per('vaccines'), b0 = birthTs(), now = startOfDay();
  const custom = (done._custom || []).map((c) => ({ ...c, custom: true }));
  return [...VACCINES, ...custom].map((v) => {
    const due = v.date ? new Date(v.date).getTime() : (v.m === 0 ? b0 : addMonths(b0, v.m));
    const d = done[v.id];
    let state = 'later';
    if (d?.date) state = 'done';
    else if (d?.skip) state = 'skip';
    else if (due < now - 14 * DAY) state = 'overdue';
    else if (due <= now + 21 * DAY) state = 'soon';
    return { ...v, due, done: d, state };
  }).sort((a, b) => a.due - b.due || (a.opt ? 1 : 0) - (b.opt ? 1 : 0));
}
export const vaccinesDue = () => vaccineList().filter((v) => !v.opt && (v.state === 'overdue' || v.state === 'soon'));
export function nextCheckup() {
  const visits = mine('visits'), b0 = birthTs(), now = startOfDay();
  const planned = visits.filter((v) => !v.done && v.date).map((v) => ({ ...v, ts: new Date(v.date).getTime() })).sort((a, b) => a.ts - b.ts);
  const upcoming = planned.find((v) => v.ts >= now - DAY);
  const rec = CHECKUPS.map((c) => ({ ...c, ts: c.m < 1 ? b0 + c.m * 30 * DAY : addMonths(b0, c.m) })).find((c) => c.ts >= now - 10 * DAY && !visits.some((v) => v.date && Math.abs(new Date(v.date).getTime() - c.ts) < 21 * DAY));
  return { upcoming, rec, overduePlanned: planned.filter((v) => v.ts < now - DAY) };
}

// --- Takviyeler ---
export function suppToday() {
  const today = between(startOfDay(), startOfDay() + DAY, 'supp');
  return mine('supps').filter((s) => s.active !== false).map((s) => ({ ...s, given: today.filter((r) => trLower(r.name) === trLower(s.name)).length }));
}
export function suppAdherence(days = 7) {
  const list = mine('supps').filter((s) => s.active !== false);
  if (!list.length) return null;
  const from = startOfDay() - days * DAY, rs = between(from, startOfDay(), 'supp');
  return list.map((s) => {
    const since = Math.max(from, s.created || 0);
    const span = Math.max(1, Math.round((startOfDay() - startOfDay(since)) / DAY));
    const given = rs.filter((r) => trLower(r.name) === trLower(s.name) && r.ts >= since).length;
    return { name: s.name, pct: Math.min(100, Math.round((given / (Math.min(days, span) * (s.perDay || 1))) * 100)), span };
  });
}

// --- Ek gıda ---
const FOOD_INDEX = new Map(FOODS.map((f) => [trLower(f.n), f]));
export const foodInfo = (name) => FOOD_INDEX.get(trLower(name)) || null;
export function foodsTried() {
  const map = new Map();
  for (const r of recs('solid').slice().reverse()) {
    for (const raw of r.foods || []) {
      const k = trLower(raw);
      const cur = map.get(k) || { key: k, n: foodInfo(raw)?.n || cap(raw.trim()), first: r.ts, count: 0, days: new Set(), reactions: 0, loved: 0, no: 0, info: foodInfo(raw) };
      cur.count++; cur.last = r.ts; cur.days.add(startOfDay(r.ts));
      if (r.react === 'reaction') cur.reactions++;
      if (r.react === 'loved') cur.loved++;
      if (r.react === 'no') cur.no++;
      map.set(k, cur);
    }
  }
  return map;
}
export function allergenExposure() {
  const tried = foodsTried(), out = {};
  for (const f of tried.values()) if (f.info?.al) { out[f.info.al] = out[f.info.al] || { count: 0, last: 0 }; out[f.info.al].count += f.count; out[f.info.al].last = Math.max(out[f.info.al].last, f.last); }
  return out;
}
export const allergyNames = () => mine('allergies').map((a) => trLower(a.allergen));

// --- Gelişim atakları ---
export function leapInfo() {
  const b = baby();
  // Ataklar beklenen doğum tarihine göre hesaplanır
  const dueTs = birthTs() + (b.gestWeeks ? (40 - b.gestWeeks) * 7 * DAY : 0);
  const w = (Date.now() - dueTs) / (7 * DAY);
  const current = LEAPS.find((l) => w >= l.from && w <= l.to) || null;
  const next = LEAPS.find((l) => l.from > w) || null;
  const d = age().totalDays;
  const spurt = GROWTH_SPURTS.find(([a, z]) => d >= a && d <= z) || null;
  return { week: w, current, next, nextInDays: next ? Math.ceil((next.from - w) * 7) : null, dueTs, spurt };
}

// Son ilaç: tekrar doz verilebilir mi?
export function medWindow() {
  const out = [];
  const seen = new Set();
  for (const r of recs('med')) {
    if (Date.now() - r.ts > DAY) break;
    const k = trLower(r.name); if (seen.has(k)) continue; seen.add(k);
    if (r.gap) out.push({ name: r.name, nextAt: r.ts + r.gap * HOUR, last: r.ts, dose: r.dose });
  }
  return out;
}
export { age };
