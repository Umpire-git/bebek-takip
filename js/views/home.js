// Bugün: uyku tahmini, "sırada ne var" akışı, tek dokunuşla kayıt, öneriler ve günün özeti
import { baby, per, recs, last } from '../store.js';
import { age, dayStats, suppToday, vaccinesDue, nextCheckup, leapInfo, medWindow } from '../calc.js';
import { predictSleep, predictFeed, CONF } from '../predict.js';
import { insights } from '../insights.js';
import { recRow } from '../entry.js';
import { sec, insightHTML, empty } from '../ui.js';
import { icon } from '../icons.js';
import { esc, fmtTime, fmtDur, ago, inDays, HOUR, MIN, DAY, round1, fmtDate, startOfDay, rangeTxt, clamp } from '../util.js';

export const babyHeader = (b = baby()) => `<div class="top">
  <button class="avatar" data-act="go" data-to="settings" aria-label="Profil">${b.gender === 'F' ? '👧' : '👦'}</button>
  <div class="grow"><h1 class="ell">${esc(b.name)}</h1><div class="muted small">${age().text} · ${age().weeks}. hafta</div></div>
  <button class="icon-btn" data-act="go" data-to="settings" aria-label="Ayarlar">⚙️</button></div>`;

export const confDots = (c) => `<span class="conf" title="${CONF[c]}">${[1, 2, 3].map((i) => `<i class="${i <= { low: 1, mid: 2, high: 3 }[c] ? 'on' : ''}"></i>`).join('')}</span>`;
export const napName = (p) => (p.kind === 'night' ? (p.back ? 'Gece uykusuna dönüş' : 'Gece uykusu') : p.idx != null ? `${p.idx + 1}. gündüz uykusu` : 'Sıradaki uyku');
const rel = (ts) => { const d = ts - Date.now(); return d > 0 ? `${fmtDur(d)} sonra` : d > -2 * MIN ? 'şimdi' : `${fmtDur(-d)} gecikti`; };

function ring(p, win, mid) {
  const C = 2 * Math.PI * 42, pp = clamp(p, 0, 1);
  const w = win ? `<circle class="win" cx="50" cy="50" r="42" stroke-dasharray="${(clamp(win[1], 0, 1) - clamp(win[0], 0, 1)) * C} ${C}" stroke-dashoffset="${-clamp(win[0], 0, 1) * C}"/>` : '';
  return `<div class="ring"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="42"/>${w}<circle class="fg" cx="50" cy="50" r="42" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pp)}"/></svg><div class="mid"><div>${mid}</div></div></div>`;
}

