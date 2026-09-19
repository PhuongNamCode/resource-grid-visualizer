// Copyright (C) 2026 NeuroRAN. All rights reserved.

// TDD UL/DL configuration expansion - 3GPP TS 38.213 sec 11.1.
//
// A single-pattern TDD config is: <nofDlSlots> full-DL slots, one optional
// "special" slot (nofDlSymbols DL at the start, nofUlSymbols UL at the end,
// remainder = guard/flexible), then <nofUlSlots> full-UL slots, repeating every
// dl_ul_tx_period slots.

import type { Duplex, SlotDirection, TddPattern } from '../types';
import { SYMBOLS_PER_SLOT } from './numerology';

export interface SlotLayout {
  index: number;
  direction: SlotDirection;
  /** Number of DL symbols counted from symbol 0. */
  dlSymbols: number;
  /** Number of UL symbols counted from the last symbol. */
  ulSymbols: number;
}

export type SymbolKind = 'D' | 'U' | 'G';

/** Expand one TDD period into per-slot layouts. */
export function expandTddPeriod(tdd: TddPattern): SlotLayout[] {
  const { periodSlots, nofDlSlots, nofDlSymbols, nofUlSlots, nofUlSymbols } = tdd;
  const hasSpecial = nofDlSymbols > 0 || nofUlSymbols > 0;
  const layouts: SlotLayout[] = [];
  for (let i = 0; i < periodSlots; i++) {
    if (i < nofDlSlots) {
      layouts.push({ index: i, direction: 'D', dlSymbols: SYMBOLS_PER_SLOT, ulSymbols: 0 });
    } else if (i >= periodSlots - nofUlSlots) {
      layouts.push({ index: i, direction: 'U', dlSymbols: 0, ulSymbols: SYMBOLS_PER_SLOT });
    } else if (i === nofDlSlots && hasSpecial) {
      layouts.push({ index: i, direction: 'S', dlSymbols: nofDlSymbols, ulSymbols: nofUlSymbols });
    } else {
      // Extra flexible slots (rare) - treat as guard/flexible.
      layouts.push({ index: i, direction: 'S', dlSymbols: 0, ulSymbols: 0 });
    }
  }
  return layouts;
}

/** Number of slots shown in the frame navigator. */
export function periodLength(duplex: Duplex, tdd: TddPattern | null): number {
  if (duplex === 'TDD' && tdd) return tdd.periodSlots;
  return 10; // FDD: show a representative 10-slot window (all DL).
}

export function slotLayout(duplex: Duplex, tdd: TddPattern | null, slotIndex: number): SlotLayout {
  if (duplex === 'TDD' && tdd) {
    const layouts = expandTddPeriod(tdd);
    return layouts[slotIndex % layouts.length];
  }
  // FDD downlink carrier view: every slot is fully DL.
  return { index: slotIndex, direction: 'D', dlSymbols: SYMBOLS_PER_SLOT, ulSymbols: 0 };
}

/** Classify one OFDM symbol within a slot as DL / UL / guard. */
export function symbolKind(layout: SlotLayout, l: number): SymbolKind {
  if (layout.direction === 'D') return 'D';
  if (layout.direction === 'U') return 'U';
  // Special slot.
  if (l < layout.dlSymbols) return 'D';
  if (l >= SYMBOLS_PER_SLOT - layout.ulSymbols) return 'U';
  return 'G';
}
