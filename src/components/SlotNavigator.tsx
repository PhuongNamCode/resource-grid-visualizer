// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { GridParams, SlotDirection } from '../types';
import { slotLayout, periodLength, prachSlotIndex } from '../mapping';

interface SlotNavigatorProps {
  params: GridParams;
  selectedSlot: number;
  onSelect: (slot: number) => void;
  pdschSlotPrbs?: number[];
  puschSlotPrbs?: number[];
}

const DIR_STYLE: Record<SlotDirection, string> = {
  D: 'bg-[#1f6feb]/25 border-[#2f80f0] text-[#bcd6ff]',
  U: 'bg-[#1f9d55]/25 border-[#2bb268] text-[#b5f0cd]',
  S: 'bg-[#f2a541]/20 border-[#f7bd6e] text-[#f6d199]',
};

export function SlotNavigator({
  params,
  selectedSlot,
  onSelect,
  pdschSlotPrbs,
  puschSlotPrbs,
}: SlotNavigatorProps) {
  const len = periodLength(params.duplex, params.tdd);
  const slots = Array.from({ length: len }, (_, i) => i);
  const prachSlot = prachSlotIndex(params);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>
            {params.duplex === 'TDD' ? `TDD frame (period ${len} slots)` : 'FDD frame (downlink carrier)'}
          </span>
          <span className="chip border border-accent/40 bg-accent/15 px-1.5 py-0.2 text-[10px] text-accent font-semibold">
            ⚡ Realtime Slot Load
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-subtle/90">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#d64545]" />
            <span>SSB Sync: Slot #0</span>
          </span>
          {prachSlot >= 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#b06bd6]" />
              <span>PRACH: Slot #{prachSlot}</span>
            </span>
          )}
          <span>D = DL, U = UL, S = Special</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2.5">
        {slots.map((s) => {
          const dir = slotLayout(params.duplex, params.tdd, s).direction;
          const active = s === selectedSlot;
          const hasSsb = params.ssbSlots.includes(s);
          const hasPrach = s === prachSlot;
          const prbs =
            dir === 'D' || dir === 'S'
              ? pdschSlotPrbs?.[s]
              : dir === 'U'
                ? puschSlotPrbs?.[s]
                : undefined;

          const pct =
            prbs !== undefined && params.nRb > 0
              ? Math.min(100, Math.round((prbs / params.nRb) * 100))
              : null;

          return (
            <button
              key={s}
              type="button"
              onClick={() => onSelect(s)}
              className={`num relative flex min-w-[58px] flex-1 flex-col items-center rounded-md border px-1.5 py-1 text-xs transition overflow-hidden cursor-pointer ${
                DIR_STYLE[dir]
              } ${active ? 'ring-2 ring-white shadow-md' : 'opacity-85 hover:opacity-100'}`}
            >
              <div className="flex w-full items-center justify-between text-[10px] font-bold px-0.5">
                <span>#{s}</span>
                <div className="flex items-center gap-1">
                  {hasSsb && (
                    <span
                      className="rounded bg-red-600/90 text-[8px] font-extrabold text-white px-1 leading-tight tracking-wider shadow-sm"
                      title="Slot carries SSB Burst (PSS/SSS/PBCH at PRB 56-75, Sym 2-5)"
                    >
                      SSB
                    </span>
                  )}
                  {hasPrach && (
                    <span
                      className="rounded bg-purple-600/90 text-[8px] font-extrabold text-white px-1 leading-tight tracking-wider shadow-sm"
                      title="Slot carries PRACH occasion (PRB 0-11, UL symbols)"
                    >
                      PRACH
                    </span>
                  )}
                  <span className="opacity-75">{dir}</span>
                </div>
              </div>
              {pct !== null ? (
                <span className="text-[11px] font-semibold tracking-tight mt-0.5">
                  {prbs} <span className="text-[8px] font-normal opacity-75">RB</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold mt-0.5">{dir}</span>
              )}
              {pct !== null && (
                <div className="w-full bg-black/40 h-1 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      dir === 'U' ? 'bg-[#2bb268]' : dir === 'S' ? 'bg-[#f7bd6e]' : 'bg-[#2f80f0]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
