// Kayıt ekleme/düzenleme formları ve zamanlayıcılar (uyku, emzirme, karın üstü)
import { save, recs, addRec, updateRec, delRec, getRec, per, mine, age, last } from './store.js';
import { OPT } from './types.js';
import { TYPES, summary } from './types.js';
import { on, openForm, toast, sheet, closeSheet } from './ui.js';
import { foodsTried, allergyNames, foodInfo } from './calc.js';
import { MIN, HOUR, trLower, cap, esc, fmtTime, ago } from './util.js';
import { feverAdvice } from './data/health.js';
import { FOODS } from './data/nutrition.js';

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

function suggestions(type) {
  if (type === 'med') return { med: uniq(recs('med').map((r) => r.name)).slice(0, 12) };
  if (type === 'supp') return { supp: uniq([...mine('supps').map((s) => s.name), ...recs('supp').map((r) => r.name)]) };
  if (type === 'care') return { product: uniq([...mine('products').map((p) => p.name), ...recs('care').map((r) => r.product)]).slice(0, 15) };
  if (type === 'solid') {
    const mo = age().exactMonths, tried = foodsTried(), bad = allergyNames();
    const recent = [...tried.values()].sort((a, b) => b.last - a.last).slice(0, 8).map((f) => f.n);
    const fresh = FOODS.filter((f) => f.m <= mo + 0.5 && !tried.has(trLower(f.n)) && !bad.some((n) => trLower(f.n).includes(n))).slice(0, 10).map((f) => f.n);
    return { foods: uniq([...recent, ...fresh]) };
  }
  return {};
}

function defaults(type) {
  const now = Date.now();
  if (type === 'sleep') return { ts: now - HOUR, end: now };
  if (type === 'med') { const l = last('med'); return { ts: now, name: l?.name, dose: l?.dose, gap: l?.gap }; }
  if (type === 'breast') return { ts: now - 15 * MIN };
  return { ts: now };
}

function afterSave(type, v) {
  if (type === 'temp') { const fa = feverAdvice(age().exactMonths, v.val); if (fa && fa.level !== 'ok') return setTimeout(() => sheet(fa.level === 'bad' ? '⚠️ Dikkat' : 'Ateş hakkında', `<div class="insight c-${fa.level}"><span class="ic">🌡️</span><div class="grow"><div class="t">${v.val} °C</div><div class="s">${esc(fa.text)}</div></div></div><button class="btn block" style="margin-top:14px" data-act="closeSheet">Anladım</button>`), 150); }
  if (type === 'solid') {
    const bad = allergyNames();
    const hit = (v.foods || []).find((f) => bad.some((n) => trLower(f).includes(n)));
    if (hit) return toast(`⚠️ ${hit} alerji listenizde!`);
    if (v.react === 'reaction') return toast('Reaksiyonu Alerjiler bölümüne ekleyebilirsiniz');
    const early = (v.foods || []).map(foodInfo).find((f) => f && f.m > age().exactMonths + 0.5);
    if (early) return toast(`${early.n} genelde ${early.m}. aydan sonra önerilir`);
  }
  toast('Kaydedildi ✓');
}

export function openRecord(type, id, preset = {}) {
  const T = TYPES[type]; if (!T) return;
  const rec = id ? getRec(id) : null;
  openForm({
    title: `${T.i} ${T.l}${rec ? ' · düzenle' : ''}`,
    fields: T.f, values: rec || { ...defaults(type), ...preset }, sugs: suggestions(type),
    onSave: (v) => {
      if (!v.ts) v.ts = Date.now();
      if (v.ts > Date.now() + 5 * MIN) { toast('Zaman gelecekte olamaz'); return false; }
      if (type === 'sleep') { if (!v.end) { toast('Uyanma zamanını girin'); return false; } if (v.end <= v.ts) { toast('Uyanma, uyumadan sonra olmalı'); return false; } if (v.end > Date.now() + 5 * MIN) { toast('Uyanma zamanı gelecekte olamaz'); return false; } }
      if (type === 'solid') v.foods = (v.foods || []).map((f) => foodInfo(f)?.n || cap(f.trim()));
      if (type === 'breast' && !v.left && !v.right) { v.left = null; v.right = null; }
      rec ? updateRec(id, v) : addRec(type, v);
      afterSave(type, v);
    },
    onDelete: rec ? () => { delRec(id); toast('Silindi'); } : null,
  });
}
on('rec', (d) => openRecord(d.type, d.id));
on('recKind', (d) => openRecord(d.type, null, { kind: d.kind }));

// Tüm kayıt türleri menüsü
on('addMenu', () => {
  sheet('Kayıt ekle', `<div class="quick" style="grid-template-columns:repeat(4,1fr)">${Object.entries(TYPES).map(([k, T]) => `<button data-act="pick" data-type="${k}" class="c-${T.c}" style="box-shadow:none;background:var(--surface2)"><span class="tile">${T.i}</span>${T.l}</button>`).join('')}</div>`);
});
on('pick', (d) => { closeSheet(); openRecord(d.type); });

