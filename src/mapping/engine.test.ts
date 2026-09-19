// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { describe, expect, it } from 'vitest';
import { Owner, type CellProfile } from '../types';
import { nRbFromBandwidth } from './bandwidth';
import { scsToMu, slotsPerFrame, SYMBOLS_PER_SLOT } from './numerology';
import { expandTddPeriod } from './tdd';
import { ssbBlockRes, SSB_RB, SSB_SUBCARRIERS } from './ssb';
import { defaultParamsForProfile } from './params';
import { computeSlotGrid } from './grid';

const ocuduProfile: CellProfile = {
  name: 'Cell PCI 231',
  pci: 231,
  band: 'n78',
  dlArfcn: 628334,
  scsKhz: 30,
  channelBandwidthMhz: 50,
  nRb: 133,
  nAntDl: 4,
  nAntUl: 4,
  duplex: 'TDD',
  tdd: { periodSlots: 10, nofDlSlots: 7, nofDlSymbols: 6, nofUlSlots: 2, nofUlSymbols: 4 },
  prachConfigIndex: 159,
  notes: [],
};

describe('numerology (TS 38.211 sec 4.2/4.3.2)', () => {
  it('maps SCS to numerology mu', () => {
    expect(scsToMu(15)).toBe(0);
    expect(scsToMu(30)).toBe(1);
    expect(scsToMu(120)).toBe(3);
  });
  it('has 14 symbols/slot and 20 slots/frame at 30 kHz', () => {
    expect(SYMBOLS_PER_SLOT).toBe(14);
    expect(slotsPerFrame(30)).toBe(20);
  });
});

describe('bandwidth N_RB (TS 38.101-1 Table 5.3.2-1)', () => {
  it('50 MHz @ 30 kHz -> 133 PRB (OCUDU cell)', () => {
    expect(nRbFromBandwidth(50, 30)).toBe(133);
  });
  it('100 MHz @ 30 kHz -> 273 PRB', () => {
    expect(nRbFromBandwidth(100, 30)).toBe(273);
  });
  it('20 MHz @ 15 kHz -> 106 PRB', () => {
    expect(nRbFromBandwidth(20, 15)).toBe(106);
  });
  it('returns null for untabulated combos', () => {
    expect(nRbFromBandwidth(37, 30)).toBeNull();
  });
});

describe('TDD expansion (TS 38.213 sec 11.1)', () => {
  it('expands 7D/1S/2U for the OCUDU pattern', () => {
    const layouts = expandTddPeriod(ocuduProfile.tdd!);
    expect(layouts).toHaveLength(10);
    expect(layouts.filter((l) => l.direction === 'D')).toHaveLength(7);
    expect(layouts.filter((l) => l.direction === 'U')).toHaveLength(2);
    const special = layouts.filter((l) => l.direction === 'S');
    expect(special).toHaveLength(1);
    expect(special[0]).toMatchObject({ index: 7, dlSymbols: 6, ulSymbols: 4 });
  });
});

describe('SSB block (TS 38.211 sec 7.4.3)', () => {
  it('spans 20 RB x 4 symbols', () => {
    expect(SSB_RB).toBe(20);
    expect(SSB_SUBCARRIERS).toBe(240);
    const res = ssbBlockRes();
    const syms = new Set(res.map((r) => r.symInBlock));
    expect([...syms].sort()).toEqual([0, 1, 2, 3]);
  });
  it('places 127 PSS and 127 SSS subcarriers', () => {
    const res = ssbBlockRes();
    expect(res.filter((r) => r.owner === Owner.SsbPss)).toHaveLength(127);
    expect(res.filter((r) => r.owner === Owner.SsbSss)).toHaveLength(127);
  });
});

describe('slot grid composition', () => {
  const params = defaultParamsForProfile(ocuduProfile);

  it('DL slot 0 has PDCCH, PDSCH and an SSB burst', () => {
    const g = computeSlotGrid(params, 0);
    expect(g.direction).toBe('D');
    expect(g.accounting.control).toBeGreaterThan(0);
    expect(g.accounting.pdschData).toBeGreaterThan(0);
    expect(g.accounting.ssb).toBeGreaterThan(0);
    expect(g.owners).toHaveLength(133 * 12 * 14);
  });

  it('UL slot 9 has PUSCH and PUCCH but no PDSCH', () => {
    const g = computeSlotGrid(params, 9);
    expect(g.direction).toBe('U');
    expect(g.accounting.puschData).toBeGreaterThan(0);
    expect(g.accounting.control).toBeGreaterThan(0);
    expect(g.accounting.pdschData).toBe(0);
  });

  it('special slot 7 mixes DL and UL symbols with guard', () => {
    const g = computeSlotGrid(params, 7);
    expect(g.direction).toBe('S');
    expect(g.accounting.pdschData).toBeGreaterThan(0);
    expect(g.accounting.puschData).toBeGreaterThan(0);
  });

  it('marks SSB/PDSCH collisions when rate-matching is off', () => {
    const noRm = { ...params, toggles: { ...params.toggles, ssbRateMatch: false } };
    const g = computeSlotGrid(noRm, 0);
    expect(g.accounting.collision).toBeGreaterThan(0);
  });

  it('dynamically bounds PDSCH and PUSCH allocation when liveAlloc is passed', () => {
    const full = computeSlotGrid(params, 1);
    const partial = computeSlotGrid(params, 1, { pdschPrbs: 94 });
    expect(partial.accounting.pdschData).toBeLessThan(full.accounting.pdschData);
    expect(partial.accounting.pdschData).toBeGreaterThan(0);

    const fullUl = computeSlotGrid(params, 9);
    const partialUl = computeSlotGrid(params, 9, { puschPrbs: 4 });
    expect(partialUl.accounting.puschData).toBeLessThan(fullUl.accounting.puschData);
    expect(partialUl.accounting.puschData).toBeGreaterThan(0);
  });
});
