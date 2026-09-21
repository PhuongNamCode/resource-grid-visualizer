// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { LiveUeGrant, LiveUeMetric, SlotDirection } from '../types';
import { getUeTheme, type UeTheme } from '../theme';

export interface UeFilterItem {
  ueIndex: number;
  rnti: number;
  theme: UeTheme;
  dlMbps: number;
  ulKbps: number;
}

/**
 * Builds the stable UE identity list used by the toolbar.
 *
 * This deliberately consumes the normalized UE list instead of grant slices:
 * one UE may have several slot-specific grants, but it must still have one
 * filter button. The first record wins for duplicate identities and the
 * result is sorted for deterministic React reconciliation.
 */
export function buildUeFilterItems(ueList: LiveUeMetric[]): UeFilterItem[] {
  const byUe = new Map<number, UeFilterItem>();

  for (const ue of ueList) {
    if (!Number.isFinite(ue.ue) || byUe.has(ue.ue)) continue;
    byUe.set(ue.ue, {
      ueIndex: ue.ue,
      rnti: Number.isFinite(ue.rnti) ? ue.rnti : 0,
      theme: getUeTheme(ue.ue),
      dlMbps: (ue.dl_brate || 0) / 1_000_000,
      ulKbps: (ue.ul_brate || 0) / 1_000,
    });
  }

  return [...byUe.values()].sort((a, b) => a.ueIndex - b.ueIndex);
}

export interface UeGrantFocusTarget {
  slotIdx: number;
  isDl: boolean;
  prbStart: number;
  prbEnd: number;
  symbolStart: number;
  nofSymbols: number;
}

export interface UeGrantFocusOptions {
  grants?: LiveUeGrant[];
  currentSlot: number;
  currentDirection: SlotDirection;
  nRb: number;
}

/**
 * Finds a deterministic viewport target for a UE filter click.
 *
 * Grants are reported for individual slots, so the selected UE may not have
 * a slice in the currently viewed slot. This helper chooses a valid live
 * grant without changing the grant-to-grid mapping.
 */
export function findUeGrantFocusTarget(opts: UeGrantFocusOptions): UeGrantFocusTarget | undefined {
  const { grants, currentSlot, currentDirection, nRb } = opts;
  if (!Array.isArray(grants) || grants.length === 0 || !Number.isFinite(nRb) || nRb <= 0) {
    return undefined;
  }

  const wantDl = currentDirection === 'D' || currentDirection === 'S';
  const valid = grants
    .filter(
      (grant) =>
        Number.isInteger(grant.slot_idx) &&
        grant.slot_idx >= 0 &&
        Number.isInteger(grant.rb_start) &&
        grant.rb_start >= 0 &&
        Number.isInteger(grant.nof_rbs) &&
        grant.nof_rbs > 0 &&
        Number.isInteger(grant.symbol_start) &&
        grant.symbol_start >= 0 &&
        Number.isInteger(grant.nof_symbols) &&
        grant.nof_symbols > 0 &&
        grant.rb_start < nRb,
    )
    .map((grant) => ({
      grant,
      prbStart: Math.min(grant.rb_start, nRb - 1),
      prbEnd: Math.min(grant.rb_start + grant.nof_rbs - 1, nRb - 1),
    }))
    .filter(({ prbEnd }) => prbEnd >= 0);

  valid.sort((a, b) => {
    const directionRank = Number(b.grant.is_dl === wantDl) - Number(a.grant.is_dl === wantDl);
    if (directionRank !== 0) return directionRank;
    const slotDistance = Math.abs(a.grant.slot_idx - currentSlot) - Math.abs(b.grant.slot_idx - currentSlot);
    if (slotDistance !== 0) return slotDistance;
    return (
      a.grant.slot_idx - b.grant.slot_idx ||
      a.prbStart - b.prbStart ||
      a.grant.symbol_start - b.grant.symbol_start
    );
  });

  const selected = valid[0];
  if (!selected) return undefined;
  return {
    slotIdx: selected.grant.slot_idx,
    isDl: selected.grant.is_dl,
    prbStart: selected.prbStart,
    prbEnd: selected.prbEnd,
    symbolStart: selected.grant.symbol_start,
    nofSymbols: selected.grant.nof_symbols,
  };
}

