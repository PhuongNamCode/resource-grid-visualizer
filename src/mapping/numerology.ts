// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Numerology helpers - 3GPP TS 38.211 sec 4.2 & 4.3.2.
//
// Normal cyclic prefix: 14 OFDM symbols per slot for every numerology.
// slots-per-frame = 10 * 2^mu ; slots-per-subframe = 2^mu.

export const SYMBOLS_PER_SLOT = 14;
export const SUBCARRIERS_PER_RB = 12;

/** SCS (kHz) -> numerology mu. TS 38.211 Table 4.2-1. */
export function scsToMu(scsKhz: number): number {
  switch (scsKhz) {
    case 15:
      return 0;
    case 30:
      return 1;
    case 60:
      return 2;
    case 120:
      return 3;
    case 240:
      return 4;
    default:
      throw new Error(`Unsupported SCS ${scsKhz} kHz`);
  }
}

export function slotsPerSubframe(scsKhz: number): number {
  return 2 ** scsToMu(scsKhz);
}

export function slotsPerFrame(scsKhz: number): number {
  return 10 * slotsPerSubframe(scsKhz);
}
