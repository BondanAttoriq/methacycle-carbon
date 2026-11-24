// Viewer 3D METHACYCLE: port + upgrade dari 04_Web/situs/index.html (v4).
// Dipertahankan: tur, chip area, aliran massa & energi, tooltip DN, scale bar & arah utara, atmosfer
// (plume CT, flare & pilot, plume stack, langit HDR prosedural), label ber-leader, mode presentasi, pintasan keyboard.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { $, $$, fmt, esc, emit, getJSON, isMobile, loadRegister, statusBadge, MEDIUM, noRef } from './util.js';
import { Tour, SCADA_SCREEN } from './tour.js';

const MODEL_SIZE = { plant: 7170928, konteks: 5067932 };
const MODEL_SIZE_GZ = { plant: 3441297, konteks: 3070758 };     // GLB yang sama, dikompres gzip (Netlify tidak mengompres model/gltf-binary)
const CAN_GUNZIP = typeof DecompressionStream !== 'undefined';
const b2t = p => new THREE.Vector3(p[0], p[2], -p[1]);          // model (x timur, y utara, z atas) → three (x, y atas, −z utara)
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const UTIL_NAMES = /^(hidran|windsock)/; const UTIL_MED = new Set(['Air pendingin', 'Refrigeran', 'Air pemadam', 'Udara instrumen', 'Nitrogen', 'Relief', 'Udara bau']);
const FCOL = Object.fromEntries(Object.entries(MEDIUM).map(([k, v]) => [k, parseInt(v[0].slice(1), 16)]));
const FLEG = ['Padatan', 'Gas', 'CO₂', 'O₂', 'H₂', 'Metanol / campuran sintesis', 'Air / kondensat', 'Fluida kerja ORC', 'Panas', 'Listrik', 'Air pendingin', 'Refrigeran'];
const AREAS = [['TPST', 'TPST Bantargebang'], ['100', '100 LPP'], ['200', '200 LFG'], ['300', '300 OEC/WHR/CCU'], ['400', '400 Sintesis'], ['500', '500 PEME'],
  ['600', '600 Integrasi panas'], ['700', '700 Air'], ['UTIL', '800–900 Utilitas'], ['ALL', 'Semua Area']];
const AREA_STOP = { TPST: 'tpst', '100': 'pra', '200': 'lfg', '300': 'whr', '400': 'sintesis', '500': 'peme', '600': 'panas', '700': 'air', UTIL: 'utilitas' };
const VIEWS = { iso: { cam: [-75, -175, 150], tgt: [95, -5, 0] }, top: { cam: [92, -12, 340], tgt: [92, -10, 0] } };

