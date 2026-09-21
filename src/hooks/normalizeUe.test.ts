// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { describe, expect, it } from 'vitest';
import { buildUeTelemetry, normalizeLiveUeMetric } from './normalizeUe';

/** Build a single valid raw UE record as OCUDU emits it in `ue_list`. */
function validRaw(ue: number, overrides: Record<string, unknown> = {}) {
  return {
    ue,
    rnti: 0x4700 + ue,
    dl_brate: 100_000_000,
    ul_brate: 50_000,
    dl_mcs: 24,
    ul_mcs: 16,
    cqi: 15,
    dl_ri: 2,
    pusch_snr_db: 25,
    pusch_rsrp_db: -80,
    ta_ns: 100,
    dl_nof_ok: 100,
    dl_nof_nok: 0,
    ul_nof_ok: 50,
    ul_nof_nok: 0,
    ...overrides,
  };
}

describe('normalizeLiveUeMetric', () => {
  it('keeps optional radio fields as null (not 0) when absent', () => {
    const norm = normalizeLiveUeMetric(
      validRaw(3, { pusch_snr_db: undefined, pusch_rsrp_db: undefined, ta_ns: undefined }),
      0,
    );
    expect(norm).not.toBeNull();
    expect(norm!.pusch_snr_db).toBeNull();
    expect(norm!.pusch_rsrp_db).toBeNull();
    expect(norm!.ta_ns).toBeNull();
  });

  it('returns null for records with no ue/rnti identity (malformed)', () => {
    expect(normalizeLiveUeMetric({ dl_brate: 5 }, 0)).toBeNull();
    expect(normalizeLiveUeMetric(null, 0)).toBeNull();
    expect(normalizeLiveUeMetric('nonsense', 0)).toBeNull();
  });

  it('coerces string numerics and defaults invalid numbers', () => {
    const norm = normalizeLiveUeMetric({ ue: 1, rnti: 2, dl_brate: 'not-a-number' }, 0);
    expect(norm).not.toBeNull();
    expect(norm!.dl_brate).toBe(0);
  });

  it('parses optional exact grant geometry when present', () => {
    const norm = normalizeLiveUeMetric(
      validRaw(2, {
        grants: [
          { rnti: 0x4702, ue_index: 2, slot_idx: 0, rb_start: 10, nof_rbs: 20, symbol_start: 2, nof_symbols: 12, nof_layers: 2, is_dl: true },
          { rnti: 0x4702, ue_index: 2, slot_idx: 7, rb_start: 0, nof_rbs: 0 }, // zero-RB grant dropped
        ],
      }),
      0,
    );
    expect(norm!.grants).toHaveLength(1);
    expect(norm!.grants![0].rb_start).toBe(10);
    expect(norm!.grants![0].nof_rbs).toBe(20);
  });
});

describe('buildUeTelemetry (10-UE regression: normalization + diagnostics)', () => {
  // 9 valid + 1 valid-but-missing-SNR/RSRP = 10 valid records with NON-CONTIGUOUS
  // ids (7 is skipped), plus a duplicate (id 3) and two malformed entries.
  const raw = [
    validRaw(0),
    validRaw(1),
    validRaw(2),
    validRaw(3),
    validRaw(4),
    validRaw(5),
    validRaw(6),
    validRaw(8), // note: id 7 is intentionally skipped -> non-contiguous
    validRaw(9),
    validRaw(10, { pusch_snr_db: undefined, pusch_rsrp_db: undefined }), // missing SNR/RSRP
    validRaw(3), // duplicate id 3
    { dl_brate: 12345 }, // malformed: no identity
    null, // malformed: not an object
  ];

  const t = buildUeTelemetry(raw);

  it('counts raw records and keeps only valid ones', () => {
    expect(t.rawUeCount).toBe(13);
    expect(t.ues.length).toBe(11); // 10 unique + 1 duplicate record retained
    expect(t.malformedCount).toBe(2);
  });

  it('reports unique UE ids (sorted, non-contiguous) and duplicates', () => {
    expect(t.uniqueUeIds).toEqual([0, 1, 2, 3, 4, 5, 6, 8, 9, 10]);
    expect(t.duplicateUeIds).toEqual([3]);
    // Explains "10 shown but a gap": 10 unique ids but 7 is missing.
    expect(t.uniqueUeIds).not.toContain(7);
  });

  it('keeps the missing-SNR record render-safe (null, not a crash)', () => {
    const ue10 = t.ues.find((u) => u.ue === 10)!;
    expect(ue10.pusch_snr_db).toBeNull();
    expect(ue10.pusch_rsrp_db).toBeNull();
    // A panel guarding `typeof x === 'number'` can render "-" safely.
    const safe = typeof ue10.pusch_snr_db === 'number' ? ue10.pusch_snr_db.toFixed(1) : '-';
    expect(safe).toBe('-');
  });

  it('computes aggregate throughput totals from valid records only', () => {
    // 11 valid records each with 100 Mbps DL.
    expect(t.totalDlMbps).toBeCloseTo(11 * 100, 5);
  });

  it('handles empty / non-array payloads without throwing', () => {
    expect(buildUeTelemetry(undefined).ues).toEqual([]);
    expect(buildUeTelemetry([]).rawUeCount).toBe(0);
    expect(buildUeTelemetry({}).malformedCount).toBe(0);
  });
});
