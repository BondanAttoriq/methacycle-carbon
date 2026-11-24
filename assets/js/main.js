// Navigasi, scroll progress, reveal, loader, lazy-init modul, dan jembatan antarmodul (3D ↔ SCADA ↔ tabel).
import { $, $$, on, emit, scrollToId, reducedMotion } from './util.js';

const state = { v3d: null, v3dP: null, scada: null, scadaP: null };
window.METHACYCLE = state;

// ---------------------------------------------------------------- loader halaman
const pl = $('#pageLoader');
function plSet(p, txt) { $('#plBar').style.width = p + '%'; if (txt) $('#plPct').textContent = txt; }
plSet(25, 'Memuat data proses');

// ---------------------------------------------------------------- navbar: aktif + progress
const links = $$('.nav-links a');
const secs = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
function onScroll() {
  const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
  $('#scrollBar').style.width = (p * 100).toFixed(1) + '%';
  const y = h.scrollTop + innerHeight * 0.33; let cur = secs[0];
  for (const s of secs) if (s.offsetTop <= y) cur = s;
  links.forEach(a => { const on = a.getAttribute('href') === '#' + cur.id; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const burger = $('#navBurger'), navL = $('#navLinks');
burger.onclick = () => { const o = !navL.classList.contains('open'); navL.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); };
links.forEach(a => a.addEventListener('click', () => { navL.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));

// ---------------------------------------------------------------- reveal
if ('IntersectionObserver' in window && !reducedMotion()) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
  // elemen yang ditambahkan dinamis
  window.__reveal = el => io.observe(el);
} else { $$('.reveal').forEach(el => el.classList.add('in')); window.__reveal = el => el.classList.add('in'); }

// ---------------------------------------------------------------- jeda animasi CSS tak-terbatas di bagian yang tidak terlihat
// (dash SCADA, peta, siklus sirkular, penanda grafik): main thread lebih lapang untuk render 3D
if ('IntersectionObserver' in window) {
  const ioA = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('anim-off', !e.isIntersecting)), { rootMargin: '100px' });
  $$('main > section').forEach(s => { s.classList.add('anim-off'); ioA.observe(s); });
}

// ---------------------------------------------------------------- toast
let toastT = 0;
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
on('toast', toast);

// ---------------------------------------------------------------- lazy modules
function nearViewport(el, fn, margin = '600px') {
  if (!('IntersectionObserver' in window)) return fn();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
  io.observe(el);
}
export function ensure3D() {
  if (!state.v3dP) state.v3dP = import('./viewer3d.js').then(m => m.init()).then(api => (state.v3d = api));
  return state.v3dP;
}
export function ensureSCADA() {
  if (!state.scadaP) state.scadaP = import('./scada.js').then(m => m.init()).then(api => (state.scada = api));
  return state.scadaP;
}
nearViewport($('#plant3d'), ensure3D, '700px');
$('#v3dLoadBtn').onclick = () => ensure3D();
nearViewport($('#scada'), ensureSCADA, '500px');
nearViewport($('#peta'), () => import('./peta.js').then(m => m.init()).catch(e => { console.error(e); $('#peta').innerHTML = '<p class="muted">Peta gagal dimuat.</p>'; }), '600px');

// modul ringan langsung
Promise.all([import('./dashboard.js').then(m => m.init()), import('./sections.js').then(m => m.init()), import('./banding.js').then(m => m.init())])
  .then(() => { plSet(100, 'Siap'); return import('./anim.js').then(a => { a.watch(); window.__watch = a.watch; }); })
  .catch(e => { console.error(e); plSet(100, 'Sebagian modul gagal dimuat'); })
  .finally(() => setTimeout(() => pl.classList.add('done'), 250));
setTimeout(() => pl.classList.add('done'), 2500);   // jangan pernah menahan halaman

// ---------------------------------------------------------------- tombol hero & alur How?
$$('[data-act]', $('.hero')).forEach(b => b.onclick = () => {
  const a = b.dataset.act;
  if (a === 'tour') { scrollToId('plant3d'); ensure3D().then(v => { v.go(0); v.play(true); }); }
  else if (a === 'free') { scrollToId('plant3d'); ensure3D().then(v => v.setFree(true)); }
  else if (a === 'scada') scrollToId('scada');
  else if (a === 'dash') scrollToId('dashboard');
});
$$('.how-steps [data-stop]').forEach(b => b.onclick = () => { scrollToId('plant3d'); ensure3D().then(v => v.go(+b.dataset.stop)); });

// ---------------------------------------------------------------- jembatan antarmodul
on('goto-stop', ({ i }) => { scrollToId('plant3d'); ensure3D().then(v => v.go(i)); });
on('show-3d', d => { scrollToId('plant3d'); ensure3D().then(v => d.sid ? v.focusStream(d.sid) : v.focusTag(d.tag)); });
on('show-scada', d => { scrollToId('scada'); ensureSCADA().then(s => d.sid ? s.focusStream(d.sid) : s.focusTags(d.tags || [d.tag], d.screen)); });

// tautan langsung #stop-<id> (kompatibel viewer lama)
if (/^#stop-/.test(location.hash)) {
  const id = location.hash.slice(6);
  ensure3D().then(v => { scrollToId('plant3d'); v.goId(id); });
}
emit('main-ready');
