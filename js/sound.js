// Uyku sesleri: Web Audio ile cihazda üretilir (indirme gerekmez, çevrimdışı çalışır)
let ctx = null, nodes = [], stopTimer = null;
export let playing = null, endsAt = null;

function noiseBuffer(kind) {
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, lastOut = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.35;
    else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
    else { lastOut = (lastOut + 0.02 * w) / 1.02; d[i] = lastOut * 3.2; }
  }
  return buf;
}
function loop(kind, gain = 1) {
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = noiseBuffer(kind); src.loop = true; g.gain.value = gain;
  src.connect(g); src.start(); nodes.push(src);
  return g;
}

export const SOUNDS = [['white', '🌫️', 'Beyaz gürültü'], ['pink', '🌧️', 'Yağmur'], ['brown', '🌊', 'Derin uğultu'], ['shush', '🤫', 'Şşş'], ['heart', '💗', 'Kalp atışı'], ['fan', '🌀', 'Vantilatör']];

export function play(kind, minutes = 0) {
  stop();
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 1.5);
  nodes.push(master);
  if (kind === 'white' || kind === 'pink' || kind === 'brown') loop(kind).connect(master);
  else if (kind === 'fan') { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; loop('pink', 2.2).connect(f); f.connect(master); }
  else if (kind === 'shush') {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0; loop('white', 2).connect(f); f.connect(g); g.connect(master);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.55; lg.gain.value = 0.5;
    const off = ctx.createConstantSource(); off.offset.value = 0.5;
    lfo.connect(lg); lg.connect(g.gain); off.connect(g.gain); lfo.start(); off.start(); nodes.push(lfo, off);
  } else if (kind === 'heart') {
    loop('brown', 0.25).connect(master);
    const beat = () => {
      if (playing !== 'heart') return;
      [0, 0.28].forEach((dt, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + dt;
        o.frequency.setValueAtTime(i ? 52 : 62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i ? 0.6 : 0.9, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
      });
      beatTimer = setTimeout(beat, 860);
    };
    playing = 'heart'; beat();
  }
  playing = kind;
  endsAt = minutes ? Date.now() + minutes * 60000 : null;
  if (minutes) stopTimer = setTimeout(() => { stop(); document.dispatchEvent(new Event('rerender')); }, minutes * 60000);
}
let beatTimer = null;
export function stop() {
  clearTimeout(stopTimer); clearTimeout(beatTimer);
  nodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch { /* yoksay */ } });
  nodes = []; playing = null; endsAt = null;
}
