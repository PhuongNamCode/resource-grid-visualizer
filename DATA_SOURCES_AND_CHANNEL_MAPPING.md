# 5G NR Resource Grid Visualizer: Data Sources, Channel Mapping & Architecture Specification

**Version:** 1.2.0  
**Author:** NeuroRAN Engineering  
**Target System:** OCUDU 5G NR gNodeB (srsRAN Project / DPDK 25.11)  
**Standard Compliance:** 3GPP Release 15/16/17 (TS 38.211, TS 38.213, TS 38.214, TS 38.101-1, TS 38.104)

---

## 1. Executive Summary

The **Resource Grid Visualizer** is a config-driven, 3GPP-accurate interactive representation of the 5G NR physical time-frequency resource grid (OFDM symbols × Subcarriers / Physical Resource Blocks).

It bridges two critical layers:
1. **Static 3GPP Physical Layer Structure**: Extracted from the deployed gNodeB configuration (`config/generated/gnb.yml`) and standard 3GPP geometry (TS 38.211 / 213 / 214).
2. **Dynamic Live Spectrum Telemetry**: Streamed in real-time over WebSocket (`ws://<host>:8001`) from the running `ocudu-dpdk-gnb` MAC scheduler, tracking live PRB scheduling and UE bitrates.

---

## 2. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA SOURCES                                    │
├───────────────────────────────┬─────────────────────────────────────────────┤
│  [A] Static gNB Configuration │  [B] Real-time Live Telemetry               │
│      config/generated/gnb.yml │      ocudu-dpdk-gnb (Port 8001 WebSocket)   │
└───────────────┬───────────────┴──────────────────────┬──────────────────────┘
                │                                      │
                ▼                                      ▼
      scripts/gnb_to_profile.mjs             useOcuduLiveMetrics.ts
                │                                      │
                ▼                                      ▼
     public/cell_profile.json              Live Slot Bounds & UEs
    (Band, SCS, N_RB, TDD, PRACH)        (PDSCH/PUSCH PRBs, Mbps, RNTI)
                │                                      │
                └───────────────────┬──────────────────┘
                                    │
                                    ▼
                      src/mapping/grid.ts (Engine)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            Canvas 2D Renderer               React Toolbar &
           (60 FPS, Text Labels,              Slot Navigator
           PRB Bounding, Pins)            (Single-row, Badges)
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                      Docker Container (:8080)
                       Nginx Web Server
```

---

## 3. Data Source Breakdown

The visualizer ingests data across three distinct categories:

### 3.1 Category 1: Real Live Telemetry (Dynamic)
- **Transport**: Native WebSocket streaming on port **`8001`** (`ws://<host>:8001`).
- **Initiation**: Client sends `{ "cmd": "metrics_subscribe" }`.
- **Stream Interval**: ~100 ms (throttled in the frontend to 250 ms / 4 Hz to guarantee smooth 60 FPS rendering).
- **Payload Contents**:
  - `pdsch_prbs_used_per_tdd_slot_idx`: Array of allocated PRBs per downlink slot.
  - `pusch_prbs_used_per_tdd_slot_idx`: Array of allocated PRBs per uplink slot.
  - `ue_list`: Attached UEs with RNTI, DL/UL bitrate, CQI, MCS, and BLER.
  - Cell aggregate bitrate (e.g. ~612 Mbps downlink).

### 3.2 Category 2: Real gNodeB Configuration File (Static)
- **Path**: `config/generated/gnb.yml` (processed by `scripts/gnb_to_profile.mjs`).
- **Extracted Parameters**:
  - `cell_cfg.dl_arfcn: 628334` $\rightarrow$ Operating Band **n78** (3.5 GHz FR1).
  - `cell_cfg.channel_bandwidth_MHz: 50` + `common_scs: 30` $\rightarrow$ **$N_{\text{RB}} = 133$ PRBs** (1596 subcarriers) via TS 38.101-1 Table 5.3.2-1.
  - `cell_cfg.tdd_ul_dl_cfg`: 10 slots period (7 DL slots, 1 Special slot `6D + 4G + 4U`, 2 UL slots).
  - `cell_cfg.prach.prach_config_index: 159`, `prach_root_sequence_index: 1`.
  - `cell_cfg.nof_antennas_dl: 4`, `nof_antennas_ul: 4` (4T4R MIMO).

