// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { useEffect, useState } from 'react';
import type { CellProfileFile } from '../types';

interface ProfileState {
  data: CellProfileFile | null;
  error: string | null;
  loading: boolean;
}

/** Load the generated cell_profile.json (produced by scripts/gnb_to_profile.mjs). */
export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}cell_profile.json`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: CellProfileFile) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            error: `Could not load cell_profile.json (${String(e)}). Run: npm run gen:profile`,
            loading: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
