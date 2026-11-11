// Sağlık modülleri: büyüme, aşılar, doktor kontrolleri, sağlık günlüğü, takviyeler, alerjiler, dişler, bakım, acil rehber, doktor raporu
import { db, baby, save, recs, last, between, per, mine, addTo, updateIn, delFrom, addRec, birthTs, correctedMonths } from '../store.js';
import { age, growthPoints, latestGrowth, vaccineList, nextCheckup, suppToday, suppAdherence, medWindow, weekAvg, foodsTried } from '../calc.js';
import { on, openForm, toast, seg, sec, empty, backBtn, lineChart, sheet, closeSheet } from '../ui.js';
import { recRow } from '../entry.js';
import { esc, fmtDate, fmtNum, fmtTime, inDays, ago, dayKey, DAY, addMonths, startOfDay, uid, md, round1, fmtDur } from '../util.js';
import { valueAtZ, PCT_LINES, TEETH, SUPP_PRESETS, EMERGENCY, CARE_KINDS, PRODUCT_TYPES, CARE_GUIDE, CHECKUPS, feverAdvice } from '../data/health.js';
import { ALLERGENS } from '../data/nutrition.js';
import { MILESTONES } from '../data/development.js';
import { TYPES, summary } from '../types.js';

const rerender = () => document.dispatchEvent(new Event('rerender'));
const head = (title, btn = '') => `${backBtn()}<div class="row between" style="margin-bottom:14px"><h1>${title}</h1>${btn}</div>`;

// ---------- Büyüme ----------
let metric = 'weight';
const METRICS = { weight: ['Kilo', 'kg', 2], height: ['Boy', 'cm', 1], head: ['Baş çevresi', 'cm', 1] };
on('metric', (d) => { metric = d.v; rerender(); });
export function growth() {
  const b = baby(), pts = growthPoints(metric), [name, unit, dec] = METRICS[metric];
  const maxM = Math.min(60, Math.max(6, Math.ceil(age().exactMonths) + 2));
  const xs = Array.from({ length: maxM * 2 + 1 }, (_, i) => i / 2);
  const curves = PCT_LINES.map(([z, l]) => ({ pts: xs.map((x) => [x, valueAtZ(metric, b.gender, x, z)]), color: z === 0 ? 'var(--ok)' : 'var(--ink3)', width: z === 0 ? 1.6 : 1, dash: z === 0 ? '' : '3 3', label: l, op: 0.9 }));
  const mine_ = { pts: pts.filter((p) => p.m <= maxM).map((p) => [p.m, p.v]), color: 'var(--brand)', width: 2.6, dots: true };
  const ys = [...curves[0].pts, ...curves[4].pts, ...mine_.pts].map((p) => p[1]);
  const chart = lineChart([...curves, mine_], { xmin: 0, xmax: maxM, ymin: Math.floor(Math.min(...ys) * 0.97), ymax: Math.ceil(Math.max(...ys) * 1.02), xfmt: (v) => Math.round(v), yfmt: (v) => fmtNum(v, metric === 'weight' ? 1 : 0), xticks: Math.min(maxM, 6) });
  const cards = Object.entries(METRICS).map(([k, [n, u, d]]) => { const g = latestGrowth(k); return `<div class="stat"><div class="v num">${g ? fmtNum(g.v, d) : '–'}<small> ${u}</small></div><div class="k">${n}</div><div class="d">${g ? `${Math.round(g.pct)}. persentil` : 'ölçüm yok'}</div></div>`; }).join('');
  const list = recs('growth');
  const g = latestGrowth(metric);
  return `${head('Büyüme', '<button class="btn sm" data-act="rec" data-type="growth">＋ Ölçüm</button>')}
  <div class="stats" style="grid-template-columns:repeat(3,1fr)">${cards}</div>
  <div class="card stack" style="margin-top:14px">${seg('metric', Object.entries(METRICS).map(([k, v]) => [k, v[0]]), metric)}
    ${chart}<div class="row between tiny muted"><span>Yaş (ay) · ${name} (${unit})</span><span>WHO persentilleri: 3 · 15 · 50 · 85 · 97</span></div>
    ${g ? `<div class="insight c-${g.pct < 3 || g.pct > 97 ? 'warn' : 'ok'}"><span class="ic">📈</span><div><div class="t">${name}: ${Math.round(g.pct)}. persentil</div><div class="s">Aynı yaş ve cinsiyetteki 100 bebekten yaklaşık ${Math.round(g.pct)} tanesi daha ${metric === 'weight' ? 'hafif' : 'küçük'}. Önemli olan tek ölçüm değil, bebeğin kendi eğrisini izlemesidir.</div></div></div>` : ''}
    ${b.gestWeeks && b.gestWeeks < 37 ? '<p class="tiny muted">Prematüre doğum nedeniyle persentiller 2 yaşa kadar düzeltilmiş yaşa göre hesaplanır.</p>' : ''}</div>
  ${sec('Ölçümler')}${list.length ? `<div class="list">${list.map((r) => `<button class="item c-growth" data-act="rec" data-type="growth" data-id="${r.id}"><span class="tile sm">📏</span><span class="grow"><div class="t">${esc(summary(r))}</div><div class="s">${fmtDate(r.ts)} · ${age(r.ts).text}</div></span></button>`).join('')}</div>` : `<div class="card">${empty('📏', 'Henüz ölçüm yok. Doktor kontrolündeki değerleri ekleyin.')}</div>`}`;
}

