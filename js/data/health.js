// Sağlık bilgi tabanı: aşılar, izlemler, WHO büyüme standartları, dişler, takviyeler, acil rehber

// T.C. Sağlık Bakanlığı Çocukluk Dönemi Aşı Takvimi (ay cinsinden) + isteğe bağlı aşılar.
// Takvim zamanla güncellenebilir; aile hekimi ile doğrulanmalıdır.
export const VACCINES = [
  { id: 'hepb1', m: 0, name: 'Hepatit B', dose: '1. doz', about: 'Doğumdan sonraki ilk 72 saat içinde.' },
  { id: 'hepb2', m: 1, name: 'Hepatit B', dose: '2. doz' },
  { id: 'bcg', m: 2, name: 'BCG (Verem)', dose: 'Tek doz', about: 'Sol omuza uygulanır; haftalar içinde küçük bir kabarcık/yara oluşması beklenir.' },
  { id: 'kpa1', m: 2, name: 'KPA (Zatürre / Pnömokok)', dose: '1. doz' },
  { id: 'bes1', m: 2, name: '5’li Karma (DaBT-İPA-Hib)', dose: '1. doz', about: 'Difteri, boğmaca, tetanos, çocuk felci ve Hib.' },
  { id: 'kpa2', m: 4, name: 'KPA (Zatürre / Pnömokok)', dose: '2. doz' },
  { id: 'bes2', m: 4, name: '5’li Karma (DaBT-İPA-Hib)', dose: '2. doz' },
  { id: 'hepb3', m: 6, name: 'Hepatit B', dose: '3. doz' },
  { id: 'bes3', m: 6, name: '5’li Karma (DaBT-İPA-Hib)', dose: '3. doz' },
  { id: 'opa1', m: 6, name: 'OPA (Ağızdan Çocuk Felci)', dose: '1. doz' },
  { id: 'kpa3', m: 12, name: 'KPA (Zatürre / Pnömokok)', dose: 'Pekiştirme' },
  { id: 'kkk1', m: 12, name: 'KKK (Kızamık-Kızamıkçık-Kabakulak)', dose: '1. doz' },
  { id: 'sucicegi', m: 12, name: 'Suçiçeği', dose: 'Tek doz' },
  { id: 'bes4', m: 18, name: '5’li Karma (DaBT-İPA-Hib)', dose: 'Pekiştirme' },
  { id: 'opa2', m: 18, name: 'OPA (Ağızdan Çocuk Felci)', dose: '2. doz' },
  { id: 'hepa1', m: 18, name: 'Hepatit A', dose: '1. doz' },
  { id: 'hepa2', m: 24, name: 'Hepatit A', dose: '2. doz' },
  { id: 'kkk2', m: 48, name: 'KKK', dose: '2. doz' },
  { id: 'dort', m: 48, name: '4’lü Karma (DaBT-İPA)', dose: 'Pekiştirme' },
  // İsteğe bağlı (özel) aşılar — doktorunuza danışın
  { id: 'rota1', m: 2, name: 'Rotavirüs', dose: '1. doz', opt: true, about: 'Ağızdan damla. İlk doz en geç 15. haftada başlanmalıdır.' },
  { id: 'rota2', m: 4, name: 'Rotavirüs', dose: '2. doz', opt: true },
  { id: 'rota3', m: 6, name: 'Rotavirüs', dose: '3. doz (markaya göre)', opt: true },
  { id: 'menb1', m: 3, name: 'Meningokok B', dose: '1. doz', opt: true },
  { id: 'menb2', m: 5, name: 'Meningokok B', dose: '2. doz', opt: true },
  { id: 'menb3', m: 13, name: 'Meningokok B', dose: 'Pekiştirme', opt: true },
  { id: 'menacwy1', m: 9, name: 'Meningokok ACWY', dose: '1. doz', opt: true },
  { id: 'menacwy2', m: 12, name: 'Meningokok ACWY', dose: '2. doz', opt: true },
  { id: 'grip', m: 6, name: 'Grip (İnfluenza)', dose: 'Her sonbahar', opt: true, about: '6 aydan itibaren, ilk yıl 4 hafta arayla 2 doz.' },
];

