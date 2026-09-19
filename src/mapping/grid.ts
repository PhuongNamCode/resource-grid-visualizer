// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Grid orchestrator: composes all channel modules into a per-slot RE ownership
// matrix. Painting order + priority ensure reference signals sit on top of data,
// and SSB-vs-PDSCH overlap becomes a Collision when rate-matching is disabled
// (mirrors the WirelessBrew collision visualization).

import { Owner } from '../types';
import type { Accounting, GridParams, LiveSlotAlloc, SlotGrid } from '../types';
import type { PaintCtx } from './context';
import { SUBCARRIERS_PER_RB, SYMBOLS_PER_SLOT } from './numerology';
import { slotLayout, symbolKind as symbolKindOf, expandTddPeriod } from './tdd';
import { paintPdsch } from './pdsch';
import { paintPusch } from './pusch';
import { paintPdcch } from './pdcch';
import { paintPucch } from './pucch';
import { paintPrach } from './prach';
import { paintCsiRs } from './csirs';
import { paintSsb } from './ssb';

// Higher rank wins when two channels target the same RE.
const RANK: Record<Owner, number> = {
  [Owner.Empty]: 0,
  [Owner.Guard]: 1,
  [Owner.PdschData]: 2,
  [Owner.PuschData]: 2,
  [Owner.PdschDmrs]: 3,
  [Owner.PuschDmrs]: 3,
  [Owner.Pucch]: 4,
  [Owner.Pdcch]: 5,
  [Owner.Prach]: 5,
  [Owner.CsiRs]: 6,
  [Owner.SsbPss]: 7,
  [Owner.SsbSss]: 7,
  [Owner.SsbPbch]: 7,
  [Owner.Collision]: 9,
};

const SSB_OWNERS = new Set<Owner>([Owner.SsbPss, Owner.SsbSss, Owner.SsbPbch]);
const PDSCH_OWNERS = new Set<Owner>([Owner.PdschData, Owner.PdschDmrs]);

/** Which slots in the TDD period carry a representative PRACH occasion. */
export function prachSlotIndex(params: GridParams): number {
  if (params.duplex === 'TDD' && params.tdd) {
    const layouts = expandTddPeriod(params.tdd);
    // Last slot that has any UL symbols.
    for (let i = layouts.length - 1; i >= 0; i--) {
      if (layouts[i].direction === 'U' || layouts[i].ulSymbols > 0) return layouts[i].index;
    }
  }
  return -1;
}

export function computeSlotGrid(
  params: GridParams,
  slotIndex: number,
  liveAlloc?: LiveSlotAlloc,
): SlotGrid {
  const nRb = params.nRb;
  const subcarriers = nRb * SUBCARRIERS_PER_RB;
  const owners = new Uint8Array(subcarriers * SYMBOLS_PER_SLOT); // Owner.Empty === 0
  const layout = slotLayout(params.duplex, params.tdd, slotIndex);

  // Base guard marking for the special-slot flexible symbols.
  for (let l = 0; l < SYMBOLS_PER_SLOT; l++) {
    if (symbolKindOf(layout, l) === 'G') {
      for (let k = 0; k < subcarriers; k++) owners[l * subcarriers + k] = Owner.Guard;
    }
  }

  const set = (k: number, l: number, owner: Owner): void => {
    if (k < 0 || k >= subcarriers || l < 0 || l >= SYMBOLS_PER_SLOT) return;
    const idx = l * subcarriers + k;
    const cur = owners[idx] as Owner;
    if (SSB_OWNERS.has(owner) && PDSCH_OWNERS.has(cur) && !params.toggles.ssbRateMatch) {
      owners[idx] = Owner.Collision;
      return;
    }
    if (RANK[owner] >= RANK[cur]) owners[idx] = owner;
  };

  const ctx: PaintCtx = {
    nRb,
    subcarriers,
    params,
    layout,
    showPrachHere: slotIndex === prachSlotIndex(params),
    showSsbHere: params.ssbSlots.includes(slotIndex),
    set,
    symbolKind: (l: number) => symbolKindOf(layout, l),
    liveAlloc,
  };

  // Painting order: data first, reference signals & control on top, SSB last.
  paintPdsch(ctx);
  paintPusch(ctx);
  paintPucch(ctx);
  paintPdcch(ctx);
  paintPrach(ctx);
  paintCsiRs(ctx);
  paintSsb(ctx);

  return {
    slotIndex,
    direction: layout.direction,
    nRb,
    owners,
    symbolsPerSlot: SYMBOLS_PER_SLOT,
    subcarriers,
    accounting: tally(owners),
  };
}

function tally(owners: Uint8Array): Accounting {
  const acc: Accounting = {
    pdschData: 0,
    puschData: 0,
    dmrs: 0,
    control: 0,
    ssb: 0,
    csiRs: 0,
    prach: 0,
    collision: 0,
  };
  for (let i = 0; i < owners.length; i++) {
    switch (owners[i] as Owner) {
      case Owner.PdschData:
        acc.pdschData++;
        break;
      case Owner.PuschData:
        acc.puschData++;
        break;
      case Owner.PdschDmrs:
      case Owner.PuschDmrs:
        acc.dmrs++;
        break;
      case Owner.Pdcch:
      case Owner.Pucch:
        acc.control++;
        break;
      case Owner.SsbPss:
      case Owner.SsbSss:
      case Owner.SsbPbch:
        acc.ssb++;
        break;
      case Owner.CsiRs:
        acc.csiRs++;
        break;
      case Owner.Prach:
        acc.prach++;
        break;
      case Owner.Collision:
        acc.collision++;
        break;
      default:
        break;
    }
  }
  return acc;
}

export function ownerAt(grid: SlotGrid, k: number, l: number): Owner {
  return grid.owners[l * grid.subcarriers + k] as Owner;
}
