// Copyright (C) 2026 NeuroRAN. All rights reserved.

// PUCCH - 3GPP TS 38.211 sec 6.3.2 / sec 9. Common PUCCH resources use
// frequency hopping across the two BWP edges, so PUCCH is drawn on the lowest
// and highest RB across the UL symbols of the slot.

import { Owner } from '../types';
import type { PaintCtx } from './context';
import { SUBCARRIERS_PER_RB, SYMBOLS_PER_SLOT } from './numerology';

export function paintPucch(ctx: PaintCtx): void {
  if (!ctx.params.toggles.pucch) return;
  const { nRb, subcarriers } = ctx;
  const edgeRbs = [0, nRb - 1];
  for (let l = 0; l < SYMBOLS_PER_SLOT; l++) {
    if (ctx.symbolKind(l) !== 'U') continue;
    for (const rb of edgeRbs) {
      const kStart = rb * SUBCARRIERS_PER_RB;
      const kEnd = Math.min(subcarriers, kStart + SUBCARRIERS_PER_RB);
      for (let k = kStart; k < kEnd; k++) ctx.set(k, l, Owner.Pucch);
    }
  }
}
