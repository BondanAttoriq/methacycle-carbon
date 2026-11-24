// SCADA/HMI METHACYCLE: 7 layar dari PFD berwarna, mode DESIGN (neraca paper) dan SIMULASI (skematik).
// Topologi & nilai: stream_register (from/to), neraca_aliran (laju), ukuran_pipa (T, P, DN). Tata letak: scada-layout.json.
import { $, $$, fmt, fmtAuto, esc, emit, getJSON, loadRegister, MEDIUM, isMobile } from './util.js';
import { defs, symbol, meshPattern, hexConn, diamond, valve } from './scada-symbols.js';

const NS = 'http://www.w3.org/2000/svg';
const KEY_UNITS = new Set(['HP-101', 'D-101', 'R-101', 'V-201', 'K-201', 'E-301', 'U-301A', 'U-301B', 'V-301', 'K-301', 'V-302', 'K-302', 'EL-501', 'V-502', 'K-501',
  'M-401', 'R-401', 'V-401', 'K-401', 'T-401', 'TK-401', 'HRN-601', 'EX-601', 'G-601', 'U-603', 'U-702', 'U-701', 'TK-701', 'P-701', 'P-401', 'P-601', 'A-201', 'A-202', 'A-301', 'A-501', 'E-401', 'E-402', 'E-404', 'E-405', 'E-601', 'E-602', 'E-302', 'E-303', 'E-304', 'E-305', 'CV-101', 'U-101', 'U-102', 'BR-101', 'SP-401', 'V-402', 'V-403', 'ST-301', 'ST-601']);
const CH = {
  lpp: ['HP-101', 'CV-101', 'U-101', 'U-102', 'D-101'], lfg: ['V-201', 'A-201', 'A-202', 'K-201', 'BR-101'], gc: ['E-301', 'U-301A', 'U-301B', 'E-302', 'V-301'],
  ccu: ['K-301', 'E-303', 'A-301', 'E-304', 'V-302', 'E-305', 'K-302'], h2: ['A-501', 'K-501'], syn: ['M-401', 'E-401', 'R-401', 'E-402', 'V-401', 'SP-401', 'K-401'],
  dist: ['V-402', 'T-401', 'E-404', 'V-403', 'P-401', 'E-405'], orc: ['HRN-601', 'E-601', 'EX-601', 'G-601', 'E-602', 'P-601'],
};
const HOT_U = new Set(['R-101', 'BR-101', 'HRN-601', 'U-603']);   // unit panas: badan merah seperti HMI klasik
const ALARM_KEYS = ['7', '17', '18', '26', '28', '30', '47', '53', '57', '65', 'EL-03'];

