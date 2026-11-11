// Yapay zekâ asistanı: bebeğin verilerinden bağlam üretir, Claude API ile akışlı (streaming) konuşur.
// API anahtarı yoksa yerleşik analiz motoruyla çevrimdışı yanıt verir.
import { db, baby, recs, between, mine, per, correctedMonths } from './store.js';
import { age, rangeStats, weekAvg, nextSleep, latestGrowth, vaccineList, nextCheckup, foodsTried, leapInfo, status, allergyNames } from './calc.js';
import { TYPES, summary } from './types.js';
import { predictSleep } from './predict.js';
import { insights } from './insights.js';
import { DAY, HOUR, MIN, fmtDate, fmtTime, fmtDur, fmtNum, round1, dayKey, trLower } from './util.js';
import { feedNorm, RECIPES, RECIPE_KINDS, ALLERGENS, solidStageFor } from './data/nutrition.js';
import { MILESTONES, playGuideFor, SLEEP_TIPS } from './data/development.js';

export const MODELS = [['claude-opus-5-5', 'Claude Opus 5.5 (önerilen)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (hızlı, ekonomik)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (en hızlı)']];
export const hasKey = () => !!(db.settings.apiKey || db.settings.apiBase);

const SYSTEM = `Sen "Pıtır Asistan"sın: bir bebek takip uygulamasının içinde çalışan, ebeveynlere eşlik eden uzman yardımcısın. Aynı anda dört uzmanın bakışını birleştirirsin:
- Çocuk sağlığı ve hastalıkları uzmanı (pediatrist): büyüme, aşı, ateş, hastalık belirtileri, takviyeler
- Çocuk gelişimi uzmanı / çocuk psikoloğu: bağlanma, uyku, gelişim basamakları, davranış, ebeveyn iyi oluşu
- Çocuk diyetisyeni: emzirme, mama, ek gıdaya geçiş, öğün planı, alerjen tanıştırma
- Gıda mühendisi: gıda güvenliği, hazırlama-saklama-ısıtma, etiket okuma, katkı maddeleri

Nasıl yanıt verirsin:
- Türkçe, sıcak ama net konuş. Yorgun bir ebeveynin telefonda okuyacağını düşün: önce doğrudan cevap, sonra kısa gerekçe ve uygulanabilir adımlar. Gereksiz uzatma.
- Aşağıdaki "BEBEK VERİLERİ" bölümünü kullan: önerilerini bebeğin yaşına, kilosuna, kayıtlarına ve alerjilerine göre kişiselleştir, somut sayılara atıf yap. Veri eksikse hangi kaydın işe yarayacağını söyle.
- Güncel kanıta dayalı kılavuzlara (DSÖ, T.C. Sağlık Bakanlığı, AAP, ESPGHAN) uygun öner. Emin olmadığın konuda bunu açıkça söyle.
- Tanı koymazsın ve reçete yazmazsın. İlaç dozlarını hesaplama; doz için doktora/eczacıya yönlendir.
- Acil işaretlerde (3 aydan küçük bebekte 38°C+ ateş, solunum sıkıntısı, morarma, havale, bilinç değişikliği, susuzluk belirtileri, kanlı kaka/kusma, anafilaksi şüphesi) yanıtın en başında net biçimde 112'yi aramayı veya hemen doktora gitmeyi söyle.
- Tarif istenirse: bebeğin ayına uygun kıvam, malzemeler, adımlar, alerjen uyarısı, saklama koşulu ve besin değeri notu ver. Kayıtlı alerjenleri asla kullanma. 1 yaş altında tuz, şeker, bal ve inek sütü (içecek olarak) yok.
- Ebeveyni suçlama; kaygısını ciddiye al, başardıklarını fark et.
- Biçim: kısa paragraflar, gerektiğinde madde işaretleri ve **kalın** vurgular. Tablo kullanma.`;