function hero(ps) {
  const now = Date.now(), n = ps.next;
  if (ps.empty) {
    return `<div class="hero"><div class="top-row"><div class="grow"><div class="lbl">Merhaba</div><div class="big" style="font-size:30px">Uykuyu kaydedin</div><div class="hint">Bebeğiniz uyuduğunda ve uyandığında dokunun; birkaç kayıttan sonra uyku saatlerini tahmin etmeye başlarım.</div></div></div>
      <div class="predict">${icon('clock')}<div>Bu yaşta ideal uyanıklık aralığı <b>${rangeTxt(ps.norm.wake)}</b></div></div>
      <div class="actions"><button class="hbtn" data-act="sleepToggle">🌙 Uyudu</button><button class="hbtn alt" data-act="rec" data-type="sleep">Elle gir</button></div></div>`;
  }
  if (ps.asleep) {
    const total = Math.max(1, n.at - ps.since), left = n.at - now;
    const nx = ps.plan.find((p) => !p.done && !p.live);
    return `<div class="hero asleep"><div class="top-row"><div class="grow"><div class="lbl">Uyuyor</div><div class="big"><span data-since="${ps.since}" data-fmt="dur">${fmtDur(now - ps.since)}</span></div><div class="hint">Uyudu: ${fmtTime(ps.since)}</div></div>
      ${ring((now - ps.since) / total, null, left > 2 * MIN ? `<b>${fmtTime(n.at)}</b>uyanış` : '<b>☀️</b>her an')}</div>
      <div class="predict">${icon('sun')}<div>${left > 2 * MIN ? `Tahmini uyanış <b>≈ ${fmtTime(n.at)}</b> · ${fmtDur(left)} sonra` : 'Olağan süresini doldurdu, <b>her an uyanabilir</b>'}${confDots(n.conf)}${nx ? `<br><span style="opacity:.85">Sonra: ${napName(nx)} ≈ ${fmtTime(nx.start)}</span>` : ''}</div></div>
      <div class="actions"><button class="hbtn" data-act="sleepToggle">☀️ Uyandı</button><button class="hbtn alt" data-act="sleepEditStart">Düzenle</button></div></div>`;
  }
  const span = Math.max(1, n.to - ps.since), awake = now - ps.since;
  const st = ps.state, mins = Math.round((n.at - now) / MIN);
  const mid = st === 'late' ? '<b>Geç</b>kaldı' : st === 'now' ? '<b>Şimdi</b>ideal' : `<b>${mins >= 60 ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}` : mins + ' dk'}</b>kaldı`;
  const title = { early: `${napName(n)} <b>≈ ${fmtTime(n.at)}</b>`, soon: `${napName(n)} yaklaşıyor · <b>${fmtTime(n.at)}</b>`, now: `<b>Uyku penceresi açık</b> · ${fmtTime(n.from)}–${fmtTime(n.to)}`, late: `<b>Uyku zamanı geçti</b> · ideal ${fmtTime(n.from)}–${fmtTime(n.to)}` }[st];
  const sub = { early: `Pencere ${fmtTime(n.from)}–${fmtTime(n.to)}${n.dur ? ` · ~${fmtDur(n.dur * MIN)} uyur` : ''}`, soon: 'Ortamı loşlaştırın, sakin bir geçiş başlatın', now: 'Uyku işaretleri: esneme, göz ovuşturma, dalgın bakış', late: 'Aşırı yorulmuş olabilir; uyarıları azaltıp hemen yatırın' }[st];
  return `<div class="hero s-${st}"><div class="top-row"><div class="grow"><div class="lbl">Uyanık</div><div class="big"><span data-since="${ps.since}" data-fmt="dur">${fmtDur(awake)}</span></div><div class="hint">Son uyanış: ${fmtTime(ps.since)}</div></div>
    ${ring(awake / span, [(n.from - ps.since) / span, 1], mid)}</div>
    <div class="predict">${icon('moon')}<div>${title}${confDots(n.conf)}<br><span style="opacity:.85">${sub}</span></div></div>
    <div class="actions"><button class="hbtn" data-act="sleepToggle">🌙 Uyudu</button><button class="hbtn alt" data-act="go" data-to="hub/sleep">Uyku planı</button></div></div>`;
}

// Bugünün uyku şeridi: gerçekleşen (dolu), süren (yanıp sönen) ve tahmin edilen (taralı) uykular
export function planStrip(ps) {
  const s0 = startOfDay(), pos = (ts) => clamp(((ts - s0) / DAY) * 100, 0, 100);
  const blk = (a, b, cls) => (b > s0 && a < s0 + DAY ? `<i class="${cls}" style="left:${pos(a).toFixed(2)}%;width:${Math.max(0.6, pos(b) - pos(a)).toFixed(2)}%"></i>` : '');
  const done = dayStats(Date.now()).blocks.map(([a, b]) => blk(a, b, '')).join('');
  const pred = ps.plan.filter((p) => !p.done && p.kind !== 'wake').map((p) => (p.live ? blk(Math.max(Date.now(), p.start), p.end, 'p') : blk(p.start, p.end || p.start + (ps.model.nightMin || 600) * MIN, 'p'))).join('');
  const m = ps.model, hm = (x) => `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(Math.round(x % 60)).padStart(2, '0')}`;
  const learned = m.samples.days >= 3 && !m.newborn;
  return `<div class="plan24">${done}${pred}<em style="left:${pos(Date.now()).toFixed(2)}%"></em></div><div class="day24-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
    <p class="tiny muted" style="margin-top:8px">${learned ? `Kendi düzeni: uyanış ~${hm(m.wakeClock)} · ${m.typicalN} gündüz uykusu · yatış ~${hm(m.bedClock)}` : 'Taralı alanlar tahmindir; kayıt arttıkça bebeğinizin kendi düzenine göre keskinleşir.'}</p>`;
}

function flow(ps) {
  const now = Date.now(), items = [];
  const push = (at, c, ic, t, s, btn, due = false) => items.push({ at, html: `<div class="f c-${c} ${due ? 'due' : ''}"><span class="tm">${at ? fmtTime(at) : '•'}<small>${at ? (at - now > MIN ? fmtDur(at - now) : due ? 'gecikti' : 'şimdi') : 'bugün'}</small></span><span class="tile sm">${icon(ic)}</span><span class="grow"><div class="t">${t}</div><div class="s">${s}</div></span>${btn || ''}</div>` });
  if (!ps.empty && !ps.asleep) ps.plan.filter((p) => !p.done && p.kind !== 'wake').slice(0, 3).forEach((p, i) => push(p.start, 'sleep', 'moon', napName(p), p.back ? 'Loş ışık, az uyaran; sakince yeniden uyutun' : p.kind === 'night' ? `Yatış rutinine ${fmtTime(p.start - 30 * MIN)} gibi başlayın` : `~${fmtDur((p.end - p.start))} · uyanıklık ${fmtDur(p.ww * MIN)}`, i === 0 ? '<button class="go" data-act="sleepToggle">Uyudu</button>' : '', i === 0 && ps.state === 'late'));
  if (ps.asleep) ps.plan.filter((p) => !p.done && !p.live).slice(0, 2).forEach((p) => push(p.start, 'sleep', 'moon', napName(p), p.kind === 'night' ? 'Tahmini yatış' : `~${fmtDur(p.end - p.start)}`));
  const pf = predictFeed();
  if (pf) { const lf = last(['breast', 'bottle']); push(pf.at, 'feed', lf.type === 'bottle' ? 'bottle' : 'nurse', 'Beslenme', `Son: ${fmtTime(pf.last)} · alışılmış aralık ~${fmtDur(pf.gap * MIN)}`, `<button class="go" data-act="${lf.type === 'bottle' ? 'rec' : 'breastMenu'}" data-type="bottle">Başla</button>`, pf.due && now - pf.at > 20 * MIN); }
  suppToday().filter((s) => s.given < (s.perDay || 1)).forEach((s) => push(null, 'care', 'drop', esc(s.name), esc(s.dose || 'Bugün verilmedi'), `<button class="go" data-act="suppGive" data-name="${esc(s.name)}" data-dose="${esc(s.dose || '')}">Verildi</button>`));
  medWindow().filter((m) => m.nextAt > now - 2 * HOUR).forEach((m) => push(m.nextAt, 'health', 'pill', esc(m.name), m.nextAt > now ? 'Bu saatten önce tekrar verilmemeli' : 'Doz aralığı doldu; gerekiyorsa verilebilir'));
  if (!items.length) return '';
  items.sort((a, b) => (a.at || now + 1) - (b.at || now + 1));
  return `${sec('Sırada ne var?', '<button data-act="go" data-to="hub/sleep">Uyku planı ›</button>')}<div class="list flow">${items.slice(0, 5).map((x) => x.html).join('')}</div>`;
}

function timersHTML() {
  const t = per('timers'), now = Date.now(); let h = '';
  if (t.breast) {
    const b = t.breast, ms = (s) => b[s] + (b.side === s ? now - b.since : 0);
    const clock = (s) => `<span ${b.side === s ? `data-since="${b.since}" data-plus="${b[s]}"` : ''}>${String(Math.floor(ms(s) / 60000)).padStart(2, '0')}:${String(Math.floor((ms(s) % 60000) / 1000)).padStart(2, '0')}</span>`;
    h += `<div class="timer c-feed" style="flex-wrap:wrap"><span class="pulse"></span><div class="grow"><div class="b">Emzirme sürüyor</div><div class="small muted">Başlangıç ${fmtTime(b.start)}${b.side ? '' : ' · duraklatıldı'}</div></div>
      <button class="btn sm" data-act="breastDone">Bitir</button><button class="btn sm ghost" data-act="breastCancel" aria-label="İptal">✕</button>
      <div class="two" style="width:100%"><button class="btn ${b.side === 'L' ? '' : 'ghost'}" data-act="breastStart" data-side="L">Sol · ${clock('L')}</button><button class="btn ${b.side === 'R' ? '' : 'ghost'}" data-act="breastStart" data-side="R">Sağ · ${clock('R')}</button></div></div>`;
  }
  if (t.tummy) h += `<div class="timer c-play"><span class="pulse"></span><div class="grow"><div class="b">Karın üstü zamanı</div></div><span class="clock" data-since="${t.tummy.start}">–</span><button class="btn sm" data-act="tummyToggle">Bitir</button></div>`;
  return h ? `<div class="stack-sm">${h}</div>` : '';
}

// Alışkanlıklardan türeyen tek dokunuşluk kısayollar
function shortcuts() {
  const out = [], lb = last('bottle');
  if (lb?.ml) out.push(`<button class="c-feed" data-act="quickBottle" data-ml="${lb.ml}" data-kind="${lb.kind || 'formula'}"><span class="tile">${icon('bottle')}</span>${lb.ml} ml ${lb.kind === 'milk' ? 'anne sütü' : lb.kind === 'water' ? 'su' : 'mama'}</button>`);
  out.push(`<button class="c-diaper" data-act="quickDiaper" data-kind="wet"><span class="tile">${icon('diaper')}</span>Islak bez</button>`, `<button class="c-diaper" data-act="quickDiaper" data-kind="dirty"><span class="tile">${icon('diaper')}</span>Kirli bez</button>`);
  if (age().exactMonths < 9 && !per('timers').tummy) out.push(`<button class="c-play" data-act="tummyToggle"><span class="tile">${icon('move')}</span>Karın üstü başlat</button>`);
  out.push(`<button class="c-growth" data-act="rec" data-type="growth"><span class="tile">${icon('ruler')}</span>Ölçüm</button>`, `<button class="c-note" data-act="rec" data-type="note"><span class="tile">${icon('note')}</span>Not</button>`);
  return `<div class="short">${out.join('')}</div>`;
}

const QUICK = [['breastMenu', 'nurse', 'Emzir', 'feed'], ['rec:bottle', 'bottle', 'Biberon', 'feed'], ['rec:solid', 'bowl', 'Ek gıda', 'solid'], ['diaperMenu', 'diaper', 'Bez', 'diaper'], ['rec:temp', 'thermo', 'Ateş', 'health'], ['rec:med', 'pill', 'İlaç', 'health'], ['rec:care', 'lotion', 'Bakım', 'care'], ['addMenu', 'plus', 'Tümü', 'brand']];
const quick = () => `<div class="quick">${QUICK.map(([act, i, l, c]) => { const [a, type] = act.split(':'); return `<button class="c-${c}" data-act="${a}" ${type ? `data-type="${type}"` : ''}><span class="tile">${icon(i)}</span>${l}</button>`; }).join('')}</div>`;

function upcoming() {
  const items = [];
  vaccinesDue().slice(0, 2).forEach((v) => items.push(`<button class="item c-${v.state === 'overdue' ? 'bad' : 'care'}" data-act="go" data-to="hub/vaccines"><span class="tile sm">💉</span><span class="grow"><div class="t">${esc(v.name)}</div><div class="s">${esc(v.dose)}</div></span><span class="badge">${inDays(v.due)}</span></button>`));
  const ck = nextCheckup();
  if (ck.upcoming) items.push(`<button class="item c-health" data-act="go" data-to="hub/visits"><span class="tile sm">🩺</span><span class="grow"><div class="t">${esc(ck.upcoming.title || 'Doktor randevusu')}</div><div class="s">${fmtDate(ck.upcoming.ts)}${ck.upcoming.time ? ' · ' + esc(ck.upcoming.time) : ''}</div></span><span class="badge">${inDays(ck.upcoming.ts)}</span></button>`);
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
  const ins = insights().slice(0, 3), rs = recs().slice(0, 5), ps = predictSleep();
  return `${babyHeader()}
  <div class="cols"><div class="stack">${hero(ps)}${timersHTML()}${shortcuts()}${quick()}
    ${ps.empty ? '' : `<div class="card"><div class="b" style="margin-bottom:10px">Bugünün uyku haritası</div>${planStrip(ps)}${ps.basis[0] && !/öğrenildi/.test(ps.basis[0]) ? `<p class="small" style="margin-top:6px">💡 ${esc(ps.basis[0])}</p>` : ''}</div>`}</div>
  <div>${flow(ps)}
  ${sec('Akıllı öneriler', '<button data-act="go" data-to="ai">Asistana sor ›</button>')}<div class="stack-sm">${ins.map(insightHTML).join('')}</div>
  ${upcoming()}
  ${sec('Bugünün özeti', '<button data-act="go" data-to="stats">Analiz ›</button>')}${todayStats()}
  ${sec('Son kayıtlar', '<button data-act="go" data-to="log">Tümü ›</button>')}
  ${rs.length ? `<div class="list">${rs.map((r) => recRow(r, true)).join('')}</div>` : `<div class="card">${empty('🍼', 'Henüz kayıt yok. Yukarıdaki düğmelerle ilk kaydı ekleyin.')}</div>`}</div></div>
  <p class="disc">Tahminler kayıtlarınıza ve yaş ortalamalarına dayanır; bebeğinizin işaretleri her zaman önceliklidir. Pıtır tıbbi tavsiye yerine geçmez.</p>`;
}
