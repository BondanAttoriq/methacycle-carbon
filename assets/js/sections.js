// Bagian Neraca, 4E, ML, Ekonomi Sirkular, Unduhan & galeri.
import { $, $$, fmt, fmtAuto, esc, emit, getJSON, loadRegister, streamArea, MEDIUM, statusBadge } from './util.js';
import { P } from './paper-data.js';
import { cartesian, hbar, donut, tableHTML, showTip, hideTip, C, SEQ } from './charts.js';

export async function init() {
  neracaSankeys(); t4(); e4(); ml(); circ(); downloads();
  const reg = await loadRegister(); streamTable(reg);
}

// ================================================================ Sankey mini
function sankey(el, spec) {
  const W = spec.w || 640, H = spec.h || 330, cols = Math.max(...spec.nodes.map(n => n.col)) + 1, nw = 14, gap = spec.gap || 16;
  const byCol = [...Array(cols)].map((_, c) => spec.nodes.filter(n => n.col === c));
  const nodeVal = n => Math.max(spec.links.filter(l => l.t === n.id).reduce((s, l) => s + l.v, 0), spec.links.filter(l => l.s === n.id).reduce((s, l) => s + l.v, 0));
  const maxCol = Math.max(...byCol.map(ns => ns.reduce((s, n) => s + nodeVal(n), 0) + gap * (ns.length - 1)));
  const k = (H - 40) / maxCol; const N = {};
  byCol.forEach((ns, c) => { const tot = ns.reduce((s, n) => s + nodeVal(n) * k, 0) + gap * (ns.length - 1); let y = (H - tot) / 2;
    const x = 10 + c * (W - 20 - nw) / (cols - 1); ns.forEach(n => { const h = Math.max(3, nodeVal(n) * k); N[n.id] = { ...n, x, y, h, oi: 0, ii: 0 }; y += h + gap; }); });
  let g = '', hits = [];
  spec.links.forEach((l, i) => {
    const a = N[l.s], b = N[l.t], w = Math.max(1.5, l.v * k), y0 = a.y + a.oi + w / 2, y1 = b.y + b.ii + w / 2; a.oi += w; b.ii += w;
    const x0 = a.x + nw, x1 = b.x, mx = (x0 + x1) / 2;
    g += `<path class="flowp" data-i="${i}" data-col="${a.col}" d="M${x0},${y0}C${mx},${y0} ${mx},${y1} ${x1},${y1}" stroke="${l.c}" stroke-width="${w}" fill="none" stroke-opacity=".55"/>`;
    hits.push(`<b>${esc(a.label)} → ${esc(b.label)}</b><br>${fmt(l.v, 2)} ${spec.unit}`);
  });
  for (const n of Object.values(N)) {
    const right = n.col === cols - 1, mid = !right && n.col > 0;
    g += `<rect x="${n.x}" y="${n.y}" width="${nw}" height="${n.h}" rx="3" fill="${n.c}"/>`;
    const tx = right ? n.x - 8 : n.x + nw + 8, an = right ? 'end' : 'start', ty = n.y + n.h / 2;
    g += `<text x="${tx}" y="${ty - 3}" text-anchor="${an}" class="sv">${n.vt || fmt(nodeVal(n), 2)}</text><text x="${tx}" y="${ty + 13}" text-anchor="${an}">${esc(n.label)}</text>`;
  }
  el.innerHTML = `<div class="ch-head"><div><h4 class="ch-title">${spec.title}</h4><div class="ch-sub">${spec.sub || ''}</div></div><button class="btn-mini" data-tbl aria-expanded="false">Lihat data</button></div>
    <div class="ch-body sankey"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title)}">${g}</svg></div><div class="ch-table" hidden>${tableHTML(spec.table)}</div>${spec.note ? `<p class="ch-note">${spec.note}</p>` : ''}`;
  el.classList.add('chart');
  const b = el.querySelector('[data-tbl]'), t = el.querySelector('.ch-table'); b.onclick = () => { t.hidden = !t.hidden; b.setAttribute('aria-expanded', !t.hidden); b.textContent = t.hidden ? 'Lihat data' : 'Sembunyikan data'; };
  el.querySelectorAll('.flowp').forEach(p => { p.addEventListener('pointermove', e => showTip(hits[+p.dataset.i], e)); p.addEventListener('pointerleave', hideTip); });
}
function neracaSankeys() {
  const co2 = '#7D8C9E', h2 = '#D63FB0', me = '#1F9D55', w = '#3F8EE0', loss = '#C9B79C';
  sankey($('#sankeyC'), {
    title: 'Sankey karbon & sintesis', sub: 'Massa CO₂ dari CCU hingga e-methanol (t/hari)', unit: 't/hari', h: 380, gap: 34,
    nodes: [{ id: 'a', col: 0, label: 'CO₂ ke CCU', c: co2 }, { id: 'b', col: 1, label: 'Tertangkap (95,94%)', c: co2 }, { id: 'x1', col: 1, label: 'Tidak tertangkap → ST-301', c: loss },
      { id: 'h', col: 2, label: 'H₂ dari PEME', c: h2 }, { id: 'c', col: 2, label: 'Dimanfaatkan (95%)', c: co2 }, { id: 'x2', col: 2, label: 'Tidak dimanfaatkan (purge)', c: loss },
      { id: 's', col: 3, label: 'Sintesis R-401', c: '#B58A2E', vt: '116,93' }, { id: 'm', col: 4, label: 'e-Methanol 99,76%', c: me }, { id: 'w', col: 4, label: 'Air sintesis → U-702', c: w }],
    links: [{ s: 'a', t: 'b', v: 108.03, c: co2 }, { s: 'a', t: 'x1', v: 4.57, c: loss }, { s: 'b', t: 'c', v: 102.63, c: co2 }, { s: 'b', t: 'x2', v: 5.40, c: loss },
      { s: 'c', t: 's', v: 102.63, c: co2 }, { s: 'h', t: 's', v: 14.3, c: h2 }, { s: 's', t: 'm', v: 74.72, c: me }, { s: 's', t: 'w', v: 42.0, c: w }],
    table: { head: ['Aliran', 't/hari'], rows: [['CO₂ ke CCU', '112,60'], ['CO₂ tertangkap (95,94%)', '108,03'], ['CO₂ tidak tertangkap', '4,57'], ['CO₂ dimanfaatkan (95%)', '102,63'], ['CO₂ tidak dimanfaatkan', '5,40'], ['H₂ PEME', '14,30'], ['e-Methanol', '74,72'], ['Air sintesis', '42,00']] },
    note: 'Total CO₂ residual 9,97 t/hari (CO₂ ke CCU 112,60–112,72 t/hari). Massa masuk sintesis 116,93 vs keluar 116,72 t/hari.',
  });
  const e1 = '#B88A5E', e2 = '#6BA539', e3 = '#7A5BB0', e4c = '#1F6FB5';
  sankey($('#sankeyE'), {
    title: 'Sankey energi', sub: 'Efisiensi 29,62% (berbasis metanol) → 32,62% (dengan WHR)', unit: 'MW', h: 380, gap: 26,
    nodes: [{ id: 'l', col: 0, label: 'Energi kimia LPP', c: e1 }, { id: 'g', col: 0, label: 'CH₄ dalam LFG', c: e2 }, { id: 'p', col: 0, label: 'Listrik PEME (MWe)', c: e3 }, { id: 'u', col: 0, label: 'Listrik CCU (MWe)', c: e4c },
      { id: 'sy', col: 1, label: 'Total energi masuk', c: '#127466', vt: '58,11' }, { id: 'm', col: 2, label: 'Energi kimia metanol', c: '#1F9D55' }, { id: 'wh', col: 2, label: 'Listrik bersih WHR (≈)', c: '#E8862A' },
      { id: 'ls', col: 2, label: 'Selisih: kehilangan & panas lain', c: '#C9D4CF' }],
    links: [{ s: 'l', t: 'sy', v: 18.85, c: e1 }, { s: 'g', t: 'sy', v: 4.97, c: e2 }, { s: 'p', t: 'sy', v: 33.10, c: e3 }, { s: 'u', t: 'sy', v: 1.20, c: e4c },
      { s: 'sy', t: 'm', v: 17.21, c: '#1F9D55' }, { s: 'sy', t: 'wh', v: 1.75, c: '#E8862A' }, { s: 'sy', t: 'ls', v: 58.11 - 17.21 - 1.75, c: '#C9D4CF' }],
    table: { head: ['Komponen', 'MW'], rows: [['Energi kimia LPP', '18,85'], ['Energi kimia CH₄ dalam LFG', '4,97'], ['Listrik PEME', '33,10'], ['Listrik CCU', '1,20'], ['Total energi masuk', '58,11'], ['Energi kimia metanol', '17,21'], ['Potensi listrik bersih WHR', '≈1,75'], ['Selisih (dihitung: 58,11 − 17,21 − 1,75)', fmt(58.11 - 17.21 - 1.75, 2)]] },
  });
}
function t4() {
  const it = [['H₂ dari PEME', '14,3', 't/hari', 'stoikiometrik 14,0; utilisasi 98%'], ['O₂ dari PEME', '114,37', 't/hari', '101,03 ke OEC · surplus 13,33'], ['Air elektrolisis', '128,6', 't/hari', 'umpan PEME'],
    ['Air sintesis', '42,0', 't/hari', 'peluang daur ulang ke PEME'], ['Konsumsi spesifik PEME', '55,2', 'kWh/kg H₂', '33,10 MWe'], ['Abu', '15,27', 't/hari', 'residu furnace OEC']];
  const cnt = v => { const d = (v.split(',')[1] || '').length; return `<span data-count="${v.replace(/\./g, '').replace(',', '.')}" data-dec="${d}">${v}</span>`; };
  $('#t4').innerHTML = it.map(([l, v, u, s]) => `<div class="kt"><div class="kl">${l}</div><div class="kv2">${cnt(v)}<small> ${u}</small></div><div class="kd flat">${s}</div></div>`).join('');
}