// ---------- Aşılar ----------
let vacTab = 'main';
on('vacTab', (d) => { vacTab = d.v; rerender(); });
on('vac', (d) => {
  const v = vaccineList().find((x) => x.id === d.id), store = per('vaccines'), cur = store[d.id] || {};
  openForm({
    title: `💉 ${v.name}`, intro: `<p class="muted small" style="margin-bottom:12px">${esc(v.dose)} · Planlanan: ${fmtDate(v.due)}${v.about ? '<br>' + esc(v.about) : ''}</p>`,
    fields: [{ k: 'date', l: 'Yapıldığı tarih', t: 'date', req: true }, { k: 'place', l: 'Yer / hekim', t: 'text', ph: 'Aile Sağlığı Merkezi' }, { k: 'note', l: 'Yan etki / not', t: 'area', ph: 'örn. hafif ateş, bacakta kızarıklık' }],
    values: { date: cur.date || dayKey(Math.min(Date.now(), Math.max(v.due, birthTs()))), place: cur.place, note: cur.note }, saveLabel: 'Yapıldı olarak işaretle',
    onSave: (x) => { store[d.id] = x; save(); toast('Aşı kaydedildi ✓'); },
    onDelete: cur.date ? () => { delete store[d.id]; save(); } : null,
  });
});
on('vacAdd', () => openForm({
  title: 'Özel aşı ekle', fields: [{ k: 'name', l: 'Aşı adı', t: 'text', req: true }, { k: 'dose', l: 'Doz', t: 'text', ph: '1. doz' }, { k: 'date', l: 'Planlanan tarih', t: 'date', req: true }],
  onSave: (x) => { const s = per('vaccines'); (s._custom = s._custom || []).push({ id: 'c' + uid(), opt: true, ...x }); save(); },
}));
export function vaccines() {
  const all = vaccineList(), main = all.filter((v) => !v.opt), list = vacTab === 'main' ? main : all.filter((v) => v.opt);
  const done = main.filter((v) => v.state === 'done').length;
  const b0 = birthTs();
  const groups = new Map();
  list.forEach((v) => { const k = v.custom ? 'Eklediklerim' : v.m === 0 ? 'Doğumda' : v.m < 24 ? `${v.m}. ayın sonu` : `${v.m / 12} yaş`; (groups.get(k) || groups.set(k, []).get(k)).push(v); });
  const badge = (v) => v.state === 'done' ? `<span class="badge c-ok">${fmtDate(new Date(v.done.date).getTime(), false)}</span>` : v.state === 'overdue' ? '<span class="badge c-bad">gecikti</span>' : v.state === 'soon' ? `<span class="badge c-warn">${inDays(v.due)}</span>` : `<span class="r">${fmtDate(v.due)}</span>`;
  return `${head('Aşı Takvimi', vacTab === 'opt' ? '<button class="btn sm" data-act="vacAdd">＋ Ekle</button>' : '')}
  <div class="card stack-sm"><div class="row between"><span class="b">Ulusal takvim</span><span class="muted small">${done}/${main.length} tamamlandı</span></div><div class="progress c-ok"><i style="width:${(done / main.length) * 100}%"></i></div></div>
  <div style="margin:14px 0">${seg('vacTab', [['main', 'Ulusal takvim'], ['opt', 'İsteğe bağlı / özel']], vacTab)}</div>
  ${[...groups].map(([k, vs]) => `${sec(k, `<span class="tiny muted">${vs[0].custom ? '' : fmtDate(vs[0].m === 0 ? b0 : addMonths(b0, vs[0].m))}</span>`)}<div class="list">${vs.map((v) => `<button class="item" data-act="vac" data-id="${v.id}"><span class="check ${v.state === 'done' ? 'on' : ''}">✓</span><span class="grow"><div class="t">${esc(v.name)}</div><div class="s">${esc(v.dose)}${v.done?.note ? ' · ' + esc(v.done.note) : ''}</div></span>${badge(v)}</button>`).join('')}</div>`).join('')}
  <p class="disc">T.C. Sağlık Bakanlığı çocukluk dönemi aşı takvimi esas alınmıştır. Takvim güncellenebilir; kesin tarihler için aile hekiminize danışın. Aşı sonrası 38,5°C üzeri ateş, durdurulamayan ağlama veya yaygın döküntüde doktora başvurun.</p>`;
}

