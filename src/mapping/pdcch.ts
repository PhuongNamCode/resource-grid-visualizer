// Copyright (C) 2026 NeuroRAN. All rights reserved.

// PDCCH / CORESET#0 - 3GPP TS 38.211 sec 7.3.2, TS 38.213 sec 13.
// The Type0-PDCCH CSS set occupies the CORESET#0 RB range for the first
// coreset0Symbols OFDM symbols of a DL slot.

import { Owner } from '../types';
import type { PaintCtx } from './context';
import { SUBCARRIERS_PER_RB } from './numerology';

export function paintPdcch(ctx: PaintCtx): void {
  if (!ctx.params.toggles.pdcch) return;
  const { coreset0Rb, coreset0Symbols, coreset0RbOffset } = ctx.params;
  const kStart = coreset0RbOffset * SUBCARRIERS_PER_RB;
  const kEnd = Math.min(ctx.subcarriers, kStart + coreset0Rb * SUBCARRIERS_PER_RB);
  for (let l = 0; l < coreset0Symbols; l++) {
    if (ctx.symbolKind(l) !== 'D') continue;
    for (let k = kStart; k < kEnd; k++) ctx.set(k, l, Owner.Pdcch);
  }
}