export async function init() {
  const [L, REG] = await Promise.all([getJSON('assets/data/scada-layout.json'), loadRegister()]);
  const svg = $('#scSvg'), screenEl = $('#scScreen'), pop = $('#scPop'), face = $('#scFace');
  const UNITS = L.units, STREAMS = L.streams;
  const D = {};      // nilai desain (neraca) per aliran
  for (const sid of Object.keys(STREAMS)) { const s = REG.ST[sid]; D[sid] = s && s.q !== null && s.qst !== 'SIAGA' ? s.q : null; }
  const UNIT_STREAMS = {}; for (const sid of Object.keys(STREAMS)) { const s = REG.ST[sid]; if (!s) continue; (UNIT_STREAMS[s.from_tag] ||= { i: [], o: [] }).o.push(sid); (UNIT_STREAMS[s.to_tag] ||= { i: [], o: [] }).i.push(sid); }

  // ------------------------------------------------ state simulasi
  const S = { mode: 'design', speed: 1, paused: false, t: Date.now(), load: 1, lpp: 1, lfg: 1, whr: true, ccu: true, run: {}, man: {} };
  const V = {}, N = {}, HIST = {};
  const resetValues = () => { for (const sid in D) { V[sid] = D[sid] ?? 0; N[sid] = 0; HIST[sid] = []; } V['58'] = 0; };
  resetValues();
  const R = t => S.run[t] !== false;
  const all = a => a.every(R) ? 1 : 0;
  const pre = (ch, upto) => { for (const t of CH[ch]) { if (!R(t)) return 0; if (t === upto) break; } return 1; };
  function targets() {
    const lppOK = all(CH.lpp), lfgOK = all(CH.lfg);
    const fuel = R('R-101') ? 0.6 * S.lpp * lppOK + 0.4 * S.lfg * lfgOK : 0;
    const feed = fuel * all(CH.gc), ccuOn = S.ccu ? 1 : 0, ccuOK = ccuOn * all(CH.ccu), cap = feed * ccuOK;
    const pemeOK = R('EL-501') && R('P-701') && R('TK-701') && R('U-701') ? 1 : 0, load = S.load * pemeOK;
    const h2 = load * all(CH.h2), meoh = all(CH.syn) ? Math.min(h2, cap) : 0, prod = meoh * all(CH.dist);
    const o2t = 114.37 * load * (R('V-502') ? 1 : 0), need = R('R-101') && fuel > 0 ? 101.03 : 0, toOEC = Math.min(o2t, need);
    const whrOK = S.whr && all(CH.orc) ? 1 : 0, whr = whrOK * Math.min(1.1, fuel), hrn = R('HRN-601') ? 1 : 0;
    const f = {
      1: S.lpp, 2: S.lpp * pre('lpp', 'HP-101'), 3: S.lpp * pre('lpp', 'CV-101'), 4: S.lpp * pre('lpp', 'U-101'), 5: S.lpp * pre('lpp', 'U-101'), 6: S.lpp * pre('lpp', 'U-102'),
      7: S.lpp * lppOK * (R('R-101') ? 1 : 0.0), 8: S.lpp * lppOK, 9: fuel,
      10: S.lfg, 11: S.lfg * pre('lfg', 'V-201'), 12: S.lfg * pre('lfg', 'V-201'), 13: S.lfg * pre('lfg', 'A-201'), 14: S.lfg * pre('lfg', 'A-201'), 15: S.lfg * pre('lfg', 'A-202'), 16: S.lfg * pre('lfg', 'A-202'), 17: S.lfg * lfgOK * (R('R-101') ? 1 : 0),
      18: fuel, 19: fuel * pre('gc', 'E-301'), 20: fuel * pre('gc', 'U-301A'), 21: fuel * pre('gc', 'U-301A'), 22: fuel * pre('gc', 'U-301B'), 23: fuel * pre('gc', 'U-301B'), 24: fuel * pre('gc', 'E-302'), 25: feed, 26: feed,
      'U302-1': feed * ccuOn * pre('ccu', 'K-301'), 'U302-2': feed * ccuOn * pre('ccu', 'E-303'), 'U302-3': feed * ccuOn * pre('ccu', 'A-301'), 'U302-4': feed * ccuOn * pre('ccu', 'E-304'),
      28: feed * ccuOn * pre('ccu', 'V-302'), 29: feed * ccuOn * pre('ccu', 'E-305'), 30: cap,
      31: meoh, 32: meoh, 33: meoh, 34: meoh, 35: meoh, 36: meoh, 37: meoh, 38: meoh, 39: meoh, 'G-1': meoh, 40: meoh, 41: meoh * (R('V-402') ? 1 : 0), 'G-2': meoh * (R('V-402') ? 1 : 0), 42: meoh * (R('V-402') ? 1 : 0),
      43: prod, 44: prod, 45: prod, '45b': prod, 46: prod, 47: prod, 48: prod * (R('TK-401') ? 1 : 0), 49: prod, 50: prod, 59: prod,
      51: load, 52: load * (R('A-501') ? 1 : 0), 53: h2, 54: load, 55: o2t / 114.37,
      'H-01': fuel * pre('gc', 'E-301') * hrn, 'H-02': meoh * hrn, 'H-03': feed * ccuOn * pre('ccu', 'E-303') * hrn, 'H-04': S.lpp * lppOK * hrn, 'H-06': prod * hrn, 'H-07': whr,
      66: whr, 67: whr, 68: whr, 69: whr, 70: whrOK, 71: whrOK, 'EL-02': whr, 'EL-03': load, 'EL-04': ccuOK * (fuel > 0 ? 1 : 0), 'EL-05': 1,
      'W-1': S.lfg * pre('lfg', 'V-201'), 'W-2': feed, 60: R('U-702') ? 1 : 0, 63: R('U-701') ? 1 : 0, 64: load, '64b': load, 65: load, 72: meoh * (R('U-603') ? 1 : 0),
    };
    const T = {};
    for (const sid in D) { if (D[sid] === null) continue; T[sid] = D[sid] * (f[sid] ?? 1); }
    T['27'] = feed > 0 ? (ccuOK ? D['27'] * feed : 123.25 * feed) : 0;
    T['56'] = Math.max(0, o2t - toOEC); T['57'] = toOEC; T['57a'] = toOEC; T['58'] = Math.max(0, need - toOEC) / 0.232;
    T['61'] = R('U-702') ? Math.max(0, 0.3 * f['W-1'] + 63.82 * feed + 42.03 * prod - 5) : 0;
    T['62'] = R('U-701') ? Math.max(0, 128.66 * load + 3 - T['61']) : 0;
    T['EL-01'] = T['EL-03'] + T['EL-04'] + T['EL-05'] - T['EL-02'];
    return { T, meta: { fuel, feed, cap, load, meoh, prod, whr, short: Math.max(0, need - toOEC), ccuOK, whrOK, o2t } };
  }
  const tau = sid => /^EL/.test(sid) ? 3 : /^(5[1-7]|57a)$/.test(sid) ? 4 : /^(2[89]|30|3\d|4\d|45b|59|G-|72|U302)/.test(sid) ? 5 : /^(1[0-7]|W-1)$/.test(sid) ? 6 : /^[1-9]$/.test(sid) ? 8 : /^(6[6-9]|7[01]|H-07)$/.test(sid) ? 12 : 10;
  let META = targets().meta;
  function stepSim(dt) {
    const { T, meta } = targets(); META = meta;
    for (const sid in T) { const k = 1 - Math.exp(-dt / tau(sid)); V[sid] += (T[sid] - V[sid]) * k; if (Math.abs(V[sid]) < 1e-4) V[sid] = 0; }
    for (const sid in N) { const s = REG.ST[sid]; if (s && S.man[s.from_tag]) continue; N[sid] = Math.max(-0.02, Math.min(0.02, N[sid] + (Math.random() - 0.5) * 0.006 * Math.sqrt(dt))); }
  }
  const val = sid => S.mode === 'design' ? (sid === '58' ? null : D[sid]) : (D[sid] === null && !['58'].includes(sid) ? null : V[sid] * (1 + (N[sid] || 0)));
  const ratio = sid => { const d = D[sid]; if (S.mode === 'design') return 1; if (sid === '58') return V['58'] > 0.5 ? 1 : 0; if (!d) return 1; return V[sid] / d; };

  // ------------------------------------------------ KPI
  function kpis() {
    const g = sid => val(sid) ?? 0;
    const meoh = g('47'), whr = g('EL-02');
    const denom = 18.85 * (g('7') / 55.06) + 4.97 * (g('17') / 30.99) + g('EL-03') + g('EL-04');
    let eff = denom > 0.5 ? (29.62 * (meoh / 74.72) + 3.00 * (whr / 1.75)) * 58.11 / denom : 0;
    if (S.mode === 'design') eff = 32.62;
    return [['e-Methanol', meoh, 't/hari', 74.72], ['CO₂ dimanfaatkan', 102.63 * meoh / 74.72, 't/hari', 102.63], ['Daya PEME', g('EL-03'), 'MWe', 33.10],
      ['H₂', g('53'), 't/hari', 14.3], ['O₂ ke OEC', g('57'), 't/hari', 101.03], ['Listrik WHR', whr, 'MWe', 1.75], ['Efisiensi', eff, '%', 32.62]];
  }
  const kpiEl = $('#scKpi');
  kpiEl.innerHTML = kpis().map((k, i) => `<div class="sk" data-k="${i}"><span>${k[0]}</span><b class="num">0</b><small>${k[2]}</small></div>`).join('');
  function drawKpi() {
    kpis().forEach((k, i) => { const el = kpiEl.children[i]; el.querySelector('b').textContent = fmt(k[1], 2); const r = k[3] ? k[1] / k[3] : 1; el.className = 'sk' + (r < 0.5 ? ' alarm' : r < 0.9 ? ' warn' : ''); });
  }

  // ------------------------------------------------ alarm
  const AL = new Map(); let alarmSeq = 0;
  const alarmList = $('#scAlarmList');
  function raise(key, cond, text, pr, tag) {
    const a = AL.get(key);
    if (cond) { if (!a || !a.active) AL.set(key, { key, text, pr, tag, t: S.t, active: true, ack: false, seq: ++alarmSeq }); else a.text = text; }
    else if (a && a.active) { a.active = false; a.tc = S.t; }
  }
  function evalAlarms() {
    if (S.mode !== 'sim') return;
    for (const t of Object.keys(S.run)) raise('stop:' + t, S.run[t] === false, `${t} dihentikan operator (Stop)`, 'lo', t);
    for (const sid of ALARM_KEYS) {
      const r = ratio(sid), s = REG.ST[sid];
      raise('lo:' + sid, r < 0.5 && r >= 0.1, `Aliran ${sid} rendah: ${fmt(r * 100, 0)}% desain (${s.pfd_name})`, 'md', s.to_tag);
      raise('ll:' + sid, r < 0.1, `Aliran ${sid} terhenti (${s.pfd_name})`, 'hi', s.to_tag);
    }
    raise('o2', META.short > 0.5, `O₂ enrichment turun, kemurnian CO₂ flue gas turun (udara pelengkap aliran 58: ${fmt(V['58'], 1)} t/hari)`, 'md', 'R-101');
    raise('ccu', !S.ccu, 'CCU offline: CO₂ dialihkan ke ST-301, produksi e-methanol berhenti', 'hi', 'V-302');
    raise('whr', !S.whr, 'WHR/ORC offline: listrik WHR 0 MWe, efisiensi turun ke 29,62%', 'md', 'G-601');
    raise('peme', S.load < 0.7, `Beban PEME rendah: ${fmt(S.load * 100, 0)}%`, 'lo', 'EL-501');
    raise('feed', S.lpp > 1.05 || S.lfg > 1.05, 'Laju umpan di atas desain (>105%)', 'md', S.lpp > 1.05 ? 'HP-101' : 'V-201');
  }
  const timeStr = t => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
  function drawAlarms() {
    const arr = [...AL.values()].sort((a, b) => (b.active - a.active) || (a.ack - b.ack) || ({ hi: 0, md: 1, lo: 2 }[a.pr] - { hi: 0, md: 1, lo: 2 }[b.pr]) || b.seq - a.seq).slice(0, 40);
    const act = arr.filter(a => a.active).length; $('#scAlarmCount').textContent = `${act} aktif · ${arr.filter(a => a.active && !a.ack).length} belum di-acknowledge`;
    alarmList.innerHTML = arr.length ? arr.map(a => `<li class="${a.pr} ${a.active ? 'active' : 'cleared'} ${a.ack ? 'ack' : 'unack'}"><span>${timeStr(a.t)}</span><span class="pr">${{ hi: 'TINGGI', md: 'SEDANG', lo: 'RENDAH' }[a.pr]}</span><span>${esc(a.text)}${a.active ? '' : ' · normal kembali'}</span>${a.active && !a.ack ? `<button data-ack="${esc(a.key)}">ACK</button>` : `<span>${a.ack ? 'ACK' : ''}</span>`}</li>`).join('')
      : `<li class="sa-empty">${S.mode === 'design' ? 'Mode DESIGN: tidak ada alarm. Aktifkan SIMULASI untuk menguji gangguan.' : 'Tidak ada alarm aktif.'}</li>`;
    alarmList.querySelectorAll('[data-ack]').forEach(b => b.onclick = () => { const a = AL.get(b.dataset.ack); if (a) a.ack = true; drawAlarms(); });
    // tanda status tab
    $$('#scTabs button').forEach(b => { const sc = SCREENS.find(s => s.id === b.dataset.id); const tags = sc.unitSet; let lv = '';
      for (const a of AL.values()) if (a.active && tags.has(a.tag)) { if (a.pr === 'hi') lv = 'alarm'; else if (!lv && a.pr === 'md') lv = 'warn'; }
      b.querySelector('.tdot').className = 'tdot ' + lv; });
  }
  $('#scAckAll').onclick = () => { for (const a of AL.values()) a.ack = true; drawAlarms(); };

  // ------------------------------------------------ layar
  const SCREENS = L.screens.map(sc => {
    const inPane = (x, y, m = 4) => sc.panes.some(([px, py, pw, ph]) => x >= px - m && x <= px + pw + m && y >= py - m && y <= py + ph + m);
    const units = Object.keys(UNITS).filter(t => inPane(UNITS[t].x, UNITS[t].y, -2));
    const streams = Object.keys(STREAMS).filter(sid => STREAMS[sid].s.some(seg => seg.some(p => inPane(p[0], p[1], 0))));
    const tableIds = streams.filter(sid => { const st = STREAMS[sid]; const pts = st.d ? [st.d] : (st.hex || []).concat(st.s.flat()); return pts.some(p => inPane(p[0], p[1], 0)); });
    return { ...sc, units, streams, tableIds, unitSet: new Set(units) };
  });
  $('#scTabs').innerHTML = SCREENS.map((s, i) => `<button role="tab" aria-selected="${i === 0}" data-id="${s.id}"><span class="tdot"></span>${esc(s.t)}</button>`).join('');
  $$('#scTabs button').forEach(b => b.onclick = () => show(b.dataset.id));
  let cur = null, refs = null;
  // warna medium digelapkan agar kontras di latar putih
  const dk = (hex, f = 0.74) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
  const colOf = sid => dk((MEDIUM[REG.ST[sid]?.medium] || ['#9FB5AC'])[0]);

  function paneTransforms(sc) {
    const reg = sc.table ? [16, 24, 1368, 1032] : [16, 16, 1888, 1048];
    const n = sc.panes.length, gap = 24, hEach = (reg[3] - gap * (n - 1)) / n;
    const fits = sc.panes.map(([x, y, w, h]) => { const s = Math.min(reg[2] / w, hEach / h); return { x, y, w, h, s, W: w * s, H: h * s }; });
    const tot = fits.reduce((a, f) => a + f.H, 0) + gap * (n - 1); let yy = reg[1] + (reg[3] - tot) / 2;
    return fits.map(f => { const o = { ...f, dx: reg[0] + (reg[2] - f.W) / 2, dy: yy }; yy += f.H + gap; return o; });
  }
  function render(sc) {
    const P = paneTransforms(sc); let g = `<defs>${defs()}${meshPattern}${P.map((p, i) => `<clipPath id="clip${i}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/></clipPath>`).join('')}</defs>`;
    g += `<g class="hmi">`;
    P.forEach((p, pi) => {
      const inP = (x, y, m) => x >= p.x - m && x <= p.x + p.w + m && y >= p.y - m && y <= p.y + p.h + m;   // hanya isi milik pane ini (tanpa salinan tersembunyi)
      const paneStreams = sc.streams.filter(sid => STREAMS[sid].s.some(seg => seg.some(q => inP(q[0], q[1], 0))));
      const paneUnits = sc.units.filter(t => inP(UNITS[t].x, UNITS[t].y, -2));
      const k = 1 / Math.sqrt(p.s), fs = 12 * k;
      g += `<g transform="translate(${p.dx} ${p.dy}) scale(${p.s}) translate(${-p.x} ${-p.y})"><g clip-path="url(#clip${pi})">`;
      if (P.length > 1 || sc.table) g += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="#B9C3CA" stroke-width="${1.5 * k}" rx="${8 * k}"/>`;
      for (const b of L.boxes) g += `<rect class="boxd" x="${b.r[0]}" y="${b.r[1]}" width="${b.r[2]}" height="${b.r[3]}" stroke-width="${1.2 * k}"/><text class="boxl" x="${b.lp[0]}" y="${b.lp[1]}" font-size="${fs * .95}">${esc(b.l)}</text>`;
      // aliran: pipa bergaris ganda (bingkai gelap + isi terang) dengan garis alir berwarna medium di tengah.
      // Lapisan digambar terpisah (bingkai → isi → alir → aksesori) agar sambungan pipa menyatu rapi.
      let gO = '', gI = '', gF = '', gT = '', gV = '';
      for (const sid of paneStreams) {
        const st = STREAMS[sid], col = colOf(sid), sig = /^EL-|^H-03$/.test(sid);
        for (const seg of st.s) {
          const pts = seg.map(q => q.join(',')).join(' ');
          if (sig) {   // listrik / sinyal: garis tunggal putus-putus
            gF += `<polyline class="sline sig" data-sid="${sid}" points="${pts}" stroke="${col}" stroke-opacity=".55" stroke-width="${1.8 * k}" stroke-dasharray="${6 * k} ${3 * k} ${1.5 * k} ${3 * k}"/>`;
            gF += `<polyline class="sflow" data-flow="${sid}" points="${pts}" stroke="${col}" stroke-width="${1.8 * k}" style="stroke-dasharray:${9 * k} ${5 * k}"/>`;
          } else {
            gO += `<polyline class="sline pipe-o" data-sid="${sid}" points="${pts}" stroke-width="${6.6 * k}"/>`;
            gI += `<polyline class="sline pipe-i" data-sid="${sid}" points="${pts}" stroke-width="${4 * k}"/>`;
            gF += `<polyline class="sflow" data-flow="${sid}" points="${pts}" stroke="${col}" stroke-width="${1.9 * k}" style="stroke-dasharray:${9 * k} ${5 * k}"/>`;
          }
          gT += `<polyline data-hit="${sid}" points="${pts}" stroke="transparent" stroke-width="${12 * k}" fill="none" style="cursor:pointer"/>`;
          const a = seg[seg.length - 2], b = seg[seg.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
          gT += `<polygon class="parw" points="0,0 ${-9 * k},${-5 * k} ${-9 * k},${5 * k}" transform="translate(${b[0]} ${b[1]}) rotate(${ang})"/>`;
        }
      }
      for (const sid of paneStreams) {
        const st = STREAMS[sid], col = colOf(sid);
        if (st.v) gT += `<g transform="translate(${st.v[0]} ${st.v[1]}) scale(${k}) translate(${-st.v[0]} ${-st.v[1]})">${valve(st.v[0], st.v[1], st.v[2])}</g>`;
        for (const h of st.hex || []) gT += `<g class="dia" data-sid="${sid}" transform="translate(${h[0]} ${h[1]}) scale(${k})" tabindex="0" role="button" aria-label="Aliran ${sid}">${hexConn(0, 0, h[2], col).replace(/translate\([^)]*\)/, 'translate(0 0)')}</g>`;
        if (st.d) gT += `<g class="dia" data-sid="${sid}" transform="translate(${st.d[0]} ${st.d[1]}) scale(${k})" tabindex="0" role="button" aria-label="Aliran ${sid}">${diamond(0, 0, sid, col)}</g>`;
        if (sc.table && st.d && D[sid] !== null) {   // kotak nilai putih (angka + satuan) seperti indikator HMI
          const vs = fmtAuto(D[sid]), u = REG.ST[sid]?.u || '', bw = Math.max(5, vs.length + 1) * 6.3 + u.length * 4.9 + 12;
          const vx = st.d[0] + 12 * k + bw * k > p.x + p.w - 4 ? st.d[0] - 12 * k - bw * k : st.d[0] + 12 * k;   // balik ke kiri bila terpotong tepi panel
          gV += `<g class="vbox" transform="translate(${vx} ${Math.max(p.y + 2, st.d[1] - 25 * k)}) scale(${k})"><rect width="${bw}" height="16" rx="1.5"/><text class="vtag" data-v="${sid}" x="5" y="11.6" font-size="10.5">${vs}</text><text class="vunit" x="${bw - 4}" y="11.6" text-anchor="end" font-size="8.6">${esc(u)}</text></g>`;
        }
      }
      g += gO + gI + gF + gT;
      // unit
      for (const tag of paneUnits) {
        const u = UNITS[tag]; const e = REG.EQ[tag];
        if (u.t === 'label') { g += `<text x="${u.x}" y="${u.y}" text-anchor="middle" font-size="${fs}" font-style="italic" fill="#4B5862">${esc(u.n)}</text>`; continue; }
        if (u.t === 'term') { g += `<g class="term" transform="translate(${u.x} ${u.y})">${symbol('term', u.w, u.h, u.c)}<text y="${4 * Math.min(1.25, 1 / k * .75)}" text-anchor="middle" font-size="${Math.min(13, fs * 1.05)}" font-weight="700">${esc(u.n)}</text></g>`; continue; }
        if (u.t === 'node') { g += `<g transform="translate(${u.x} ${u.y})">${symbol('node', 6, 6, 'gray')}</g>`; continue; }
        const isEq = !!e && u.t !== 'bus';
        g += `<g class="unit" data-tag="${tag}" transform="translate(${u.x} ${u.y})" ${isEq ? `tabindex="0" role="button" aria-label="${esc(tag)} ${esc(e.name)}"` : ''}>`;
        g += `<rect class="ring" x="${-u.w / 2 - 6}" y="${-u.h / 2 - 6}" width="${u.w + 12}" height="${u.h + 12}" rx="8" stroke-width="${2.4 * k}"/>`;
        g += `<g class="ubody">${symbol(u.t, u.w, u.h, HOT_U.has(tag) ? 'hot' : u.c)}</g>`;
        if (u.t === 'header') g += `<text y="-4" text-anchor="middle" class="tagt" font-size="${fs * 1.1}" style="fill:#fff">${tag}</text><text y="${14 * k + 4}" text-anchor="middle" font-size="${fs}" style="fill:#FFE9E6">${esc(u.n || '')}</text>`;
        else if (u.lab) { const [dx, dy, an] = u.lab; g += `<text x="${dx}" y="${dy}" text-anchor="${an}" class="tagt" font-size="${fs * 1.08}">${tag}</text><text x="${dx}" y="${dy + 14 * k}" text-anchor="${an}" class="namet" font-size="${fs}">${esc(u.n || e?.name || '')}</text>`; }
        if (KEY_UNITS.has(tag)) g += `<rect class="lamp run" data-lamp="${tag}" x="${u.w / 2 - 2 - 5 * k}" y="${-u.h / 2 + 2 - 5 * k}" width="${10 * k}" height="${10 * k}" rx="${1.5 * k}"/>`;
        g += `</g>`;
      }
      g += gV + `</g></g>`;
    });
    // tabel aliran layar
    if (sc.table) {
      const ids = sc.tableIds, x0 = 1400, y0 = 24, w = 504, rh = Math.min(38, (1032 - 60) / Math.max(1, ids.length));
      g += `<rect class="panelbg" x="${x0}" y="${y0}" width="${w}" height="1032" rx="12"/><rect class="ptbar" x="${x0}" y="${y0}" width="${w}" height="44" rx="12"/><rect class="ptbar" x="${x0}" y="${y0 + 24}" width="${w}" height="20"/><text class="ptitle" x="${x0 + 16}" y="${y0 + 28}">ALIRAN PADA LAYAR INI</text>`;
      g += `<text x="${x0 + 16}" y="${y0 + 52}" font-size="12" class="thd">No</text><text x="${x0 + 240}" y="${y0 + 52}" font-size="12" class="thd" text-anchor="end">Laju</text><text x="${x0 + 250}" y="${y0 + 52}" font-size="12" class="thd">Satuan</text><text x="${x0 + 390}" y="${y0 + 52}" font-size="12" class="thd" text-anchor="end">T °C</text><text x="${x0 + 480}" y="${y0 + 52}" font-size="12" class="thd" text-anchor="end">P bar a</text>`;
      ids.forEach((sid, i) => {
        const y = y0 + 62 + i * rh, s = REG.ST[sid], p = s.pipe || {}, fz = Math.min(15, rh * 0.46);
        g += `<g class="prow" data-sid="${sid}" style="cursor:pointer"><rect x="${x0 + 6}" y="${y}" width="${w - 12}" height="${rh - 3}" rx="6" fill="transparent"/>
          <rect x="${x0 + 14}" y="${y + rh / 2 - 5}" width="10" height="8" rx="2" fill="${colOf(sid)}"/><text x="${x0 + 32}" y="${y + rh / 2 + 4}" font-size="${fz}" font-weight="700">${sid}</text>
          <text x="${x0 + 240}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="${fz}" data-t="${sid}" class="tval">${D[sid] === null ? 'n/a' : fmtAuto(D[sid])}</text>
          <text x="${x0 + 250}" y="${y + rh / 2 + 4}" font-size="${fz * .85}" class="tmut">${esc(s.u || '')}</text>
          <text x="${x0 + 390}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="${fz}">${p.T ?? '·'}</text><text x="${x0 + 480}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="${fz}">${p.P !== null && p.P !== undefined ? fmt(p.P, 1) : '·'}</text></g>`;
      });
    }
    g += `</g>`;
    svg.innerHTML = g;
    refs = { flows: $$('[data-flow]', svg), lines: $$('.sline', svg), vtags: $$('[data-v]', svg), cells: $$('[data-t]', svg), lamps: $$('[data-lamp]', svg), units: $$('.unit', svg) };
    wireSvg(); update();
  }
  function show(id, keepView) {
    const sc = SCREENS.find(s => s.id === id) || SCREENS[0]; cur = sc;
    $$('#scTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.id === sc.id));
    hidePop(); face.hidden = true; if (!keepView) resetView(); render(sc); drawAlarms();
  }

  // ------------------------------------------------ pembaruan nilai
  function update() {
    if (!refs) return;
    for (const el of refs.flows) {
      const sid = el.dataset.flow, r = ratio(sid);
      const stop = r < 0.05; el.classList.toggle('stop', stop); el.classList.toggle('slow', !stop && r < 0.6); el.classList.toggle('fast', r > 1.05);
      if (S.paused && S.mode === 'sim') el.style.animationPlayState = 'paused'; else el.style.animationPlayState = '';
    }
    for (const el of refs.lines) el.classList.toggle('dim', ratio(el.dataset.sid) < 0.05);
    for (const el of refs.vtags) { const v = val(el.dataset.v); el.textContent = v === null ? 'n/a' : fmtAuto(v); }
    for (const el of refs.cells) { const v = val(el.dataset.t); el.textContent = v === null ? 'n/a' : fmtAuto(v); }
    for (const el of refs.lamps) {
      const t = el.dataset.lamp; let c = 'run';
      if (!R(t)) c = 'stop';
      else if (S.mode === 'sim') { for (const a of AL.values()) if (a.active && a.tag === t && a.pr !== 'lo') { c = a.pr === 'hi' ? 'alarm' : 'warn'; if (c === 'alarm') break; } }
      el.setAttribute('class', 'lamp ' + c);
    }
    for (const el of refs.units) el.classList.toggle('stopped', !R(el.dataset.tag));
    drawKpi(); if (!face.hidden) drawFace(); if (popSid) drawPop();
    $('#scClock').textContent = timeStr(S.mode === 'sim' ? S.t : Date.now());
  }

  // ------------------------------------------------ popover aliran & faceplate
  let popSid = null, popPin = false;
  function popHTML(sid) {
    const s = REG.ST[sid], p = s.pipe || {}, v = val(sid);
    return `<b>Aliran ${esc(sid)}</b> · ${esc(s.pfd_name)}<div class="r"><span>${esc(s.medium)}</span><span>${esc(s.from_tag)} → ${esc(s.to_tag)}</span></div>
      <div class="q">${v === null ? (s.qst === 'SIAGA' ? 'siaga' : 'n/a') : fmtAuto(v) + ' ' + esc(s.u)}</div>
      ${S.mode === 'sim' && D[sid] !== null ? `<div class="r"><span>Desain</span><span>${fmtAuto(D[sid])} ${esc(s.u)}</span></div>` : ''}
      <div class="r"><span>T</span><span>${p.T !== null && p.T !== undefined ? fmt(p.T, 0) + ' °C' : 'n/a'}</span></div><div class="r"><span>P</span><span>${p.P !== null && p.P !== undefined ? fmt(p.P, 2) + ' bar a' : 'n/a'}</span></div>
      <div class="r"><span>DN</span><span>${p.DN ? 'DN' + p.DN + (p.v !== null ? ' · ' + fmt(p.v, 1) + ' m/s' : '') : 'n/a'}</span></div><div class="r"><span>Status neraca</span><span>${esc(s.qst || 'n/a')}</span></div>`;
  }
  function drawPop() { if (popSid) pop.innerHTML = popHTML(popSid); }
  function showPop(sid, cx, cy, pin = false) {
    popSid = sid; popPin = pin; drawPop(); pop.hidden = false;
    const r = screenEl.getBoundingClientRect(); const x = cx - r.left, y = cy - r.top;
    pop.style.left = Math.max(6, Math.min(r.width - pop.offsetWidth - 6, x + 14)) + 'px'; pop.style.top = Math.max(6, Math.min(r.height - pop.offsetHeight - 6, y + 14)) + 'px';
    $$('.dia', svg).forEach(d => d.classList.toggle('sel', d.dataset.sid === sid && pin));
  }
  function hidePop() { popSid = null; popPin = false; pop.hidden = true; $$('.dia.sel', svg).forEach(d => d.classList.remove('sel')); }
  let faceTag = null;
  function faceVals(tag) {
    const us = UNIT_STREAMS[tag] || { i: [], o: [] }; const out = [];
    if (tag === 'EL-501') out.push(['Beban PEME', fmt((S.mode === 'sim' ? S.load : 1) * 100, 0) + ' %', null]);
    for (const sid of [...us.i, ...us.o]) { if (out.length >= 6) break; if (!STREAMS[sid]) continue; const v = val(sid); if (v === null) continue;
      out.push([`${us.i.includes(sid) ? 'Masuk' : 'Keluar'} ${sid}`, `${fmtAuto(v)} ${REG.ST[sid].u}`, sid]); }
    const mo = us.o.find(s => REG.ST[s]?.pipe?.T !== null && REG.ST[s]?.pipe?.T !== undefined);
    if (mo && out.length < 6) { const p = REG.ST[mo].pipe; out.push([`T / P keluar (${mo})`, `${fmt(p.T, 0)} °C · ${fmt(p.P, 1)} bar a`, null]); }
    return out;
  }
  function drawFace() {
    const tag = faceTag, e = REG.EQ[tag]; if (!e) return;
    const vals = faceVals(tag), tsid = (vals.find(v => v[2]) || [])[2];
    const running = R(tag), alarm = [...AL.values()].some(a => a.active && a.tag === tag && a.pr === 'hi');
    let trend = ''; if (tsid) { const h = HIST[tsid].length ? HIST[tsid] : [val(tsid)]; const d = D[tsid] || 1, mx = Math.max(d * 1.1, ...h), mn = Math.min(0, ...h);
      const pts = h.map((v, i) => `${(i / 59) * 300},${64 - (v - mn) / (mx - mn || 1) * 56}`).join(' ');
      trend = `<div class="fp-trend"><span>Trend 60 s · aliran ${tsid}</span><svg viewBox="0 0 300 70" preserveAspectRatio="none"><line x1="0" x2="300" y1="${64 - (d - mn) / (mx - mn || 1) * 56}" y2="${64 - (d - mn) / (mx - mn || 1) * 56}" stroke="#9AA3AA" stroke-dasharray="4 4"/><polyline points="${pts}" fill="none" stroke="#1F7A4D" stroke-width="2" vector-effect="non-scaling-stroke"/></svg></div>`; }
    face.innerHTML = `<div class="fp-h"><b>${esc(tag)}</b><small>${esc(e.name)}</small><button aria-label="Tutup faceplate" data-x><svg><use href="#i-close"/></svg></button></div>
      <div class="fp-b"><div class="fp-st"><span class="fp-pill ${alarm ? 'alarm' : running ? 'run' : 'stop'}">${alarm ? 'ALARM' : running ? 'RUNNING' : 'STOPPED'}</span>
      <button class="fp-pill mode" data-mode title="Ubah mode kendali">${S.man[tag] ? 'MAN' : 'AUTO'}</button><span class="fp-pill">${esc(e.status)}</span></div>
      <div class="fp-vals">${vals.map(v => `<span>${esc(v[0])}</span><b>${esc(v[1])}</b>`).join('') || '<span>Tidak ada aliran terkuantifikasi</span><b></b>'}</div>${trend}
      <div class="fp-act">${S.mode === 'sim' ? `<button class="sc-btn ${running ? 'danger' : 'go'}" data-ss>${running ? 'Stop' : 'Start'}</button>` : ''}<button class="sc-btn" data-3d><svg width="14" height="14" style="vertical-align:-2px"><use href="#i-cube"/></svg> Lihat di 3D</button></div></div>`;
    face.querySelector('[data-x]').onclick = () => { face.hidden = true; faceTag = null; $$('.unit.sel', svg).forEach(u => u.classList.remove('sel')); };
    face.querySelector('[data-mode]').onclick = () => { S.man[tag] = !S.man[tag]; drawFace(); };
    const ss = face.querySelector('[data-ss]'); if (ss) ss.onclick = () => { S.run[tag] = !running; evalAlarms(); drawAlarms(); update(); };
    face.querySelector('[data-3d]').onclick = () => emit('show-3d', { tag });
  }
  function openFace(tag, cx, cy) {
    if (!REG.EQ[tag]) return; faceTag = tag; face.hidden = false; drawFace(); hidePop();
    $$('.unit', svg).forEach(u => u.classList.toggle('sel', u.dataset.tag === tag));
    const r = screenEl.getBoundingClientRect(); let x = cx - r.left + 16, y = cy - r.top - 40;
    if (x + face.offsetWidth > r.width - 8) x = cx - r.left - face.offsetWidth - 16;
    face.style.left = Math.max(8, x) + 'px'; face.style.top = Math.max(8, Math.min(r.height - face.offsetHeight - 8, y)) + 'px';
  }

  // ------------------------------------------------ interaksi SVG + pan/zoom
  let VB = { x: 0, y: 0, w: 1920, h: 1080 }, panMode = false;
  const setVB = () => svg.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
  function resetView() { VB = { x: 0, y: 0, w: 1920, h: 1080 }; setVB(); }
  function zoom(f, cx = VB.x + VB.w / 2, cy = VB.y + VB.h / 2) {
    const w = Math.max(240, Math.min(1920, VB.w / f)), h = w * 1080 / 1920;
    VB.x = cx - (cx - VB.x) * (w / VB.w); VB.y = cy - (cy - VB.y) * (h / VB.h); VB.w = w; VB.h = h; clampVB(); setVB();
  }
  function clampVB() { VB.x = Math.max(0, Math.min(1920 - VB.w, VB.x)); VB.y = Math.max(0, Math.min(1080 - VB.h, VB.y)); }
  const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); const s = Math.max(VB.w / r.width, VB.h / r.height); const ox = (r.width - VB.w / s) / 2, oy = (r.height - VB.h / s) / 2; return [VB.x + (cx - r.left - ox) * s, VB.y + (cy - r.top - oy) * s, s]; };
  $$('.sc-zoom [data-z]').forEach(b => b.onclick = () => {
    const z = b.dataset.z; if (z === 'in') zoom(1.4); else if (z === 'out') zoom(1 / 1.4); else if (z === 'reset') resetView();
    else { panMode = !panMode; svg.classList.toggle('pan', panMode); b.setAttribute('aria-pressed', panMode); emit('toast', panMode ? 'Mode geser & cubit aktif' : 'Mode geser nonaktif: halaman dapat digulir'); }
  });
  svg.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey) && !panMode) return; e.preventDefault(); const [x, y] = toSvg(e.clientX, e.clientY); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
  const ptrs = new Map(); let drag = null, pinch = null, moved = false;
  svg.addEventListener('pointerdown', e => {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = false;
    if (ptrs.size === 2 && panMode) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: VB.w }; drag = null; }
    else if (ptrs.size === 1 && (e.pointerType === 'mouse' ? VB.w < 1920 : panMode)) { drag = { x: e.clientX, y: e.clientY, vx: VB.x, vy: VB.y }; }
  });
  svg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const [cx, cy] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); const tw = pinch.w * pinch.d / Math.max(10, d); zoom(VB.w / tw, cx, cy); moved = true; }
    else if (drag) { const [, , s] = toSvg(0, 0); const dx = (e.clientX - drag.x) * s, dy = (e.clientY - drag.y) * s; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; VB.x = drag.vx - dx; VB.y = drag.vy - dy; clampVB(); setVB(); }
  });
  const endPtr = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) drag = null; };
  svg.addEventListener('pointerup', endPtr); svg.addEventListener('pointercancel', endPtr);
  function wireSvg() {
    $$('.dia, .prow, [data-hit]', svg).forEach(d => {
      const sid = d.dataset.sid || d.dataset.hit;
      d.addEventListener('pointerenter', e => { if (!popPin && e.pointerType === 'mouse') showPop(sid, e.clientX, e.clientY); });
      d.addEventListener('pointerleave', () => { if (!popPin) hidePop(); });
      d.addEventListener('click', e => { if (moved) return; e.stopPropagation(); showPop(sid, e.clientX, e.clientY, true); });
      d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = d.getBoundingClientRect(); showPop(sid, r.right, r.top, true); } });
    });
    $$('.unit[tabindex]', svg).forEach(u => {
      u.addEventListener('click', e => { if (moved) return; e.stopPropagation(); openFace(u.dataset.tag, e.clientX, e.clientY); });
      u.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = u.getBoundingClientRect(); openFace(u.dataset.tag, r.right, r.top); } });
    });
  }
  svg.addEventListener('click', () => { if (!moved) hidePop(); });

  // ------------------------------------------------ header & panel samping
  const side = $('#scSide');
  side.innerHTML = `<h4>Gangguan (mode simulasi)</h4>
    <div class="sl-field"><label for="sgPeme">Beban PEME <output id="sgPemeO">100%</output></label><input type="range" id="sgPeme" min="60" max="100" step="1" value="100"></div>
    <div class="sl-field"><label for="sgLpp">Laju LPP <output id="sgLppO">100%</output></label><input type="range" id="sgLpp" min="50" max="110" step="1" value="100"></div>
    <div class="sl-field"><label for="sgLfg">Laju LFG <output id="sgLfgO">100%</output></label><input type="range" id="sgLfg" min="50" max="110" step="1" value="100"></div>
    <div class="sl-field sl-tog"><label class="switch"><input type="checkbox" id="sgWhr" checked><span></span>WHR/ORC</label></div>
    <div class="sl-field sl-tog"><label class="switch"><input type="checkbox" id="sgCcu" checked><span></span>CCU</label></div>
    <button class="sc-btn" id="scReset"><svg width="14" height="14" style="vertical-align:-2px"><use href="#i-reset"/></svg> Reset ke desain</button>
    <p class="sc-hint" id="scHint">Mode DESIGN menampilkan neraca paper (steady state). Pilih <b>SIMULASI</b> untuk menggerakkan nilai, menghentikan unit lewat faceplate, dan memberi gangguan.</p>
    <div><h4>Legenda medium</h4><div class="sc-legend">${['Padatan', 'Gas', 'CO₂', 'O₂', 'H₂', 'Metanol / campuran sintesis', 'Air / kondensat', 'Fluida kerja ORC', 'Panas', 'Listrik'].map(k => `<span><i style="background:${dk(MEDIUM[k][0])}"></i>${MEDIUM[k][1]}</span>`).join('')}</div></div>
    <div><h4>Status unit</h4><div class="sc-legend"><span><i class="lg-lamp" style="background:#22B14C"></i>Jalan</span><span><i class="lg-lamp" style="background:#9AA3AA"></i>Berhenti</span><span><i class="lg-lamp" style="background:#F08C1A"></i>Peringatan</span><span><i class="lg-lamp" style="background:#E0251B"></i>Alarm</span></div></div>`;
  const bindSl = (id, key) => { const el = $('#' + id), o = $('#' + id + 'O'); el.oninput = () => { S[key] = el.value / 100; o.textContent = el.value + '%'; if (S.mode !== 'sim') setMode('sim'); }; };
  bindSl('sgPeme', 'load'); bindSl('sgLpp', 'lpp'); bindSl('sgLfg', 'lfg');
  $('#sgWhr').onchange = e => { S.whr = e.target.checked; if (S.mode !== 'sim') setMode('sim'); };
  $('#sgCcu').onchange = e => { S.ccu = e.target.checked; if (S.mode !== 'sim') setMode('sim'); };
  function resetDesign() {
    Object.assign(S, { load: 1, lpp: 1, lfg: 1, whr: true, ccu: true, run: {}, man: {} }); resetValues(); AL.clear();
    ['sgPeme', 'sgLpp', 'sgLfg'].forEach(id => { $('#' + id).value = 100; $('#' + id + 'O').textContent = '100%'; }); $('#sgWhr').checked = true; $('#sgCcu').checked = true;
    drawAlarms(); update();
  }
  $('#scReset').onclick = () => { resetDesign(); emit('toast', 'Simulasi dikembalikan ke nilai desain.'); };
  function setMode(m) {
    S.mode = m; $$('.sc-modes [data-mode]').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === m));
    const lab = $('#scModeLabel'); lab.textContent = m === 'design' ? 'Nilai desain (steady state)' : 'SIMULASI'; lab.classList.toggle('sim', m === 'sim');
    $('#scHint').innerHTML = m === 'design' ? 'Mode DESIGN menampilkan neraca paper (steady state). Pilih <b>SIMULASI</b> untuk menggerakkan nilai, menghentikan unit lewat faceplate, dan memberi gangguan.'
      : 'SIMULASI aktif: nilai bergerak dengan derau ±2%, unit dapat di-Start/Stop lewat faceplate, aliran hilir turun bertahap (time constant 3–12 s).';
    if (m === 'design') resetDesign(); else S.t = Date.now();
    if (!face.hidden) drawFace(); update(); drawAlarms();
  }
  $$('.sc-modes [data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $$('.sc-speed [data-speed]').forEach(b => b.onclick = () => { S.speed = +b.dataset.speed; $$('.sc-speed [data-speed]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#scPause').onclick = () => { S.paused = !S.paused; $('#scPause').innerHTML = `<svg><use href="#i-${S.paused ? 'play' : 'pause'}"/></svg>`; $('#scPause').setAttribute('aria-label', S.paused ? 'Lanjutkan simulasi' : 'Jeda simulasi'); update(); };

  // ------------------------------------------------ loop (aktif hanya saat SCADA terlihat)
  let visible = false, acc = 0, last = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe($('#scadaApp'));
  setInterval(() => {
    const now = performance.now(), rdt = Math.min(1, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    if (S.mode === 'sim' && !S.paused) {
      const dt = rdt * S.speed; const n = Math.ceil(dt / 0.5); for (let i = 0; i < n; i++) stepSim(dt / n);
      S.t += dt * 1000; acc += dt;
      while (acc >= 1) { acc -= 1; for (const sid in HIST) { const v = val(sid); if (v === null) continue; HIST[sid].push(v); if (HIST[sid].length > 60) HIST[sid].shift(); } evalAlarms(); drawAlarms(); }
    }
    update();
  }, 250);

  show('overview'); drawAlarms();

  // ------------------------------------------------ API untuk modul lain
  function screenFor(tags) {
    for (const sc of SCREENS.slice(1)) if (tags.some(t => sc.unitSet.has(t))) return sc.id;
    return 'overview';
  }
  function flash(tags) {
    $$('.unit', svg).forEach(u => u.classList.toggle('hl', tags.includes(u.dataset.tag)));
    setTimeout(() => $$('.unit.hl', svg).forEach(u => u.classList.remove('hl')), 6000);
  }
  return {
    focusTags(tags, screen) {
      tags = (tags || []).filter(Boolean); const vis = tags.filter(t => UNITS[t]);
      show(screen && screen !== 'overview' ? screen : vis.length ? screenFor(vis) : (screen || 'overview'));
      flash(vis);
      if (vis.length === 1) { const el = svg.querySelector(`.unit[data-tag="${CSS.escape(vis[0])}"]`); if (el) { const r = el.getBoundingClientRect(); setTimeout(() => openFace(vis[0], r.right, r.top + r.height / 2), 50); } }
      else if (tags.length && !vis.length) emit('toast', `${tags[0]} adalah unit pendukung/utilitas yang tidak ada di PFD; menampilkan Overview.`);
    },
    focusStream(sid) {
      const sc = SCREENS.slice(1).find(s => s.tableIds.includes(sid)) || SCREENS[0]; show(sc.id);
      const d = svg.querySelector(`.dia[data-sid="${CSS.escape(sid)}"]`) || svg.querySelector(`[data-hit="${CSS.escape(sid)}"]`);
      if (d) { const r = d.getBoundingClientRect(); setTimeout(() => showPop(sid, r.right, r.top, true), 50); }
      else emit('toast', `Aliran ${sid} adalah utilitas pendukung yang tidak ada di PFD.`);
    },
  };
}