// ---------- Doktor kontrolleri ----------
const VISIT_FIELDS = [
  { k: 'title', l: 'Başlık', t: 'text', req: true, ph: '6. ay kontrolü' }, { row: [{ k: 'date', l: 'Tarih', t: 'date', req: true }, { k: 'time', l: 'Saat', t: 'text', ph: '10:30' }] },
  { k: 'doctor', l: 'Doktor / kurum', t: 'text' }, { k: 'questions', l: 'Sormak istediklerim', t: 'area', ph: 'Her satıra bir soru…' },
  { k: 'result', l: 'Doktorun notları / sonuç', t: 'area' }, { k: 'done', l: 'Durum', t: 'chips', opts: [['', 'Planlandı'], ['1', 'Gidildi']], def: '' },
];
on('visit', (d) => {
  const v = d.id ? db.visits.find((x) => x.id === d.id) : null;
  openForm({ title: '🩺 Doktor kontrolü', fields: VISIT_FIELDS, values: v ? { ...v, done: v.done ? '1' : '' } : { title: d.title || '', date: d.date || dayKey(), done: '' },
    onSave: (x) => { x.done = x.done === '1'; v ? updateIn('visits', v.id, x) : addTo('visits', x); toast('Kaydedildi ✓'); }, onDelete: v ? () => delFrom('visits', v.id) : null });
});
export function visits() {
  const list = mine('visits').map((v) => ({ ...v, ts: new Date(v.date).getTime() })).sort((a, b) => b.ts - a.ts);
  const up = list.filter((v) => !v.done).reverse(), past = list.filter((v) => v.done);
  const row = (v) => `<button class="item c-health" data-act="visit" data-id="${v.id}"><span class="tile sm">🩺</span><span class="grow"><div class="t">${esc(v.title)}</div><div class="s ell">${fmtDate(v.ts)}${v.time ? ' · ' + esc(v.time) : ''}${v.doctor ? ' · ' + esc(v.doctor) : ''}</div></span>${v.done ? '' : `<span class="badge c-${v.ts < startOfDay() ? 'bad' : 'care'}">${inDays(v.ts)}</span>`}</button>`;
  const b0 = birthTs(), mo = age().exactMonths;
  const sched = CHECKUPS.filter((c) => c.m >= mo - 1).slice(0, 4).map((c) => { const ts = c.m < 1 ? b0 + 15 * DAY : addMonths(b0, c.m); return `<div class="item"><span class="grow"><div class="t">${c.name}</div><div class="s">${esc(c.focus)}</div><div class="tiny faint">${fmtDate(ts)} civarı</div></span><button class="btn sm soft" data-act="visit" data-title="${c.name}" data-date="${dayKey(Math.max(ts, Date.now()))}">Planla</button></div>`; }).join('');
  return `${head('Doktor Kontrolleri', '<button class="btn sm" data-act="visit">＋ Randevu</button>')}
  <button class="card tint c-brand row" style="width:100%;text-align:left" data-act="go" data-to="hub/report"><span class="tile">📋</span><span class="grow"><div class="b">Doktor raporu hazırla</div><div class="small muted">Son haftaların özeti, yazdırılabilir tek sayfa</div></span>›</button>
  ${sec('Yaklaşan')}${up.length ? `<div class="list">${up.map(row).join('')}</div>` : `<div class="card">${empty('🗓️', 'Planlanmış randevu yok.')}</div>`}
  ${sec('Önerilen sağlam çocuk izlemleri')}<div class="list">${sched}</div>
  ${past.length ? `${sec('Geçmiş')}<div class="list">${past.map(row).join('')}</div>` : ''}`;
}

