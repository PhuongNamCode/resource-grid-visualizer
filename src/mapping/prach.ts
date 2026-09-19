// Copyright (C) 2026 NeuroRAN. All rights reserved.

// PRACH - 3GPP TS 38.211 sec 6.3.3, PRACH configuration index selects the
// occasion (Table 6.3.3.2-2/3). This structural view marks a representative
// PRACH occasion within an UL slot; the frequency location uses
// msg1-FrequencyStart = 0 by default.

import { Owner } from '../types';
import type { PaintCtx } from './context';
import { SUBCARRIERS_PER_RB, SYMBOLS_PER_SLOT } from './numerology';

/** Approx RB footprint of a short-format PRACH occasion for the view. */
const PRACH_RB = 12;

export function paintPrach(ctx: PaintCtx): void {
  if (!ctx.params.toggles.prach) return;
  if (ctx.params.prachConfigIndex == null) return;
  if (!ctx.showPrachHere) return;
  const rbCount = Math.min(PRACH_RB, ctx.nRb);
  const kStart = 0;
  const kEnd = rbCount * SUBCARRIERS_PER_RB;
  // Draw across the UL symbols of the slot.
  for (let l = 0; l < SYMBOLS_PER_SLOT; l++) {
    if (ctx.symbolKind(l) !== 'U') continue;
    for (let k = kStart; k < kEnd; k++) ctx.set(k, l, Owner.Prach);
  }
}
