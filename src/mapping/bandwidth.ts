// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Transmission bandwidth configuration N_RB - 3GPP TS 38.101-1 Table 5.3.2-1
// (FR1) and TS 38.101-2 Table 5.3.2-1 (FR2). Mirrors the loader table so the
// runtime can re-derive/validate N_RB from (bandwidth, SCS).

export const NRB_FR1: Record<number, Record<number, number>> = {
  15: { 5: 25, 10: 52, 15: 79, 20: 106, 25: 133, 30: 160, 40: 216, 50: 270 },
  30: { 5: 11, 10: 24, 15: 38, 20: 51, 25: 65, 30: 78, 40: 106, 50: 133, 60: 162, 70: 189, 80: 217, 90: 245, 100: 273 },
  60: { 10: 11, 15: 18, 20: 24, 25: 31, 30: 38, 40: 51, 50: 65, 60: 79, 70: 93, 80: 107, 90: 121, 100: 135 },
};

export const NRB_FR2: Record<number, Record<number, number>> = {
  60: { 50: 66, 100: 132, 200: 264 },
  120: { 50: 32, 100: 66, 200: 132, 400: 264 },
};

export function nRbFromBandwidth(bwMhz: number, scsKhz: number, isFr2 = false): number | null {
  const table = isFr2 ? NRB_FR2 : NRB_FR1;
  return table?.[scsKhz]?.[bwMhz] ?? null;
}
