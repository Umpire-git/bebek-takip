// Gelişim modülleri: basamaklar, gelişim atakları, uyku yardımcısı, oyun ve ebeveyn rehberi
import { baby, save, per, correctedMonths } from '../store.js';
import { age, nextSleep, weekAvg, leapInfo, rangeStats } from '../calc.js';
import { on, sec, backBtn, seg, toast } from '../ui.js';
import { esc, fmtTime, fmtDur, MIN, HOUR, round1, md, fmtDate, DAY, dayKey, rangeTxt } from '../util.js';
import { MILESTONES, DOMAINS, LEAPS, PLAY_GUIDE, playGuideFor, SLEEP_TIPS, SLEEP_NORMS } from '../data/development.js';
import * as sound from '../sound.js';
import { predictSleep, CONF } from '../predict.js';
import { planStrip, napName } from './home.js';

const rerender = () => document.dispatchEvent(new Event('rerender'));
const head = (title) => `${backBtn()}<h1 style="margin-bottom:14px">${title}</h1>`;

// ---------- Gelişim basamakları ----------
let msGroup = null;
on('msGroup', (d) => { msGroup = Number(d.v); rerender(); });
on('ms', (d) => { const s = per('milestones'); if (s[d.id]) delete s[d.id]; else { s[d.id] = dayKey(); toast('Harika! 🎉'); } save(); });
export function milestones() {
  const cmo = correctedMonths(), s = per('milestones');
  const def = (MILESTONES.filter((g) => g.m <= Math.max(2, cmo)).pop() || MILESTONES[0]).m;
  const cur = MILESTONES.find((g) => g.m === (msGroup ?? def));
  const doneN = (g) => g.items.filter((_, i) => s[`${g.m}-${i}`]).length;
  const byDom = Object.keys(DOMAINS).map((k) => [k, cur.items.map((it, i) => [it, i]).filter(([it]) => it[0] === k)]).filter(([, xs]) => xs.length);
  return `${head('Gelişim Basamakları')}
  <div class="chips scroll" style="margin-bottom:14px">${MILESTONES.map((g) => `<button class="chip ${g.m === cur.m ? 'on' : ''}" data-act="msGroup" data-v="${g.m}">${g.m < 24 ? g.m + '. ay' : g.m / 12 + ' yaş'}${doneN(g) === g.items.length ? ' ✓' : ''}</button>`).join('')}</div>
  <div class="card stack-sm"><div class="row between"><span class="b">${cur.m < 24 ? cur.m + '. ay sonuna kadar' : cur.m / 12 + ' yaşına kadar'}</span><span class="small muted">${doneN(cur)}/${cur.items.length}</span></div><div class="progress c-play"><i style="width:${(doneN(cur) / cur.items.length) * 100}%"></i></div>
    <p class="tiny muted">Çocukların çoğunun (%75+) bu yaşa kadar yaptığı beceriler. ${cmo < cur.m ? 'Henüz bu yaşa gelmedi; acele yok.' : ''}</p></div>
  ${byDom.map(([k, xs]) => `${sec(`${DOMAINS[k][1]} ${DOMAINS[k][0]}`)}<div class="list">${xs.map(([it, i]) => { const id = `${cur.m}-${i}`; return `<button class="item" data-act="ms" data-id="${id}"><span class="check ${s[id] ? 'on' : ''}">✓</span><span class="grow"><div class="t" style="font-weight:550">${esc(it[1])}</div>${s[id] ? `<div class="tiny faint">${fmtDate(new Date(s[id]).getTime())}</div>` : ''}</span></button>`; }).join('')}</div>`).join('')}
  <div class="card prose" style="margin-top:16px"><h3>Ne zaman doktora danışmalı?</h3><ul><li>Yaşına ait basamakların birkaçını 2 ay geçmesine rağmen yapmıyorsa</li><li>Daha önce yapabildiği bir beceriyi <b>kaybettiyse</b> (her yaşta önemlidir)</li><li>Göz teması kurmuyor, adına tepki vermiyor veya seslere duyarsızsa</li><li>Vücudunun bir tarafını belirgin biçimde az kullanıyorsa</li></ul><p class="small muted">Prematüre bebeklerde 2 yaşa kadar düzeltilmiş yaş esas alınır. Her çocuk kendi hızında gelişir; bu liste tanı aracı değildir.</p></div>`;
}