// ================================================================ tabel aliran
function streamTable(reg) {
  const el = $('#streamTable'); const meds = [...new Set(reg.list.map(s => s.medium))];
  const areas = [...new Set(reg.list.map(s => streamArea(s, reg.EQ)).filter(Boolean))].sort();
  el.innerHTML = `<div class="ch-head"><div><h4 class="ch-title">Tabel aliran (neraca_aliran + ukuran_pipa)</h4><div class="ch-sub">Klik baris untuk menyorot aliran di SCADA, atau tombol 3D untuk model</div></div><span class="st-count" id="stCount"></span></div>
    <div class="st-tools"><label class="sr-only" for="stQ" style="position:absolute;left:-9999px">Cari aliran</label><input id="stQ" type="search" placeholder="Cari ID, nama PFD, atau tag unit…" aria-label="Cari aliran">
    <select id="stMed" aria-label="Filter medium"><option value="">Semua medium</option>${meds.map(m => `<option>${esc(m)}</option>`).join('')}</select>
    <select id="stArea" aria-label="Filter area"><option value="">Semua area</option>${areas.map(a => `<option value="${a}">Area ${a}</option>`).join('')}</select></div>
    <div class="st-wrap"><table class="st-tbl"><thead><tr><th>ID</th><th>Nama PFD</th><th>Medium</th><th>Dari → Ke</th><th>Area</th><th>Laju</th><th>Satuan</th><th>Status</th><th>T (°C)</th><th>P (bar a)</th><th>DN</th><th>v (m/s)</th><th></th></tr></thead><tbody id="stBody"></tbody></table></div>`;
  const draw = () => {
    const q = $('#stQ').value.toLowerCase(), m = $('#stMed').value, a = $('#stArea').value;
    const rows = reg.list.filter(s => (!m || s.medium === m) && (!a || streamArea(s, reg.EQ) === a) && (!q || [s.stream_id, s.pfd_name, s.from_tag, s.to_tag].join(' ').toLowerCase().includes(q)));
    $('#stCount').textContent = `${rows.length} dari ${reg.list.length} aliran`;
    $('#stBody').innerHTML = rows.map(s => { const p = s.pipe || {}; return `<tr tabindex="0" data-sid="${esc(s.stream_id)}"><td class="n"><b>${esc(s.stream_id)}</b></td><td>${esc(s.pfd_name)}</td>
      <td><span class="med"><i style="background:${(MEDIUM[s.medium] || ['#999'])[0]}"></i>${esc(s.medium)}</span></td><td>${esc(s.from_tag)} → ${esc(s.to_tag)}</td><td>${streamArea(s, reg.EQ) || '·'}</td>
      <td class="n">${s.qst === 'SIAGA' ? 'siaga' : s.q === null ? 'n/a' : fmtAuto(s.q)}</td><td>${esc(s.u)}</td><td>${statusBadge(s.qst)}</td><td class="n">${p.T ?? '·'}</td><td class="n">${p.P !== null && p.P !== undefined ? fmt(p.P, 2) : '·'}</td>
      <td class="n">${p.DN ?? '·'}</td><td class="n">${p.v !== null && p.v !== undefined ? fmt(p.v, 2) : '·'}</td><td class="acts"><button data-3d="${esc(s.stream_id)}" aria-label="Lihat aliran ${esc(s.stream_id)} di 3D">3D</button></td></tr>`; }).join('');
    $$('#stBody tr').forEach(tr => { const go = () => emit('show-scada', { sid: tr.dataset.sid }); tr.onclick = e => { if (!e.target.closest('[data-3d]')) go(); }; tr.onkeydown = e => { if (e.key === 'Enter') go(); }; });
    $$('#stBody [data-3d]').forEach(b => b.onclick = () => emit('show-3d', { sid: b.dataset['3d'] }));
  };
  ['stQ', 'stMed', 'stArea'].forEach(id => $('#' + id).addEventListener('input', draw)); draw();
}