// Sağlam çocuk izlemleri (ay)
export const CHECKUPS = [
  { m: 0.5, name: '15. gün kontrolü', focus: 'Kilo alımı, sarılık, göbek, emzirme değerlendirmesi, topuk kanı sonucu' },
  { m: 1, name: '1. ay kontrolü', focus: 'Büyüme, kalça muayenesi, işitme taraması sonucu, D vitamini' },
  { m: 2, name: '2. ay kontrolü', focus: 'Aşılar, sosyal gülümseme, baş kontrolü, kalça USG' },
  { m: 4, name: '4. ay kontrolü', focus: 'Aşılar, demir profilaksisi başlangıcı, dönme, uyku düzeni' },
  { m: 6, name: '6. ay kontrolü', focus: 'Aşılar, ek gıdaya geçiş planı, destekli oturma, diş' },
  { m: 9, name: '9. ay kontrolü', focus: 'Kan sayımı (kansızlık taraması), emekleme, yabancı kaygısı, beslenme' },
  { m: 12, name: '12. ay kontrolü', focus: 'Aşılar, yürüme hazırlığı, ilk kelimeler, diş hekimi önerisi' },
  { m: 15, name: '15. ay kontrolü', focus: 'Yürüme, kelime dağarcığı, beslenme alışkanlıkları' },
  { m: 18, name: '18. ay kontrolü', focus: 'Aşılar, otizm taraması (M-CHAT), dil gelişimi' },
  { m: 24, name: '2 yaş kontrolü', focus: 'Aşı, iki kelimelik cümleler, tuvalet eğitimi hazırlığı' },
  { m: 30, name: '2,5 yaş kontrolü', focus: 'Dil, sosyal oyun, diş bakımı' },
  { m: 36, name: '3 yaş kontrolü', focus: 'Görme taraması, tansiyon, okul öncesi hazırlık' },
  { m: 48, name: '4 yaş kontrolü', focus: 'Aşılar, görme-işitme, okul olgunluğu' },
];

