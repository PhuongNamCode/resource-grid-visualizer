// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { LiveUeMetric, SlotDirection } from '../types';
import { getUeTheme, type UeTheme } from '../theme';

export interface UePrbSlice {
  ueIndex: number;
  rnti: number;
  prbStart: number;
  prbEnd: number; // inclusive
  prbCount: number;
  theme: UeTheme;
  dlMbps: number;
  ulKbps: number;
}

export interface PartitionUePrbOptions {
  activePrbs: number;
  ueList: LiveUeMetric[];
  direction: SlotDirection;
  isPrachSlot?: boolean;
  nRb: number;
}

/**
 * Partitions the active scheduled PRBs among connected UEs for a given slot.
 * Allocates contiguous spectrum slices per UE, weighted by traffic load or partitioned evenly.
 */
export function partitionUePrbs(opts: PartitionUePrbOptions): UePrbSlice[] {
  const { activePrbs, ueList, direction, isPrachSlot = false, nRb } = opts;

  if (!ueList || ueList.length === 0 || activePrbs <= 0) {
    return [];
  }

  // PRACH occupies PRBs 0..11 on UL occasion slots, so PUSCH begins at PRB 12
  const baseStartPrb = isPrachSlot ? Math.min(12, nRb) : 0;
  const availablePrbs = Math.max(0, Math.min(activePrbs, nRb - baseStartPrb));

  if (availablePrbs <= 0) {
    return [];
  }

  const numUes = ueList.length;

  // Determine weighting metric based on link direction
  const isDl = direction === 'D' || direction === 'S';
  const weights = ueList.map((ue) => (isDl ? ue.dl_brate || 0 : ue.ul_brate || 0));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const slices: UePrbSlice[] = [];
  let currentPrb = baseStartPrb;

  if (totalWeight <= 0) {
    // Distribute evenly among all UEs
    const baseCount = Math.floor(availablePrbs / numUes);
    let remainder = availablePrbs % numUes;

    for (let i = 0; i < numUes; i++) {
      const count = baseCount + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;

      if (count > 0 && currentPrb < nRb) {
        const actualCount = Math.min(count, nRb - currentPrb);
        const ue = ueList[i];
        slices.push({
          ueIndex: ue.ue,
          rnti: ue.rnti,
          prbStart: currentPrb,
          prbEnd: currentPrb + actualCount - 1,
          prbCount: actualCount,
          theme: getUeTheme(ue.ue),
          dlMbps: (ue.dl_brate || 0) / 1_000_000,
          ulKbps: (ue.ul_brate || 0) / 1_000,
        });
        currentPrb += actualCount;
      }
    }
  } else {
    // Distribute proportionally to traffic load, ensuring minimum 1 PRB per UE if space allows
    const rawShares = weights.map((w) => (w / totalWeight) * availablePrbs);
    let allocatedSum = 0;
    const counts = rawShares.map((share) => {
      const c = Math.max(1, Math.round(share));
      allocatedSum += c;
      return c;
    });

    // Adjust any rounding discrepancies to match exact availablePrbs
    let diff = availablePrbs - allocatedSum;
    let idx = 0;
    while (diff !== 0 && counts.length > 0) {
      if (diff > 0) {
        counts[idx % counts.length]++;
        diff--;
      } else if (counts[idx % counts.length] > 1) {
        counts[idx % counts.length]--;
        diff++;
      }
      idx++;
      if (idx > counts.length * 2) break; // safety break
    }

    for (let i = 0; i < numUes; i++) {
      const count = counts[i];
      if (count > 0 && currentPrb < nRb) {
        const actualCount = Math.min(count, nRb - currentPrb);
        const ue = ueList[i];
        slices.push({
          ueIndex: ue.ue,
          rnti: ue.rnti,
          prbStart: currentPrb,
          prbEnd: currentPrb + actualCount - 1,
          prbCount: actualCount,
          theme: getUeTheme(ue.ue),
          dlMbps: (ue.dl_brate || 0) / 1_000_000,
          ulKbps: (ue.ul_brate || 0) / 1_000,
        });
        currentPrb += actualCount;
      }
    }
  }

  return slices;
}

/**
 * Fast lookup to find the UE slice that owns a given PRB index.
 */
export function findUeForPrb(slices: UePrbSlice[], prb: number): UePrbSlice | undefined {
  for (let i = 0; i < slices.length; i++) {
    if (prb >= slices[i].prbStart && prb <= slices[i].prbEnd) {
      return slices[i];
    }
  }
  return undefined;
}
