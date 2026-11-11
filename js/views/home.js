// Bugün: anlık durum, hızlı kayıt, sayaçlar, öneriler ve günün özeti
import { baby, per, recs, last } from '../store.js';
import { age, status, nextSleep, dayStats, suppToday, vaccinesDue, nextCheckup, leapInfo } from '../calc.js';
import { insights } from '../insights.js';
import { recRow } from '../entry.js';
import { sec, insightHTML, empty } from '../ui.js';
import { esc, fmtTime, fmtDur, ago, inDays, HOUR, MIN, round1, fmtDate } from '../util.js';

export const babyHeader = (b = baby()) => `<div class="top">
  <button class="avatar" data-act="go" data-to="settings" aria-label="Profil">${b.gender === 'F' ? '👧' : '👦'}</button>
  <div class="grow"><h1 class="ell">${esc(b.name)}</h1><div class="muted small">${age().text} · ${age().weeks}. hafta</div></div>
  <button class="icon-btn" data-act="go" data-to="settings" aria-label="Ayarlar">⚙️</button></div>`;

function hero() {
  const st = status(), ns = nextSleep(), now = Date.now();
  const today = dayStats(now);
  const lf = last(['breast', 'bottle', 'solid']), ld = last('diaper');
  let big, lbl, hint;
  if (st.asleep) { lbl = 'Uyuyor'; big = `<span data-since="${st.since}" data-fmt="dur">${fmtDur(now - st.since)}</span>`; hint = `${fmtTime(st.since)}’den beri · tatlı rüyalar 🌙`; }
  else if (st.since && now - st.since < 16 * HOUR) {
    lbl = 'Uyanık'; big = `<span data-since="${st.since}" data-fmt="dur">${fmtDur(now - st.since)}</span>`;
    hint = now > ns.to ? `Uyku zamanı geçti · ideal aralık ${fmtDur(ns.lo * MIN)}–${fmtDur(ns.hi * MIN)}` : `Sıradaki uyku ≈ ${fmtTime(ns.from)} – ${fmtTime(ns.to)}`;
  } else { lbl = 'Merhaba'; big = '☀️'; hint = `Uyanık kalma aralığı: ${fmtDur(ns.norm.wake[0] * MIN)} – ${fmtDur(ns.norm.wake[1] * MIN)}`; }
  return `<div class="hero ${st.asleep ? 'asleep' : ''}">
    <div class="row between" style="align-items:flex-start"><div><div class="lbl">${lbl}</div><div class="big">${big}</div><div class="hint">${hint}</div></div>
      <button class="hbtn" data-act="sleepToggle">${st.asleep ? '☀️ Uyandı' : '🌙 Uyudu'}</button></div>
    <div class="mini">
      <div><b>${lf ? ago(lf.ts).replace(' önce', '') : '–'}</b><span>son beslenme</span></div>
      <div><b>${ld ? ago(ld.ts).replace(' önce', '') : '–'}</b><span>son bez</span></div>
      <div><b>${today.sleepMs ? round1(today.sleepMs / HOUR) + ' sa' : '–'}</b><span>bugün uyku</span></div>
    </div></div>`;
}

function timersHTML() {
  const t = per('timers'), now = Date.now(); let h = '';
  if (t.breast) {
    const b = t.breast, live = (s) => (b.side === s ? `data-since="${b.since}" data-plus="${b[s]}"` : '');
    const clock = (s) => `<span ${live(s)}>${Math.floor((b[s] + (b.side === s ? now - b.since : 0)) / 60000).toString().padStart(2, '0')}:${Math.floor(((b[s] + (b.side === s ? now - b.since : 0)) % 60000) / 1000).toString().padStart(2, '0')}</span>`;
    h += `<div class="timer c-feed" style="flex-wrap:wrap"><span class="pulse"></span><div class="grow"><div class="b">Emzirme sürüyor</div><div class="small muted">${fmtTime(b.start)}’de başladı${b.side ? '' : ' · duraklatıldı'}</div></div>
      <button class="btn sm" data-act="breastDone">Bitir</button><button class="btn sm ghost" data-act="breastCancel" aria-label="İptal">✕</button>
      <div class="two" style="width:100%"><button class="btn ${b.side === 'L' ? '' : 'ghost'}" data-act="breastStart" data-side="L">Sol · ${clock('L')}</button><button class="btn ${b.side === 'R' ? '' : 'ghost'}" data-act="breastStart" data-side="R">Sağ · ${clock('R')}</button></div></div>`;
  }
  if (t.sleep) h += `<div class="timer c-sleep"><span class="pulse"></span><div class="grow"><div class="b">Uyku sayacı</div><button class="small muted" data-act="sleepEditStart">${fmtTime(t.sleep.start)}’de uyudu · düzenle</button></div><span class="clock" data-since="${t.sleep.start}">–</span></div>`;
  if (t.tummy) h += `<div class="timer c-play"><span class="pulse"></span><div class="grow"><div class="b">Karın üstü zamanı</div></div><span class="clock" data-since="${t.tummy.start}">–</span><button class="btn sm" data-act="tummyToggle">Bitir</button></div>`;
  return h ? `<div class="stack-sm">${h}</div>` : '';
}