// WHO Çocuk Büyüme Standartları (LMS) — 0-24 ay aylık; 30-60 ay yaklaşık değerler
// [ay, L, M, S]
const W = {
  wM: [[0, .3487, 3.3464, .14602], [1, .2297, 4.4709, .13395], [2, .197, 5.5675, .12385], [3, .1738, 6.3762, .11727], [4, .1553, 7.0023, .11316], [5, .1395, 7.5105, .1108], [6, .1257, 7.934, .10958], [7, .1134, 8.297, .10902], [8, .1021, 8.6151, .10882], [9, .0917, 8.9014, .10881], [10, .082, 9.1649, .10891], [11, .073, 9.4122, .10906], [12, .0644, 9.6479, .10925], [13, .0563, 9.8749, .10949], [14, .0487, 10.0953, .10976], [15, .0413, 10.3108, .11007], [16, .0343, 10.5228, .11041], [17, .0275, 10.7319, .11079], [18, .0211, 10.9385, .11119], [19, .0148, 11.143, .11164], [20, .0087, 11.3462, .11211], [21, .0029, 11.5486, .11261], [22, -.0028, 11.7504, .11314], [23, -.0083, 11.9514, .11369], [24, -.0137, 12.1515, .11426], [30, -.04, 13.3, .117], [36, -.069, 14.34, .12], [48, -.1, 16.35, .127], [60, -.12, 18.34, .134]],
  wF: [[0, .3809, 3.2322, .14171], [1, .1714, 4.1873, .13724], [2, .0962, 5.1282, .13], [3, .0402, 5.8458, .12619], [4, -.005, 6.4237, .12402], [5, -.043, 6.8985, .12274], [6, -.0756, 7.297, .12204], [7, -.1039, 7.6422, .12178], [8, -.1288, 7.9487, .12181], [9, -.1507, 8.2254, .12199], [10, -.17, 8.48, .12223], [11, -.1872, 8.7192, .12247], [12, -.2024, 8.9481, .12268], [13, -.2158, 9.1699, .12283], [14, -.2278, 9.387, .12294], [15, -.2384, 9.6008, .12299], [16, -.2478, 9.8124, .12303], [17, -.2562, 10.0226, .12306], [18, -.2637, 10.2315, .12309], [19, -.2703, 10.4393, .12315], [20, -.2762, 10.6464, .12323], [21, -.2815, 10.8534, .12335], [22, -.2862, 11.0608, .1235], [23, -.2903, 11.2688, .12369], [24, -.2941, 11.4775, .1239], [30, -.31, 12.7, .127], [36, -.33, 13.9, .13], [48, -.35, 16.1, .139], [60, -.35, 18.2, .147]],
  hM: [[0, 1, 49.8842, .03795], [1, 1, 54.7244, .03557], [2, 1, 58.4249, .03424], [3, 1, 61.4292, .03328], [4, 1, 63.886, .03257], [5, 1, 65.9026, .03204], [6, 1, 67.6236, .03165], [7, 1, 69.1645, .03139], [8, 1, 70.5994, .03124], [9, 1, 71.9687, .03117], [10, 1, 73.2812, .03118], [11, 1, 74.5388, .03125], [12, 1, 75.7488, .03137], [13, 1, 76.9186, .03154], [14, 1, 78.0497, .03174], [15, 1, 79.1458, .03197], [16, 1, 80.2113, .03222], [17, 1, 81.2487, .0325], [18, 1, 82.2587, .03279], [19, 1, 83.2418, .0331], [20, 1, 84.1996, .03342], [21, 1, 85.1348, .03376], [22, 1, 86.0477, .0341], [23, 1, 86.941, .03445], [24, 1, 87.8161, .03479], [30, 1, 91.9, .036], [36, 1, 96.1, .037], [48, 1, 103.3, .04], [60, 1, 110, .042]],
  hF: [[0, 1, 49.1477, .0379], [1, 1, 53.6872, .0364], [2, 1, 57.0673, .03568], [3, 1, 59.8029, .0352], [4, 1, 62.0899, .03486], [5, 1, 64.0301, .03463], [6, 1, 65.7311, .03448], [7, 1, 67.2873, .03441], [8, 1, 68.7498, .0344], [9, 1, 70.1435, .03444], [10, 1, 71.4818, .03452], [11, 1, 72.771, .03464], [12, 1, 74.015, .03479], [13, 1, 75.2176, .03496], [14, 1, 76.3817, .03514], [15, 1, 77.5099, .03534], [16, 1, 78.6055, .03555], [17, 1, 79.671, .03576], [18, 1, 80.7079, .03598], [19, 1, 81.7182, .0362], [20, 1, 82.7036, .03643], [21, 1, 83.6654, .03666], [22, 1, 84.604, .03688], [23, 1, 85.5202, .03711], [24, 1, 86.4153, .03734], [30, 1, 90.7, .038], [36, 1, 95.1, .039], [48, 1, 102.7, .042], [60, 1, 109.4, .044]],
  cM: [[0, 1, 34.4618, .03686], [1, 1, 37.2759, .03133], [2, 1, 39.1285, .02997], [3, 1, 40.5135, .02918], [4, 1, 41.6317, .02868], [5, 1, 42.5576, .02837], [6, 1, 43.3306, .02817], [7, 1, 43.9803, .02804], [8, 1, 44.53, .02796], [9, 1, 44.9998, .02792], [10, 1, 45.4051, .0279], [11, 1, 45.7573, .02789], [12, 1, 46.0661, .02789], [13, 1, 46.3395, .02789], [14, 1, 46.5844, .02791], [15, 1, 46.806, .02792], [16, 1, 47.0088, .02795], [17, 1, 47.1962, .02797], [18, 1, 47.3711, .028], [19, 1, 47.5357, .02803], [20, 1, 47.6919, .02806], [21, 1, 47.8408, .0281], [22, 1, 47.9833, .02813], [23, 1, 48.1201, .02817], [24, 1, 48.2515, .02821], [36, 1, 49.5, .0285], [48, 1, 50.2, .0288], [60, 1, 50.7, .029]],
  cF: [[0, 1, 33.8787, .03496], [1, 1, 36.5463, .0321], [2, 1, 38.2521, .03168], [3, 1, 39.5328, .0314], [4, 1, 40.5817, .03119], [5, 1, 41.459, .03102], [6, 1, 42.1995, .03087], [7, 1, 42.829, .03075], [8, 1, 43.3671, .03063], [9, 1, 43.83, .03053], [10, 1, 44.2319, .03044], [11, 1, 44.5844, .03035], [12, 1, 44.8965, .03027], [13, 1, 45.1752, .03019], [14, 1, 45.4265, .03012], [15, 1, 45.6551, .03006], [16, 1, 45.865, .02999], [17, 1, 46.0598, .02993], [18, 1, 46.2424, .02987], [19, 1, 46.4152, .02982], [20, 1, 46.5801, .02977], [21, 1, 46.7384, .02972], [22, 1, 46.8913, .02967], [23, 1, 47.0391, .02962], [24, 1, 47.1822, .02957], [36, 1, 48.5, .0297], [48, 1, 49.3, .0298], [60, 1, 49.9, .03]],
};
const key = (metric, gender) => ({ weight: 'w', height: 'h', head: 'c' }[metric]) + (gender === 'F' ? 'F' : 'M');

