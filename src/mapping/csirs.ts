// Copyright (C) 2026 NeuroRAN. All rights reserved.

// CSI-RS - 3GPP TS 38.211 sec 7.4.1.5. Illustrative single-port CSI-RS: one RE
// per RB on a mid-slot DL symbol (off by default; enable via the toggle).

import { Owner } from '../types';
import type { PaintCtx } from './context';
import { SUBCARRIERS_PER_RB } from './numerology';

const CSIRS_SYMBOL = 5;
const CSIRS_SC_IN_RB = 3;

export function paintCsiRs(ctx: PaintCtx): void {
  if (!ctx.params.toggles.csirs) return;
  const l = CSIRS_SYMBOL;
  if (ctx.symbolKind(l) !== 'D') return;
  for (let rb = 0; rb < ctx.nRb; rb++) {
    const k = rb * SUBCARRIERS_PER_RB + CSIRS_SC_IN_RB;
    if (k < ctx.subcarriers) ctx.set(k, l, Owner.CsiRs);
  }
}