const QUICK = [
  ['breastMenu', '🤱', 'Emzir', 'feed'], ['rec:bottle', '🍼', 'Biberon', 'feed'], ['rec:solid', '🥣', 'Ek gıda', 'solid'], ['rec:diaper', '🧷', 'Bez', 'diaper'],
  ['rec:sleep', '😴', 'Uyku', 'sleep'], ['rec:temp', '🌡️', 'Ateş', 'health'], ['rec:med', '💊', 'İlaç', 'health'], ['rec:care', '🧴', 'Bakım', 'care'],
  ['rec:growth', '📏', 'Ölçüm', 'growth'], ['tummyToggle', '🤸', 'Karın üstü', 'play'], ['rec:note', '📝', 'Not', 'note'], ['addMenu', '➕', 'Tümü', 'brand'],
];
const quick = () => `<div class="quick">${QUICK.map(([act, i, l, c]) => { const [a, type] = act.split(':'); return `<button class="c-${c}" data-act="${a}" ${type ? `data-type="${type}"` : ''}><span class="tile">${i}</span>${l}</button>`; }).join('')}</div>`;

function supps() {
  const list = suppToday(); if (!list.length) return '';
  return `${sec('Bugünkü takviyeler')}<div class="chips">${list.map((s) => { const done = s.given >= (s.perDay || 1); return `<button class="chip ${done ? 'on' : ''}" data-act="${done ? 'noop' : 'suppGive'}" data-name="${esc(s.name)}" data-dose="${esc(s.dose || '')}">${done ? '✓' : '○'} ${esc(s.name)}${(s.perDay || 1) > 1 ? ` ${s.given}/${s.perDay}` : ''}</button>`; }).join('')}</div>`;
}

function upcoming() {
  const items = [];
  vaccinesDue().slice(0, 2).forEach((v) => items.push(`<button class="item c-${v.state === 'overdue' ? 'bad' : 'care'}" data-act="go" data-to="hub/vaccines"><span class="tile sm">💉</span><span class="grow"><div class="t">${esc(v.name)}</div><div class="s">${esc(v.dose)}</div></span><span class="badge">${inDays(v.due)}</span></button>`));
  const ck = nextCheckup();
  if (ck.upcoming) items.push(`<button class="item c-health" data-act="go" data-to="hub/visits"><span class="tile sm">🩺</span><span class="grow"><div class="t">${esc(ck.upcoming.title || 'Doktor randevusu')}</div><div class="s">${fmtDate(ck.upcoming.ts)}${ck.upcoming.time ? ' · ' + ck.upcoming.time : ''}</div></span><span class="badge">${inDays(ck.upcoming.ts)}</span></button>`);
  const lp = leapInfo();
  if (lp.current) items.push(`<button class="item c-play" data-act="go" data-to="hub/leaps"><span class="tile sm">⚡</span><span class="grow"><div class="t">Gelişim atağı: ${esc(lp.current.name)}</div><div class="s ell">${esc(lp.current.signs)}</div></span></button>`);
  return items.length ? `${sec('Yaklaşanlar')}<div class="list">${items.join('')}</div>` : '';
}

function todayStats() {
  const d = dayStats(Date.now());
  const cell = (v, k, sub = '') => `<div class="stat"><div class="v num">${v}</div><div class="k">${k}</div><div class="d">${sub}</div></div>`;
  return `<div class="stats">
    ${cell(d.feeds, 'Beslenme', [d.breastN && `${d.breastN} emzirme`, d.bottleMl && `${d.bottleMl} ml`].filter(Boolean).join(' · ') || '&nbsp;')}
    ${cell(d.sleepMs ? round1(d.sleepMs / HOUR) + '<small> sa</small>' : '0', 'Uyku', d.naps ? `${d.naps} gündüz uykusu` : '&nbsp;')}
    ${cell(d.diapers, 'Bez', d.diapers ? `${d.wet} ıslak · ${d.dirty} kirli` : '&nbsp;')}
    ${cell(d.solidN, 'Ek gıda', d.tummyMin ? `${d.tummyMin} dk karın üstü` : '&nbsp;')}</div>`;
}

export function render() {
  const ins = insights().slice(0, 3), rs = recs().slice(0, 6);
  return `${babyHeader()}
  <div class="cols"><div class="stack">${hero()}${timersHTML()}${quick()}${supps()}</div>
  <div>${sec('Akıllı öneriler', '<button data-act="go" data-to="ai">Asistana sor ›</button>')}<div class="stack-sm">${ins.map(insightHTML).join('')}</div>
  ${upcoming()}
  ${sec('Bugünün özeti', '<button data-act="go" data-to="stats">Analiz ›</button>')}${todayStats()}
  ${sec('Son kayıtlar', '<button data-act="go" data-to="log">Tümü ›</button>')}
  ${rs.length ? `<div class="list">${rs.map((r) => recRow(r, true)).join('')}</div>` : `<div class="card">${empty('🍼', 'Henüz kayıt yok. Yukarıdaki düğmelerle ilk kaydı ekleyin.')}</div>`}</div></div>
  <p class="disc">Pıtır tıbbi tavsiye yerine geçmez. Acil durumda 112’yi arayın.</p>`;
}
