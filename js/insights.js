// Akıllı analiz motoru: kayıtları yaş normlarıyla karşılaştırıp öneri üretir (çevrimdışı çalışır).
import { baby, recs, last, between, per, mine, correctedMonths } from './store.js';
import { age, status, nextSleep, weekAvg, dayStats, latestGrowth, vaccineList, nextCheckup, suppToday, suppAdherence, foodsTried, allergenExposure, allergyNames, leapInfo, medWindow, foodInfo } from './calc.js';
import { DAY, HOUR, MIN, startOfDay, fmtTime, fmtDur, fmtNum, inDays, trLower, round1 } from './util.js';
import { feverAdvice } from './data/health.js';
import { feedNorm, ALLERGENS } from './data/nutrition.js';
import { MILESTONES } from './data/development.js';

export function insights() {
  const b = baby(); if (!b) return [];
  const out = [], now = Date.now(), a = age(), mo = a.exactMonths, cmo = correctedMonths();
  const add = (pri, c, i, t, s, go) => out.push({ pri, c, i, t, s, go });
  const wk = weekAvg(7), yest = dayStats(now - DAY);
  const w = latestGrowth('weight');
  const fn = feedNorm(mo, w?.v);

  // --- Sağlık: ateş, ilaç, belirti ---
  const t = last('temp');
  if (t && now - t.ts < DAY) {
    const fa = feverAdvice(mo, t.val);
    if (fa && fa.level !== 'ok') add(fa.level === 'bad' ? 100 : 80, fa.level, '🌡️', `Son ateş ${fmtNum(t.val)}°C (${fmtTime(t.ts)})`, fa.text, 'hub/health');
  }
  for (const m of medWindow()) if (m.nextAt > now) add(78, 'warn', '💊', `${m.name}: sonraki doz ${fmtTime(m.nextAt)}’den önce verilmemeli`, `Son doz ${fmtTime(m.last)}${m.dose ? ` (${m.dose})` : ''}. Doz ve sıklık için doktorunuzun önerisine uyun.`, 'hub/health');
  const sym = between(now - 5 * DAY, now, 'symptom');
  const symDays = {};
  sym.forEach((r) => (r.kinds || []).forEach((k) => { (symDays[k] = symDays[k] || new Set()).add(startOfDay(r.ts)); }));
  for (const [k, days] of Object.entries(symDays)) if (days.size >= 3) add(76, 'warn', '🤒', `${k} ${days.size} gündür devam ediyor`, 'Belirti 3 günden uzun sürdüğünde doktorunuza danışmanız önerilir. Doktor raporundan özet çıkarabilirsiniz.', 'hub/health');
  if (sym.some((r) => r.sev === 'severe' && now - r.ts < DAY)) add(90, 'bad', '🚑', 'Şiddetli belirti kaydedildi', 'Şiddetli veya kötüleşen belirtilerde beklemeden doktorunuza başvurun. Acil Rehber’e göz atın.', 'hub/emergency');

  // --- Bez ---
  const dia = between(now - 2 * DAY, now, 'diaper');
  const badColor = dia.find((r) => ['red', 'white'].includes(r.color) || (r.color === 'black' && a.totalDays > 5));
  if (badColor) add(95, 'bad', '💩', 'Dikkat gerektiren kaka rengi', { red: 'Kırmızı/kanlı kaka', white: 'Beyaz/kil rengi kaka', black: 'İlk günlerden sonra siyah kaka' }[badColor.color] + ' kaydedildi. Bezi saklayıp aynı gün doktorunuza danışın.', 'log');
  const watery = between(now - DAY, now, 'diaper').filter((r) => r.cons === 'watery').length;
  if (watery >= 3) add(84, 'warn', '💧', `Son 24 saatte ${watery} sulu kaka`, 'İshal olabilir. Emzirmeye/mamaya devam edin, sık ve az besleyin. Islak bez azalır, ağız kurur veya halsizleşirse hemen doktora başvurun.', 'log');
  const tracksDiaper = recs('diaper').length >= 3 && last('diaper') && now - last('diaper').ts < 3 * DAY;
  if (tracksDiaper) {
    const lastWet = recs('diaper').find((r) => r.kind === 'wet' || r.kind === 'both');
    if (lastWet && now - lastWet.ts > 8 * HOUR && !status().asleep) add(82, 'warn', '🧷', `Son ıslak bez ${fmtDur(now - lastWet.ts)} önce`, '8 saatten uzun süre idrar yapmamak sıvı kaybı işareti olabilir. Bezi kontrol edin ve beslenmeyi artırın.', 'log');
    if (yest.diapers >= 2 && yest.wet < fn.wet && a.totalDays > 5) add(60, 'warn', '🧷', `Dün ${yest.wet} ıslak bez kaydedildi`, `Bu yaşta günde en az ${fn.wet} ıslak bez yeterli beslenmenin göstergesidir. Tüm bezler kaydedildiyse beslenme sıklığını gözden geçirin.`, 'stats');
    const lastDirty = recs('diaper').find((r) => r.kind === 'dirty' || r.kind === 'both');
    if (lastDirty && now - lastDirty.ts > 4 * DAY && (mo < 1.5 || recs('solid').length)) add(55, 'warn', '🍐', `${Math.floor((now - lastDirty.ts) / DAY)} gündür kaka kaydı yok`, mo >= 6 ? 'Su, armut/erik püresi ve zeytinyağı yardımcı olabilir. Karın şişliği, kusma veya ağrı varsa doktora danışın.' : 'Bebek huzursuzsa, karnı gergin ise veya kusuyorsa doktorunuza danışın.', 'hub/recipes');
  }

  // --- Beslenme ---
  const lf = last(['breast', 'bottle']);
  const maxGap = mo < 1 ? 4 : mo < 3 ? 5 : null;
  if (lf && maxGap && now - lf.ts > maxGap * HOUR && now - lf.ts < DAY) add(70, 'warn', '🍼', `Son beslenmenin üzerinden ${fmtDur(now - lf.ts)} geçti`, `Bu yaşta beslenme arası ${maxGap} saati geçmemelidir; uyuyorsa nazikçe uyandırıp besleyebilirsiniz.`);
  if (wk && wk.n >= 3 && wk.feeds > 0) {
    if (wk.feeds < fn.feeds[0] - 0.5 && mo < 12) add(58, 'warn', '🍼', `Günlük beslenme ortalaması ${round1(wk.feeds)}`, `Bu yaş için beklenen aralık günde ${fn.feeds[0]}-${fn.feeds[1]} beslenme. ${fn.text}`, 'stats');
    const mostlyBottle = wk.bottleMl > 0 && recs('breast').filter((r) => r.ts > now - 7 * DAY).length < 5;
    if (mostlyBottle) {
      if (wk.bottleMl < fn.ml[0] * 0.8) add(57, 'warn', '🍼', `Günlük ortalama ${Math.round(wk.bottleMl)} ml`, `Bu yaş${w ? ' ve kilo' : ''} için yaklaşık ${fn.ml[0]}-${fn.ml[1]} ml beklenir. Kilo alımı iyiyse sorun olmayabilir; sonraki kontrolde doktorunuzla paylaşın.`, 'stats');
      else if (wk.bottleMl > Math.max(fn.ml[1] * 1.15, 1050)) add(50, 'warn', '🍼', `Günlük ortalama ${Math.round(wk.bottleMl)} ml`, `Önerilen üst sınırın (${fn.ml[1]} ml) üzerinde. Her ağlama açlık olmayabilir; doyma işaretlerini izleyin.`, 'stats');
    }
  }
  if (mo < 6 && between(now - 7 * DAY, now, 'bottle').some((r) => r.kind === 'water')) add(62, 'warn', '🚰', '6 aydan önce su önerilmez', 'Anne sütü ve mama, sıcak havada bile sıvı ihtiyacını karşılar. Su, mideyi doldurup beslenmeyi azaltabilir.');

  // --- Uyku ---
  const ns = nextSleep();
  if (ns.from && !ns.st.asleep) {
    const h = new Date().getHours();
    if (now > ns.to + 20 * MIN && now - ns.st.since < 14 * HOUR) add(66, 'warn', '🥱', `Uyanıklık süresi uzadı: ${fmtDur(now - ns.st.since)}`, `Bu yaşta ideal uyanıklık süresi ${fmtDur(ns.norm.wake[0] * MIN)} – ${fmtDur(ns.norm.wake[1] * MIN)}. Aşırı yorulmadan uyku rutinine başlayın.`, 'hub/sleep');
    else if (now > ns.from - 15 * MIN && now <= ns.to + 20 * MIN) add(64, 'sleep', '😴', 'Uyku penceresi açık', `${h >= 18 ? 'Gece uykusu' : 'Sıradaki uyku'} için ideal aralık: ${fmtTime(ns.from)} – ${fmtTime(ns.to)}. Uyku işaretlerini izleyin.`, 'hub/sleep');
  }
  if (wk && wk.sleepH != null && wk.n >= 3) {
    const [lo, hi] = ns.norm.total;
    if (wk.sleepH < lo - 1) add(56, 'warn', '🌙', `Günlük uyku ortalaması ${round1(wk.sleepH)} saat`, `Bu yaş için önerilen ${lo}-${hi} saat. Yatış saatini 20-30 dk erkene almak ve uyanıklık sürelerini kısaltmak yardımcı olabilir.`, 'hub/sleep');
    else if (wk.sleepH <= hi + 1) add(12, 'ok', '🌙', `Uyku düzeni iyi: günde ~${round1(wk.sleepH)} saat`, `Yaşına uygun aralıkta (${lo}-${hi} saat). Rutine devam!`, 'stats');
  }

  // --- Büyüme ---
  const lastG = last('growth');
  const gEvery = mo < 6 ? 5 * 7 : mo < 12 ? 9 * 7 : 13 * 7;
  if (!lastG && a.totalDays > 10) add(40, 'brand', '📏', 'Büyüme ölçümü ekleyin', 'Kilo, boy ve baş çevresini girerek WHO persentil eğrilerinde gelişimini izleyin.', 'hub/growth');
  else if (lastG && now - lastG.ts > gEvery * DAY) add(38, 'brand', '📏', `Son ölçüm ${Math.floor((now - lastG.ts) / DAY)} gün önce`, 'Güncel kilo ve boy ölçümü eklemek, beslenme önerilerinin doğruluğunu artırır.', 'hub/growth');
  for (const [metric, name] of [['weight', 'Kilo'], ['height', 'Boy'], ['head', 'Baş çevresi']]) {
    const g = metric === 'weight' ? w : latestGrowth(metric);
    if (!g || g.birth) continue;
    if (g.pct < 3 || g.pct > 97) add(72, 'warn', '📈', `${name} ${g.pct < 3 ? '3. persentilin altında' : '97. persentilin üzerinde'}`, 'Tek bir ölçüm yanıltıcı olabilir; önemli olan eğilimdir. Ölçümü tekrarlayıp doktorunuzla değerlendirin.', 'hub/growth');
    else if (g.prev && g.prevPct - g.pct > 25 && g.ts - g.prev.ts > 14 * DAY) add(70, 'warn', '📉', `${name} persentili düştü (${Math.round(g.prevPct)} → ${Math.round(g.pct)})`, 'İki ana persentil çizgisini aşan düşüşler doktor değerlendirmesi gerektirir. Beslenme kayıtlarını randevuda paylaşın.', 'hub/growth');
    else if (metric === 'weight') add(10, 'ok', '📈', `Kilo ${Math.round(g.pct)}. persentilde`, 'Sağlıklı aralıkta (3-97). Kendi eğrisini takip etmesi en önemli göstergedir.', 'hub/growth');
  }

  // --- Aşı ve kontroller ---
  const vs = vaccineList().filter((v) => !v.opt);
  const od = vs.filter((v) => v.state === 'overdue');
  if (od.length) add(74, 'warn', '💉', `${od.length} aşı gecikmiş görünüyor`, `${od.slice(0, 3).map((v) => `${v.name} ${v.dose}`).join(', ')}. Yapıldıysa işaretleyin; yapılmadıysa aile hekiminizden randevu alın.`, 'hub/vaccines');
  const soon = vs.filter((v) => v.state === 'soon');
  if (soon.length) add(54, 'brand', '💉', `Yaklaşan aşı: ${soon[0].name}`, `${soon.length > 1 ? `${soon.length} aşı · ` : ''}Planlanan tarih ${inDays(soon[0].due)}. Aşı günü bebek sağlıklı olmalı; ateş için doktorunuzun önerisini önceden sorun.`, 'hub/vaccines');
  const ck = nextCheckup();
  if (ck.upcoming && ck.upcoming.ts - now < 7 * DAY) add(52, 'brand', '🩺', `Doktor randevusu ${inDays(ck.upcoming.ts)}`, `${ck.upcoming.title || 'Kontrol'}${ck.upcoming.doctor ? ' · ' + ck.upcoming.doctor : ''}. Sorularınızı önceden not alın, Doktor Raporu’nu hazırlayın.`, 'hub/visits');
  else if (ck.rec && ck.rec.ts - now < 14 * DAY) add(36, 'brand', '🩺', `${ck.rec.name} zamanı`, `Odak: ${ck.rec.focus}. Randevuyu Doktor Kontrolleri’ne ekleyebilirsiniz.`, 'hub/visits');

  // --- Takviyeler ---
  const supps = mine('supps').filter((s) => s.active !== false);
  const has = (n) => supps.some((s) => trLower(s.name).includes(n));
  if (mo < 12 && !has('d vit') && !has('d3')) add(48, 'brand', '💧', 'D vitamini takibi ekleyin', 'Doğumdan itibaren en az 1 yaşa kadar her gün 400 IU (3 damla) D vitamini önerilir.', 'hub/supps');
  if (mo >= 4 && mo < 12 && !has('demir')) add(46, 'brand', '🩸', 'Demir desteğini doktorunuza sorun', 'Sağlık Bakanlığı programında 4-12. aylar arasında koruyucu demir damlası verilir.', 'hub/supps');
  const ad = suppAdherence(7);
  (ad || []).filter((x) => x.pct < 70 && x.span >= 3).forEach((x) => add(44, 'warn', '💧', `${x.name}: son 7 günde %${x.pct} düzen`, 'Takviyeyi günlük bir rutine (örn. sabah bez değişimi) bağlamak unutmayı azaltır.', 'hub/supps'));
  const pending = suppToday().filter((s) => s.given < (s.perDay || 1));
  if (pending.length && new Date().getHours() >= 17) add(42, 'brand', '💧', `Bugün verilmedi: ${pending.map((s) => s.name).join(', ')}`, 'Ana ekrandaki takviye düğmesine dokunarak tek adımda işaretleyebilirsiniz.', 'home');

  // --- Ek gıda ve alerji ---
  const solids = recs('solid'), tried = foodsTried(), names = allergyNames();
  if (!solids.length) {
    if (cmo >= 5.5 && cmo < 6) add(34, 'brand', '🥣', 'Ek gıdaya hazırlık zamanı', 'Destekle oturma, baş kontrolü ve yiyeceğe ilgi hazır olma işaretleridir. Ek Gıda rehberindeki başlangıç planına göz atın.', 'hub/solids');
    else if (cmo >= 6) add(59, 'warn', '🥣', 'Ek gıdaya başlama zamanı geldi', '6. aydan sonra anne sütü tek başına demir ve enerji ihtiyacını karşılamaz. Rehberi ve yaşına uygun tarifleri inceleyin.', 'hub/solids');
  } else {
    const firstSolid = solids[solids.length - 1].ts;
    if (mo < 12 && [...tried.keys()].some((k) => k === 'bal')) add(96, 'bad', '🍯', '1 yaşından önce bal verilmemeli', 'Bal, bebek botulizmine neden olabilir. Kabızlık, emmede zayıflık, gevşeklik görürseniz acilen doktora başvurun.', 'hub/solids');
    const hit = [...tried.values()].find((f) => f.last > now - 3 * DAY && names.some((n) => f.key.includes(n) || (f.info?.al && trLower(ALLERGENS[f.info.al]).includes(n))));
    if (hit) add(94, 'bad', '⚠️', `${hit.n} alerji listenizle çakışıyor`, 'Kayıtlı bir alerjenle eşleşen besin verilmiş görünüyor. Reaksiyon belirtilerini izleyin.', 'hub/allergies');
    const react = solids.find((r) => r.react === 'reaction' && now - r.ts < 7 * DAY);
    if (react) add(79, 'warn', '⚠️', `Reaksiyon: ${(react.foods || []).join(', ')}`, 'Bu besini tekrar vermeden önce doktorunuza danışın ve Alerjiler bölümüne kaydedin. Dudak/yüz şişmesi, nefes darlığı olursa 112.', 'hub/allergies');
    const fresh = [...tried.values()].filter((f) => now - f.first < 3 * DAY);
    if (fresh.length) add(45, 'solid', '🔎', `3 gün kuralı: ${fresh.map((f) => f.n).join(', ')}`, 'Yeni besin gözlem sürecinde. Döküntü, kusma, ishal veya huzursuzluk olursa not alın; bu sürede başka yeni besin eklemeyin.', 'hub/solids');
    if (now - firstSolid > 14 * DAY) {
      const iron = ['kırmızı et', 'tavuk', 'hindi', 'yumurta sarısı', 'yumurta (tam)', 'kırmızı mercimek', 'yeşil mercimek', 'ciğer', 'balık'];
      if (!iron.some((k) => tried.has(k))) add(53, 'warn', '🥩', 'Demirden zengin besin ekleyin', '6. aydan sonra demir depoları azalır. Et, yumurta sarısı ve mercimek en iyi kaynaklardır; C vitaminiyle (limon, meyve) birlikte verin.', 'hub/recipes');
    }
    if (mo >= 7 && now - firstSolid > 21 * DAY) {
      const ex = allergenExposure();
      const missing = ['yumurta', 'fistik', 'sut', 'balik'].filter((k) => !ex[k] && !names.some((n) => trLower(ALLERGENS[k]).includes(n)));
      if (missing.length) add(43, 'brand', '🥜', `Henüz tanışılmayan alerjenler: ${missing.map((k) => ALLERGENS[k]).join(', ')}`, 'Güncel öneri, alerjen besinleri geciktirmeden (4-11. aylar arasında) küçük miktarlarla tanıştırıp düzenli sürdürmektir. Ağır egzama varsa önce doktorunuza danışın.', 'hub/solids');
      const stale = Object.entries(ex).filter(([k, v]) => ['yumurta', 'fistik'].includes(k) && now - v.last > 14 * DAY);
      if (stale.length) add(30, 'brand', '🔁', `${stale.map(([k]) => ALLERGENS[k]).join(', ')}: düzenli sürdürün`, 'Tolere edilen alerjen besinleri haftada 2-3 kez vermeye devam etmek toleransı korur.', 'hub/solids');
    }
    const early = [...tried.values()].find((f) => f.info && f.info.m > mo + 0.5 && f.last > now - 7 * DAY);
    if (early) add(41, 'warn', '⏳', `${early.n} için biraz erken olabilir`, `Genellikle ${early.info.m}. aydan sonra önerilir.${early.info.t ? ' ' + early.info.t : ''}`, 'hub/solids');
    if (tried.size >= 5) add(8, 'ok', '🌈', `${tried.size} farklı besin denendi`, 'Çeşitlilik, seçici yeme riskini azaltır. Reddedilen besinleri 8-10 kez farklı şekillerde sunmayı deneyin.', 'hub/solids');
  }

  // --- Gelişim ---
  const lp = leapInfo();
  if (lp.current) add(47, 'play', '⚡', `Gelişim atağı: ${lp.current.name}`, `${lp.current.signs} ${lp.current.help}`, 'hub/leaps');
  else if (lp.next && lp.nextInDays <= 7) add(26, 'play', '⚡', `${lp.nextInDays} gün içinde gelişim atağı bekleniyor`, `${lp.next.name}: huzursuzluk ve uyku değişimi olabilir.`, 'hub/leaps');
  if (lp.spurt) add(28, 'feed', '🌱', `Büyüme atağı dönemi (${lp.spurt[2]})`, 'Birkaç gün daha sık beslenmek isteyebilir (küme emme). İsteğe göre besleyin; süt üretimi buna uyum sağlar.');
  const ms = per('milestones');
  const groups = MILESTONES.filter((g) => g.m <= cmo);
  const cur = groups[groups.length - 1];
  if (cur) {
    const miss = cur.items.filter((_, i) => !ms[`${cur.m}-${i}`]).length;
    if (miss && cmo >= cur.m + 2) add(49, 'warn', '🧩', `${cur.m}. ay basamaklarından ${miss} tanesi işaretlenmemiş`, 'Her çocuk kendi hızında gelişir; yine de işaretlenmeyen basamakları bir sonraki kontrolde doktorunuzla paylaşın.', 'hub/milestones');
    else if (miss) add(20, 'play', '🧩', `${cur.m}. ay gelişim basamaklarını gözden geçirin`, `${cur.items.length - miss}/${cur.items.length} tamamlandı.`, 'hub/milestones');
  }
  if (mo < 6 && a.totalDays > 14) {
    const tum = between(now - 3 * DAY, now, 'activity').filter((r) => r.kind === 'Karın üstü');
    if (!tum.length) add(22, 'play', '🤸', 'Karın üstü zamanı', `Uyanıkken ve gözetimde, günde toplam ${mo < 3 ? '15-30' : '45-60'} dakika karın üstü zaman boyun ve omuz kaslarını güçlendirir.`, 'hub/play');
  }
  const teeth = Object.keys(per('teeth')).length;
  if (teeth > 0) {
    const brush = between(now - 2 * DAY, now, 'care').some((r) => r.kind === 'Diş fırçalama');
    if (!brush) add(18, 'care', '🦷', 'Diş fırçalama rutini', `${teeth} dişi var. Günde 2 kez, pirinç tanesi kadar florürlü macunla fırçalayın.`, 'hub/teeth');
  }

  if (!out.some((x) => x.c === 'bad' || x.c === 'warn')) add(5, 'ok', '✨', 'Her şey yolunda görünüyor', 'Kayıtlarda dikkat gerektiren bir durum yok. Harika gidiyorsunuz!');
  return out.sort((x, y) => y.pri - x.pri);
}
