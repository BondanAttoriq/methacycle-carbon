// Utilitas bersama: format angka Indonesia, DOM helper, event bus antarmodul, pemuat JSON.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function fmt(v, d = 2, opt = {}) {
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) return 'n/a';
  if (typeof v === 'string') return v;
  return Number(v).toLocaleString('id-ID', { minimumFractionDigits: opt.min ?? d, maximumFractionDigits: d });
}
export const fmtAuto = v => {
  if (v === null || v === undefined || v === '') return 'n/a';
  const a = Math.abs(v); return fmt(v, a >= 1000 ? 0 : a >= 100 ? 1 : 2);
};
export const signed = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v), d);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Hapus rujukan bagian dokumen (mis. "(Tabel 3)", ", Lampiran 7") dari teks data yang ditampilkan
export const noRef = t => String(t ?? '').replace(/\s*\((?:LKTIN\s+)?(?:Tabel|Lampiran|Gambar|Subbab)\s*[\d.,–-]+\)/g, '').replace(/,\s*(?:Tabel|Lampiran|Gambar|Subbab)\s*[\d.–-]+/g, '').replace(/\bLKTIN\b/g, 'studi').trim();
export const bus = new EventTarget();
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => bus.addEventListener(type, e => fn(e.detail));

const cache = new Map();
export function getJSON(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }));
  return cache.get(url);
}

export const isMobile = () => matchMedia('(max-width: 767px)').matches || matchMedia('(pointer: coarse)').matches && innerWidth < 1024;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrollToId(id) {
  const el = document.getElementById(id); if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

// Warna medium (konsisten dengan viewer 3D lama, FCOL)
export const MEDIUM = {
  'Padatan': ['#f59e33', 'Padatan (LPP)'], 'Gas': ['#facc40', 'Gas buang / LFG'], 'CO₂': ['#9aa6b6', 'CO₂'], 'O₂': ['#58b8ff', 'O₂'], 'H₂': ['#f25acc', 'H₂'],
  'Metanol / campuran sintesis': ['#4deb73', 'Metanol / sintesis'], 'Air / kondensat': ['#3fa6ff', 'Air / kondensat'], 'Fluida kerja ORC': ['#bf73ff', 'Fluida ORC'],
  'Panas': ['#ff4d1a', 'Panas (HRN)'], 'Listrik': ['#ffe01a', 'Listrik'], 'Air pendingin': ['#5ae6f2', 'Air pendingin'], 'Refrigeran': ['#ccaaff', 'Refrigeran'],
  'Udara instrumen': ['#66f2a6', 'Udara instrumen'], 'Nitrogen': ['#f2e659', 'Nitrogen'], 'Udara bau': ['#b3ccb3', 'Udara bau'], 'Air pemadam': ['#ff6b6b', 'Air pemadam'], 'Relief': ['#ff9a3c', 'Relief'],
};
export const STATUS = { SOURCE: ['S', 'Sumber'], CALCULATED: ['C', 'Terhitung'], ASSUMED: ['A', 'Asumsi'], TBD: ['A', 'Belum ditetapkan'], SIAGA: ['A', 'Siaga'] };
export const statusBadge = s => s ? `<span class="badge st-${(STATUS[s] || ['A'])[0]}" title="${esc((STATUS[s] || ['', s])[1])}">${esc(s)}</span>` : '';

// Data register gabungan (dipakai SCADA, neraca, 3D)
let regP = null;
export function loadRegister() {
  if (!regP) regP = Promise.all(['equipment', 'streams', 'neraca', 'pipa'].map(n => getJSON(`assets/data/${n}.json`))).then(([eq, st, ne, pp]) => {
    const EQ = Object.fromEntries(eq.map(e => [e.tag, e]));
    const NE = Object.fromEntries(ne.map(n => [n.id, n]));
    const PP = Object.fromEntries(pp.map(p => [p.id, p]));
    const ST = Object.fromEntries(st.map(s => [s.stream_id, { ...s, q: NE[s.stream_id]?.q ?? null, u: NE[s.stream_id]?.u || '', qst: NE[s.stream_id]?.status || '', basis: NE[s.stream_id]?.basis || '', pipe: PP[s.stream_id] || {} }]));
    return { EQ, ST, list: st.map(s => ST[s.stream_id]) };
  });
  return regP;
}
export function streamArea(s, EQ) {
  for (const t of [s.from_tag, s.to_tag]) { const e = EQ[t]; if (e && e.area && e.area !== 'PENDUKUNG') return e.area; }
  return '';
}
export function qText(s) {
  if (s.qst === 'SIAGA') return 'siaga';
  return s.q === null || s.q === undefined ? 'n/a' : `${fmtAuto(s.q)} ${s.u}`;
}
export function pipeText(p) {
  if (!p || !p.DN) return '';
  return [`DN${p.DN}`, p.v !== null ? `${fmt(p.v, 1)} m/s` : '', p.T !== null ? `${fmt(p.T, 0)} °C` : '', p.P !== null ? `${fmt(p.P, 1)} bar a` : ''].filter(Boolean).join(' · ');
}
