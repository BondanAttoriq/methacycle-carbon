// Simbol SVG unit HMI gaya klasik (latar putih): peralatan logam abu-abu berkilap, unit panas merah,
// pipa bergaris ganda, valve merah dengan aktuator, kotak nilai putih, konektor panah abu-abu.
// Semua digambar berpusat di (0,0) dengan lebar w, tinggi h.
// AREA_COL: [gelap, tengah, terang] dipakai untuk detail (mata kompresor, dudukan pompa).
const SILVER = ['#5E666D', '#A9B1B8', '#EEF1F3'];
export const AREA_COL = {
  brown: SILVER, green: SILVER, blue: SILVER, purple: SILVER, gold: SILVER, teal: SILVER, gray: SILVER,
  pink: SILVER, hot: ['#8E1B1B', '#D93A30', '#FFB3A6'],
};
const METAL = [[0, '#5B636A'], [.14, '#9AA3AA'], [.34, '#F4F6F7'], [.5, '#D5DADE'], [.72, '#A3ABB2'], [1, '#5E666D']];
const HOT = [[0, '#7E1414'], [.16, '#C9302A'], [.36, '#FF9C8C'], [.52, '#E24A3E'], [.76, '#B8231D'], [1, '#7A1212']];
const grad = (id, st, v) => `<linearGradient id="${id}" x1="0" x2="${v ? 0 : 1}" y1="0" y2="${v ? 1 : 0}">${st.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
export function defs() {
  let s = '';
  for (const k of Object.keys(AREA_COL)) { const st = k === 'hot' ? HOT : METAL; s += grad(`g-${k}`, st, false) + grad(`gv-${k}`, st, true); }
  s += grad('g-conn', [[0, '#9AA2A9'], [.45, '#6F787F'], [1, '#4C545B']], true);
  s += grad('g-valve', [[0, '#FF6B5E'], [.5, '#D7261E'], [1, '#8E1410']], true);
  s += grad('g-cell', [[0, '#3C4650'], [.35, '#8E9AA5'], [.5, '#C9D1D8'], [.7, '#7C8893'], [1, '#36404A']], false);
  s += `<radialGradient id="g-dome" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FF8A7E"/><stop offset=".55" stop-color="#D7261E"/><stop offset="1" stop-color="#8E1410"/></radialGradient>`;
  s += `<marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="context-stroke"/></marker>`;
  return s;
}
const K = '#2F373E';
const ST = `stroke="${K}" stroke-width="1.3"`;
const LN = `stroke="${K}" stroke-width="1.5" fill="none"`;
// garis sambungan las (flange) horizontal pada bejana
const seam = (x, y, w) => `<path d="M${x},${y}h${w}" stroke="${K}" stroke-opacity=".45" stroke-width="1"/>`;

