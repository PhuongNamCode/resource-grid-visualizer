// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { memo } from 'react';
import type { CellProfile, CellProfileFile, UeDiagnostics } from '../types';

interface HeaderProps {
  profileFile: CellProfileFile;
  profile: CellProfile;
  selectedCellIdx: number;
  onSelectCell: (idx: number) => void;
  liveConnected: boolean;
  liveConnecting: boolean;
  liveError: string | null;
  onReconnect: () => void;
  activeUeCount: number;
  totalDlMbps: number;
  ueDiagnostics: UeDiagnostics;
}

export const Header = memo(function Header({
  profileFile,
  profile,
  selectedCellIdx,
  onSelectCell,
  liveConnected,
  liveConnecting,
  liveError,
  onReconnect,
  activeUeCount,
  totalDlMbps,
  ueDiagnostics,
}: HeaderProps) {
  const { rawUeCount, uniqueUeIds, duplicateUeIds, malformedCount } = ueDiagnostics;
  const idsPreview =
    uniqueUeIds.length > 0
      ? uniqueUeIds.length <= 16
        ? uniqueUeIds.join(', ')
        : `${uniqueUeIds.slice(0, 16).join(', ')}…`
      : 'none';
  const nonContiguous =
    uniqueUeIds.length > 1 &&
    uniqueUeIds[uniqueUeIds.length - 1] - uniqueUeIds[0] + 1 !== uniqueUeIds.length;
  const ueTooltip =
    `Raw ue_list records: ${rawUeCount}\n` +
    `Valid connected UEs: ${activeUeCount}\n` +
    `Unique UE IDs: ${idsPreview}` +
    (nonContiguous ? ' (non-contiguous - IDs can skip values; this is expected)' : '') +
    (duplicateUeIds.length > 0 ? `\nDuplicate UE IDs: ${duplicateUeIds.join(', ')}` : '') +
    (malformedCount > 0 ? `\nMalformed/dropped records: ${malformedCount}` : '');
  return (
    <header className="sticky top-0 z-10 border-b border-edge bg-panel/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/20 text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold leading-tight text-ink">5G NR RE Grid &amp; Channel Mapper</h1>
          </div>
        </div>

        <span className="chip border border-accent/40 bg-accent/10 text-accent hidden sm:inline-flex">
          3GPP TS 38.211 / 213 / 214 / 104
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Live Streaming Status Badge */}
          {liveConnected ? (
            <div className="flex items-center gap-2 rounded-full border border-[#2bb268]/50 bg-[#1f9d55]/15 px-3 py-1 text-xs text-[#b5f0cd]">
              <span className="h-2 w-2 rounded-full bg-[#2bb268] animate-pulse" />
              <span className="font-semibold tracking-wide">LIVE STREAM</span>
              <span className="text-subtle">&middot;</span>
              <span
                className="num font-medium text-ink/90 cursor-help underline decoration-dotted decoration-[#2bb268]/60 underline-offset-2"
                title={ueTooltip}
              >
                {activeUeCount} UEs
                {duplicateUeIds.length > 0 || malformedCount > 0 ? (
                  <span className="ml-1 text-[#f6d199]" title={ueTooltip}>
                    &#9888;
                  </span>
                ) : null}
              </span>
              <span className="text-subtle">&middot;</span>
              <span className="num font-bold text-[#b5f0cd]">{totalDlMbps.toFixed(1)} Mbps</span>
            </div>
          ) : liveConnecting ? (
            <div className="flex items-center gap-2 rounded-full border border-[#f7bd6e]/50 bg-[#f2a541]/15 px-3 py-1 text-xs text-[#f6d199]">
              <span className="h-2 w-2 rounded-full bg-[#f7bd6e] animate-ping" />
              <span>Connecting :8001&hellip;</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-[#e56b6b]/50 bg-[#d64545]/15 px-3 py-1 text-xs text-[#f3bcbc]">
              <span className="h-2 w-2 rounded-full bg-[#e56b6b]" />
              <span title={liveError ?? 'gNodeB WebSocket disconnected'}>gNB Offline (:8001)</span>
              <button
                type="button"
                onClick={onReconnect}
                className="ml-1 rounded bg-[#d64545]/30 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-[#d64545]/50 transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {profileFile.cells.length > 1 && (
            <select
              className="select w-auto text-xs py-1 cursor-pointer"
              value={selectedCellIdx}
              onChange={(e) => onSelectCell(Number(e.target.value))}
            >
              {profileFile.cells.map((c, i) => (
                <option key={i} value={i}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <span className="chip border border-edge bg-panelraised text-ink/90 text-xs py-1">
            {profile.duplex} &middot; {profile.band ?? 'n78'} &middot; {profile.channelBandwidthMhz} MHz @ {profile.scsKhz} kHz &middot;{' '}
            <span className="num font-semibold">{profile.nRb}</span> RB
          </span>
        </div>
      </div>
    </header>
  );
});