export function lms(metric, gender, months) {
  const t = W[key(metric, gender)];
  const m = Math.max(0, Math.min(60, months));
  let i = 0;
  while (i < t.length - 2 && t[i + 1][0] <= m) i++;
  const a = t[i], b = t[i + 1];
  const f = Math.max(0, Math.min(1, (m - a[0]) / (b[0] - a[0])));
  return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
}
export function zScore(metric, gender, months, value) {
  const [L, M, S] = lms(metric, gender, months);
  return Math.abs(L) < 1e-6 ? Math.log(value / M) / S : (Math.pow(value / M, L) - 1) / (L * S);
}
export function valueAtZ(metric, gender, months, z) {
  const [L, M, S] = lms(metric, gender, months);
  return Math.abs(L) < 1e-6 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}
// Standart normal dağılım -> persentil
export function zToPct(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.max(0.1, Math.min(99.9, (z > 0 ? 1 - p : p) * 100));
}
export const percentile = (metric, gender, months, value) => zToPct(zScore(metric, gender, months, value));
export const PCT_LINES = [[-1.881, '3'], [-1.036, '15'], [0, '50'], [1.036, '85'], [1.881, '97']];

// Süt dişleri (FDI numaraları) ve ortalama çıkış ayları
export const TEETH = [
  { id: 55, n: 'Üst sağ 2. azı', a: [25, 33] }, { id: 54, n: 'Üst sağ 1. azı', a: [13, 19] }, { id: 53, n: 'Üst sağ köpek', a: [16, 22] }, { id: 52, n: 'Üst sağ yan kesici', a: [9, 13] }, { id: 51, n: 'Üst sağ ön kesici', a: [8, 12] },
  { id: 61, n: 'Üst sol ön kesici', a: [8, 12] }, { id: 62, n: 'Üst sol yan kesici', a: [9, 13] }, { id: 63, n: 'Üst sol köpek', a: [16, 22] }, { id: 64, n: 'Üst sol 1. azı', a: [13, 19] }, { id: 65, n: 'Üst sol 2. azı', a: [25, 33] },
  { id: 85, n: 'Alt sağ 2. azı', a: [23, 31] }, { id: 84, n: 'Alt sağ 1. azı', a: [14, 18] }, { id: 83, n: 'Alt sağ köpek', a: [17, 23] }, { id: 82, n: 'Alt sağ yan kesici', a: [10, 16] }, { id: 81, n: 'Alt sağ ön kesici', a: [6, 10] },
  { id: 71, n: 'Alt sol ön kesici', a: [6, 10] }, { id: 72, n: 'Alt sol yan kesici', a: [10, 16] }, { id: 73, n: 'Alt sol köpek', a: [17, 23] }, { id: 74, n: 'Alt sol 1. azı', a: [14, 18] }, { id: 75, n: 'Alt sol 2. azı', a: [23, 31] },
];

