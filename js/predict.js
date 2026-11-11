// Tahmin motoru: bebeğin son günlerdeki kendi düzeninden öğrenir, yaş normlarıyla harmanlar.
// - Günün kalan uykularını, yatış saatini ve (uyuyorsa) uyanma saatini öngörür
// - Sıradaki beslenme zamanını tahmin eder
import { recs, per, last, correctedMonths } from './store.js';
import { latestGrowth, age } from './calc.js';
import { sleepNorm } from './data/development.js';
import { feedNorm } from './data/nutrition.js';
import { MIN, HOUR, DAY, dayKey, startOfDay, clamp } from './util.js';

const hourOf = (ts) => { const d = new Date(ts); return d.getHours() + d.getMinutes() / 60; };
const clockMin = (ts) => Math.round(hourOf(ts) * 60);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// Kişisel örnekler azken yaş ortalamasına yaslan, çoğaldıkça bebeğin kendi değerine yaklaş
const blend = (samples, prior, k = 2) => { const n = samples?.length || 0; return n ? (n * median(samples) + k * prior) / (n + k) : prior; };
const confOf = (n) => (n >= 5 ? 'high' : n >= 2 ? 'mid' : 'low');
export const CONF = { high: 'Yüksek güven · kendi düzenine göre', mid: 'Orta güven · öğreniyorum', low: 'Yaş ortalamasına göre' };

// Gece uykusu mu, gündüz uykusu mu?
function nightLike(start, end) {
  const h = hourOf(start), dur = ((end || Date.now()) - start) / HOUR;
  return h >= 21.5 || h < 5 || (h >= 18 && (dur >= 2.5 || (!end && h >= 18.75)));
}
const PRIOR_DUR = { 0: [], 1: [120], 2: [85, 85], 3: [80, 80, 35], 4: [70, 60, 45, 30] };

function learn() {
  const mo = correctedMonths(), norm = sleepNorm(mo);
  const N = Math.round((norm.naps[0] + norm.naps[1]) / 2), [lo, hi] = norm.wake;
  const sleeps = recs('sleep').filter((r) => r.end && r.end <= Date.now() + MIN && r.ts > Date.now() - 16 * DAY).sort((a, b) => a.ts - b.ts);
  const days = {}, day = (k) => (days[k] = days[k] || { key: k, naps: [], wake: null, bed: null, nightMs: 0 });
  for (const s of sleeps) {
    if (nightLike(s.ts, s.end)) {
      const eh = hourOf(s.end);
      if (eh >= 4.5 && eh <= 10.5) { const d = day(dayKey(s.end)); d.wake = Math.max(d.wake || 0, s.end); }
      if (hourOf(s.ts) >= 18) { const d = day(dayKey(s.ts)); d.bed = d.bed ? Math.min(d.bed, s.ts) : s.ts; }
      day(dayKey(s.end)).nightMs += s.end - s.ts;
    } else day(dayKey(s.ts)).naps.push(s);
  }
  const today = dayKey(), ww = [], dur = [], wwBed = [], napCount = [], bedClock = [], wakeClock = [], nightMs = [], anyGap = [], anyDur = [];
  const list = Object.values(days).sort((a, b) => (a.key < b.key ? 1 : -1)).slice(0, 11);
  for (const d of list) {
    d.naps.sort((a, b) => a.ts - b.ts);
    let prev = d.wake;
    d.naps.forEach((n, i) => {
      if (prev) { const g = (n.ts - prev) / MIN; if (g > 20 && g < hi * 2.2) { (ww[i] = ww[i] || []).push(g); anyGap.push(g); } }
      const m = (n.end - n.ts) / MIN; if (m >= 10) { (dur[i] = dur[i] || []).push(m); anyDur.push(m); }
      prev = n.end;
    });
    if (d.bed && prev && d.bed > prev) { const g = (d.bed - prev) / MIN; if (g > 30 && g < hi * 2.4) wwBed.push(g); }
    if (d.wake) wakeClock.push(clockMin(d.wake));
    if (d.bed) bedClock.push(clockMin(d.bed));
    if (d.nightMs > 4 * HOUR) nightMs.push(d.nightMs / MIN);
    if (d.key !== today && d.wake && d.bed) napCount.push(d.naps.length);
  }
  const [b1, b2] = norm.bed.split('–').map((x) => { const [h, m] = x.split(':').map(Number); return h * 60 + m; });
  const typicalN = napCount.length >= 3 ? Math.round(median(napCount)) : Math.min(N, 4);
  return {
    norm, N, lo, hi, days, typicalN, newborn: N > 4 || mo < 3,
    wwAt: (i) => blend(ww[i], lo + (hi - lo) * Math.min(1, i / Math.max(1, typicalN))), wwN: (i) => ww[i]?.length || 0,
    durAt: (i) => blend(dur[i], (PRIOR_DUR[Math.min(4, Math.max(typicalN, 1))] || [])[i] ?? 45),
    wwBed: blend(wwBed, hi), wwBedN: wwBed.length,
    bedClock: blend(bedClock, (b1 + b2) / 2, 3), wakeClock: blend(wakeClock, 7 * 60, 3), nightMin: blend(nightMs, ((norm.night[0] + norm.night[1]) / 2) * 60, 3),
    anyGap: blend(anyGap.slice(0, 12), (lo + hi) / 2), anyGapN: anyGap.length, anyDur: blend(anyDur.slice(0, 12), mo < 3 ? 80 : 60),
    samples: { days: list.filter((d) => d.wake || d.naps.length).length, bed: bedClock.length, wake: wakeClock.length, naps: napCount.length },
  };
}

