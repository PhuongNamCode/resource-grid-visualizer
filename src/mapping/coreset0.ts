// Copyright (C) 2026 NeuroRAN. All rights reserved.

// CORESET#0 geometry - 3GPP TS 38.213 sec 13, Table 13-4
// ({SSB, PDCCH} SCS = {30, 30} kHz, multiplexing pattern 1). Values are the
// well-known Rel-15+ entries; the index is editable in the UI, and the
// frequency offset is combined with the SSB position to place the CORESET.

export interface Coreset0Entry {
  /** Number of RBs in the CORESET. */
  nRb: number;
  /** CORESET duration in OFDM symbols. */
  symbols: number;
  /** Offset (RBs) between CORESET and SSB (Table 13-4 "Offset (RBs)"). */
  offsetRb: number;
}

// Table 13-4 for {SSB,PDCCH} SCS {30,30} kHz.
export const CORESET0_TABLE_30_30: Coreset0Entry[] = [
  { nRb: 24, symbols: 2, offsetRb: 0 },
  { nRb: 24, symbols: 2, offsetRb: 1 },
  { nRb: 24, symbols: 2, offsetRb: 2 },
  { nRb: 24, symbols: 2, offsetRb: 3 },
  { nRb: 24, symbols: 2, offsetRb: 4 },
  { nRb: 48, symbols: 1, offsetRb: 12 },
  { nRb: 48, symbols: 1, offsetRb: 14 },
  { nRb: 48, symbols: 1, offsetRb: 16 },
  { nRb: 24, symbols: 3, offsetRb: 0 },
  { nRb: 24, symbols: 3, offsetRb: 1 },
  { nRb: 24, symbols: 3, offsetRb: 2 },
  { nRb: 24, symbols: 3, offsetRb: 3 },
  { nRb: 24, symbols: 3, offsetRb: 4 },
  { nRb: 48, symbols: 2, offsetRb: 12 },
  { nRb: 48, symbols: 2, offsetRb: 14 },
  { nRb: 48, symbols: 2, offsetRb: 16 },
];

export function coreset0Entry(index: number): Coreset0Entry {
  return CORESET0_TABLE_30_30[Math.max(0, Math.min(index, CORESET0_TABLE_30_30.length - 1))];
}
