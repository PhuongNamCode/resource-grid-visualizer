// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { CellProfile, ChannelToggles, GridParams, Owner } from '../types';
import type { ViewState } from './ControlRail';
import { Owner as OwnerEnum } from '../types';

interface GridToolbarProps {
  profile: CellProfile;
  params: GridParams;
  setParams: (updater: (p: GridParams) => GridParams) => void;
  view: ViewState;
  setView: (updater: (v: ViewState) => ViewState) => void;
  pinnedOwners: Owner[] | null;
  onHoverOwners: (owners: Owner[] | null) => void;
  onPinOwners: (owners: Owner[]) => void;
  onSelectChannel?: (layerId: string, owners: Owner[]) => void;
}

interface ChannelLayerDef {
  id: string;
  label: string;
  toggleKey: keyof ChannelToggles;
  owners: Owner[];
  swatches: { color: string; tooltip?: string }[];
}

const CHANNEL_LAYERS: ChannelLayerDef[] = [
  {
    id: 'pdcch',
    label: 'PDCCH / CORESET',
    toggleKey: 'pdcch',
    owners: [OwnerEnum.Pdcch],
    swatches: [{ color: '#f2a541', tooltip: 'CORESET#0 / Type0 CSS' }],
  },
  {
    id: 'pdsch',
    label: 'PDSCH + DM-RS',
    toggleKey: 'pdsch',
    owners: [OwnerEnum.PdschData, OwnerEnum.PdschDmrs],
    swatches: [
      { color: '#1f6feb', tooltip: 'PDSCH Data' },
      { color: '#7ea8ff', tooltip: 'PDSCH DM-RS' },
    ],
  },
  {
    id: 'pusch',
    label: 'PUSCH + DM-RS',
    toggleKey: 'pusch',
    owners: [OwnerEnum.PuschData, OwnerEnum.PuschDmrs],
    swatches: [
      { color: '#1f9d55', tooltip: 'PUSCH Data' },
      { color: '#7ee0a6', tooltip: 'PUSCH DM-RS' },
    ],
  },
  {
    id: 'pucch',
    label: 'PUCCH',
    toggleKey: 'pucch',
    owners: [OwnerEnum.Pucch],
    swatches: [{ color: '#e0529c', tooltip: 'PUCCH Format 0/1/2' }],
  },
  {
    id: 'ssb',
    label: 'SSB',
    toggleKey: 'ssb',
    owners: [OwnerEnum.SsbPss, OwnerEnum.SsbSss, OwnerEnum.SsbPbch],
    swatches: [
      { color: '#d64545', tooltip: 'PSS' },
      { color: '#c0392b', tooltip: 'SSS' },
      { color: '#8e2f2f', tooltip: 'PBCH' },
    ],
  },
  {
    id: 'prach',
    label: 'PRACH',
    toggleKey: 'prach',
    owners: [OwnerEnum.Prach],
    swatches: [{ color: '#b06bd6', tooltip: 'PRACH preamble' }],
  },
  {
    id: 'csirs',
    label: 'CSI-RS',
    toggleKey: 'csirs',
    owners: [OwnerEnum.CsiRs],
    swatches: [{ color: '#20c5c5', tooltip: 'CSI-RS NZP' }],
  },
  {
    id: 'ssbRateMatch',
    label: 'SSB rate-matching',
    toggleKey: 'ssbRateMatch',
    owners: [OwnerEnum.Collision],
    swatches: [{ color: '#ff2d2d', tooltip: 'PDSCH-SSB Collision (when rate-matching off)' }],
  },
];

