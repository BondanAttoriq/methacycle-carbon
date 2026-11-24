// Penggeser sebelum–sesudah: Landfill atau WtE (sebelum) vs METHACYCLE (sesudah).
// Sumber: LCIA Tabel 5 (Cerqueira et al., 2025, per ton LPP); produk Tabel 3; pendapatan Lampiran 15.
// Basis tahunan (turunan): × 33.333 t LPP/tahun = 100 t/hari × 8.000 jam/tahun (basis yang sama dengan 24.880 t metanol/tahun).
import { $, $$, fmt, esc } from './util.js';
import { P } from './paper-data.js';
import { countTo } from './anim.js';

const LPP_YEAR = 100 * 8000 / 24;            // 33.333 t LPP/tahun
const ROWS = [   // [kunci, label, satuan per ton, satuan per tahun, indeks Tabel 5 (atau null), lebih kecil = lebih baik]
  ['gwp', 'Pemanasan global', 'kg CO₂-eq/ton LPP', 't CO₂-eq/tahun', 0],
  ['acid', 'Terrestrial acidification', 'kg SO₂-eq/ton LPP', 't SO₂-eq/tahun', 1],
  ['pm', 'Fine particulate matter', 'kg PM2.5-eq/ton LPP', 't PM2.5-eq/tahun', 7],
  ['tox', 'Human carcinogenic toxicity', 'kg 1,4-DCB/ton LPP', 't 1,4-DCB/tahun', 5],
];
const NAMES = { landfill: 'Landfill', wte: 'Waste-to-Energy (WtE)' };

