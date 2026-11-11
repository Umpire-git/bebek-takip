// Asistan: yapay zekâ sohbeti + akıllı analiz listesi
import { db, save, baby } from '../store.js';
import { age } from '../calc.js';
import { insights } from '../insights.js';
import { askClaude, localAnswer, hasKey } from '../ai.js';
import { on, seg, insightHTML, toast } from '../ui.js';
import { esc, md } from '../util.js';

let tab = 'chat', busy = false, pending = null, ctrl = null;
const rerender = () => document.dispatchEvent(new Event('rerender'));
const msgs = () => db.chat.filter((m) => m.babyId === db.activeId);

on('aiTab', (d) => { tab = d.v; rerender(); });
on('askAi', (d) => { pending = d.q; tab = 'chat'; document.querySelectorAll('.scrim').forEach((s) => s.remove()); if (location.hash === '#/ai') rerender(); else location.hash = '#/ai'; });
on('aiQuick', (d) => send(d.q));
on('aiClear', () => { if (confirm('Sohbet geçmişi silinsin mi?')) { db.chat = db.chat.filter((m) => m.babyId !== db.activeId); save(); } });
on('aiStop', () => ctrl?.abort());

const PROMPTS = () => {
  const mo = age().exactMonths;
  return [
    ['📊 Bugünü analiz et', 'Bebeğimin bugünkü ve son günlerdeki kayıtlarını analiz edip genel durumunu değerlendirir misin? Dikkat etmem gerekenleri ve önerilerini yaz.'],
    ['😴 Uyku planı', 'Bebeğimin yaşına ve uyku kayıtlarına göre bugün için saat saat bir uyku planı ve daha iyi uyuması için öneriler verir misin?'],
    mo >= 5.5 ? ['🥣 Tarif öner', 'Bebeğimin yaşına, denediği besinlere ve alerjilerine uygun, bugün yapabileceğim 3 ek gıda tarifi önerir misin?'] : ['🤱 Beslenme yeterli mi?', 'Bebeğim yeterince besleniyor mu? Beslenme sıklığı, bez sayısı ve kilo verilerine göre değerlendirir misin?'],
    ['🧸 Oyun ve gelişim', 'Bebeğimin yaşına uygun oyun ve etkinlik önerileri ile bu dönemde duygusal gelişimini nasıl destekleyeceğimi anlatır mısın?'],
    ['🩺 Doktora ne sorayım?', 'Yaklaşan doktor kontrolü için bebeğimin verilerine göre sormam gereken soruların bir listesini hazırlar mısın?'],
    ['📅 Haftalık rapor', 'Son 7 günün uyku, beslenme, bez ve sağlık verilerini haftalık rapor olarak özetler misin? Geçen haftaya göre eğilimleri de belirt.'],
  ];
};

const bubble = (m) => (m.role === 'user' ? `<div class="bub u">${esc(m.text)}</div>` : `<div class="bub a">${md(m.text)}${m.err ? '' : ''}</div>`);

async function send(q) {
  q = (q || '').trim();
  if (!q || busy) return;
  busy = true;
  db.chat.push({ role: 'user', text: q, babyId: db.activeId, ts: Date.now() });
  save(true); rerender();
  const box = document.querySelector('.chat');
  const el = document.createElement('div');
  el.className = 'bub a'; el.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
  box?.appendChild(el); el.scrollIntoView({ block: 'end', behavior: 'smooth' });
  let text = '', err = false;
  try {
    if (hasKey()) {
      ctrl = new AbortController();
      // Hatalı yanıtları çıkar, art arda gelen aynı roldeki mesajları birleştir
      const hist = [];
      for (const m of msgs().filter((x) => !x.err).slice(-24)) { const p = hist[hist.length - 1]; if (p && p.role === m.role) p.text += '\n\n' + m.text; else hist.push({ role: m.role, text: m.text }); }
      while (hist.length && hist[0].role !== 'user') hist.shift();
      let lastPaint = 0;
      text = await askClaude(hist, (t) => { if (Date.now() - lastPaint > 80) { el.innerHTML = md(t); lastPaint = Date.now(); if (innerHeight + scrollY > document.body.scrollHeight - 220) el.scrollIntoView({ block: 'end' }); } }, ctrl.signal);
    } else {
      await new Promise((r) => setTimeout(r, 450));
      text = localAnswer(q);
    }
  } catch (e) {
    if (e.name === 'AbortError') text = el.textContent.trim() ? el.innerText + '\n\n*(Durduruldu)*' : '*(Durduruldu)*';
    else { err = true; text = `⚠️ ${e.message === 'Failed to fetch' ? 'Bağlantı kurulamadı. İnternetinizi kontrol edin.' : e.message}\n\nBu sırada yerleşik analiz motorunun yanıtı:\n\n${localAnswer(q)}`; }
  }
  db.chat.push({ role: 'assistant', text: text || '…', babyId: db.activeId, ts: Date.now(), err });
  if (db.chat.length > 200) db.chat = db.chat.slice(-200);
  busy = false; ctrl = null;
  save(true); rerender();
}

