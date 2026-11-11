// Uygulama kabuğu: yönlendirme, menü, tema, canlı sayaçlar, ilk kurulum
import { db, save, onChange, baby, addBaby, hasLegacy, importLegacy } from './store.js';
import { actions, on, chipClick, sheetOpen, toast, formHTML, readForm } from './ui.js';
import { fmtClock, fmtDur, dayKey, esc } from './util.js';
import * as home from './views/home.js';
import * as log from './views/log.js';
import * as hub from './views/hub.js';
import * as stats from './views/stats.js';
import * as assistant from './views/assistant.js';
import * as settings from './views/settings.js';

const TABS = [
  ['home', 'Bugün', '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>'],
  ['log', 'Günlük', '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".6"/><circle cx="4.5" cy="12" r=".6"/><circle cx="4.5" cy="18" r=".6"/>'],
  ['hub', 'Bebeğim', '<path d="M12 20.5S4 15.3 4 9.8A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 20 9.8c0 5.5-8 10.7-8 10.7z"/>'],
  ['stats', 'Analiz', '<path d="M5 20v-8M12 20V5M19 20v-5M3 20h18"/>'],
  ['ai', 'Asistan', '<path d="m11 4 1.9 5.1L18 11l-5.1 1.9L11 18l-1.9-5.1L4 11l5.1-1.9z"/><path d="m19 15 .7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>'],
];
const VIEWS = { home, log, hub, stats, ai: assistant, settings };
const $view = document.getElementById('view'), $nav = document.getElementById('nav');

export const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
export const go = (to) => { if (route() === to) render(); else location.hash = '#/' + to; };
on('go', (d) => go(d.to));

function applyTheme() {
  const t = db.settings.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

function renderNav(tab) {
  $nav.innerHTML = `<div class="brand"><img src="icons/icon.svg" alt="">Pıtır</div>` +
    TABS.map(([id, label, icon]) => `<button class="${id === tab ? 'on' : ''}" data-act="go" data-to="${id}" aria-label="${label}"><svg viewBox="0 0 24 24">${icon}</svg><span>${label}</span></button>`).join('');
}

export function render() {
  applyTheme();
  if (!baby()) { $nav.classList.add('hide'); return onboarding(); }
  $nav.classList.remove('hide');
  const r = route(), [tab, sub] = r.split('/');
  const v = VIEWS[tab] || home;
  renderNav(VIEWS[tab] ? (tab === 'settings' ? 'home' : tab) : 'home');
  $view.innerHTML = v.render(sub);
  v.mount?.($view, sub);
  tick();
}
let lastRoute = null;
addEventListener('hashchange', () => { render(); if (route() !== lastRoute) scrollTo(0, 0); lastRoute = route(); });
onChange(render);
document.addEventListener('rerender', render);

// Tıklama yönlendirme
document.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-chip]');
  if (chip && chipClick(chip)) return;
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});

// Canlı sayaçlar
function tick() {
  const now = Date.now();
  document.querySelectorAll('[data-since]').forEach((el) => {
    const ms = now - Number(el.dataset.since) + Number(el.dataset.plus || 0);
    el.textContent = el.dataset.fmt === 'dur' ? fmtDur(ms) : fmtClock(ms);
  });
}
setInterval(tick, 1000);
setInterval(() => { if (route() === 'home' && !sheetOpen() && baby()) render(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && baby() && !sheetOpen() && route() !== 'ai') render(); });

// --- İlk kurulum ---
const OB_FIELDS = [
  { k: 'name', l: 'Bebeğinizin adı', t: 'text', req: true, ph: 'örn. Ali Kuzey' },
  { k: 'birth', l: 'Doğum tarihi', t: 'date', req: true },
  { k: 'gender', l: 'Cinsiyet', t: 'chips', opts: [['M', '👦 Erkek'], ['F', '👧 Kız']], def: 'M' },
  { row: [{ k: 'bw', l: 'Doğum kilosu', t: 'num', unit: 'kg', step: 0.01 }, { k: 'bh', l: 'Doğum boyu', t: 'num', unit: 'cm', step: 0.1 }] },
  { k: 'gestWeeks', l: 'Kaçıncı haftada doğdu? (isteğe bağlı)', t: 'num', unit: 'hafta', ph: '40' },
  { k: 'feeding', l: 'Beslenme şekli', t: 'chips', opts: ['Anne sütü', 'Mama', 'Karma'] },
];
function onboarding() {
  const legacy = hasLegacy();
  const pre = legacy ? { name: 'Ali Kuzey', birth: '2026-04-17' } : {};
  $view.innerHTML = `<div class="stack" style="max-width:520px;margin:0 auto;padding-top:12px">
    <div class="center"><img src="icons/icon.svg" alt="" width="84" height="84" style="border-radius:24px">
      <h1 style="margin-top:14px">Pıtır’a hoş geldiniz</h1>
      <p class="muted" style="margin-top:6px">Beslenmeden uykuya, aşıdan ek gıdaya; bebeğinizin tüm yolculuğu tek yerde. Akıllı asistan, kayıtlarınızı yorumlayıp size özel önerir.</p></div>
    <form class="card" id="ob">${formHTML(OB_FIELDS, pre)}
      ${legacy ? '<p class="small muted" style="margin-bottom:12px">📦 Önceki sürümdeki kayıtlarınız bulundu ve otomatik aktarılacak.</p>' : ''}
      <button class="btn block">Başlayalım</button></form>
    <p class="disc">Verileriniz yalnızca bu cihazda saklanır. Uygulama tıbbi tavsiye yerine geçmez; sağlık kararlarında doktorunuza danışın.</p></div>`;
  document.getElementById('ob').addEventListener('submit', (e) => {
    e.preventDefault();
    const { values, missing } = readForm(e.target, OB_FIELDS);
    if (missing) return toast(`“${missing}” alanı gerekli`);
    if (values.birth > dayKey()) return toast('Doğum tarihi gelecekte olamaz');
    if (values.gestWeeks && (values.gestWeeks < 22 || values.gestWeeks > 43)) values.gestWeeks = null;
    addBaby(values);
    if (legacy) { const n = importLegacy(); toast(`${n} eski kayıt aktarıldı`); }
    else toast(`Hoş geldin ${values.name} 💛`);
    location.hash = '#/home';
  });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
lastRoute = route();
render();
