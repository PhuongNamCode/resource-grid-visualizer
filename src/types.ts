// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Shared domain types for the resource-grid-visualizer.
//
// A CellProfile is the normalized, gNB-agnostic description of one NR cell,
// produced by scripts/gnb_to_profile.mjs from any gNB YAML config. The mapping
// engine and UI only consume CellProfile, never the raw YAML, so pointing the
// tool at a different gNB is purely a config swap.

export type Duplex = 'TDD' | 'FDD';

/** 3GPP TS 38.213 sec 11.1 TDD UL/DL configuration (single pattern). */
export interface TddPattern {
  /** dl_ul_tx_period, in slots. */
  periodSlots: number;
  nofDlSlots: number;
  nofDlSymbols: number;
  nofUlSlots: number;
  nofUlSymbols: number;
}

/** Normalized per-cell RF profile. All values originate from the gNB config. */
export interface CellProfile {
  name: string;
  pci: number | null;
  /** NR operating band label, e.g. "n78". */
  band: string | null;
  dlArfcn: number | null;
  /** Sub-carrier spacing in kHz: 15 / 30 / 60 / 120. */
  scsKhz: number;
  channelBandwidthMhz: number;
  /** Transmission bandwidth in RBs, derived from bandwidth + SCS (TS 38.101-1). */
  nRb: number;
  nAntDl: number | null;
  nAntUl: number | null;
  duplex: Duplex;
  /** Present for TDD, null for FDD. */
  tdd: TddPattern | null;
  prachConfigIndex: number | null;
  /** Diagnostics emitted by the loader (e.g. "band derived from ARFCN"). */
  notes: string[];
}

export interface CellProfileFile {
  generatedAt: string;
  sourceConfig: string;
  cells: CellProfile[];
}

/** Channel / signal ownership of a single resource element. */
export enum Owner {
  Empty = 0,
  Guard = 1,
  PdschData = 2,
  PdschDmrs = 3,
  PuschData = 4,
  PuschDmrs = 5,
  Pdcch = 6,
  Pucch = 7,
  Prach = 8,
  CsiRs = 9,
  SsbPss = 10,
  SsbSss = 11,
  SsbPbch = 12,
  Collision = 13,
}

export type SlotDirection = 'D' | 'S' | 'U';

/** Toggle set that drives which channels are drawn. */
export interface ChannelToggles {
  pdsch: boolean;
  pusch: boolean;
  pucch: boolean;
  pdcch: boolean;
  ssb: boolean;
  csirs: boolean;
  prach: boolean;
  ssbRateMatch: boolean;
}

/**
 * Fully-resolved parameters the engine needs to render a slot. Seeded from a
 * CellProfile but individually editable in the UI (WirelessBrew-style
 * exploration) without ever touching the source config.
 */
export interface GridParams {
  scsKhz: number;
  nRb: number;
  duplex: Duplex;
  tdd: TddPattern | null;
  // SS/PBCH block placement (TS 38.211 sec 7.4.3). Frequency offset is
  // gNB-derived; defaulted and editable here.
  ssbRbOffset: number;
  ssbStartSymbol: number;
  /** Slot indices (within the TDD period / frame) that carry an SSB burst. */
  ssbSlots: number[];
  // CORESET#0 (TS 38.213 sec 13, Table 13-4).
  coreset0Index: number;
  coreset0Rb: number;
  coreset0Symbols: number;
  coreset0RbOffset: number;
  /** dmrs-TypeA-Position: first DM-RS symbol l0 (2 or 3). TS 38.211 sec 7.4.1.1.2 */
  dmrsTypeAPos: 2 | 3;
  prachConfigIndex: number | null;
  toggles: ChannelToggles;
}

export interface SlotGrid {
  slotIndex: number;
  direction: SlotDirection;
  nRb: number;
  /** Length nRb*12*symbolsPerSlot, row-major over (l, k). Values are Owner. */
  owners: Uint8Array;
  symbolsPerSlot: number;
  subcarriers: number;
  accounting: Accounting;
}

export interface Accounting {
  pdschData: number;
  puschData: number;
  dmrs: number;
  control: number;
  ssb: number;
  csiRs: number;
  prach: number;
  collision: number;
}

/** Real-time slot allocation from OCUDU gNodeB scheduler telemetry. */
export interface LiveSlotAlloc {
  pdschPrbs?: number;
  puschPrbs?: number;
  pucchPrbs?: number;
}

/** Live real-time metric for an active UE connected to OCUDU. */
export interface LiveUeMetric {
  ue: number;
  rnti: number;
  dl_brate: number;
  ul_brate: number;
  dl_mcs: number;
  ul_mcs: number;
  cqi: number;
  dl_ri: number;
  ul_ri?: number;
  pusch_snr_db: number;
  pusch_rsrp_db: number;
  pucch_snr_db?: number;
  ta_ns: number;
  dl_nof_ok: number;
  dl_nof_nok: number;
  ul_nof_ok: number;
  ul_nof_nok: number;
  bsr?: number;
}

/** Live real-time cell metrics from OCUDU gNodeB. */
export interface LiveCellMetrics {
  average_latency?: number;
  max_latency?: number;
  latency_histogram?: number[];
  pdsch_prbs_used_per_tdd_slot_idx?: number[];
  pusch_prbs_used_per_tdd_slot_idx?: number[];
  pucch_tot_rb_usage_avg?: number;
  total_prach_preambles?: number;
  two_step_prachs_detected?: number;
  failed_common_dl_pdcch?: number;
  failed_dl_pdcch?: number;
  failed_ul_pdcch?: number;
  late_dl_harqs?: number;
  late_ul_harqs?: number;
}

/** Live MAC-level execution metrics from OCUDU du_high. */
export interface LiveMacMetrics {
  pci: number;
  average_latency_us: number;
  max_latency_us: number;
  min_latency_us: number;
  cpu_usage_percent: number;
}

/** Aggregate live state exposed by the live streaming hook. */
export interface LiveTelemetryState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  paused: boolean;
  timestamp: string | null;
  totalDlMbps: number;
  totalUlKbps: number;
  activeUeCount: number;
  ueList: LiveUeMetric[];
  cellMetrics: LiveCellMetrics | null;
  macMetrics: LiveMacMetrics | null;
  pdschSlotPrbs: number[];
  puschSlotPrbs: number[];
  togglePause: () => void;
  reconnect: () => void;
  setWsUrl: (url: string) => void;
  wsUrl: string;
}
