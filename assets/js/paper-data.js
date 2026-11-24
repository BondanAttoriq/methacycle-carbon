// Konstanta dari full paper CARBON Essay Competition 2026 (tidak diubah). Sumber per blok di komentar.
export const P = {
  // 9.1 Basis & neraca (Tabel 3, Tabel 4, Subbab 3.5–3.6)
  base: {
    lpp: 100, lfg: 1000, lfgComp: 'CH₄ 50%, CO₂ 45%, N₂ 5%',
    co2ToCCU: 112.60, co2Captured: 108.03, captureEff: 95.94, co2Used: 102.63, useEff: 95,
    co2Uncaptured: 4.57, co2Unused: 5.40, co2Residual: 9.97, co2Intensity: 0.134,
    h2: 14.3, h2Stoich: 14.0, h2Util: 98, o2: 114.37, o2ToOEC: 101.03, o2Surplus: 13.33,
    waterElec: 128.6, waterSynth: 42.0, ash: 15.27,
    meoh: 74.72, purity: 99.76, meohYear: 24880, hours: 8000,
    synth: { cat: 'Cu/ZnO/Al₂O₃', T: '240–300 °C', P: '5–7,8 MPa', ratio: 3, purge: 5 },
    peme: 33.10, pemeSpec: 55.2, ccu: 1.20, energyIn: 58.11,
    dryLoad: 1.35, synthHeat: 1.34, whr: 1.75, effMeoh: 29.62, effWHR: 32.62,
    elecSpec: 11.02, elecSpecL10: 10.95,
    energyInputs: [['Energi kimia LPP', 18.85, 'MWth'], ['Energi kimia CH₄ dalam LFG', 4.97, 'MWth'], ['Listrik PEME', 33.10, 'MWe'], ['Listrik CCU', 1.20, 'MWe']],
    meohEnergy: 17.21, elecBeforeWHR: 34.30,
  },
  // 9.2 Asumsi ekonomi (Lampiran 11)
  econ: { life: 20, disc: 10, tax: 25, meohPrice: 750, elecPrice: 40, tipping: 15, o2Price: 100, meohEcon: 74.64 },
  // 9.3 CAPEX (Lampiran 12, US$ juta)
  capex: [['Pretreatment & pengeringan', 1.20], ['OEC & boiler', 1.35], ['CCU & kompresi', 1.10], ['PEME & pemisahan gas', 4.40],
    ['Sintesis & pemurnian', 1.05], ['Conditioning LFG', 0.70], ['WHR, utilitas & kelistrikan', 0.90], ['Pipa, instrumentasi & integrasi', 1.15],
    ['Contingency & commissioning', 1.15]],
  capexTotal: 13.00,
  // 9.4 OPEX (Lampiran 13, US$ juta/tahun)
  opex: [['Listrik terbarukan (PEME, CCU, auxiliary)', 12.49], ['Bahan kimia, air & katalis', 0.30], ['Conditioning LFG & residu', 0.15],
    ['Consumables', 0.15], ['Maintenance', 0.46], ['Tenaga kerja & administrasi', 0.45]],
  opexTotal: 13.99,
  revenue: [['Metanol', 18.66], ['Jasa pengolahan limbah', 0.50], ['Surplus O₂', 0.433]], revenueTotal: 19.593,
  ramp: [[1, 60, 14928], [2, 80, 19904], [3, 90, 22392], [4, 100, 24880]],
  // Lampiran 16: [tahun, revenue, opex, ebitda, fcf, kumulatif]
  cash: [[0, 0, 0, 0, -13.00, -13.00], [1, 11.76, 8.70, 3.06, 2.45, -10.55], [2, 15.67, 11.30, 4.37, 3.44, -7.11], [3, 17.63, 12.60, 5.03, 3.94, -3.17],
    [4, 19.59, 13.90, 5.70, 4.43, 1.26], [5, 19.59, 13.90, 5.70, 4.43, 5.69]],
  cashLateFCF: 4.43, cashCum20: 72.14,
  // Lampiran 17 / Tabel 6
  ind: { capex: 13.00, opex: 13.99, revenue: 19.59, ebitda: 5.60, fcf: 4.37, npv: 21.47, irr: 28.5, pi: 2.65, pbp: 3.71, dpbp: 4.7, opCost: 562, meohCost: 624 },
  // 9.5 LCIA (Tabel 5, per ton LPP) : [kategori, satuan, landfill, wte, metanol]
  lcia: [
    ['Pemanasan global', 'kg CO₂-eq', 672, 342, 128],
    ['Terrestrial acidification', 'kg SO₂-eq', 9.93, 0.336, 1.170],
    ['Ozone formation, terrestrial', 'kg NOₓ-eq', 0.627, 1.000, -0.172],
    ['Water consumption', 'm³', -3.07, -8.060, -6.630],
    ['Fossil resource scarcity', 'kg oil-eq', -7.14, -12.000, -0.152],
    ['Human carcinogenic toxicity', 'kg 1,4-DCB', 1.35, 0.335, -1.590],
    ['Ozone formation, human health', 'kg NOₓ-eq', 0.615, 1.010, 0.587],
    ['Fine particulate matter', 'kg PM2.5-eq', 2.87, 0.075, -0.312]],
  gwpCut: { landfill: 80.95, wte: 62.57 },
  // 9.6 Sensitivitas (Lampiran 19): [x, NPV, IRR, PBP]
  sensMeoh: [[600, -4.21, 8.5, '>20'], [650, 8.63, 18.1, 6.0], [700, 15.05, 24.6, 4.6], [750, 21.47, 28.5, 3.7], [800, 27.89, 32.1, 3.2], [900, 40.73, 38.9, 2.5]],
  sensElec: [[35, 28.62, 33.4, 3.1], [40, 21.47, 28.5, 3.7], [45, 14.32, 23.6, 4.8], [50, 7.17, 16.8, 7.0], [55, -0.98, 10.1, '>10'], [60, -9.13, 4.6, '>20']],
  // 9.7 Faktor emisi listrik: [EF, Subbab 3.6, Lampiran 10]
  ef: [[0, 0.134, 0.134], [0.05, 0.685, 0.681], [0.10, 1.236, 1.229], [0.40, 4.542, 4.512], [0.80, 8.950, 8.891]],
  l10: { co2ToCCU: 112.72, captured: 108.15, uncaptured: 4.58, converted: 102.74, unconverted: 5.41, residual: 9.98 },
  // 9.8 PEME -5% (Lampiran 20)
  peme5: { base: 33.10, new: 31.445, save: 1.655, days: 330, mwh: 13107.6, gwh: 13.11, usd04: 524304, usd05: 655380, intBase: 10.63, intNew: 10.10, elecNew: 10.49 },
  // Gambar 6 (sistem pembanding literatur): distribusi eksergi [nama, kW, %]
  exergy: { input: 4830405, product: ['Exergy Product', 3857114, 79.85], losses: [
    ['Biogas Upgrading Unit', 767702, 15.89], ['Methanol Production Unit', 139720, 2.89], ['Steam Power Plant', 27048, 0.56],
    ['Water Electrolysis Unit', 13036, 0.27], ['Organic Rankine Cycle 2', 11769, 0.24], ['Ammonia Power Cycle 1', 5737, 0.12],
    ['Organic Rankine Cycle 1', 3657, 0.08], ['Water Desalination Unit', 2792, 0.06], ['Ammonia Power Cycle 2', 1830, 0.04]] },
  // Lampiran 18
  lit: [['Zhou et al. (2026)', 'LPP', 'OEC, CCU, elektrolisis, WHR', '24 ton/hari', '701,49', 'n/a'],
    ['Sun et al. (2022)', 'LPP', 'Gasifikasi dan SOEC', '600 ton/hari', '355,89', '9 tahun'],
    ['Hai et al. (2023)', 'LFG', 'Upgrading LFG dan PEM', 'Skala besar', '124', 'n/a'],
    ['METHACYCLE (sistem terintegrasi)', 'LPP–LFG', 'OEC, PEME, CCU, WHR', '100 ton LPP/hari', '≈624', '3,71 tahun']],
  // 9.9 Kerangka ML
  ml: { factors: ['Rasio suplai O₂', 'Rasio H₂/CO₂', 'Temperatur sintesis'], responses: ['Produksi metanol', 'Konsumsi listrik PEME', 'Efisiensi energi', 'Intensitas emisi'],
    runs: 20, bench: 'R² 99,79–99,99%, galat prediksi < 2%' },
};
