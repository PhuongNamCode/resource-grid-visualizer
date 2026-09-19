// Copyright (C) 2026 NeuroRAN. All rights reserved.

// gnb_to_profile.mjs
//
// Converts ANY gNB YAML config into the normalized cell_profile.json consumed
// by the resource-grid-visualizer UI. This is the ONLY component that reads the
// vendor YAML, so re-targeting the tool at a different gNB is purely:
//
//   npm run gen:profile -- --config /path/to/other-gnb.yml
//
// or set GNB_CONFIG=/path/to/other-gnb.yml.
//
// srsRAN/OCUDU config shape handled:
//   * `cell_cfg:`  -> common single-cell template.
//   * `cells:`     -> optional list; each entry is deep-merged over `cell_cfg`.
//   * TDD via `tdd_ul_dl_cfg`; absence of that block implies FDD.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..');

// ---- CLI / env ----------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config' || a === '-c') out.config = argv[++i];
    else if (a.startsWith('--config=')) out.config = a.slice('--config='.length);
    else if (a === '--out' || a === '-o') out.out = argv[++i];
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const configPath = path.resolve(
  args.config || process.env.GNB_CONFIG || path.join(repoRoot, 'config/generated/gnb.yml'),
);
const outPath = path.resolve(args.out || path.join(appDir, 'public/cell_profile.json'));

// ---- 3GPP lookup tables (TS 38.101-1 Table 5.3.2-1) ---------------------
// Transmission bandwidth configuration N_RB per channel BW (MHz) and SCS (kHz).
const NRB_FR1 = {
  15: { 5: 25, 10: 52, 15: 79, 20: 106, 25: 133, 30: 160, 40: 216, 50: 270 },
  30: { 5: 11, 10: 24, 15: 38, 20: 51, 25: 65, 30: 78, 40: 106, 50: 133, 60: 162, 70: 189, 80: 217, 90: 245, 100: 273 },
  60: { 10: 11, 15: 18, 20: 24, 25: 31, 30: 38, 40: 51, 50: 65, 60: 79, 70: 93, 80: 107, 90: 121, 100: 135 },
};
const NRB_FR2 = {
  60: { 50: 66, 100: 132, 200: 264 },
  120: { 50: 32, 100: 66, 200: 132, 400: 264 },
};

function nRbFromBandwidth(bwMhz, scsKhz, isFr2) {
  const table = isFr2 ? NRB_FR2 : NRB_FR1;
  return table?.[scsKhz]?.[bwMhz] ?? null;
}

// Coarse NR operating-band ranges by DL ARFCN (TS 38.104 Table 5.4.2.3-1).
// Enough to label the cell + pick the SSB raster case when `band` is absent.
const BAND_BY_ARFCN = [
  { band: 'n78', min: 620000, max: 653333, fr2: false },
  { band: 'n77', min: 620000, max: 680000, fr2: false },
  { band: 'n79', min: 693334, max: 733333, fr2: false },
  { band: 'n41', min: 499200, max: 537999, fr2: false },
  { band: 'n38', min: 514000, max: 524000, fr2: false },
  { band: 'n40', min: 460000, max: 480000, fr2: false },
  { band: 'n48', min: 636667, max: 646666, fr2: false },
  { band: 'n1', min: 422000, max: 434000, fr2: false },
  { band: 'n3', min: 361000, max: 376000, fr2: false },
  { band: 'n7', min: 524000, max: 538000, fr2: false },
  { band: 'n257', min: 2054166, max: 2104165, fr2: true },
  { band: 'n258', min: 2016667, max: 2070832, fr2: true },
  { band: 'n260', min: 2229166, max: 2279165, fr2: true },
];

function deriveBand(arfcn) {
  if (arfcn == null) return null;
  const hit = BAND_BY_ARFCN.find((b) => arfcn >= b.min && arfcn <= b.max);
  return hit ? hit.band : null;
}

function isFr2Band(band, arfcn) {
  const num = typeof band === 'string' ? Number(band.replace(/[^0-9]/g, '')) : Number(band);
  if (Number.isFinite(num) && num >= 257) return true;
  const hit = BAND_BY_ARFCN.find((b) => arfcn != null && arfcn >= b.min && arfcn <= b.max);
  return hit ? hit.fr2 : false;
}

