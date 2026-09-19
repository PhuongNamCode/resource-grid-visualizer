// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Shared painting context passed to each channel module. Channel modules never
// import the grid buffer directly - they only call ctx.set(), which centralizes
// priority and SSB collision handling.

import type { GridParams, LiveSlotAlloc, Owner } from '../types';
import type { SlotLayout, SymbolKind } from './tdd';

export interface PaintCtx {
  nRb: number;
  subcarriers: number;
  params: GridParams;
  layout: SlotLayout;
  /** True when this slot is a representative PRACH occasion. */
  showPrachHere: boolean;
  /** True when this slot carries an SSB burst. */
  showSsbHere: boolean;
  set: (k: number, l: number, owner: Owner) => void;
  symbolKind: (l: number) => SymbolKind;
  /** Optional live slot PRB allocation from OCUDU gNodeB telemetry. */
  liveAlloc?: LiveSlotAlloc;
}
