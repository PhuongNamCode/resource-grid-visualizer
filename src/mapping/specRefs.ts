// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Central 3GPP citation table. Every channel mapping references one of these so
// the UI can show "why" an RE is owned by a given channel, and so the mapping
// stays auditable against the standard (same discipline as the PM kpi_mapper).

import { Owner } from '../types';

export interface SpecRef {
  spec: string;
  clause: string;
  title: string;
}

export const SPEC_REFS = {
  numerology: { spec: 'TS 38.211', clause: 'sec 4.2 / 4.3.2', title: 'Numerologies; slots and OFDM symbols' },
  bandwidth: { spec: 'TS 38.101-1', clause: 'Table 5.3.2-1', title: 'Transmission bandwidth configuration N_RB' },
  tdd: { spec: 'TS 38.213', clause: 'sec 11.1', title: 'TDD UL/DL configuration (period, DL/UL slots & symbols)' },
  ssb: { spec: 'TS 38.211', clause: 'sec 7.4.3', title: 'SS/PBCH block (PSS, SSS, PBCH + DM-RS)' },
  ssbRaster: { spec: 'TS 38.104', clause: 'sec 5.4.3', title: 'Synchronization raster / SSB frequency position' },
  coreset0: { spec: 'TS 38.213', clause: 'sec 13 / Table 13-4', title: 'CORESET#0 for Type0-PDCCH CSS set' },
  pdcch: { spec: 'TS 38.211', clause: 'sec 7.3.2', title: 'PDCCH / control-resource set mapping' },
  pdsch: { spec: 'TS 38.211', clause: 'sec 7.3.1.6', title: 'PDSCH resource-element mapping' },
  pdschDmrs: { spec: 'TS 38.211', clause: 'sec 7.4.1.1', title: 'PDSCH DM-RS (mapping type A, l0 = dmrs-TypeA-Position)' },
  pusch: { spec: 'TS 38.211', clause: 'sec 6.4.1.2', title: 'PUSCH resource-element mapping' },
  puschDmrs: { spec: 'TS 38.211', clause: 'sec 6.4.1.1', title: 'PUSCH DM-RS' },
  pucch: { spec: 'TS 38.211', clause: 'sec 6.3.2 / 9', title: 'PUCCH; frequency hopping at BWP edges' },
  prach: { spec: 'TS 38.211', clause: 'sec 6.3.3 / Table 6.3.3.2-3', title: 'PRACH preamble mapping; PRACH configuration index' },
  csirs: { spec: 'TS 38.211', clause: 'sec 7.4.1.5', title: 'CSI-RS resource-element mapping' },
} as const;

export type SpecRefKey = keyof typeof SPEC_REFS;

/** Which spec clause explains a given RE owner (for the inspector panel). */
export const OWNER_SPEC: Record<Owner, SpecRefKey | null> = {
  [Owner.Empty]: null,
  [Owner.Guard]: 'tdd',
  [Owner.PdschData]: 'pdsch',
  [Owner.PdschDmrs]: 'pdschDmrs',
  [Owner.PuschData]: 'pusch',
  [Owner.PuschDmrs]: 'puschDmrs',
  [Owner.Pdcch]: 'pdcch',
  [Owner.Pucch]: 'pucch',
  [Owner.Prach]: 'prach',
  [Owner.CsiRs]: 'csirs',
  [Owner.SsbPss]: 'ssb',
  [Owner.SsbSss]: 'ssb',
  [Owner.SsbPbch]: 'ssb',
  [Owner.Collision]: null,
};
