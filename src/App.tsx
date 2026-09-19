// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { useEffect, useMemo, useState } from 'react';
import { Owner } from './types';
import type { CellProfile, ChannelToggles, LiveSlotAlloc } from './types';
import { computeSlotGrid, defaultParamsForProfile, prachSlotIndex } from './mapping';
import { useProfile } from './hooks/useProfile';
import { useOcuduLiveMetrics } from './hooks/useOcuduLiveMetrics';
import { ControlRail, type ViewState } from './components/ControlRail';
import { GridCanvas, type Selection } from './components/GridCanvas';
import { SlotNavigator } from './components/SlotNavigator';
import { GridToolbar } from './components/GridToolbar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LiveUePanel } from './components/LiveUePanel';

function defaultView(profile: CellProfile): ViewState {
  // Default to 24 PRBs for instant 60fps load and clear bold RE text labels (PDCCH, PUCCH, PDSCH, DM-RS)
  const prbCount = Math.min(24, profile.nRb);
  return { prbCount, prbStart: 0, zoom: 1, showLabels: true };
}

export function App() {
  const { data: profileFile, error, loading } = useProfile();
  const [selectedCellIdx, setSelectedCellIdx] = useState(0);
  const profile = profileFile?.cells[selectedCellIdx] ?? null;

  const [params, setParams] = useState(() => (profile ? defaultParamsForProfile(profile) : null));
  const [view, setView] = useState<ViewState | null>(null);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [selectedRe, setSelectedRe] = useState<Selection | null>(null);
  const [pinnedOwners, setPinnedOwners] = useState<Owner[] | null>(null);
  const [hoverOwners, setHoverOwners] = useState<Owner[] | null>(null);

  const emphasized = hoverOwners ?? pinnedOwners;

  // Continuous WebSocket metrics telemetry from live OCUDU gNB (:8001)
  const live = useOcuduLiveMetrics();

  // (Re)seed state whenever the active cell profile changes.
  useEffect(() => {
    if (!profile) return;
    setParams(defaultParamsForProfile(profile));
    setView(defaultView(profile));
    setSelectedSlot(0);
    setSelectedRe(null);
    setPinnedOwners(null);
    setHoverOwners(null);
  }, [profile]);

  // Dynamic live allocation for the currently viewed slot
  const liveAlloc: LiveSlotAlloc | undefined = useMemo(() => {
    return {
      pdschPrbs: live.pdschSlotPrbs?.[selectedSlot],
      puschPrbs: live.puschSlotPrbs?.[selectedSlot],
    };
  }, [live.pdschSlotPrbs, live.puschSlotPrbs, selectedSlot]);

  const grid = useMemo(
    () => (params ? computeSlotGrid(params, selectedSlot, liveAlloc) : null),
    [params, selectedSlot, liveAlloc],
  );

  // Keep the viewport within N_RB
  const viewClamped = useMemo(() => {
    if (!params || !view) return null;
    const prbCount = Math.max(1, Math.min(view.prbCount, params.nRb));
    const prbStart = Math.max(0, Math.min(view.prbStart, params.nRb - prbCount));
    return { ...view, prbCount, prbStart };
  }, [params, view]);

  const activePrbs =
    grid?.direction === 'D' || grid?.direction === 'S'
      ? (live.pdschSlotPrbs?.[selectedSlot] ?? 0)
      : (live.puschSlotPrbs?.[selectedSlot] ?? 0);
  const activePct = params && params.nRb > 0 ? ((activePrbs / params.nRb) * 100).toFixed(1) : '0.0';

  // Click on a channel in toolbar: pin/isolate, activate toggle if off, and focus both Slot and the RBs it contains
  const handleChannelClick = (layerId: string, owners: Owner[]) => {
    // 1. Toggle pin isolation
    setPinnedOwners((prev) => {
      if (prev && prev.length === owners.length && owners.every((o) => prev.includes(o))) {
        return null;
      }
      return owners;
    });

    // 2. Ensure channel toggle is active
    const toggleKey = layerId as keyof ChannelToggles;
    setParams((p) => {
      if (p && !p.toggles[toggleKey]) {
        return { ...p, toggles: { ...p.toggles, [toggleKey]: true } };
      }
      return p;
    });

    if (!params) return;

    // 3. Focus on the exact slot and RBs containing the channel
    const targetPrachSlot = prachSlotIndex(params);
    const firstUlSlot = params.tdd
      ? params.tdd.nofDlSlots + (params.tdd.nofDlSymbols > 0 ? 1 : 0)
      : 0;

    switch (layerId) {
      case 'prach': {
        // PRACH occasion: Slot 9 at PRBs 0..11 (12 RBs)
        const slot = targetPrachSlot >= 0 ? targetPrachSlot : firstUlSlot;
        setSelectedSlot(slot);
        setView((v) =>
          v ? { ...v, prbStart: 0, prbCount: Math.min(params.nRb, 12), showLabels: true } : v,
        );
        break;
      }
      case 'ssb': {
        // SSB burst: Slot 0 at PRBs 56..75 (20 RBs)
        setSelectedSlot(params.ssbSlots[0] ?? 0);
        setView((v) =>
          v
            ? {
                ...v,
                prbStart: Math.max(0, params.ssbRbOffset - 2),
                prbCount: Math.min(params.nRb, 24),
                showLabels: true,
              }
            : v,
        );
        break;
      }
      case 'pdcch': {
        // PDCCH / CORESET#0: Slot 0 at PRB coreset0RbOffset (e.g. 56..79, 24 RBs)
        setSelectedSlot(0);
        setView((v) =>
          v
            ? {
                ...v,
                prbStart: Math.max(0, params.coreset0RbOffset),
                prbCount: Math.min(params.nRb, Math.max(12, params.coreset0Rb)),
                showLabels: true,
              }
            : v,
        );
        break;
      }
      case 'pdsch': {
        // PDSCH data & DM-RS: DL slot (Slot 0) starting at PRB 0
        if (grid?.direction === 'U') {
          setSelectedSlot(0);
        }
        setView((v) =>
          v
            ? {
                ...v,
                prbStart: 0,
                prbCount: Math.min(params.nRb, Math.max(24, activePrbs > 0 ? activePrbs : 24)),
                showLabels: true,
              }
            : v,
        );
        break;
      }
      case 'pusch': {
        // PUSCH data & DM-RS: UL slot (Slot 8)
        const slot = grid?.direction === 'U' ? selectedSlot : firstUlSlot;
        setSelectedSlot(slot);
        const startRb = slot === targetPrachSlot ? 12 : 0;
        setView((v) =>
          v
            ? {
                ...v,
                prbStart: startRb,
                prbCount: Math.min(params.nRb, Math.max(24, activePrbs > 0 ? activePrbs : 24)),
                showLabels: true,
              }
            : v,
        );
        break;
      }
      case 'pucch': {
        // PUCCH: UL slot at edge PRB 0
        const slot = grid?.direction === 'U' ? selectedSlot : firstUlSlot;
        setSelectedSlot(slot);
        setView((v) =>
          v
            ? {
                ...v,
                prbStart: 0,
                prbCount: Math.min(params.nRb, 12),
                showLabels: true,
              }
            : v,
        );
        break;
      }
      case 'csirs': {
        // CSI-RS: DL slot (Slot 0), mid-slot symbol 5
        if (grid?.direction === 'U') {
          setSelectedSlot(0);
        }
        setView((v) =>
          v
            ? {
                ...v,
                prbStart: 0,
                prbCount: Math.min(params.nRb, 24),
                showLabels: true,
              }
            : v,
        );
        break;
      }
      case 'ssbRateMatch': {
        // SSB rate-matching / collision: Slot 0 at SSB RBs
        setSelectedSlot(params.ssbSlots[0] ?? 0);
        setView((v) =>
          v
            ? {
                ...v,
                prbStart: Math.max(0, params.ssbRbOffset - 2),
                prbCount: Math.min(params.nRb, 24),
                showLabels: true,
              }
            : v,
        );
        break;
      }
    }
  };

  if (loading) {
    return <CenterMessage title="Loading cell profile…" body="Reading cell_profile.json" />;
  }
  if (error || !profileFile || !profile || !params || !view || !viewClamped || !grid) {
    return (
      <CenterMessage
        title="No cell profile"
        body={error ?? 'Generate it first with:  npm run gen:profile -- --config <gnb.yml>'}
        error
      />
    );
  }


  return (
    <div className="min-h-full">
      <Header
        profileFile={profileFile}
        profile={profile}
        selectedCellIdx={selectedCellIdx}
        onSelectCell={setSelectedCellIdx}
        liveConnected={live.connected}
        liveConnecting={live.connecting}
        liveError={live.error}
        onReconnect={live.reconnect}
        activeUeCount={live.activeUeCount}
        totalDlMbps={live.totalDlMbps}
      />

      <main className="mx-auto max-w-[1800px] p-3 space-y-3">
        {/* Slot Navigator */}
        <SlotNavigator
          params={params}
          selectedSlot={selectedSlot}
          onSelect={setSelectedSlot}
          pdschSlotPrbs={live.pdschSlotPrbs}
          puschSlotPrbs={live.puschSlotPrbs}
        />

        {/* Viewport & Channel Legend Toolbar directly above Canvas */}
        <GridToolbar
          profile={profile}
          params={params}
          setParams={(updater) => setParams((p) => (p ? updater(p) : p))}
          view={view}
          setView={(updater) => setView((curr) => (curr ? updater(curr) : curr))}
          pinnedOwners={pinnedOwners}
          onHoverOwners={setHoverOwners}
          onPinOwners={setPinnedOwners}
          onSelectChannel={handleChannelClick}
        />

        <div className="card p-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-edge/60 pb-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-ink">
                Slot #{selectedSlot} ({grid.direction === 'D' ? 'Downlink DL' : grid.direction === 'U' ? 'Uplink UL' : 'Special Slot'})
              </span>
              <span className="text-subtle">&middot;</span>
              <span className="text-subtle">
                Viewing <span className="num font-semibold text-ink">{viewClamped.prbCount}</span> PRBs (PRB {viewClamped.prbStart}&ndash;{viewClamped.prbStart + viewClamped.prbCount - 1})
              </span>
              <span className="text-subtle">&middot;</span>
              <span className="text-subtle">
                {grid.symbolsPerSlot} OFDM Symbols
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs text-accent font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Real-time OCUDU: {activePrbs} / {params.nRb} PRBs active ({activePct}%)</span>
              </div>
              {live.timestamp && (
                <span className="text-[11px] text-subtle font-mono">
                  Last update: {new Date(live.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Live allocation verification pill */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs bg-panel/60 rounded px-2.5 py-1 text-subtle">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">● Scheduled Spectrum:</span>
              <span className="text-ink font-medium">PRB 0 &ndash; {Math.max(0, activePrbs - 1)} ({activePrbs} PRBs)</span>
              <span className="text-subtle">|</span>
              <span className="text-slate-400 font-semibold">○ Idle Spectrum:</span>
              <span className="text-ink font-medium">PRB {activePrbs} &ndash; {params.nRb - 1} ({Math.max(0, params.nRb - activePrbs)} PRBs)</span>
            </div>
            <div className="text-[11px] text-subtle">
              {grid.direction === 'D' || grid.direction === 'S' ? 'PDSCH DL Allocation' : 'PUSCH UL Allocation'}
            </div>
          </div>

          <GridCanvas
            grid={grid}
            prbStart={viewClamped.prbStart}
            prbCount={viewClamped.prbCount}
            zoom={viewClamped.zoom}
            showLabels={viewClamped.showLabels}
            emphasized={emphasized}
            selected={selectedRe}
            onSelect={setSelectedRe}
            activePrbs={activePrbs}
          />
        </div>

        {/* Realtime Active UEs Telemetry Panel */}
        <LiveUePanel
          ueList={live.ueList}
          paused={live.paused}
          totalDlMbps={live.totalDlMbps}
          totalUlKbps={live.totalUlKbps}
        />

        {/* 3GPP Specification Cards placed below Active UEs Telemetry */}
        <ControlRail
          profile={profile}
          params={params}
        />
      </main>

      <Footer profileFile={profileFile} />
    </div>
  );
}

function CenterMessage({ title, body, error }: { title: string; body: string; error?: boolean }) {
  return (
    <div className="grid min-h-full place-items-center p-8">
      <div className={`card max-w-md p-6 text-center ${error ? 'border-[#e56b6b]/50' : ''}`}>
        <h1 className="mb-2 text-lg font-semibold text-ink">{title}</h1>
        <p className="whitespace-pre-line text-sm text-subtle">{body}</p>
      </div>
    </div>
  );
}