export async function init() {
  const stage = $('#v3dStage'), canvas = $('#v3dCanvas'), mobile = isMobile();
  const loadEl = $('#v3dLoad'), navGlb = $('#navGlb');
  const prog = { plant: 0, konteks: 0 }; let need = mobile ? ['plant'] : ['plant', 'konteks'];
  function upd() {
    const SZ = CAN_GUNZIP ? MODEL_SIZE_GZ : MODEL_SIZE;
    const tot = need.reduce((s, k) => s + SZ[k], 0), got = need.reduce((s, k) => s + prog[k] * SZ[k], 0); const v = Math.round(got / tot * 100);
    const mb = (tot / 1048576).toFixed(1).replace('.', ',');
    $('#v3dBar').style.width = v + '%'; $('#v3dPct').textContent = `Mengunduh model 3D (${mb} MB): ${v}%`;
    const ctxOnly = need.length === 2 && prog.plant >= 1;
    navGlb.hidden = false; navGlb.style.setProperty('--p', v + '%'); navGlb.querySelector('span').textContent = ctxOnly ? `Konteks TPST ${Math.round(prog.konteks * 100)}%` : `3D ${v}%`;
  }
  $('#v3dLoadBtn').hidden = true; upd();

  // ------------------------------------------------ renderer & scene
  // Performa: tanpa logarithmic depth (early-z tetap aktif), near/far kamera dinamis; MSAA hanya bila DPR rendah.
  // Tingkat kualitas: 0–2 hanya beda resolusi (tanpa kompilasi ulang shader); 3–4 material sederhana, tanpa bayangan, 30 fps ambient.
  const DPR_HI = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
  const TIERS = [{ dpr: DPR_HI }, { dpr: Math.min(1, DPR_HI) }, { dpr: 0.85 }, { dpr: 0.75, lite: true, cap: 30 }, { dpr: 0.6, lite: true, cap: 30 }];
  const START_TIER = (devicePixelRatio || 1) <= 1 ? 0 : 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile && (devicePixelRatio || 1) < 1.2, powerPreference: 'high-performance', stencil: false });
  const Q = { mode: 'auto', tier: START_TIER, dpr: TIERS[START_TIER].dpr, fps: 0, calls: 0, lite: false };
  renderer.setPixelRatio(Q.dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;   // scene statis: shadow map dirender ulang hanya saat lapisan berubah
  const shadowDirty = () => { renderer.shadowMap.needsUpdate = true; };
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xc4d3e0, 1900, 6200);
  const pm = new THREE.PMREMGenerator(renderer);
  const SUN_DIR = new THREE.Vector3(-250, 260, 260).normalize();
  function vnoise(x, y, seed) {
    const h = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); };
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
  }
  let skyData = null;
  function makeSky(W, H) {     // langit HDR prosedural (equirect half-float): gradien, matahari, awan kumulus tipis
    const d = new Float32Array(W * H * 4); const sd = SUN_DIR;
    for (let j = 0; j < H; j++) {
      const th = ((j + 0.5) / H - 0.5) * Math.PI, sy = Math.sin(th), cy = Math.cos(th);
      for (let i = 0; i < W; i++) {
        const ph = ((i + 0.5) / W - 0.5) * 2 * Math.PI, dx = cy * Math.cos(ph), dz = cy * Math.sin(ph), dy = sy; let r, g, b;
        if (dy >= 0) {
          const t = Math.pow(1 - dy, 4); r = 0.18 + 0.62 * t; g = 0.36 + 0.50 * t; b = 0.78 + 0.18 * t;
          const px = dx / (dy + 0.12) * 1.6, pz = dz / (dy + 0.12) * 1.6;
          let n = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { n += a * vnoise(px * f + 11, pz * f + 7, o); a *= 0.5; f *= 2.1; }
          const c = Math.max(0, Math.min(1, (n - 0.52) * 3.2)) * Math.min(1, dy * 6);
          r = r * (1 - c) + 0.95 * c; g = g * (1 - c) + 0.96 * c; b = b * (1 - c) + 0.98 * c;
        } else { const t = Math.min(1, -dy * 4); r = 0.55 - 0.25 * t; g = 0.55 - 0.23 * t; b = 0.52 - 0.24 * t; }
        const cosA = dx * sd.x + dy * sd.y + dz * sd.z;
        const sun = cosA > 0.99995 ? 60 : Math.pow(Math.max(0, cosA), 900) * 8 + Math.pow(Math.max(0, cosA), 12) * 0.35;
        const k = (j * W + i) * 4, E = 1.25; d[k] = (r + sun) * E; d[k + 1] = (g + sun * 0.95) * E; d[k + 2] = (b + sun * 0.85) * E; d[k + 3] = 1;
      }
    }
    skyData = { d, W, H };
    const h16 = new Uint16Array(d.length); for (let k = 0; k < d.length; k++) h16[k] = THREE.DataUtils.toHalfFloat(Math.min(d[k], 60000));
    const tex = new THREE.DataTexture(h16, W, H, THREE.RGBAFormat, THREE.HalfFloatType); tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true; return tex;
  }
  const SKY = makeSky(mobile ? 512 : 1024, mobile ? 256 : 512); scene.background = SKY; const envTex = pm.fromEquirectangular(SKY).texture;
  // Performa: IBL (PMREM) hanya untuk material logam; material lain memakai light probe spherical harmonics dari langit yang sama.
  function skyProbe() {
    const { d, W: SW, H: SH } = skyData, sh = new THREE.SphericalHarmonics3(), col = new THREE.Vector3(), dir = new THREE.Vector3(); let wSum = 0;
    const b = []; for (let i = 0; i < 9; i++) b.push(0);
    for (let j = 0; j < SH; j += 2) { const th = ((j + 0.5) / SH - 0.5) * Math.PI, cy = Math.cos(th), sy = Math.sin(th);
      for (let i = 0; i < SW; i += 2) { const ph = ((i + 0.5) / SW - 0.5) * 2 * Math.PI; dir.set(cy * Math.cos(ph), sy, cy * Math.sin(ph));
        const k = (j * SW + i) * 4, w = cy; col.set(Math.min(d[k], 3), Math.min(d[k + 1], 3), Math.min(d[k + 2], 3));   // matahari dibatasi (sudah ada DirectionalLight)
        THREE.SphericalHarmonics3.getBasisAt(dir, b); for (let c = 0; c < 9; c++) sh.coefficients[c].addScaledVector(col, b[c] * w); wSum += w; } }
    const norm = 4 * Math.PI / wSum; for (const c of sh.coefficients) c.multiplyScalar(norm);
    const probe = new THREE.LightProbe(sh, 1.2); return probe;
  }
  scene.add(skyProbe());
  // kompilasi shader di depan (paralel bila didukung) agar tidak tersendat saat render pertama
  const precompile = async (obj, target) => { try { if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(obj, camera, target); else renderer.compile(obj, camera, target); } catch (e) { /* lanjut */ } };
  const isMetal = m => (m.metalness ?? 0) >= 0.45;
  renderer.toneMappingExposure = 0.78;
  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 6000);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495; controls.autoRotateSpeed = 0.7;
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x8a8068, 0.22));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(90 - 250, 260, -20 + 260); sun.target.position.set(90, 0, -20);
  sun.castShadow = true; const sm = mobile ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 10, far: 900 }); sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // ------------------------------------------------ data & model
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  async function readAll(url, key, size) {
    const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status);
    const total = +r.headers.get('content-length') || size; const rd = r.body.getReader(); const parts = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; prog[key] = Math.min(0.97, got / total); upd(); }
    return await new Blob(parts).arrayBuffer();
  }
  async function gunzip(buf) { return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); }
  async function loadGLB(name) {
    let buf = null;
    if (CAN_GUNZIP) {
      try {
        const raw = await readAll(`assets/models/${name}.glb.gz`, name, MODEL_SIZE_GZ[name]); const b = new Uint8Array(raw, 0, 4);
        buf = b[0] === 0x1f && b[1] === 0x8b ? await gunzip(raw) : raw;     // server bisa saja sudah membuka gzip (Content-Encoding)
        if (new TextDecoder().decode(new Uint8Array(buf, 0, 4)) !== 'glTF') buf = null;
      } catch (e) { buf = null; }
    }
    if (!buf) buf = await readAll(`assets/models/${name}.glb`, name, MODEL_SIZE[name]);
    prog[name] = 1; upd();
    return new Promise((res, rej) => loader.parse(buf, '', g => res(g.scene), rej));
  }
  let DATA, STOPS, plant, ctx = null, REG;
  try {
    const [d, reg, p] = await Promise.all([getJSON('assets/data/data.json'), loadRegister(), loadGLB('plant')]);
    DATA = d; STOPS = d.tour.stops; REG = reg; plant = p;
  } catch (e) {
    loadEl.querySelector('b').textContent = 'Gagal memuat model 3D'; $('#v3dPct').textContent = String(e.message || e); console.error(e); throw e;
  }
  const tagNodes = new Map(), pickables = [];
  scene.add(plant);
  plant.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; pickables.push(o); }
    if (o.userData && o.userData.tag && !o.isMesh) tagNodes.set(o.userData.tag, o);
  });

  // ------------------------------------------------ batching: gabung geometri statis per material (±1.120 → ±200 draw call)
  // Mesh asli tetap ada di layer 1 (tidak dirender) untuk klik, hover, sorotan, dan visibilitas; GLB tidak diubah.
  const BATCH_ATTR = ['position', 'normal', 'uv'];
  function toFloatGeo(g, mat) {
    const n = g.attributes.position.count, out = new THREE.BufferGeometry();
    for (const name of BATCH_ATTR) {
      const src = g.attributes[name], size = name === 'uv' ? 2 : 3, arr = new Float32Array(n * size);
      if (src) for (let i = 0; i < n; i++) { arr[i * size] = src.getX(i); arr[i * size + 1] = src.getY(i); if (size === 3) arr[i * size + 2] = src.getZ(i); }
      out.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    if (!g.attributes.normal) { out.applyMatrix4(mat); out.computeVertexNormals(); }
    else out.applyMatrix4(mat);
    if (g.index) out.setIndex(Array.from(g.index.array)); else out.setIndex([...Array(n).keys()]);
    return out;
  }
  function batch(root, keyOf) {
    root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const groups = new Map();
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      const k = keyOf(o); if (k === null) return;
      const key = o.material.uuid + '|' + k + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
      if (!groups.has(key)) groups.set(key, { k, list: [] }); groups.get(key).list.push(o);
    });
    const holder = new THREE.Group(); holder.name = 'batch'; const made = [];
    for (const { k, list } of groups.values()) {
      if (list.length < 2) continue;
      const m4 = new THREE.Matrix4();
      const geo = mergeGeometries(list.map(o => toFloatGeo(o.geometry, m4.multiplyMatrices(inv, o.matrixWorld))), false);
      if (!geo) continue;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, list[0].material); mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
      mesh.userData.bkey = k; mesh.matrixAutoUpdate = false; holder.add(mesh); made.push(mesh);
      for (const o of list) o.layers.set(1);
    }
    root.add(holder); return made;
  }
  // kunci visibilitas = gabungan bendera leluhur (setara setVis viewer lama)
  function plantKey(o) {
    let needU = 0, needP = 0, uMed = 0, strip = 0;
    if (o.userData?.stream_id && !o.name.endsWith('_penyangga') && !o.name.includes('arah_aliran')) strip = 1;
    for (let n = o; n && n !== plant; n = n.parent) {
      const ud = n.userData || {};
      if (ud.arah) return null;                                   // panah aliran: visibilitas per stream, tidak digabung
      if (ud.area === 'UTIL' || UTIL_NAMES.test(n.name)) needU = 1;
      if (ud.stream_id) { needP = 1; if (UTIL_MED.has(ud.medium)) uMed = 1; }
    }
    return `u${needU}p${needP}m${uMed}s${strip}`;
  }
  const t0b = performance.now();
  const plantBatches = batch(plant, plantKey);
  const STAT0 = { batchMs: Math.round(performance.now() - t0b), batches: plantBatches.length };
  let ctxLoading = null;
  // Lambert untuk konteks TPST (permukaan tanah/timbunan menutupi sebagian besar layar): pencahayaan jauh lebih murah dari PBR
  const lambertCache = new Map();
  function lambertOf(m) {
    if (!m.isMeshStandardMaterial || (m.name || '').startsWith('nyala')) return m;
    if (!lambertCache.has(m.uuid)) {
      const l = new THREE.MeshLambertMaterial({ name: m.name, color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
        transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, depthWrite: m.depthWrite, vertexColors: m.vertexColors });
      lambertCache.set(m.uuid, l);
    }
    return lambertCache.get(m.uuid);
  }
  function toLambert(root) { root.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(lambertOf) : lambertOf(o.material); }); }
  function ensureCtx() {
    if (ctx) return Promise.resolve(ctx);
    if (!ctxLoading) {
      if (!need.includes('konteks')) { need.push('konteks'); loadEl.classList.contains('done') || upd(); }
      ctxLoading = loadGLB('konteks').then(async c => { ctx = c; ctx.traverse(o => { if (o.isMesh) o.receiveShadow = true; }); fixMaterials(ctx); toLambert(ctx); batch(ctx, () => 'c'); ctx.visible = false; scene.add(ctx); await precompile(ctx, scene); scene.remove(ctx); scene.add(ctx); ctx.visible = T.ctx; shadowDirty(); navGlb.hidden = true; labelKey = ''; tour.render(STOPS[tour.cur], tour.cur); req(); return ctx; });
    }
    return ctxLoading;
  }

  // ------------------------------------------------ status tampilan
  const T = { label: true, flow: true, ctx: !mobile, atmo: !mobile, util: true, pipe: true, ghost: false, rotate: false };
  let free = false, present = false, flying = null, allAreas = false, ACT = new Set(), panelOpen = !(innerWidth < 1280 && innerWidth >= 768);
  const MED_OFF = new Set(); const SID_VIS = new Map(); const stripObjs = new Map(); const arrowObjs = [];

  // ------------------------------------------------ material: grating tembus pandang, nyala emisif
  const FLAMES = [];
  function fixMaterials(root) {
    root.traverse(o => {
      if (!o.isMesh) return; const arr = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of arr) {
        const n = m.name || '';
        if (n.startsWith('grating')) { m.alphaTest = 0.5; m.transparent = false; m.side = THREE.DoubleSide; m.needsUpdate = true; }
        if (n.startsWith('pagar_jaring')) m.depthWrite = false;
        if (n.startsWith('nyala')) { m.toneMapped = false; FLAMES.push(m); }
        if (n.startsWith('lampu')) m.emissiveIntensity = 0.6;
        if (m.map) m.map.anisotropy = 4;
        if (m.isMeshStandardMaterial && isMetal(m)) { m.envMap = envTex; m.needsUpdate = true; }
      }
    });
  }
  fixMaterials(plant);

  // ------------------------------------------------ sorotan unit (glow emisif berdenyut)
  // sorotan = lapisan overlay di atas geometri gabungan (polygonOffset), memakai geometri mesh asli
  let hlList = []; const hlGroup = new THREE.Group(); hlGroup.name = 'sorotan'; scene.add(hlGroup);
  function setHighlight(tags, sids = []) {
    for (const o of hlGroup.children) for (const m of [].concat(o.material)) m.dispose();
    hlGroup.clear(); hlList = []; const seen = new Set();
    const nodes = tags.map(t => tagNodes.get(t)).filter(Boolean); for (const s of sids) for (const o of stripObjs.get(s) || []) nodes.push(o);
    for (const n of nodes) n.traverse(o => {
      if (!o.isMesh || seen.has(o)) return; seen.add(o);
      const mats = [].concat(o.material).map(m => { const c = m.clone(); c.emissive = new THREE.Color(sids.length ? 0x8cff60 : 0xffc870); c.emissiveIntensity = 0.08;
        c.polygonOffset = true; c.polygonOffsetFactor = -1; c.polygonOffsetUnits = -4; hlList.push(c); return c; });
      const h = new THREE.Mesh(o.geometry, Array.isArray(o.material) ? mats : mats[0]); h.matrixAutoUpdate = false; h.matrix.copy(o.matrixWorld);
      h.userData.src = o; hlGroup.add(h);
    });
    syncHl(); req();
  }
  function syncHl() { for (const h of hlGroup.children) { let v = true; for (let n = h.userData.src; n; n = n.parent) if (!n.visible) { v = false; break; } h.visible = v; } }

  // ------------------------------------------------ lapisan
  function setVis() {
    if (ctx) ctx.visible = T.ctx;
    plant.traverse(o => {
      const ud = o.userData || {};
      if (ud.area === 'UTIL') o.visible = T.util;
      else if (ud.stream_id) { o.visible = T.pipe && (T.util || !UTIL_MED.has(ud.medium)); if (!o.name.endsWith('_penyangga')) SID_VIS.set(ud.stream_id, o.visible); }
      else if (UTIL_NAMES.test(o.name)) o.visible = T.util;
    });
    for (const b of plantBatches) { const k = b.userData.bkey; const u = k[1] === '1', p = k[3] === '1', m = k[5] === '1';
      b.visible = (!u || T.util) && (!p || (T.pipe && (T.util || !m))); }
    syncHl(); applyArea(); shadowDirty(); req();
  }
  const ghostMats = new Map();
  function setGhost(on) {
    for (const arr of stripObjs.values()) for (const o of arr) {
      if (o.name.includes('arah_aliran')) continue;
      if (on) { if (!ghostMats.has(o)) { ghostMats.set(o, o.material); const m = (Array.isArray(o.material) ? o.material[0] : o.material).clone(); m.transparent = true; m.opacity = 0.28; m.depthWrite = false; o.material = m; } }
      else if (ghostMats.has(o)) { o.material = ghostMats.get(o); ghostMats.delete(o); }
    }
    for (const b of plantBatches) { if (!b.userData.bkey.endsWith('s1')) continue;
      if (on) { if (!ghostMats.has(b)) { ghostMats.set(b, b.material); const m = b.material.clone(); m.transparent = true; m.opacity = 0.28; m.depthWrite = false; b.material = m; } }
      else if (ghostMats.has(b)) { b.material.dispose(); b.material = ghostMats.get(b); ghostMats.delete(b); } }
    req();
  }

  // ------------------------------------------------ aliran: butir bercahaya sepanjang rute stream
  function streamAreas(sid) { const s = DATA.streams[sid]; const out = new Set(); if (!s) return out;
    for (const t of [s.from_tag, s.to_tag]) { const e = DATA.eq[t]; if (e && e.area && e.area !== 'PENDUKUNG') out.add(e.area); } return out; }
  function flowActive(sid) { if (allAreas) return true; for (const a of streamAreas(sid)) if (ACT.has(a)) return true; return false; }
  function areasForStop(s) {
    const out = new Set(); if (s.id === 'tutup') { allAreas = true; return out; }
    if (s.areas) { s.areas.forEach(a => out.add(a)); return out; }
    if (s.ctx) return out;
    for (const t of s.tags || []) { const e = DATA.eq[t]; if (e && e.area && e.area !== 'PENDUKUNG') out.add(e.area); }
    return out;
  }
  function drawChips() {
    const box = $('#v3dAreas');
    box.innerHTML = AREAS.map(([k, t]) => `<button class="achip${k === 'ALL' ? ' all' : ''}${(k === 'ALL' ? allAreas : !allAreas && ACT.has(k)) ? ' on' : ''}" data-a="${k}" aria-pressed="${k === 'ALL' ? allAreas : !allAreas && ACT.has(k)}">${t}</button>`).join('');
    box.querySelectorAll('.achip').forEach(b => b.onclick = () => selectArea(b.dataset.a)); uiRects = null;
  }
  function applyArea() { for (const o of arrowObjs) o.visible = T.flow && flowActive(o.userData.stream_id) && SID_VIS.get(o.userData.stream_id) !== false; drawChips(); req(); }
  function selectArea(a) {
    setFree(true, false);
    if (a === 'ALL') { allAreas = true; ACT.clear(); flyTo(VIEWS.iso); }
    else if (a === 'TPST') { allAreas = false; ACT = new Set(['200']); const s = STOPS.find(x => x.id === 'tpst'); flyTo(s); if (!T.ctx) toggle('ctx', true); }
    else { allAreas = false; ACT = new Set([a]); const s = STOPS.find(x => x.id === AREA_STOP[a]); if (s) flyTo(s); }
    setHighlight([]); applyArea();
  }
  let FL = [], fmesh = null;
  function buildFlow() {
    let n = 0;
    for (const [sid, f] of Object.entries(DATA.flow)) {
      if (f.g === 'none' || f.g === 'loader' || f.g === 'chute' || f.p.length < 2) continue;
      if (f.st === 'SIAGA') continue;
      const P = f.p.map(b2t); const cum = [0];
      for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1]));
      const Lt = cum[cum.length - 1]; if (Lt < 1.5) continue;
      const known = f.q !== '' && !isNaN(+f.q); const q = known ? (+f.q) * (f.u === 'MW' ? 24 : 1) : 3;
      const lg = Math.log10(Math.max(q, 1));                       // kecepatan & kerapatan ∝ log laju
      const spacing = Math.max(1.6, 6.5 - 1.7 * lg) * (f.g === 'cable' ? 0.8 : 1) * (mobile ? 1.9 : 1);
      const speed = (f.g === 'cable' ? 9 : f.j === 'panas' ? 3.2 : 1.6 + 1.3 * lg);
      let rr = f.g === 'duct' ? f.r * 1.06 : Math.min(f.r + 0.16, Math.max(f.r * 1.22, 0.11)); if (f.g === 'cable') rr = 0.13;
      rr *= (0.85 + 0.12 * lg) * (known ? 1 : 0.8);
      let lift = 0; if (f.g === 'conveyor') { lift = Math.max(0.5, 1.6 * f.r) / 2 + 0.25; rr = 0.32; } if (f.g === 'cable' && f.p[0][2] < 0.3) lift = 0.18;
      const k = Math.max(1, Math.floor(Lt / spacing));
      const cen = new THREE.Vector3(); P.forEach(p => cen.add(p)); cen.divideScalar(P.length);
      FL.push({ sid, m: f.m, P, cum, Lt, speed, rr, lift, k, i0: n, col: new THREE.Color(FCOL[f.m] ?? 0xffffff), heat: f.j !== 'massa', cen }); n += k;
    }
    const geo = new THREE.IcosahedronGeometry(1, 0);          // 20 segitiga per butir (sebelumnya bola 144)
    fmesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
    fmesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); fmesh.frustumCulled = false; fmesh.renderOrder = 2;
    for (const s of FL) for (let j = 0; j < s.k; j++) fmesh.setColorAt(s.i0 + j, s.col);
    scene.add(fmesh);
    plant.traverse(o => { if (o.userData && o.userData.arah) arrowObjs.push(o); });
    plant.traverse(o => { if (o.isMesh && o.userData && o.userData.stream_id && !o.name.endsWith('_penyangga')) { if (!stripObjs.has(o.userData.stream_id)) stripObjs.set(o.userData.stream_id, []); stripObjs.get(o.userData.stream_id).push(o); } });
  }
  const _d = new THREE.Object3D(), _Y = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _u = new THREE.Vector3(), _Z = new THREE.Matrix4().makeScale(0, 0, 0);
  function updFlow(t) {
    if (!fmesh) return; fmesh.visible = T.flow; if (!T.flow) return;
    for (const s of FL) {
      const vis = SID_VIS.get(s.sid) !== false && flowActive(s.sid) && !MED_OFF.has(s.m) && (s.sid !== 'LFG-H' || (ctx && ctx.visible));
      const ks = Math.min(14, Math.max(1, camera.position.distanceTo(s.cen) / 90));
      for (let j = 0; j < s.k; j++) {
        const id = s.i0 + j; if (!vis) { fmesh.setMatrixAt(id, _Z); continue; }
        const d = (j / s.k * s.Lt + t * s.speed) % s.Lt; let i = 1; while (i < s.cum.length - 1 && s.cum[i] < d) i++;
        const a = s.P[i - 1], b = s.P[i], segL = s.cum[i] - s.cum[i - 1] || 1; const w = (d - s.cum[i - 1]) / segL;
        _v.lerpVectors(a, b, w); _u.subVectors(b, a).normalize(); _v.y += s.lift;
        _d.position.copy(_v); _d.quaternion.setFromUnitVectors(_Y, _u);
        const pul = s.heat ? 0.85 + 0.3 * Math.sin(t * 6 + j) : 1;
        _d.scale.set(s.rr * pul * ks, s.rr * (s.heat ? 3.2 : 2.3) * pul * ks, s.rr * pul * ks); _d.updateMatrix(); fmesh.setMatrixAt(id, _d.matrix);
      }
    }
    fmesh.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------ atmosfer: plume CT, plume stack, flare + pilot, flare kecil LFG
  function softTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const PTEX = softTex();
  function pointsMat(additive) {
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: PTEX }, scale: { value: 400 } }, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !additive,
      vertexShader: `#include <common>
        #include <logdepthbuf_pars_vertex>
        attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC; uniform float scale;
        void main(){ vA = alpha; vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `#include <common>
        #include <logdepthbuf_pars_fragment>
        uniform sampler2D map; varying float vA; varying vec3 vC;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA);
        #include <logdepthbuf_fragment>
        }`
    });
  }
  const WIND = new THREE.Vector3(-0.9, 0, 0.35).normalize();          // angin monsun timur (indikatif)
  const SYS = [];
  function makeSystem(n, additive) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const p = new THREE.Points(g, pointsMat(additive)); p.frustumCulled = false; p.renderOrder = 3; scene.add(p); return { p, g, n, parts: [] };
  }
  const EMIT = { uap: { n: 22, life: 9, up: 2.2, wind: 1.4, s0: 5, s1: 22, a: 0.5, col: [0.96, 0.97, 0.98], add: false },
    asap: { n: 16, life: 8, up: 2.6, wind: 1.6, s0: 1.4, s1: 9, a: 0.28, col: [0.78, 0.78, 0.80], add: false },
    asap_tipis: { n: 14, life: 6, up: 2.0, wind: 1.6, s0: 0.8, s1: 5, a: 0.14, col: [0.85, 0.86, 0.88], add: false },
    flare: { n: 28, life: 1.1, up: 6.0, wind: 2.0, s0: 3.6, s1: 1.0, a: 0.9, col: [1.0, 0.55, 0.15], add: true },
    pilot: { n: 10, life: 0.6, up: 2.0, wind: 0.6, s0: 0.9, s1: 0.2, a: 0.9, col: [0.45, 0.65, 1.0], add: true },
    flare_kecil: { n: 10, life: 0.8, up: 2.4, wind: 0.8, s0: 1.3, s1: 0.3, a: 0.85, col: [1.0, 0.6, 0.2], add: true } };
  function buildAtmo() {
    const src = (DATA.atmo || []).slice(); const fl = src.find(a => a.k === 'flare'); if (fl) src.push({ k: 'pilot', p: [fl.p[0] + 0.25, fl.p[1], fl.p[2] + 0.2], r: 0.1 });
    const norm = [], add = [];
    for (const a of src) { const e = EMIT[a.k]; if (!e) continue; (e.add ? add : norm).push({ a, e }); }
    for (const [list, additive] of [[norm, false], [add, true]]) {
      const total = list.reduce((s, x) => s + x.e.n, 0); if (!total) continue; const sys = makeSystem(total, additive);
      let k = 0; for (const { a, e } of list) for (let i = 0; i < e.n; i++) sys.parts.push({ idx: k++, a, e, t: Math.random() * e.life, ctx: a.k === 'flare_kecil',
        j: new THREE.Vector3((Math.random() - 0.5) * 2 * a.r, 0, (Math.random() - 0.5) * 2 * a.r), w: 0.6 + Math.random() * 0.8, base: b2t(a.p) });
      SYS.push(sys);
    }
  }
  const _p = new THREE.Vector3();
  function updAtmo(dt, Tm) {
    for (const sys of SYS) {
      sys.p.visible = T.atmo; if (!T.atmo) continue;
      const P = sys.g.attributes.position.array, S = sys.g.attributes.size.array, A = sys.g.attributes.alpha.array, Cc = sys.g.attributes.color.array;
      for (const q of sys.parts) {
        const e = q.e; q.t += dt; if (q.t > e.life) q.t -= e.life; const f = q.t / e.life; const i = q.idx;
        _p.copy(q.base).add(q.j); _p.y += e.up * q.t * q.w; _p.addScaledVector(WIND, e.wind * q.t * q.t * 0.35 + e.wind * q.t * 0.4);
        P[i * 3] = _p.x; P[i * 3 + 1] = _p.y; P[i * 3 + 2] = _p.z;
        S[i] = (e.s0 + (e.s1 - e.s0) * f) * (e.add ? 0.8 + 0.4 * Math.random() : 1);
        const vis = q.ctx ? !!(ctx && ctx.visible) : true;
        A[i] = vis ? e.a * (e.add ? (1 - f) : Math.sin(Math.PI * Math.min(1, f * 1.15))) : 0;
        const hot = e.add ? 1 - f * 0.6 : 1; Cc[i * 3] = e.col[0] * hot + (e.add ? f * 0.2 : 0); Cc[i * 3 + 1] = e.col[1] * hot; Cc[i * 3 + 2] = e.col[2] * (e.add ? hot * 0.8 : 1);
      }
      sys.g.attributes.position.needsUpdate = sys.g.attributes.size.needsUpdate = sys.g.attributes.alpha.needsUpdate = sys.g.attributes.color.needsUpdate = true;
    }
    for (const m of FLAMES) m.emissiveIntensity = 3.0 + 1.6 * Math.sin(Tm * 23) * Math.sin(Tm * 7.3) + Math.random() * 0.8;
  }

  // ------------------------------------------------ ukuran kanvas & offset proyeksi (target di tengah area terlihat)
  let W = 1, H = 1;
  function layout() {
    W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    let ox = 0, oy = 0;
    const desktop = innerWidth >= 768;
    if (present) { const pr = $('#v3dPanel').offsetHeight; oy = Math.round(pr * 0.42); }
    else if (desktop) { const pw = panelOpen ? $('#v3dPanel').offsetWidth + 12 : 0; ox = Math.round((pw - 74) / 2); }
    else { oy = 30; }
    camera.setViewOffset(W, H, ox, oy, W, H); camera.updateProjectionMatrix();
    for (const s of SYS) s.p.material.uniforms.scale.value = H / 2 * Q.dpr;
    labelKey = ''; uiRects = null; req();
  }
  { const ro = new ResizeObserver(layout); ro.observe(stage); ro.observe(canvas); }

  // ------------------------------------------------ label HTML dengan leader, tanpa saling tumpang (greedy)
  const labBox = $('#v3dLabels'), svgL = $('#v3dLeaders'); const pool = []; const labSize = new Map(); let uiRects = null;
  const lpool = [];   // garis leader dipakai ulang (tanpa innerHTML tiap frame)
  const SVGNS = 'http://www.w3.org/2000/svg';
  function leader(i, x1, y1, x2, y2, col) {
    let e = lpool[i];
    if (!e) {
      const g = document.createElementNS(SVGNS, 'g'), ln = document.createElementNS(SVGNS, 'line'), c = document.createElementNS(SVGNS, 'circle');
      ln.setAttribute('stroke-width', '1.6'); c.setAttribute('r', '3'); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', '1');
      g.append(ln, c); svgL.appendChild(g); e = lpool[i] = [g, ln, c];
    }
    const [g, ln, c] = e; g.style.display = '';
    ln.setAttribute('x1', x1.toFixed(1)); ln.setAttribute('y1', y1.toFixed(1)); ln.setAttribute('x2', x2.toFixed(1)); ln.setAttribute('y2', y2.toFixed(1)); ln.setAttribute('stroke', col);
    c.setAttribute('cx', x1.toFixed(1)); c.setAttribute('cy', y1.toFixed(1)); c.setAttribute('fill', col);
  } let labelKey = '';
  function labelSet() {
    const s = STOPS[tour.cur]; const want = new Set(focusTags.length ? focusTags : (s.tags || [])); const out = [];
    for (const [t, p, k] of DATA.labels) {
      if ((k === 'eq' || k === 'util' || k === 'bnd' || k === 'sup') && want.has(t)) out.push({ t, p, k: k === 'util' ? 'util' : 'eq', hl: true });
      else if ((s.ctx && k === 'ctx' && ctx && ctx.visible) || (free && s.ctx && k === 'ctx2' && ctx && ctx.visible)) out.push({ t, p, k });
    }
    if (!s.ctx && out.length < 3 && free) for (const [t, p, k] of DATA.labels) if (k === 'eq' && !want.has(t)) out.push({ t, p, k: 'eq' });
    return out;
  }
  function drawLabels() {
    const L = T.label ? labelSet() : []; let nL = 0;
    if (!uiRects) {   // area UI dihitung ulang hanya saat tata letak berubah (bukan tiap frame: hindari forced layout)
      uiRects = []; const sr = stage.getBoundingClientRect();
      for (const sel of ['#v3dTools', '#v3dPanel', '#v3dAreas', '#v3dScale', '#v3dPanelToggle']) {
        const el = $(sel); if (!el || el.offsetParent === null) continue; if (sel === '#v3dPanel' && !panelOpen && innerWidth >= 768) continue;
        for (const r of sel === '#v3dAreas' ? [...el.children].map(c => c.getBoundingClientRect()) : [el.getBoundingClientRect()])
          if (r.width) uiRects.push([r.left - sr.left, r.top - sr.top, r.right - sr.left, r.bottom - sr.top]);
      }
    }
    const used = uiRects.slice();
    const v = new THREE.Vector3(); let n = 0;
    const items = L.map(l => { v.copy(b2t(l.p)).project(camera); return { ...l, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, z: v.z }; })
      .filter(l => l.z < 1 && l.x > -50 && l.x < W + 50 && l.y > -50 && l.y < H + 50).sort((a, b) => a.z - b.z);
    for (const l of items) {
      let el = pool[n]; if (!el) { el = document.createElement('div'); labBox.appendChild(el); pool.push(el); } n++;
      const cls = 'lab ' + l.k + (l.hl ? ' hl' : ''); if (el.className !== cls) el.className = cls; if (el.textContent !== l.t) el.textContent = l.t; el.style.display = 'block';
      const sk = cls + '|' + l.t; let sz = labSize.get(sk); if (!sz) { sz = [el.offsetWidth, el.offsetHeight]; labSize.set(sk, sz); }
      const [w, h] = sz; let best = null;
      for (const d of [28, 50, 78, 112, 150]) for (const a of [-90, -60, -120, -30, -150, 0, 180, 40, 140]) {
        const r = a * Math.PI / 180, cx = l.x + Math.cos(r) * (d + w / 2 * Math.abs(Math.cos(r))), cy = l.y + Math.sin(r) * (d + h / 2);
        const b = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]; if (b[0] < 6 || b[1] < 6 || b[2] > W - 6 || b[3] > H - 6) continue;
        if (used.some(u => !(b[2] + 4 < u[0] || b[0] - 4 > u[2] || b[3] + 4 < u[1] || b[1] - 4 > u[3]))) continue;
        const c = d + (a > 0 ? 40 : 0); if (!best || c < best.c) best = { b, c };
      }
      if (!best) { el.style.display = 'none'; continue; }
      used.push(best.b); el.style.transform = `translate3d(${best.b[0].toFixed(1)}px,${best.b[1].toFixed(1)}px,0)`;
      const lx = Math.min(Math.max(l.x, best.b[0]), best.b[2]), ly = Math.min(Math.max(l.y, best.b[1]), best.b[3]);
      const col = l.k === 'util' ? '#c87828' : l.k === 'ctx' ? '#22282e' : l.hl ? '#1F7A4D' : '#3c4046';
      leader(nL++, l.x, l.y, lx, ly, col);
    }
    for (let i = n; i < pool.length; i++) pool[i].style.display = 'none';
    for (let i = nL; i < lpool.length; i++) lpool[i][0].style.display = 'none';
  }

  // ------------------------------------------------ scale bar & arah utara
  const _n0 = new THREE.Vector3(), _n1 = new THREE.Vector3(); let sKey = '', lastAng = 999; const sbarEl = $('#sbar'), slabEl = $('#slab'), narrowEl = $('#narrow');
  function updScale() {
    const d = camera.position.distanceTo(controls.target);
    const mpp = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / H;
    const target = 150 * mpp; const p10 = Math.pow(10, Math.floor(Math.log10(target)));
    const nice = [1, 2, 2.5, 5, 10].map(k => k * p10).reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
    const px = nice / mpp, seg = (nice / p10) % 2 === 0 || nice / p10 === 10 ? 4 : 5; const key = `${nice}|${Math.round(px)}`;
    if (key !== sKey) {
      sKey = key; const w = px / seg;
      sbarEl.innerHTML = Array.from({ length: seg }, (_, i) => `<i style="width:${w}px;background:${i % 2 ? '#fff' : '#1d2228'}"></i>`).join('');
      const unit = nice >= 1000 ? 'km' : 'm', dv = nice >= 1000 ? 1000 : 1; const f = v => (v / dv).toLocaleString('id-ID', { maximumFractionDigits: 2 });
      slabEl.style.width = px + 'px'; slabEl.innerHTML = `<span>0</span><span>${f(nice / 2)}</span><span>${f(nice)} ${unit}</span>`;
    }
    _n0.copy(controls.target).project(camera); _n1.copy(controls.target).add(new THREE.Vector3(0, 0, -Math.max(10, d * 0.1))).project(camera);
    const ang = Math.atan2(-(_n1.y - _n0.y) * H, (_n1.x - _n0.x) * W) * 180 / Math.PI + 90;
    if (Math.abs(ang - lastAng) > 0.2) { lastAng = ang; narrowEl.setAttribute('transform', `rotate(${ang.toFixed(1)})`); }
    scene.fog.near = 1900 + Math.max(0, camera.position.y - 500); scene.fog.far = scene.fog.near + 4300;
  }

  // ------------------------------------------------ kamera
  function flyTo(s, instant = false) {
    const p1 = b2t(s.cam), t1 = b2t(s.tgt);
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { camera.position.copy(p1); controls.target.copy(t1); controls.update(); flying = null; req(); return; }
    const dist = camera.position.distanceTo(p1);
    flying = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, t: 0, d: Math.min(1.8, 1.2 + dist / 1500) };   // easing 1,2–1,8 s
    req();
  }
  function flyToVec(p1, t1) { flying = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, t: 0, d: 1.4 }; req(); }

  // ------------------------------------------------ tur
  let focusTags = [];
  const ctxHint = () => (!ctx || !T.ctx) ? `<p class="note-warn"><svg><use href="#i-map"/></svg><span>Konteks TPST nonaktif${mobile ? ' di HP untuk menghemat data' : ''}. <button class="btn-mini" data-ctxon>Tampilkan konteks TPST</button></span></p>` : '';
  const tour = new Tour({
    stops: STOPS, statusNames: DATA.tour.status, getCtxHint: ctxHint, onCtx: () => toggle('ctx', true),
    onGo: (s, i, instant) => {
      focusTags = []; setHighlight(s.tags || []); allAreas = false; ACT = areasForStop(s); applyArea(); labelKey = '';
      if (free) setFree(false, false);
      flyTo(s, instant); showTab('narasi');
    },
    onTag: tag => { focusTags = [tag]; setHighlight([tag]); showUnit(tag); labelKey = ''; },
  });

  // ------------------------------------------------ panel info
  function showTab(name) {
    $$('#v3dPanel [role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
    $$('#v3dPanel .vp-pane').forEach(p => p.hidden = p.dataset.pane !== name);
  }
  $$('#v3dPanel [role=tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  function setPanel(open) {
    panelOpen = open; $('#v3dPanel').classList.toggle('closed', !open); stage.classList.toggle('pclosed', !open);
    $('#v3dPanelToggle').setAttribute('aria-expanded', open); uiRects = null; setTimeout(layout, 360);
  }
  $('#v3dPanelToggle').onclick = () => setPanel(!panelOpen);
  if (!panelOpen) setPanel(false);
  const STMAP = { SOURCE: 'S', CALCULATED: 'C', ASSUMED: 'A', TBD: 'A' };
  function streamRowsFor(tag) {
    const ins = [], outs = [];
    for (const s of REG.list) { if (s.to_tag === tag) ins.push(s); if (s.from_tag === tag) outs.push(s); }
    const row = s => `<li><i style="background:${(MEDIUM[s.medium] || ['#999'])[0]}"></i><button data-sid="${esc(s.stream_id)}">${esc(s.stream_id)} · ${esc(s.pfd_name)}</button><span class="q">${s.q !== null ? fmt(s.q, s.q >= 100 ? 1 : 2) + ' ' + esc(s.u) : 'n/a'}</span></li>`;
    return `${ins.length ? `<div class="k muted">Aliran masuk</div><ul class="slist">${ins.map(row).join('')}</ul>` : ''}${outs.length ? `<div class="k muted">Aliran keluar</div><ul class="slist">${outs.map(row).join('')}</ul>` : ''}`;
  }
  function wireStreamLinks(root) { root.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => focusStream(b.dataset.sid)); }
  function showUnit(tag) {
    const e = REG.EQ[tag], d = DATA.eq[tag]; if (!e && !d) return;
    const x = e || d; const dims = e ? [e.length_m && `P ${fmt(e.length_m, 1)} m`, e.width_m && `L ${fmt(e.width_m, 1)} m`, e.height_m && `T ${fmt(e.height_m, 1)} m`, e.diameter_m && `Ø ${fmt(e.diameter_m, 2)} m`].filter(Boolean).join(' · ') : '';
    $('#unitInfo').innerHTML = `<h3 class="ui-h">${esc(x.tag)} · ${esc(x.name)}</h3>${statusBadge(x.status)}
      <dl class="kv"><dt>Tipe</dt><dd>${esc(x.equipment_type)}</dd><dt>Area</dt><dd>${esc(x.area)}</dd><dt>Dimensi</dt><dd>${dims || 'n/a'}</dd>
      <dt>Basis sizing</dt><dd>${esc(noRef(x.sizing_basis) || 'n/a')}</dd><dt>Sumber</dt><dd>${esc(noRef(x.source) || 'n/a')}</dd></dl>
      ${streamRowsFor(tag)}
      <div class="tc-actions"><button class="btn btn-teal sm" data-go-scada><svg><use href="#i-scada"/></svg>Lihat di SCADA</button></div>`;
    $('#unitInfo [data-go-scada]').onclick = () => emit('show-scada', { tag });
    wireStreamLinks($('#unitInfo')); showTab('unit'); if (!panelOpen) setPanel(true);
  }
  function sizeTxt(f) {
    if (f.el) return f.el; if (!f.dn) return '';
    const v = f.v !== '' ? `${fmt(f.v, 1)} m/s` : '';
    const op = [f.fa, f.P !== '' ? `${fmt(f.P, 1)} bar a` : '', f.T !== '' ? `${fmt(f.T, 0)} °C` : ''].filter(Boolean).join(' · ');
    return `${f.g === 'duct' ? `Duct Ø dalam ${f.dn} mm` : `DN${f.dn}`}${v ? ', ' + v : ''}${op ? `<br><span class="mut">${op}</span>` : ''}`;
  }
  function qTxt(f) { return f.st === 'SIAGA' ? 'siaga (normal tanpa aliran)' : f.q !== '' && f.q !== undefined ? `${fmt(f.q)} ${f.u}` : 'tidak dikuantifikasi'; }
  function showStream(sid) {
    const s2 = DATA.streams[sid], f = DATA.flow[sid] || {}; if (!s2) return;
    $('#unitInfo').innerHTML = `<h3 class="ui-h">Aliran ${esc(sid)}</h3><div>${esc(s2.pfd_name)}</div>
      <dl class="kv"><dt>Medium</dt><dd>${esc(s2.medium)}</dd><dt>Dari → ke</dt><dd><button class="tagchip" data-tag="${esc(s2.from_tag)}">${esc(s2.from_tag)}</button> → <button class="tagchip" data-tag="${esc(s2.to_tag)}">${esc(s2.to_tag)}</button></dd>
      <dt>Laju (neraca)</dt><dd><b>${qTxt(f)}</b> ${f.st && f.st !== 'SIAGA' ? statusBadge(f.st) : ''}</dd><dt>Ukuran pipa</dt><dd>${sizeTxt(f) || 'n/a'}</dd><dt>Basis</dt><dd>${esc(noRef(f.b) || 'n/a')}</dd></dl>
      <div class="tc-actions"><button class="btn btn-teal sm" data-go-scada><svg><use href="#i-scada"/></svg>Lihat di SCADA</button></div>`;
    $('#unitInfo [data-go-scada]').onclick = () => emit('show-scada', { sid });
    $$('#unitInfo .tagchip').forEach(b => b.onclick = () => focusTag(b.dataset.tag));
    showTab('unit'); if (!panelOpen) setPanel(true);
  }
  function buildFlowPane() {
    const lfg = DATA.flow['10'] && DATA.flow['10'].q !== '' ? fmt(DATA.flow['10'].q) : 'n/a';
    $('#flowPane').innerHTML = `<b>Aliran Massa &amp; Energi</b>
      <p class="note-sm">Aliran tampil sesuai area perhentian tur; pilih chip area di atas atau <b>Semua Area</b>. Ukuran, kerapatan, dan kecepatan butir ∝ log laju. Arahkan kursor ke pipa untuk nilai neraca.</p>
      <div class="fleg" role="group" aria-label="Filter medium">${FLEG.map(k => `<label><input type="checkbox" data-med="${esc(k)}" checked><i style="background:${MEDIUM[k][0]}"></i>${MEDIUM[k][1]}</label>`).join('')}</div>
      <table class="tbl-mini"><tr class="hd"><td>Neraca utama · massa</td><td>t/hari</td></tr><tr><td>LPP basah masuk</td><td>100,00</td></tr><tr><td>LFG masuk</td><td>${lfg}</td></tr>
      <tr><td>O₂ PEME ke OEC</td><td>101,03</td></tr><tr><td>CO₂ tertangkap</td><td>108,03</td></tr><tr><td>H₂ ke sintesis</td><td>14,30</td></tr><tr><td>e-Methanol (99,76%)</td><td>74,72</td></tr>
      <tr class="hd"><td>Energi</td><td>MW</td></tr><tr><td>PEME (listrik)</td><td>33,10</td></tr><tr><td>ORC (listrik)</td><td>1,75</td></tr><tr><td>Listrik eksternal</td><td>34,30</td></tr></table>`;
    $$('#flowPane [data-med]').forEach(c => c.onchange = () => { c.checked ? MED_OFF.delete(c.dataset.med) : MED_OFF.add(c.dataset.med); req(); });
  }

  // ------------------------------------------------ fokus dari modul lain
  function focusTag(tag) {
    const n = tagNodes.get(tag);
    focusTags = [tag]; setHighlight([tag]); showUnit(tag); labelKey = '';
    if (!n) { emit('toast', `${tag} tidak memiliki geometri 3D tersendiri (titik batas/simpul).`); return; }
    setFree(true, false);
    const box = new THREE.Box3().setFromObject(n); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()).length();
    const e = DATA.eq[tag]; if (e && e.area) { allAreas = false; ACT = new Set([e.area]); applyArea(); }
    const dir = camera.position.clone().sub(controls.target).normalize(); dir.y = Math.max(dir.y, 0.45); dir.normalize();
    flyToVec(c.clone().addScaledVector(dir, Math.max(22, sz * 2.4)), c);
  }
  function focusStream(sid) {
    const f = DATA.flow[sid]; showStream(sid); if (!f || !f.p.length) return;
    setFree(true, false); focusTags = []; setHighlight([], [sid]);
    allAreas = false; ACT = streamAreas(sid); if (!ACT.size) allAreas = true; if (!T.flow) toggle('flow', true); applyArea();
    const P = f.p.map(b2t); const box = new THREE.Box3().setFromPoints(P); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()).length();
    const dir = camera.position.clone().sub(controls.target).normalize(); dir.y = Math.max(dir.y, 0.5); dir.normalize();
    flyToVec(c.clone().addScaledVector(dir, Math.max(30, sz * 1.3)), c);
  }

  // ------------------------------------------------ toolbar
  function toggle(k, val) {
    T[k] = val ?? !T[k]; const b = $(`#v3dTools [data-tg="${k}"]`); if (b) { b.classList.toggle('on', T[k]); b.setAttribute('aria-pressed', T[k]); }
    if (k === 'ctx') { if (T.ctx) ensureCtx().then(() => { setVis(); tour.render(STOPS[tour.cur], tour.cur); }); else { setVis(); tour.render(STOPS[tour.cur], tour.cur); } }
    else if (k === 'util' || k === 'pipe') setVis();
    else if (k === 'flow') applyArea();
    else if (k === 'ghost') setGhost(T.ghost);
    else if (k === 'rotate') controls.autoRotate = T.rotate;
    labelKey = ''; req();
  }
  Object.keys(T).forEach(k => { const b = $(`#v3dTools [data-tg="${k}"]`); if (b) { b.classList.toggle('on', T[k]); b.setAttribute('aria-pressed', T[k]); } });
  $$('#v3dTools [data-tg]').forEach(b => b.onclick = () => toggle(b.dataset.tg));
  $$('#v3dTools [data-view]').forEach(b => b.onclick = () => { setFree(true, false); allAreas = true; applyArea(); flyTo(VIEWS[b.dataset.view]); });
  function setFree(on, goBack = true) {
    free = on; stage.classList.toggle('free', free); const b = $('#v3dTools [data-act="free"]'); b.classList.toggle('on', free); b.setAttribute('aria-pressed', free);
    if (free) tour.play(false);
    if (!free && goBack) tour.go(tour.cur);
    labelKey = ''; req();
  }
  async function setPresent(on) {
    present = on; stage.classList.toggle('present', on); const b = $('#v3dTools [data-act="present"]'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    try { if (on && !document.fullscreenElement) await stage.requestFullscreen(); else if (!on && document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* fullscreen ditolak: tetap mode presentasi */ }
    showTab('narasi'); setTimeout(layout, 50);
  }
  const help = $('#v3dHelp');
  $$('#v3dTools [data-act]').forEach(b => b.onclick = () => {
    const a = b.dataset.act;
    if (a === 'free') setFree(!free);
    else if (a === 'present') setPresent(!present);
    else if (a === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(() => emit('toast', 'Layar penuh tidak didukung browser ini.')); }
    else if (a === 'shot') shot();
    else if (a === 'quality') setQuality({ auto: 'high', high: 'low', low: 'auto' }[Q.mode]);
    else if (a === 'help') { help.hidden = !help.hidden; b.setAttribute('aria-expanded', !help.hidden); }
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && present) { present = false; stage.classList.remove('present'); $('#v3dTools [data-act="present"]').classList.remove('on'); } setTimeout(layout, 60); });
  function shot() {
    renderer.render(scene, camera);
    canvas.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `METHACYCLE_3D_${STOPS[tour.cur].id}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); emit('toast', 'Tangkapan layar PNG diunduh.'); }, 'image/png');
  }

  // ------------------------------------------------ keyboard (aktif saat area 3D terlihat)
  let inView = false;
  new IntersectionObserver(es => { inView = es[0].intersectionRatio >= 0.4; if (es[0].isIntersecting) req(); }, { threshold: [0, 0.4, 0.8] }).observe(stage);
  let visibleAny = true;
  new IntersectionObserver(es => { visibleAny = es[0].isIntersecting; if (visibleAny) req(); }).observe(stage);
  addEventListener('keydown', e => {
    if (!(inView || document.fullscreenElement === stage) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.target.closest && e.target.closest('#scadaApp,#dash')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') { tour.go(tour.cur + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { tour.go(tour.cur - 1); e.preventDefault(); }
    else if (k === ' ') { if (free) setFree(false); tour.play(!tour.playing); e.preventDefault(); }
    else if (k === 'b' || k === 'B') setFree(!free);
    else if (k === 'p' || k === 'P') setPresent(!present);
    else if (k === 'f' || k === 'F') toggle('flow');
    else if (k === 'l' || k === 'L') toggle('label');
    else if (k === 'Escape' && !help.hidden) help.hidden = true;
  });

  // ------------------------------------------------ klik & hover
  const ray = new THREE.Raycaster(); ray.layers.enableAll(); const mv = new THREE.Vector2(); let downXY = null;
  function pick(e) {
    const r = canvas.getBoundingClientRect(); mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mv, camera);
    const hit = ray.intersectObjects(pickables, false).find(h => { let o = h.object; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
    let o = hit && hit.object, tag = null, sid = null; while (o) { if (o.userData?.tag) { tag = o.userData.tag; break; } if (o.userData?.stream_id) { sid = o.userData.stream_id; break; } o = o.parent; }
    return { tag, sid, r };
  }
  canvas.addEventListener('pointerdown', e => downXY = [e.clientX, e.clientY]);
  canvas.addEventListener('pointerup', e => {
    if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 5) return;
    const { tag, sid } = pick(e);
    if (tag && (DATA.eq[tag] || REG.EQ[tag])) { focusTags = [tag]; setHighlight([tag]); showUnit(tag); labelKey = ''; }
    else if (sid && DATA.streams[sid]) { showStream(sid); setHighlight([], [sid]); }
  });
  const tip = $('#v3dTip'); let hovT = 0;
  function flowHTML(sid) {
    const s2 = DATA.streams[sid], f = DATA.flow[sid] || {}; if (!s2) return '';
    return `<b>Aliran ${esc(sid)}</b> · ${esc(s2.pfd_name)}<br><span class="mut">${esc(s2.medium)}: ${esc(s2.from_tag)} → ${esc(s2.to_tag)}</span><div class="q">${qTxt(f)}</div>${sizeTxt(f) ? `<div class="dn">${sizeTxt(f)}</div>` : ''}`;
  }
  let hovTimer = 0, hovEv = null;
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    if (e.buttons || flying || dragging) { tip.style.display = 'none'; clearTimeout(hovTimer); return; }
    hovEv = e; clearTimeout(hovTimer); hovTimer = setTimeout(() => hover(hovEv), 90);   // raycast hanya saat kursor berhenti sejenak
  });
  function hover(e) {
    if (flying || dragging) return;
    const { sid, tag, r } = pick(e);
    canvas.style.cursor = tag ? 'pointer' : sid ? 'help' : '';
    if (!sid) { tip.style.display = 'none'; return; }
    tip.innerHTML = flowHTML(sid); tip.style.display = 'block';
    const x = e.clientX - r.left, y = e.clientY - r.top;
    tip.style.left = Math.min(W - tip.offsetWidth - 8, x + 14) + 'px'; tip.style.top = Math.max(8, y - tip.offsetHeight - 10) + 'px';
  }
  canvas.addEventListener('pointerleave', () => { clearTimeout(hovTimer); tip.style.display = 'none'; });
  controls.addEventListener('start', () => { if (flying) flying = null; });
  controls.addEventListener('change', () => req());

  // ------------------------------------------------ loop render: on-demand, 30 fps saat hanya animasi ambient, resolusi adaptif
  const _lastM = new Float32Array(16); let lastWH = 0;
  function camChanged() {   // tanpa alokasi string tiap frame
    const e = camera.matrixWorld.elements, wh = W * 10000 + H; let ch = wh !== lastWH; lastWH = wh;
    for (let i = 0; i < 16; i++) if (Math.abs(e[i] - _lastM[i]) > 1e-3) { ch = true; _lastM[i] = e[i]; }
    return ch;
  }
  const STATS = { ...STAT0 }; let raf = 0, dirty = true, lastCam = '', lastT = 0, elapsed = 0, dragging = false;
  controls.addEventListener('start', () => { dragging = true; }); controls.addEventListener('end', () => { dragging = false; });
  function req() { dirty = true; if (!raf) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) req(); });
  // near/far mengikuti jarak kamera agar presisi depth cukup tanpa logarithmic depth buffer
  function updClip() {
    const d = camera.position.distanceTo(controls.target);
    const near = THREE.MathUtils.clamp(d * 0.01, 0.25, 40), far = THREE.MathUtils.clamp(d * 30, 1600, 12000);
    if (Math.abs(near - camera.near) / camera.near > 0.15 || Math.abs(far - camera.far) / camera.far > 0.15) { camera.near = near; camera.far = far; camera.updateProjectionMatrix(); }
    scene.fog.far = Math.min(scene.fog.far, camera.far * 0.97); scene.fog.near = Math.min(scene.fog.near, scene.fog.far * 0.55);
  }
  // kualitas adaptif: turun satu tingkat bila 2 jendela berturut-turut lebih lambat dari target, naik bila 4 jendela longgar
  let win = [], slow = 0, fast = 0, cool = 0;
  function adapt(interval, target) {
    win.push(interval); if (win.length < 30) return;
    const avg = win.reduce((a, b) => a + b, 0) / win.length; win = []; Q.fps = Math.round(1000 / avg);
    if (Q.mode !== 'auto') return; if (cool > 0) { cool--; return; }
    if (avg > target * 1.3) { slow++; fast = 0; } else if (avg < target * 1.06) { fast++; slow = 0; } else { slow = fast = 0; }
    if (slow >= 2 && Q.tier < TIERS.length - 1) { applyTier(Q.tier + 1); slow = 0; cool = 2; }
    else if (fast >= 4 && Q.tier > 0) { applyTier(Q.tier - 1); fast = 0; cool = 3; }
  }
  function applyLite(on) {
    if (Q.lite === on) return; Q.lite = on;
    for (const b of plantBatches) { if (ghostMats.has(b)) continue; if (on) { b.userData.std ||= b.material; b.material = lambertOf(b.userData.std); } else if (b.userData.std) b.material = b.userData.std; }
    const wantShadow = !on; if (sun.castShadow !== wantShadow) { sun.castShadow = wantShadow; shadowDirty(); }
  }
  function applyTier(i) {
    const t = TIERS[i]; Q.tier = i; Q.dpr = t.dpr; renderer.setPixelRatio(t.dpr); applyLite(!!t.lite); layout(); updQualityUI(); req();
  }
  function frame(now) {
    raf = 0; if (!visibleAny || document.hidden) { lastT = 0; return; }
    const moved = controls.update();
    const interacting = !!flying || moved || dragging || T.rotate;
    const ambient = (T.flow && FL.length) || (T.atmo && SYS.length) || hlList.length || (tour.playing && !free);
    const target = interacting || !TIERS[Q.tier].cap ? 1000 / 60 : 1000 / 30;
    if (lastT && !dirty && !interacting && now - lastT < target - 2) { raf = requestAnimationFrame(frame); return; }
    const interval = lastT ? now - lastT : target; const dt = Math.min(interval / 1000, 0.1); lastT = now; elapsed += dt; const t = elapsed;
    if (flying) {
      flying.t += dt / flying.d; const k = ease(Math.min(1, flying.t));
      camera.position.lerpVectors(flying.p0, flying.p1, k);
      camera.position.y += Math.sin(Math.PI * k) * Math.min(220, flying.p0.distanceTo(flying.p1) * 0.12);
      controls.target.lerpVectors(flying.t0, flying.t1, k); if (flying.t >= 1) flying = null;
    } else if (!free) tour.tick(dt);
    const pulse = 0.06 + 0.06 * (0.5 + 0.5 * Math.sin(t * 3.2)); for (const m of hlList) m.emissiveIntensity = pulse;
    const t0 = performance.now(); updFlow(t); updAtmo(dt, t); updScale(); updClip(); const t1 = performance.now();
    renderer.render(scene, camera); const t2 = performance.now();
    if (camChanged() || !labelKey) { labelKey = 'ok'; drawLabels(); }
    STATS.js = +(t1 - t0).toFixed(2); STATS.gl = +(t2 - t1).toFixed(2); STATS.calls = renderer.info.render.calls; STATS.tris = renderer.info.render.triangles; STATS.dpr = Q.dpr; STATS.fps = Q.fps;
    if (interval < 250) adapt(interval, target);
    if (interacting || ambient || dirty) { dirty = false; raf = requestAnimationFrame(frame); } else lastT = 0;
  }
  // ------------------------------------------------ mode kualitas: Otomatis / Tinggi / Ringan
  const QL = { auto: 'Otomatis', high: 'Tinggi', low: 'Ringan' };
  function updQualityUI() {
    const b = $('#v3dTools [data-act="quality"]'); if (b) { b.querySelector('span').textContent = QL[Q.mode]; b.title = `Kualitas grafis: ${QL[Q.mode]} (resolusi ${fmt(Q.dpr, 2)}×)`; b.setAttribute('aria-label', b.title); }
    const h = $('#v3dQ'); if (h) h.textContent = `Kualitas ${QL[Q.mode]} · tingkat ${Q.tier + 1}/${TIERS.length} · resolusi ${fmt(Q.dpr, 2)}× · ±${Q.fps || '·'} fps · ${STATS.calls || '·'} draw call`;
  }
  function setQuality(mode) {
    Q.mode = mode; win = []; slow = fast = 0; cool = 1;
    applyTier(mode === 'high' ? 0 : mode === 'low' ? 3 : START_TIER);
    try { localStorage.setItem('methacycle-q', mode); } catch (e) { /* abaikan */ }
  }
  { let saved = null; try { saved = localStorage.getItem('methacycle-q'); } catch (e) { /* abaikan */ } if (saved && QL[saved] && saved !== 'auto') setQuality(saved); }
  setInterval(() => { if (!help.hidden) updQualityUI(); }, 1000);

  // ------------------------------------------------ mulai
  buildFlow(); buildAtmo(); buildFlowPane(); setVis(); layout(); shadowDirty();
  if (T.ctx) ensureCtx().catch(e => console.error(e));
  loadEl.classList.add('done'); setTimeout(() => { if (!ctxLoading) navGlb.hidden = true; }, 600);
  if (ctxLoading) ctxLoading.then(() => navGlb.hidden = true);
  tour.go(0, true); updQualityUI();
  await precompile(scene);
  req();

  const api = {
    go: (i, instant) => { setFree(false, false); tour.go(i, !!instant); },
    goId: id => { const i = STOPS.findIndex(s => s.id === id); if (i >= 0) api.go(i); },
    play: on => { setFree(false, false); tour.play(on); req(); },
    setFree: on => setFree(on),
    focusTag, focusStream,
    hasTag: t => tagNodes.has(t), stats: STATS, setQuality,
    bench: (n = 8) => { const gl = renderer.getContext(), px = new Uint8Array(4); const t = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t.push(performance.now() - t0); } t.sort((a, b) => a - b); return { med: +t[n >> 1].toFixed(1), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, dpr: renderer.getPixelRatio(), W: renderer.domElement.width, H: renderer.domElement.height, fl: FL.reduce((a, s) => a + s.k, 0) }; },
    debug: () => ({ tier: Q.tier, cam: camera.position.toArray().map(v => +v.toFixed(1)), tgt: controls.target.toArray().map(v => +v.toFixed(1)), flying: !!flying, near: camera.near, far: camera.far }),
  };
  return api;
}
