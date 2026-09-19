// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { describe, expect, it } from 'vitest';
import { partitionUePrbs, findUeForPrb } from './ueAllocation';
import type { LiveUeMetric } from '../types';

describe('ueAllocation (Multi-UE Spectrum Partitioning)', () => {
  const sampleUeList: LiveUeMetric[] = [
    {
      ue: 0,
      rnti: 0x4731,
      dl_brate: 150_000_000,
      ul_brate: 50_000,
      dl_mcs: 24,
      ul_mcs: 16,
      cqi: 15,
      dl_ri: 2,
      pusch_snr_db: 25,
      pusch_rsrp_db: -80,
      ta_ns: 100,
      dl_nof_ok: 100,
      dl_nof_nok: 0,
      ul_nof_ok: 50,
      ul_nof_nok: 0,
    },
    {
      ue: 1,
      rnti: 0x4732,
      dl_brate: 150_000_000,
      ul_brate: 50_000,
      dl_mcs: 24,
      ul_mcs: 16,
      cqi: 15,
      dl_ri: 2,
      pusch_snr_db: 25,
      pusch_rsrp_db: -80,
      ta_ns: 100,
      dl_nof_ok: 100,
      dl_nof_nok: 0,
      ul_nof_ok: 50,
      ul_nof_nok: 0,
    },
    {
      ue: 2,
      rnti: 0x4733,
      dl_brate: 150_000_000,
      ul_brate: 50_000,
      dl_mcs: 24,
      ul_mcs: 16,
      cqi: 15,
      dl_ri: 2,
      pusch_snr_db: 25,
      pusch_rsrp_db: -80,
      ta_ns: 100,
      dl_nof_ok: 100,
      dl_nof_nok: 0,
      ul_nof_ok: 50,
      ul_nof_nok: 0,
    },
    {
      ue: 3,
      rnti: 0x4734,
      dl_brate: 150_000_000,
      ul_brate: 50_000,
      dl_mcs: 24,
      ul_mcs: 16,
      cqi: 15,
      dl_ri: 2,
      pusch_snr_db: 25,
      pusch_rsrp_db: -80,
      ta_ns: 100,
      dl_nof_ok: 100,
      dl_nof_nok: 0,
      ul_nof_ok: 50,
      ul_nof_nok: 0,
    },
  ];

  it('partitions 24 PRBs evenly among 4 balanced UEs', () => {
    const slices = partitionUePrbs({
      activePrbs: 24,
      ueList: sampleUeList,
      direction: 'D',
      nRb: 133,
    });

    expect(slices.length).toBe(4);
    expect(slices[0].prbStart).toBe(0);
    expect(slices[0].prbCount).toBe(6);
    expect(slices[0].prbEnd).toBe(5);

    expect(slices[1].prbStart).toBe(6);
    expect(slices[1].prbCount).toBe(6);

    expect(slices[2].prbStart).toBe(12);
    expect(slices[2].prbCount).toBe(6);

    expect(slices[3].prbStart).toBe(18);
    expect(slices[3].prbCount).toBe(6);
    expect(slices[3].prbEnd).toBe(23);
  });

  it('finds the correct UE for a given PRB index', () => {
    const slices = partitionUePrbs({
      activePrbs: 24,
      ueList: sampleUeList,
      direction: 'D',
      nRb: 133,
    });

    expect(findUeForPrb(slices, 0)?.ueIndex).toBe(0);
    expect(findUeForPrb(slices, 5)?.ueIndex).toBe(0);
    expect(findUeForPrb(slices, 6)?.ueIndex).toBe(1);
    expect(findUeForPrb(slices, 12)?.ueIndex).toBe(2);
    expect(findUeForPrb(slices, 23)?.ueIndex).toBe(3);
    expect(findUeForPrb(slices, 24)).toBeUndefined(); // Idle PRB
  });

  it('offsets PUSCH start by 12 PRBs on a PRACH slot', () => {
    const slices = partitionUePrbs({
      activePrbs: 24,
      ueList: sampleUeList,
      direction: 'U',
      isPrachSlot: true,
      nRb: 133,
    });

    expect(slices[0].prbStart).toBe(12);
  });

  it('never over-allocates when activePrbs < numUes (low PRB count)', () => {
    const slices = partitionUePrbs({
      activePrbs: 2,
      ueList: sampleUeList, // 4 UEs
      direction: 'U',
      nRb: 133,
    });

    const totalAllocated = slices.reduce((sum, s) => sum + s.prbCount, 0);
    expect(totalAllocated).toBe(2);
    expect(slices.length).toBe(2);
  });

  it('proportionally partitions PRBs based on unequal throughput weights', () => {
    const unequalUes: LiveUeMetric[] = [
      { ...sampleUeList[0], dl_brate: 300_000_000 }, // 75% of traffic
      { ...sampleUeList[1], dl_brate: 100_000_000 }, // 25% of traffic
    ];

    const slices = partitionUePrbs({
      activePrbs: 100,
      ueList: unequalUes,
      direction: 'D',
      nRb: 133,
    });

    expect(slices.length).toBe(2);
    expect(slices[0].prbCount).toBe(75);
    expect(slices[1].prbCount).toBe(25);
    expect(slices[0].prbStart).toBe(0);
    expect(slices[0].prbEnd).toBe(74);
    expect(slices[1].prbStart).toBe(75);
    expect(slices[1].prbEnd).toBe(99);
  });

  it('returns empty array when ueList is empty or activePrbs is 0', () => {
    expect(partitionUePrbs({ activePrbs: 24, ueList: [], direction: 'D', nRb: 133 })).toEqual([]);
    expect(partitionUePrbs({ activePrbs: 0, ueList: sampleUeList, direction: 'D', nRb: 133 })).toEqual([]);
  });
});
