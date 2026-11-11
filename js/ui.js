// Arayüz altyapısı: eylem kaydı, sayfa (sheet), bildirim, form üretici, grafikler
import { esc, toLocalInput, fromLocalInput, parseNum, fmtNum } from './util.js';

// --- Eylemler: HTML'de data-act="ad" ile bağlanır ---
export const actions = {};
export const on = (name, fn) => { actions[name] = fn; };

// --- Bildirim ---
let toastTimer;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

// --- Sheet ---
export function sheet(title, bodyHTML, { wide = false } = {}) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" ${wide ? 'style="max-width:760px"' : ''}>
    <div class="grab"></div>
    <div class="head"><h2>${esc(title)}</h2><button class="x" data-act="closeSheet" aria-label="Kapat">✕</button></div>
    <div class="sheet-body">${bodyHTML}</div></div>`;
  scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) closeSheet(); });
  document.body.appendChild(scrim);
  return scrim.querySelector('.sheet-body');
}
export function closeSheet(all = false) {
  const list = [...document.querySelectorAll('.scrim')];
  (all ? list : list.slice(-1)).forEach((s) => s.remove());
}
export const sheetOpen = () => !!document.querySelector('.scrim');
on('closeSheet', () => closeSheet());

// --- Form üretici ---
const optPair = (o) => (Array.isArray(o) ? o : [o, o]);
function fieldHTML(f, v, sugs) {
  if (f.row) return `<div class="${f.row.length === 3 ? 'three' : 'two'}">${f.row.map((x) => fieldHTML(x, v, sugs)).join('')}</div>`;
  const val = v[f.k] ?? f.def ?? '';
  const lab = `<span>${esc(f.l)}${f.req ? ' *' : ''}</span>`;
  switch (f.t) {
    case 'dt': return `<label class="field">${lab}<input class="inp" type="datetime-local" data-k="${f.k}" value="${val ? toLocalInput(val) : ''}"></label>`;
    case 'date': return `<label class="field">${lab}<input class="inp" type="date" data-k="${f.k}" value="${esc(val)}"></label>`;
    case 'num': return `<div class="field">${lab}<div class="inp-u"><input class="inp" type="number" inputmode="decimal" step="${f.step || 1}" data-k="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph || '')}"><em>${esc(f.unit || '')}</em></div>
      ${f.quick ? `<div class="chips" style="margin-top:8px">${f.quick.map((q) => `<button type="button" class="chip" data-act="setVal" data-k="${f.k}" data-v="${q}">${q}</button>`).join('')}</div>` : ''}</div>`;
    case 'area': return `<label class="field">${lab}<textarea class="inp" data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea></label>`;
    case 'select': return `<label class="field">${lab}<select class="inp" data-k="${f.k}">${f.opts.map(optPair).map(([a, b]) => `<option value="${esc(a)}" ${a === val ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
    case 'chips': case 'multi': {
      const sel = f.t === 'multi' ? (v[f.k] || []) : [val];
      return `<div class="field">${lab}<div class="chips" data-k="${f.k}" data-mode="${f.t === 'multi' ? 'multi' : 'one'}">${f.opts.map(optPair).map(([a, b]) => `<button type="button" class="chip ${sel.includes(a) ? 'on' : ''}" data-chip="${esc(a)}">${esc(b)}</button>`).join('')}</div></div>`;
    }
    case 'tags': {
      const sel = v[f.k] || [];
      const sug = (sugs?.[f.k] || []).filter((s) => !sel.includes(s));
      return `<div class="field">${lab}<div class="row" style="margin-bottom:8px"><input class="inp grow" data-tag-input placeholder="${esc(f.ph || '')}" enterkeyhint="done"><button type="button" class="btn soft sm" data-act="addTag">Ekle</button></div>
        <div class="chips" data-k="${f.k}" data-mode="multi">${[...sel.map((s) => [s, true]), ...sug.map((s) => [s, false])].map(([s, o]) => `<button type="button" class="chip ${o ? 'on' : ''}" data-chip="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
    }
    default: {
      const list = f.sug && sugs?.[f.sug]?.length ? `list="dl-${f.k}"` : '';
      return `<label class="field">${lab}<input class="inp" type="text" data-k="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${list} autocomplete="off">
        ${list ? `<datalist id="dl-${f.k}">${sugs[f.sug].map((s) => `<option value="${esc(s)}">`).join('')}</datalist>` : ''}</label>`;
    }
  }
}
export const formHTML = (fields, v = {}, sugs = {}) => fields.map((f) => fieldHTML(f, v, sugs)).join('');
const flat = (fields) => fields.flatMap((f) => (f.row ? f.row : [f]));
export function readForm(root, fields) {
  const out = {}; let missing = null;
  for (const f of flat(fields)) {
    const el = root.querySelector(`[data-k="${f.k}"]`);
    if (!el) continue;
    let val;
    if (f.t === 'dt') val = fromLocalInput(el.value);
    else if (f.t === 'num') val = parseNum(el.value);
    else if (f.t === 'chips') val = el.querySelector('.chip.on')?.dataset.chip ?? null;
    else if (f.t === 'multi' || f.t === 'tags') val = [...el.querySelectorAll('.chip.on')].map((c) => c.dataset.chip);
    else val = el.value.trim();
    if (f.req && (val == null || val === '' || (Array.isArray(val) && !val.length))) missing = missing || f.l;
    out[f.k] = val === '' ? null : val;
  }
  return { values: out, missing };
}
on('setVal', (d, el) => { const inp = el.closest('.field').querySelector(`[data-k="${d.k}"]`); inp.value = d.v; });
on('addTag', (d, el) => {
  const field = el.closest('.field'), inp = field.querySelector('[data-tag-input]');
  const val = inp.value.trim(); if (!val) return;
  const box = field.querySelector('.chips');
  const existing = [...box.children].find((c) => c.dataset.chip.toLocaleLowerCase('tr-TR') === val.toLocaleLowerCase('tr-TR'));
  if (existing) existing.classList.add('on');
  else box.insertAdjacentHTML('afterbegin', `<button type="button" class="chip on" data-chip="${esc(val)}">${esc(val)}</button>`);
  inp.value = ''; inp.focus();
});
export function chipClick(chip) {
  const box = chip.parentElement;
  if (!box.dataset.mode) return false;
  if (box.dataset.mode === 'one') { const was = chip.classList.contains('on'); box.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); if (!was || box.dataset.req) chip.classList.add('on'); }
  else chip.classList.toggle('on');
  box.dispatchEvent(new CustomEvent('chips', { bubbles: true }));
  return true;
}

// Hazır form sayfası
export function openForm({ title, fields, values = {}, sugs = {}, onSave, onDelete, intro = '', saveLabel = 'Kaydet' }) {
  const body = sheet(title, `${intro}<form class="frm">${formHTML(fields, values, sugs)}
    <div class="row" style="margin-top:6px">${onDelete ? '<button type="button" class="btn danger" data-del>Sil</button>' : ''}<button class="btn grow" type="submit">${esc(saveLabel)}</button></div></form>`);
  const form = body.querySelector('form');
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-tag-input]')) { e.preventDefault(); actions.addTag({}, e.target); } });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tagInp = form.querySelector('[data-tag-input]');
    if (tagInp?.value.trim()) actions.addTag({}, tagInp);
    const { values: vals, missing } = readForm(form, fields);
    if (missing) return toast(`“${missing}” alanı gerekli`);
    if (onSave(vals) !== false) closeSheet();
  });
  body.querySelector('[data-del]')?.addEventListener('click', () => { if (confirm('Bu kayıt silinsin mi?')) { onDelete(); closeSheet(); } });
  return body;
}

// --- Ortak parçalar ---
export const seg = (act, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button class="${v === cur ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
export const empty = (emoji, text) => `<div class="empty"><span class="e">${emoji}</span>${text}</div>`;
export const sec = (title, btn = '') => `<div class="sec"><h3>${esc(title)}</h3>${btn}</div>`;
export const backBtn = (to = 'hub', label = 'Bebeğim') => `<a class="back no-print" href="#/${to}">‹ ${esc(label)}</a>`;
export const insightHTML = (x) => `<div class="insight c-${x.c}" ${x.go ? `data-act="go" data-to="${x.go}" style="cursor:pointer"` : ''}><span class="ic">${x.i}</span><div class="grow"><div class="t">${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div></div>`;

// --- Grafikler (SVG) ---
// Yığılmış çubuk grafik. data: [{label, parts:[{v, color}]}], band: [min,max] hedef aralığı
export function barChart(data, { h = 150, unit = '', band = null, fmt = (v) => fmtNum(v) } = {}) {
  const W = 340, pl = 26, pb = 18, pt = 8, iw = W - pl - 4, ih = h - pb - pt;
  const totals = data.map((d) => d.parts.reduce((a, p) => a + (p.v || 0), 0));
  const max = Math.max(1, ...totals, band ? band[1] : 0) * 1.1;
  const bw = iw / data.length, y = (v) => pt + ih - (v / max) * ih;
  const ticks = [0, max / 2, max].map((t) => `<line class="grid" x1="${pl}" x2="${W - 4}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 4}" y="${y(t) + 3}" text-anchor="end">${fmt(t)}</text>`).join('');
  const bandEl = band ? `<rect x="${pl}" y="${y(band[1])}" width="${iw}" height="${Math.max(1, y(band[0]) - y(band[1]))}" fill="var(--ok)" opacity=".1"/>` : '';
  const bars = data.map((d, i) => {
    let acc = 0;
    const x = pl + i * bw + bw * 0.18, w = bw * 0.64;
    const rects = d.parts.map((p) => { const y1 = y(acc + (p.v || 0)), hh = y(acc) - y1; acc += p.v || 0; return hh > 0 ? `<rect x="${x}" y="${y1}" width="${w}" height="${hh}" rx="${Math.min(3, w / 2)}" fill="${p.color}"/>` : ''; }).join('');
    const showLabel = data.length <= 14 || i % Math.ceil(data.length / 10) === 0;
    return `${rects}${showLabel ? `<text x="${x + w / 2}" y="${h - 4}" text-anchor="middle">${esc(d.label)}</text>` : ''}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(unit)} grafiği">${ticks}${bandEl}${bars}</svg>`;
}

// Çizgi grafik. series: [{pts:[[x,y]], color, width, dash, dots, label}]
export function lineChart(series, { h = 210, xmin, xmax, ymin, ymax, xfmt = (v) => v, yfmt = (v) => fmtNum(v), xticks = 6 } = {}) {
  const W = 340, pl = 30, pb = 20, pt = 8, pr = 22, iw = W - pl - pr, ih = h - pb - pt;
  const X = (v) => pl + ((v - xmin) / (xmax - xmin || 1)) * iw, Y = (v) => pt + ih - ((v - ymin) / (ymax - ymin || 1)) * ih;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = ymin + ((ymax - ymin) * i) / 4; g += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${pl - 4}" y="${Y(v) + 3}" text-anchor="end">${yfmt(v)}</text>`; }
  for (let i = 0; i <= xticks; i++) { const v = xmin + ((xmax - xmin) * i) / xticks; g += `<text x="${X(v)}" y="${h - 4}" text-anchor="middle">${xfmt(v)}</text>`; }
  const lines = series.map((s) => {
    if (!s.pts.length) return '';
    const d = s.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join('');
    const lab = s.label ? `<text x="${X(s.pts[s.pts.length - 1][0]) + 3}" y="${Y(s.pts[s.pts.length - 1][1]) + 3}">${esc(s.label)}</text>` : '';
    const dots = s.dots ? s.pts.map(([x, y]) => `<circle cx="${X(x)}" cy="${Y(y)}" r="3.6" fill="${s.color}" stroke="var(--surface)" stroke-width="1.5"/>`).join('') : '';
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 1.2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round" opacity="${s.op || 1}"/>${lab}${dots}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${h}">${g}${lines}</svg>`;
}
