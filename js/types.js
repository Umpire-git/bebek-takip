// Kayıt türleri: form alanları, simge/renk ve zaman çizelgesi özetleri tek yerde tanımlanır.
import { fmtDur, fmtNum, MIN } from './util.js';
import { SYMPTOMS, CARE_KINDS } from './data/health.js';

const dt = { k: 'ts', l: 'Zaman', t: 'dt', req: true };
const note = { k: 'note', l: 'Not', t: 'area', ph: 'İsteğe bağlı…' };
const lbl = (opts, v) => { const o = opts.find((x) => (Array.isArray(x) ? x[0] : x) === v); return o ? (Array.isArray(o) ? o[1] : o) : v; };

export const OPT = {
  bottle: [['formula', 'Mama'], ['milk', 'Anne sütü'], ['water', 'Su'], ['other', 'Diğer']],
  amount: [['taste', 'Tadımlık'], ['little', 'Az'], ['mid', 'Orta'], ['much', 'İyi yedi']],
  react: [['loved', '😍 Sevdi'], ['ok', '🙂 Nötr'], ['no', '😖 Sevmedi'], ['reaction', '⚠️ Reaksiyon']],
  diaper: [['wet', '💧 Islak'], ['dirty', '💩 Kirli'], ['both', '💧💩 İkisi'], ['dry', 'Kuru']],
  color: [['yellow', 'Sarı'], ['brown', 'Kahve'], ['green', 'Yeşil'], ['black', 'Siyah'], ['red', 'Kırmızı / kanlı'], ['white', 'Beyaz / kil']],
  cons: [['normal', 'Normal'], ['soft', 'Yumuşak'], ['watery', 'Sulu'], ['hard', 'Sert'], ['mucus', 'Mukuslu']],
  how: [['self', 'Kendi kendine'], ['nursing', 'Emerek'], ['rock', 'Sallanarak'], ['arms', 'Kucakta'], ['car', 'Araba / puset']],
  site: [['armpit', 'Koltuk altı'], ['ear', 'Kulak'], ['forehead', 'Alın'], ['rectal', 'Makat']],
  sev: [['mild', 'Hafif'], ['mid', 'Orta'], ['severe', 'Şiddetli']],
  side: [['L', 'Sol'], ['R', 'Sağ'], ['both', 'İkisi']],
  activity: ['Karın üstü', 'Oyun', 'Kitap', 'Açık hava', 'Müzik', 'Banyo oyunu', 'Yüzme'],
  mood: ['😀', '🙂', '😐', '😢', '😴'],
};

