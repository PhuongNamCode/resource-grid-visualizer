import { memo } from 'react';
import type { LiveUeMetric, UeDiagnostics } from '../types';
import { getUeTheme } from '../theme';

interface LiveUePanelProps {
  ueList: LiveUeMetric[];
  paused: boolean;
  totalDlMbps: number;
  totalUlKbps: number;
  selectedUeIndex?: number | null;
  onSelectUe?: (ueIndex: number | null) => void;
  ueDiagnostics?: UeDiagnostics;
}

export const LiveUePanel = memo(function LiveUePanel({
  ueList,
  paused,
  totalDlMbps,
  totalUlKbps,
  selectedUeIndex = null,
  onSelectUe,
  ueDiagnostics,
}: LiveUePanelProps) {
  const diag = ueDiagnostics;
  const hasDropCount = diag && diag.rawUeCount !== ueList.length;
  return (
    <div className="card overflow-hidden">
      <div className="card-header flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#2bb268] animate-pulse" />
          <span className="font-semibold text-ink">Active UEs Telemetry</span>
          <span className="chip border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-xs text-accent">
            {ueList.length} Connected
          </span>
          {diag && (
            <span
              className="text-[11px] text-subtle"
              title={
                `Raw ue_list records: ${diag.rawUeCount}\n` +
                `Valid: ${ueList.length}` +
                (diag.uniqueUeIds.length > 0 ? `\nUnique IDs: ${diag.uniqueUeIds.join(', ')}` : '') +
                (diag.duplicateUeIds.length > 0
                  ? `\nDuplicate IDs: ${diag.duplicateUeIds.join(', ')}`
                  : '') +
                (diag.malformedCount > 0 ? `\nMalformed/dropped: ${diag.malformedCount}` : '')
              }
            >
              {hasDropCount ? `${diag.rawUeCount} raw · ` : ''}
              {diag.uniqueUeIds.length} unique
              {diag.duplicateUeIds.length > 0 && (
                <span className="ml-1 text-[#f6d199]">· {diag.duplicateUeIds.length} dup</span>
              )}
              {diag.malformedCount > 0 && (
                <span className="ml-1 text-[#f3bcbc]">· {diag.malformedCount} malformed</span>
              )}
            </span>
          )}
          {selectedUeIndex !== null && onSelectUe && (
            <button
              type="button"
              onClick={() => onSelectUe(null)}
              className="ml-2 text-[11px] text-accent hover:underline font-medium cursor-pointer"
            >
              Reset to All UEs
            </button>
          )}
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
              {ueList.map((ue, idx) => {
                const ueId = typeof ue.ue === 'number' && !isNaN(ue.ue) ? ue.ue : idx;
                const rnti = typeof ue.rnti === 'number' && !isNaN(ue.rnti) ? ue.rnti : 0;
                const theme = getUeTheme(ueId);
                const isSelected = selectedUeIndex === ueId;
                const dlMbps = ((ue.dl_brate || 0) / 1_000_000).toFixed(1);
                const ulKbps = ((ue.ul_brate || 0) / 1_000).toFixed(0);
                const rntiHex = rnti ? `0x${rnti.toString(16).toUpperCase()}` : '0x0';
                const totalOk = (ue.dl_nof_ok || 0) + (ue.dl_nof_nok || 0);
                const dlErrRate =
                  totalOk > 0
                    ? (((ue.dl_nof_nok || 0) / totalOk) * 100).toFixed(1)
                    : '0.0';

                const snr =
                  typeof ue.pusch_snr_db === 'number' && !isNaN(ue.pusch_snr_db)
                    ? ue.pusch_snr_db
                    : null;
                const rsrp =
                  typeof ue.pusch_rsrp_db === 'number' && !isNaN(ue.pusch_rsrp_db)
                    ? ue.pusch_rsrp_db
                    : null;
                const ta =
                  typeof ue.ta_ns === 'number' && !isNaN(ue.ta_ns) ? ue.ta_ns : null;

                return (
                  <tr
                    key={rnti || idx}
                    onClick={() => onSelectUe?.(isSelected ? null : ueId)}
                    className={`cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-accent/15 ring-1 ring-inset ring-accent'
                        : 'hover:bg-white/[0.04]'
                    }`}
                    title="Click row to focus / isolate this UE on the resource grid"
                  >
                    <td className="px-3 py-2.5 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: theme.fill, border: `1.5px solid ${theme.border}` }}
                          title={`Color on resource grid: ${theme.name}`}
                        />
                        <span className="font-bold" style={{ color: theme.badgeText }}>
                          UE {ueId}
                        </span>
                        <span className="text-[11px] text-subtle font-mono">
                          {rntiHex} ({rnti})
                        </span>
                        {isSelected && (
                          <span className="ml-1 text-[9px] font-extrabold uppercase px-1 rounded bg-accent/30 text-accent">
                            Focused
                          </span>
                        )}
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
                        {ue.dl_mcs ?? '-'} / {ue.ul_mcs ?? '-'}
                      </span>
                      {typeof ue.dl_mcs === 'number' && (
                        <span className="ml-1 text-[10px] text-subtle">
                          ({ue.dl_mcs >= 20 ? '256QAM' : ue.dl_mcs >= 10 ? '64QAM' : 'QPSK'})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="num font-semibold text-accent">{ue.cqi ?? '-'}</span>
                      <span className="text-subtle text-[11px]"> / {ue.dl_ri ?? 1}L</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {snr !== null ? (
                        <span
                          className={`num font-semibold ${
                            snr >= 20
                              ? 'text-[#b5f0cd]'
                              : snr >= 10
                                ? 'text-[#f6d199]'
                                : 'text-[#f3bcbc]'
                          }`}
                        >
                          {snr.toFixed(1)} dB
                        </span>
                      ) : (
                        <span className="text-subtle text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-subtle">
                      <span className="num">{rsrp !== null ? `${rsrp.toFixed(1)} dBm` : '-'}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-subtle">
                      <span className="num">{ta !== null ? `${ta.toFixed(0)} ns` : '-'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px]">
                      <span className="num text-[#b5f0cd] font-medium">{ue.dl_nof_ok ?? 0} ok</span>
                      {(ue.dl_nof_nok || 0) > 0 && (
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
});
