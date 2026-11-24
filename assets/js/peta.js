// Peta lokasi interaktif: tapak METHACYCLE di TPST Bantargebang.
// Peta dasar = render ortografis tampak atas dari model 3D METHACYCLE sendiri (assets/img/peta_tpst.jpg, 1,25 m/px).
// Lapisan dari data.json (konteks, checks, flow LFG-H, labels) dan equipment register; tidak ada angka baru.
import { $, $$, fmt, esc, emit, getJSON, reducedMotion } from './util.js';

const MAP = { X0: -300, X1: 1650, Y0: -850, Y1: 1200, PX: 1.25, W: 1560, H: 1640 };
const sx = x => (x - MAP.X0) / MAP.PX, sy = y => (MAP.Y1 - y) / MAP.PX;
// Sungai Ciketing: titik digitasi poster zona (konteks_dari_poster.py, skala 3,37 m/px, origin px 62/343,54)
const RIVER_PX = [[200, 18], [250, 16], [300, 22], [345, 46], [392, 76], [420, 112], [442, 160], [466, 212], [505, 252], [560, 272], [640, 286]];
const RIVER = RIVER_PX.map(([px, py]) => [(px - 62) * 3.37, (343.54 - py) * 3.37]);
const ZLAB = { 'Z-IC': [-20, 7, 'end'], 'Z-IV': [0, 42, 'middle'], 'Z-IVA': [0, 40, 'middle'], 'Z-IVB': [20, 7, 'start'], 'Z-IVC': [-20, 7, 'end'] };   // posisi label agar tidak bertumpuk
const LAYERS = [['zona', 'Zona timbunan', true], ['fas', 'Fasilitas TPST', true], ['plant', 'Plant METHACYCLE', true], ['jarak', 'Jarak aman', true], ['lfg', 'Header LFG', true], ['sungai', 'Sungai Ciketing', true]];