// ---------- Sağlık günlüğü ----------
export function health() {
  const list = recs(['temp', 'med', 'symptom']).slice(0, 40), mo = age().exactMonths;
  const temps = between(Date.now() - 5 * DAY, Date.now() + 1, 'temp').reverse();
  const t = last('temp'), fa = t && Date.now() - t.ts < DAY ? feverAdvice(mo, t.val) : null;
  const meds = medWindow();
  const chart = temps.length >= 2 ? `<div class="card">${lineChart([{ pts: [[temps[0].ts, 38], [Date.now(), 38]], color: 'var(--bad)', dash: '4 4', width: 1, label: '38°' }, { pts: temps.map((r) => [r.ts, r.val]), color: 'var(--health)', width: 2.4, dots: true }], { h: 160, xmin: temps[0].ts, xmax: Date.now(), ymin: 36, ymax: Math.max(40, ...temps.map((r) => r.val)), xfmt: (v) => fmtTime(v), yfmt: (v) => fmtNum(v, 1), xticks: 4 })}<p class="tiny muted center">Son 5 günün ateş ölçümleri</p></div>` : '';
  return `${head('Sağlık Günlüğü')}
  <div class="quick" style="grid-template-columns:repeat(3,1fr)">${['temp', 'med', 'symptom'].map((k) => `<button class="c-health" data-act="rec" data-type="${k}"><span class="tile">${TYPES[k].i}</span>${TYPES[k].l}</button>`).join('')}</div>
  <div class="stack" style="margin-top:14px">
  ${fa ? `<div class="insight c-${fa.level}"><span class="ic">🌡️</span><div><div class="t">Son ölçüm ${fmtNum(t.val)} °C · ${ago(t.ts)}</div><div class="s">${esc(fa.text)}</div></div></div>` : ''}
  ${meds.map((m) => `<div class="insight c-${m.nextAt > Date.now() ? 'warn' : 'ok'}"><span class="ic">💊</span><div><div class="t">${esc(m.name)}</div><div class="s">Son doz ${fmtTime(m.last)}. ${m.nextAt > Date.now() ? `Sonraki doz en erken ${fmtTime(m.nextAt)} (${fmtDur(m.nextAt - Date.now())} sonra).` : 'Doz aralığı doldu; gerekiyorsa verilebilir.'}</div></div></div>`).join('')}
  ${chart}</div>
  ${sec('Kayıtlar')}${list.length ? `<div class="list">${list.map((r) => recRow(r, true)).join('')}</div>` : `<div class="card">${empty('💚', 'Sağlık kaydı yok. Umarız hep böyle kalır!')}</div>`}
  ${sec('Ateş rehberi')}<div class="card prose"><ul><li><b>Normal:</b> 36,5 – 37,5 °C (koltuk altı)</li><li><b>3 aydan küçük</b> bebekte 38 °C ve üzeri: <b>hemen doktora</b></li><li><b>3-6 ay:</b> 38,5 °C üzeri aynı gün doktora</li><li>Her yaşta 40 °C ve üzeri, 48 saatten uzun süren ateş, ateşle birlikte döküntü, havale, nefes sıkıntısı: acil</li><li>İnce giydirin, oda 20-22 °C, bol sıvı. Soğuk su, sirke, alkol uygulamayın.</li><li>Ateş düşürücünün türü ve dozu kiloya göre <b>doktorunuz tarafından</b> belirlenmelidir; aspirin çocuklarda kullanılmaz.</li></ul></div>`;
}

// ---------- Takviyeler ----------
const SUPP_FIELDS = [{ k: 'name', l: 'Takviye adı', t: 'text', req: true }, { row: [{ k: 'dose', l: 'Doz', t: 'text', ph: '3 damla' }, { k: 'perDay', l: 'Günde kaç kez', t: 'num', ph: '1' }] }, { k: 'note', l: 'Not', t: 'text', ph: 'örn. sabah, aç karnına' }, { k: 'active', l: 'Durum', t: 'chips', opts: [['1', 'Kullanılıyor'], ['0', 'Bırakıldı']], def: '1' }];
on('supp', (d) => {
  const s = d.id ? db.supps.find((x) => x.id === d.id) : null, p = d.preset != null ? SUPP_PRESETS[d.preset] : null;
  openForm({ title: '💧 Takviye', intro: p ? `<p class="small muted" style="margin-bottom:12px">${esc(p.why)}</p>` : '', fields: SUPP_FIELDS, values: s ? { ...s, active: s.active === false ? '0' : '1' } : { name: p?.name, dose: p?.dose, perDay: 1, active: '1' },
    onSave: (x) => { x.active = x.active !== '0'; x.perDay = x.perDay || 1; s ? updateIn('supps', s.id, x) : addTo('supps', { ...x, created: Date.now() }); toast('Kaydedildi ✓'); }, onDelete: s ? () => delFrom('supps', s.id) : null });
});
export function supps() {
  const today = suppToday(), ad = suppAdherence(7) || [], all = mine('supps'), mo = age().exactMonths;
  const off = all.filter((s) => s.active === false);
  const presets = SUPP_PRESETS.map((p, i) => [p, i]).filter(([p]) => mo >= p.from && mo < p.to && !all.some((s) => s.name === p.name));
  return `${head('Takviyeler', '<button class="btn sm" data-act="supp">＋ Ekle</button>')}
  ${today.length ? `<div class="list">${today.map((s) => { const done = s.given >= (s.perDay || 1), a = ad.find((x) => x.name === s.name); return `<div class="item c-care"><button class="check ${done ? 'on' : ''}" data-act="suppGive" data-name="${esc(s.name)}" data-dose="${esc(s.dose || '')}" aria-label="Verildi">✓</button><button class="grow" style="text-align:left" data-act="supp" data-id="${s.id}"><div class="t">${esc(s.name)}</div><div class="s">${esc(s.dose || '')}${(s.perDay || 1) > 1 ? ` · günde ${s.perDay} kez (${s.given}/${s.perDay})` : ''}${s.note ? ' · ' + esc(s.note) : ''}</div></button>${a ? `<span class="badge c-${a.pct >= 85 ? 'ok' : a.pct >= 60 ? 'warn' : 'bad'}">7 gün %${a.pct}</span>` : ''}</div>`; }).join('')}</div>` : `<div class="card">${empty('💧', 'Takip edilen takviye yok.')}</div>`}
  ${presets.length ? `${sec('Yaşına göre önerilenler')}<div class="list">${presets.map(([p, i]) => `<div class="item"><span class="grow"><div class="t">${p.name}</div><div class="s">${esc(p.why)}</div></span><button class="btn sm soft" data-act="supp" data-preset="${i}">Ekle</button></div>`).join('')}</div>` : ''}
  ${off.length ? `${sec('Bırakılanlar')}<div class="list">${off.map((s) => `<button class="item" data-act="supp" data-id="${s.id}"><span class="grow"><div class="t muted">${esc(s.name)}</div></span></button>`).join('')}</div>` : ''}
  <p class="disc">Takviye türü ve dozu doktorunuz tarafından belirlenmelidir. Buradaki bilgiler T.C. Sağlık Bakanlığı D vitamini ve demir destek programlarına dayanır.</p>`;
}

