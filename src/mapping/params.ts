// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Seed GridParams from a CellProfile. Everything here is a documented default
// or a direct copy of a config value; the UI may edit any field for
// exploration without mutating the source profile.

import type { CellProfile, GridParams } from '../types';
import { coreset0Entry } from './coreset0';
import { defaultSsbRbOffset } from './ssb';

export function defaultParamsForProfile(profile: CellProfile): GridParams {
  const nRb = profile.nRb;
  const ssbRbOffset = defaultSsbRbOffset(nRb);
  const coreset0Index = 0;
  const cs0 = coreset0Entry(coreset0Index);
  const coreset0RbOffset = Math.max(0, Math.min(ssbRbOffset - cs0.offsetRb, Math.max(0, nRb - cs0.nRb)));

  return {
    scsKhz: profile.scsKhz,
    nRb,
    duplex: profile.duplex,
    tdd: profile.tdd,
    ssbRbOffset,
    ssbStartSymbol: 2,
    ssbSlots: [0],
    coreset0Index,
    coreset0Rb: Math.min(cs0.nRb, nRb),
    coreset0Symbols: cs0.symbols,
    coreset0RbOffset,
    dmrsTypeAPos: 2,
    prachConfigIndex: profile.prachConfigIndex,
    toggles: {
      pdsch: true,
      pusch: true,
      pucch: true,
      pdcch: true,
      ssb: true,
      csirs: false,
      prach: true,
      ssbRateMatch: true,
    },
  };
}
