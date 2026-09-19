// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { Owner } from '../types';
import { CHANNEL_STYLES, LEGEND_ORDER } from '../theme';

interface LegendProps {
  /** Currently pinned (clicked) channel, if any. */
  pinned: Owner | null;
  /** Hover in/out (null on leave). */
  onHover: (owner: Owner | null) => void;
  /** Toggle a pinned channel. */
  onPin: (owner: Owner) => void;
}

export function Legend({ pinned, onHover, onPin }: LegendProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {LEGEND_ORDER.map((owner) => {
        const s = CHANNEL_STYLES[owner];
        const active = pinned === owner;
        return (
          <button
            key={owner}
            type="button"
            onMouseEnter={() => onHover(owner)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onPin(owner)}
            className={`chip border transition ${
              active ? 'ring-2 ring-white/70' : 'border-edge hover:border-white/40'
            }`}
            style={{ backgroundColor: `${s.fill}22`, borderColor: s.border }}
            title={`${s.label} - click to pin, hover to isolate`}
          >
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.fill, border: `1px solid ${s.border}` }} />
            <span className="text-ink/90">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
