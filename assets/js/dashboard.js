// Engineering Dashboard: model skenario ekonomi & lingkungan, dikalibrasi ke Lampiran 19 (sensitivitas) dan Subbab 3.6 / Lampiran 10 (EF).
import { $, $$, fmt, esc, emit } from './util.js';
import { P } from './paper-data.js';
import { cartesian, C } from './charts.js';

const BASE = { meoh: 750, el: 40, ef: 0, peme: false, tar: 0.05 };
const PRESETS = [
  ['Basis Paper', { meoh: 750, el: 40, ef: 0, peme: false }], ['Metanol Rendah', { meoh: 600 }], ['Metanol Tinggi', { meoh: 900 }],
  ['Listrik Mahal', { el: 55 }], ['Listrik Murah', { el: 35 }], ['Grid Rendah Karbon', { ef: 0.05 }], ['Grid Intensitas Tinggi', { ef: 0.80 }], ['Optimasi PEME −5%', { peme: true }]];

// ---------------------------------------------------------------- model (murni, dapat diuji)
const lerp = (a, b, t) => a + (b - a) * t;
function bracket(tab, x) { for (let i = 0; i < tab.length - 1; i++) if (x <= tab[i + 1][0]) return [tab[i], tab[i + 1], (x - tab[i][0]) / (tab[i + 1][0] - tab[i][0])]; const n = tab.length; return [tab[n - 2], tab[n - 1], 1]; }
export const interp = (tab, x, c) => { const [a, b, t] = bracket(tab, x); return lerp(a[c], b[c], t); };
function pbpAt(tab, x) {
  const [a, b, t] = bracket(tab, x); const va = a[3] === 3.7 ? 3.71 : a[3], vb = b[3] === 3.7 ? 3.71 : b[3];   // 3,7 (Lampiran 19) = 3,71 (Tabel 6)
  if (t <= 1e-9) return va; if (t >= 1 - 1e-9) return vb;
  if (typeof va === 'number' && typeof vb === 'number') return lerp(va, vb, t);
  const str = typeof va === 'string' ? va : vb, num = typeof va === 'number' ? va : vb;
  return interp(tab, x, 1) <= 0 ? str : '>' + fmt(num, 1);            // di antara angka dan ">n": tampilkan batas bawah
}
function inverse(tab, target) {   // x saat NPV = target (tabel monoton)
  for (let i = 0; i < tab.length - 1; i++) { const a = tab[i], b = tab[i + 1]; const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
    if (target >= lo && target <= hi) return a[0] + (target - a[1]) / (b[1] - a[1]) * (b[0] - a[0]); }
  return null;
}
export function model(s) {
  const npvM = interp(P.sensMeoh, s.meoh, 1), npvE = interp(P.sensElec, s.el, 1), irrM = interp(P.sensMeoh, s.meoh, 2), irrE = interp(P.sensElec, s.el, 2);
  const dm = s.meoh !== 750, de = s.el !== 40, combo = dm && de;
  const npv = P.ind.npv + (npvM - P.ind.npv) + (npvE - P.ind.npv), irr = P.ind.irr + (irrM - P.ind.irr) + (irrE - P.ind.irr);
  const pm = pbpAt(P.sensMeoh, s.meoh), pe = pbpAt(P.sensElec, s.el);
  let pbp;
  if (!dm && !de) pbp = P.ind.pbp; else if (!de) pbp = pm; else if (!dm) pbp = pe;
  else if (typeof pm === 'string' || typeof pe === 'string') pbp = [pm, pe].filter(v => typeof v === 'string').sort((a, b) => parseFloat(b.slice(1).replace(',', '.')) - parseFloat(a.slice(1).replace(',', '.')))[0];
  else pbp = P.ind.pbp + (pm - P.ind.pbp) + (pe - P.ind.pbp);
  if (combo && npv <= 0) pbp = '>20';
  const beM = inverse(P.sensMeoh, P.ind.npv - npvE), beE = inverse(P.sensElec, P.ind.npv - npvM);
  const beMtxt = beM !== null ? beM : (P.ind.npv - npvE < P.sensMeoh[0][1] ? '<600' : '>900');
  const beEtxt = beE !== null ? beE : (P.ind.npv - npvM > P.sensElec[0][1] ? '<35' : '>60');
  const spec = s.peme ? P.peme5.elecNew : P.base.elecSpec;
  const inten = P.base.co2Intensity + spec * s.ef, annual = inten * P.base.meohYear;
  return { npv, irr, pbp, combo, beM: beMtxt, beE: beEtxt, inten, annual, spec, base: !dm && !de && s.ef === 0 && !s.peme };
}
// arus kas: seri basis Lampiran 16 + k × utilisasi, k dari ΔNPV pada diskonto 10%
const U = t => t === 0 ? 0 : t === 1 ? 0.6 : t === 2 ? 0.8 : t === 3 ? 0.9 : 1;
export function cashSeries(dNPV) {
  const base = []; for (let t = 0; t <= 20; t++) base.push(t <= 5 ? P.cash[t][4] : P.cashLateFCF);
  let den = 0; for (let t = 1; t <= 20; t++) den += U(t) / Math.pow(1.1, t);
  const k = dNPV / den; const fcf = base.map((v, t) => v + k * U(t));
  const cum = []; fcf.reduce((a, v, i) => (cum[i] = a + v), 0);
  const bcum = []; base.reduce((a, v, i) => (bcum[i] = a + v), 0);
  let be = null; for (let t = 1; t <= 20; t++) if (cum[t - 1] < 0 && cum[t] >= 0) { be = t - 1 + (-cum[t - 1]) / (cum[t] - cum[t - 1]); break; }
  return { base, fcf, cum, bcum, be, k };
}

