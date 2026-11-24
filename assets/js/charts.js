// Grafik SVG ringan buatan sendiri (tanpa library). Setiap grafik: judul, sumbu berlabel + satuan,
// legenda + label langsung, tooltip hover, dan tombol "Lihat data" (tabel alternatif).
import { fmt, esc } from './util.js';

export const C = { blue: '#1F6FB5', teal: '#129B8A', orange: '#E8862A', purple: '#7A5BB0', lime: '#6BA539', gray: '#8A9A94', red: '#E5484D', ink: '#17322A', muted: '#4F655D', grid: '#E3EEE8' };
const NS = 'http://www.w3.org/2000/svg';

let tipEl = null;
function tip() { if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'ch-tip'; tipEl.setAttribute('role', 'status'); document.body.appendChild(tipEl); } return tipEl; }
export function showTip(html, ev) {
  const t = tip(); t.innerHTML = html; t.style.display = 'block';
  const x = Math.min(innerWidth - t.offsetWidth - 10, ev.clientX + 14), y = Math.max(8, ev.clientY - t.offsetHeight - 12);
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
export function hideTip() { if (tipEl) tipEl.style.display = 'none'; }

export function marker(shape, x, y, r, fill, stroke = '#fff') {
  const s = `fill="${fill}" stroke="${stroke}" stroke-width="2"`;
  if (shape === 'square') return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="1.5" ${s}/>`;
  if (shape === 'diamond') return `<polygon points="${x},${y - r * 1.25} ${x + r * 1.25},${y} ${x},${y + r * 1.25} ${x - r * 1.25},${y}" ${s}/>`;
  if (shape === 'triangle') return `<polygon points="${x},${y - r * 1.3} ${x + r * 1.2},${y + r * 0.9} ${x - r * 1.2},${y + r * 0.9}" ${s}/>`;
  return `<circle cx="${x}" cy="${y}" r="${r}" ${s}/>`;
}

function niceTicks(min, max, n = 5) {
  const span = max - min || 1, step0 = span / n, p = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * p).find(s => s >= step0) || 10 * p;
  const a = Math.floor(min / step) * step, out = [];
  for (let v = a; v <= max + step * 0.001; v += step) out.push(+v.toFixed(10));
  return out;
}

// Kerangka umum: header + svg + legenda + tabel
function frame(el, spec) {
  el.classList.add('chart');
  const id = 'tbl-' + Math.random().toString(36).slice(2, 8);
  el.innerHTML = `<div class="ch-head"><div><h4 class="ch-title">${spec.title || ''}</h4>${spec.sub ? `<div class="ch-sub">${spec.sub}</div>` : ''}</div>
    ${spec.table ? `<button class="btn-mini" aria-expanded="false" aria-controls="${id}" data-tbl>Lihat data</button>` : ''}</div>
    <div class="ch-body"></div><div class="ch-legend"></div>${spec.table ? `<div class="ch-table" id="${id}" hidden></div>` : ''}${spec.note ? `<p class="ch-note">${spec.note}</p>` : ''}`;
  if (spec.table) {
    const b = el.querySelector('[data-tbl]'), t = el.querySelector('.ch-table');
    t.innerHTML = tableHTML(spec.table);
    b.onclick = () => { const o = t.hidden; t.hidden = !o; b.setAttribute('aria-expanded', o); b.textContent = o ? 'Sembunyikan data' : 'Lihat data'; };
  }
  const leg = el.querySelector('.ch-legend');
  if (spec.legend && spec.legend.length > 1) leg.innerHTML = spec.legend.map(l => `<span class="lg"><svg width="22" height="14" aria-hidden="true">${l.kind === 'bar' ? `<rect x="3" y="2" width="16" height="10" rx="2" fill="${l.color}"/>` : `<line x1="1" y1="7" x2="21" y2="7" stroke="${l.color}" stroke-width="2" ${l.dash ? 'stroke-dasharray="4 3"' : ''}/>${marker(l.marker || 'circle', 11, 7, 3.6, l.color)}`}</svg>${l.name}</span>`).join('');
  else leg.remove();
  return el.querySelector('.ch-body');
}
export function tableHTML(t) {
  return `<table class="tbl"><thead><tr>${t.head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/* Grafik kartesius: batang (kelompok/tumpuk) + garis pada satu sumbu y.
   spec.x: {type:'cat', cats:[...]} | {type:'num', min, max, ticks?, fmt}
   spec.bars: [{name,color,values:[...], stack?:'s'}], spec.lines: [{name,color,marker,points:[[x,y]],dash}]
   spec.marks: [{x,y,label,color,shape}] titik sorotan, spec.vlines/hlines: [{x|y,label,color}] */
export function cartesian(el, spec) {
  const body = frame(el, spec);
  const W = spec.w || 520, H = spec.h || 320, m = { l: 58, r: 18, t: 16, b: 50, ...(spec.m || {}) };
  const iw = W - m.l - m.r, ih = H - m.t - m.b; const X = spec.x, Y = spec.y || {};
  // domain y
  let ys = [0];
  (spec.bars || []).forEach((b, bi) => b.values.forEach((v, i) => ys.push(v)));
  const stacks = {}; (spec.bars || []).filter(b => b.stack).forEach(b => b.values.forEach((v, i) => { const k = b.stack + i; stacks[k] = stacks[k] || [0, 0]; stacks[k][v >= 0 ? 0 : 1] += v; ys.push(stacks[k][0], stacks[k][1]); }));
  (spec.lines || []).forEach(l => l.points.forEach(p => ys.push(p[1])));
  (spec.marks || []).forEach(p => ys.push(p.y));
  let y0 = Y.min ?? Math.min(...ys), y1 = Y.max ?? Math.max(...ys); if (Y.min === undefined && y0 < 0) y0 *= 1.08; if (Y.max === undefined) y1 = y1 + (y1 - y0) * 0.08;
  const yt = Y.ticks || niceTicks(y0, y1, 5); y0 = Math.min(y0, yt[0]); y1 = Math.max(y1, yt[yt.length - 1]);
  const sy = v => m.t + ih - (v - y0) / (y1 - y0) * ih;
  const cats = X.type === 'cat' ? X.cats : null;
  const band = cats ? iw / cats.length : 0;
  const sx = cats ? i => m.l + band * (i + 0.5) : v => m.l + (v - X.min) / (X.max - X.min) * iw;
  const yf = Y.fmt || (v => fmt(v, Math.abs(y1 - y0) < 10 ? 1 : 0)), xf = X.fmt || (v => fmt(v, 0));
  let g = '';
  for (const t of yt) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${sy(t)}" y2="${sy(t)}" stroke="${t === 0 ? '#9FB5AC' : C.grid}" stroke-width="1"/><text x="${m.l - 8}" y="${sy(t) + 4}" text-anchor="end" class="ax">${yf(t)}</text>`;
  if (cats) cats.forEach((c, i) => { g += `<text x="${sx(i)}" y="${H - m.b + 18}" text-anchor="middle" class="ax">${esc(c)}</text>`; });
  else (X.ticks || niceTicks(X.min, X.max, 6)).forEach(t => { g += `<line x1="${sx(t)}" x2="${sx(t)}" y1="${m.t}" y2="${m.t + ih}" stroke="${C.grid}"/><text x="${sx(t)}" y="${H - m.b + 18}" text-anchor="middle" class="ax">${xf(t)}</text>`; });
  if (X.label) g += `<text x="${m.l + iw / 2}" y="${H - 8}" text-anchor="middle" class="axl">${X.label}</text>`;
  if (Y.label) g += `<text transform="translate(14 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle" class="axl">${Y.label}</text>`;
  // bars
  const bars = spec.bars || []; const groups = [...new Set(bars.map((b, i) => b.stack || 'g' + i))];
  const bw = cats ? Math.min(46, band * 0.72 / groups.length) : 10;
  const acc = {}; const hits = [];
  bars.forEach((b, bi) => {
    const gi = groups.indexOf(b.stack || 'g' + bi);
    b.values.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const cx = (cats ? sx(i) : sx(spec.x.vals[i])) + (gi - (groups.length - 1) / 2) * (bw + 3);
      let base = 0; if (b.stack) { const k = b.stack + i + (v >= 0 ? '+' : '-'); base = acc[k] || 0; acc[k] = base + v; }
      const ya = sy(base + v), yb = sy(base); const top = Math.min(ya, yb), hh = Math.max(1, Math.abs(yb - ya) - (b.stack ? 2 : 0));
      const r = Math.min(4, hh / 2, bw / 2);
      const col = typeof b.color === 'function' ? b.color(v, i) : b.color;
      g += v >= 0 ? `<path class="bar" d="M${cx - bw / 2},${top + hh} V${top + r} q0,-${r} ${r},-${r} H${cx + bw / 2 - r} q${r},0 ${r},${r} V${top + hh} Z" fill="${col}"/>`
        : `<path class="bar neg" d="M${cx - bw / 2},${top} V${top + hh - r} q0,${r} ${r},${r} H${cx + bw / 2 - r} q${r},0 ${r},-${r} V${top} Z" fill="${col}"/>`;
      hits.push({ x: cx - bw / 2 - 2, y: top - 2, w: bw + 4, h: hh + 4, html: `<b>${esc(cats ? cats[i] : xf(spec.x.vals[i]))}</b><br>${b.name}: <b>${yf.full ? yf.full(v) : fmt(v, 2)}</b>${spec.unit ? ' ' + spec.unit : ''}` });
    });
  });
  (spec.hlines || []).forEach(h => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${sy(h.y)}" y2="${sy(h.y)}" stroke="${h.color || C.muted}" stroke-dasharray="4 4"/>${h.label ? `<text x="${W - m.r - 4}" y="${sy(h.y) - 6}" text-anchor="end" class="ax">${h.label}</text>` : ''}`; });
  (spec.vlines || []).forEach(v => { g += `<line x1="${sx(v.x)}" x2="${sx(v.x)}" y1="${m.t}" y2="${m.t + ih}" stroke="${v.color || C.muted}" stroke-dasharray="4 4"/>${v.label ? `<text x="${sx(v.x) + 5}" y="${m.t + 12}" class="ax">${v.label}</text>` : ''}`; });
  (spec.lines || []).forEach(l => {
    const px = p => cats ? sx(p[0]) : sx(p[0]);
    g += `<polyline fill="none" stroke="${l.color}" stroke-width="2.2" stroke-linejoin="round" ${l.dash ? 'stroke-dasharray="6 4"' : 'class="ln" pathLength="1"'} points="${l.points.map(p => `${px(p)},${sy(p[1])}`).join(' ')}"/>`;
    if (l.marker !== 'none') l.points.forEach(p => { g += marker(l.marker || 'circle', px(p), sy(p[1]), 4.2, l.color); hits.push({ x: px(p) - 9, y: sy(p[1]) - 9, w: 18, h: 18, html: `<b>${l.name}</b><br>${X.label ? X.label.split(' (')[0] + ': ' : ''}${cats ? esc(cats[p[0]]) : xf(p[0])}<br>Nilai: <b>${fmt(p[1], l.dp ?? 2)}</b>${spec.unit ? ' ' + spec.unit : ''}` }); });
    if (l.label) { const p = l.points[l.labelAt ?? l.points.length - 1]; g += `<text x="${px(p) + (l.labelDx ?? 8)}" y="${sy(p[1]) + (l.labelDy ?? -8)}" class="dl" text-anchor="${l.labelAnchor || 'start'}">${l.label}</text>`; }
  });
  (spec.marks || []).forEach(p => {
    const x = cats ? sx(p.x) : sx(p.x), y = sy(p.y);
    g += `<circle cx="${x}" cy="${y}" r="11" fill="${p.color}" opacity=".18" class="pulse"/>${marker(p.shape || 'circle', x, y, 6, p.color)}`;
    if (p.label) g += `<text x="${x + (p.dx ?? 10)}" y="${y + (p.dy ?? -12)}" class="dl strong" text-anchor="${p.anchor || 'start'}">${p.label}</text>`;
    hits.push({ x: x - 12, y: y - 12, w: 24, h: 24, html: p.tip || p.label });
  });
  (spec.texts || []).forEach(t => { g += `<text x="${cats ? sx(t.x) : sx(t.x)}" y="${sy(t.y) + (t.dy || 0)}" text-anchor="${t.anchor || 'middle'}" class="dl ${t.cls || ''}">${t.t}</text>`; });
  g += hits.map((h, i) => `<rect class="hit" data-i="${i}" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" fill="transparent"/>`).join('');
  body.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title || '')}">${g}</svg>`;
  wireHits(body, hits);
}
function wireHits(body, hits) {
  body.querySelectorAll('.hit').forEach(r => {
    const h = hits[+r.dataset.i];
    r.addEventListener('pointerenter', e => showTip(h.html, e)); r.addEventListener('pointermove', e => showTip(h.html, e)); r.addEventListener('pointerleave', hideTip);
  });
}