// ---------- Alerjiler ----------
const ALG_FIELDS = [{ k: 'allergen', l: 'Alerjen / besin', t: 'text', req: true, sug: 'alg' }, { k: 'reaction', l: 'Görülen tepki', t: 'multi', opts: ['Döküntü', 'Kurdeşen', 'Kusma', 'İshal', 'Dudak/yüz şişmesi', 'Hırıltı / nefes darlığı', 'Egzama alevlenmesi', 'Kanlı kaka', 'Huzursuzluk'] }, { k: 'sev', l: 'Şiddet', t: 'chips', opts: ['Hafif', 'Orta', 'Şiddetli'] }, { k: 'date', l: 'İlk görüldüğü tarih', t: 'date' }, { k: 'confirmed', l: 'Doktor onayı', t: 'chips', opts: [['1', 'Tanı kondu'], ['0', 'Şüphe']], def: '0' }, { k: 'note', l: 'Not', t: 'area' }];
on('alg', (d) => {
  const a = d.id ? db.allergies.find((x) => x.id === d.id) : null;
  openForm({ title: '⚠️ Alerji / hassasiyet', fields: ALG_FIELDS, sugs: { alg: [...Object.values(ALLERGENS), 'Polen', 'Toz akarı', 'Kedi tüyü', 'Penisilin'] }, values: a ? { ...a, reaction: a.reactionList || [] } : { date: dayKey(), allergen: d.name || '' },
    onSave: (x) => { x.reactionList = x.reaction || []; x.reaction = x.reactionList.join(', '); a ? updateIn('allergies', a.id, x) : addTo('allergies', x); toast('Kaydedildi ✓'); }, onDelete: a ? () => delFrom('allergies', a.id) : null });
});
export function allergies() {
  const list = mine('allergies');
  const sus = [...foodsTried().values()].filter((f) => f.reactions && !list.some((a) => a.allergen.toLocaleLowerCase('tr-TR').includes(f.key)));
  return `${head('Alerjiler', '<button class="btn sm" data-act="alg">＋ Ekle</button>')}
  ${list.length ? `<div class="list">${list.map((a) => `<button class="item c-bad" data-act="alg" data-id="${a.id}"><span class="tile sm">⚠️</span><span class="grow"><div class="t">${esc(a.allergen)}</div><div class="s">${esc(a.reaction || 'Tepki belirtilmedi')}</div></span><span class="badge c-${a.confirmed === '1' ? 'bad' : 'warn'}">${a.confirmed === '1' ? 'Tanılı' : 'Şüphe'}${a.sev ? ' · ' + esc(a.sev) : ''}</span></button>`).join('')}</div>` : `<div class="card">${empty('🌿', 'Kayıtlı alerji yok.')}</div>`}
  ${sus.length ? `${sec('Reaksiyon kaydedilen besinler')}<div class="list">${sus.map((f) => `<div class="item"><span class="grow"><div class="t">${esc(f.n)}</div><div class="s">${f.reactions} kez reaksiyon işaretlendi</div></span><button class="btn sm soft" data-act="alg" data-name="${esc(f.n)}">Alerjilere ekle</button></div>`).join('')}</div>` : ''}
  <div class="card prose" style="margin-top:16px"><h3>Bilmeniz gerekenler</h3><ul><li>Besin alerjisi belirtileri genellikle yedikten sonraki <b>dakikalar – 2 saat</b> içinde başlar: kurdeşen, dudak-yüz şişmesi, kusma, hırıltı.</li><li>Gecikmiş tip (saatler-günler sonra): kanlı-mukuslu kaka, egzama alevlenmesi, inatçı kusma-ishal.</li><li><b>Anafilaksi acildir:</b> nefes darlığı, ses kısıklığı, yaygın kurdeşen, solukluk-gevşeklik → hemen <b>112</b>.</li><li>Ağız çevresinde hafif kızarıklık (domates, çilek, narenciye) çoğunlukla temas tahrişidir, alerji değildir.</li><li>Şüphe halinde besini kesin, kayıtları doktorunuzla paylaşın; kendi başınıza uzun süreli eliminasyon yapmayın.</li></ul><p class="small muted">Buraya eklediğiniz alerjenler tarif önerilerinden ve asistan yanıtlarından otomatik olarak çıkarılır.</p></div>`;
}