export const TYPES = {
  breast: {
    l: 'Emzirme', i: '🤱', c: 'feed', g: 'feed',
    f: [dt, { row: [{ k: 'left', l: 'Sol', t: 'num', unit: 'dk' }, { k: 'right', l: 'Sağ', t: 'num', unit: 'dk' }] }, note],
    s: (r) => { const p = []; if (r.left) p.push(`Sol ${r.left} dk`); if (r.right) p.push(`Sağ ${r.right} dk`); return p.join(' · ') || 'Emzirildi'; },
  },
  bottle: {
    l: 'Biberon', i: '🍼', c: 'feed', g: 'feed',
    f: [dt, { k: 'kind', l: 'İçerik', t: 'chips', opts: OPT.bottle, def: 'formula' }, { k: 'ml', l: 'Miktar', t: 'num', unit: 'ml', step: 10, quick: [30, 60, 90, 120, 150, 180, 210] }, note],
    s: (r) => `${lbl(OPT.bottle, r.kind || 'formula')}${r.ml ? ` · ${r.ml} ml` : ''}`,
  },
  solid: {
    l: 'Ek Gıda', i: '🥣', c: 'solid', g: 'feed',
    f: [dt, { k: 'foods', l: 'Besinler', t: 'tags', ph: 'Besin adı yazın…' }, { k: 'amount', l: 'Ne kadar yedi?', t: 'chips', opts: OPT.amount }, { k: 'react', l: 'Tepkisi', t: 'chips', opts: OPT.react }, note],
    s: (r) => [(r.foods || []).join(', '), r.amount && lbl(OPT.amount, r.amount), r.react && lbl(OPT.react, r.react)].filter(Boolean).join(' · ') || 'Ek gıda',
  },
  pump: {
    l: 'Süt Sağma', i: '🫙', c: 'feed', g: 'feed',
    f: [dt, { k: 'ml', l: 'Miktar', t: 'num', unit: 'ml', step: 10 }, { k: 'side', l: 'Taraf', t: 'chips', opts: OPT.side }, note],
    s: (r) => [r.ml && `${r.ml} ml`, r.side && lbl(OPT.side, r.side)].filter(Boolean).join(' · ') || 'Sağıldı',
  },
  sleep: {
    l: 'Uyku', i: '😴', c: 'sleep', g: 'sleep',
    f: [{ k: 'ts', l: 'Uyudu', t: 'dt', req: true }, { k: 'end', l: 'Uyandı', t: 'dt' }, { k: 'how', l: 'Nasıl uyudu?', t: 'chips', opts: OPT.how }, note],
    s: (r) => (r.end ? `${fmtDur(r.end - r.ts)}${r.how ? ' · ' + lbl(OPT.how, r.how) : ''}` : 'Devam ediyor'),
  },
  diaper: {
    l: 'Bez', i: '🧷', c: 'diaper', g: 'diaper',
    f: [dt, { k: 'kind', l: 'Durum', t: 'chips', opts: OPT.diaper, def: 'wet' }, { k: 'color', l: 'Kaka rengi', t: 'chips', opts: OPT.color }, { k: 'cons', l: 'Kıvam', t: 'chips', opts: OPT.cons }, note],
    s: (r) => [lbl(OPT.diaper, r.kind || 'wet'), r.color && lbl(OPT.color, r.color), r.cons && lbl(OPT.cons, r.cons)].filter(Boolean).join(' · '),
  },
  growth: {
    l: 'Ölçüm', i: '📏', c: 'growth', g: 'health',
    f: [dt, { row: [{ k: 'weight', l: 'Kilo', t: 'num', unit: 'kg', step: 0.01 }, { k: 'height', l: 'Boy', t: 'num', unit: 'cm', step: 0.1 }, { k: 'head', l: 'Baş çevresi', t: 'num', unit: 'cm', step: 0.1 }] }, note],
    s: (r) => [r.weight && `${fmtNum(r.weight, 2)} kg`, r.height && `${fmtNum(r.height)} cm`, r.head && `Baş ${fmtNum(r.head)} cm`].filter(Boolean).join(' · '),
  },
  temp: {
    l: 'Ateş', i: '🌡️', c: 'health', g: 'health',
    f: [dt, { k: 'val', l: 'Derece', t: 'num', unit: '°C', step: 0.1, req: true }, { k: 'site', l: 'Ölçüm yeri', t: 'chips', opts: OPT.site }, note],
    s: (r) => `${fmtNum(r.val)} °C${r.site ? ' · ' + lbl(OPT.site, r.site) : ''}`,
  },
  med: {
    l: 'İlaç', i: '💊', c: 'health', g: 'health',
    f: [dt, { k: 'name', l: 'İlaç adı', t: 'text', req: true, sug: 'med' }, { row: [{ k: 'dose', l: 'Doz', t: 'text', ph: 'örn. 2,5 ml' }, { k: 'gap', l: 'Doz aralığı', t: 'num', unit: 'saat' }] }, { k: 'reason', l: 'Neden', t: 'text' }, note],
    s: (r) => [r.name, r.dose, r.reason].filter(Boolean).join(' · '),
  },
  supp: {
    l: 'Takviye', i: '💧', c: 'care', g: 'health',
    f: [dt, { k: 'name', l: 'Takviye', t: 'text', req: true, sug: 'supp' }, { k: 'dose', l: 'Doz', t: 'text' }, note],
    s: (r) => [r.name, r.dose].filter(Boolean).join(' · '),
  },
  symptom: {
    l: 'Belirti', i: '🤒', c: 'health', g: 'health',
    f: [dt, { k: 'kinds', l: 'Belirtiler', t: 'multi', opts: SYMPTOMS }, { k: 'sev', l: 'Şiddet', t: 'chips', opts: OPT.sev }, note],
    s: (r) => [(r.kinds || []).join(', '), r.sev && lbl(OPT.sev, r.sev)].filter(Boolean).join(' · ') || 'Belirti',
  },
  care: {
    l: 'Bakım', i: '🧴', c: 'care', g: 'care',
    f: [dt, { k: 'kind', l: 'Tür', t: 'chips', opts: CARE_KINDS, def: 'Krem' }, { k: 'product', l: 'Ürün', t: 'text', sug: 'product' }, { k: 'area', l: 'Bölge', t: 'text', ph: 'örn. bez bölgesi, yanaklar' }, note],
    s: (r) => [r.kind, r.product, r.area].filter(Boolean).join(' · '),
  },
  activity: {
    l: 'Aktivite', i: '🧸', c: 'play', g: 'care',
    f: [dt, { k: 'kind', l: 'Tür', t: 'chips', opts: OPT.activity, def: 'Karın üstü' }, { k: 'min', l: 'Süre', t: 'num', unit: 'dk' }, note],
    s: (r) => [r.kind, r.min && `${r.min} dk`].filter(Boolean).join(' · '),
  },
  note: {
    l: 'Not / Anı', i: '📝', c: 'note', g: 'care',
    f: [dt, { k: 'text', l: 'Not', t: 'area', req: true, ph: 'Bugün ilk kez…' }, { k: 'mood', l: 'Günün modu', t: 'chips', opts: OPT.mood }],
    s: (r) => `${r.mood ? r.mood + ' ' : ''}${r.text || ''}`,
  },
};

export const GROUPS = [['all', 'Tümü'], ['feed', 'Beslenme'], ['sleep', 'Uyku'], ['diaper', 'Bez'], ['health', 'Sağlık'], ['care', 'Bakım & diğer']];
export const FEED_TYPES = ['breast', 'bottle', 'solid'];
export const sleepDur = (r, now = Date.now()) => (r.end || now) - r.ts;
export const breastMin = (r) => (r.left || 0) + (r.right || 0);
export const isNight = (ts) => { const h = new Date(ts).getHours(); return h >= 19 || h < 7; };
export const summary = (r) => { try { return TYPES[r.type]?.s(r) || ''; } catch { return ''; } };
export { MIN };