// --- Zamanlayıcılar ---
const timers = () => per('timers');
on('sleepToggle', () => {
  const t = timers();
  if (t.sleep) {
    const dur = Date.now() - t.sleep.start;
    if (dur < MIN) { delete t.sleep; save(); return toast('1 dakikadan kısa uyku kaydedilmedi'); }
    const start = t.sleep.start; delete t.sleep;
    addRec('sleep', { ts: start, end: Date.now() });
    toast('Günaydın! Uyku kaydedildi ☀️');
  } else { t.sleep = { start: Date.now() }; save(); toast('İyi uykular 🌙'); }
});
on('sleepEditStart', () => {
  const t = timers().sleep; if (!t) return;
  openForm({ title: 'Uyku başlangıcı', fields: [{ k: 'start', l: 'Uyudu', t: 'dt', req: true }], values: { start: t.start }, onSave: (v) => { if (v.start > Date.now()) { toast('Gelecekte olamaz'); return false; } t.start = v.start; save(); }, onDelete: () => { delete timers().sleep; save(); } });
});

const accrue = (b) => { if (b.side && b.since) { b[b.side] += Date.now() - b.since; } b.since = Date.now(); };
on('breastStart', (d) => {
  const t = timers();
  if (!t.breast) t.breast = { start: Date.now(), side: d.side, L: 0, R: 0, since: Date.now() };
  else { accrue(t.breast); t.breast.side = t.breast.side === d.side ? null : d.side; }
  save();
});
on('breastDone', () => {
  const t = timers(), b = t.breast; if (!b) return;
  accrue(b);
  const left = Math.round(b.L / MIN), right = Math.round(b.R / MIN);
  delete t.breast;
  if (b.L + b.R < 30000) { save(); return toast('Çok kısa — kaydedilmedi'); }
  addRec('breast', { ts: b.start, left: left || (b.L > 20000 ? 1 : null), right: right || (b.R > 20000 ? 1 : null), lastSide: b.side || (b.R > b.L ? 'R' : 'L') });
  toast('Emzirme kaydedildi ✓');
});
on('breastCancel', () => { if (confirm('Emzirme sayacı iptal edilsin mi?')) { delete timers().breast; save(); } });
on('tummyToggle', () => {
  const t = timers();
  if (t.tummy) { const min = Math.max(1, Math.round((Date.now() - t.tummy.start) / MIN)); const start = t.tummy.start; delete t.tummy; addRec('activity', { ts: start, kind: 'Karın üstü', min }); toast(`${min} dk karın üstü kaydedildi 💪`); }
  else { t.tummy = { start: Date.now() }; save(); }
});

// Emzirme başlat menüsü
on('breastMenu', () => {
  const l = last('breast');
  const hint = l?.lastSide ? `Son emzirme ${ago(l.ts)} <b>${l.lastSide === 'L' ? 'sol' : 'sağ'}</b> memede bitti — bu kez <b>${l.lastSide === 'L' ? 'sağdan' : 'soldan'}</b> başlayabilirsiniz.` : 'Hangi taraftan başlıyorsunuz?';
  sheet('🤱 Emzirme', `<p class="muted small" style="margin-bottom:14px">${hint}</p>
    <div class="two"><button class="btn ${l?.lastSide === 'R' ? '' : 'soft'}" data-act="breastGo" data-side="L">Sol</button><button class="btn ${l?.lastSide === 'L' ? '' : 'soft'}" data-act="breastGo" data-side="R">Sağ</button></div>
    <button class="btn ghost block" style="margin-top:10px" data-act="pick" data-type="breast">Elle kayıt gir</button>`);
});
on('breastGo', (d) => { closeSheet(); timers().breast = { start: Date.now(), side: d.side, L: 0, R: 0, since: Date.now() }; save(); });

// Tek dokunuşla hızlı kayıt
on('quickDiaper', (d) => { closeSheet(); const r = addRec('diaper', { kind: d.kind }); toast('Bez kaydedildi ✓', () => delRec(r.id)); });
on('suppGive', (d) => { const r = addRec('supp', { name: d.name, dose: d.dose || null }); toast(`${d.name} verildi ✓`, () => delRec(r.id)); });
on('quickBottle', (d) => { const r = addRec('bottle', { kind: d.kind, ml: Number(d.ml) }); toast(`${d.ml} ml kaydedildi ✓`, () => delRec(r.id)); });
on('diaperMenu', () => {
  sheet('Bez değişimi', `<div class="three">${[['wet', '💧', 'Islak'], ['dirty', '💩', 'Kirli'], ['both', '💧💩', 'İkisi']].map(([k, i, l]) => `<button class="bigpick c-diaper" data-act="quickDiaper" data-kind="${k}"><span>${i}</span>${l}</button>`).join('')}</div>
    <button class="btn ghost block" style="margin-top:12px" data-act="pick" data-type="diaper">Renk, kıvam ve not ekle</button>`);
});

export const recRow = (r, withDay = false) => {
  const T = TYPES[r.type] || TYPES.note;
  return `<button class="item c-${T.c}" data-act="rec" data-type="${r.type}" data-id="${r.id}">
    <span class="tile sm">${T.i}</span>
    <span class="grow"><div class="t">${T.l}</div><div class="s ell">${esc(summary(r))}${r.note && r.type !== 'note' ? ` · <i>${esc(r.note)}</i>` : ''}</div></span>
    <span class="r">${withDay ? ago(r.ts) : fmtTime(r.ts)}${r.type === 'sleep' && r.end ? `<br>${fmtTime(r.end)}` : ''}</span></button>`;
};
