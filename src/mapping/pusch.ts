// Copyright (C) 2026 NeuroRAN. All rights reserved.

// PUSCH data + DM-RS - 3GPP TS 38.211 sec 6.4.1.2 (PUSCH) and 6.4.1.1 (DM-RS).
// DM-RS is front-loaded on the first UL symbol of the slot, configuration
// type 1 (even subcarriers of each RB).

import { Owner } from '../types';
import { SYMBOLS_PER_SLOT } from './numerology';
import type { PaintCtx } from './context';

function firstUlSymbol(ctx: PaintCtx): number {
  for (let l = 0; l < SYMBOLS_PER_SLOT; l++) {
    if (ctx.symbolKind(l) === 'U') return l;
  }
  return -1;
}

export function paintPusch(ctx: PaintCtx): void {
  if (!ctx.params.toggles.pusch) return;
  const { nRb, liveAlloc, showPrachHere } = ctx;
  const activePrbs =
    liveAlloc?.puschPrbs !== undefined
      ? Math.min(nRb, Math.max(0, liveAlloc.puschPrbs))
      : nRb;
  if (activePrbs <= 0) return;

  const startRb = showPrachHere
    ? Math.min(12, Math.max(0, nRb - activePrbs))
    : (activePrbs < nRb ? 1 : 0);
  const kStart = startRb * 12;
  const kEnd = Math.min(nRb * 12, (startRb + activePrbs) * 12);
  const dmrsSym = firstUlSymbol(ctx);

  for (let l = 0; l < SYMBOLS_PER_SLOT; l++) {
    if (ctx.symbolKind(l) !== 'U') continue;
    const isDmrs = l === dmrsSym;
    for (let k = kStart; k < kEnd; k++) {
      if (isDmrs && k % 2 === 0) ctx.set(k, l, Owner.PuschDmrs);
      else ctx.set(k, l, Owner.PuschData);
    }
  }
}
