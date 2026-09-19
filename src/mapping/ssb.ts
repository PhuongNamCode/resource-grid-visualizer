// Copyright (C) 2026 NeuroRAN. All rights reserved.

// SS/PBCH block resource mapping - 3GPP TS 38.211 sec 7.4.3.1.
//
// One SSB spans 20 RBs (240 subcarriers) x 4 consecutive OFDM symbols:
//   symbol 0 : PSS (127 SCs, centered)
//   symbol 1 : PBCH + DM-RS (full 240 SCs)
//   symbol 2 : SSS (127 SCs, centered) + PBCH on the side subcarriers
//   symbol 3 : PBCH + DM-RS (full 240 SCs)
// The absolute frequency (offsetToPointA / k_SSB) and burst slots are gNB
// derived; here they are defaults and remain user-editable.

import { Owner } from '../types';
import type { PaintCtx } from './context';
import { SUBCARRIERS_PER_RB } from './numerology';

export const SSB_RB = 20;
export const SSB_SUBCARRIERS = SSB_RB * SUBCARRIERS_PER_RB; // 240
export const SSB_SYMBOLS = 4;
/** PSS/SSS occupy 127 subcarriers, centered in the 240-SC SSB block. */
export const SSB_SYNC_SC = 127;

export interface SsbRe {
  /** Subcarrier index within the SSB block (0..239). */
  scInBlock: number;
  /** Symbol within the SSB block (0..3). */
  symInBlock: number;
  owner: Owner;
}

/** Default centered SSB RB offset within the carrier (kept even-aligned). */
export function defaultSsbRbOffset(nRb: number): number {
  const off = Math.floor((nRb - SSB_RB) / 2);
  return Math.max(0, off - (off % 2));
}

/**
 * Enumerate SSB REs (block-local coordinates). PBCH DM-RS is interleaved into
 * PBCH symbols every 4th subcarrier (TS 38.211 sec 7.4.3.1.3); for the
 * structural view we render the whole PBCH symbol as PBCH.
 */
export function ssbBlockRes(): SsbRe[] {
  const res: SsbRe[] = [];
  const syncLow = Math.floor((SSB_SUBCARRIERS - SSB_SYNC_SC) / 2); // 56
  const syncHigh = syncLow + SSB_SYNC_SC; // 183
  for (let sc = 0; sc < SSB_SUBCARRIERS; sc++) {
    // symbol 0: PSS (center 127), rest empty
    if (sc >= syncLow && sc < syncHigh) res.push({ scInBlock: sc, symInBlock: 0, owner: Owner.SsbPss });
    // symbol 1: PBCH (full)
    res.push({ scInBlock: sc, symInBlock: 1, owner: Owner.SsbPbch });
    // symbol 2: SSS in center 127, PBCH on the guarded side bands
    if (sc >= syncLow && sc < syncHigh) res.push({ scInBlock: sc, symInBlock: 2, owner: Owner.SsbSss });
    else res.push({ scInBlock: sc, symInBlock: 2, owner: Owner.SsbPbch });
    // symbol 3: PBCH (full)
    res.push({ scInBlock: sc, symInBlock: 3, owner: Owner.SsbPbch });
  }
  return res;
}

/** Paint the SSB burst into the slot at the configured RB/symbol offset. */
export function paintSsb(ctx: PaintCtx): void {
  if (!ctx.params.toggles.ssb) return;
  if (!ctx.showSsbHere) return;
  const kBase = ctx.params.ssbRbOffset * SUBCARRIERS_PER_RB;
  const lBase = ctx.params.ssbStartSymbol;
  for (const re of ssbBlockRes()) {
    const k = kBase + re.scInBlock;
    const l = lBase + re.symInBlock;
    if (k < ctx.subcarriers && l < 14) ctx.set(k, l, re.owner);
  }
}