// ---------------------------------------------------------------- UI
export function init() {
  const s = { ...BASE };
  const pres = $('#dPresets');
  pres.innerHTML = PRESETS.map(([n], i) => `<button class="pchip" data-p="${i}" aria-pressed="false">${n}</button>`).join('');
  $$('.pchip', pres).forEach(b => b.onclick = () => { const p = PRESETS[+b.dataset.p][1]; Object.assign(s, b.dataset.p === '0' ? { ...BASE, tar: s.tar } : { ...BASE, tar: s.tar, ...p }); sync(); });
  const pairs = [['dMeoh', 'meoh', 600, 900, 10], ['dEl', 'el', 35, 60, 1], ['dEf', 'ef', 0, 0.8, 0.01]];
  for (const [id, k, lo, hi, st] of pairs) {
    const r = $('#' + id), n = $('#' + id + 'N');
    const set = v => { v = Math.round(Math.max(lo, Math.min(hi, +v)) / st) * st; s[k] = +v.toFixed(2); sync(); };
    r.oninput = () => set(r.value); n.onchange = () => set(n.value);
  }
  $('#dPeme').onchange = e => { s.peme = e.target.checked; sync(); };
  $$('input[name=dTar]').forEach(r => r.onchange = () => { s.tar = +r.value; sync(); });
  $('#dReset').onclick = () => { Object.assign(s, BASE); sync(); };
  $('#dCopy').onclick = async () => {
    const txt = summary(s, model(s));
    try { await navigator.clipboard.writeText(txt); emit('toast', 'Ringkasan skenario disalin ke clipboard.'); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); emit('toast', 'Ringkasan skenario disalin.'); } catch (_) { emit('toast', 'Clipboard tidak tersedia.'); } ta.remove(); }
  };
  function sync() {
    for (const [id, k] of pairs) { $('#' + id).value = s[k]; $('#' + id + 'N').value = k === 'ef' ? s[k].toFixed(2) : s[k]; $('#' + id).closest('.field').classList.toggle('changed', s[k] !== BASE[k]); }
    $('#dPeme').checked = s.peme; $$('input[name=dTar]').forEach(r => r.checked = +r.value === s.tar);
    $$('.pchip', pres).forEach((b, i) => { const p = { ...BASE, ...PRESETS[i][1] }; const on = ['meoh', 'el', 'ef', 'peme'].every(k => p[k] === s[k]); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    render(s);
  }
  sync();
}

const tH = v => typeof v === 'string' ? v : fmt(v, 2);
function delta(v, b, d, goodUp, unit = '') {
  if (typeof v !== 'number' || typeof b !== 'number') return `<div class="kd flat">tabel: batas</div>`;
  const dv = v - b; if (Math.abs(dv) < Math.pow(10, -d) / 2) return `<div class="kd flat">= basis</div>`;
  const good = goodUp ? dv > 0 : dv < 0;
  return `<div class="kd ${good ? 'up' : 'down'}"><span aria-hidden="true">${dv > 0 ? '▲' : '▼'}</span>${dv > 0 ? '+' : '−'}${fmt(Math.abs(dv), d)}${unit} vs basis</div>`;
}
function render(s) {
  const m = model(s), b = model(BASE);
  const est = m.combo ? '<span class="badge est" title="Dua parameter ekonomi berubah: superposisi Δ linear">estimasi kombinasi</span>' : '';
  const k = [
    ['NPV (10%)', `<small>US$</small>${fmt(m.npv, 2)}<small> juta</small>`, delta(m.npv, b.npv, 2, true), est, m.npv < 0],
    ['IRR', m.irr < 0 ? `&lt;0<small>%</small>` : `${fmt(m.irr, 1)}<small>%</small>`, delta(m.irr, b.irr, 1, true, ' poin'), est],
    ['Simple PBP', `${tH(m.pbp)}<small> tahun</small>`, delta(m.pbp, b.pbp, 2, false), est],
    ['PI', `2,65`, `<div class="kd flat">${m.base || (s.meoh === 750 && s.el === 40) ? 'nilai basis' : 'nilai basis (tidak dihitung ulang)'}</div>`, (s.meoh !== 750 || s.el !== 40) ? '<span class="badge base">basis</span>' : ''],
    ['Harga impas metanol (NPV = 0)', typeof m.beM === 'string' ? `<small>US$</small>${m.beM}` : `<small>≈US$</small>${fmt(m.beM, 0)}<small>/ton</small>`, delta(m.beM, b.beM, 0, false, ' US$/t'), ''],
    ['Tarif listrik impas (NPV = 0)', typeof m.beE === 'string' ? `<small>US$</small>${m.beE}` : `<small>≈US$</small>${fmt(m.beE, 1)}<small>/MWh</small>`, delta(m.beE, b.beE, 1, true, ' US$/MWh'), ''],
    ['Intensitas emisi operasional', `${fmt(m.inten, 3)}<small> kg CO₂-eq/kg</small>`, delta(m.inten, b.inten, 3, false), s.peme && s.ef > 0 ? '<span class="badge est">estimasi</span>' : ''],
    ['Emisi tahunan', `${fmt(m.annual, 0)}<small> t CO₂-eq/th</small>`, delta(m.annual, b.annual, 0, false, ' t'), ''],
  ];
  $('#dKpi').innerHTML = k.map(([l, v, d, bd, neg]) => `<div class="kt${neg ? ' neg' : ''}"><div class="kl">${l} ${bd || ''}</div><div class="kv2">${v}</div>${d}</div>`).join('');

  // arus kas
  const cs = cashSeries(m.npv - P.ind.npv), changed = Math.abs(m.npv - P.ind.npv) > 1e-6;
  const yrs = [...Array(21).keys()];
  cartesian($('#chCash'), {
    title: 'Arus kas bebas 20 tahun', w: 900, h: 320, sub: changed ? 'Skenario: seri basis + k × utilisasi (ΔNPV terkalibrasi)' : 'Basis: tahun 6–20 FCF 4,43', unit: 'US$ juta',
    x: { type: 'cat', cats: yrs.map(String), label: 'Tahun' }, y: { label: 'US$ juta', fmt: v => fmt(v, 0) },
    bars: [{ name: 'FCF tahunan', color: v => v < 0 ? C.red : C.teal, values: cs.fcf }],
    lines: [...(changed ? [{ name: 'Kumulatif basis', color: C.gray, dash: true, marker: 'none', points: cs.bcum.map((v, i) => [i, v]) }] : []),
      { name: 'Kumulatif skenario', color: C.orange, marker: 'square', points: cs.cum.map((v, i) => [i, v]), label: `${fmt(cs.cum[20], 2)}`, labelDx: -4, labelDy: -10, labelAnchor: 'end' }],
    marks: cs.be !== null ? [{ x: cs.be, y: 0, color: C.blue, shape: 'diamond', label: `Impas ±${fmt(cs.be, 1)} th`, tip: `Titik impas kumulatif: tahun ±${fmt(cs.be, 2)}` }] : [],
    hlines: [{ y: 0 }], m: { b: 46 },
    legend: [{ name: 'FCF tahunan', color: C.teal, kind: 'bar' }, { name: 'Kumulatif skenario', color: C.orange, marker: 'square' }, ...(changed ? [{ name: 'Kumulatif basis', color: C.gray, dash: true }] : []), ...(cs.be !== null ? [{ name: 'Titik impas', color: C.blue, marker: 'diamond' }] : [])],
    table: { head: ['Tahun', 'FCF (US$ juta)', 'Kumulatif', 'Kumulatif basis'], rows: yrs.map(t => [t, fmt(cs.fcf[t], 2), fmt(cs.cum[t], 2), fmt(cs.bcum[t], 2)]) },
  });
  // sensitivitas
  const pm = P.sensMeoh.map(r => [(r[0] - 750) / 750 * 100, r[1]]), pe = P.sensElec.map(r => [(r[0] - 40) / 40 * 100, r[1]]);
  const xm = (s.meoh - 750) / 750 * 100, xe = (s.el - 40) / 40 * 100;
  cartesian($('#chSens'), {
    title: 'Sensitivitas NPV', sub: 'Titik menyala = posisi skenario saat ini pada masing-masing tabel', unit: 'US$ juta',
    x: { type: 'num', min: -20, max: 50, ticks: [-20, -10, 0, 10, 20, 30, 40, 50], fmt: v => (v > 0 ? '+' : '') + fmt(v, 0) + '%', label: 'Perubahan parameter terhadap basis (%)' },
    y: { label: 'NPV (US$ juta)', fmt: v => fmt(v, 0) },
    lines: [{ name: 'Harga metanol', color: C.teal, marker: 'circle', points: pm, label: 'Harga metanol', labelAt: 5, labelDx: -6, labelDy: -10, labelAnchor: 'end' },
      { name: 'Tarif listrik', color: C.blue, marker: 'square', points: pe, label: 'Tarif listrik', labelAt: 5, labelDx: -6, labelDy: 18, labelAnchor: 'end' }],
    marks: [{ x: xm, y: interp(P.sensMeoh, s.meoh, 1), color: C.teal, label: `${s.meoh} US$/t`, dy: -14, tip: `Harga metanol ${s.meoh} US$/ton → NPV ${fmt(interp(P.sensMeoh, s.meoh, 1), 2)}` },
      { x: xe, y: interp(P.sensElec, s.el, 1), color: C.blue, shape: 'square', label: `${s.el} US$/MWh`, dy: 22, tip: `Tarif ${s.el} US$/MWh → NPV ${fmt(interp(P.sensElec, s.el, 1), 2)}` }],
    hlines: [{ y: 0, label: 'NPV = 0' }],
    legend: [{ name: 'Harga metanol', color: C.teal, marker: 'circle' }, { name: 'Tarif listrik', color: C.blue, marker: 'square' }],
    table: { head: ['Harga metanol (US$/t)', 'NPV', 'IRR (%)', 'PBP', 'Tarif (US$/MWh)', 'NPV', 'IRR (%)', 'PBP'], rows: P.sensMeoh.map((r, i) => [r[0], fmt(r[1], 2), fmt(r[2], 1), tH(r[3]), P.sensElec[i][0], fmt(P.sensElec[i][1], 2), fmt(P.sensElec[i][2], 1), tH(P.sensElec[i][3])]) },
  });
  // intensitas vs EF
  cartesian($('#chEf'), {
    title: 'Intensitas emisi operasional vs faktor emisi listrik', sub: `Intensitas ≈ 0,134 + ${fmt(m.spec, 2)} × EF (kg CO₂-eq/kg metanol)`, unit: 'kg CO₂-eq/kg',
    x: { type: 'num', min: 0, max: 0.8, ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], fmt: v => fmt(v, 1), label: 'EF listrik (kg CO₂-eq/kWh)' }, y: { min: 0, max: 10, label: 'kg CO₂-eq/kg metanol', fmt: v => fmt(v, 0) },
    lines: [{ name: 'Basis 11,02 kWh/kg', color: C.orange, marker: 'circle', dp: 3, points: P.ef.map(r => [r[0], r[1]]), label: '11,02', labelDx: 8, labelDy: -2 },
      { name: 'Basis 10,95 kWh/kg', color: C.purple, marker: 'triangle', dash: true, dp: 3, points: P.ef.map(r => [r[0], r[2]]), label: '10,95', labelDx: 8, labelDy: 14 }],
    marks: [{ x: s.ef, y: m.inten, color: C.red, shape: 'diamond', label: `EF ${fmt(s.ef, 2)} → ${fmt(m.inten, 3)}`, dx: s.ef > 0.5 ? -12 : 12, anchor: s.ef > 0.5 ? 'end' : 'start', dy: -14, tip: `Skenario: ${fmt(m.inten, 3)} kg CO₂-eq/kg` }],
    legend: [{ name: 'Basis 11,02 kWh/kg', color: C.orange, marker: 'circle' }, { name: 'Basis 10,95 kWh/kg (pembanding)', color: C.purple, marker: 'triangle', dash: true }, { name: 'Skenario saat ini', color: C.red, marker: 'diamond' }],
    table: { head: ['EF (kg CO₂-eq/kWh)', 'Basis 11,02 kWh/kg', 'Basis 10,95 kWh/kg'], rows: P.ef.map(r => [fmt(r[0], 2), fmt(r[1], 3), fmt(r[2], 3)]) },
    note: 'Basis 10,95 kWh/kg ditampilkan sebagai pembanding; selisih kedua basis kecil dibanding pengaruh EF.',
  });
  // pendapatan vs OPEX
  const revM = P.base.meohYear * s.meoh / 1e6, opEl = 12.49 * s.el / 40;
  cartesian($('#chRevOp'), {
    title: 'Rincian pendapatan vs OPEX tahunan', sub: 'Tampilan rincian (tahun operasi penuh); KPI tetap dari analisis sensitivitas', unit: 'US$ juta/tahun',
    x: { type: 'cat', cats: ['Pendapatan', 'OPEX'] }, y: { min: 0, max: 30, label: 'US$ juta/tahun', fmt: v => fmt(v, 0) },
    bars: [{ name: 'Metanol (24.880 t × harga)', color: C.teal, stack: 'a', values: [revM, null] }, { name: 'Jasa pengolahan', color: C.lime, stack: 'a', values: [0.50, null] },
      { name: 'Surplus O₂', color: C.blue, stack: 'a', values: [0.433, null] }, { name: 'Listrik', color: C.orange, stack: 'a', values: [null, opEl] }, { name: 'OPEX lain', color: C.purple, stack: 'a', values: [null, 1.50] }],
    texts: [{ x: 0, y: revM + 0.933, dy: -8, t: `${fmt(revM + 0.933, 2)}` }, { x: 1, y: opEl + 1.5, dy: -8, t: `${fmt(opEl + 1.5, 2)}` }],
    legend: [{ name: 'Metanol', color: C.teal, kind: 'bar' }, { name: 'Jasa pengolahan', color: C.lime, kind: 'bar' }, { name: 'Surplus O₂', color: C.blue, kind: 'bar' }, { name: 'Listrik', color: C.orange, kind: 'bar' }, { name: 'OPEX lain', color: C.purple, kind: 'bar' }],
    table: { head: ['Komponen', 'US$ juta/tahun'], rows: [['Pendapatan metanol', fmt(revM, 2)], ['Jasa pengolahan', '0,50'], ['Surplus O₂', '0,433'], ['OPEX listrik (12,49 × tarif/40)', fmt(opEl, 2)], ['OPEX lain (tetap)', '1,50'], ['Selisih pendapatan − OPEX', fmt(revM + 0.933 - opEl - 1.5, 2)]] },
  });
  // GWP
  cartesian($('#chGwp'), {
    title: 'GWP per ton LPP: 3 jalur', sub: 'Metanol −80,95% vs landfill dan −62,57% vs WtE · LCA Cerqueira et al. (2025)', unit: 'kg CO₂-eq/ton LPP',
    x: { type: 'cat', cats: ['Landfill', 'WtE', 'Metanol'] }, y: { min: 0, max: 800, label: 'kg CO₂-eq/ton LPP', fmt: v => fmt(v, 0) },
    bars: [{ name: 'GWP', color: (v, i) => [C.blue, C.teal, C.lime][i], values: [672, 342, 128] }],
    texts: [{ x: 0, y: 672, dy: -8, t: '672' }, { x: 1, y: 342, dy: -8, t: '342' }, { x: 2, y: 128, dy: -8, t: '128', cls: 'strong' }],
    table: { head: ['Jalur', 'kg CO₂-eq/ton LPP'], rows: [['Landfill', '672'], ['WtE', '342'], ['Metanol', '128']] },
    note: 'Emisi langsung plant: 9,97 t CO₂/hari (4,57 tidak tertangkap + 5,40 tertangkap tetapi tidak dimanfaatkan) → 0,134 kg CO₂/kg metanol.',
  });
  // PEME −5%
  const pc = P.peme5, usd = s.tar === 0.04 ? pc.usd04 : pc.usd05;
  $('#dPemeCard').innerHTML = `<div class="ch-head"><div><h4>Skenario PEME −5%</h4><div class="ch-sub">Penghematan listrik PEME pada produksi tetap 74,72 t/hari</div></div>${s.peme ? '<span class="badge st-C">aktif</span>' : '<span class="badge base">nonaktif</span>'}</div>
    <div class="pc-bars ${s.peme ? '' : 'pc-off'}" role="img" aria-label="Daya PEME basis 33,10 MW, skenario 31,445 MW">
      <div class="pc-bar"><b>33,10</b><i style="height:100%;background:#8A9A94"></i><span>Basis (MW)</span></div>
      <span class="pc-delta">−1,655 MW</span>
      <div class="pc-bar"><b>31,445</b><i style="height:${31.445 / 33.1 * 100}%;background:var(--teal-500)"></i><span>−5% (MW)</span></div></div>
    <div class="pc-list"><span>Hemat energi (330 hari)</span><b>13,11 GWh/tahun</b><span>Nilai penghematan (${fmt(s.tar, 2)} US$/kWh)</span><b>US$${fmt(usd, 0)}/tahun</b>
      <span>Intensitas listrik PEME</span><b>10,63 → 10,10 MWh/ton</b><span>Konsumsi listrik untuk emisi</span><b>${s.peme ? '10,49 kWh/kg <span class="badge est">estimasi</span>' : '11,02 kWh/kg'}</b></div>`;
}
function summary(s, m) {
  return [`METHACYCLE · Ringkasan skenario dashboard`, `Harga metanol: US$${s.meoh}/ton · Tarif listrik: US$${s.el}/MWh · EF listrik: ${fmt(s.ef, 2)} kg CO₂-eq/kWh · PEME −5%: ${s.peme ? 'aktif' : 'nonaktif'}`,
    `NPV (10%): US$${fmt(m.npv, 2)} juta${m.combo ? ' (estimasi kombinasi)' : ''}`, `IRR: ${m.irr < 0 ? '<0' : fmt(m.irr, 1)}%`, `Simple PBP: ${tH(m.pbp)} tahun`, `PI: 2,65 (basis)`,
    `Harga impas metanol: ${typeof m.beM === 'string' ? m.beM : '≈US$' + fmt(m.beM, 0)}/ton`, `Tarif listrik impas: ${typeof m.beE === 'string' ? m.beE : '≈US$' + fmt(m.beE, 1)}/MWh`,
    `Intensitas emisi operasional: ${fmt(m.inten, 3)} kg CO₂-eq/kg metanol`, `Emisi tahunan: ${fmt(m.annual, 0)} t CO₂-eq/tahun (24.880 t metanol/tahun)`].join('\n');
}