export function GridToolbar({
  profile,
  params,
  setParams,
  view,
  setView,
  pinnedOwners,
  onHoverOwners,
  onPinOwners,
  onSelectChannel,
}: GridToolbarProps) {
  const prbOptions = Array.from(
    new Set([12, 24, 51, 106, 133, 273, profile.nRb].filter((n) => n <= profile.nRb)),
  ).sort((a, b) => a - b);

  const toggleLayer = (key: keyof ChannelToggles) => {
    setParams((p) => ({
      ...p,
      toggles: { ...p.toggles, [key]: !p.toggles[key] },
    }));
  };

  const isLayerPinned = (layerOwners: Owner[]): boolean => {
    if (!pinnedOwners || pinnedOwners.length === 0) return false;
    return layerOwners.some((o) => pinnedOwners.includes(o));
  };

  return (
    <div className="card p-2 px-3 flex flex-wrap items-center gap-2 text-xs">
      {/* Viewport Controls: Visible PRBs & Start PRB */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-subtle font-medium">Visible PRBs:</span>
          <select
            className="select text-xs py-1 px-2 w-auto font-medium cursor-pointer"
            value={view.prbCount}
            onChange={(e) =>
              setView((v) => ({ ...v, prbCount: Number(e.target.value), prbStart: 0 }))
            }
          >
            {prbOptions.map((n) => (
              <option key={n} value={n}>
                {n} PRBs{n === profile.nRb ? ' (fit all)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-subtle font-medium">Start PRB:</span>
          <span className="num font-semibold text-ink w-6 text-right">{view.prbStart}</span>
          <input
            type="range"
            className="w-24 accent-accent cursor-pointer"
            min={0}
            max={Math.max(0, params.nRb - view.prbCount)}
            value={view.prbStart}
            onChange={(e) => setView((v) => ({ ...v, prbStart: Number(e.target.value) }))}
          />
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="hidden sm:block h-4 w-px bg-edge/70 mx-1 shrink-0" />

      {/* Channel Display Layers */}
      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {CHANNEL_LAYERS.map((layer) => {
          const isEnabled = params.toggles[layer.toggleKey];
          const isPinned = isLayerPinned(layer.owners);

          return (
            <div
              key={layer.id}
              onMouseEnter={() => onHoverOwners(layer.owners)}
              onMouseLeave={() => onHoverOwners(null)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition select-none ${
                isPinned
                  ? 'ring-2 ring-accent border-accent bg-accent/20 shadow-md'
                  : isEnabled
                    ? 'border-edge hover:border-white/50 bg-panelraised/90'
                    : 'border-edge/30 bg-panel/30 opacity-40 hover:opacity-75'
              }`}
            >
              {/* Clickable Tick Square Checkbox */}
              <input
                type="checkbox"
                id={`toggle-${layer.id}`}
                className="h-3.5 w-3.5 rounded accent-accent cursor-pointer"
                checked={isEnabled}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleLayer(layer.toggleKey);
                }}
                title={`Tick/untick to show/hide ${layer.label} on resource grid`}
              />

              {/* Swatch & Channel Name (click to focus channel and pin / unpin) */}
              <button
                type="button"
                onClick={() => {
                  if (onSelectChannel) {
                    onSelectChannel(layer.id, layer.owners);
                  } else {
                    onPinOwners(isPinned ? [] : layer.owners);
                  }
                }}
                className="inline-flex items-center gap-1.5 focus:outline-none cursor-pointer"
                title={`${layer.label} - click to view channel and isolate`}
              >
                <div className="inline-flex items-center gap-1 shrink-0">
                  {layer.swatches.map((swatch, idx) => (
                    <span
                      key={idx}
                      className="h-3 w-3 rounded-sm shrink-0 border"
                      style={{
                        backgroundColor: swatch.color,
                        borderColor: isEnabled ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
                      }}
                      title={swatch.tooltip}
                    />
                  ))}
                </div>
                <span
                  className={`font-medium ${
                    isEnabled ? (isPinned ? 'text-white font-bold' : 'text-ink') : 'text-subtle line-through'
                  }`}
                >
                  {layer.label}
                </span>
              </button>
            </div>
          );
        })}

        {pinnedOwners && pinnedOwners.length > 0 && (
          <button
            type="button"
            onClick={() => onPinOwners([])}
            className="text-[11px] text-accent hover:underline font-medium cursor-pointer ml-auto shrink-0"
          >
            Clear Pin
          </button>
        )}
      </div>
    </div>
  );
}