// ================================================================ 4E
function e4() {
  $$('.e4-tabs [data-e4]').forEach(b => b.onclick = () => { $$('.e4-tabs [data-e4]').forEach(x => x.setAttribute('aria-selected', x === b)); $$('.e4-pane').forEach(p => p.hidden = p.dataset.e4p !== b.dataset.e4); });
  // Energi
  const ring = (p1, p2) => { const r = 54, c = 2 * Math.PI * r; return `<svg class="eff-ring" viewBox="0 0 130 130" aria-hidden="true" data-ring><circle cx="65" cy="65" r="${r}" stroke="#DFF1E6" stroke-width="14" fill="none"/>
    <circle data-arc cx="65" cy="65" r="${r}" stroke="#E8862A" stroke-width="14" fill="none" stroke-dasharray="${c * p2 / 100} ${c}" transform="rotate(-90 65 65)" stroke-linecap="round"/>
    <circle data-arc cx="65" cy="65" r="${r}" stroke="#129B8A" stroke-width="14" fill="none" stroke-dasharray="${c * p1 / 100} ${c}" transform="rotate(-90 65 65)" stroke-linecap="round"/></svg>`; };
  $('#e4Energi').innerHTML = `<div class="e4-grid"><div class="card eff-card"><h3 class="h-sm">Efisiensi energi sistem</h3><div class="eff-big">${ring(29.62, 32.62)}<div><b data-count="32.62" data-dec="2" data-suffix="%">32,62%</b><div class="muted">terintegrasi dengan WHR (≈1,75 MWe)</div><div style="margin-top:6px"><b style="font-size:24px;color:var(--teal-500)" data-count="29.62" data-dec="2" data-suffix="%">29,62%</b> <span class="muted">berbasis metanol</span></div></div></div>
    <ul class="ticks"><li>Energi kimia metanol 17,21 MW (LHV 19,9 MJ/kg) dari total masukan 58,11 MW.</li><li>Konsumsi listrik utama sebelum WHR 34,30 MW: ketergantungan pada listrik eksternal rendah karbon.</li><li>Beban pengeringan ≈1,35 MWth dapat dipenuhi sebagian oleh panas reaksi sintesis ≈1,34 MWth.</li></ul></div>
    <div class="card" id="e4Bar"></div></div>`;
  hbar($('#e4Bar'), { title: 'Komponen masukan & keluaran energi', unit: 'MW', labelW: 220,
    rows: [['Listrik PEME', 33.10, C.purple], ['Energi kimia LPP', 18.85, '#B88A5E'], ['Energi kimia metanol (keluaran)', 17.21, '#1F9D55'], ['Energi kimia CH₄ LFG', 4.97, C.lime], ['WHR listrik bersih (keluaran)', 1.75, C.orange], ['Pengeringan LPP (beban termal)', 1.35, '#8A9A94'], ['Panas reaksi sintesis', 1.34, '#8A9A94'], ['Listrik CCU', 1.20, C.blue]],
    vfmt: v => fmt(v, 2) + ' MW', table: { head: ['Komponen', 'MW'], rows: [['Listrik PEME', '33,10'], ['Energi kimia LPP', '18,85'], ['Energi kimia metanol', '17,21'], ['CH₄ LFG', '4,97'], ['WHR', '≈1,75'], ['Pengeringan', '≈1,35'], ['Panas sintesis', '≈1,34'], ['Listrik CCU', '1,20']] } });
  // Eksergi
  const ex = P.exergy;
  $('#e4Eksergi').innerHTML = `<div class="e4-grid"><div class="card"><h3 class="h-sm">Distribusi eksergi dan irreversibilitas</h3>
    <div class="eff-big"><div><div class="muted">Eksergi masuk</div><b>${fmt(ex.input / 1000, 0)} MW</b></div><div><div class="muted">Eksergi produk</div><b style="color:#1F9D55">79,85%</b></div></div>
    <ul class="ticks"><li>Irreversibilitas terbesar pada biogas upgrading (15,89%) dan produksi metanol (2,89%).</li><li>Pembakaran, pemisahan, dan elektrolisis menjadi fokus integrasi panas untuk menekan kehilangan mutu energi.</li></ul></div><div class="card" id="e4Ex"></div></div>`;
  hbar($('#e4Ex'), { title: 'Destruksi/keluaran eksergi per unit (sistem pembanding)', sub: 'Persentase terhadap eksergi masuk 4.830.405 kW', unit: '%', labelW: 210, max: 16,
    rows: ex.losses.map(r => [r[0], r[2], r[2] > 2 ? C.red : C.orange]), vfmt: (v, r) => `${fmt(v, 2)}% · ${fmt(ex.losses.find(x => x[0] === r[0])[1], 0)} kW`,
    table: { head: ['Unit', 'kW', '%'], rows: [[ex.product[0], fmt(ex.product[1], 0), fmt(ex.product[2], 2)], ...ex.losses.map(r => [r[0], fmt(r[1], 0), fmt(r[2], 2)])] } });
  // Lingkungan: small multiples bertanda (satuan berbeda per kategori)
  const cols = [C.blue, C.teal, C.lime], names = ['Landfill', 'WtE', 'Metanol'];
  const rows = P.lcia.map(([cat, unit, ...v]) => {
    const mx = Math.max(...v.map(Math.abs)), W = 420, mid = 150, sc = 140 / mx;
    const bars = v.map((x, i) => { const w = Math.abs(x) * sc, y = 4 + i * 16; return `<rect x="${x >= 0 ? mid : mid - w}" y="${y}" width="${Math.max(1.5, w)}" height="12" rx="3" fill="${cols[i]}"/><text x="${x >= 0 ? mid + w + 5 : mid - w - 5}" y="${y + 10}" text-anchor="${x >= 0 ? 'start' : 'end'}" class="ax">${fmt(x, Math.abs(x) >= 100 ? 0 : 3)}</text>`; }).join('');
    return `<div class="lcia-row"><div class="ln">${cat}<small>${unit} per ton LPP</small></div><svg viewBox="0 0 ${W} 54" role="img" aria-label="${esc(cat)}: ${v.map((x, i) => names[i] + ' ' + fmt(x, 3)).join(', ')}"><line x1="${mid}" x2="${mid}" y1="0" y2="54" stroke="#9FB5AC"/>${bars}</svg></div>`;
  }).join('');
  $('#e4Ling').innerHTML = `<div class="card"><div class="ch-head"><div><h3 class="h-sm" style="margin:0">LCIA pembanding Landfill, WtE, dan produksi metanol</h3><div class="ch-sub">Sumber LCA: Cerqueira et al. (2025). Nilai negatif = manfaat/penghindaran dampak. Skala tiap baris berbeda (satuan berbeda).</div></div><button class="btn-mini" data-tbl aria-expanded="false">Lihat data</button></div>
    <div class="ch-legend">${names.map((n, i) => `<span class="lg"><svg width="16" height="12"><rect width="16" height="12" rx="3" fill="${cols[i]}"/></svg>${n}</span>`).join('')}</div>${rows}
    <div class="ch-table" hidden>${tableHTML({ head: ['Kategori', 'Satuan', 'Landfill', 'WtE', 'Metanol'], rows: P.lcia.map(r => [r[0], r[1], fmt(r[2], 3), fmt(r[3], 3), fmt(r[4], 3)]) })}</div>
    <p class="ch-note">Penurunan GWP jalur metanol: 80,95% terhadap landfill dan 62,57% terhadap WtE.</p></div>`;
  const lb = $('#e4Ling [data-tbl]'), lt = $('#e4Ling .ch-table'); lb.onclick = () => { lt.hidden = !lt.hidden; lb.setAttribute('aria-expanded', !lt.hidden); lb.textContent = lt.hidden ? 'Lihat data' : 'Sembunyikan data'; };
  // Ekonomi
  const I = P.ind, tile = (l, v, s) => `<div class="kt"><div class="kl">${l}</div><div class="kv2">${v}</div><div class="kd flat">${s}</div></div>`;
  $('#e4Eko').innerHTML = `<div class="tiles">${tile('CAPEX', '<small>US$</small><span data-count="13" data-dec="2">13,00</span><small> juta</small>', 'investasi awal')}${tile('OPEX', '<small>US$</small><span data-count="13.99" data-dec="2">13,99</span><small> juta/th</small>', 'biaya operasi tahunan')}${tile('NPV 10%', '<small>US$</small><span data-count="21.47" data-dec="2">21,47</span><small> juta</small>', 'umur 20 tahun')}${tile('IRR', '<span data-count="28.5" data-dec="1" data-suffix="%">28,5%</span>', 'di atas diskonto 10%')}${tile('PI', '<span data-count="2.65" data-dec="2">2,65</span>', 'profitability index')}${tile('PBP', '<span data-count="3.71" data-dec="2">3,71</span><small> th</small>', 'discounted 4,7 tahun')}</div>
    <div class="e4-grid"><div class="card" id="e4Capex"></div><div class="card" id="e4Opex"></div></div>
    <div class="card" style="margin-top:18px"><h3 class="h-sm">Perbandingan dengan literatur</h3><div class="ch-table">${tableHTML({ head: ['Studi', 'Umpan', 'Teknologi', 'Kapasitas umpan', 'Biaya MeOH (US$/ton)', 'PBP'], rows: P.lit })}</div>
    <p class="ch-note">Biaya operasi kotor US$562/ton; biaya metanol ≈US$624/ton. Revenue 19,59 · EBITDA 5,60 · FCF 4,37 (US$ juta/tahun).</p></div>`;
  donut($('#e4Capex'), { title: 'Rincian CAPEX', sub: 'US$ juta, total 13,00', items: P.capex.map((r, i) => [r[0], r[1], SEQ[i]]), center: ['13,00', 'US$ juta'],
    table: { head: ['Komponen', 'US$ juta'], rows: [...P.capex.map(r => [r[0], fmt(r[1], 2)]), ['Total', '13,00']] } });
  hbar($('#e4Opex'), { title: 'Rincian OPEX tahunan', sub: 'US$ juta/tahun, total 13,99', unit: 'US$ juta/tahun', labelW: 250,
    rows: P.opex.map(r => [r[0], r[1], r[1] > 1 ? C.orange : C.teal]), vfmt: v => fmt(v, 2), table: { head: ['Komponen', 'US$ juta/tahun'], rows: [...P.opex.map(r => [r[0], fmt(r[1], 2)]), ['Total', '13,99']] } });
}