// ---- helpers ------------------------------------------------------------
function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, override) {
  if (!isPlainObject(base)) return override;
  if (!isPlainObject(override)) return override ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = isPlainObject(v) && isPlainObject(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

function num(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeBand(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.toLowerCase().startsWith('n') ? s : `n${s}`;
}

function toProfile(cell, index) {
  const notes = [];
  const scsKhz = num(cell.common_scs) ?? 30;
  if (num(cell.common_scs) == null) notes.push('common_scs missing; defaulted to 30 kHz');

  const arfcn = num(cell.dl_arfcn);
  let band = cell.band != null ? normalizeBand(cell.band) : deriveBand(arfcn);
  if (cell.band == null && band != null) notes.push(`band derived from ARFCN (${band})`);

  const bwMhz = num(cell.channel_bandwidth_MHz);
  const fr2 = isFr2Band(band, arfcn);
  let nRb = bwMhz != null ? nRbFromBandwidth(bwMhz, scsKhz, fr2) : null;
  if (nRb == null && bwMhz != null) {
    // Fallback estimate if the (BW, SCS) pair is not tabulated.
    const scsHz = scsKhz * 1000;
    nRb = Math.max(1, Math.floor((bwMhz * 1e6 * 0.9) / (12 * scsHz)));
    notes.push(`N_RB not in TS 38.101-1 table for ${bwMhz} MHz @ ${scsKhz} kHz; estimated ${nRb}`);
  }

  const tddRaw = cell.tdd_ul_dl_cfg;
  const tdd = isPlainObject(tddRaw)
    ? {
        periodSlots: num(tddRaw.dl_ul_tx_period) ?? 10,
        nofDlSlots: num(tddRaw.nof_dl_slots) ?? 0,
        nofDlSymbols: num(tddRaw.nof_dl_symbols) ?? 0,
        nofUlSlots: num(tddRaw.nof_ul_slots) ?? 0,
        nofUlSymbols: num(tddRaw.nof_ul_symbols) ?? 0,
      }
    : null;

  return {
    name: cell.pci != null ? `Cell PCI ${cell.pci}` : `Cell ${index}`,
    pci: num(cell.pci),
    band,
    dlArfcn: arfcn,
    scsKhz,
    channelBandwidthMhz: bwMhz ?? 0,
    nRb: nRb ?? 0,
    nAntDl: num(cell.nof_antennas_dl),
    nAntUl: num(cell.nof_antennas_ul),
    duplex: tdd ? 'TDD' : 'FDD',
    tdd,
    prachConfigIndex: isPlainObject(cell.prach) ? num(cell.prach.prach_config_index) : null,
    notes,
  };
}

// ---- main ---------------------------------------------------------------
function main() {
  if (!fs.existsSync(configPath)) {
    console.error(`[gnb_to_profile] config not found: ${configPath}`);
    process.exit(1);
  }
  const doc = YAML.parse(fs.readFileSync(configPath, 'utf8')) || {};
  const base = isPlainObject(doc.cell_cfg) ? doc.cell_cfg : {};

  let rawCells;
  if (Array.isArray(doc.cells) && doc.cells.length > 0) {
    rawCells = doc.cells.map((c) => deepMerge(base, isPlainObject(c) ? c : {}));
  } else if (Object.keys(base).length > 0) {
    rawCells = [base];
  } else {
    console.error('[gnb_to_profile] no `cell_cfg` or `cells:` found in config');
    process.exit(1);
  }

  const cells = rawCells
    .filter((c) => c.enabled == null || c.enabled === true || String(c.enabled).toLowerCase() === 'true')
    .map(toProfile);

  const output = {
    generatedAt: new Date().toISOString(),
    sourceConfig: path.relative(repoRoot, configPath),
    cells,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`[gnb_to_profile] ${configPath}`);
  console.log(`[gnb_to_profile] -> ${outPath} (${cells.length} cell(s))`);
  for (const c of cells) {
    console.log(
      `  - ${c.name}: ${c.duplex} ${c.band ?? '?'} ${c.channelBandwidthMhz}MHz @ ${c.scsKhz}kHz -> ${c.nRb} RB` +
        (c.notes.length ? `  [${c.notes.join('; ')}]` : ''),
    );
  }
}

main();
