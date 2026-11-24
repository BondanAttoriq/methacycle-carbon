// Tur terpandu 17 perhentian: urutan, kamera, tag, angka (num), dan durasi dari data.json → tour.stops (tidak diubah).
// Narasi `say` ditulis ulang dalam bahasa profesional; angka pada chip `num` ditampilkan apa adanya.
import { $, esc, statusBadge, emit } from './util.js';

const SAY = {
  tpst: ['TPST Bantargebang (±110 ha) menerima lebih dari 7.300 t sampah/hari dengan timbunan ±35–50 m di Zona I C, I dan V, II, III, IV A–E, serta VI A–B.',
    'LPP dan landfill gas (LFG) tersedia di lokasi, sehingga bahan baku METHACYCLE tidak perlu diangkut jauh.',
    'Plant konseptual ditempatkan di sisi barat pagar TPST, dekat gerbang utama dan jembatan timbang.'],
  lokasi: ['Longsor Zona IV A (8 Maret 2026) menimpa truk antre dan menutup Sungai Ciketing ±40 m: risiko geoteknik nyata.',
    'Kriteria tapak: plant berjarak ≥100 m (2 × tinggi timbunan) dari kaki timbunan; jarak aktual minimum ±118 m ke Zona I C.',
    'LFG dipasok dari rumah daya PLTSa melalui header ±0,9 km; flare di selatan plot dengan sterile area R 60 m, ≥170 m dari timbunan.'],
  lpp: ['Truk LPP masuk dari utara dan membongkar muatan di tipping hall tertutup bertekanan negatif.',
    'Udara hall ±6.048 m³/jam dihisap ke biofilter BF-101 untuk pengendalian bau.',
    'Wheel loader mengisi hopper HP-101, lalu conveyor CV-101 membawa LPP ke pemilahan.'],
  pra: ['Pemilahan U-101 memisahkan reject, kemudian shredder U-102 menyeragamkan ukuran umpan.',
    'Rotary dryer D-101 menurunkan kadar air dari 50,45% menjadi 10% dengan panas H-04 dari HRN-601.'],
  lfg_header: ['Sumur gas HDPE di bench Zona I, II, dan III (70 + 62 + 37 sumur) terhubung ke rumah daya landfill gas PLTSa.',
    'METHACYCLE mengambil 1.000 Nm³/jam LFG melalui header DN150 ±0,9 km di koridor selatan, bertumpu pada sleeper beton.',
    'Header masuk plant dari sisi barat melalui pipe bridge menuju titik batas LFG-110 (Area 200).'],
  lfg: ['LFG masuk di LFG-110; kondensat dipisahkan di knock-out drum V-201 (aliran 12 ke konektor W-1).',
    'A-201 menyerap H₂S dan A-202 menyerap siloksana; adsorben bekas diganti secara batch ke bin 14 dan 16.',
    'Blower K-201 menaikkan tekanan ke ±0,6 barg; aliran 17 (DN125) melalui pipe rack menuju burner BR-101.'],
  oec: ['LPP kering dibakar di furnace R-101, sedangkan LFG terkondisi masuk melalui burner BR-101.',
    'Oksidator berupa O₂ dari PEME (ditambah udara pelengkap) menghasilkan flue gas kaya CO₂ (±88% basis kering) yang siap ditangkap.'],
  whr: ['Waste heat boiler E-301 memulihkan panas flue gas (H-01) ke jaringan HRN-601.',
    'ESP U-301A dan scrubber U-301B menyisihkan partikulat dan gas asam; separator V-301 memisahkan kondensat (W-2).'],
  ccu: ['Flue gas dikompresi K-301, didehidrasi A-301, lalu didinginkan secara kriogenik di E-304.',
    'Paket refrigerasi U-302R menyediakan pendinginan hingga −60 °C.',
    'CO₂ cair dipisahkan di V-302 dan dikondisikan ke 3 MPa sebelum masuk sintesis.'],
  peme: ['PEM Electrolyzer 33,10 MWe, dipasok listrik eksternal rendah karbon (EL-01) dan ORC, menghasilkan H₂ dan O₂.',
    'O₂ dialirkan ke OEC (integrasi oxy-combustion), sedangkan H₂ dikeringkan dan dikompresi menuju sintesis.',
    'Panas stack ±9,6 MWth dibuang ke cooling tower melalui CW-3/CW-4.'],
  sintesis: ['CO₂, H₂, dan gas recycle bercampur di M-401 (H₂/CO₂ = 3), dipanaskan di E-401, lalu bereaksi di R-401.',
    'Efluen didinginkan dan dipisahkan di V-401; gas dikembalikan oleh K-401, purge 5% dikirim ke oksidasi U-603.'],
  produk: ['Kolom distilasi T-401 memurnikan metanol; reboiler E-405 memakai panas H-06.',
    'Tangki TK-401 (kapasitas 3 hari) berada dalam bund; truk tangki dimuat di LOAD-148.'],
  panas: ['HRN-601 mendistribusikan panas H-01 sampai H-07 sesuai tingkat temperatur.',
    'Panas bertemperatur rendah diubah ORC menjadi ≈1,75 MWe listrik bersih yang masuk ke bus listrik.'],
  air: ['Kondensat W-1/W-2 dan bottoms aliran 59 diolah di U-702, lalu dipoles RO/EDI di U-701.',
    'Air berkualitas PEME disimpan di TK-701 (12 jam) dan dipompa ke EL-501.'],
  utilitas: ['Cooling tower 4 sel melayani aliran 70/71 (ORC) dan PEME: ±27 MWth, ±2.322 m³/jam.',
    'Catatan desain: make-up cooling tower ±1.137 m³/hari ≈ 9× air elektrolisis, sehingga opsi dry/hybrid cooler perlu dikaji.',
    'Air pemadam 900 m³ dengan pompa listrik, diesel, dan jockey; ring hidran; IA/N₂ untuk instrumen dan purging.'],
  flare: ['Header relief Area 400 (syngas/metanol) dan sisi H₂ menuju KO drum V-901, lalu flare 30 m.',
    'Sterile area R 60 m; jarak ke TK-401 168 m dan ke PEME 113 m; windsock di 4 titik.',
    'Titik kumpul berada di parkir barat daya; akses pemadam tersedia dari dua sisi tiap blok.'],
  tutup: ['LPP + LFG menghasilkan e-methanol 74,72 t/hari; CO₂ pembakaran dimanfaatkan ulang dan O₂ PEME menutup siklus OEC.',
    'LCA pembanding: GWP turun 80,95% terhadap landfill dan 62,57% terhadap WtE.',
    'Tahap lanjut: optimasi ML, studi relief/flare, serta data angin dan geoteknik lokal.'],
};
const AREA = { tpst: 'Konteks TPST', lokasi: 'Tapak & zona penyangga', lpp: 'Area 100 · LPP', pra: 'Area 100 · LPP', lfg_header: 'Area 200 · LFG',
  lfg: 'Area 200 · LFG', oec: 'Area 100 · OEC', whr: 'Area 300 · WHR & gas cleaning', ccu: 'Area 300 · CCU', peme: 'Area 500 · PEME',
  sintesis: 'Area 400 · Sintesis', produk: 'Area 400 · Distilasi & produk', panas: 'Area 600 · Panas & listrik', air: 'Area 700 · Air',
  utilitas: 'Utilitas 800–900', flare: 'Keselamatan', tutup: 'Ringkasan' };