// ================================================================ ML: kubus CCD, operating window, alur
function ml() {
  const pts = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) pts.push({ k: 'f', p: [a, b, c], l: `(${a > 0 ? '+1' : '−1'}, ${b > 0 ? '+1' : '−1'}, ${c > 0 ? '+1' : '−1'})` });
  const A = 1.68; [[A, 0, 0], [-A, 0, 0], [0, A, 0], [0, -A, 0], [0, 0, A], [0, 0, -A]].forEach(p => pts.push({ k: 'a', p, l: `(${p.map(v => v === 0 ? '0' : v > 0 ? '+α' : '−α').join(', ')})` }));
  pts.push({ k: 'c', p: [0, 0, 0], l: '(0, 0, 0) × 6 replikasi' });
  const col = { f: C.blue, a: C.orange, c: '#1F9D55' }, shp = { f: 'circle', a: 'diamond', c: 'square' }, nm = { f: 'Titik faktorial', a: 'Titik aksial', c: 'Titik pusat' };
  $('#mlCube').innerHTML = `<div class="ch-head"><div><h4 class="ch-title">Desain CCD 3 faktor · 20 run</h4><div class="ch-sub">Seret untuk memutar · klik titik untuk level terkode</div></div></div>
    <div class="cube-wrap"><svg viewBox="-200 -170 400 340" id="cubeSvg" role="img" aria-label="Kubus central composite design 3 faktor: 8 faktorial, 6 aksial, 6 pusat"></svg></div>
    <div class="cube-leg"><span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="${C.blue}"/></svg>8 faktorial</span><span><svg width="14" height="14"><polygon points="7,1 13,7 7,13 1,7" fill="${C.orange}"/></svg>6 aksial (±α)</span><span><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="#1F9D55"/></svg>6 pusat</span><b>= 20 run</b></div>
    <div class="cube-info" id="cubeInfo" aria-live="polite">Faktor: x₁ rasio suplai O₂ · x₂ rasio H₂/CO₂ · x₃ temperatur sintesis.</div>`;
  let yaw = -0.65, pitch = 0.42, sel = null; const svg = $('#cubeSvg');
  const proj = ([x, y, z]) => { const s = 70, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const X = x * cy - y * sy, Y0 = x * sy + y * cy, Z = z; const Y = Y0 * sp + Z * cp, D = -Y0 * cp + Z * sp; return [X * s, -Y * s * 0.98, D]; };
  const draw = () => {
    const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    let g = E.map(([a, b]) => { const p = proj(V[a]), q = proj(V[b]); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#9FB5AC" stroke-width="1.6"/>`; }).join('');
    for (const ax of [[2.3, 0, 0, 'x₁ suplai O₂'], [0, 2.3, 0, 'x₂ H₂/CO₂'], [0, 0, 2.25, 'x₃ T sintesis']]) { const p = proj(ax), o = proj([0, 0, 0]); g += `<line x1="${o[0]}" y1="${o[1]}" x2="${p[0]}" y2="${p[1]}" stroke="#C9D9D2" stroke-dasharray="3 4"/><text x="${p[0]}" y="${p[1]}" class="ax" text-anchor="middle" style="font-size:12px;font-weight:600;fill:#17322A">${ax[3]}</text>`; }
    const order = pts.map((p, i) => ({ i, d: proj(p.p)[2] })).sort((a, b) => a.d - b.d);
    for (const { i } of order) { const p = pts[i], [x, y] = proj(p.p), r = sel === i ? 9 : 7;
      const s = shp[p.k] === 'diamond' ? `<polygon points="${x},${y - r * 1.25} ${x + r * 1.25},${y} ${x},${y + r * 1.25} ${x - r * 1.25},${y}"` : shp[p.k] === 'square' ? `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="2"` : `<circle cx="${x}" cy="${y}" r="${r}"`;
      g += `<g class="cube-pt" data-i="${i}" tabindex="0" role="button" aria-label="${nm[p.k]} ${p.l}">${s} fill="${col[p.k]}" stroke="#fff" stroke-width="2"/>${p.k === 'c' ? `<text x="${x + 12}" y="${y - 8}" class="ax" style="font-weight:700">×6</text>` : ''}</g>`; }
    svg.innerHTML = g;
    svg.querySelectorAll('.cube-pt').forEach(n => { const pick = () => { sel = +n.dataset.i; const p = pts[sel]; $('#cubeInfo').innerHTML = `<b>${nm[p.k]}</b> level terkode (x₁, x₂, x₃) = <code>${p.l}</code>${p.k === 'a' ? ' · α: jarak aksial desain rotatable' : ''}`; draw(); };
      n.addEventListener('click', pick); n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }); });
  };
  draw();
  let dr = null; svg.addEventListener('pointerdown', e => { if (e.target.closest('.cube-pt')) return; dr = [e.clientX, e.clientY, yaw, pitch]; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => { if (!dr) return; yaw = dr[2] + (e.clientX - dr[0]) * 0.01; pitch = Math.max(-0.2, Math.min(1.3, dr[3] + (e.clientY - dr[1]) * 0.008)); draw(); });
  svg.addEventListener('pointerup', () => dr = null);
  // operating window konseptual
  let ell = ''; ['#E3F4EA', '#BFE6CF', '#8FD3AE', '#58B98A', '#2B9A6C', '#147A53'].forEach((c, i) => { const s = 1 - i * 0.15; ell += `<ellipse cx="0" cy="0" rx="${150 * s}" ry="${82 * s}" fill="${c}" transform="rotate(-14)"/>`; });
  $('#mlWindow').innerHTML = `<div class="ch-head"><div><h4 class="ch-title">Peta operating window</h4><div class="ch-sub">Respons: produksi metanol, konsumsi listrik PEME, efisiensi energi, intensitas emisi</div></div></div>
    <svg viewBox="-230 -150 460 320" role="img" aria-label="Operating window: kontur respons terhadap rasio H2/CO2 dan temperatur sintesis">
      <rect x="-200" y="-125" width="400" height="250" fill="#F6FBF8" stroke="#CFE6DC"/>${ell}
      <ellipse cx="6" cy="-4" rx="46" ry="24" fill="none" stroke="#17322A" stroke-width="2" stroke-dasharray="6 4" transform="rotate(-14)"/>
      <circle cx="6" cy="-4" r="5" fill="#17322A"/><text x="16" y="-14" class="ax" style="font-weight:700;fill:#17322A;font-size:13px">Operating window</text>
      <text x="0" y="152" text-anchor="middle" class="ax" style="font-size:13px;font-weight:600;fill:#17322A">Temperatur sintesis (rentang paper 240–300 °C)</text>
      <text transform="translate(-216 0) rotate(-90)" text-anchor="middle" class="ax" style="font-size:13px;font-weight:600;fill:#17322A">Rasio H₂/CO₂ (basis = 3)</text>
      <text x="-196" y="140" class="ax">240</text><text x="196" y="140" text-anchor="end" class="ax">300</text></svg>`;
  // alur + benchmark + validasi
  const steps = [['01', 'CCD', '20 kombinasi operasi: 8 faktorial, 6 aksial, 6 pusat'], ['02', 'Regresi kuadratik', '10 koefisien: intersep, 3 linear, 3 kuadratik, 3 interaksi'],
    ['03', 'ANOVA', 'Uji signifikansi faktor dan interaksi'], ['04', 'Model tereduksi', 'Hapus suku tidak signifikan'], ['05', 'Operating window', 'Kompromi produksi, efisiensi, emisi']];
  $('#mlFlow').innerHTML = `<h3 class="h-sm">Alur kerangka optimasi</h3><div class="flowsteps">${steps.map(s => `<div class="fs"><em>${s[0]}</em><b>${s[1]}</b><p>${s[2]}</p></div>`).join('')}</div>
    <div class="ml-bottom"><div><h4 class="h-sm">Faktor &amp; respons</h4><div class="resp">${P.ml.factors.map(f => `<span>${f}</span>`).join('')}</div><div class="resp" style="margin-top:8px">${P.ml.responses.map(f => `<span style="background:#FFF1DD;color:#7A4510">${f}</span>`).join('')}</div></div>
    <div class="bench"><span class="lbl-lit">Benchmark Zhang et al. (2024)</span><b>R² 99,79–99,99%</b><small>Galat prediksi &lt; 2% pada sistem Zhang et al. (2024)</small></div>
    <div><h4 class="h-sm">Rencana validasi</h4><ul class="ticks"><li>Pembagian data train/test dari simulasi atau operasi tervalidasi</li><li>Evaluasi RMSE dan galat relatif</li><li>Pemeriksaan konsistensi neraca massa-energi</li></ul></div></div>`;
}

