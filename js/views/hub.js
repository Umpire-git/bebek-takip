// Bebeğim: tüm modüllerin merkezi
import { per, mine, recs } from '../store.js';
import { age, latestGrowth, vaccineList, nextCheckup, suppToday, foodsTried, leapInfo, nextSleep } from '../calc.js';
import { babyHeader } from './home.js';
import * as H from './mod-health.js';
import * as D from './mod-dev.js';
import * as F from './mod-food.js';
import { fmtNum, inDays, rangeTxt } from '../util.js';
import { MILESTONES } from '../data/development.js';
import { suitableRecipes } from '../ai.js';

const MODS = { growth: H.growth, vaccines: H.vaccines, visits: H.visits, health: H.health, supps: H.supps, allergies: H.allergies, teeth: H.teeth, care: H.care, emergency: H.emergency, report: H.report, milestones: D.milestones, leaps: D.leaps, sleep: D.sleep, play: D.play, solids: F.solids, recipes: F.recipes };

function cards() {
  const w = latestGrowth('weight'), vs = vaccineList().filter((v) => !v.opt), due = vs.find((v) => v.state === 'overdue' || v.state === 'soon');
  const ck = nextCheckup(), sp = suppToday(), tried = foodsTried().size, lp = leapInfo(), ns = nextSleep(), mo = age().exactMonths;
  const ms = per('milestones'), g = MILESTONES.filter((x) => x.m <= Math.max(2, mo)).pop();
  const al = mine('allergies').length, teeth = Object.keys(per('teeth')).length;
  return [
    ['Sağlık', [
      ['growth', '📈', 'Büyüme', w ? `${fmtNum(w.v, 2)} kg · ${Math.round(w.pct)}. persentil` : 'Kilo, boy, baş çevresi', 'growth'],
      ['vaccines', '💉', 'Aşı Takvimi', due ? `${due.name} · ${inDays(due.due)}` : `${vs.filter((v) => v.state === 'done').length}/${vs.length} tamamlandı`, 'care'],
      ['visits', '🩺', 'Doktor Kontrolleri', ck.upcoming ? `Randevu ${inDays(ck.upcoming.ts)}` : ck.rec ? ck.rec.name : 'Randevu ve notlar', 'health'],
      ['health', '🌡️', 'Sağlık Günlüğü', 'Ateş, ilaç, belirtiler', 'health'],
      ['supps', '💧', 'Takviyeler', sp.length ? `Bugün ${sp.filter((s) => s.given >= (s.perDay || 1)).length}/${sp.length} verildi` : 'D vitamini, demir…', 'care'],
      ['allergies', '⚠️', 'Alerjiler', al ? `${al} kayıt` : 'Alerji ve hassasiyetler', 'warn'],
      ['teeth', '🦷', 'Dişler', `${teeth}/20 süt dişi`, 'care'],
      ['care', '🧴', 'Bakım & Kremler', 'Banyo, krem, ürünlerim', 'care'],
    ]],
    ['Beslenme', [
      ['solids', '🥣', 'Ek Gıda', tried ? `${tried} besin denendi` : mo < 5.5 ? '6. ayda başlıyor' : 'Besin kataloğu ve rehber', 'solid'],
      ['recipes', '👩‍🍳', 'Tarifler', mo < 5.5 ? 'Yaşa göre tarifler' : `${suitableRecipes().length} uygun tarif`, 'solid'],
    ]],
    ['Gelişim & uyku', [
      ['sleep', '🌙', 'Uyku Yardımcısı', `Uyanıklık ${rangeTxt(ns.norm.wake)} · uyku sesleri`, 'sleep'],
      ['milestones', '🧩', 'Gelişim Basamakları', g ? `${g.m}. ay: ${g.items.filter((_, i) => ms[`${g.m}-${i}`]).length}/${g.items.length}` : '', 'play'],
      ['leaps', '⚡', 'Gelişim Atakları', lp.current ? `Şimdi: ${lp.current.name}` : lp.next ? `${lp.nextInDays} gün sonra` : 'Tamamlandı', 'play'],
      ['play', '🧸', 'Oyun & Ebeveyn Rehberi', 'Yaşa uygun etkinlikler, psikoloji', 'play'],
    ]],
    ['Araçlar', [
      ['report', '📋', 'Doktor Raporu', 'Yazdırılabilir özet', 'brand'],
      ['emergency', '🚑', 'Acil Rehber', 'Ne zaman doktora?', 'bad'],
    ]],
  ];
}

export function render(sub) {
  if (sub && MODS[sub]) return MODS[sub]();
  return `${babyHeader()}${cards().map(([title, items]) => `<div class="sec"><h3>${title}</h3></div><div class="hub">${items.map(([id, i, t, s, c]) => `<button data-act="go" data-to="hub/${id}" class="c-${c}"><span class="tile">${i}</span><span><div class="t">${t}</div><div class="s">${s}</div></span></button>`).join('')}</div>`).join('')}`;
}