// Önerilen takviye şablonları (doz mutlaka doktora danışılmalı)
export const SUPP_PRESETS = [
  { name: 'D Vitamini', dose: '3 damla (400 IU)', perDay: 1, from: 0, to: 12, why: 'Sağlık Bakanlığı programı: doğumdan itibaren en az 1 yaşa kadar her gün 400 IU.' },
  { name: 'Demir', dose: 'Doktorun önerdiği damla', perDay: 1, from: 4, to: 12, why: 'Sağlık Bakanlığı programı: 4.-12. aylar arasında koruyucu demir desteği (prematürelerde daha erken).' },
  { name: 'Probiyotik', dose: '5 damla', perDay: 1, from: 0, to: 60, why: 'Yalnızca doktor önerisiyle (kolik, antibiyotik sonrası vb.).' },
  { name: 'Omega-3 (DHA)', dose: 'Doktorun önerdiği miktar', perDay: 1, from: 6, to: 60, why: 'Balık tüketimi yetersizse doktor önerisiyle.' },
];

export const SYMPTOMS = ['Öksürük', 'Burun akıntısı', 'Burun tıkanıklığı', 'Kusma', 'İshal', 'Kabızlık', 'Döküntü', 'Gaz / kolik', 'Huzursuzluk', 'İştahsızlık', 'Diş kaşıntısı', 'Kulak çekiştirme', 'Hırıltı', 'Pişik', 'Göz çapaklanması'];

// Ateş değerlendirmesi (yaş ay, derece °C) -> {level, text}
export function feverAdvice(months, c) {
  if (c == null) return null;
  if (c < 35.5) return { level: 'bad', text: 'Vücut ısısı düşük görünüyor. Ölçümü tekrarlayın, bebeği ısıtın; düşük kalırsa doktora başvurun.' };
  if (c < 37.5) return { level: 'ok', text: 'Normal vücut ısısı.' };
  if (c < 38) return { level: 'warn', text: 'Hafif yükseklik (subfebril). İnce giydirin, sıvı verin ve 30-60 dk sonra tekrar ölçün.' };
  if (months < 3) return { level: 'bad', text: '3 aydan küçük bebekte 38°C ve üzeri ateş ACİL bir durumdur. Hemen doktora / acile başvurun.' };
  if (months < 6 && c >= 38.5) return { level: 'bad', text: '3-6 ay arası bebekte 38,5°C üzeri ateş için aynı gün doktora başvurun.' };
  if (c >= 39.5) return { level: 'bad', text: 'Yüksek ateş. Doktorunuzun önerdiği ateş düşürücüyü verin, ılık uygulama yapın ve doktorunuzu arayın. 40°C ve üzerinde veya düşmüyorsa acile başvurun.' };
  return { level: 'warn', text: 'Ateş var. İnce giydirin, bol sıvı verin; huzursuzsa doktorunuzun önerdiği dozda ateş düşürücü kullanın. 48 saatten uzun sürerse doktora başvurun.' };
}

export const EMERGENCY = [
  { t: 'Hemen 112’yi arayın', c: 'bad', items: ['Nefes almakta zorlanma, morarma, inleme veya göğüs çekilmesi', 'Bilinç bulanıklığı, uyandırılamama, aşırı gevşeklik', 'Havale (nöbet) geçirme', 'Boğulma — nefes alamıyor, ses çıkaramıyor', 'Yüz-dudak-dil şişmesi, yaygın kurdeşen + hırıltı (anafilaksi)', 'Kafa travması sonrası kusma, uykuya meyil veya bilinç değişikliği', 'Zehirlenme şüphesi (ilaç, temizlik maddesi, pil yutma) — 114 Zehir Danışma'] },
  { t: 'Aynı gün doktora başvurun', c: 'warn', items: ['3 aydan küçük bebekte 38°C ve üzeri ateş', 'Beslenmeyi reddetme, 8 saatten uzun süre ıslak bez olmaması', 'Bıngıldağın çökük ya da belirgin kabarık olması', 'Tekrarlayan fışkırır tarzda kusma, yeşil (safralı) kusma', 'Kanlı kaka veya kanlı kusma', 'Basmakla solmayan mor-kırmızı döküntü', '48 saatten uzun süren ateş', 'Durdurulamayan, tiz sesli ağlama; kulak akıntısı', 'Yenidoğanda artan sarılık (karın ve bacaklara yayılan)'] },
  { t: 'Randevu alıp danışın', c: 'brand', items: ['İki ölçüm arasında kilo alamama veya persentil kaybı', '1 haftadan uzun süren öksürük / burun akıntısı', 'Yeni besin sonrası tekrarlayan döküntü, kusma, ishal', 'İnatçı pişik, ağızda beyaz plaklar (pamukçuk)', 'Yaşına göre beklenen gelişim basamaklarında gecikme veya kazanılmış becerinin kaybı', 'Uyurken horlama, nefes durmaları'] },
];