// ================================================================ Ekonomi sirkular
function circ() {
  const S = [
    ['01', 'Umpan LPP + LFG|', '100 t/hari · 1.000 Nm³/jam', 'Sampah padat perkotaan yang telah disortir dan landfill gas TPST Bantargebang menjadi sumber karbon.', 2, '#1F9D55', 'i-trash'],
    ['02', 'Oxygen-Enriched|Combustion', 'O₂ PEME 101,03 t/hari', 'Pembakaran dengan pengayaan oksigen menghasilkan flue gas kaya CO₂ yang mudah ditangkap.', 6, '#E5484D', 'i-fuel'],
    ['03', 'CCU +|PEM Electrolyzer', 'CO₂ 108,03 · H₂ 14,3 t/hari', 'CO₂ ditangkap dan dikondisikan; PEME menghasilkan H₂ hijau untuk sintesis dan O₂ untuk OEC.', 8, '#1F6FB5', 'i-bolt'],
    ['04', 'Sintesis|Metanol', '74,72 t/hari · 99,76%', 'CO₂ + H₂ dikonversi di reaktor Cu/ZnO/Al₂O₃ lalu dimurnikan menjadi e-methanol.', 10, '#7A5BB0', 'i-flask'],
    ['05', 'Waste Heat|Recovery', 'ORC ≈1,75 MWe', 'Panas buang dipulihkan untuk pengeringan, pemanasan umpan, reboiler, dan listrik ORC.', 12, '#C2410C', 'i-rotate'],
    ['06', 'Water Treatment|& Residu', 'Air sintesis 42,0 t/hari', 'Air sintesis dan kondensat diolah untuk daur ulang ke PEME; abu dan residu dikelola lanjut.', 13, '#8A5A2B', 'i-recycle']];
  const R = 190, cx = 300, cy = 260, pos = S.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  let g = `<defs><marker id="cArr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="#127466"/></marker></defs>`;
  for (let i = 0; i < 6; i++) { const a0 = -Math.PI / 2 + i * Math.PI / 3 + 0.27, a1 = -Math.PI / 2 + (i + 1) * Math.PI / 3 - 0.27;
    g += `<path class="cflow" d="M${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 0 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)}" stroke="${S[i][5]}" marker-end="url(#cArr)"/>`; }
  const loop = (i, j, c, lbl) => { const [x0, y0] = pos[i], [x1, y1] = pos[j]; const mx = (x0 + x1) / 2 * 0.55 + cx * 0.45, my = (y0 + y1) / 2 * 0.55 + cy * 0.45;
    return `<path class="cflow loop" d="M${x0 + (cx - x0) * .28},${y0 + (cy - y0) * .28} Q${mx},${my} ${x1 + (cx - x1) * .28},${y1 + (cy - y1) * .28}" stroke="${c}" marker-end="url(#cArr)"/><text x="${mx}" y="${my}" text-anchor="middle" class="ax" style="font-weight:700;fill:${c};font-size:12px">${lbl}</text>`; };
  g += loop(2, 1, '#1F6FB5', 'loop O₂') + loop(5, 2, '#0C8EA6', 'loop air → PEME');
  g += `<circle cx="${cx}" cy="${cy}" r="70" fill="#EEF7F1" stroke="#CFE6DC" stroke-width="2"/><text x="${cx}" y="${cy - 8}" text-anchor="middle" style="font:italic 800 18px Poppins,sans-serif;fill:#127466">Ekonomi</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font:italic 800 18px Poppins,sans-serif;fill:#127466">Sirkular</text><text x="${cx}" y="${cy + 34}" text-anchor="middle" style="font:700 12px Poppins,sans-serif;fill:#4F655D">METHACYCLE</text>`;
  S.forEach((s, i) => { const [x, y] = pos[i];
    g += `<g class="stage" data-i="${i}" tabindex="0" role="button" aria-label="Tahap ${s[0]}: ${esc(s[1].replace('|', ' '))}"><g class="sbg"><circle cx="${x}" cy="${y}" r="54" fill="#fff" stroke="${s[5]}" stroke-width="3"/>
      <circle cx="${x - 40}" cy="${y - 40}" r="17" fill="${s[5]}"/><text x="${x - 40}" y="${y - 35}" text-anchor="middle" style="font:800 13px Poppins,sans-serif;fill:#fff">${s[0]}</text>
      <svg x="${x - 16}" y="${y - 30}" width="32" height="32" viewBox="0 0 24 24" style="color:${s[5]}"><use href="#${s[6]}"/></svg>
      <text x="${x}" y="${y + 14}" text-anchor="middle" style="font:700 11px Poppins,sans-serif;fill:#17322A">${esc(s[1].split('|')[0])}</text>
      <text x="${x}" y="${y + 28}" text-anchor="middle" style="font:700 11px Poppins,sans-serif;fill:#17322A">${esc(s[1].split('|')[1])}</text></g></g>`; });
  $('#circ').innerHTML = `<div class="card"><svg viewBox="40 0 520 520" role="img" aria-label="Siklus enam tahap ekonomi sirkular METHACYCLE">${g}</svg></div><div class="card circ-detail" id="circD" aria-live="polite"></div>`;
  const det = i => { const s = S[i]; $('#circD').style.borderLeftColor = s[5];
    $('#circD').innerHTML = `<span class="cd-num" style="background:${s[5]}">${s[0]}</span><h3>${esc(s[1].replace('|', ' ').trim())}</h3><div class="big">${esc(s[2])}</div><p>${esc(s[3])}</p><button class="btn btn-teal sm" data-stop="${s[4]}"><svg><use href="#i-play"/></svg>Lihat di tur 3D (perhentian ${s[4] + 1})</button>`;
    $('#circD [data-stop]').onclick = () => emit('goto-stop', { i: s[4] }); $$('#circ .stage').forEach(n => n.classList.toggle('on', +n.dataset.i === i)); };
  $$('#circ .stage').forEach(n => { const i = +n.dataset.i; n.addEventListener('pointerenter', () => det(i)); n.addEventListener('click', () => det(i)); n.addEventListener('focus', () => det(i)); });
  det(0);
}