export function render() {
  const b = baby(), list = msgs(), ins = insights();
  const warn = ins.filter((x) => x.c === 'bad' || x.c === 'warn').length;
  const headHTML = `<div class="row between" style="margin-bottom:14px"><div><h1>Asistan</h1><div class="small muted">Pediatri · gelişim · beslenme · gıda güvenliği</div></div>${tab === 'chat' && list.length ? '<button class="btn sm ghost" data-act="aiClear">Temizle</button>' : ''}</div>
    ${seg('aiTab', [['chat', '💬 Sohbet'], ['ins', `🔍 Analiz${warn ? ` (${warn})` : ''}`]], tab)}`;
  if (tab === 'ins') {
    const grp = (title, cs) => { const xs = ins.filter((x) => cs.includes(x.c)); return xs.length ? `<div class="sec"><h3>${title}</h3></div><div class="stack-sm">${xs.map(insightHTML).join('')}</div>` : ''; };
    return `${headHTML}${grp('Dikkat', ['bad', 'warn'])}${grp('Öneriler', ['brand', 'sleep', 'solid', 'play', 'feed', 'care'])}${grp('İyi gidenler', ['ok'])}
      <p class="disc">Bu değerlendirme kayıtlarınızın yaş normlarıyla karşılaştırılmasıyla cihazınızda üretilir; tanı değildir.</p>`;
  }
  const intro = `<div class="card stack-sm"><div class="row"><span class="tile lg c-brand">✨</span><div><div class="b">Merhaba${db.settings.parent ? ' ' + esc(db.settings.parent) : ''}!</div><div class="small muted">${esc(b.name)} hakkında aklınıza takılan her şeyi sorabilirsiniz. Kayıtlarınızı bilerek yanıtlarım.</div></div></div>
    ${hasKey() ? '' : '<div class="insight c-brand"><span class="ic">🔑</span><div><div class="t">Yerleşik analiz modu</div><div class="s">Hazır konularda cihazınızdaki analiz motoru yanıt verir. Serbest sohbet için yapay zekâ anahtarı ekleyin.</div><button class="btn sm soft" style="margin-top:8px" data-act="go" data-to="settings">Ayarlar › Yapay Zekâ</button></div></div>'}</div>`;
  return `${headHTML}<div style="margin-top:14px" class="stack">${list.length ? '' : intro}
    <div class="chat">${list.map(bubble).join('')}</div>
    <div class="chips ${list.length ? 'scroll' : ''}">${PROMPTS().map(([l, q]) => `<button class="chip" data-act="aiQuick" data-q="${esc(q)}">${l}</button>`).join('')}</div></div>
    <form class="composer" id="aiForm"><textarea id="aiInput" rows="1" placeholder="Bir şey sorun…" ${busy ? 'disabled' : ''}></textarea>${busy ? '<button type="button" data-act="aiStop" aria-label="Durdur">■</button>' : '<button aria-label="Gönder">↑</button>'}</form>
    <p class="disc">Asistan tıbbi tanı koymaz, doktorunuzun yerini tutmaz. Acil durumda 112.</p>`;
}

export function mount(root) {
  const form = root.querySelector('#aiForm'), inp = root.querySelector('#aiInput');
  if (!form) return;
  const submit = () => { const q = inp.value; inp.value = ''; send(q); };
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(min-width: 860px)').matches) { e.preventDefault(); submit(); } });
  inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; });
  if (pending) { const q = pending; pending = null; setTimeout(() => send(q), 50); }
  else if (msgs().length && !busy) root.querySelector('.chat')?.lastElementChild?.scrollIntoView({ block: 'end' });
}