// ---------- Gelişim atakları ----------
export function leaps() {
  const lp = leapInfo(), w = lp.week;
  const item = (l) => {
    const state = w > l.to ? 'past' : w >= l.from ? 'now' : 'next';
    const start = lp.dueTs + l.from * 7 * DAY, end = lp.dueTs + l.to * 7 * DAY;
    return `<details class="item" style="display:block" ${state === 'now' ? 'open' : ''}><summary class="row" style="cursor:pointer;list-style:none"><span class="tile sm c-${state === 'now' ? 'warn' : 'play'}">${state === 'past' ? '✓' : '⚡'}</span><span class="grow"><div class="t ${state === 'past' ? 'muted' : ''}">${l.w}. hafta · ${l.name}</div><div class="s">${fmtDate(start, false)} – ${fmtDate(end)}</div></span>${state === 'now' ? '<span class="badge c-warn">şimdi</span>' : ''}</summary>
      <div class="prose" style="margin-top:10px"><p><b>Ne öğreniyor?</b> ${esc(l.what)}</p><p><b>Belirtiler:</b> ${esc(l.signs)}</p><p><b>Nasıl destek olurum?</b> ${esc(l.help)}</p></div></details>`;
  };
  return `${head('Gelişim Atakları')}
  <div class="card tint c-play stack-sm"><div class="b">${lp.current ? `Şu an atak dönemi: ${lp.current.name}` : lp.next ? `Sıradaki atak ${lp.nextInDays} gün sonra: ${lp.next.name}` : 'Tüm ataklar tamamlandı 🎓'}</div>
    <p class="small muted">${lp.current ? 'Huzursuzluk, yapışma ve uyku bozulması geçicidir; ardından yeni beceriler gelir. Bol kucak, sabır ve rutin.' : 'Ataklar arası dönemler genellikle daha sakin ve neşelidir.'}</p></div>
  ${lp.spurt ? `<div class="insight c-feed" style="margin-top:12px"><span class="ic">🌱</span><div><div class="t">Büyüme atağı dönemi (${lp.spurt[2]})</div><div class="s">Birkaç gün daha sık ve uzun emmek isteyebilir. İsteğe bağlı besleyin.</div></div></div>` : ''}
  ${sec('Zihinsel gelişim takvimi')}<div class="list">${LEAPS.map(item).join('')}</div>
  <p class="disc">Atak haftaları ${baby().gestWeeks ? 'beklenen doğum tarihine göre' : 'doğum tarihine göre'} hesaplanır ve ortalama değerlerdir. Bu model yol gösterici olup bilimsel kanıtı sınırlıdır; bebeğinizin kendi ritmi esastır.</p>`;
}