// ================================================================ Unduhan + galeri + lightbox
async function downloads() {
  const d = 'assets/downloads/';
  const card = (ico, c, t, s, href, extra = '') => `<a class="dl" href="${href}" download><span class="ico-c" style="--c:${c}"><svg><use href="#${ico}"/></svg></span><b>${t}</b><small>${s}</small>${extra}<span class="dlb"><svg><use href="#i-down"/></svg>Unduh</span></a>`;
  $('#dlGrid').innerHTML = card('i-flask', '#0C5A72', 'Full paper (PDF)', 'CARBON Essay Competition 2026 · 25 halaman', d + 'METHACYCLE_Full_Paper.pdf')
    + card('i-present', '#127466', 'Poster', 'PNG 2829 × 4000 px', d + 'POSTER_METHACYCLE.png')
    + card('i-camera', '#1F7A4D', 'Render HD', '17 render perhentian tur (ZIP)', d + 'METHACYCLE_render_HD.zip')
    + `<div class="dl"><span class="ico-c" style="--c:#3AA76D"><svg><use href="#i-chart"/></svg></span><b>Register (CSV)</b><small>Data register METHACYCLE v4</small><div class="dl-sub">
      ${[['equipment_register.csv', 'Peralatan (100 unit)'], ['stream_register.csv', 'Aliran'], ['neraca_aliran.csv', 'Neraca aliran'], ['ukuran_pipa.csv', 'Ukuran pipa']].map(([f, n]) => `<a href="${d + f}" download><svg><use href="#i-down"/></svg>${n}</a>`).join('')}</div></div>`
    + card('i-link', '#0C8EA6', 'PFD berwarna', 'JPG 1920 × 1080 px', d + 'PFD_eMethanol_Berwarna_FullHD.jpg');
  const data = await getJSON('assets/data/data.json');
  const items = data.tour.stops.map((s, i) => [`assets/img/render/${String(i + 1).padStart(2, '0')}_${s.id}.jpg`, `assets/img/thumb/${String(i + 1).padStart(2, '0')}_${s.id}.jpg`, `${i + 1}. ${s.title}`])
    .concat([['assets/img/gambar4_aksonometri.jpg', 'assets/img/gambar4_aksonometri.jpg', 'Ilustrasi aksonometri sistem'], ['assets/img/pfd.jpg', 'assets/img/pfd.jpg', 'PFD berwarna METHACYCLE'], ['assets/img/poster.jpg', 'assets/img/poster.jpg', 'Poster CARBON Essay Competition 2026']]);
  $('#gallery').innerHTML = items.map((it, i) => `<button data-i="${i}" aria-label="Buka ${esc(it[2])}"><img src="${it[1]}" alt="${esc(it[2])}" loading="lazy" width="400" height="225"><span>${esc(it[2])}</span></button>`).join('');
  const lb = $('#lightbox'), img = lb.querySelector('img'), cap = lb.querySelector('figcaption'); let cur = 0, last = null;
  const open = i => { cur = (i + items.length) % items.length; img.src = items[cur][0]; img.alt = items[cur][2]; cap.textContent = items[cur][2]; lb.hidden = false; lb.querySelector('.lb-x').focus(); };
  $$('#gallery button').forEach(b => b.onclick = () => { last = b; open(+b.dataset.i); });
  const close = () => { lb.hidden = true; if (last) last.focus(); };
  lb.querySelector('.lb-x').onclick = close; lb.querySelector('.lb-p').onclick = () => open(cur - 1); lb.querySelector('.lb-n').onclick = () => open(cur + 1);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') open(cur + 1); if (e.key === 'ArrowLeft') open(cur - 1); e.stopPropagation(); }, true);
}