// ---------- Dişler ----------
on('tooth', (d) => {
  const t = TEETH.find((x) => x.id === Number(d.id)), store = per('teeth'), cur = store[d.id];
  openForm({ title: `🦷 ${t.n}`, intro: `<p class="small muted" style="margin-bottom:12px">Ortalama çıkış: ${t.a[0]}-${t.a[1]}. ay</p>`, fields: [{ k: 'date', l: 'Çıktığı tarih', t: 'date', req: true }], values: { date: cur || dayKey() }, saveLabel: 'Çıktı olarak işaretle',
    onSave: (x) => { store[d.id] = x.date; save(); toast('Yeni diş kutlu olsun 🦷'); }, onDelete: cur ? () => { delete store[d.id]; save(); } : null });
});
export function teeth() {
  const store = per('teeth'), n = Object.keys(store).length, mo = age().exactMonths;
  const short = (t) => (/ön kesici/.test(t.n) ? '1' : /yan kesici/.test(t.n) ? '2' : /köpek/.test(t.n) ? '3' : /1\. azı/.test(t.n) ? '4' : '5');
  const rowT = (ts, low) => ts.map((t) => `<button class="tooth ${low ? 'low' : ''} ${store[t.id] ? 'on' : ''}" data-act="tooth" data-id="${t.id}" aria-label="${t.n}">${short(t)}</button>`).join('');
  const next = TEETH.filter((t) => !store[t.id]).sort((a, b) => a.a[0] - b.a[0]).slice(0, 4);
  const hist = Object.entries(store).sort((a, b) => (a[1] < b[1] ? 1 : -1));
  return `${head('Dişler')}
  <div class="card stack"><div class="row between"><span class="b">${n} / 20 süt dişi</span><span class="small muted">Dişe dokunarak işaretleyin</span></div>
    <div><div class="tiny muted center" style="margin-bottom:4px">ÜST ÇENE</div><div class="teeth">${rowT(TEETH.slice(0, 10))}</div></div>
    <div><div class="teeth">${rowT(TEETH.slice(10), true)}</div><div class="tiny muted center" style="margin-top:4px">ALT ÇENE</div></div>
    <p class="tiny muted center">1-2: kesiciler · 3: köpek dişi · 4-5: azılar</p></div>
  ${next.length ? `${sec('Sırada beklenenler')}<div class="list">${next.map((t) => `<div class="item"><span class="tile sm c-care">🦷</span><span class="grow"><div class="t">${t.n}</div><div class="s">${t.a[0]}-${t.a[1]}. ay${mo > t.a[1] + 6 ? ' · gecikme normal olabilir, 18 aya kadar hiç diş yoksa diş hekimine danışın' : ''}</div></span></div>`).join('')}</div>` : ''}
  ${hist.length ? `${sec('Çıkış geçmişi')}<div class="list">${hist.map(([id, d]) => `<div class="item"><span class="grow"><div class="t">${TEETH.find((t) => t.id === Number(id))?.n}</div></span><span class="r">${fmtDate(new Date(d).getTime())} · ${age(new Date(d).getTime()).text}</span></div>`).join('')}</div>` : ''}
  <div class="card prose" style="margin-top:16px"><h3>Diş çıkarma döneminde</h3><ul><li>Salya artışı, ısırma isteği, huzursuzluk ve hafif uyku bozulması normaldir.</li><li>Buzdolabında soğutulmuş (dondurulmamış) diş kaşıyıcı ve temiz parmakla diş eti masajı rahatlatır.</li><li>Diş çıkarma <b>yüksek ateş veya ishal yapmaz</b>; 38 °C üzeri ateşte başka bir neden arayın.</li><li>Benzokain içeren jeller ve kehribar kolyeler önerilmez.</li><li>İlk dişle birlikte fırçalamaya başlayın (pirinç tanesi kadar florürlü macun).</li></ul></div>`;
}

