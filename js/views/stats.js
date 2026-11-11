// Analiz: dönemsel grafikler ve yaş normlarıyla karşılaştırma
import { recs } from '../store.js';
import { age, rangeStats, nextSleep, latestGrowth } from '../calc.js';
import { on, seg, sec, barChart, empty } from '../ui.js';
import { HOUR, DAY, fmtDayShort, round1, avg, fmtNum, startOfDay } from '../util.js';
import { feedNorm } from '../data/nutrition.js';

let range = 7;
on('statRange', (d) => { range = Number(d.v); document.dispatchEvent(new Event('rerender')); });
const lab = (d, n) => (n <= 7 ? fmtDayShort(d.day) : String(new Date(d.day).getDate()));

export function render() {
  const days = rangeStats(range), act = days.filter((d) => d.feeds || d.sleepMs || d.diapers);
  if (!act.length) return `<h1 style="margin-bottom:14px">Analiz</h1><div class="card">${empty('📊', 'Grafikler için birkaç günlük kayıt gerekiyor. Beslenme, uyku ve bez kayıtlarını ekledikçe burada eğilimleri göreceksiniz.')}</div>`;
  const norm = nextSleep().norm, fn = feedNorm(age().exactMonths, latestGrowth('weight')?.v);
  const full = act.filter((d) => d.day < startOfDay());
  const src = full.length ? full : act;
  const m = (f) => avg(src.map(f));
  const sleepDays = src.filter((d) => d.sleepMs);
  const sleepAvg = sleepDays.length ? avg(sleepDays.map((d) => d.sleepMs)) / HOUR : null;
  const cmp = (v, lo, hi) => (v == null ? '' : v < lo ? `<span class="badge c-warn">hedefin altında</span>` : v > hi ? `<span class="badge c-care">hedefin üstünde</span>` : `<span class="badge c-ok">hedefte</span>`);
  const card = (title, sub, chart, legend = '') => `<div class="card stack-sm"><div class="row between"><h3>${title}</h3>${sub}</div>${chart}${legend ? `<div class="legend">${legend}</div>` : ''}</div>`;
  const lg = (c, t) => `<span><i style="background:${c}"></i>${t}</span>`;
  const hasBottle = days.some((d) => d.bottleMl), hasBreast = days.some((d) => d.breastMin), hasSolid = days.some((d) => d.solidN);

  // Uyku ısı şeridi (gün × 24 saat)
  const strips = days.slice(-14).map((d) => `<div class="row tiny" style="gap:6px"><span class="muted" style="width:26px">${lab(d, 14)}</span><div class="day24 grow" style="height:14px;border-radius:5px">${d.blocks.map(([a, b]) => `<i style="left:${((a - d.day) / DAY) * 100}%;width:${((b - a) / DAY) * 100}%"></i>`).join('')}</div></div>`).join('');

  return `<h1 style="margin-bottom:14px">Analiz</h1>${seg('statRange', [['7', '7 gün'], ['14', '14 gün'], ['30', '30 gün']], String(range))}
  <div class="stats" style="margin-top:14px">
    <div class="stat"><div class="v num">${sleepAvg != null ? round1(sleepAvg) : '–'}<small> sa</small></div><div class="k">Uyku / gün</div><div class="d">hedef ${norm.total.join('–')} sa</div></div>
    <div class="stat"><div class="v num">${round1(m((d) => d.feeds))}</div><div class="k">Beslenme / gün</div><div class="d">hedef ${fn.feeds.join('–')}</div></div>
    <div class="stat"><div class="v num">${round1(m((d) => d.wet))}</div><div class="k">Islak bez / gün</div><div class="d">en az ${fn.wet}</div></div>
    <div class="stat"><div class="v num">${round1(m((d) => d.dirty))}</div><div class="k">Kirli bez / gün</div><div class="d">${src.length} günün ortalaması</div></div></div>
  <div class="cols" style="margin-top:14px"><div class="stack">
  ${card('😴 Uyku', cmp(sleepAvg, norm.total[0] - 0.5, norm.total[1] + 0.5), barChart(days.map((d) => ({ label: lab(d, range), parts: [{ v: d.nightMs / HOUR, color: 'var(--sleep)' }, { v: d.napMs / HOUR, color: 'color-mix(in srgb, var(--sleep) 45%, transparent)' }] })), { band: norm.total, unit: 'saat' }), lg('var(--sleep)', 'Gece') + lg('color-mix(in srgb, var(--sleep) 45%, transparent)', 'Gündüz') + lg('color-mix(in srgb, var(--ok) 25%, transparent)', 'Hedef aralığı'))}
  ${days.some((d) => d.blocks.length) ? card('🕐 Uyku düzeni', '<span class="tiny muted">00 – 24</span>', `<div class="stack-sm" style="--s:4px">${strips}</div>`) : ''}
  </div><div class="stack">
  ${card('🍼 Beslenme sayısı', cmp(m((d) => d.feeds), fn.feeds[0] - 0.5, fn.feeds[1] + 0.5), barChart(days.map((d) => ({ label: lab(d, range), parts: [{ v: d.breastN, color: 'var(--feed)' }, { v: d.bottleN, color: 'color-mix(in srgb, var(--feed) 45%, transparent)' }, { v: d.solidN, color: 'var(--solid)' }] })), { unit: 'öğün', fmt: (v) => Math.round(v) }), lg('var(--feed)', 'Emzirme') + lg('color-mix(in srgb, var(--feed) 45%, transparent)', 'Biberon') + (hasSolid ? lg('var(--solid)', 'Ek gıda') : ''))}
  ${hasBottle ? card('🥛 Biberon miktarı', `<span class="small muted">ort. ${Math.round(m((d) => d.bottleMl))} ml</span>`, barChart(days.map((d) => ({ label: lab(d, range), parts: [{ v: d.bottleMl, color: 'var(--feed)' }] })), { unit: 'ml', fmt: (v) => Math.round(v), band: recs('breast').length < 5 ? fn.ml : null })) : ''}
  ${hasBreast ? card('🤱 Emzirme süresi', `<span class="small muted">ort. ${Math.round(m((d) => d.breastMin))} dk</span>`, barChart(days.map((d) => ({ label: lab(d, range), parts: [{ v: d.breastMin, color: 'var(--feed)' }] })), { unit: 'dk', fmt: (v) => Math.round(v) })) : ''}
  ${card('🧷 Bez', `<span class="small muted">ort. ${round1(m((d) => d.diapers))}</span>`, barChart(days.map((d) => ({ label: lab(d, range), parts: [{ v: d.wet, color: 'var(--care)' }, { v: d.dirty, color: 'var(--diaper)' }] })), { unit: 'bez', fmt: (v) => Math.round(v) }), lg('var(--care)', 'Islak') + lg('var(--diaper)', 'Kirli'))}
  </div></div>
  <button class="btn soft block" style="margin-top:16px" data-act="askAi" data-q="Son ${range} günün uyku, beslenme ve bez verilerini analiz edip güçlü yönleri, dikkat edilmesi gerekenleri ve bu hafta için 3 somut öneriyi yazar mısın?">✨ Asistandan ${range} günlük yorum iste</button>
  <p class="disc">Hedef aralıkları ${fmtNum(age().exactMonths, 0)} aylık bebekler için genel referanslardır; her bebek farklıdır.</p>`;
}
