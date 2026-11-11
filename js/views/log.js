// Günlük: gün gün zaman çizelgesi, 24 saatlik şerit ve filtreler
import { onDay, birthTs } from '../store.js';
import { dayStats } from '../calc.js';
import { TYPES, GROUPS } from '../types.js';
import { recRow } from '../entry.js';
import { on, empty } from '../ui.js';
import { startOfDay, addDays, fmtRelDay, DAY, HOUR, dayKey, parseDay, round1, fmtDur } from '../util.js';

let day = startOfDay(), filter = 'all';
const rerender = () => document.dispatchEvent(new Event('rerender'));
on('logDay', (d) => { const n = addDays(day, Number(d.n)); if (n <= startOfDay() && n >= startOfDay(birthTs())) { day = n; rerender(); } });
on('logToday', () => { day = startOfDay(); rerender(); });
on('logFilter', (d) => { filter = d.v; rerender(); });

export function strip24(dayTs, records) {
  const s = dayStats(dayTs), pos = (ts) => `${(((ts - s.day) / DAY) * 100).toFixed(2)}%`;
  const blocks = s.blocks.map(([a, b]) => `<i style="left:${pos(a)};width:${(((b - a) / DAY) * 100).toFixed(2)}%"></i>`).join('');
  const marks = records.filter((r) => r.type !== 'sleep' && ['feed', 'diaper'].includes(TYPES[r.type]?.g)).map((r) => `<b class="c-${TYPES[r.type].c}" style="left:${pos(r.ts)}"></b>`).join('');
  const nowLine = s.day === startOfDay() ? `<em style="left:${pos(Date.now())}"></em>` : '';
  return `<div class="day24">${blocks}${marks}${nowLine}</div><div class="day24-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
    <div class="legend" style="margin-top:8px"><span><i style="background:var(--sleep)"></i>Uyku</span><span><i style="background:var(--feed)"></i>Beslenme</span><span><i style="background:var(--diaper)"></i>Bez</span></div>`;
}

export function render() {
  const all = onDay(day), s = dayStats(day);
  const list = filter === 'all' ? all : all.filter((r) => TYPES[r.type]?.g === filter);
  const isToday = day === startOfDay();
  return `<div class="row between" style="margin-bottom:14px"><h1>Günlük</h1><button class="btn sm" data-act="addMenu">＋ Kayıt</button></div>
  <div class="card stack">
    <div class="row between"><button class="icon-btn" style="box-shadow:none;background:var(--surface2)" data-act="logDay" data-n="-1" aria-label="Önceki gün">‹</button>
      <label class="center" style="position:relative;cursor:pointer"><div class="b">${fmtRelDay(day)}</div><div class="tiny muted">${[s.feeds && `${s.feeds} beslenme`, s.sleepMs && `${round1(s.sleepMs / HOUR)} sa uyku`, s.diapers && `${s.diapers} bez`].filter(Boolean).join(' · ') || 'Kayıt yok'}</div>
        <input type="date" id="logDate" value="${dayKey(day)}" max="${dayKey()}" style="position:absolute;inset:0;opacity:0;width:100%"></label>
      <button class="icon-btn" style="box-shadow:none;background:var(--surface2);${isToday ? 'opacity:.3' : ''}" data-act="logDay" data-n="1" aria-label="Sonraki gün">›</button></div>
    <div>${strip24(day, all)}</div></div>
  <div class="chips scroll" style="margin-top:14px;margin-bottom:12px">${GROUPS.map(([v, l]) => `<button class="chip ${v === filter ? 'on' : ''}" data-act="logFilter" data-v="${v}">${l}</button>`).join('')}${isToday ? '' : '<button class="chip" data-act="logToday">↩ Bugün</button>'}</div>
  ${list.length ? `<div class="list">${list.map((r) => recRow(r)).join('')}</div>` : `<div class="card">${empty('🗓️', 'Bu gün için kayıt yok.')}</div>`}
  ${s.sleepMs ? `<p class="disc">Toplam uyku ${fmtDur(s.sleepMs)} · gece ${fmtDur(s.nightMs)} · gündüz ${fmtDur(s.napMs)}</p>` : ''}`;
}
export function mount(root) {
  root.querySelector('#logDate')?.addEventListener('change', (e) => { if (e.target.value) { day = Math.min(startOfDay(), parseDay(e.target.value)); rerender(); } });
}