// Bebeğin güncel durumunu modele verilecek kompakt metne çevirir
export function buildContext() {
  const b = baby(), a = age(), now = Date.now();
  const L = [];
  L.push(`Tarih-saat: ${fmtDate(now)} ${fmtTime(now)}`);
  L.push(`Bebek: ${b.name}, ${b.gender === 'F' ? 'kız' : 'erkek'}, doğum ${b.birth}, yaş ${a.text} (${a.totalDays} gün, ${a.weeks}. hafta)`);
  if (b.gestWeeks && b.gestWeeks < 37) L.push(`Prematüre: ${b.gestWeeks}. haftada doğdu; düzeltilmiş yaş ~${round1(correctedMonths())} ay`);
  if (b.bw) L.push(`Doğum: ${b.bw} kg${b.bh ? `, ${b.bh} cm` : ''}${b.bhc ? `, baş ${b.bhc} cm` : ''}`);
  if (b.blood) L.push(`Kan grubu: ${b.blood}`);
  if (b.feeding) L.push(`Beslenme şekli: ${b.feeding}`);
  for (const [m, n, u] of [['weight', 'Kilo', 'kg'], ['height', 'Boy', 'cm'], ['head', 'Baş çevresi', 'cm']]) {
    const g = latestGrowth(m);
    if (g && !g.birth) L.push(`${n}: ${fmtNum(g.v, 2)} ${u} (${fmtDate(g.ts)}, WHO ${Math.round(g.pct)}. persentil${g.prev ? `; önceki ${fmtNum(g.prev.v, 2)} ${u} ${fmtDate(g.prev.ts)}` : ''})`);
  }
  const al = mine('allergies');
  L.push(`Alerjiler: ${al.length ? al.map((x) => `${x.allergen} (${x.reaction || 'reaksiyon belirtilmedi'}${x.sev ? ', ' + x.sev : ''})`).join('; ') : 'kayıtlı alerji yok'}`);
  const st = status(), ns = nextSleep();
  L.push(`Şu an: ${st.asleep ? `uyuyor (${fmtDur(now - st.since)})` : st.since ? `uyanık (${fmtDur(now - st.since)})` : 'uyku kaydı yok'}`);
  L.push(`Yaş normu — uyku: toplam ${ns.norm.total.join('-')} sa/gün, uyanıklık aralığı ${ns.norm.wake.join('-')} dk, gündüz uykusu ${ns.norm.naps.join('-')} adet`);
  const fn = feedNorm(a.exactMonths, latestGrowth('weight')?.v);
  L.push(`Yaş normu — beslenme: ${fn.text}`);
  const ps = predictSleep();
  if (!ps.empty) {
    const m = ps.model, hm = (x) => `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(Math.round(x % 60)).padStart(2, '0')}`;
    if (m.samples.days >= 3 && !m.newborn) L.push(`Öğrenilen uyku düzeni (son ${m.samples.days} gün): sabah uyanış ~${hm(m.wakeClock)}, günde ${m.typicalN} gündüz uykusu, yatış ~${hm(m.bedClock)}`);
    const up = ps.plan.filter((p) => !p.done && p.kind !== 'wake').map((p) => `${p.kind === 'night' ? 'gece uykusu' : (p.idx + 1) + '. gündüz uykusu'} ${p.live ? '(sürüyor, tahmini uyanış ' + fmtTime(p.end) + ')' : '≈ ' + fmtTime(p.start)}`);
    if (up.length) L.push(`Uygulamanın bugünkü uyku tahmini: ${up.join('; ')}${ps.state ? ` (durum: ${{ early: 'henüz erken', soon: 'yaklaşıyor', now: 'pencere açık', late: 'gecikti' }[ps.state]})` : ''}`);
  }

  L.push('\nSON 7 GÜN (günlük özet):');
  for (const d of rangeStats(7)) {
    if (!(d.feeds || d.sleepMs || d.diapers || d.solidN)) continue;
    L.push(`- ${dayKey(d.day)}: uyku ${round1(d.sleepMs / HOUR)} sa (gece ${round1(d.nightMs / HOUR)}, gündüz ${round1(d.napMs / HOUR)} sa / ${d.naps} uyku); emzirme ${d.breastN}x${d.breastMin ? ` ${d.breastMin} dk` : ''}; biberon ${d.bottleN}x ${d.bottleMl} ml; ek gıda ${d.solidN} öğün; bez ${d.wet} ıslak ${d.dirty} kirli${d.maxTemp ? `; en yüksek ateş ${d.maxTemp}°C` : ''}`);
  }
  const recent = between(now - 36 * HOUR, now).slice(0, 40).reverse();
  if (recent.length) {
    L.push('\nSON 36 SAAT KAYITLARI:');
    recent.forEach((r) => L.push(`- ${dayKey(r.ts).slice(5)} ${fmtTime(r.ts)} ${TYPES[r.type]?.l}: ${summary(r)}${r.note ? ` — not: ${r.note}` : ''}`));
  }
  const health = recs(['temp', 'med', 'symptom']).filter((r) => r.ts > now - 14 * DAY && r.ts < now - 36 * HOUR).slice(0, 15);
  if (health.length) { L.push('\nSON 14 GÜN SAĞLIK KAYITLARI:'); health.forEach((r) => L.push(`- ${dayKey(r.ts)} ${TYPES[r.type].l}: ${summary(r)}`)); }

  const tried = [...foodsTried().values()];
  if (tried.length) L.push(`\nDenenen besinler (${tried.length}): ${tried.map((f) => `${f.n}${f.reactions ? ' [REAKSİYON]' : f.no > f.loved ? ' [sevmedi]' : ''}`).join(', ')}`);
  else if (a.exactMonths >= 5) L.push('\nEk gıda: henüz kayıt yok');
  const supps = mine('supps').filter((s) => s.active !== false);
  L.push(`Takviyeler: ${supps.length ? supps.map((s) => `${s.name} ${s.dose || ''}`).join(', ') : 'tanımlı takviye yok'}`);
  const vs = vaccineList().filter((v) => !v.opt);
  const od = vs.filter((v) => v.state === 'overdue'), soon = vs.filter((v) => v.state === 'soon');
  L.push(`Aşılar: ${vs.filter((v) => v.state === 'done').length}/${vs.length} yapıldı${od.length ? `; gecikmiş: ${od.map((v) => v.name + ' ' + v.dose).join(', ')}` : ''}${soon.length ? `; yaklaşan: ${soon.map((v) => `${v.name} ${v.dose} (${fmtDate(v.due)})`).join(', ')}` : ''}`);
  const ck = nextCheckup();
  if (ck.upcoming) L.push(`Yaklaşan randevu: ${ck.upcoming.title || 'Kontrol'} ${ck.upcoming.date}`);
  const teeth = Object.keys(per('teeth')).length; if (teeth) L.push(`Çıkan diş sayısı: ${teeth}`);
  const ms = per('milestones'), cmo = correctedMonths();
  const g = MILESTONES.filter((x) => x.m <= cmo).pop();
  if (g) { const miss = g.items.filter((_, i) => !ms[`${g.m}-${i}`]).map((x) => x[1]); L.push(`Gelişim (${g.m}. ay basamakları): ${g.items.length - miss.length}/${g.items.length} işaretli${miss.length ? `; işaretlenmeyenler: ${miss.join('; ')}` : ''}`); }
  const lp = leapInfo(); if (lp.current) L.push(`Gelişim atağı dönemi: ${lp.current.name}`);
  const ins = insights().filter((x) => x.c === 'bad' || x.c === 'warn').slice(0, 8);
  if (ins.length) { L.push('\nUYGULAMANIN OTOMATİK TESPİTLERİ:'); ins.forEach((x) => L.push(`- ${x.t}`)); }
  if (db.settings.parent) L.push(`\nEbeveynin adı: ${db.settings.parent}`);
  return L.join('\n');
}

