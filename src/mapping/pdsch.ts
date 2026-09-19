// Copyright (C) 2026 NeuroRAN. All rights reserved.

// PDSCH data + DM-RS - 3GPP TS 38.211 sec 7.3.1.6 (PDSCH) and 7.4.1.1 (DM-RS).
// Front-loaded single-symbol DM-RS, configuration type 1 (even subcarriers of
// each RB), on l0 = dmrs-TypeA-Position.

import { Owner } from '../types';
import type { PaintCtx } from './context';

export function paintPdsch(ctx: PaintCtx): void {
  if (!ctx.params.toggles.pdsch) return;
  const { nRb, liveAlloc } = ctx;
  const activePrbs =
    liveAlloc?.pdschPrbs !== undefined
      ? Math.min(nRb, Math.max(0, liveAlloc.pdschPrbs))
      : nRb;
  const maxSubcarrier = activePrbs * 12;
  const dmrsSym = ctx.params.dmrsTypeAPos;

  for (let l = 0; l < 14; l++) {
    if (ctx.symbolKind(l) !== 'D') continue;
    const isDmrs = l === dmrsSym;
    for (let k = 0; k < maxSubcarrier; k++) {
      if (isDmrs && k % 2 === 0) ctx.set(k, l, Owner.PdschDmrs);
      else ctx.set(k, l, Owner.PdschData);
    }
  }
}
