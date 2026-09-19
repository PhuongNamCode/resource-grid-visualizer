// Copyright (C) 2026 NeuroRAN. All rights reserved.

import type { CellProfileFile } from '../types';

export function Footer({ profileFile }: { profileFile: CellProfileFile }) {
  return (
    <footer className="mt-6 border-t border-edge px-4 py-3 text-center text-[11px] text-subtle/70">
      Source config: <span className="num">{profileFile.sourceConfig}</span> &middot; generated{' '}
      {new Date(profileFile.generatedAt).toLocaleString()} &middot; Copyright (C) 2026 NeuroRAN. All rights reserved.
    </footer>
  );
}
