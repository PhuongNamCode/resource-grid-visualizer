// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Owner, type SlotGrid } from '../types';
import { CHANNEL_STYLES } from '../theme';
import { SUBCARRIERS_PER_RB, SYMBOLS_PER_SLOT, findUeForPrb, type UePrbSlice } from '../mapping';

export interface Selection {
  k: number;
  l: number;
}

export interface GridCanvasProps {
  grid: SlotGrid;
  prbStart: number;
  prbCount: number;
  zoom: number;
  showLabels?: boolean;
  emphasized: Owner | Owner[] | null;
  selected: Selection | null;
  onSelect: (sel: Selection) => void;
  activePrbs?: number;
  ueSlices?: UePrbSlice[];
  selectedUeIndex?: number | null;
}

const MARGIN = { left: 64, right: 16, top: 20, bottom: 32 };

function baseCellSize(prbCount: number): { cw: number; ch: number } {
  if (prbCount <= 12) return { cw: 92, ch: 24 };
  if (prbCount <= 24) return { cw: 84, ch: 18 };
  if (prbCount <= 51) return { cw: 72, ch: 13 };
  if (prbCount <= 106) return { cw: 62, ch: 10 };
  return { cw: 58, ch: 9 };
}

export function GridCanvas({
  grid,
  prbStart,
  prbCount,
  zoom,
  emphasized,
  selected,
  onSelect,
  activePrbs,
  ueSlices = [],
  selectedUeIndex = null,
}: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setContainerWidth(el.clientWidth);
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geom = useMemo(() => {
    const { cw, ch } = baseCellSize(prbCount);
    const availableW = containerWidth > 0 ? containerWidth - MARGIN.left - MARGIN.right - 24 : 0;
    const autoCw = availableW > 0 ? Math.floor(availableW / SYMBOLS_PER_SLOT) : cw;
    const effectiveCw = Math.max(cw, autoCw);

    const cellW = effectiveCw * zoom;
    const cellH = ch * zoom;
    const visSc = prbCount * SUBCARRIERS_PER_RB;
    const topSc = (prbStart + prbCount) * SUBCARRIERS_PER_RB - 1;
    const width = MARGIN.left + SYMBOLS_PER_SLOT * cellW + MARGIN.right;
    const height = MARGIN.top + visSc * cellH + MARGIN.bottom;
    return { cellW, cellH, visSc, topSc, width, height };
  }, [prbCount, prbStart, zoom, containerWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    animId = requestAnimationFrame(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { cellW, cellH, visSc, topSc, width, height } = geom;

      if (canvas.width !== Math.ceil(width * dpr)) {
        canvas.width = Math.ceil(width * dpr);
      }
      if (canvas.height !== Math.ceil(height * dpr)) {
        canvas.height = Math.ceil(height * dpr);
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const isOwnerEmphasized = (owner: Owner): boolean => {
        if (emphasized === null) return true;
        if (Array.isArray(emphasized)) return emphasized.includes(owner);
        return emphasized === owner;
      };

      // Always show label text of RE channels (permanent, cannot be disabled)
      const canRenderText = cellH >= 6 && cellW >= 12;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      if (canRenderText) {
        const fontSize = Math.min(11, Math.max(7, Math.floor(cellH * 0.65)));
        ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      }

      // Fast RE cells rendering
      for (let row = 0; row < visSc; row++) {
        const kGlobal = topSc - row;
        if (kGlobal < 0 || kGlobal >= grid.subcarriers) continue;
        const y = MARGIN.top + row * cellH;
        const prbGlobal = Math.floor(kGlobal / SUBCARRIERS_PER_RB);

        for (let l = 0; l < SYMBOLS_PER_SLOT; l++) {
          const owner = grid.owners[l * grid.subcarriers + kGlobal] as Owner;
          const style = CHANNEL_STYLES[owner];
          const match = isOwnerEmphasized(owner);
          let dim = emphasized !== null && !match && owner !== Owner.Empty && owner !== Owner.Guard;
          const x = MARGIN.left + l * cellW;

          // Check if this RE belongs to a UE-dedicated channel (PDSCH, PUSCH, PUCCH, DM-RS)
          const isUeChannel =
            owner === Owner.PdschData ||
            owner === Owner.PdschDmrs ||
            owner === Owner.PuschData ||
            owner === Owner.PuschDmrs ||
            owner === Owner.Pucch;

          const ueForRb = isUeChannel && ueSlices.length > 0 ? findUeForPrb(ueSlices, prbGlobal) : undefined;

          // If a specific UE is selected, dim other UEs' channels
          if (selectedUeIndex !== null && selectedUeIndex !== undefined) {
            if (isUeChannel && ueForRb && ueForRb.ueIndex !== selectedUeIndex) {
              dim = true;
            }
          }

          // Custom colors & text if belonging to an active UE
          let fill = style.fill;
          let border = style.border;
          let textColor = style.text;
          let labelText = style.short;

          if (ueForRb) {
            const isDmrs = owner === Owner.PdschDmrs || owner === Owner.PuschDmrs;
            fill = isDmrs ? ueForRb.theme.dmrs : ueForRb.theme.fill;
            border = ueForRb.theme.border;
            textColor = isDmrs ? '#07130c' : ueForRb.theme.text;

            // Differentiated text label per UE
            if (cellW >= 55) {
              labelText = isDmrs ? `U${ueForRb.ueIndex}:DMRS` : owner === Owner.Pucch ? `U${ueForRb.ueIndex}:PUCCH` : `U${ueForRb.ueIndex}:${style.short}`;
            } else if (cellW >= 34) {
              labelText = isDmrs ? `DMRS-U${ueForRb.ueIndex}` : `UE${ueForRb.ueIndex}`;
            } else {
              labelText = isDmrs ? `D${ueForRb.ueIndex}` : `U${ueForRb.ueIndex}`;
            }
          }

          ctx.globalAlpha = dim ? 0.15 : 1;
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, cellW, cellH);

          // Subcarrier cell border
          if (cellH >= 3 && cellW >= 3) {
            ctx.strokeStyle = dim ? 'rgba(0,0,0,0.2)' : border;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
          }

          // Always render channel text labels (unconditional, permanent for all channel cells)
          if (canRenderText && labelText && owner !== Owner.Empty && owner !== Owner.Guard) {
            ctx.globalAlpha = dim ? 0.2 : 1;
            ctx.fillStyle = textColor;
            ctx.fillText(labelText, x + cellW / 2, y + cellH / 2);
          }
        }
      }
      ctx.globalAlpha = 1;

      // PRB gridlines (every 12 subcarriers)
      ctx.strokeStyle = 'rgba(180,200,230,0.18)';
      ctx.lineWidth = 1;
      const showEveryRb = prbCount <= 24 ? 1 : prbCount <= 51 ? 2 : prbCount <= 106 ? 5 : 10;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'right';

      for (let rb = 0; rb <= prbCount; rb++) {
        const scFromTop = visSc - rb * SUBCARRIERS_PER_RB;
        const y = MARGIN.top + scFromTop * cellH;
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, y);
        ctx.lineTo(MARGIN.left + SYMBOLS_PER_SLOT * cellW, y);
        ctx.stroke();

        if (rb < prbCount && rb % showEveryRb === 0) {
          const currentRb = prbStart + rb;
          const yc = y - (SUBCARRIERS_PER_RB * cellH) / 2;
          const isScheduledRb = activePrbs !== undefined && currentRb < activePrbs;
          const ueForRb = ueSlices.length > 0 ? findUeForPrb(ueSlices, currentRb) : undefined;

          if (ueForRb) {
            // Draw UE color badge on PRB axis
            ctx.fillStyle = ueForRb.theme.fill;
            ctx.fillRect(MARGIN.left - 52, yc - 5, 3, 10);
            ctx.fillStyle = ueForRb.theme.badgeText;
            ctx.font = 'bold 9px ui-monospace, monospace';
            ctx.fillText(`U${ueForRb.ueIndex}`, MARGIN.left - 40, yc);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`RB ${currentRb}`, MARGIN.left - 6, yc);
          } else {
            ctx.fillStyle = isScheduledRb ? '#60a5fa' : '#8aa0bd';
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`RB ${currentRb}`, MARGIN.left - 8, yc);
          }
        }
      }

      // Prominent OCUDU Scheduler Allocation Boundary Line
      if (activePrbs !== undefined && activePrbs > 0 && activePrbs < grid.nRb) {
        const activeRbRel = activePrbs - prbStart;
        if (activeRbRel >= 0 && activeRbRel <= prbCount) {
          const scFromTop = visSc - activeRbRel * SUBCARRIERS_PER_RB;
          const y = MARGIN.top + scFromTop * cellH;

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(MARGIN.left, y);
          ctx.lineTo(MARGIN.left + SYMBOLS_PER_SLOT * cellW, y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Boundary indicator tag
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px ui-monospace, monospace';
          ctx.textAlign = 'right';
          ctx.fillText(
            `⚡ OCUDU SCHEDULED CUTOFF (${activePrbs} PRBs)`,
            MARGIN.left + SYMBOLS_PER_SLOT * cellW - 10,
            y - 5,
          );
        }
      }

      // Symbol axis labels + vertical column separators
      ctx.textAlign = 'center';
      for (let l = 0; l <= SYMBOLS_PER_SLOT; l++) {
        const x = MARGIN.left + l * cellW;
        ctx.strokeStyle = 'rgba(180,200,230,0.12)';
        ctx.beginPath();
        ctx.moveTo(x, MARGIN.top);
        ctx.lineTo(x, MARGIN.top + visSc * cellH);
        ctx.stroke();

        if (l < SYMBOLS_PER_SLOT) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '600 11px ui-monospace, monospace';
          ctx.fillText(`Sym ${l}`, x + cellW / 2, MARGIN.top + visSc * cellH + 15);
        }
      }

      // Selection ring
      if (selected) {
        const row = topSc - selected.k;
        if (row >= 0 && row < visSc && selected.l >= 0 && selected.l < SYMBOLS_PER_SLOT) {
          const x = MARGIN.left + selected.l * cellW;
          const y = MARGIN.top + row * cellH;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
          ctx.strokeStyle = '#3ba7ff';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
        }
      }
    });

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [geom, grid, emphasized, selected, prbStart, prbCount, activePrbs, ueSlices, selectedUeIndex]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - MARGIN.left;
    const y = e.clientY - rect.top - MARGIN.top;
    const { cellW, cellH, visSc, topSc } = geom;
    const l = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (l < 0 || l >= SYMBOLS_PER_SLOT || row < 0 || row >= visSc) return;
    const k = topSc - row;
    if (k < 0 || k >= grid.subcarriers) return;
    onSelect({ k, l });
  };

  return (
    <div
      ref={containerRef}
      className="overflow-auto max-h-[820px] rounded-lg border border-edge bg-[#070b13] p-2 flex justify-center"
    >
      <canvas ref={canvasRef} onClick={handleClick} className="cursor-crosshair block" />
    </div>
  );
}
