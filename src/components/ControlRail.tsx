// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { memo, type ReactNode } from 'react';
import type { CellProfile, GridParams } from '../types';
import { coreset0Entry } from '../mapping';

export interface ViewState {
  prbCount: number;
  prbStart: number;
  zoom: number;
  showLabels: boolean;
}

interface ControlRailProps {
  profile: CellProfile;
  params: GridParams;
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>{title}</span>
        {subtitle && <span className="text-[11px] font-normal text-subtle">{subtitle}</span>}
      </div>
      <div className="space-y-2.5 p-3">{children}</div>
    </div>
  );
}

function ReadOnlySpecRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: ReactNode;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-subtle">{label}</span>
      <div className="flex items-center gap-1.5 font-medium text-ink">
        <span className="num">{value}</span>
        {badge && (
          <span className="rounded bg-accent/15 px-1 py-0.2 text-[10px] text-accent">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export const ControlRail = memo(function ControlRail({
  profile,
  params,
}: ControlRailProps) {
  const cs0 = coreset0Entry(params.coreset0Index);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Read-only RF Carrier & Numerology */}
      <Section title="Carrier & Numerology" subtitle="TS 38.101-1">
        <div className="divide-y divide-edge/50">
          <ReadOnlySpecRow label="Operating Band" value={profile.band ?? 'n78'} badge="FR1" />
          <ReadOnlySpecRow label="Carrier Bandwidth" value={`${profile.channelBandwidthMhz} MHz`} />
          <ReadOnlySpecRow
            label="Sub-carrier Spacing"
            value={`${params.scsKhz} kHz`}
            badge={`μ=${Math.log2(params.scsKhz / 15)}`}
          />
          <ReadOnlySpecRow
            label="Bandwidth (N_RB)"
            value={`${params.nRb} PRBs`}
            badge={`${params.nRb * 12} SCs`}
          />
          <ReadOnlySpecRow label="Duplex Mode" value={params.duplex} />
          {profile.dlArfcn && <ReadOnlySpecRow label="DL ARFCN" value={profile.dlArfcn} />}
          {profile.nAntDl && (
            <ReadOnlySpecRow label="MIMO Antennas" value={`${profile.nAntDl}T${profile.nAntUl}R`} />
          )}
        </div>
      </Section>

      {/* Read-only TDD Pattern */}
      {params.duplex === 'TDD' && params.tdd && (
        <Section title="TDD Frame Pattern" subtitle="TS 38.213 §11.1">
          <div className="divide-y divide-edge/50">
            <ReadOnlySpecRow
              label="Period"
              value={`${params.tdd.periodSlots} slots (${params.tdd.periodSlots * (1 / (params.scsKhz / 15))} ms)`}
            />
            <ReadOnlySpecRow label="Downlink Slots" value={`${params.tdd.nofDlSlots} slots`} />
            <ReadOnlySpecRow
              label="Special Slots"
              value={`${params.tdd.nofDlSymbols}D + ${params.tdd.nofUlSymbols}U symbols`}
            />
            <ReadOnlySpecRow label="Uplink Slots" value={`${params.tdd.nofUlSlots} slots`} />
          </div>
        </Section>
      )}

      {/* Read-only Sync & Control Channels */}
      <Section title="Sync & Control" subtitle="TS 38.211 / 213">
        <div className="divide-y divide-edge/50">
          <ReadOnlySpecRow
            label="SS/PBCH Block"
            value={`Offset ${params.ssbRbOffset} RB`}
            badge={`Sym ${params.ssbStartSymbol}`}
          />
          <ReadOnlySpecRow
            label="CORESET#0"
            value={`Idx ${params.coreset0Index} (${cs0.nRb} RB)`}
            badge={`${cs0.symbols} sym`}
          />
          <ReadOnlySpecRow label="DMRS Type A" value={`pos${params.dmrsTypeAPos} (l0=${params.dmrsTypeAPos})`} />
          {params.prachConfigIndex !== null && (
            <ReadOnlySpecRow label="PRACH Config Index" value={params.prachConfigIndex} />
          )}
        </div>
      </Section>
    </div>
  );
});