export function predictSleep() {
  const now = Date.now(), M = learn(), live = per('timers').sleep;
  const done = recs('sleep').find((r) => r.end && r.end <= now + MIN);
  const since = done ? done.end : null;
  const out = { norm: M.norm, model: M, plan: [], next: null, asleep: !!live, since: live ? live.start : since, basis: [] };
  if (!live && (!since || now - since > 16 * HOUR)) { out.empty = true; return out; }

  const today = M.days[dayKey()] || { naps: [], wake: null };
  const todayStart = startOfDay();
  const napsDone = today.naps;
  // Bugün tamamlanan uykular (plan görünümü için)
  if (today.wake) out.plan.push({ kind: 'wake', start: today.wake, done: true });
  napsDone.forEach((n, i) => out.plan.push({ kind: 'nap', idx: i, start: n.ts, end: n.end, done: true }));
  let k = napsDone.length;

  // --- Yenidoğan / çok uykulu dönem: sabit uyanıklık aralığı ---
  if (M.newborn) {
    if (live) { const end = Math.max(live.start + M.anyDur * MIN, now); out.next = { kind: 'wake', at: end, conf: confOf(M.anyGapN) }; out.plan.push({ kind: nightLike(live.start) ? 'night' : 'nap', start: live.start, end, live: true }); return out; }
    const w = M.anyGap, at = since + w * MIN, tol = Math.max(8, w * 0.12) * MIN;
    out.next = { kind: 'nap', at, from: at - tol, to: at + tol, dur: M.anyDur, conf: confOf(M.anyGapN), ww: w };
    out.plan.push({ kind: 'nap', start: at, end: at + M.anyDur * MIN });
    out.state = stateOf(out.next, now);
    return out;
  }

  let targetBed = todayStart + M.bedClock * MIN;
  const h = hourOf(now);
  // --- Uyuyor ---
  let t = since, first = true;
  if (live) {
    if (nightLike(live.start)) {
      let wake = startOfDay(live.start) + M.wakeClock * MIN;
      if (wake < live.start + 5 * HOUR) wake += DAY;
      const byDur = live.start + M.nightMin * MIN;
      wake = Math.max(now, (wake + byDur) / 2);
      out.next = { kind: 'wake', at: wake, conf: confOf(M.samples.wake), night: true };
      out.plan = [{ kind: 'night', start: live.start, end: wake, live: true }];
      return out;
    }
    const end = Math.max(live.start + M.durAt(k) * MIN, now);
    out.next = { kind: 'wake', at: end, conf: confOf(M.wwN(k)), over: now > live.start + M.durAt(k) * MIN + 10 * MIN };
    out.plan.push({ kind: 'nap', idx: k, start: live.start, end, live: true });
    t = end; k++; first = false;
  } else if (h >= 22 || h < 4.5) {
    // Gece yarısı uyanık: hedef yeniden uykuya dönmek
    out.next = { kind: 'night', at: now, from: now, to: now + 20 * MIN, conf: 'mid', back: true };
    out.plan.push({ kind: 'night', start: now, back: true, ww: 0 });
    out.state = 'now';
    return out;
  }
  if (h < 4.5) targetBed -= DAY;

  // --- İlk uyanıklık aralığı için yorgunluk düzeltmesi ---
  let adj = 1, skipped = false;
  if (!live) {
    const ln = napsDone[napsDone.length - 1];
    if (ln) {
      const d = (ln.end - ln.ts) / MIN, exp = M.durAt(napsDone.length - 1);
      if (d < exp * 0.6) { adj = 0.85; out.basis.push('Son uykusu kısa sürdü; yorgunluk birikmeden biraz erken yatırın'); }
      else if (d > exp * 1.4) { adj = 1.08; out.basis.push('Son uykusu uzun sürdü; biraz daha uzun dayanabilir'); }
    } else if (today.nightMs && today.nightMs / MIN < M.nightMin - 75) { adj = 0.9; out.basis.push('Gece az uyudu; ilk uykuyu erkene alın'); }
  }

  // --- Kalan gündüz uykuları ---
  while (k < Math.max(M.typicalN, 0)) {
    const w = M.wwAt(k) * (first ? adj : 1), start = t + w * MIN, d = M.durAt(k);
    // Yatış saatine çok yaklaşıyorsa bu uykuyu atla, geceyi erkene al
    const eff = first && !live ? Math.max(start, now) : start;
    if (eff + d * MIN + M.wwBed * 0.75 * MIN > targetBed + 45 * MIN) { if (first && !live && now > start) { out.basis.unshift('Gündüz uykusu kaçtı; gece uykusunu erkene alın'); skipped = true; } break; }
    const tol = Math.max(10, w * 0.1) * MIN;
    const item = { kind: 'nap', idx: k, start, end: start + d * MIN, from: start - tol, to: start + tol, dur: d, ww: w, conf: confOf(M.wwN(k)) };
    out.plan.push(item);
    if (!out.next || out.next.kind === 'wake') out.nextSleep = out.nextSleep || item;
    if (!out.next) out.next = { ...item, at: start };
    t = Math.max(start, first && !live ? now : start) + d * MIN;
    k++; first = false;
  }
  // --- Gece uykusu ---
  let bed = t + M.wwBed * (first ? adj : 1) * MIN;
  bed = clamp(bed, targetBed - 60 * MIN, targetBed + 75 * MIN);
  bed = skipped ? Math.max(targetBed - 60 * MIN, Math.min(now + 20 * MIN, targetBed)) : Math.max(bed, t + M.wwBed * 0.6 * MIN);
  const tolB = 15 * MIN;
  const night = { kind: 'night', start: bed, from: bed - tolB, to: bed + tolB, ww: (bed - t) / MIN, conf: confOf(Math.min(M.samples.bed, M.wwBedN)) };
  out.plan.push(night);
  if (!out.next) out.next = { ...night, at: bed };
  out.bedtime = bed;
  if (out.next.kind !== 'wake') out.state = stateOf(out.next, now);
  if (M.samples.days >= 3) out.basis.push(`Son ${M.samples.days} günün düzeninden öğrenildi`);
  return out;
}
// early: daha var · soon: 20 dk içinde · now: ideal aralık · late: gecikti
function stateOf(n, now) { return now > n.to ? 'late' : now >= n.from ? 'now' : now >= n.from - 20 * MIN ? 'soon' : 'early'; }

// Sıradaki beslenme: gündüz beslenme aralıklarının medyanı (kişisel) + yaş normu
export function predictFeed() {
  const milk = recs(['breast', 'bottle']).filter((r) => r.kind !== 'water');
  const lf = milk[0]; if (!lf || Date.now() - lf.ts > 12 * HOUR) return null;
  const fn = feedNorm(age().exactMonths, latestGrowth('weight')?.v);
  const prior = (16 * 60) / ((fn.feeds[0] + fn.feeds[1]) / 2);
  const gaps = [], recent = milk.filter((r) => r.ts > Date.now() - 7 * DAY);
  for (let i = 0; i < recent.length - 1; i++) { const g = (recent[i].ts - recent[i + 1].ts) / MIN, h = hourOf(recent[i].ts); if (g >= 45 && g <= 360 && h >= 6.5 && h <= 22.5) gaps.push(g); }
  const gap = blend(gaps, prior, 3);
  return { at: lf.ts + gap * MIN, gap, last: lf.ts, conf: confOf(gaps.length / 2), due: Date.now() > lf.ts + gap * MIN };
}
export { last };
