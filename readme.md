# METHACYCLE Digital Twin

Website statis satu halaman untuk CARBON Essay Competition 2026 (Tim UI x ITB: Bondan Attoriq, Azkia Nayla, dan Jason Lee Wijaya).
Isi: tur 3D 17 perhentian, SCADA/HMI 7 layar dengan mode simulasi, Engineering Dashboard, neraca massa-energi, analisis 4E, kerangka optimasi ML, ekonomi sirkular, dan unduhan.

## Deploy ke Netlify Drop
1. Buka https://app.netlify.com/drop.
2. Seret **folder `methaland-site/`** (atau ekstrak ZIP lalu seret foldernya) ke halaman tersebut.
3. Selesai. Tidak ada build step; `_headers` mengatur MIME `model/gltf-binary` dan cache.

## Menjalankan lokal
Browser tidak mengizinkan ES module dan berkas `.glb` dibuka langsung dari disk (`file://`), jadi jalankan server lokal di folder ini:

```bash
python -m http.server 8000      # atau: python3 -m http.server 8000
```
Lalu buka http://localhost:8000. Tautan langsung ke perhentian tur: `#stop-<id>`, contoh `#stop-peme`.

## Struktur folder
```
methaland-site/
├─ index.html            kerangka semua section
├─ _headers              header Netlify (MIME GLB, cache)
├─ assets/
│  ├─ css/style.css      tema (palet poster), SCADA gelap, responsif
│  ├─ js/
│  │  ├─ main.js         navigasi, scroll, loader, lazy-init, jembatan antarmodul
│  │  ├─ util.js         format angka Indonesia, event bus, pemuat data register
│  │  ├─ viewer3d.js     port + upgrade viewer v4 (aliran, atmosfer, label, scale bar, pintasan)
│  │  ├─ tour.js         17 perhentian (narasi ditulis ulang, angka `num` tidak diubah)
│  │  ├─ scada.js        layar HMI, data binding, mode simulasi, alarm, faceplate, pan/zoom
│  │  ├─ scada-symbols.js simbol SVG unit (turunan PFD berwarna)
│  │  ├─ dashboard.js    model skenario ekonomi & lingkungan
│  │  ├─ sections.js     Neraca, 4E, ML, Sirkular, Unduhan & galeri
│  │  ├─ charts.js       grafik SVG buatan sendiri (tooltip, legenda, "Lihat data")
│  │  └─ paper-data.js   konstanta dari full paper
│  ├─ data/              data.json (3D v4), equipment.json, streams.json, neraca.json, pipa.json, scada-layout.json
│  ├─ models/            plant.glb, konteks.glb (GLB v4 apa adanya, kompresi meshopt)
│  ├─ img/               render, thumbnail tur, poster, PFD, foto tim, gambar paper
│  └─ downloads/         full paper (PDF), poster, render HD (ZIP), register (CSV), PFD
└─ lib/three/            three.js r160 (MIT): three.module.js, OrbitControls, GLTFLoader, meshopt_decoder, BufferGeometryUtils
```

## Sumber data
- **Angka paper**: full paper (Tabel 1–6, Lampiran 9–20, Gambar 6) di `assets/js/paper-data.js`.
- **3D**: `data.json` dan GLB dari METHACYCLE v4 (`04_Web/situs`), tidak diubah.
- **Register**: `05_Data_Register/*.csv` dikonversi sekali ke JSON oleh `tools/build_assets.py` (di luar folder deploy).
- **SCADA**: koordinat pada grid PFD berwarna 1920 × 1080 di `assets/data/scada-layout.json` (dibuat `tools/scada_layout.py`). Tiap layar = satu atau lebih *pane* dari grid itu yang dipetakan ke kanvas 1920 × 1080; unit/aliran per layar dipilih otomatis dari pane. Topologi dan nilai dari `stream_register`, `neraca_aliran`, `ukuran_pipa`.
- **Render**: diambil dari Kartu Tur METHACYCLE (render Blender per perhentian).

## Fitur tambahan
- **Tur 3D layar penuh** (`tur3d/`, tombol di bagian 3D Plant): viewer asli v4 yang lebih ringan, memakai model dan data situs. Versi mandirinya ada di ZIP terpisah (`methacycle-3d/`, dibuat `tools/build_tur3d.py`).
- **Peta lokasi interaktif** (bagian Latar, `peta.js`): peta dasar = render ortografis tampak atas dari model 3D sendiri (`assets/img/peta_tpst.jpg`, 1,25 m/px; dibuat ulang dengan `tools/render_map.html`). Lapisan zona timbunan, fasilitas TPST, plot METHACYCLE, jarak aman (`checks` di data.json), header LFG (rute `LFG-H`), dan Sungai Ciketing; zoom, geser, klik penanda untuk detail.
- **Sebelum vs sesudah** (bagian Sirkular, `banding.js`): penggeser Landfill/WtE vs METHACYCLE berbasis LCIA Tabel 5, per ton LPP atau per tahun (× 33.333 t LPP/tahun), plus produk dan pendapatan.
- **Animasi masuk** (`anim.js`): angka naik saat terlihat, Sankey mengalir, batang tumbuh, garis tergambar, cincin efisiensi; otomatis nonaktif bila `prefers-reduced-motion`.

## Performa 3D
- Model diunduh sebagai `plant.glb.gz` / `konteks.glb.gz` (GLB yang sama, dikompres gzip: 12,2 → 6,5 MB) lalu dibuka dengan `DecompressionStream`; otomatis kembali ke `.glb` bila tidak tersedia.
- Geometri statis digabung per material saat runtime (±1.120 → ±200 draw call). Mesh asli disimpan di layer tersembunyi untuk klik, hover, dan sorotan.
- Tanpa logarithmic depth buffer (near/far dinamis), bayangan PCF 2048 statis, partikel aliran low-poly.
- Render 30 fps saat hanya animasi ambient, penuh saat interaksi; berhenti saat bagian 3D tidak terlihat.
- IBL (PMREM) hanya untuk material logam; material lain memakai light probe spherical harmonics dari langit yang sama. Konteks TPST memakai material Lambert.
- Kualitas adaptif 5 tingkat (resolusi 1,5× sampai 0,6×; dua tingkat terbawah memakai material sederhana tanpa bayangan) + tombol ⚙ Kualitas (Otomatis / Tinggi / Ringan); pilihan tersimpan di browser.
- Shader dikompilasi di depan; label 3D tidak memicu forced layout; raycast hover hanya saat kursor berhenti.

## Model perhitungan dashboard
- NPV, IRR, PBP: interpolasi linear piecewise Lampiran 19; dua parameter berubah: superposisi Δ terhadap basis (badge "estimasi kombinasi"). Basis: NPV US$21,47 juta, IRR 28,5%, PBP 3,71 tahun.
- Harga impas: interpolasi balik (basis ≈ US$616/ton dan ≈ US$54,4/MWh).
- Arus kas: seri Lampiran 16 + k × utilisasi, k dipilih agar NPV 10% berubah sebesar ΔNPV.
- Intensitas emisi operasional: 0,134 + 11,02 × EF (10,49 kWh/kg bila PEME −5% aktif, estimasi).
- Kombinasi parameter dan mode simulasi SCADA bersifat skematik/estimasi, bukan hasil uji.

## Batas model
Model 3D adalah tata letak konseptual. Nilai di SCADA mode desain mengikuti neraca paper; mode simulasi dan kombinasi skenario dashboard bersifat skematik/estimasi, bukan hasil uji.
