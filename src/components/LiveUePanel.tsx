// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { LiveUeMetric } from '../types';

interface LiveUePanelProps {
  ueList: LiveUeMetric[];
  paused: boolean;
  totalDlMbps: number;
  totalUlKbps: number;
}

export function LiveUePanel({ ueList, paused, totalDlMbps, totalUlKbps }: LiveUePanelProps) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#2bb268] animate-pulse" />
          <span className="font-semibold text-ink">Active UEs Telemetry</span>
          <span className="chip border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-xs text-accent">
            {ueList.length} Connected
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-subtle">
            Agg DL:{' '}
            <span className="num font-bold text-[#b5f0cd]">{totalDlMbps.toFixed(1)} Mbps</span>
          </span>
          <span className="text-subtle">
            Agg UL:{' '}
            <span className="num font-bold text-[#bcd6ff]">{totalUlKbps.toFixed(0)} kbps</span>
          </span>
          {paused && (
            <span className="rounded border border-[#f7bd6e] bg-[#f2a541]/20 px-1.5 py-0.5 text-[10px] text-[#f6d199]">
              PAUSED
            </span>
          )}
        </div>
      </div>

      {ueList.length === 0 ? (
        <div className="p-6 text-center text-xs text-subtle">
          <p className="font-medium text-ink/80">No Active UEs Attached</p>
          <p className="mt-1 text-[11px]">
            When UEs attach to the cell, their live bitrates, modulation (MCS), channel quality (CQI), and SNR will stream here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge bg-panel/60 text-[11px] font-semibold text-subtle">
              <tr>
                <th className="px-3 py-2">UE / RNTI</th>
                <th className="px-3 py-2">DL Throughput</th>
                <th className="px-3 py-2">UL Throughput</th>
                <th className="px-3 py-2">DL / UL MCS</th>
                <th className="px-3 py-2">CQI / Layers</th>
                <th className="px-3 py-2">PUSCH SNR</th>
                <th className="px-3 py-2">RSRP</th>
                <th className="px-3 py-2">Timing Adv</th>
                <th className="px-3 py-2">CRC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/40">
              {ueList.map((ue) => {
                const dlMbps = (ue.dl_brate / 1_000_000).toFixed(1);
                const ulKbps = (ue.ul_brate / 1_000).toFixed(0);
                const rntiHex = `0x${ue.rnti.toString(16).toUpperCase()}`;
                const dlErrRate =
                  ue.dl_nof_ok + ue.dl_nof_nok > 0
                    ? ((ue.dl_nof_nok / (ue.dl_nof_ok + ue.dl_nof_nok)) * 100).toFixed(1)
                    : '0.0';

                return (
                  <tr key={ue.rnti} className="hover:bg-white/[0.02] transition">
                    <td className="px-3 py-2.5 font-medium text-ink">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-accent">UE {ue.ue}</span>
                        <span className="text-[11px] text-subtle font-mono">
                          {rntiHex} ({ue.rnti})
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="num font-bold text-[#b5f0cd]">{dlMbps} Mbps</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="num font-semibold text-[#bcd6ff]">{ulKbps} kbps</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="num text-ink/90">
                        {ue.dl_mcs} / {ue.ul_mcs}
                      </span>
                      <span className="ml-1 text-[10px] text-subtle">
                        ({ue.dl_mcs >= 20 ? '256QAM' : ue.dl_mcs >= 10 ? '64QAM' : 'QPSK'})
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="num font-semibold text-accent">{ue.cqi}</span>
                      <span className="text-subtle text-[11px]"> / {ue.dl_ri}L</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <span
                        className={`num font-semibold ${
                          ue.pusch_snr_db >= 20
                            ? 'text-[#b5f0cd]'
                            : ue.pusch_snr_db >= 10
                              ? 'text-[#f6d199]'
                              : 'text-[#f3bcbc]'
                        }`}
                      >
                        {ue.pusch_snr_db.toFixed(1)} dB
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-subtle">
                      <span className="num">{ue.pusch_rsrp_db.toFixed(1)} dBm</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-subtle">
                      <span className="num">{ue.ta_ns.toFixed(0)} ns</span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px]">
                      <span className="num text-[#b5f0cd] font-medium">{ue.dl_nof_ok} ok</span>
                      {ue.dl_nof_nok > 0 && (
                        <span className="num text-[#f3bcbc] ml-1.5">
                          ({ue.dl_nof_nok} err &middot; {dlErrRate}%)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
