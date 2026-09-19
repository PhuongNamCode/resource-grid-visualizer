// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { LiveCellMetrics, LiveMacMetrics } from '../types';

interface LiveCellMetricsProps {
  macMetrics: LiveMacMetrics | null;
  cellMetrics: LiveCellMetrics | null;
  timestamp: string | null;
  connected: boolean;
}

export function LiveCellMetricsPanel({
  macMetrics,
  cellMetrics,
  timestamp,
  connected,
}: LiveCellMetricsProps) {
  const timeFormatted = timestamp
    ? new Date(timestamp).toLocaleTimeString()
    : connected
      ? 'Listening...'
      : 'Offline';

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Live Cell &amp; MAC Health</span>
        </div>
        <span className="text-[11px] font-mono text-subtle/80">{timeFormatted}</span>
      </div>

      <div className="space-y-3 p-3">
        {/* MAC Scheduler Latencies */}
        <div>
          <span className="field-label text-[11px] font-semibold text-subtle uppercase tracking-wider">
            MAC DL Scheduler Latency
          </span>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            <div className="rounded border border-edge/60 bg-panel/70 p-1.5 text-center">
              <span className="text-[10px] text-subtle block">Min</span>
              <span className="num font-bold text-ink text-xs">
                {macMetrics ? `${macMetrics.min_latency_us.toFixed(1)} µs` : '--'}
              </span>
            </div>
            <div className="rounded border border-accent/40 bg-accent/10 p-1.5 text-center">
              <span className="text-[10px] text-accent block">Average</span>
              <span className="num font-bold text-accent text-xs">
                {macMetrics ? `${macMetrics.average_latency_us.toFixed(1)} µs` : '--'}
              </span>
            </div>
            <div className="rounded border border-edge/60 bg-panel/70 p-1.5 text-center">
              <span className="text-[10px] text-subtle block">Max</span>
              <span className="num font-bold text-ink text-xs">
                {macMetrics ? `${macMetrics.max_latency_us.toFixed(1)} µs` : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Worker CPU & Radio Channels */}
        <div className="divide-y divide-edge/50 text-xs">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-subtle">MAC Worker CPU</span>
            <span className="num font-medium text-ink">
              {macMetrics ? `${(macMetrics.cpu_usage_percent * 100).toFixed(3)}%` : '--'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-subtle">PUCCH RB Usage Avg</span>
            <span className="num font-medium text-ink">
              {cellMetrics?.pucch_tot_rb_usage_avg !== undefined
                ? `${cellMetrics.pucch_tot_rb_usage_avg.toFixed(2)} RB`
                : '--'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-subtle">Total PRACH Preambles</span>
            <span className="num font-medium text-ink">
              {cellMetrics?.total_prach_preambles ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-subtle">PDCCH Allocation Drops</span>
            <span className="num font-medium text-ink">
              {(cellMetrics?.failed_dl_pdcch ?? 0) +
                (cellMetrics?.failed_common_dl_pdcch ?? 0)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-subtle">Late DL/UL HARQs</span>
            <span className="num font-medium text-ink">
              {(cellMetrics?.late_dl_harqs ?? 0) + (cellMetrics?.late_ul_harqs ?? 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
