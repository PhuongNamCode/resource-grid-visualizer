// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { Owner, type SlotGrid } from '../types';
import { CHANNEL_STYLES } from '../theme';
import { ownerAt, OWNER_SPEC, SPEC_REFS, SUBCARRIERS_PER_RB } from '../mapping';
import type { Selection } from './GridCanvas';

interface ReInspectorProps {
  grid: SlotGrid;
  selected: Selection | null;
}

export function ReInspector({ grid, selected }: ReInspectorProps) {
  return (
    <div className="card">
      <div className="card-header">Selected RE inspector</div>
      {!selected ? (
        <p className="px-3 py-4 text-sm text-subtle">
          Click any resource element on the grid to inspect its coordinates, owning channel, and 3GPP citation.
        </p>
      ) : (
        <Details grid={grid} selected={selected} />
      )}
    </div>
  );
}

function Details({ grid, selected }: { grid: SlotGrid; selected: Selection }) {
  const owner = ownerAt(grid, selected.k, selected.l);
  const style = CHANNEL_STYLES[owner];
  const rb = Math.floor(selected.k / SUBCARRIERS_PER_RB);
  const scInRb = selected.k % SUBCARRIERS_PER_RB;
  const specKey = OWNER_SPEC[owner];
  const spec = specKey ? SPEC_REFS[specKey] : null;

  return (
    <div className="space-y-3 px-3 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: style.fill, border: `1px solid ${style.border}` }} />
        <span className="font-semibold text-ink">{style.label}</span>
      </div>
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
