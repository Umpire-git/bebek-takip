// Çizgi ikon seti (24×24, stroke). Arayüzdeki kutucuklarda emoji yerine kullanılır.
const P = {
  nurse: '<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 7.8a4 4 0 0 1 7 2.6C19 15.6 12 20 12 20z"/>',
  bottle: '<path d="M10 2.8h4v2.7h-4zM8.5 5.5h7l1.3 3.2V19a2 2 0 0 1-2 2H9.2a2 2 0 0 1-2-2V8.7z"/><path d="M7.2 12.5h3.3M7.2 15.8h2.3"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M9 7.5c0-1.2 1.2-1.6 1.2-3M14 7.5c0-1.2 1.2-1.6 1.2-3"/>',
  jar: '<path d="M8 3h8v3H8zM7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M5 13c2.3-1.5 4.7 1.5 7 0s4.7-1.5 7 0"/>',
  moon: '<path d="M20 14.3A8.2 8.2 0 1 1 9.7 4a6.5 6.5 0 0 0 10.3 10.3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/>',
  diaper: '<path d="M3 7h18v3.5a9 9 0 0 1-18 0z"/><path d="M3 10.5c3 0 5 2 5.3 5.3M21 10.5c-3 0-5 2-5.3 5.3"/>',
  ruler: '<path d="M3.5 16 16 3.5l4.5 4.5L8 20.5z"/><path d="m7.5 12 1.8 1.8M10.5 9l1.8 1.8M13.5 6l1.8 1.8"/>',
  thermo: '<path d="M10 13.8V5a2 2 0 0 1 4 0v8.8a4.2 4.2 0 1 1-4 0z"/><path d="M12 9v7.5"/>',
  pill: '<path d="M10.8 20.3a5 5 0 0 1-7.1-7.1l6.5-6.5a5 5 0 0 1 7.1 7.1z"/><path d="m7 10 7 7"/><path d="M17.5 3.5l3 3"/>',
  drop: '<path d="M12 3s6 6.3 6 10.8a6 6 0 0 1-12 0C6 9.3 12 3 12 3z"/>',
  face: '<circle cx="12" cy="12" r="9"/><path d="M8.5 16c1.8-1.6 5.2-1.6 7 0M9 10h.01M15 10h.01"/>',
  lotion: '<path d="M10 3h3v3h-3zM13 4h3.5"/><path d="M7 10a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M10 13.5h4"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.5 9.6l5.9-.8z"/>',
  note: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9.5 13h6M9.5 16.5h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  move: '<circle cx="15.5" cy="5.5" r="2"/><path d="M4 19l4-5 3.5 1.5L14 11l-4-1.5L7 12M14 11l5 2M11.5 15.5 13 20"/>',
  syringe: '<path d="m17.5 3 3.5 3.5M19.2 4.8 16 8M13.5 5.5l5 5-8 8H6.5v-4z"/><path d="m3.5 20.5 3-3M9.5 9.5l2 2"/>',
  steth: '<path d="M6 3.5v5.5a4 4 0 0 0 8 0V3.5M10 13v2.5a4.5 4.5 0 0 0 9 0V13"/><circle cx="19" cy="11" r="2"/>',
  bolt: '<path d="M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z"/>',
  spark: '<path d="m11 4 1.9 5.1L18 11l-5.1 1.9L11 18l-1.9-5.1L4 11l5.1-1.9z"/><path d="m19 15 .7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  clip: '<path d="M9 3.5h6v3H9zM9 5H6v15.5h12V5h-3"/><path d="M9.5 12h5M9.5 15.5h3.5"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17h.01"/>',
  tooth: '<path d="M7.5 3.5C5.3 3.5 4 5.2 4 7.5c0 3 1.4 3.8 1.9 6.8.4 2.3.6 6.2 2.1 6.2s1.3-4.8 4-4.8 2.5 4.8 4 4.8 1.7-3.9 2.1-6.2c.5-3 1.9-3.8 1.9-6.8 0-2.3-1.3-4-3.5-4-2 0-2.7 1-4.5 1s-2.5-1-4.5-1z"/>',
  down: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  up: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
  chart: '<path d="M4 4.5V19.5h16"/><path d="m7.5 15 3.5-4 3 2.5 4.5-6"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h12l-2.3 4 2.3 4h-12"/>',
  chef: '<path d="M7.5 14a4 4 0 1 1 1.3-7.8 4 4 0 0 1 6.4 0A4 4 0 1 1 16.5 14v5.5h-9z"/><path d="M7.5 17h9"/>',
  cross: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};
export const icon = (name) => (P[name] ? `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${P[name]}</svg>` : '');

const MAP = {
  '🤱': 'nurse', '🍼': 'bottle', '🥣': 'bowl', '🫙': 'jar', '😴': 'moon', '🌙': 'moon', '🧷': 'diaper', '📏': 'ruler', '🌡️': 'thermo', '💊': 'pill', '💧': 'drop',
  '🤒': 'face', '🧴': 'lotion', '🧸': 'star', '📝': 'note', '➕': 'plus', '🤸': 'move', '💉': 'syringe', '🩺': 'steth', '⚡': 'bolt', '✨': 'spark', '📋': 'clip',
  '⚠️': 'alert', '🦷': 'tooth', '💾': 'down', '📥': 'up', '📄': 'note', '🗑️': 'trash', '📈': 'chart', '🧩': 'flag', '👩‍🍳': 'chef', '🚑': 'cross', '☀️': 'sun', '⏰': 'clock',
};
// Kutucuklardaki (tile) emojileri çizgi ikona çevirir; eşleşmeyenler (yiyecek emojileri vb.) olduğu gibi kalır
export function iconize(root = document) {
  root.querySelectorAll('.tile').forEach((t) => { const n = MAP[t.textContent.trim()]; if (n && !t.firstElementChild) t.innerHTML = icon(n); });
}