### 3.3 Category 3: 3GPP Standard Derived (Deterministic)
- Geometry that is mathematically fixed by 3GPP specifications once the carrier bandwidth, SCS, and band are known:
  - **SSB Subcarrier Grid**: TS 38.211 §7.4.3.1 (240 subcarriers, centered at PRB 56).
  - **CORESET#0**: TS 38.213 §13 Table 13-4 (Index 0, 24 PRBs, 2 symbols).
  - **PUCCH**: TS 38.211 §6.3.2 (Edge RBs 0 and 132 for intra-slot hopping).
  - **DM-RS Type 1**: TS 38.211 §7.4.1.1 (Subcarriers $k \pmod 2 = 0$).
  - **CSI-RS NZP**: TS 38.211 §7.4.1.5 (Symbol 5, Subcarrier 3).

---

## 4. Master Channel Mapping Matrix

| Channel / Signal | Origin | Source Parameters | 3GPP Specification | Slot Allocation | Symbol Allocation | PRB / Subcarrier Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PDSCH** *(Data)* | **Real Live Data** | `ws://:8001`<br>`pdsch_prbs_used_per_tdd_slot_idx` | TS 38.211 §7.3.1.6 | DL Slots #0–#6, Special Slot #7 | Symbols 0–13 (except control/RS) | PRB 0 to Active PRBs (bounded by live MAC grant) |
| **PUSCH** *(Data)* | **Real Live Data** | `ws://:8001`<br>`pusch_prbs_used_per_tdd_slot_idx` | TS 38.211 §6.4.1.2 | UL Slots #8–#9, Special Slot #7 | Symbols 0–13 | PRB 0 upwards (Slot #8) / PRB 12 upwards (Slot #9 after PRACH) |
| **PDSCH DM-RS** | **Real Live Data** | Live PRB bound + `dmrsTypeAPos: 2` | TS 38.211 §7.4.1.1 | DL Slots #0–#6 | Symbol 2 ($l_0 = 2$) | Even subcarriers ($k \pmod 2 = 0$) within active PDSCH PRBs |
| **PUSCH DM-RS** | **Real Live Data** | Live PRB bound | TS 38.211 §6.4.1.1 | UL Slots #8–#9 | Symbol 0 (First UL symbol) | Even subcarriers ($k \pmod 2 = 0$) within active PUSCH PRBs |
| **PRACH** *(Preamble)* | **Real Config** | `gnb.yml`<br>`prach_config_index: 159` | TS 38.211 §6.3.3<br>Table 6.3.3.2-3 | Slot #9 (Last UL slot) | All UL Symbols (0–13) | PRB 0–11 (12 PRBs short preamble B4/C2 at `msg1-FrequencyStart = 0`) |
| **SSB** *(PSS/SSS/PBCH)* | **Real Config + 3GPP** | Band n78, 50 MHz @ 30 kHz | TS 38.211 §7.4.3.1<br>TS 38.104 §5.4.3 | Slot #0 (Burst half-frame) | Symbols 2, 3, 4, 5 (Case C) | PRB 56–75 (20 PRBs, centered at PRB 56)<br>• PSS: Sym 2, SC 56–182<br>• SSS: Sym 4, SC 56–182<br>• PBCH: Sym 3 & 5 (full 240 SC) |
| **PDCCH** *(CORESET#0)* | **3GPP Spec** | TS 38.213 Table 13-4 (Index 0) | TS 38.211 §7.3.2<br>TS 38.213 §13 | DL Slots #0–#6 | Symbols 0, 1 (2 symbols) | PRB 56–79 (24 PRBs, aligned with SSB frequency offset) |
| **PUCCH** *(Control)* | **3GPP Spec** | Common PUCCH BWP rule | TS 38.211 §6.3.2<br>TS 38.213 §9 | UL Slots #8–#9 | UL Symbols (0–13) | Frequency hopping at BWP edges:<br>PRB 0 (lowest) & PRB 132 (highest) |
| **CSI-RS** *(Ref Signal)* | **3GPP Spec** | Single-port NZP CSI-RS | TS 38.211 §7.4.1.5 | Slot #0 (DL) | Symbol 5 (Mid-slot) | Subcarrier 3 ($k \pmod{12} = 3$) across all 133 PRBs |
| **SSB Rate-Matching** | **3GPP Spec** | TS 38.214 §5.1.4.1 | TS 38.214 §5.1.4.1 | Slot #0 (DL) | Symbols 2–5 | PRB 56–75: PDSCH avoids SSB REs; overlap marked as `COLLISION` if disabled |

---

## 5. Channel-Specific Technical Details

### 5.1 Synchronization Signal Block (SSB / PBCH Block)
- **Standard**: 3GPP TS 38.211 §7.4.3.1.
- **Physical Size**: 20 PRBs = 240 subcarriers, 4 consecutive OFDM symbols.
- **Frequency Placement**:
  - In a 133 PRB carrier, the SSB is centered:  
    $$\text{ssbRbOffset} = \left\lfloor \frac{N_{\text{RB}} - 20}{2} \right\rfloor = \left\lfloor \frac{133 - 20}{2} \right\rfloor = 56$$
  - Occupies PRB 56 to PRB 75 (Subcarriers 672 to 911).
- **Symbol Allocation (Case C, 30 kHz SCS)**:
  - Symbol 2: **PSS** (Primary Synchronization Signal) occupying center 127 subcarriers.
  - Symbol 3: **PBCH** + DM-RS across all 240 subcarriers.
  - Symbol 4: **SSS** (Secondary Synchronization Signal) on center 127 subcarriers, flanked by PBCH on subcarriers 0–47 and 175–239.
  - Symbol 5: **PBCH** + DM-RS across all 240 subcarriers.

### 5.2 Physical Random Access Channel (PRACH)
- **Standard**: 3GPP TS 38.211 §6.3.3 and Table 6.3.3.2-3 (FR1 TDD, unpaired spectrum).
- **Configuration Index**: `159` from `cell_cfg.prach.prach_config_index`.
- **Occasion Slot**: Assigned to the final Uplink slot in the TDD cycle (**Slot #9**).
- **Frequency Footprint**: 12 PRBs (PRB 0 to PRB 11, subcarriers 0 to 143).
- **Time Footprint**: Spans across the Uplink OFDM symbols of Slot #9.

### 5.3 PDCCH / CORESET#0
- **Standard**: 3GPP TS 38.211 §7.3.2 and TS 38.213 §13.
- **Table Lookup**: Table 13-4 for SCS combination $\{SSB, PDCCH\} = \{30, 30\}\text{ kHz}$.
- **Geometry**: Index 0 specifies $N_{\text{RB}}^{\text{CORESET}} = 24$ PRBs, $N_{\text{symb}}^{\text{CORESET}} = 2$ symbols, and $\text{offset} = 0\text{ RBs}$.
- **Placement**: Symbols 0 and 1 of every DL slot; PRB 56 to 79.

### 5.4 PDSCH & PUSCH Dynamic Data Allocation
- **Standard**: 3GPP TS 38.211 §7.3.1 (PDSCH) and §6.4.1 (PUSCH).
- **Live Coupling**: The visualizer listens to `pdsch_prbs_used_per_tdd_slot_idx` and `pusch_prbs_used_per_tdd_slot_idx` streamed from the OCUDU MAC scheduler.
- **Spectrum Partitioning**:
  - *Active Scheduled Spectrum*: Rendered in vivid channel colors (`#1f6feb` for PDSCH, `#1f9d55` for PUSCH) from PRB 0 to `activePrbs - 1`.
  - *Idle Spectrum*: Rendered in dark muted idle cells (`#0c1220`) from `activePrbs` to $N_{\text{RB}} - 1$.
  - *Boundary Demarcation*: A cyan dashed line clearly marks the dynamic scheduler boundary.

---

## 6. User Interface & Interactive Navigation

### 6.1 Single-Row Consolidated Toolbar
All controls are unified in a single, compact horizontal flex row directly above the canvas:
- **Left Side**: `Visible PRBs` dropdown (`12`, `24`, `51`, `106`, `133 PRBs`) and `Start PRB` range slider.
- **Divider**: Subtle vertical separator.
- **Right Side**: Interactive channel pills (`PDCCH`, `PDSCH + DM-RS`, `PUSCH + DM-RS`, `PUCCH`, `SSB`, `PRACH`, `CSI-RS`, `SSB rate-matching`).

### 6.2 Intelligent Channel Click Navigation
Clicking any channel pill in the toolbar triggers an instant dual-focus operation:
1. **Slot Navigation**: Automatically jumps to the specific slot where that channel exists.
2. **PRB Frequency Focus**: Centers the exact PRB range containing the channel.
3. **Auto-Activation**: If the channel was unchecked, clicking it automatically turns its toggle ON.

| Clicked Channel | Target Slot | Target PRBs | Visibility Action |
| :--- | :--- | :--- | :--- |
| **PRACH** | **Slot #9** (UL) | **PRB 0 – 11** (12 PRBs) | Zooms directly into preamble occasion |
| **SSB** | **Slot #0** (Sync) | **PRB 54 – 77** (24 PRBs) | Centers the 20 SSB PRBs |
| **PDCCH / CORESET#0** | **Slot #0** (DL) | **PRB 56 – 79** (24 PRBs) | Centers CORESET#0 on Symbols 0–1 |
| **PDSCH + DM-RS** | **Slot #0** (DL) | **PRB 0 – Active PRBs** | Displays scheduled downlink data |
| **PUSCH + DM-RS** | **Slot #8** (UL) | **PRB 0 – Active PRBs** | Displays scheduled uplink data |
| **PUCCH** | **Slot #8** (UL) | **PRB 0 – 11** (12 PRBs) | Zooms into edge PRB 0 |
| **CSI-RS** | **Slot #0** (DL) | **PRB 0 – 23** | Focuses Symbol 5 NZP reference |
| **SSB Rate-Matching** | **Slot #0** (DL) | **PRB 54 – 77** (24 PRBs) | Highlights SSB protection zone |

### 6.3 Permanent RE Text Labels
- **Unconditional Display**: RE cell text labels (`PSS`, `SSS`, `PBCH`, `PDCCH`, `PDSCH`, `DM-RS`, `PUSCH`, `PUCCH`, `PRACH`, `CSI-RS`, `COLL`) are **permanently and unconditionally active**.
- **No Toggle / Configuration**: The toggle was removed per design requirements.
- **Dynamic Font Scaling**: Text scales dynamically (from 7px to 11px) based on cell dimensions so labels remain crisp and readable across all PRB zoom levels.

### 6.4 Slot Navigator Badges
- **Slot #0**: Marked with a red **`SSB`** badge indicating the 5G NR Synchronization burst.
- **Slot #9**: Marked with a purple **`PRACH`** badge indicating the Random Access preamble occasion.

---

## 7. Deployment & Runtime Operations

### 7.1 Single Container Architecture
- **Web Server**: Nginx Alpine (`ocudu/resource-grid-visualizer:latest`).
- **Port**: Exclusively bound to **`8080`** (`0.0.0.0:8080->80/tcp`).
- **No Extra Ports**: Development server port `5173` is closed in production; all traffic routes through Docker port `8080`.

### 7.2 Building and Synchronizing
To regenerate the profile from gNB configuration and deploy updates:

```bash
# 1. Regenerate profile from YAML
npm run gen:profile -- --config /home/namnp/ocudu-deployment/config/generated/gnb.yml

# 2. Build production assets
npm run build

# 3. Copy bundle into the running Docker container
docker cp dist/. resource-grid-visualizer:/usr/share/nginx/html/
```

### 7.3 Verification
- **URL**: `http://10.1.101.17:8080/`
- **Unit Tests**: `npm test` (14/14 3GPP engine tests passing).