export function init() {
  const el = $('#banding'); if (!el) return;
  const st = { cmp: 'landfill', basis: 'ton', pos: 50 };
  const val = (who, i) => { const r = P.lcia[ROWS[i][4]]; const v = who === 'landfill' ? r[2] : who === 'wte' ? r[3] : r[4]; return st.basis === 'ton' ? v : v * LPP_YEAR / 1000; };
  const decOf = v => Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3;
  const tiles = who => ROWS.map((r, i) => `<div class="bd-tile"><span>${r[1]}</span><b data-k="${who}-${r[0]}">0</b><small>${st.basis === 'ton' ? r[2] : r[3]}</small></div>`).join('')
    + `<div class="bd-tile"><span>Produk e-methanol</span><b data-k="${who}-meoh">0</b><small>${st.basis === 'ton' ? 't/hari (99,76%)' : 't/tahun'}</small></div>`
    + `<div class="bd-tile"><span>Pendapatan produk</span><b data-k="${who}-rev">0</b><small>${who === 'after' ? 'US$ juta/tahun' : 'tidak ada produk kimia'}</small></div>`;
  el.innerHTML = `<div class="bd-head"><div><h3 class="h-sm" style="margin:0">Sebelum vs sesudah METHACYCLE</h3><div class="ch-sub">Geser pembatas untuk membandingkan kondisi tanpa dan dengan METHACYCLE.</div></div>
      <div class="bd-ctrl"><div class="seg" role="radiogroup" aria-label="Kondisi pembanding"><label><input type="radio" name="bdCmp" value="landfill" checked><span>Landfill</span></label><label><input type="radio" name="bdCmp" value="wte"><span>WtE</span></label></div>
      <div class="seg" role="radiogroup" aria-label="Basis perbandingan"><label><input type="radio" name="bdBasis" value="ton" checked><span>Per ton LPP</span></label><label><input type="radio" name="bdBasis" value="year"><span>Per tahun</span></label></div></div></div>
    <div class="bd-stage" id="bdStage" style="--pos:50%">
      <div class="bd-layer after"><div class="bd-bg" style="background-image:url(assets/img/render/07_oec.jpg)"></div><div class="bd-in"><span class="bd-lab after">SESUDAH · METHACYCLE</span><div class="bd-grid" id="bdAfter"></div></div></div>
      <div class="bd-layer before"><div class="bd-bg" style="background-image:url(assets/img/render/02_lokasi.jpg)"></div><div class="bd-in"><span class="bd-lab before" id="bdBeforeLab">SEBELUM · Landfill</span><div class="bd-grid" id="bdBefore"></div></div></div>
      <div class="bd-handle" aria-hidden="true"><span><svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
      <input type="range" class="bd-range" id="bdRange" min="0" max="100" value="50" step="1" aria-label="Geser pembatas sebelum dan sesudah">
    </div>
    <div class="bd-delta" id="bdDelta" aria-live="polite"></div>
    <p class="note-sm">LCIA per ton LPP (Cerqueira et al., 2025); nilai negatif = dampak yang dihindari. Basis tahunan = × 33.333 t LPP/tahun (100 t/hari × 8.000 jam).</p>`;
  const stage = $('#bdStage');
  const setPos = v => { st.pos = v; stage.style.setProperty('--pos', v + '%'); };
  $('#bdRange').addEventListener('input', e => setPos(+e.target.value));
  const prev = {};
  function render(first) {
    $('#bdBefore').innerHTML = tiles('before'); $('#bdAfter').innerHTML = tiles('after');
    $('#bdBeforeLab').textContent = `SEBELUM · ${NAMES[st.cmp]}`;
    const set = (k, v, dec, pre = '') => { const e = stage.querySelector(`[data-k="${k}"]`); if (!e) return; countTo(e, v, { from: first ? 0 : (prev[k] ?? 0), dec, prefix: pre, dur: 900 }); prev[k] = v; };
    ROWS.forEach((r, i) => { const b = val(st.cmp, i), a = val('meoh', i); set(`before-${r[0]}`, b, decOf(b)); set(`after-${r[0]}`, a, decOf(a)); });
    const meoh = st.basis === 'ton' ? P.base.meoh : P.base.meohYear;
    set('before-meoh', 0, 0); set('after-meoh', meoh, st.basis === 'ton' ? 2 : 0);
    set('before-rev', 0, 0, 'US$'); set('after-rev', P.ind.revenue, 2, 'US$');
    // selisih
    const g0 = val(st.cmp, 0), g1 = val('meoh', 0), cut = st.cmp === 'landfill' ? P.gwpCut.landfill : P.gwpCut.wte;
    const pct = i => { const b = val(st.cmp, i), a = val('meoh', i); return b === 0 ? null : (a - b) / Math.abs(b) * 100; };
    const dl = [
      ['GWP turun', `−${fmt(cut, 2)}%`, `vs ${NAMES[st.cmp]}`],
      [st.basis === 'ton' ? 'GWP dihindari' : 'Emisi GWP dihindari', `${fmt(g0 - g1, st.basis === 'ton' ? 0 : 0)}`, st.basis === 'ton' ? 'kg CO₂-eq per ton LPP' : 't CO₂-eq per tahun'],
      ['Acidification', `${pct(1) > 0 ? '+' : '−'}${fmt(Math.abs(pct(1)), 1)}%`, pct(1) > 0 ? 'lebih tinggi dari pembanding' : 'lebih rendah dari pembanding'],
      ['PM2.5 & toksisitas', 'Negatif', 'jalur metanol menghindari dampak (nilai &lt; 0)'],
      ['Produk baru', `${fmt(P.base.meoh, 2)} t/hari`, 'e-methanol 99,76% + O₂ surplus 13,33 t/hari'],
    ];
    $('#bdDelta').innerHTML = dl.map(d => `<div class="bd-d"><span>${d[0]}</span><b>${d[1]}</b><small>${d[2]}</small></div>`).join('');
  }
  $$('input[name=bdCmp]', el).forEach(r => r.onchange = () => { st.cmp = r.value; render(false); });
  $$('input[name=bdBasis]', el).forEach(r => r.onchange = () => { st.basis = r.value; render(false); });
  // animasi pertama saat terlihat: angka naik dan pembatas bergeser memperlihatkan "sesudah"
  let started = false;
  const go = () => { if (started) return; started = true; render(true);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { const t0 = performance.now(); const step = n => { const k = Math.min(1, (n - t0) / 1400), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; const v = 82 - 32 * e; setPos(v); $('#bdRange').value = v; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); } };
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { threshold: 0.3 }); io.observe(stage); }
  else go();
  render(true);
}