export const CARE_KINDS = ['Krem', 'Banyo', 'Tırnak', 'Burun temizliği', 'Diş fırçalama', 'Masaj', 'Güneş kremi', 'Göbek bakımı', 'Saç / konak'];
export const PRODUCT_TYPES = ['Pişik kremi', 'Nemlendirici', 'Güneş kremi', 'Şampuan / yıkama', 'Islak mendil', 'Bez', 'Mama', 'İlaç', 'Diğer'];

export const CARE_GUIDE = [
  { t: 'Pişik', i: '🧷', tx: 'Bezi sık değiştirin, her değişimde bölgeyi ılık suyla temizleyip **tamamen kurulayın**. Çinko oksitli bariyer kremini kalın bir tabaka halinde sürün; günde birkaç kez bezsiz hava aldırın. 3 günde düzelmeyen, kabarcıklı veya kıvrım yerlerinde parlak kırmızı pişikte mantar olabilir — doktora danışın.' },
  { t: 'Banyo', i: '🛁', tx: 'Göbek düşene kadar silme banyo. Sonrasında haftada 2-3 banyo yeterlidir; su 37°C, süre 5-10 dk. Banyoda bebeği **bir an bile yalnız bırakmayın**. Banyodan sonraki 3 dakika içinde parfümsüz nemlendirici cildi korur.' },
  { t: 'Güneş', i: '☀️', tx: '6 aydan küçük bebekler doğrudan güneşe çıkarılmaz; gölge, şapka ve ince uzun kollu giysi kullanılır. 6 aydan sonra mineral filtreli (çinko oksit / titanyum dioksit) SPF 30-50 krem, dışarı çıkmadan 15-30 dk önce sürülür ve 2 saatte bir yenilenir.' },
  { t: 'Tırnak', i: '✂️', tx: 'Bebek uyurken veya banyo sonrası tırnaklar yumuşakken, ucu yuvarlak bebek makasıyla düz kesin. El tırnakları haftada 1-2, ayak tırnakları ayda 1-2 kez.' },
  { t: 'Burun', i: '👃', tx: 'Tıkanıklıkta her burun deliğine serum fizyolojik damlatın, gerekirse aspiratörle nazikçe çekin (günde en fazla 3-4 kez). Beslenme ve uyku öncesi uygulamak rahatlatır.' },
  { t: 'Ağız ve diş', i: '🦷', tx: 'İlk dişle birlikte günde 2 kez, pirinç tanesi kadar florürlü (1000 ppm) macunla fırçalayın; 3 yaşından sonra bezelye tanesi kadar. Biberonla uyutmak çürük riskini artırır. İlk diş hekimi ziyareti 1 yaş civarı.' },
  { t: 'Konak', i: '🧴', tx: 'Saçlı derideki sarı kabuklar zararsızdır. Banyodan 15 dk önce bebek yağı sürüp yumuşak fırçayla nazikçe tarayın; kazımayın.' },
  { t: 'Güvenli uyku', i: '🛏️', tx: 'Bebeği **her uykuda sırtüstü** yatırın. Sert, düz yatak; yastık, yorgan, oyuncak ve yan koruma yok. İlk 6 ay ebeveynle aynı oda, ayrı yatak. Oda 20-22°C; aşırı giydirmeyin, sigara dumanından uzak tutun.' },
];
