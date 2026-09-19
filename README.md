# resource-grid-visualizer

Config-driven, 3GPP-accurate **5G NR Resource-Element (RE) grid & channel mapper**
for OCUDU / srsRAN-style gNBs. It renders where every physical channel and
signal (SSB, PDCCH/CORESET#0, PDSCH+DM-RS, PUSCH+DM-RS, PUCCH, PRACH, CSI-RS)
is mapped in the time-frequency grid for a selected slot, computed **from the
gNB's own config file** per 3GPP TS 38.211 / 213 / 214 / 104.

It is the OCUDU-native analogue of interactive tools like WirelessBrew's
"NR RE Grid & Channel Mapper", but instead of hand-entered parameters it is
driven by the real deployed configuration.

## Detailed Documentation

For an exhaustive breakdown of every channel, source parameters, mathematical derivation, and WebSocket telemetry pipeline, refer to:
📖 **[DATA_SOURCES_AND_CHANNEL_MAPPING.md](file:///home/namnp/ocudu-deployment/resource-grid-visualizer/DATA_SOURCES_AND_CHANNEL_MAPPING.md)**

## What it shows (and the data pipeline)

- **Static 3GPP Specification & Physical Layout**: Where each physical channel (SSB, CORESET#0, PUCCH, PRACH, CSI-RS) is standardized to reside for any slot, derived from `config/generated/gnb.yml` per TS 38.211 / 213 / 214.
- **Dynamic Live MAC Telemetry**: Real-time WebSocket connection to `ocudu-dpdk-gnb` on port `8001` streaming active PDSCH/PUSCH scheduled PRBs, connected UEs, throughput, and link adaptation metrics.

## Scalable: reuse with any gNB by changing only the config

Nothing about a specific cell is hardcoded. All RF parameters come from the
config file; all geometry comes from generic 3GPP tables. To target a different
gNB, regenerate the profile:

```bash
npm run gen:profile -- --config /path/to/other-gnb.yml
# or
GNB_CONFIG=/path/to/other-gnb.yml npm run gen:profile
```

The loader (`scripts/gnb_to_profile.mjs`) is the only component that reads YAML.
It handles single-cell (`cell_cfg:`) and multi-cell (`cells:` merged over
`cell_cfg`) configs, TDD and FDD, and emits `public/cell_profile.json`
(a `CellProfile[]`). The UI shows a cell selector when more than one cell exists.

Default config: `../config/generated/gnb.yml`.

## Quick start

```bash
npm install
npm run gen:profile        # generate cell_profile.json from the default gNB config
npm run dev                # http://localhost:5173
```

Other scripts:

```bash
npm run build              # typecheck + production build to dist/
npm test                   # engine unit tests (vitest)
```

## Validate vs live gNB (optional)

The header has a **"Validate vs live gNB"** button. It connects to the OCUDU
metrics WebSocket (`remote_control`, default `ws://<host>:8001`) using the same
`{"cmd":"metrics_subscribe"}` handshake as `scripts/get_pm_data.py`, reads one
metrics batch, and confirms the config-derived geometry is consistent with live
telemetry (observed max PRB usage must not exceed the derived N_RB, and the
`pdsch/pusch_prbs_used_per_tdd_slot_idx` arrays are present). The header pill
turns green on success.

## 3GPP references

| Aspect | Spec |
| --- | --- |
| Numerology, symbols/slot | TS 38.211 sec 4.2 / 4.3.2 |
| Transmission bandwidth N_RB | TS 38.101-1 Table 5.3.2-1 |
| TDD UL/DL configuration | TS 38.213 sec 11.1 |
| SS/PBCH block | TS 38.211 sec 7.4.3 |
| CORESET#0 (Type0-PDCCH CSS) | TS 38.213 sec 13, Table 13-4 |
| PDSCH / DM-RS | TS 38.211 sec 7.3.1.6 / 7.4.1.1 |
| PUSCH / DM-RS | TS 38.211 sec 6.4.1.2 / 6.4.1.1 |
| PUCCH | TS 38.211 sec 6.3.2 / 9 |
| PRACH | TS 38.211 sec 6.3.3 |
| CSI-RS | TS 38.211 sec 7.4.1.5 |

Each RE's citation is shown in the inspector when you click it.

## Architecture

```
gNB YAML (--config)
   -> scripts/gnb_to_profile.mjs   (only YAML reader)
   -> public/cell_profile.json     (CellProfile[])
   -> src/mapping/*                (3GPP mapping engine, pure TS, unit-tested)
   -> src/components/*             (React + Canvas UI)
```

Config values are seeded into editable parameters (`src/mapping/params.ts`) so
you can explore variations in the UI without mutating the source config; the
"Reset to gNB config" button restores the config-derived defaults.

---

Copyright (C) 2026 NeuroRAN. All rights reserved.
