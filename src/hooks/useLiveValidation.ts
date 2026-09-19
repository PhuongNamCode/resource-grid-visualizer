// Copyright (C) 2026 NeuroRAN. All rights reserved.

// Optional, dev-only cross-check against the running gNB. Connects to the
// OCUDU metrics WebSocket (remote_control, default :8001), subscribes with the
// same {"cmd":"metrics_subscribe"} handshake as scripts/get_pm_data.py, and
// confirms the config-derived geometry is consistent with live telemetry:
//   * observed max PRB usage must be <= derived N_RB, and
//   * the pdsch/pusch per-TDD-slot arrays are present.
// This validates the "correct data" claim without needing per-RE telemetry.

import { useCallback, useState } from 'react';

export interface ValidationResult {
  status: 'ok' | 'warn' | 'error';
  message: string;
  observedMaxPrb?: number;
  pdschLen?: number;
  puschLen?: number;
}

export interface LiveValidationState {
  running: boolean;
  result: ValidationResult | null;
  validate: (url: string, expected: { nRb: number; periodSlots: number }) => void;
}

export function useLiveValidation(): LiveValidationState {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validate = useCallback((url: string, expected: { nRb: number; periodSlots: number }) => {
    setRunning(true);
    setResult(null);

    let settled = false;
    const finish = (r: ValidationResult, ws?: WebSocket) => {
      if (settled) return;
      settled = true;
      try {
        ws?.send(JSON.stringify({ cmd: 'metrics_unsubscribe' }));
        ws?.close();
      } catch {
        /* ignore */
      }
      setResult(r);
      setRunning(false);
    };

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      finish({ status: 'error', message: `Cannot open ${url}: ${String(e)}` });
      return;
    }

    const timer = window.setTimeout(
      () => finish({ status: 'error', message: `Timed out waiting for metrics from ${url}` }, ws),
      6000,
    );

    ws.onopen = () => ws.send(JSON.stringify({ cmd: 'metrics_subscribe' }));
    ws.onerror = () => {
      window.clearTimeout(timer);
      finish({ status: 'error', message: `WebSocket error connecting to ${url} (is the gNB reachable?)` }, ws);
    };
    ws.onmessage = (ev) => {
      let data: any;
      try {
        data = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
      } catch {
        return;
      }
      if (data?.cmd === 'metrics_subscribe') return; // ack
      const cell = data?.cells?.[0]?.cell_metrics ?? data?.cells?.[0];
      const pdsch: number[] | undefined = cell?.pdsch_prbs_used_per_tdd_slot_idx;
      const pusch: number[] | undefined = cell?.pusch_prbs_used_per_tdd_slot_idx;
      if (!pdsch && !pusch) return; // wait for a batch that carries the arrays

      window.clearTimeout(timer);
      const all = [...(pdsch ?? []), ...(pusch ?? [])];
      const observedMaxPrb = all.length ? Math.max(...all) : 0;
      const okPrb = observedMaxPrb <= expected.nRb;
      finish(
        {
          status: okPrb ? 'ok' : 'warn',
          message: okPrb
            ? `Live gNB consistent: max PRB used ${observedMaxPrb} <= N_RB ${expected.nRb}.`
            : `Mismatch: observed PRB usage ${observedMaxPrb} exceeds derived N_RB ${expected.nRb}.`,
          observedMaxPrb,
          pdschLen: pdsch?.length,
          puschLen: pusch?.length,
        },
        ws,
      );
    };
  }, []);

  return { running, result, validate };
}
