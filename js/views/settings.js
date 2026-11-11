// Ayarlar: bebek profili, tema, yapay zekâ, yedekleme
import { db, save, baby, addBaby, replaceDb, resetDb, birthTs } from '../store.js';
import { age } from '../calc.js';
import { on, openForm, toast, seg, sec } from '../ui.js';
import { MODELS, hasKey } from '../ai.js';
import { esc, dayKey, fmtDate } from '../util.js';

const BABY_FIELDS = [
  { k: 'name', l: 'Ad', t: 'text', req: true }, { k: 'birth', l: 'Doğum tarihi', t: 'date', req: true },
  { k: 'gender', l: 'Cinsiyet', t: 'chips', opts: [['M', '👦 Erkek'], ['F', '👧 Kız']], def: 'M' },
  { row: [{ k: 'bw', l: 'Doğum kilosu', t: 'num', unit: 'kg', step: 0.01 }, { k: 'bh', l: 'Doğum boyu', t: 'num', unit: 'cm', step: 0.1 }, { k: 'bhc', l: 'Baş çevresi', t: 'num', unit: 'cm', step: 0.1 }] },
  { row: [{ k: 'gestWeeks', l: 'Doğum haftası', t: 'num', unit: 'hf', ph: '40' }, { k: 'blood', l: 'Kan grubu', t: 'text', ph: 'A Rh+' }] },
  { k: 'feeding', l: 'Beslenme şekli', t: 'chips', opts: ['Anne sütü', 'Mama', 'Karma'] },
  { k: 'doctor', l: 'Doktoru', t: 'text', ph: 'Ad ve telefon' },
];
const validBaby = (v) => { if (v.birth > dayKey()) { toast('Doğum tarihi gelecekte olamaz'); return false; } if (v.gestWeeks && (v.gestWeeks < 22 || v.gestWeeks > 43)) v.gestWeeks = null; return true; };
on('babyEdit', () => { const b = baby(); openForm({ title: 'Bebek profili', fields: BABY_FIELDS, values: b, onSave: (v) => { if (!validBaby(v)) return false; Object.assign(b, v); save(); toast('Güncellendi ✓'); } }); });
on('babyAdd', () => openForm({ title: 'Yeni bebek ekle', fields: BABY_FIELDS, onSave: (v) => { if (!validBaby(v)) return false; addBaby(v); toast(`${v.name} eklendi 💛`); } }));
on('babySwitch', (d) => { db.activeId = d.id; save(); toast('Bebek değiştirildi'); });
on('babyDel', () => {
  const b = baby();
  if (!confirm(`${b.name} ve tüm kayıtları kalıcı olarak silinsin mi?`)) return;
  db.babies = db.babies.filter((x) => x.id !== b.id);
  db.records = db.records.filter((r) => r.babyId !== b.id);
  ['visits', 'supps', 'allergies', 'products', 'chat'].forEach((k) => { db[k] = db[k].filter((x) => x.babyId !== b.id); });
  ['vaccines', 'teeth', 'milestones', 'timers'].forEach((k) => delete db[k][b.id]);
  db.activeId = db.babies[0]?.id || null; save();
});
on('theme', (d) => { db.settings.theme = d.v; save(); });
on('aiSettings', () => openForm({
  title: '✨ Yapay Zekâ', intro: `<div class="prose small muted" style="margin-bottom:14px"><p>Asistan, Anthropic’in Claude modelini kullanır. <b>console.anthropic.com</b> adresinden bir API anahtarı oluşturup buraya yapıştırın. Anahtar yalnızca bu cihazda saklanır ve sorularınız, bebeğinizin özet verileriyle birlikte doğrudan Anthropic’e gönderilir.</p></div>`,
  fields: [{ k: 'apiKey', l: 'API anahtarı', t: 'text', ph: 'sk-ant-…' }, { k: 'model', l: 'Model', t: 'select', opts: MODELS }, { k: 'parent', l: 'Size nasıl hitap edeyim?', t: 'text', ph: 'Adınız' }, { k: 'apiBase', l: 'Vekil sunucu adresi (gelişmiş, isteğe bağlı)', t: 'text', ph: 'https://…' }],
  values: db.settings, onSave: (v) => { Object.assign(db.settings, { apiKey: v.apiKey || '', model: v.model || 'claude-opus-5-5', parent: v.parent || '', apiBase: v.apiBase || '' }); save(); toast('Kaydedildi ✓'); },
}));
on('export', () => {
  const blob = new Blob([JSON.stringify({ ...db, settings: { ...db.settings, apiKey: '' } }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pitir-yedek-${dayKey()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast('Yedek indirildi');
});
on('exportCsv', () => {
  const rows = [['tarih', 'saat', 'tur', 'ozet', 'not']];
  import('../types.js').then(({ TYPES, summary }) => {
    db.records.filter((r) => r.babyId === db.activeId).sort((a, b) => a.ts - b.ts).forEach((r) => { const d = new Date(r.ts); rows.push([dayKey(r.ts), d.toTimeString().slice(0, 5), TYPES[r.type]?.l || r.type, summary(r), r.note || '']); });
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `pitir-kayitlar-${dayKey()}.csv`; a.click();
  });
});
on('wipe', () => { if (confirm('TÜM veriler bu cihazdan kalıcı olarak silinecek. Emin misiniz?') && confirm('Bu işlem geri alınamaz. Devam edilsin mi?')) { resetDb(); location.hash = '#/home'; } });

export function render() {
  const b = baby(), s = db.settings;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<a class="back" href="#/home">‹ Bugün</a><h1 style="margin-bottom:14px">Ayarlar</h1>
  <div class="card row"><span class="avatar">${b.gender === 'F' ? '👧' : '👦'}</span><div class="grow"><div class="b">${esc(b.name)}</div><div class="small muted">${fmtDate(birthTs())} · ${age().text}</div></div><button class="btn sm soft" data-act="babyEdit">Düzenle</button></div>
  ${sec('Bebekler', '<button data-act="babyAdd">＋ Bebek ekle</button>')}<div class="list">${db.babies.map((x) => `<button class="item" data-act="babySwitch" data-id="${x.id}"><span class="check ${x.id === b.id ? 'on' : ''}">✓</span><span class="grow t">${esc(x.name)}</span></button>`).join('')}</div>
  ${sec('Görünüm')}${seg('theme', [['auto', 'Otomatik'], ['light', 'Açık'], ['dark', 'Koyu']], s.theme)}
  ${sec('Yapay zekâ asistanı')}<button class="card row" style="width:100%;text-align:left" data-act="aiSettings"><span class="tile c-brand">✨</span><span class="grow"><div class="b">${hasKey() ? 'Claude bağlı' : 'Yerleşik analiz modu'}</div><div class="small muted">${hasKey() ? esc(MODELS.find((m) => m[0] === s.model)?.[1] || s.model) : 'Serbest sohbet için API anahtarı ekleyin'}</div></span>›</button>
  ${sec('Veriler')}<div class="list">
    <button class="item" data-act="export"><span class="tile sm c-brand">💾</span><span class="grow"><div class="t">Yedek al</div><div class="s">Tüm verileri dosya olarak indir</div></span></button>
    <label class="item" style="cursor:pointer"><span class="tile sm c-brand">📥</span><span class="grow"><div class="t">Yedekten geri yükle</div><div class="s">Başka cihaza taşımak için</div></span><input type="file" id="importFile" accept="application/json,.json" hidden></label>
    <button class="item" data-act="exportCsv"><span class="tile sm c-brand">📄</span><span class="grow"><div class="t">Kayıtları Excel/CSV olarak indir</div></span></button>
    ${db.babies.length > 1 ? `<button class="item" data-act="babyDel"><span class="tile sm c-bad">🗑️</span><span class="grow t" style="color:var(--bad)">${esc(b.name)} profilini sil</span></button>` : ''}
    <button class="item" data-act="wipe"><span class="tile sm c-bad">⚠️</span><span class="grow t" style="color:var(--bad)">Tüm verileri sil</span></button></div>
  ${standalone ? '' : `${sec('Ana ekrana ekle')}<div class="card prose small"><p><b>iPhone / iPad:</b> Safari’de <b>Paylaş</b> düğmesine, ardından <b>“Ana Ekrana Ekle”</b>ye dokunun.</p><p><b>Android:</b> Chrome menüsünden <b>“Uygulamayı yükle”</b>yi seçin.</p><p>Böylece Pıtır tam ekran, uygulama gibi açılır ve çevrimdışı çalışır.</p></div>`}
  <p class="disc">Pıtır v1.0 · ${db.records.length} kayıt · Verileriniz yalnızca bu cihazda saklanır; düzenli yedek almanızı öneririz.<br>Bu uygulama bilgilendirme amaçlıdır; tıbbi tanı, tedavi veya profesyonel sağlık hizmetinin yerini tutmaz.</p>`;
}
export function mount(root) {
  root.querySelector('#importFile')?.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.babies) || !Array.isArray(data.records)) throw new Error('biçim');
      if (!confirm(`Yedekte ${data.babies.length} bebek ve ${data.records.length} kayıt var. Mevcut verilerin yerine yüklensin mi?`)) return;
      data.settings = { ...data.settings, apiKey: db.settings.apiKey };
      replaceDb(data); toast('Yedek yüklendi ✓');
    } catch { toast('Dosya okunamadı — geçerli bir Pıtır yedeği değil'); }
  });
}