// Batang horizontal (rincian OPEX, eksergi)
export function hbar(el, spec) {
  const body = frame(el, spec);
  const rows = spec.rows, W = spec.w || 640, lw = spec.labelW || 230, rh = spec.rowH || 30, H = rows.length * rh + 30;
  const max = spec.max || Math.max(...rows.map(r => r[1])); const iw = W - lw - 90; let g = ''; const hits = [];
  rows.forEach((r, i) => {
    const y = 10 + i * rh, w = Math.max(2, r[1] / max * iw), col = r[2] || spec.color || C.teal;
    g += `<text x="${lw - 10}" y="${y + rh / 2 + 4}" text-anchor="end" class="ax">${esc(r[0])}</text>
      <rect class="barh" x="${lw}" y="${y + 5}" width="${w}" height="${rh - 12}" rx="4" fill="${col}"/>
      <text x="${lw + w + 6}" y="${y + rh / 2 + 4}" class="dl">${spec.vfmt ? spec.vfmt(r[1], r) : fmt(r[1], 2)}</text>`;
    hits.push({ x: lw, y: y + 2, w: iw + 80, h: rh - 4, html: `<b>${esc(r[0])}</b><br>${spec.vfmt ? spec.vfmt(r[1], r) : fmt(r[1], 2)} ${spec.unit || ''}` });
  });
  g += hits.map((h, i) => `<rect class="hit" data-i="${i}" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" fill="transparent"/>`).join('');
  body.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.title || '')}">${g}</svg>`;
  wireHits(body, hits);
}