// Claude Messages API — tarayıcıdan doğrudan, SSE akışı ile
export async function askClaude(history, onText, signal) {
  const s = db.settings;
  const base = (s.apiBase || 'https://api.anthropic.com').replace(/\/+$/, '');
  const headers = { 'content-type': 'application/json', 'anthropic-version': '2026-10-21', 'anthropic-beta': 'server-side-fallback-2026-07-01' };
  if (s.apiKey) { headers['x-api-key'] = s.apiKey; headers['anthropic-dangerous-direct-browser-access'] = 'true'; }
  const model = s.model || 'claude-opus-5-5';
  const body = {
    model, max_tokens: 16000, stream: true,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }, { type: 'text', text: `BEBEK VERİLERİ (uygulamadan otomatik):\n${buildContext()}` }],
    messages: history.map((m) => ({ role: m.role, content: m.text })),
  };
  // Güvenlik sınıflandırıcısı reddederse sunucu tarafında yedek modele geçiş (Haiku'da desteklenmez)
  if (!model.includes('haiku')) body.fallbacks = 'default';
  const res = await fetch(`${base}/v1/messages`, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error?.message || msg; } catch { /* yoksay */ }
    if (res.status === 401) throw new Error('API anahtarı geçersiz. Ayarlar’dan kontrol edin.');
    if (res.status === 429) throw new Error('İstek sınırına ulaşıldı. Biraz sonra tekrar deneyin.');
    if (res.status === 529 || res.status >= 500) throw new Error('Yapay zekâ servisi şu an yoğun. Lütfen tekrar deneyin.');
    throw new Error(msg);
  }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = '', full = '', stop = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { full += ev.delta.text; onText(full); }
      else if (ev.type === 'message_delta' && ev.delta?.stop_reason) stop = ev.delta.stop_reason;
      else if (ev.type === 'error') throw new Error(ev.error?.message || 'Akış hatası');
    }
  }
  if (stop === 'refusal' && !full) throw new Error('Asistan bu isteği yanıtlayamadı. Soruyu farklı biçimde sormayı deneyin.');
  if (stop === 'max_tokens') full += '\n\n*(Yanıt uzunluk sınırına ulaştı.)*';
  return full;
}