export function symbol(t, w, h, c) {
  const f = `url(#g-${c})`, fv = `url(#gv-${c})`, x0 = -w / 2, y0 = -h / 2;
  switch (t) {
    case 'hopper': return `<polygon points="${x0},${y0} ${-x0},${y0} ${w * .1},${h * .3} ${w * .1},${-y0} ${-w * .1},${-y0} ${-w * .1},${h * .3}" fill="${f}" ${ST}/>${seam(x0 + 2, y0 + 5, w - 4)}`;
    case 'conveyor': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="${fv}" ${ST}/><ellipse cx="${x0 + h / 2}" cy="0" rx="${h * .3}" ry="${h / 2 - 1}" fill="none" stroke="${K}" stroke-width="1"/><ellipse cx="${-x0 - h / 2}" cy="0" rx="${h * .3}" ry="${h / 2 - 1}" fill="none" stroke="${K}" stroke-width="1"/>`;
    case 'sorter': return `<path d="M${x0},${y0}H${-x0}V${h * .08}L0,${-y0}L${x0},${h * .08}Z" fill="${f}" ${ST}/><path d="M${x0 + 8},${y0 + 10}h${w - 22}m-6,-4l6,4l-6,4" ${LN}/><path d="M${x0 + 6},${h * .08}H${-x0 - 6}" stroke="${K}" stroke-dasharray="3 3"/>`;
    case 'shredder': return `<polygon points="${x0},${y0} ${-x0},${y0} ${w * .36},${-y0} ${-w * .36},${-y0}" fill="${f}" ${ST}/><path d="M-7,-7L7,7M7,-7L-7,7" ${LN}/>`;
    case 'dryer': return `<path d="M${x0 + 10},${y0}H${-x0 - 10}L${-x0},${y0 + 14}V${-y0}H${x0}V${y0 + 14}Z" fill="${f}" ${ST}/><circle cx="0" cy="${y0 + h * .34}" r="${w * .2}" fill="#fff" fill-opacity=".35" ${LN}/><path d="M${-w * .12},${y0 + h * .34 - 4}a${w * .12},${w * .12} 0 0 1 ${w * .24},0" ${LN}/>${seam(x0 + 1, -y0 - 10, w - 2)}`;
    case 'furnace': return `<rect x="${-w * .3}" y="${y0}" width="${w * .6}" height="${h * .38}" fill="${f}" ${ST}/><path d="M${-w * .38},${y0 + h * .38}H${w * .38}L${-x0},${y0 + h * .5}V${-y0 - 8}H${x0}V${y0 + h * .5}Z" fill="${f}" ${ST}/><path d="M${-w * .3},${y0 + h * .58}H${w * .26}L${-w * .3},${y0 + h * .86}H${w * .3}" ${LN}/><path d="M${x0 - 8},${y0 + h * .55}h${w + 16}M${x0 - 8},${y0 + h * .88}h${w + 16}" stroke="${K}" stroke-width="1"/>`;
    case 'burner': return `<polygon points="0,${y0} ${-x0},${-y0} ${x0},${-y0}" fill="${f}" ${ST}/><polygon points="0,${y0 + h * .35} ${w * .25},${-y0 - 5} ${-w * .25},${-y0 - 5}" fill="#FFD27A" stroke="${K}" stroke-width="1.2"/>`;
    case 'whb': return `<rect x="${x0}" y="${y0 + h * .16}" width="${w}" height="${h * .84}" rx="3" fill="${f}" ${ST}/><path d="M${-w * .18},${y0 + h * .16}a${w * .18},${h * .16} 0 0 1 ${w * .36},0Z" fill="${f}" ${ST}/>${seam(x0 + 1, y0 + h * .34, w - 2)}${seam(x0 + 1, y0 + h * .82, w - 2)}`;
    case 'esp': return `<path d="M${x0},${y0}H${-x0}V${h * .1}L${w * .08},${-y0}H${-w * .08}L${x0},${h * .1}Z" fill="${f}" ${ST}/><path d="M-12,${-h * .12}h8M-4,${-h * .22}v20M4,${-h * .22}v20M4,${-h * .12}h8" ${LN}/>`;
    case 'scrubber': return `<path d="M${x0},${y0}H${-x0}V${h * .1}L${w * .08},${-y0}H${-w * .08}L${x0},${h * .1}Z" fill="${f}" ${ST}/><path d="M-8,${y0 + 8}q8,4 16,0M0,${y0 + 10}v${h * .38}" ${LN}/><path d="M-4,${y0 + h * .48}l4,6l4,-6" ${LN}/>`;
    case 'hx': { const r = Math.min(w, h) / 2; return `<circle r="${r}" fill="${f}" ${ST}/><circle r="${r - 2.5}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/><path d="M${-r * .8},${r * .2}l${r * .35},${-r * .55}l${r * .35},${r * .7}l${r * .35},${-r * .7}l${r * .35},${r * .7}l${r * .2},${-r * .3}" ${LN}/>`; }
    case 'vessel': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${w / 2}" fill="${f}" ${ST}/><rect x="${x0 + 1}" y="${y0 + h * .17}" width="${w - 2}" height="${h * .12}" fill="url(#mesh)" stroke="${K}" stroke-width=".8"/>${seam(x0 + 1, -y0 - w * .4, w - 2)}`;
    case 'adsorber': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/><path d="M${x0},${y0 + 8}H${-x0}M${x0},${-y0 - 8}H${-x0}M${x0},${y0 + 8}L${-x0},${-y0 - 8}M${-x0},${y0 + 8}L${x0},${-y0 - 8}" stroke="${K}" stroke-width="1.1"/>`;
    case 'compressor': {   // kompresor/blower sentrifugal: volute bulat utuh + saluran keluar tangensial di kanan atas
      const r = Math.min(h / 2, w * 0.4), cx = x0 + r, oh = r * 0.78;
      return `<rect x="${cx}" y="${-r}" width="${w / 2 - cx}" height="${oh}" rx="1.5" fill="${fv}" ${ST}/>`
        + `<circle cx="${cx}" cy="0" r="${r}" fill="${f}" ${ST}/>`
        + `<circle cx="${cx}" cy="0" r="${r * 0.42}" fill="${AREA_COL[c][0]}" fill-opacity=".3" stroke="${K}" stroke-width="1.5"/>`
        + `<circle cx="${cx}" cy="0" r="${r * 0.12}" fill="${K}"/>`;
    }
    case 'electrolyzer': { let s = ''; const n = 12, cw = (w - 40) / n; for (let i = 0; i < n; i++) s += `<rect x="${x0 + 20 + i * cw + cw * .2}" y="${y0 + h * .32}" width="${cw * .6}" height="${h * .56}" rx="2" fill="url(#g-cell)" stroke="${K}" stroke-width=".8"/>`;
      return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="4" fill="${fv}" ${ST}/><rect x="${x0 + 12}" y="${y0 + h * .28}" width="${w - 24}" height="${h * .64}" rx="3" fill="#E6EAED" stroke="${K}" stroke-width="1"/>${s}`; }
    case 'mixer': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" fill="${f}" ${ST}/><path d="M${x0},${-y0}L${-x0},${y0}" stroke="${K}" stroke-width="1.1"/><path d="M${x0 + 6},${-6}l6,-6l6,6l6,-6" ${LN}/>`;
    case 'reactor': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${w / 2}" fill="${f}" ${ST}/>${[0.12, 0.52].map(k => `<rect x="${x0 + 3}" y="${y0 + h * k}" width="${w - 6}" height="${h * .36}" fill="none" stroke="${K}" stroke-width="1"/><path d="M${x0 + 3},${y0 + h * k}L${-x0 - 3},${y0 + h * (k + .36)}M${-x0 - 3},${y0 + h * k}L${x0 + 3},${y0 + h * (k + .36)}" stroke="${K}" stroke-width="1"/>`).join('')}`;
    case 'column': { let tr = ''; for (let i = 1; i < 16; i++) tr += `<path d="M${x0 + 8},${y0 + i * h / 16}h${w - 16}" stroke="${K}" stroke-width=".9" stroke-dasharray="4 3"/>`; return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${w / 2}" fill="${f}" ${ST}/>${tr}`; }
    case 'hdrum': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="${fv}" ${ST}/><path d="M${x0 + h * .5},${y0}v${h}M${-x0 - h * .5},${y0}v${h}" stroke="${K}" stroke-width=".8"/>`;
    case 'pump': {         // pompa sentrifugal: badan bulat utuh, nozzle keluar tangensial kanan atas, dudukan
      const r = Math.min(w, h) / 2 - 1, oh = r * 0.62;
      return `<polygon points="${-r * 0.75},${r * 0.55} ${r * 0.75},${r * 0.55} ${r * 1.05},${r + 5} ${-r * 1.05},${r + 5}" fill="#7E878E" stroke="${K}" stroke-width="1.2"/>`
        + `<rect x="0" y="${-r}" width="${r + 5}" height="${oh}" rx="1.5" fill="${fv}" ${ST}/>`
        + `<circle r="${r}" fill="${f}" ${ST}/>`
        + `<path d="M${r * 0.38},${-r * 0.42}A${r * 0.55},${r * 0.55} 0 1 0 ${r * 0.38},${r * 0.42}" fill="none" stroke="${K}" stroke-width="1.9" stroke-linecap="round"/>`;
    }
    case 'tank': return `<path d="M${x0},${y0 + h * .28}L0,${y0}L${-x0},${y0 + h * .28}V${-y0}H${x0}Z" fill="${f}" ${ST}/><path d="M${x0},${y0 + h * .28}H${-x0}" stroke="${K}" stroke-width="1"/>${seam(x0 + 1, y0 + h * .64, w - 2)}`;
    case 'turbine': return `<polygon points="${x0},${y0 + h * .3} ${-x0},${y0} ${-x0},${-y0} ${x0},${-y0 - h * .3}" fill="${f}" ${ST}/>`;
    case 'generator': { const r = Math.min(w, h) / 2; return `<circle r="${r}" fill="${f}" ${ST}/><text y="6" text-anchor="middle" font-size="17" font-weight="800" fill="${K}" style="font-family:Poppins,sans-serif">G</text>`; }
    case 'stack': return `<polygon points="${-w * .3},${y0} ${w * .3},${y0} ${-x0},${-y0} ${x0},${-y0}" fill="${f}" ${ST}/>`;
    case 'oxidizer': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/><path d="M${x0 + 10},${-y0 - 6}L0,${y0 + 8}L${-x0 - 10},${-y0 - 6}ZM${x0 + 22},${-y0 - 6}L0,${y0 + 22}L${-x0 - 22},${-y0 - 6}" ${LN}/>`;
    case 'polish': case 'watertreat': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/><path d="M${x0 + 4},${y0 + h * .3}h${w - 8}M${x0 + 4},${y0 + h * .7}h${w - 8}" stroke="${K}" stroke-dasharray="4 3"/>`;
    case 'header': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/>`;
    case 'bus': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" fill="url(#gv-gray)" ${ST}/>`;
    case 'splitter': return `<polygon points="0,${y0} ${-x0},0 0,${-y0} ${x0},0" fill="${f}" ${ST}/>`;
    case 'node': return `<circle r="3.5" fill="${K}"/>`;
    case 'term': return `<polygon points="${x0},${y0} ${-x0 - 8},${y0} ${-x0},0 ${-x0 - 8},${-y0} ${x0},${-y0}" fill="url(#g-conn)" stroke="${K}" stroke-width="1.2"/>`;
    default: return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${f}" ${ST}/>`;
  }
}
export const meshPattern = `<pattern id="mesh" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0V5M2.5,0V5" stroke="${K}" stroke-width=".8"/></pattern>`;
// konektor antarhalaman: tag panah abu-abu dengan teks putih (strip warna medium di kiri)
export function hexConn(x, y, label, color) {
  const w = Math.max(36, label.length * 7 + 16), h = 16, a = 7;
  return `<g class="conn" transform="translate(${x} ${y})"><polygon points="${-w / 2},${-h / 2} ${w / 2 - a},${-h / 2} ${w / 2},0 ${w / 2 - a},${h / 2} ${-w / 2},${h / 2}"/><rect x="${-w / 2 + 1}" y="${-h / 2 + 1}" width="3.5" height="${h - 2}" fill="${color}"/><text x="2" y="3.6" text-anchor="middle">${label}</text></g>`;
}
// nomor aliran: kotak putih kecil berbingkai abu-abu dengan garis warna medium
export function diamond(x, y, label, color) {
  const w = Math.max(20, label.length * 6.6 + 9), h = 15;
  return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="2"/><path d="M${-w / 2 + 2},${h / 2 - 1.2}h${w - 4}" stroke="${color}" stroke-width="2.2"/><text y="3.4" text-anchor="middle">${label}</text>`;
}
// valve kupu-kupu merah dengan aktuator kubah (seperti HMI klasik); o === 'v' untuk pipa vertikal
export function valve(x, y, o) {
  const body = `<polygon points="-8,-6 -8,6 0,0" fill="url(#g-valve)" stroke="#5A0E0B" stroke-width="1"/><polygon points="8,-6 8,6 0,0" fill="url(#g-valve)" stroke="#5A0E0B" stroke-width="1"/>`
    + `<path d="M0,0V-9" stroke="${K}" stroke-width="1.4"/><path d="M-7,-9A7,6 0 0 1 7,-9Z" fill="url(#g-dome)" stroke="#5A0E0B" stroke-width="1"/>`;
  return `<g transform="translate(${x} ${y})${o === 'v' ? ' rotate(90)' : ''}" class="valve">${body}</g>`;
}
