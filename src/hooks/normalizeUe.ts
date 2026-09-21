// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { LiveUeGrant, LiveUeMetric, UeDiagnostics } from '../types';

/**
 * Normalized view of one OCUDU `ue_list` payload: render-safe UE records plus
 * diagnostics (raw count, unique/duplicate IDs, malformed count) and the
 * aggregate throughput totals derived from the same records.
 */
export interface UeTelemetry extends UeDiagnostics {
  ues: LiveUeMetric[];
  totalDlMbps: number;
  totalUlKbps: number;
}

/** Coerce to a finite number, falling back to `fallback` for anything invalid. */
function toNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to a finite number, or `null` when absent/invalid (do NOT default to 0). */
function toNullableNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Parse the optional Phase 2 `grants` array (exact scheduler geometry). */
function normalizeGrants(raw: unknown): LiveUeGrant[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: LiveUeGrant[] = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const r = g as Record<string, unknown>;
    const nofRbs = toNum(r.nof_rbs, 0);
    if (nofRbs <= 0) continue;
    out.push({
      rnti: toNum(r.rnti, 0),
      ue_index: toNum(r.ue_index, 0),
      slot_idx: toNum(r.slot_idx, 0),
      rb_start: toNum(r.rb_start, 0),
      nof_rbs: nofRbs,
      symbol_start: toNum(r.symbol_start, 0),
      nof_symbols: toNum(r.nof_symbols, 0),
      nof_layers: toNum(r.nof_layers, 1),
      is_dl: r.is_dl === undefined ? true : Boolean(r.is_dl),
    });
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Normalize one raw UE record from OCUDU `ue_list`.
 *
 * Returns `null` for malformed records (no usable `ue`/`rnti` identity) so a
 * single bad entry can never reach React and crash a `.toFixed()` render.
 * Optional radio fields are kept as `null` (not 0) when absent.
 */
export function normalizeLiveUeMetric(raw: unknown, idx: number): LiveUeMetric | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const hasUe = typeof r.ue === 'number' && Number.isFinite(r.ue);
  const hasRnti = typeof r.rnti === 'number' && Number.isFinite(r.rnti);
  // A record with neither a UE index nor an RNTI has no identity: treat as malformed.
  if (!hasUe && !hasRnti) return null;

  const ue = hasUe ? (r.ue as number) : idx;
  const rnti = hasRnti ? (r.rnti as number) : 0;

  const pucchSnr = toNullableNum(r.pucch_snr_db);

  return {
    ue,
    rnti,
    dl_brate: toNum(r.dl_brate, 0),
    ul_brate: toNum(r.ul_brate, 0),
    dl_mcs: toNum(r.dl_mcs, 0),
    ul_mcs: toNum(r.ul_mcs, 0),
    cqi: toNum(r.cqi, 0),
    dl_ri: toNum(r.dl_ri, 1),
    ul_ri: r.ul_ri === undefined ? undefined : toNum(r.ul_ri, 1),
    pusch_snr_db: toNullableNum(r.pusch_snr_db),
    pusch_rsrp_db: toNullableNum(r.pusch_rsrp_db),
    pucch_snr_db: pucchSnr === null ? undefined : pucchSnr,
    ta_ns: toNullableNum(r.ta_ns),
    dl_nof_ok: toNum(r.dl_nof_ok, 0),
    dl_nof_nok: toNum(r.dl_nof_nok, 0),
    ul_nof_ok: toNum(r.ul_nof_ok, 0),
    ul_nof_nok: toNum(r.ul_nof_nok, 0),
    bsr: r.bsr === undefined ? undefined : toNum(r.bsr, 0),
    grants: normalizeGrants(r.grants),
  };
}

/**
 * Normalize a raw `ue_list` payload into render-safe records plus diagnostics.
 * This is the single WebSocket->UI boundary: raw JSON never reaches React.
 */
export function buildUeTelemetry(rawList: unknown): UeTelemetry {
  const arr = Array.isArray(rawList) ? rawList : [];
  const rawUeCount = arr.length;

  const ues: LiveUeMetric[] = [];
  let malformedCount = 0;
  for (let i = 0; i < arr.length; i++) {
    const norm = normalizeLiveUeMetric(arr[i], i);
    if (norm) {
      ues.push(norm);
    } else {
      malformedCount++;
    }
  }

  const seen = new Set<number>();
  const dupSet = new Set<number>();
  for (const u of ues) {
    if (seen.has(u.ue)) {
      dupSet.add(u.ue);
    } else {
      seen.add(u.ue);
    }
  }
  const uniqueUeIds = Array.from(seen).sort((a, b) => a - b);
  const duplicateUeIds = Array.from(dupSet).sort((a, b) => a - b);

  let totalDl = 0;
  let totalUl = 0;
  for (const u of ues) {
    totalDl += u.dl_brate || 0;
    totalUl += u.ul_brate || 0;
  }

  return {
    ues,
    rawUeCount,
    uniqueUeIds,
    duplicateUeIds,
    malformedCount,
    totalDlMbps: totalDl / 1_000_000,
    totalUlKbps: totalUl / 1_000,
  };
}

/** Empty diagnostics for the initial / disconnected state. */
export const EMPTY_UE_DIAGNOSTICS: UeDiagnostics = {
  rawUeCount: 0,
  uniqueUeIds: [],
  duplicateUeIds: [],
  malformedCount: 0,
};