// Donut (rincian CAPEX) dengan label daftar di samping
export function donut(el, spec) {
  const body = frame(el, spec);
  const items = spec.items, tot = items.reduce((s, i) => s + i[1], 0); const R = 92, r = 58, cx = 120, cy = 120;
  let a = -Math.PI / 2, g = ''; const hits = [];
  items.forEach((it, i) => {
    const da = it[1] / tot * Math.PI * 2, a1 = a + da - 0.012;
    const p = (rad, ang) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`; const big = da > Math.PI ? 1 : 0;
    g += `<path class="seg" data-i="${i}" d="M${p(R, a)} A${R},${R} 0 ${big} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${big} 0 ${p(r, a)} Z" fill="${it[2]}"/>`;
    hits.push(`<b>${esc(it[0])}</b><br>US$${fmt(it[1], 2)} juta · ${fmt(it[1] / tot * 100, 1)}%`);
    a += da;
  });
  g += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-v">${spec.center[0]}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" class="ax">${spec.center[1]}</text>`;
  const list = items.map(it => `<li><i style="background:${it[2]}"></i><span>${esc(it[0])}</span><b>${fmt(it[1], 2)}</b></li>`).join('');
  body.innerHTML = `<div class="donut-wrap"><svg viewBox="0 0 240 240" role="img" aria-label="${esc(spec.title)}">${g}</svg><ul class="donut-list">${list}</ul></div>`;
  body.querySelectorAll('.seg').forEach(s => { const h = hits[+s.dataset.i]; s.addEventListener('pointermove', e => showTip(h, e)); s.addEventListener('pointerleave', hideTip); });
}

// Palet berurutan untuk donut CAPEX (satu keluarga hijau-teal, terang→gelap) + aksen
export const SEQ = ['#0C5A72', '#127466', '#129B8A', '#2BA58A', '#3AA76D', '#5CC6B5', '#8CC63F', '#A9D8B8', '#C9E7D4'];
export { NS };