export async function init() {
  const host = $('#peta'); if (!host) return;
  const [D, EQ] = await Promise.all([getJSON('assets/data/data.json'), getJSON('assets/data/equipment.json')]);
  const K = D.konteks, C = D.checks, BUF = Object.fromEntries(C.buffer.map(b => [b[0], b]));
  // tapak plant = kotak pembatas unit proses + utilitas inti (tanpa titik batas luar)
  const core = EQ.filter(e => e.area !== 'PENDUKUNG' && e.x_m !== null && !/^(FL-901|V-901|GRID|MU-|WW-|O2-156)/.test(e.tag));
  const px0 = Math.min(...core.map(e => e.x_m)) - 10, px1 = Math.max(...core.map(e => e.x_m)) + 10, py0 = Math.min(...core.map(e => e.y_m)) - 10, py1 = Math.max(...core.map(e => e.y_m)) + 10;
  const flare = EQ.find(e => e.tag === 'FL-901');
  const toe = C.nearest_landfill;
  const clampPt = ([x, y]) => [Math.max(px0, Math.min(px1, x)), Math.max(py0, Math.min(py1, y))];
  const pToe = clampPt(toe);
  // titik sungai terdekat dari tapak (untuk garis penunjuk saja; angka dari checks.river_m)
  let best = null; for (let i = 0; i < RIVER.length - 1; i++) { const [a, b] = [RIVER[i], RIVER[i + 1]]; for (let t = 0; t <= 1; t += 0.05) { const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; const c = clampPt(q); const d = Math.hypot(q[0] - c[0], q[1] - c[1]); if (!best || d < best.d) best = { d, q, c }; } }
  const lfg = D.flow['LFG-H'].p; let lfgLen = 0; for (let i = 1; i < lfg.length; i++) lfgLen += Math.hypot(lfg[i][0] - lfg[i - 1][0], lfg[i][1] - lfg[i - 1][1]);
  const hMax = Math.max(...K.filter(k => k.jenis === 'zona landfill').map(k => +k.tinggi_m));
  const hCol = h => { const t = (h - 18) / (hMax - 18); return `hsl(${28 - 20 * t} ${70 + 15 * t}% ${58 - 22 * t}%)`; };   // satu hue (oranye) terang→gelap
  const slide = D.labels.find(l => /longsor/i.test(l[0]));

  let g = `<image href="assets/img/peta_tpst.jpg" x="0" y="0" width="${MAP.W}" height="${MAP.H}"/>`;
  // sungai
  g += `<g data-layer="sungai"><polyline points="${RIVER.map(p => `${sx(p[0])},${sy(p[1])}`).join(' ')}" fill="none" stroke="#3FA6FF" stroke-width="7" stroke-opacity=".55" stroke-linecap="round"/>
    <text x="${sx(RIVER[6][0]) + 14}" y="${sy(RIVER[6][1])}" class="pm-t riv">Sungai Ciketing</text></g>`;
  // header LFG
  g += `<g data-layer="lfg"><polyline class="pm-lfg" points="${lfg.map(p => `${sx(p[0])},${sy(p[1])}`).join(' ')}"/>
    <g class="pm-pin" data-info="lfg" tabindex="0" role="button" aria-label="Header LFG"><circle cx="${sx(440)}" cy="${sy(-190)}" r="10" fill="#facc40" stroke="#0B2E23" stroke-width="2"/><text x="${sx(440)}" y="${sy(-190) + 32}" text-anchor="middle" class="pm-t">Header LFG ±${fmt(lfgLen / 1000, 1)} km</text></g></g>`;
  // jarak aman
  g += `<g data-layer="jarak">
    <line x1="${sx(pToe[0])}" y1="${sy(pToe[1])}" x2="${sx(toe[0])}" y2="${sy(toe[1])}" class="pm-dist"/><circle cx="${sx(toe[0])}" cy="${sy(toe[1])}" r="6" fill="#E5484D"/>
    <g class="pm-pin" data-info="buffer" tabindex="0" role="button" aria-label="Jarak plant ke kaki timbunan"><rect x="${sx((pToe[0] + toe[0]) / 2) - 8}" y="${sy((pToe[1] + toe[1]) / 2) - 40}" width="238" height="30" rx="15" class="pm-badge"/><text x="${sx((pToe[0] + toe[0]) / 2) + 111}" y="${sy((pToe[1] + toe[1]) / 2) - 20}" text-anchor="middle" class="pm-bt">${fmt(BUF['Z-IC'][3], 1)} m ke kaki timbunan</text></g>
    <circle cx="${sx(flare.x_m)}" cy="${sy(flare.y_m)}" r="${60 / MAP.PX}" class="pm-sterile"/>
    <g class="pm-pin" data-info="flare" tabindex="0" role="button" aria-label="Sterile area flare"><text x="${sx(flare.x_m)}" y="${sy(flare.y_m) + 60 / MAP.PX + 22}" text-anchor="middle" class="pm-t">Sterile area flare R 60 m</text></g>
    <line x1="${sx(best.c[0])}" y1="${sy(best.c[1])}" x2="${sx(best.q[0])}" y2="${sy(best.q[1])}" class="pm-dist blue"/>
    <g class="pm-pin" data-info="river" tabindex="0" role="button" aria-label="Jarak ke sungai"><rect x="${sx((best.c[0] + best.q[0]) / 2) - 92}" y="${sy((best.c[1] + best.q[1]) / 2) - 15}" width="184" height="30" rx="15" class="pm-badge blue"/><text x="${sx((best.c[0] + best.q[0]) / 2)}" y="${sy((best.c[1] + best.q[1]) / 2) + 5}" text-anchor="middle" class="pm-bt">±${fmt(C.river_m / 1000, 2)} km ke sungai</text></g></g>`;
  // zona timbunan (pin diwarnai tinggi; lingkaran = luas ekuivalen)
  g += `<g data-layer="zona">${K.filter(k => k.jenis === 'zona landfill').map(k => { const x = sx(+k.x_m), y = sy(+k.y_m), r = Math.sqrt(+k.luas_ha * 1e4 / Math.PI) / MAP.PX;
    return `<g class="pm-pin zone" data-info="z:${k.id}" tabindex="0" role="button" aria-label="${esc(k.nama)}, tinggi ±${fmt(+k.tinggi_m, 0)} m"><circle cx="${x}" cy="${y}" r="${r}" class="pm-area" style="fill:${hCol(+k.tinggi_m)}"/>
      <circle cx="${x}" cy="${y}" r="13" fill="${hCol(+k.tinggi_m)}" stroke="#fff" stroke-width="3"/><text x="${x + (ZLAB[k.id] || [0])[0]}" y="${y + (ZLAB[k.id] || [0, -22])[1]}" text-anchor="${(ZLAB[k.id] || [0, 0, 'middle'])[2]}" class="pm-t">${esc(k.nama)} · ±${fmt(+k.tinggi_m, 0)} m</text></g>`; }).join('')}
    ${slide ? `<g class="pm-pin" data-info="slide" tabindex="0" role="button" aria-label="${esc(slide[0])}"><polygon points="${sx(slide[1][0]) + 34},${sy(slide[1][1]) - 40} ${sx(slide[1][0]) + 49},${sy(slide[1][1]) - 13} ${sx(slide[1][0]) + 19},${sy(slide[1][1]) - 13}" fill="#E5484D" stroke="#fff" stroke-width="2.5"/><text x="${sx(slide[1][0]) + 34}" y="${sy(slide[1][1]) - 18}" text-anchor="middle" class="pm-ex">!</text></g>` : ''}</g>`;
  // fasilitas
  g += `<g data-layer="fas">${K.filter(k => k.jenis !== 'zona landfill').map(k => { const x = sx(+k.x_m), y = sy(+k.y_m), out = k.jenis === 'luar pagar';
    return `<g class="pm-pin fac" data-info="f:${k.id}" tabindex="0" role="button" aria-label="${esc(k.nama)}"><rect x="${x - 10}" y="${y - 10}" width="20" height="20" rx="4" fill="${out ? '#6B7F77' : '#0C5A72'}" stroke="#fff" stroke-width="2.5"/><text x="${x + 16}" y="${y + 5}" class="pm-t sm">${esc(k.nama)}</text></g>`; }).join('')}</g>`;
  // plant
  g += `<g data-layer="plant"><rect x="${sx(px0)}" y="${sy(py1)}" width="${(px1 - px0) / MAP.PX}" height="${(py1 - py0) / MAP.PX}" class="pm-plant"/>
    <g class="pm-pin" data-info="plant" tabindex="0" role="button" aria-label="Plot METHACYCLE"><rect x="${sx(px0) - 4}" y="${sy(py1) - 54}" width="236" height="40" rx="20" fill="#8CC63F" stroke="#fff" stroke-width="3"/><text x="${sx(px0) + 114}" y="${sy(py1) - 28}" text-anchor="middle" class="pm-bt dark">METHACYCLE ±2,53 ha</text></g></g>`;
  // skala & utara (dalam koordinat peta)
  g += `<g transform="translate(40 ${MAP.H - 70})"><rect x="-12" y="-34" width="${400 / MAP.PX + 70}" height="64" rx="10" fill="rgba(255,255,255,.9)"/>${[0, 1, 2, 3].map(i => `<rect x="${i * 100 / MAP.PX}" y="0" width="${100 / MAP.PX}" height="10" fill="${i % 2 ? '#fff' : '#17322A'}" stroke="#17322A" stroke-width="1.5"/>`).join('')}
    <text x="0" y="-8" class="pm-t sm">0</text><text x="${200 / MAP.PX}" y="-8" text-anchor="middle" class="pm-t sm">200</text><text x="${400 / MAP.PX}" y="-8" text-anchor="middle" class="pm-t sm">400 m</text>
    <g transform="translate(${400 / MAP.PX + 36} 2)"><polygon points="0,-24 9,8 0,3 -9,8" fill="#17322A"/><polygon points="0,-24 0,3 -9,8" fill="#E8862A"/><text y="24" text-anchor="middle" class="pm-t sm">U</text></g></g>`;

  host.innerHTML = `<div class="pm-head"><div><h3 class="h-sm" style="margin:0">Peta lokasi &amp; zona penyangga</h3><div class="ch-sub">Peta dasar: render tampak atas model 3D METHACYCLE (1,25 m/piksel). Klik penanda untuk detail.</div></div>
      <div class="pm-layers" role="group" aria-label="Lapisan peta">${LAYERS.map(([k, t, on]) => `<label class="pm-chip"><input type="checkbox" data-lay="${k}" ${on ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
    <div class="pm-grid"><div class="pm-stage" id="pmStage"><svg id="pmSvg" viewBox="0 0 ${MAP.W} ${MAP.H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Peta TPST Bantargebang dan tapak METHACYCLE">${g}</svg>
      <div class="pm-zoom"><button class="btn-round" data-z="in" aria-label="Perbesar peta"><svg><use href="#i-plus"/></svg></button><button class="btn-round" data-z="out" aria-label="Perkecil peta"><svg><use href="#i-minus"/></svg></button><button class="btn-round" data-z="fit" aria-label="Tampilkan seluruh peta"><svg><use href="#i-reset"/></svg></button></div></div>
      <aside class="pm-side card" id="pmInfo" aria-live="polite"></aside></div>`;

  // ------------------------------------------------ panel info
  const ok = '<span class="badge st-C">lolos</span>';
  const defaultInfo = () => `<h4 class="pm-h">Ringkasan tapak</h4>
    <div class="pm-kv"><span>Luas TPST</span><b>±${fmt(C.tpst_area_ha, 1)} ha</b><span>Luas zona timbunan</span><b>±${fmt(C.landfill_ha, 1)} ha</b><span>Plot METHACYCLE</span><b>±2,53 ha</b></div>
    <h4 class="pm-h">Uji jarak aman</h4>
    <ul class="pm-checks"><li><span>Plant ke kaki timbunan terdekat (Zona I C)</span><b>${fmt(BUF['Z-IC'][3], 1)} m</b><small>kriteria ≥${fmt(C.buffer_min, 0)} m (2 × tinggi timbunan) ${ok}</small></li>
      <li><span>Flare ke kaki timbunan terdekat</span><b>${fmt(C.flare_buffer_min, 1)} m</b><small>sterile area R 60 m di selatan plot ${ok}</small></li>
      <li><span>Plant ke Sungai Ciketing</span><b>±${fmt(C.river_m, 0)} m</b><small>kriteria ≥${fmt(C.river_min, 0)} m ${ok}</small></li>
      <li><span>Header LFG dari power house PLTSa</span><b>±${fmt(lfgLen / 1000, 1)} km</b><small>DN150 di koridor selatan</small></li></ul>
    <div class="pm-legend"><span><i class="lg-z"></i>Zona timbunan (warna = tinggi, lingkaran = luas ekuivalen)</span><span><i class="lg-f"></i>Fasilitas TPST</span><span><i class="lg-o"></i>Luar pagar</span><span><i class="lg-d"></i>Garis jarak aman</span></div>
    <button class="btn btn-teal sm" data-stop="1"><svg><use href="#i-play"/></svg>Lihat di tur 3D</button>`;
  const info = $('#pmInfo');
  function show(key) {
    let h = '';
    if (!key) h = defaultInfo();
    else if (key.startsWith('z:')) { const k = K.find(x => x.id === key.slice(2)), b = BUF[k.id];
      h = `<span class="pm-tag" style="background:${hCol(+k.tinggi_m)}">Zona timbunan</span><h4 class="pm-h">${esc(k.nama)}</h4><div class="pm-kv"><span>Luas</span><b>${fmt(+k.luas_ha, 2)} ha</b><span>Tinggi (asumsi dalam rentang sumber)</span><b>±${fmt(+k.tinggi_m, 0)} m</b>
        ${b ? `<span>Jarak ke plant METHACYCLE</span><b>${fmt(b[3], 1)} m</b><span>Jarak ke flare</span><b>${fmt(b[4], 1)} m</b>` : ''}</div><p class="note-sm">${esc(k.status)}</p>`; }
    else if (key.startsWith('f:')) { const k = K.find(x => x.id === key.slice(2));
      h = `<span class="pm-tag" style="background:${k.jenis === 'luar pagar' ? '#6B7F77' : '#0C5A72'}">${esc(k.jenis)}</span><h4 class="pm-h">${esc(k.nama)}</h4>${k.luas_ha ? `<div class="pm-kv"><span>Luas (asumsi)</span><b>${fmt(+k.luas_ha, 2)} ha</b></div>` : ''}<p class="note-sm">${esc(k.status)}</p>`; }
    else if (key === 'plant') h = `<span class="pm-tag" style="background:#1F7A4D">Tapak usulan</span><h4 class="pm-h">Plot METHACYCLE</h4><div class="pm-kv"><span>Luas plot</span><b>±2,53 ha</b><span>Inti proses</span><b>±1,75 ha</b><span>Pita utilitas</span><b>±0,78 ha</b></div><p class="note-sm">Sisi barat pagar TPST, dekat gerbang utama dan jembatan timbang. Kotak pada peta = batas unit register + 10 m.</p><button class="btn btn-teal sm" data-stop="2"><svg><use href="#i-play"/></svg>Lihat di tur 3D</button>`;
    else if (key === 'buffer') h = `<h4 class="pm-h">Jarak ke kaki timbunan</h4><div class="pm-kv"><span>Zona I C (terdekat)</span><b>${fmt(BUF['Z-IC'][3], 1)} m</b><span>Zona I dan V</span><b>${fmt(BUF['Z-IV'][3], 1)} m</b><span>Kriteria desain</span><b>≥${fmt(C.buffer_min, 0)} m</b></div><p class="note-sm">Kriteria = 2 × tinggi timbunan, merespons longsor Zona IV A (8 Maret 2026).</p>`;
    else if (key === 'flare') h = `<h4 class="pm-h">Flare FL-901</h4><div class="pm-kv"><span>Tinggi</span><b>30 m</b><span>Sterile area</span><b>R 60 m</b><span>Jarak ke timbunan terdekat</span><b>${fmt(C.flare_buffer_min, 1)} m</b></div><button class="btn btn-teal sm" data-stop="15"><svg><use href="#i-play"/></svg>Lihat di tur 3D</button>`;
    else if (key === 'river') h = `<h4 class="pm-h">Sungai Ciketing</h4><div class="pm-kv"><span>Jarak plant ke sungai</span><b>±${fmt(C.river_m, 0)} m</b><span>Kriteria minimum</span><b>${fmt(C.river_min, 0)} m</b></div><p class="note-sm">Jalur sungai didigitasi dari poster zona TPST; garis biru menunjukkan arah titik terdekat.</p>`;
    else if (key === 'lfg') h = `<h4 class="pm-h">Header landfill gas</h4><div class="pm-kv"><span>Laju</span><b>1.000 Nm³/jam</b><span>Panjang rute (data rute 3D)</span><b>±${fmt(lfgLen / 1000, 2)} km</b><span>Ukuran</span><b>DN150</b></div><p class="note-sm">Dari rumah daya gas landfill PLTSa ke titik batas LFG-110 di Area 200.</p><button class="btn btn-teal sm" data-stop="4"><svg><use href="#i-play"/></svg>Lihat di tur 3D</button>`;
    else if (key === 'slide') h = `<span class="pm-tag" style="background:#E5484D">Risiko</span><h4 class="pm-h">${esc(slide[0])}</h4><p>Longsor menimpa truk yang antre dan menutup Sungai Ciketing ±40 m. Kejadian ini menjadi dasar kriteria jarak plant ≥100 m dari kaki timbunan.</p><button class="btn btn-teal sm" data-stop="1"><svg><use href="#i-play"/></svg>Lihat di tur 3D</button>`;
    if (key) h += `<button class="btn-mini" data-back style="margin-top:10px">← Ringkasan tapak</button>`;
    info.innerHTML = h;
    info.querySelectorAll('[data-stop]').forEach(b => b.onclick = () => emit('goto-stop', { i: +b.dataset.stop }));
    const bk = info.querySelector('[data-back]'); if (bk) bk.onclick = () => { sel(null); show(null); };
  }
  const svg = $('#pmSvg');
  const sel = key => $$('.pm-pin', svg).forEach(p => p.classList.toggle('sel', p.dataset.info === key));
  $$('.pm-pin', svg).forEach(p => { const go = () => { sel(p.dataset.info); show(p.dataset.info); };
    p.addEventListener('click', e => { if (!moved) go(); }); p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
  $$('[data-lay]', host).forEach(c => c.onchange = () => { const l = svg.querySelector(`[data-layer="${c.dataset.lay}"]`); if (l) l.style.display = c.checked ? '' : 'none'; });
  show(null);

  // ------------------------------------------------ zoom & geser
  const FIT = { x: 0, y: 0, w: MAP.W, h: MAP.H }; let VB = { ...FIT }, moved = false;
  const setVB = () => svg.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
  function zoom(f, cx = VB.x + VB.w / 2, cy = VB.y + VB.h / 2) {
    const w = Math.max(260, Math.min(MAP.W, VB.w / f)), h = w * MAP.H / MAP.W;
    VB.x = cx - (cx - VB.x) * (w / VB.w); VB.y = cy - (cy - VB.y) * (h / VB.h); VB.w = w; VB.h = h; clamp(); setVB();
  }
  const clamp = () => { VB.x = Math.max(0, Math.min(MAP.W - VB.w, VB.x)); VB.y = Math.max(0, Math.min(MAP.H - VB.h, VB.y)); };
  function animTo(t) { if (reducedMotion()) { VB = { ...t }; setVB(); return; } const s = { ...VB }, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3); for (const p of ['x', 'y', 'w', 'h']) VB[p] = s[p] + (t[p] - s[p]) * e; setVB(); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(), s = Math.max(VB.w / r.width, VB.h / r.height); return [VB.x + (cx - r.left - (r.width - VB.w / s) / 2) * s, VB.y + (cy - r.top - (r.height - VB.h / s) / 2) * s, s]; };
  $$('.pm-zoom [data-z]', host).forEach(b => b.onclick = () => { const z = b.dataset.z; if (z === 'fit') animTo(FIT); else zoom(z === 'in' ? 1.5 : 1 / 1.5); });
  svg.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const [x, y] = toSvg(e.clientX, e.clientY); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, x, y); }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', e => { moved = false; if (VB.w >= MAP.W - 1 && e.pointerType !== 'mouse') return; drag = [e.clientX, e.clientY, VB.x, VB.y]; });
  svg.addEventListener('pointermove', e => { if (!drag) return; const [, , s] = toSvg(0, 0); const dx = (e.clientX - drag[0]) * s, dy = (e.clientY - drag[1]) * s; if (Math.abs(dx) + Math.abs(dy) > 6) { moved = true; svg.classList.add('dragging'); } VB.x = drag[2] - dx; VB.y = drag[3] - dy; clamp(); setVB(); });
  const end = () => { drag = null; svg.classList.remove('dragging'); }; svg.addEventListener('pointerup', end); svg.addEventListener('pointerleave', end);
  // awal: perbesar ke tapak + zona terdekat agar konteks langsung terbaca
  const focus = { x: sx(-120), y: sy(560), w: sx(1000) - sx(-120) }; focus.h = focus.w * MAP.H / MAP.W; VB = { ...focus }; clamp(); setVB();
}
