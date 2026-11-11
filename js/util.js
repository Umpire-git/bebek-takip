// Genel yardımcılar: tarih/saat, biçimlendirme, güvenli HTML
export const MIN = 60000, HOUR = 3600000, DAY = 86400000;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad = (n) => String(n).padStart(2, '0');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);
export const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);
export const round1 = (n) => (Math.round(n * 10) / 10).toLocaleString('tr-TR');
// Uyanıklık aralığı (dk) -> "60–90 dk" ya da "2–2,75 sa"
export const rangeTxt = ([lo, hi]) => (hi <= 120 ? `${lo}–${hi} dk` : `${(Math.round(lo / 15) / 4).toLocaleString('tr-TR')}–${(Math.round(hi / 15) / 4).toLocaleString('tr-TR')} sa`);
export const trLower = (s) => String(s || '').trim().toLocaleLowerCase('tr-TR');
export const cap = (s) => (s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : '');

export const startOfDay = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const dayKey = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const parseDay = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
export const addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
export const addMonths = (ts, n) => {
  const d = new Date(ts); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.getTime();
};

export const fmtTime = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const fmtDate = (ts, withYear = true) => { const d = new Date(ts); return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`; };
export const fmtDayName = (ts) => DAYS[new Date(ts).getDay()];
export const fmtDayShort = (ts) => DAYS[new Date(ts).getDay()].slice(0, 3);
export const fmtRelDay = (ts) => {
  const diff = Math.round((startOfDay(ts) - startOfDay()) / DAY);
  if (diff === 0) return 'Bugün';
  if (diff === -1) return 'Dün';
  if (diff === 1) return 'Yarın';
  return `${fmtDate(ts, new Date(ts).getFullYear() !== new Date().getFullYear())}, ${fmtDayName(ts)}`;
};
export const fmtDateTime = (ts) => `${fmtRelDay(ts)} ${fmtTime(ts)}`;

// Süre: 95 dk -> "1 sa 35 dk"
export const fmtDur = (ms, short = false) => {
  const m = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(m / 60), r = m % 60;
  if (h === 0) return `${r} dk`;
  if (short) return `${h}s ${pad(r)}d`;
  return r ? `${h} sa ${r} dk` : `${h} sa`;
};
export const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};
export const ago = (ts) => {
  const d = Date.now() - ts;
  if (d < MIN) return 'az önce';
  if (d < DAY) return `${fmtDur(d)} önce`;
  const days = Math.floor(d / DAY);
  return `${days} gün önce`;
};
export const inDays = (ts) => {
  const d = Math.round((startOfDay(ts) - startOfDay()) / DAY);
  if (d === 0) return 'bugün';
  if (d === 1) return 'yarın';
  if (d === -1) return 'dün';
  return d > 0 ? `${d} gün sonra` : `${-d} gün gecikti`;
};

// datetime-local <-> ts
export const toLocalInput = (ts) => { const d = new Date(ts); return `${dayKey(ts)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fromLocalInput = (v) => (v ? new Date(v).getTime() : null);

// Yaş hesabı (takvim ayı bazlı)
export const ageAt = (birthTs, atTs = Date.now()) => {
  const b = new Date(birthTs), a = new Date(atTs);
  let months = (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  if (a.getDate() < b.getDate()) months--;
  months = Math.max(0, months);
  const anchor = addMonths(startOfDay(birthTs), months);
  const days = Math.max(0, Math.round((startOfDay(atTs) - anchor) / DAY));
  const totalDays = Math.max(0, Math.floor((startOfDay(atTs) - startOfDay(birthTs)) / DAY));
  const weeks = Math.floor(totalDays / 7);
  const exactMonths = months + days / 30.4;
  let text;
  if (totalDays < 14) text = `${totalDays} günlük`;
  else if (months < 1) text = `${weeks} haftalık`;
  else if (months < 24) text = days ? `${months} ay ${days} günlük` : `${months} aylık`;
  else { const y = Math.floor(months / 12), m = months % 12; text = m ? `${y} yaş ${m} aylık` : `${y} yaşında`; }
  return { months, days, totalDays, weeks, exactMonths, text };
};

export const fmtNum = (n, d = 1) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('tr-TR', { maximumFractionDigits: d }));
export const parseNum = (v) => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

// Mini markdown -> HTML (sohbet yanıtları ve rehber metinleri için)
export function md(src) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = []; let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of String(src || '').split('\n')) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^#{1,4}\s+(.*)/))) { close(); out.push(`<h4>${inline(m[1])}</h4>`); }
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); }
    else if (/^-{3,}$/.test(line.trim())) { close(); }
    else if (line.trim() === '') { close(); }
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join('');
}