export const SCADA_SCREEN = { tpst: 'overview', lokasi: 'overview', lpp: 'a100', pra: 'a100', lfg_header: 'a100', lfg: 'a100', oec: 'a300a', whr: 'a300a',
  ccu: 'a300b', peme: 'a500', sintesis: 'a400', produk: 'a400', panas: 'a600', air: 'a600', utilitas: 'overview', flare: 'overview', tutup: 'overview' };

export class Tour {
  constructor({ stops, statusNames, onGo, onTag, getCtxHint, onCtx }) {
    Object.assign(this, { stops, statusNames, onGo, onTag, getCtxHint, onCtx });
    this.cur = 0; this.playing = false; this.hold = 0;
    this.card = $('#tourCard'); this.thumbs = $('#tThumbs');
    this.thumbs.innerHTML = stops.map((s, i) => `<button class="tth" role="listitem" data-i="${i}" aria-label="Perhentian ${i + 1}: ${esc(s.title)}">
      <img src="assets/img/thumb/${String(i + 1).padStart(2, '0')}_${s.id}.jpg" alt="" loading="lazy" width="400" height="225"><em>${i + 1}</em><span>${esc(s.title)}</span></button>`).join('');
    this.thumbs.querySelectorAll('.tth').forEach(b => b.onclick = () => this.go(+b.dataset.i));
    $('#tPrev').onclick = () => this.go(this.cur - 1);
    $('#tNext').onclick = () => this.go(this.cur + 1);
    $('#tPlay').onclick = () => this.play(!this.playing);
  }
  go(i, instant = false) {
    const n = this.stops.length; this.cur = (i + n) % n; this.hold = 0; const s = this.stops[this.cur];
    this.render(s, this.cur); this.onGo(s, this.cur, instant);
  }
  play(on) {
    this.playing = on; this.hold = 0;
    $('#tPlay').innerHTML = `<svg><use href="#i-${on ? 'pause' : 'play'}"/></svg><span>${on ? 'Jeda' : 'Putar tur'}</span>`;
    $('#tPlay').setAttribute('aria-label', on ? 'Jeda tur' : 'Putar tur otomatis');
    if (!on) $('#tBar').style.transform = 'scaleX(0)';
  }
  tick(dt) {    // dipanggil viewer saat kamera tidak sedang terbang
    if (!this.playing) return;
    this.hold += dt; const d = this.stops[this.cur].dur;
    $('#tBar').style.transform = `scaleX(${Math.min(1, this.hold / d).toFixed(4)})`;
    if (this.hold >= d) this.go(this.cur + 1);
  }
  render(s, i) {
    const say = SAY[s.id] || s.say;
    const ctxHint = this.getCtxHint && s.ctx ? this.getCtxHint() : '';
    this.card.innerHTML = `<div class="tc-top"><span class="tc-num">${i + 1}</span><div><h3 class="tc-title">${esc(s.title)}</h3><span class="tc-area">${esc(AREA[s.id] || '')}</span></div></div>
      <ul class="tc-say">${say.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="tc-nums">${s.num.map(([k, v, st]) => `<div class="numchip"><span>${esc(k)} ${statusBadge(this.statusNames[st])}</span><b>${esc(v)}</b></div>`).join('')}</div>
      ${s.tags && s.tags.length ? `<div class="tc-tags" aria-label="Unit pada perhentian ini">${s.tags.map(t => `<button class="tagchip" data-tag="${esc(t)}" title="Sorot ${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      ${ctxHint}
      <div class="tc-actions"><button class="btn btn-teal sm" data-scada><svg><use href="#i-scada"/></svg>Lihat di SCADA</button></div>`;
    this.card.querySelectorAll('.tagchip').forEach(b => b.onclick = () => { this.card.querySelectorAll('.tagchip').forEach(x => x.classList.toggle('on', x === b)); this.onTag(b.dataset.tag); });
    const cb = this.card.querySelector('[data-ctxon]'); if (cb && this.onCtx) cb.onclick = this.onCtx;
    this.card.querySelector('[data-scada]').onclick = () => emit('show-scada', { tags: s.tags || [], screen: SCADA_SCREEN[s.id] || 'overview' });
    $('#tIdx').textContent = `Perhentian ${i + 1}/${this.stops.length}`; $('#tDur').textContent = `±${s.dur} dtk`;
    this.thumbs.querySelectorAll('.tth').forEach((b, j) => { b.classList.toggle('on', j === i); b.classList.toggle('done', j < i); b.setAttribute('aria-current', j === i ? 'step' : 'false'); });
    const on = this.thumbs.children[i]; if (on) this.thumbs.scrollTo({ left: on.offsetLeft - this.thumbs.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
  }
}