// ---------- Bakım & ürünler ----------
on('product', (d) => {
  const p = d.id ? db.products.find((x) => x.id === d.id) : null;
  openForm({ title: '🧴 Ürün', fields: [{ k: 'name', l: 'Ürün adı', t: 'text', req: true }, { k: 'type', l: 'Tür', t: 'chips', opts: PRODUCT_TYPES }, { k: 'opened', l: 'Açılış tarihi', t: 'date' }, { k: 'note', l: 'Not / memnuniyet', t: 'area', ph: 'örn. pişikte iyi geldi, kokusuz' }, { k: 'rating', l: 'Değerlendirme', t: 'chips', opts: [['good', '👍 İyi geldi'], ['ok', '😐 Nötr'], ['bad', '👎 Tahriş etti']] }],
    values: p || {}, onSave: (x) => { p ? updateIn('products', p.id, x) : addTo('products', x); toast('Kaydedildi ✓'); }, onDelete: p ? () => delFrom('products', p.id) : null });
});
export function care() {
  const prods = mine('products'), list = recs('care').slice(0, 15);
  const lastBy = CARE_KINDS.map((k) => [k, recs('care').find((r) => r.kind === k)]).filter(([, r]) => r);
  return `${head('Bakım & Kremler', '<button class="btn sm" data-act="rec" data-type="care">＋ Kayıt</button>')}
  <div class="chips">${CARE_KINDS.map((k) => `<button class="chip" data-act="recKind" data-type="care" data-kind="${k}">＋ ${k}</button>`).join('')}</div>
  ${lastBy.length ? `${sec('En son')}<div class="stats">${lastBy.slice(0, 4).map(([k, r]) => `<div class="stat"><div class="k">${k}</div><div class="b">${ago(r.ts)}</div><div class="d ell">${esc(r.product || '')}&nbsp;</div></div>`).join('')}</div>` : ''}
  ${sec('Ürünlerim', '<button data-act="product">＋ Ürün ekle</button>')}${prods.length ? `<div class="list">${prods.map((p) => `<button class="item c-care" data-act="product" data-id="${p.id}"><span class="tile sm">🧴</span><span class="grow"><div class="t">${esc(p.name)}</div><div class="s ell">${esc([p.type, p.note].filter(Boolean).join(' · '))}</div></span>${p.rating ? `<span>${{ good: '👍', ok: '😐', bad: '👎' }[p.rating]}</span>` : ''}</button>`).join('')}</div>` : `<div class="card">${empty('🧴', 'Kullandığınız krem, şampuan, bez gibi ürünleri ekleyin; hangisinin iyi geldiğini not alın.')}</div>`}
  ${list.length ? `${sec('Bakım geçmişi')}<div class="list">${list.map((r) => recRow(r, true)).join('')}</div>` : ''}
  ${sec('Bakım rehberi')}<div class="list">${CARE_GUIDE.map((g) => `<details class="item" style="display:block"><summary class="row" style="cursor:pointer;list-style:none"><span class="tile sm c-care">${g.i}</span><span class="t grow">${g.t}</span><span class="faint">▾</span></summary><div class="prose" style="margin-top:10px">${md(g.tx)}</div></details>`).join('')}</div>`;
}

