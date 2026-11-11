// Beslenme modülleri: ek gıda takibi (besin kataloğu, alerjen tanıştırma) ve tarifler
import { recs, mine } from '../store.js';
import { age, foodsTried, allergenExposure, allergyNames } from '../calc.js';
import { on, sec, backBtn, seg, sheet, closeSheet, empty } from '../ui.js';
import { openRecord } from '../entry.js';
import { suitableRecipes } from '../ai.js';
import { esc, fmtDate, ago, DAY, trLower, md } from '../util.js';
import { FOODS, FOOD_CATS, ALLERGENS, FORBIDDEN, SOLID_STAGES, solidStageFor, RECIPES, RECIPE_KINDS } from '../data/nutrition.js';

const rerender = () => document.dispatchEvent(new Event('rerender'));
const head = (title, btn = '') => `${backBtn()}<div class="row between" style="margin-bottom:14px"><h1>${title}</h1>${btn}</div>`;

// ---------- Ek gıda ----------
let tab = 'tried';
on('solidTab', (d) => { tab = d.v; rerender(); });
on('food', (d) => {
  const f = FOODS.find((x) => x.n === d.n), t = foodsTried().get(trLower(d.n)), mo = age().exactMonths;
  const bad = allergyNames().some((n) => trLower(d.n).includes(n) || (f?.al && trLower(ALLERGENS[f.al]).includes(n)));
  sheet(d.n, `<div class="stack">
    ${bad ? '<div class="insight c-bad"><span class="ic">⚠️</span><div><div class="t">Alerji listenizde</div><div class="s">Bu besin kayıtlı bir alerjenle eşleşiyor. Doktorunuza danışmadan vermeyin.</div></div></div>' : ''}
    ${f ? `<div class="row wrap"><span class="badge c-solid">${FOOD_CATS[f.c][1]} ${FOOD_CATS[f.c][0]}</span><span class="badge c-${f.m > mo + 0.5 ? 'warn' : 'ok'}">${f.m}. aydan itibaren</span>${f.al ? `<span class="badge c-bad">Alerjen: ${ALLERGENS[f.al]}</span>` : ''}</div>${f.t ? `<p>${esc(f.t)}</p>` : ''}` : ''}
    ${t ? `<div class="list"><div class="item"><span class="grow s">İlk deneme</span><span class="t">${fmtDate(t.first)}</span></div><div class="item"><span class="grow s">Kaç kez verildi</span><span class="t">${t.count} kez · ${t.days.size} farklı gün</span></div><div class="item"><span class="grow s">Tepki</span><span class="t">${t.reactions ? `⚠️ ${t.reactions} reaksiyon` : t.loved ? '😍 Seviyor' : t.no ? '😖 Pek sevmedi' : '🙂 Sorun yok'}</span></div></div>
      ${t.no > t.loved && !t.reactions ? '<p class="small muted">Bir besinin kabulü için 8-15 deneme gerekebilir. Farklı kıvam ve sunumlarla, zorlamadan tekrar deneyin.</p>' : ''}` : '<p class="muted small">Henüz denenmedi. İlk kez verirken sabah/öğlen saatlerini seçin ve 3 gün boyunca tepkilerini izleyin.</p>'}
    <button class="btn block" data-act="foodLog" data-n="${esc(d.n)}">🥣 Bu besinle kayıt ekle</button>
    <button class="btn ghost block" data-act="askAi" data-q="${esc(d.n)} bebeğime nasıl hazırlanır ve verilir? Yaşına uygun kıvam, miktar, saklama koşulları ve 2 tarif önerir misin?">✨ Asistana sor: nasıl hazırlanır?</button></div>`);
});
on('foodLog', (d) => { closeSheet(); openRecord('solid', null, { foods: [d.n] }); });

