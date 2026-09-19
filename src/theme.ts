// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Single source of truth for channel colors + labels. Both the Canvas renderer
// and the React legend/inspector read from here so colors never drift.

import { Owner } from './types';

export interface ChannelStyle {
  owner: Owner;
  /** Short key used in the RE label overlay. */
  short: string;
  /** Human label shown in the legend / inspector. */
  label: string;
  /** Fill color (canvas + legend chip). */
  fill: string;
  /** Border color for the RE cell. */
  border: string;
  /** Text color for the RE label (on top of fill). */
  text: string;
}

// Palette tuned for a dark, dense engineering aesthetic (WirelessBrew-like).
export const CHANNEL_STYLES: Record<Owner, ChannelStyle> = {
  [Owner.Empty]: {
    owner: Owner.Empty,
    short: 'IDLE',
    label: 'Unused / Idle RE',
    fill: '#0c1220',
    border: '#1b2536',
    text: '#415169',
  },
  [Owner.Guard]: {
    owner: Owner.Guard,
    short: 'GUARD',
    label: 'Guard period (TDD switch)',
    fill: '#161a24',
    border: '#242a38',
    text: '#6b7688',
  },
  [Owner.PdschData]: {
    owner: Owner.PdschData,
    short: 'PDSCH',
    label: 'PDSCH data',
    fill: '#1f6feb',
    border: '#2f80f0',
    text: '#eaf2ff',
  },
  [Owner.PdschDmrs]: {
    owner: Owner.PdschDmrs,
    short: 'DM-RS',
    label: 'PDSCH DM-RS',
    fill: '#7ea8ff',
    border: '#a9c5ff',
    text: '#0b1220',
  },
  [Owner.PuschData]: {
    owner: Owner.PuschData,
    short: 'PUSCH',
    label: 'PUSCH data',
    fill: '#1f9d55',
    border: '#2bb268',
    text: '#eafff2',
  },
  [Owner.PuschDmrs]: {
    owner: Owner.PuschDmrs,
    short: 'DM-RS',
    label: 'PUSCH DM-RS',
    fill: '#7ee0a6',
    border: '#a6f0c4',
    text: '#07130c',
  },
  [Owner.Pdcch]: {
    owner: Owner.Pdcch,
    short: 'PDCCH',
    label: 'PDCCH / CORESET',
    fill: '#f2a541',
    border: '#f7bd6e',
    text: '#241300',
  },
  [Owner.Pucch]: {
    owner: Owner.Pucch,
    short: 'PUCCH',
    label: 'PUCCH',
    fill: '#e0529c',
    border: '#ec7bb5',
    text: '#ffffff',
  },
  [Owner.Prach]: {
    owner: Owner.Prach,
    short: 'PRACH',
    label: 'PRACH',
    fill: '#b06bd6',
    border: '#c48fe5',
    text: '#ffffff',
  },
  [Owner.CsiRs]: {
    owner: Owner.CsiRs,
    short: 'CSI-RS',
    label: 'CSI-RS',
    fill: '#20c5c5',
    border: '#4dd8d8',
    text: '#05201f',
  },
  [Owner.SsbPss]: {
    owner: Owner.SsbPss,
    short: 'PSS',
    label: 'SSB PSS',
    fill: '#d64545',
    border: '#e56b6b',
    text: '#ffffff',
  },
  [Owner.SsbSss]: {
    owner: Owner.SsbSss,
    short: 'SSS',
    label: 'SSB SSS',
    fill: '#c0392b',
    border: '#d65a4d',
    text: '#ffffff',
  },
  [Owner.SsbPbch]: {
    owner: Owner.SsbPbch,
    short: 'PBCH',
    label: 'SSB PBCH',
    fill: '#8e2f2f',
    border: '#ab4444',
    text: '#ffffff',
  },
  [Owner.Collision]: {
    owner: Owner.Collision,
    short: 'COLL',
    label: 'Collision (spec violation)',
    fill: '#ff2d2d',
    border: '#ff6b6b',
    text: '#ffffff',
  },
};

/** Legend ordering (mirrors WirelessBrew grouping). */
export const LEGEND_ORDER: Owner[] = [
  Owner.Pdcch,
  Owner.PdschDmrs,
  Owner.PdschData,
  Owner.PuschData,
  Owner.PuschDmrs,
  Owner.Pucch,
  Owner.SsbPss,
  Owner.SsbSss,
  Owner.SsbPbch,
  Owner.CsiRs,
  Owner.Prach,
  Owner.Collision,
];

export interface UeTheme {
  ueIndex: number;
  name: string;
  fill: string;
  dmrs: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
}

export const UE_PALETTE: Omit<UeTheme, 'ueIndex' | 'name'>[] = [
  {
    // UE 0: Electric Sky / Cyan
    fill: '#0284c7',
    dmrs: '#7dd3fc',
    border: '#38bdf8',
    text: '#ffffff',
    badgeBg: 'rgba(56, 189, 248, 0.2)',
    badgeText: '#38bdf8',
  },
  {
    // UE 1: Neon Emerald / Mint
    fill: '#059669',
    dmrs: '#6ee7b7',
    border: '#34d399',
    text: '#ffffff',
    badgeBg: 'rgba(52, 211, 153, 0.2)',
    badgeText: '#34d399',
  },
  {
    // UE 2: Vivid Amber / Gold
    fill: '#d97706',
    dmrs: '#fcd34d',
    border: '#fbbf24',
    text: '#ffffff',
    badgeBg: 'rgba(251, 191, 36, 0.2)',
    badgeText: '#fbbf24',
  },
  {
    // UE 3: Bright Iris / Violet
    fill: '#7c3aed',
    dmrs: '#c4b5fd',
    border: '#a78bfa',
    text: '#ffffff',
    badgeBg: 'rgba(167, 139, 250, 0.2)',
    badgeText: '#a78bfa',
  },
  {
    // UE 4: Rose / Pink
    fill: '#e11d48',
    dmrs: '#fda4af',
    border: '#fb7185',
    text: '#ffffff',
    badgeBg: 'rgba(251, 113, 133, 0.2)',
    badgeText: '#fb7185',
  },
  {
    // UE 5: Teal
    fill: '#0d9488',
    dmrs: '#5eead4',
    border: '#2dd4bf',
    text: '#ffffff',
    badgeBg: 'rgba(45, 212, 191, 0.2)',
    badgeText: '#2dd4bf',
  },
  {
    // UE 6: Hot Orange
    fill: '#ea580c',
    dmrs: '#fdba74',
    border: '#fb923c',
    text: '#ffffff',
    badgeBg: 'rgba(251, 146, 60, 0.2)',
    badgeText: '#fb923c',
  },
  {
    // UE 7: Indigo
    fill: '#4f46e5',
    dmrs: '#a5b4fc',
    border: '#818cf8',
    text: '#ffffff',
    badgeBg: 'rgba(129, 140, 248, 0.2)',
    badgeText: '#818cf8',
  },
];

export function getUeTheme(ueIndex: number): UeTheme {
  const base = UE_PALETTE[Math.abs(ueIndex) % UE_PALETTE.length];
  return {
    ueIndex,
    name: `UE ${ueIndex}`,
    ...base,
  };
}
