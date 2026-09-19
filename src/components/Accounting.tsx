// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { SlotGrid } from '../types';

interface AccountingProps {
  grid: SlotGrid;
}

function Row({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 text-sm">
      <span className="text-subtle">{label}</span>
      <span className="num font-semibold" style={accent ? { color: accent } : undefined}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export function Accounting({ grid }: AccountingProps) {
  const a = grid.accounting;
  const activeRb = grid.nRb;
  const dataRe = a.pdschData + a.puschData;
  const nRePerPrb = activeRb > 0 ? (dataRe / activeRb).toFixed(1) : '0';

  return (
    <div className="card">
      <div className="card-header">RE accounting &mdash; slot #{grid.slotIndex} ({grid.direction})</div>
      <div className="divide-y divide-edge/50">
        <Row label="PDSCH data REs" value={a.pdschData} accent="#7ea8ff" />
        <Row label="PUSCH data REs" value={a.puschData} accent="#7ee0a6" />
        <Row label="DM-RS REs (DL/UL)" value={a.dmrs} accent="#a9c5ff" />
        <Row label="Control REs (PDCCH/PUCCH)" value={a.control} accent="#f7bd6e" />
        <Row label="SSB REs" value={a.ssb} accent="#e56b6b" />
        <Row label="CSI-RS REs" value={a.csiRs} accent="#4dd8d8" />
        <Row label="PRACH REs" value={a.prach} accent="#c48fe5" />
        {a.collision > 0 && <Row label="Collision REs" value={a.collision} accent="#ff6b6b" />}
      </div>
      <div className="flex items-center justify-between border-t border-edge px-3 py-2 text-sm">
        <span className="text-subtle">Data REs / PRB</span>
        <span className="num font-semibold text-ink">{nRePerPrb}</span>
      </div>
    </div>
  );
}