// ---------- Uyku yardımcısı ----------
let sndMin = 30;
on('snd', (d) => { if (sound.playing === d.v) sound.stop(); else { try { sound.play(d.v, sndMin); } catch { toast('Ses başlatılamadı'); } } rerender(); });
on('sndMin', (d) => { sndMin = Number(d.v); if (sound.playing) sound.play(sound.playing, sndMin); rerender(); });
function schedule(ns) {
  const n = ns.norm, naps = Math.round((n.naps[0] + n.naps[1]) / 2), wake = (n.wake[0] + n.wake[1]) / 2;
  if (naps > 4) return null;
  const totalDay = 24 * 60 - ((n.night[0] + n.night[1]) / 2) * 60; // uyanık gün uzunluğu (dk)
  const napLen = Math.max(30, Math.min(120, (totalDay - wake * (naps + 1) * 1.05) / Math.max(1, naps)));
  let t = 7 * 60; const rows = [['☀️', 'Güne başlangıç', t]];
  for (let i = 1; i <= naps; i++) { t += wake * (0.85 + (0.3 * i) / (naps + 1)); rows.push(['😴', `${i}. gündüz uykusu`, t, napLen]); t += napLen; }
  t += wake * 1.1; rows.push(['🛁', 'Uyku rutini', t - 30]); rows.push(['🌙', 'Gece uykusu', t]);
  const f = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60 / 5) * 5 % 60).padStart(2, '0')}`;
  return rows.map(([i, l, m, len]) => `<div class="item"><span class="tile sm c-sleep">${i}</span><span class="grow"><div class="t">${l}</div>${len ? `<div class="s">~${fmtDur(len * MIN)}</div>` : ''}</span><span class="b num">${f(m)}</span></div>`).join('');
}
export function sleep() {
  const ns = nextSleep(), n = ns.norm, wk = weekAvg(7), a = age();
  const days = rangeStats(7).filter((d) => d.sleepMs);
  const sched = schedule(ns);
  const ps = predictSleep(), nx = ps.next;
  let now_;
  if (ps.empty) now_ = `<div class="insight c-sleep"><span class="ic">💡</span><div><div class="t">Uykuları kaydedin</div><div class="s">Ana ekrandaki “Uyudu / Uyandı” düğmesiyle kayıt tuttukça uyku saatlerini bebeğinizin kendi düzenine göre tahmin ederim. 3 günlük kayıt yeterli bir başlangıçtır.</div></div></div>`;
  else if (ps.asleep) now_ = `<div class="insight c-sleep"><span class="ic">🌙</span><div><div class="t">Uyuyor · tahmini uyanış ≈ ${fmtTime(nx.at)}</div><div class="s">Uyku süresi ${fmtDur(Date.now() - ps.since)}. ${CONF[nx.conf]}.</div></div></div>`;
  else now_ = `<div class="insight c-${ps.state === 'late' ? 'bad' : ps.state === 'now' ? 'warn' : 'sleep'}"><span class="ic">${ps.state === 'late' ? '🥱' : '⏰'}</span><div><div class="t">${ps.state === 'late' ? 'Uyku zamanı geçti' : ps.state === 'now' ? 'Uyku penceresi şu an açık' : `${napName(nx)} ≈ ${fmtTime(nx.at)}`} · ${fmtTime(nx.from)}–${fmtTime(nx.to)}</div><div class="s">Uyanıklık süresi ${fmtDur(Date.now() - ps.since)}; bu uyku için hedef ~${fmtDur(nx.ww * MIN)}. ${CONF[nx.conf]}.${ps.basis.length ? ' ' + ps.basis.map(esc).join('. ') + '.' : ''}</div></div></div>`;
  const planRows = ps.empty ? '' : ps.plan.map((p) => `<div class="item"><span class="tile sm c-sleep">${p.kind === 'wake' ? '☀️' : '🌙'}</span><span class="grow"><div class="t ${p.done ? 'muted' : ''}">${p.kind === 'wake' ? 'Sabah uyanışı' : napName(p)}</div><div class="s">${p.done ? 'Gerçekleşti' : p.live ? 'Sürüyor' : 'Tahmin'}${p.end && p.kind !== 'wake' ? ` · ${p.done ? '' : '~'}${fmtDur(p.end - p.start)}` : ''}${!p.done && !p.live && p.kind === 'night' ? ` · rutin ${fmtTime(p.start - 30 * MIN)}` : ''}</div></span><span class="b num ${p.done ? 'muted' : ''}">${p.done || p.live ? '' : '≈ '}${fmtTime(p.start)}${p.end && p.kind === 'nap' ? `<span class="faint" style="font-weight:500">–${fmtTime(p.end)}</span>` : ''}</span></div>`).join('');
  return `${head('Uyku Yardımcısı')}
  <div class="stack">${now_}
  ${ps.empty ? '' : `<div class="card">${planStrip(ps)}</div>`}
  <div class="stats"><div class="stat"><div class="v">${n.total.join('–')}<small> sa</small></div><div class="k">Günlük hedef</div><div class="d">${wk?.sleepH != null ? `sizde ort. ${round1(wk.sleepH)} sa` : a.text}</div></div>
    <div class="stat"><div class="v">${rangeTxt(n.wake)}</div><div class="k">Uyanık kalma</div><div class="d">iki uyku arası</div></div>
    <div class="stat"><div class="v">${n.naps[0] === n.naps[1] ? n.naps[0] : n.naps.join('–')}</div><div class="k">Gündüz uykusu</div><div class="d">${wk?.naps != null ? `sizde ort. ${round1(wk.naps)}` : '&nbsp;'}</div></div>
    <div class="stat"><div class="v" style="font-size:17px;line-height:1.6">${n.bed}</div><div class="k">Yatış saati</div><div class="d">gece ${n.night.join('–')} sa</div></div></div>
  <div class="card tint c-sleep small">💡 ${esc(n.tip)}</div></div>
  ${planRows ? `${sec('Bugünün uyku planı', '<span class="tiny muted">her kayıtta güncellenir</span>')}<div class="list">${planRows}</div>` : sched ? `${sec('Örnek gün planı', '<span class="tiny muted">07:00 uyanışa göre</span>')}<div class="list">${sched}</div>` : ''}
  ${sec('Uyku sesleri')}<div class="card stack"><div class="quick" style="grid-template-columns:repeat(3,1fr)">${sound.SOUNDS.map(([k, i, l]) => `<button data-act="snd" data-v="${k}" class="c-sleep" style="box-shadow:none;background:${sound.playing === k ? 'color-mix(in srgb,var(--sleep) 20%,transparent)' : 'var(--surface2)'}"><span class="tile">${sound.playing === k ? '⏸' : i}</span>${l}</button>`).join('')}</div>
    ${seg('sndMin', [['15', '15 dk'], ['30', '30 dk'], ['60', '1 sa'], ['0', 'Sürekli']], String(sndMin))}
    <p class="tiny muted">Sesi kısık tutun (duş sesi düzeyi, ≤50 dB) ve cihazı beşikten en az 2 metre uzağa koyun. ${sound.playing && sound.endsAt ? `Kapanış: ${fmtTime(sound.endsAt)}` : ''}</p></div>
  ${days.length >= 2 ? `${sec('Son 7 gün')}<div class="card stack-sm">${days.map((d) => `<div class="row small"><span style="width:44px" class="muted">${fmtDate(d.day, false)}</span><div class="progress grow c-sleep"><i style="width:${Math.min(100, (d.sleepMs / HOUR / n.total[1]) * 100)}%"></i></div><span class="num b" style="width:54px;text-align:right">${round1(d.sleepMs / HOUR)} sa</span></div>`).join('')}</div>` : ''}
  ${sec('Uyku rehberi')}<div class="list">${SLEEP_TIPS.map(([t, x]) => `<details class="item" style="display:block"><summary class="row" style="cursor:pointer;list-style:none"><span class="t grow">${t}</span><span class="faint">▾</span></summary><p class="small muted" style="margin-top:8px">${esc(x)}</p></details>`).join('')}</div>
  ${sec('Yaşlara göre uyku')}<div class="list">${SLEEP_NORMS.map((x, i) => `<div class="item small"><span class="grow ${x === n ? 'b' : ''}">${i ? SLEEP_NORMS[i - 1].to : 0}–${x.to} ay</span><span class="muted">${x.total.join('–')} sa · ${x.naps[0] === x.naps[1] ? x.naps[0] : x.naps.join('–')} uyku</span></div>`).join('')}</div>
  <p class="disc">Güvenli uyku: her uykuda sırtüstü, sert ve boş bir yatakta. Horlama, nefes durması veya aşırı terleme varsa doktorunuza danışın.</p>`;
}

// ---------- Oyun & ebeveyn rehberi ----------
let playIdx = null;
on('playIdx', (d) => { playIdx = Number(d.v); rerender(); });
export function play() {
  const def = PLAY_GUIDE.indexOf(playGuideFor(age().exactMonths)), i = playIdx ?? def, g = PLAY_GUIDE[i];
  return `${head('Oyun & Ebeveyn Rehberi')}
  <div class="chips scroll" style="margin-bottom:14px">${PLAY_GUIDE.map((x, j) => `<button class="chip ${j === i ? 'on' : ''}" data-act="playIdx" data-v="${j}">${x.title.split(' · ')[0]}${j === def ? ' •' : ''}</button>`).join('')}</div>
  <div class="stack"><div class="card"><h2 style="margin-bottom:10px">${esc(g.title)}</h2><h3 style="margin-bottom:6px">🧸 Oyun ve etkinlik önerileri</h3><div class="prose"><ul>${g.play.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></div>
  <div class="card tint c-health"><h3 style="margin-bottom:6px">💞 Duygusal dünya</h3><div class="prose">${md(g.psych)}</div></div>
  <div class="card tint c-care"><h3 style="margin-bottom:6px">🫶 Ebeveyne not</h3><div class="prose">${md(g.parent)}</div></div>
  ${i === def ? `<button class="btn soft block" data-act="tummyToggle">🤸 Karın üstü sayacını başlat</button>` : ''}
  <button class="btn ghost block" data-act="askAi" data-q="Bebeğimin yaşına uygun, evdeki malzemelerle yapabileceğim 5 oyun önerir misin?">✨ Asistandan kişisel öneri al</button></div>`;
}