// --- Çevrimdışı yanıtlar (API anahtarı olmadan) ---
export function suitableRecipes(limit = 50) {
  const mo = age().exactMonths, names = allergyNames();
  const blocked = Object.entries(ALLERGENS).filter(([, label]) => names.some((n) => trLower(label).includes(n) || n.includes(trLower(label).split(' ')[0]))).map(([k]) => k);
  const tried = foodsTried();
  return RECIPES.filter((r) => r.m <= mo + 0.3 && !r.al.some((x) => blocked.includes(x)))
    .map((r) => ({ ...r, score: (r.m >= mo - 3 ? 2 : 0) + r.ing.filter((i) => [...tried.keys()].some((k) => trLower(i).includes(k))).length * 0.3 + ((new Date().getDate() * 7 + r.id.length * 13 + parseInt(r.id.slice(1), 10) * 5) % 10) / 10 }))
    .sort((x, y) => y.score - x.score).slice(0, limit);
}
const recipeMd = (r) => `#### ${r.n}\n*${RECIPE_KINDS[r.k]} · ${r.m}+ ay · ${r.t} dk${r.al.length ? ' · alerjen: ' + r.al.map((x) => ALLERGENS[x]).join(', ') : ''}*\n**Malzemeler:** ${r.ing.join(', ')}\n${r.st.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n**Besin notu:** ${r.nut}`;

export function localAnswer(q) {
  const b = baby(), a = age(), t = trLower(q);
  const foot = '\n\n---\n*Bu yanıt cihazınızdaki yerleşik analiz motoruyla üretildi. Serbest sorular ve kişiye özel ayrıntılı yanıtlar için Ayarlar → Yapay Zekâ bölümünden API anahtarı ekleyebilirsiniz.*';
  if (/tarif|yemek|menü|öğün|ne yedir|ne pişir/.test(t)) {
    if (a.exactMonths < 5.5) return `${b.name} şu an ${a.text}. İlk 6 ay yalnızca anne sütü (veya mama) önerilir; ek gıdaya 6. ay civarında, hazır olma işaretleriyle başlanır.\n\n${solidStageFor(a.exactMonths).points.map((p) => '- ' + p).join('\n')}${foot}`;
    const rs = suitableRecipes(3);
    return `${b.name} (${a.text}) için bugünün önerileri — kayıtlı alerjenler hariç tutuldu:\n\n${rs.map(recipeMd).join('\n\n')}\n\nTüm tarifler: **Bebeğim → Tarifler**${foot}`;
  }
  if (/uyku|uyu|uyan|gece/.test(t)) {
    const ns = nextSleep(), wk = weekAvg(7), n = ns.norm;
    const L = [`#### ${b.name} için uyku planı (${a.text})`, `- **Toplam uyku hedefi:** günde ${n.total[0]}-${n.total[1]} saat`, `- **Uyanık kalma aralığı:** ${fmtDur(n.wake[0] * MIN)} – ${fmtDur(n.wake[1] * MIN)}`, `- **Gündüz uykusu:** ${n.naps[0] === n.naps[1] ? n.naps[0] : n.naps.join('-')} kez`, `- **Önerilen yatış saati:** ${n.bed}`, `- ${n.tip}`];
    if (wk?.sleepH != null) L.push(`\n**Son 7 gün:** ortalama ${round1(wk.sleepH)} saat uyku, günde ${round1(wk.naps)} gündüz uykusu. ${wk.sleepH < n.total[0] - 1 ? 'Hedefin altında — yatış saatini 20-30 dk erkene almayı deneyin.' : 'Hedef aralığında, tebrikler!'}`);
    if (ns.from && !ns.st.asleep) L.push(`**Sıradaki uyku:** ${fmtTime(ns.from)} – ${fmtTime(ns.to)} arası idealdir${ns.personal ? ' (kendi düzenine göre ayarlandı)' : ''}.`);
    L.push('\n#### İpuçları', ...SLEEP_TIPS.slice(0, 4).map(([h, x]) => `- **${h}:** ${x}`));
    return L.join('\n') + foot;
  }
  if (/oyun|aktivite|etkinlik|gelişim|psikoloj|davranış|ağlı/.test(t)) {
    const g = playGuideFor(a.exactMonths);
    return `#### ${g.title}\n${g.play.map((p) => '- ' + p).join('\n')}\n\n**Gelişim ve duygusal dünya:** ${g.psych}\n\n**Ebeveyn notu:** ${g.parent}${foot}`;
  }
  // Varsayılan: genel analiz
  const ins = insights();
  const sect = (title, cs) => { const xs = ins.filter((x) => cs.includes(x.c)); return xs.length ? `#### ${title}\n${xs.map((x) => `- **${x.t}** — ${x.s}`).join('\n')}\n\n` : ''; };
  return `**${b.name} · ${a.text}** için güncel değerlendirme:\n\n${sect('Dikkat', ['bad', 'warn'])}${sect('Öneriler', ['brand', 'sleep', 'solid', 'play', 'feed', 'care'])}${sect('İyi gidenler', ['ok'])}`.trim() + foot;
}
