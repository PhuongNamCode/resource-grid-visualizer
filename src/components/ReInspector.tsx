import { memo } from 'react';
import { Owner, type SlotGrid } from '../types';
import { CHANNEL_STYLES } from '../theme';
import { ownerAt, OWNER_SPEC, SPEC_REFS, SUBCARRIERS_PER_RB, findUeForPrb, type UePrbSlice } from '../mapping';
import type { Selection } from './GridCanvas';

interface ReInspectorProps {
  grid: SlotGrid;
  selected: Selection | null;
  ueSlices?: UePrbSlice[];
}

export const ReInspector = memo(function ReInspector({ grid, selected, ueSlices = [] }: ReInspectorProps) {
  return (
    <div className="card">
      <div className="card-header">Selected RE inspector</div>
      {!selected ? (
        <p className="px-3 py-4 text-sm text-subtle">
          Click any resource element on the grid to inspect its coordinates, owning channel, and 3GPP citation.
        </p>
      ) : (
        <Details grid={grid} selected={selected} ueSlices={ueSlices} />
      )}
    </div>
  );
});

function Details({ grid, selected, ueSlices }: { grid: SlotGrid; selected: Selection; ueSlices: UePrbSlice[] }) {
  const owner = ownerAt(grid, selected.k, selected.l);
  const style = CHANNEL_STYLES[owner];
  const rb = Math.floor(selected.k / SUBCARRIERS_PER_RB);
  const scInRb = selected.k % SUBCARRIERS_PER_RB;
  const specKey = OWNER_SPEC[owner];
  const spec = specKey ? SPEC_REFS[specKey] : null;

  const isUeChannel =
    owner === Owner.PdschData ||
    owner === Owner.PdschDmrs ||
    owner === Owner.PuschData ||
    owner === Owner.PuschDmrs ||
    owner === Owner.Pucch;
  const ueForRb = isUeChannel && ueSlices ? findUeForPrb(ueSlices, rb) : undefined;

  const fill = ueForRb ? (owner === Owner.PdschDmrs || owner === Owner.PuschDmrs ? ueForRb.theme.dmrs : ueForRb.theme.fill) : style.fill;
  const border = ueForRb ? ueForRb.theme.border : style.border;

  return (
    <div className="space-y-3 px-3 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: fill, border: `1px solid ${border}` }} />
          <span className="font-semibold text-ink">
            {ueForRb ? `${ueForRb.theme.name}: ${style.label}` : style.label}
          </span>
        </div>
        {ueForRb && (
          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: ueForRb.theme.badgeBg, color: ueForRb.theme.badgeText }}>
            {ueForRb.theme.name} (0x{ueForRb.rnti.toString(16).toUpperCase()})
          </span>
        )}
      </div>

      {ueForRb && (
        <div className="rounded-md border p-2 text-xs flex items-center justify-between bg-panel/60 border-edge/60">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ueForRb.theme.fill }} />
            <span className="font-semibold text-ink">Dedicated UE Slice:</span>
            <span className="text-subtle">RB {ueForRb.prbStart}&ndash;{ueForRb.prbEnd} ({ueForRb.prbCount} PRBs)</span>
          </div>
          <div className="num font-bold text-[#b5f0cd]">
            {grid.direction === 'U'
              ? `${ueForRb.ulKbps.toFixed(0)} kbps UL`
              : `${ueForRb.dlMbps.toFixed(1)} Mbps DL`}
          </div>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <Field k="Subcarrier k" v={`${selected.k}`} />
        <Field k="OFDM symbol l" v={`${selected.l}`} />
        <Field k="Resource block" v={`RB ${rb}`} />
        <Field k="SC in RB" v={`${scInRb}`} />
        <Field k="Slot" v={`#${grid.slotIndex} (${grid.direction})`} />
        <Field k="Owner" v={owner === Owner.Empty ? 'unused' : style.short || style.label} />
      </dl>
      {spec ? (
        <div className="rounded-md border border-edge bg-panelraised/60 p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-accent">
            {spec.spec} &mdash; {spec.clause}
          </div>
          <div className="mt-0.5 text-[13px] text-ink/90">{spec.title}</div>
        </div>
      ) : (
        <p className="text-xs text-subtle">No channel mapped to this resource element.</p>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-subtle">{k}</dt>
      <dd className="num text-ink">{v}</dd>
    </div>
  );
}