export interface UePrbSlice {
  ueIndex: number;
  rnti: number;
  prbStart: number;
  prbEnd: number; // inclusive
  prbCount: number;
  theme: UeTheme;
  dlMbps: number;
  ulKbps: number;
  /**
   * Provenance of this slice:
   *  - 'estimate' : bitrate-weighted partition of aggregate active PRBs (Phase 1).
   *  - 'grant'    : exact per-UE scheduler grant geometry from OCUDU (Phase 2).
   */
  source: 'estimate' | 'grant';
  /** OFDM symbol span, only known for real grants. */
  symbolStart?: number;
  nofSymbols?: number;
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
  const isDl = direction === 'D' || direction === 'S';
  const weights = ueList.map((ue) => (isDl ? ue.dl_brate || 0 : ue.ul_brate || 0));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const counts: number[] = new Array(numUes).fill(0);

  if (totalWeight <= 0) {
    // Distribute evenly among all UEs
    const baseCount = Math.floor(availablePrbs / numUes);
    let remainder = availablePrbs % numUes;
    for (let i = 0; i < numUes; i++) {
      counts[i] = baseCount + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    }
  } else {
    // Largest Remainder Method (Hamilton method) guarantees sum(counts) === availablePrbs exactly
    const quotas = weights.map((w) => (w / totalWeight) * availablePrbs);
    let totalFloored = 0;
    const remainders = quotas.map((q, i) => {
      const f = Math.floor(q);
      counts[i] = f;
      totalFloored += f;
      return { index: i, rem: q - f };
    });

    let leftover = availablePrbs - totalFloored;
    remainders.sort((a, b) => b.rem - a.rem);
    for (let i = 0; i < leftover && i < remainders.length; i++) {
      counts[remainders[i].index]++;
    }
  }

  const slices: UePrbSlice[] = [];
  let currentPrb = baseStartPrb;

  for (let i = 0; i < numUes; i++) {
    const count = counts[i];
    if (count > 0 && currentPrb < nRb) {
      const actualCount = Math.min(count, nRb - currentPrb);
      const ue = ueList[i];
      const ueIdx = typeof ue?.ue === 'number' && !isNaN(ue.ue) ? ue.ue : i;
      const rnti = typeof ue?.rnti === 'number' && !isNaN(ue.rnti) ? ue.rnti : 0;
      slices.push({
        ueIndex: ueIdx,
        rnti,
        prbStart: currentPrb,
        prbEnd: currentPrb + actualCount - 1,
        prbCount: actualCount,
        theme: getUeTheme(ueIdx),
        dlMbps: (ue?.dl_brate || 0) / 1_000_000,
        ulKbps: (ue?.ul_brate || 0) / 1_000,
        source: 'estimate',
      });
      currentPrb += actualCount;
    }
  }

  return slices;
}

export interface GrantSliceOptions {
  ueList: LiveUeMetric[];
  direction: SlotDirection;
  /** Slot index within the TDD period the grid is currently viewing. */
  slotIdx: number;
  nRb: number;
}

/**
 * Builds per-UE spectrum slices from EXACT OCUDU scheduler grants (Phase 2),
 * for the currently viewed slot and direction. Unlike partitionUePrbs (which
 * estimates a bitrate-weighted split of the aggregate active PRBs), every slice
 * here reflects the real RB range the scheduler assigned to that UE.
 */
export function slicesFromGrants(opts: GrantSliceOptions): UePrbSlice[] {
  const { ueList, direction, slotIdx, nRb } = opts;
  if (!ueList || ueList.length === 0) return [];
  const wantDl = direction === 'D' || direction === 'S';

  const slices: UePrbSlice[] = [];
  for (const ue of ueList) {
    if (!ue.grants || ue.grants.length === 0) continue;
    for (const g of ue.grants) {
      if (g.slot_idx !== slotIdx) continue;
      if (g.is_dl !== wantDl) continue;
      if (g.nof_rbs <= 0) continue;
      const prbStart = Math.max(0, Math.min(g.rb_start, nRb - 1));
      const prbEnd = Math.max(prbStart, Math.min(g.rb_start + g.nof_rbs - 1, nRb - 1));
      const ueIdx = typeof ue.ue === 'number' && !isNaN(ue.ue) ? ue.ue : 0;
      slices.push({
        ueIndex: ueIdx,
        rnti: typeof ue.rnti === 'number' && !isNaN(ue.rnti) ? ue.rnti : g.rnti,
        prbStart,
        prbEnd,
        prbCount: prbEnd - prbStart + 1,
        theme: getUeTheme(ueIdx),
        dlMbps: (ue.dl_brate || 0) / 1_000_000,
        ulKbps: (ue.ul_brate || 0) / 1_000,
        source: 'grant',
        symbolStart: g.symbol_start,
        nofSymbols: g.nof_symbols,
      });
    }
  }
  // Draw larger grants first so a smaller overlapping grant (rare) stays visible on top.
  slices.sort((a, b) => a.prbStart - b.prbStart);
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