export function solids() {
  const mo = age().exactMonths, tried = foodsTried(), ex = allergenExposure(), bad = allergyNames(), stage = solidStageFor(mo);
  const fresh = [...tried.values()].filter((f) => Date.now() - f.first < 3 * DAY);
  const algChips = Object.entries(ALLERGENS).map(([k, l]) => { const isBad = bad.some((n) => trLower(l).includes(n)); return `<span class="badge c-${isBad ? 'bad' : ex[k] ? 'ok' : 'note'}">${isBad ? '⚠' : ex[k] ? '✓' : '○'} ${l}${ex[k] && !isBad ? ` · ${ex[k].count}` : ''}</span>`; }).join('');
  let body;
  if (tab === 'tried') {
    const list = [...tried.values()].sort((a, b) => b.last - a.last);
    body = list.length ? `<div class="list">${list.map((f) => `<button class="item c-solid" data-act="food" data-n="${esc(f.n)}"><span class="tile sm">${f.info ? FOOD_CATS[f.info.c][1] : '🍽️'}</span><span class="grow"><div class="t">${esc(f.n)}</div><div class="s">${f.count} kez · son ${ago(f.last)}</div></span><span>${f.reactions ? '⚠️' : f.loved > f.no ? '😍' : f.no > f.loved ? '😖' : '🙂'}</span></button>`).join('')}</div>` : `<div class="card">${empty('🥄', mo < 5.5 ? 'Ek gıda zamanı henüz gelmedi. Rehberi şimdiden okuyabilirsiniz.' : 'Henüz besin denenmedi. Katalogdan bir besin seçip ilk kaydı ekleyin.')}</div>`;
  } else if (tab === 'catalog') {
    body = Object.entries(FOOD_CATS).map(([c, [name, icon]]) => { const fs = FOODS.filter((f) => f.c === c); return `${sec(`${icon} ${name}`, `<span class="tiny muted">${fs.filter((f) => tried.has(trLower(f.n))).length}/${fs.length}</span>`)}<div class="chips">${fs.map((f) => { const t = tried.has(trLower(f.n)), late = f.m > mo + 0.5; return `<button class="chip ${t ? 'on' : ''}" style="${late && !t ? 'opacity:.5' : ''}" data-act="food" data-n="${esc(f.n)}">${t ? '✓ ' : ''}${f.n}${late && !t ? ` · ${f.m}. ay` : ''}${f.al ? ' ⚠︎' : ''}</button>`; }).join('')}</div>`; }).join('') + '<p class="tiny muted" style="margin-top:12px">⚠︎ alerjen besin · soluk olanlar için henüz erken</p>';
  } else if (tab === 'guide') {
    body = `<div class="stack">${SOLID_STAGES.map((s) => `<div class="card ${s === stage ? 'tint c-solid' : ''}"><h3 style="margin-bottom:8px">${s.title}${s === stage ? ' <span class="badge c-solid">şu an</span>' : ''}</h3><div class="prose"><ul>${s.points.map((p) => `<li>${md(p).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul></div></div>`).join('')}
      <div class="card prose"><h3>Öğürme mi, boğulma mı?</h3><p><b>Öğürme</b> (sesli, öksürüklü, yüz kızarır) koruyucu bir reflekstir ve öğrenmenin parçasıdır; sakin kalın, müdahale etmeyin. <b>Boğulma</b> sessizdir: ses çıkaramaz, morarır — hemen ilk yardım uygulayın (Acil Rehber).</p><p>Bebek her zaman <b>dik oturur</b> pozisyonda ve gözetim altında yemelidir.</p></div>
      <div class="card prose"><h3>Gıda güvenliği</h3><ul><li>Pişmiş püreler buzdolabında (≤4 °C) <b>en fazla 48 saat</b>, derin dondurucuda (−18 °C) <b>1-3 ay</b> saklanır; porsiyonluk kaplarda dondurun, üzerine tarih yazın.</li><li>Çözdürülen yemek <b>tekrar dondurulmaz</b>; bir kez ısıtılır, artanı atılır.</li><li>Bebeğin kaşığının değdiği kaptaki artan yemek saklanmaz (tükürük bakteri taşır).</li><li>Isıtırken içi buharlaşana kadar ısıtıp karıştırın, ılıtarak verin; mikrodalgada sıcak noktalar oluşabilir.</li><li>Çiğ et/tavuk için ayrı kesme tahtası; sebze-meyveyi bol suyla yıkayın.</li><li>Hazır mamalarda etikette <b>ilave şeker, tuz, aroma</b> olmamasına ve yaş ibaresine bakın.</li></ul></div></div>`;
  } else {
    body = `<div class="list">${FORBIDDEN.map(([t, s]) => `<div class="item"><span class="grow"><div class="t">${t}</div><div class="s">${esc(s)}</div></span></div>`).join('')}</div>`;
  }
  return `${head('Ek Gıda', '<button class="btn sm" data-act="rec" data-type="solid">＋ Öğün</button>')}
  <div class="stack"><div class="card tint c-solid"><div class="row between"><div><div class="b">${stage.title}</div><div class="small muted">${tried.size} besin denendi · ${recs('solid').length} öğün kaydı</div></div><button class="btn sm soft" data-act="go" data-to="hub/recipes">Tarifler ›</button></div></div>
  ${fresh.length ? `<div class="insight c-solid"><span class="ic">🔎</span><div><div class="t">3 gün kuralı: ${fresh.map((f) => esc(f.n)).join(', ')}</div><div class="s">Gözlem sürüyor. Bu sürede başka yeni besin eklemeyin; döküntü, kusma, ishal olursa not alın.</div></div></div>` : ''}
  <div class="card stack-sm"><div class="b small">Alerjen tanıştırma durumu</div><div class="row wrap" style="gap:6px">${algChips}</div><p class="tiny muted">Alerjenleri geciktirmek korumaz; 4-11. aylar arasında küçük miktarla tanıştırıp haftada 2-3 kez sürdürmek önerilir.</p></div>
  ${seg('solidTab', [['tried', 'Denenenler'], ['catalog', 'Katalog'], ['guide', 'Rehber'], ['no', 'Yasaklar']], tab)}</div>
  <div style="margin-top:14px">${body}</div>`;
}

// ---------- Tarifler ----------
let kind = 'all', onlyFit = true;
on('recKindF', (d) => { kind = d.v; rerender(); });
on('recFit', () => { onlyFit = !onlyFit; rerender(); });
on('recipe', (d) => {
  const r = RECIPES.find((x) => x.id === d.id), mo = age().exactMonths;
  sheet(r.n, `<div class="stack"><div class="row wrap"><span class="badge c-solid">${RECIPE_KINDS[r.k]}</span><span class="badge c-${r.m > mo + 0.3 ? 'warn' : 'ok'}">${r.m}+ ay</span><span class="badge c-note">⏱ ${r.t} dk</span>${r.al.map((a) => `<span class="badge c-bad">${ALLERGENS[a]}</span>`).join('')}</div>
    <div><h3 style="margin-bottom:6px">Malzemeler</h3><div class="prose"><ul>${r.ing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
    <div><h3 style="margin-bottom:6px">Hazırlanışı</h3><div class="prose"><ol>${r.st.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div></div>
    <div class="card tint c-feed small"><b>🥗 Besin notu:</b> ${esc(r.nut)}</div>
    <p class="tiny muted">1 yaşından önce tuz, şeker ve bal eklenmez. Buzdolabında 48 saat, derin dondurucuda 1-3 ay saklanabilir (aksi belirtilmedikçe).</p>
    <button class="btn block" data-act="recipeLog" data-id="${r.id}">🥣 Yedirdim, kaydet</button>
    <button class="btn ghost block" data-act="askAi" data-q="“${esc(r.n)}” tarifini bebeğime göre uyarlar mısın? Evde bazı malzemeler yoksa alternatifleri ve porsiyon miktarını da söyle.">✨ Asistanla uyarlama yap</button></div>`);
});
on('recipeLog', (d) => { const r = RECIPES.find((x) => x.id === d.id); closeSheet(); const foods = FOODS.filter((f) => r.ing.some((i) => trLower(i).includes(trLower(f.n)))).map((f) => f.n); openRecord('solid', null, { foods, note: r.n }); });

export function recipes() {
  const mo = age().exactMonths, fit = suitableRecipes();
  const base = onlyFit ? fit : RECIPES;
  const list = base.filter((r) => kind === 'all' || r.k === kind).sort((a, b) => (onlyFit ? b.m - a.m : a.m - b.m));
  const blocked = RECIPES.filter((r) => r.m <= mo + 0.3).length - fit.length;
  return `${head('Tarifler')}
  <button class="card tint c-brand row" style="width:100%;text-align:left;margin-bottom:14px" data-act="askAi" data-q="Bebeğimin yaşına, denediği besinlere ve alerjilerine göre bugün için kahvaltı, öğle ve akşam menüsü önerir misin? Tariflerini de ver."><span class="tile">✨</span><span class="grow"><div class="b">Bugüne özel menü iste</div><div class="small muted">Asistan, kayıtlarınıza göre kişisel menü ve tarif hazırlar</div></span>›</button>
  <div class="chips scroll" style="margin-bottom:12px"><button class="chip ${onlyFit ? 'on' : ''}" data-act="recFit">${onlyFit ? '✓ ' : ''}Yaşına uygun</button><button class="chip ${kind === 'all' ? 'on' : ''}" data-act="recKindF" data-v="all">Tümü</button>${Object.entries(RECIPE_KINDS).map(([k, l]) => `<button class="chip ${kind === k ? 'on' : ''}" data-act="recKindF" data-v="${k}">${l}</button>`).join('')}</div>
  ${mo < 5.5 && onlyFit ? `<div class="card">${empty('🤱', 'İlk 6 ay yalnızca anne sütü veya mama önerilir. Tarifler 6. aydan itibaren burada görünecek. “Yaşına uygun” filtresini kapatarak göz atabilirsiniz.')}</div>` : list.length ? `<div class="list">${list.map((r) => `<button class="item c-solid" data-act="recipe" data-id="${r.id}"><span class="tile">${{ pure: '🥣', kahvalti: '🍳', corba: '🍲', ana: '🍽️', parmak: '🥞', ara: '🍌' }[r.k]}</span><span class="grow"><div class="t">${esc(r.n)}</div><div class="s">${RECIPE_KINDS[r.k]} · ${r.t} dk${r.al.length ? ' · ' + r.al.map((a) => ALLERGENS[a]).join(', ') : ''}</div></span><span class="badge c-${r.m > mo + 0.3 ? 'warn' : 'ok'}">${r.m}+ ay</span></button>`).join('')}</div>` : `<div class="card">${empty('🍽️', 'Bu filtreye uyan tarif yok.')}</div>`}
  ${onlyFit && blocked > 0 ? `<p class="disc">Kayıtlı alerjiler nedeniyle ${blocked} tarif gizlendi.</p>` : ''}`;
}
