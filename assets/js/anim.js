// Animasi saat elemen pertama kali terlihat: angka naik (count-up), Sankey mengalir, batang grafik tumbuh, garis tergambar.
// Semua animasi dilewati bila pengguna memilih prefers-reduced-motion.
import { fmt, reducedMotion } from './util.js';

const ease = t => 1 - Math.pow(1 - t, 3);

// Format angka Indonesia dengan prefix/suffix; data-dec menentukan desimal.
export function countTo(el, to, { from = 0, dec = 0, dur = 1300, prefix = '', suffix = '' } = {}) {
  const set = v => { el.textContent = prefix + fmt(v, dec, { min: dec }) + suffix; };
  if (reducedMotion() || !isFinite(to)) { set(to); return; }
  if (el._raf) cancelAnimationFrame(el._raf);
  const t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / dur); set(from + (to - from) * ease(k)); if (k < 1) el._raf = requestAnimationFrame(step); else el._raf = 0; };
  el._raf = requestAnimationFrame(step);
}
function countEl(el) {
  const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
  countTo(el, to, { dec, prefix: el.dataset.prefix || '', suffix: el.dataset.suffix || '', dur: +(el.dataset.dur || 1300) });
}

let io = null;
function observer() {
  if (io) return io;
  io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; const el = e.target; io.unobserve(el);
    if (el.hasAttribute('data-count')) countEl(el);
    if (el.classList.contains('chart')) playChart(el);
    if (el.classList.contains('sankey')) playSankey(el);
    if (el.hasAttribute('data-ring')) playRing(el);
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  return io;
}
// Daftarkan elemen di dalam root (dipanggil setelah konten dinamis dirender)
export function watch(root = document) {
  if (!('IntersectionObserver' in window)) return;
  const els = root.querySelectorAll('[data-count]:not([data-watched]), .chart:not([data-watched]), .sankey:not([data-watched]), [data-ring]:not([data-watched])');
  for (const el of els) {
    el.setAttribute('data-watched', '');
    if (reducedMotion()) { el.classList.add('play', 'played'); continue; }
    if (el.hasAttribute('data-count')) el.textContent = (el.dataset.prefix || '') + fmt(0, +(el.dataset.dec || 0), { min: +(el.dataset.dec || 0) }) + (el.dataset.suffix || '');
    observer().observe(el);
  }
}
// Batang tumbuh + garis tergambar (hanya sekali saat pertama terlihat; render ulang dashboard tidak ikut beranimasi)
function playChart(el) { el.classList.add('play', 'played'); setTimeout(() => el.classList.remove('play'), 1700); }
// Sankey: pita digambar dari kiri ke kanan per kolom
function playSankey(el) {
  const paths = [...el.querySelectorAll('.flowp')];
  paths.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; });
  el.classList.add('play', 'played');
  requestAnimationFrame(() => requestAnimationFrame(() => paths.forEach(p => {
    p.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.3,.7,.2,1) ${(+p.dataset.col || 0) * 0.35}s`; p.style.strokeDashoffset = 0;
    p.addEventListener('transitionend', () => { p.style.strokeDasharray = ''; p.style.transition = ''; }, { once: true });
  })));
}
// Cincin efisiensi: busur bertambah
function playRing(el) {
  el.querySelectorAll('[data-arc]').forEach((c, i) => {
    const full = c.getAttribute('stroke-dasharray'); const C = parseFloat(full.split(' ')[1]);
    c.style.strokeDasharray = `0 ${C}`; requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = `stroke-dasharray 1.4s cubic-bezier(.3,.7,.2,1) ${i * 0.25}s`; c.style.strokeDasharray = full; }));
  });
}