// ---------- Acil rehber ----------
export function emergency() {
  return `${head('Acil Rehber')}
  <div class="three">${[['112', 'Acil Çağrı', 'bad'], ['114', 'Zehir Danışma', 'warn'], ['182', 'MHRS Randevu', 'brand']].map(([n, l, c]) => `<a class="card center c-${c}" href="tel:${n}" style="text-decoration:none;color:inherit"><div class="v b" style="font-size:24px;color:var(--c)">${n}</div><div class="tiny muted">${l}</div></a>`).join('')}</div>
  <div class="stack" style="margin-top:14px">${EMERGENCY.map((g) => `<div class="card c-${g.c}" style="border-left:5px solid var(--c)"><h3 style="margin-bottom:8px">${g.t}</h3><div class="prose"><ul>${g.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`).join('')}
  <div class="card prose"><h3>Boğulmada ilk yardım (1 yaş altı)</h3><ol><li>Bebeği yüzüstü kolunuza yatırın, başı gövdesinden aşağıda olsun; çenesini elinizle destekleyin.</li><li>Kürek kemikleri arasına el topuğuyla <b>5 kez</b> sırt vuruşu yapın.</li><li>Çıkmadıysa sırtüstü çevirin, göğüs kemiğinin alt yarısına iki parmakla <b>5 kez</b> göğüs basısı uygulayın.</li><li>Cisim çıkana kadar tekrarlayın; biri hemen <b>112</b>’yi arasın. Ağzına körlemesine parmak sokmayın.</li></ol><p class="small muted">Bir ilk yardım kursuna katılmanız şiddetle önerilir.</p></div></div>
  <p class="disc">Bu rehber genel bilgilendirme amaçlıdır; şüphede kaldığınızda beklemeden sağlık kuruluşuna başvurun.</p>`;
}

// ---------- Doktor raporu ----------
on('print', () => window.print());
export function report() {
  const b = baby(), a = age(), wk = weekAvg(7), now = Date.now();
  const gro = ['weight', 'height', 'head'].map((m) => [METRICS[m], latestGrowth(m)]).filter(([, g]) => g);
  const hl = recs(['temp', 'med', 'symptom']).filter((r) => r.ts > now - 14 * DAY);
  const vs = vaccineList().filter((v) => !v.opt), od = vs.filter((v) => v.state === 'overdue');
  const al = mine('allergies'), sp = mine('supps').filter((s) => s.active !== false), tried = [...foodsTried().values()];
  const ms = per('milestones'), g = MILESTONES.filter((x) => x.m <= correctedMonths()).pop();
  const miss = g ? g.items.filter((_, i) => !ms[`${g.m}-${i}`]) : [];
  const ck = nextCheckup().upcoming;
  const row = (k, v) => `<div class="item"><span class="s" style="width:38%">${k}</span><span class="grow t">${v}</span></div>`;
  return `${backBtn('hub/visits', 'Doktor Kontrolleri')}<div class="row between no-print" style="margin-bottom:14px"><h1>Doktor Raporu</h1><button class="btn sm" data-act="print">🖨️ Yazdır / PDF</button></div>
  <div class="stack"><div class="card"><h2>${esc(b.name)}</h2><p class="muted small">${b.gender === 'F' ? 'Kız' : 'Erkek'} · Doğum: ${fmtDate(birthTs())} · ${a.text}${b.gestWeeks ? ` · ${b.gestWeeks}. haftada doğdu` : ''}${b.blood ? ' · Kan grubu ' + esc(b.blood) : ''} · Rapor tarihi: ${fmtDate(now)}</p></div>
  <div class="list">${gro.length ? gro.map(([[n, u, d], x]) => row(n, `${fmtNum(x.v, d)} ${u} · ${Math.round(x.pct)}. persentil <span class="s">(${fmtDate(x.ts)})</span>`)).join('') : row('Büyüme', 'Ölçüm girilmemiş')}${b.bw ? row('Doğum kilosu', `${fmtNum(b.bw, 2)} kg`) : ''}</div>
  <div class="list">${wk ? `${row('Beslenme (7 gün ort.)', `${round1(wk.feeds)} öğün/gün${wk.bottleMl ? ` · ${Math.round(wk.bottleMl)} ml biberon` : ''}${wk.solidN ? ` · ${round1(wk.solidN)} ek gıda` : ''}`)}${wk.sleepH != null ? row('Uyku (7 gün ort.)', `${round1(wk.sleepH)} saat/gün · ${round1(wk.naps)} gündüz uykusu`) : ''}${row('Bez (7 gün ort.)', `${round1(wk.wet)} ıslak · ${round1(wk.dirty)} kirli`)}` : row('Günlük kayıtlar', 'Son 7 günde yeterli kayıt yok')}</div>
  <div class="list">${row('Alerjiler', al.length ? al.map((x) => `${esc(x.allergen)}${x.reaction ? ` (${esc(x.reaction)})` : ''}`).join('; ') : 'Bilinen yok')}${row('Takviyeler', sp.length ? sp.map((s) => `${esc(s.name)} ${esc(s.dose || '')}`).join(', ') : 'Yok')}${row('Aşılar', `${vs.filter((v) => v.state === 'done').length}/${vs.length} yapıldı${od.length ? ' · Eksik: ' + od.map((v) => esc(v.name + ' ' + v.dose)).join(', ') : ''}`)}${tried.length ? row('Ek gıda', `${tried.length} besin denendi${tried.some((f) => f.reactions) ? ' · Reaksiyon: ' + tried.filter((f) => f.reactions).map((f) => esc(f.n)).join(', ') : ''}`) : ''}${g ? row(`Gelişim (${g.m}. ay)`, miss.length ? `Gözlenmeyen: ${miss.map((x) => esc(x[1])).join('; ')}` : 'Tüm basamaklar işaretli') : ''}</div>
  ${hl.length ? `<div class="card"><h3 style="margin-bottom:8px">Son 14 gün sağlık kayıtları</h3><div class="prose"><ul>${hl.map((r) => `<li>${fmtDate(r.ts, false)} ${fmtTime(r.ts)} — <b>${TYPES[r.type].l}:</b> ${esc(summary(r))}${r.note ? ` (${esc(r.note)})` : ''}</li>`).join('')}</ul></div></div>` : ''}
  ${ck?.questions ? `<div class="card"><h3 style="margin-bottom:8px">Sormak istediklerim</h3><div class="prose"><ul>${ck.questions.split('\n').filter(Boolean).map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div></div>` : ''}</div>
  <p class="disc">Pıtır uygulamasındaki ebeveyn kayıtlarından oluşturulmuştur.</p>`;
}
