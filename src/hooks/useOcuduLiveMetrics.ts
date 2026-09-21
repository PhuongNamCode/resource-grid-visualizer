// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LiveCellMetrics,
  LiveMacMetrics,
  LiveTelemetryState,
  LiveUeMetric,
  UeDiagnostics,
} from '../types';
import { buildUeTelemetry, EMPTY_UE_DIAGNOSTICS } from './normalizeUe';

export function useOcuduLiveMetrics(): LiveTelemetryState {
  const defaultHost =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : '127.0.0.1';
  const [wsUrl, setWsUrl] = useState(`ws://${defaultHost}:8001`);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  const [totalDlMbps, setTotalDlMbps] = useState(0);
  const [totalUlKbps, setTotalUlKbps] = useState(0);
  const [activeUeCount, setActiveUeCount] = useState(0);
  const [ueList, setUeList] = useState<LiveUeMetric[]>([]);
  const [ueDiagnostics, setUeDiagnostics] = useState<UeDiagnostics>(EMPTY_UE_DIAGNOSTICS);
  const [cellMetrics, setCellMetrics] = useState<LiveCellMetrics | null>(null);
  const [macMetrics, setMacMetrics] = useState<LiveMacMetrics | null>(null);
  const [pdschSlotPrbs, setPdschSlotPrbs] = useState<number[]>([]);
  const [puschSlotPrbs, setPuschSlotPrbs] = useState<number[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const throttleTimerRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const pendingDataRef = useRef<any>(null);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const togglePause = useCallback(() => {
    setPaused((prev) => !prev);
  }, []);

  const cleanupSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (throttleTimerRef.current) {
      window.clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ cmd: 'metrics_unsubscribe' }));
        }
        wsRef.current.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
  }, []);

  const processTelemetryData = useCallback((data: any) => {
    if (!data) return;

    if (data.timestamp) {
      setTimestamp(data.timestamp);
    }

    // 1. Parse du_high MAC DL metrics
    const macDl = data.du?.du_high?.mac?.dl?.[0];
    if (macDl) {
      const pci = macDl.pci ?? 0;
      const avgLat = macDl.average_latency_us ?? 0;
      const maxLat = macDl.max_latency_us ?? 0;
      const minLat = macDl.min_latency_us ?? 0;
      const cpu = macDl.cpu_usage_percent ?? 0;

      setMacMetrics((prev) => {
        if (
          prev &&
          prev.pci === pci &&
          prev.average_latency_us === avgLat &&
          prev.max_latency_us === maxLat &&
          prev.min_latency_us === minLat &&
          prev.cpu_usage_percent === cpu
        ) {
          return prev;
        }
        return {
          pci,
          average_latency_us: avgLat,
          max_latency_us: maxLat,
          min_latency_us: minLat,
          cpu_usage_percent: cpu,
        };
      });
    }

    // 2. Parse cells
    const cellObj = data.cells?.[0] ?? data;
    if (cellObj) {
      const rawUeList = Array.isArray(cellObj.ue_list)
        ? cellObj.ue_list
        : Array.isArray(data.ue_list)
          ? data.ue_list
          : null;

      if (rawUeList) {
        // Single WebSocket->UI boundary: normalize every raw record so a
        // malformed/partial entry can never reach React and blank the page.
        const telemetry = buildUeTelemetry(rawUeList);
        setUeList(telemetry.ues);
        setActiveUeCount(telemetry.ues.length);
        setUeDiagnostics({
          rawUeCount: telemetry.rawUeCount,
          uniqueUeIds: telemetry.uniqueUeIds,
          duplicateUeIds: telemetry.duplicateUeIds,
          malformedCount: telemetry.malformedCount,
        });
        setTotalDlMbps(telemetry.totalDlMbps);
        setTotalUlKbps(telemetry.totalUlKbps);
      }

      const metrics = cellObj.cell_metrics ?? cellObj;
      if (metrics && typeof metrics === 'object') {
        setCellMetrics(metrics);

        const pdschSlots =
          metrics.pdsch_prbs_used_per_tdd_slot_idx ??
          cellObj.pdsch_prbs_used_per_tdd_slot_idx ??
          data.pdsch_prbs_used_per_tdd_slot_idx;

        if (Array.isArray(pdschSlots) && pdschSlots.length > 0) {
          setPdschSlotPrbs((prev) => {
            if (prev.length === pdschSlots.length && prev.every((v, i) => v === pdschSlots[i])) {
              return prev;
            }
            return pdschSlots;
          });
        }

        const puschSlots =
          metrics.pusch_prbs_used_per_tdd_slot_idx ??
          cellObj.pusch_prbs_used_per_tdd_slot_idx ??
          data.pusch_prbs_used_per_tdd_slot_idx;

        if (Array.isArray(puschSlots) && puschSlots.length > 0) {
          setPuschSlotPrbs((prev) => {
            if (prev.length === puschSlots.length && prev.every((v, i) => v === puschSlots[i])) {
              return prev;
            }
            return puschSlots;
          });
        }
      }
    }
  }, []);

  const connect = useCallback(() => {
    cleanupSocket();
    setConnecting(true);
    setError(null);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (err) {
      setError(`Cannot initialize WebSocket to ${wsUrl}: ${String(err)}`);
      setConnecting(false);
      setConnected(false);
      return;
    }

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      setError(null);
      try {
        ws.send(JSON.stringify({ cmd: 'metrics_subscribe' }));
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      setError(`Connection error on ${wsUrl}`);
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, 3000);
      }
    };

    ws.onmessage = (event) => {
      if (pausedRef.current) return;

      let data: any;
      try {
        data = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return;
      }

      if (data?.cmd === 'metrics_subscribe') return;

      // Throttle updates to at most 4 times per second (250ms interval) to prevent UI lag
      const now = Date.now();
      pendingDataRef.current = data;

      if (now - lastUpdateRef.current >= 250) {
        lastUpdateRef.current = now;
        processTelemetryData(data);
      } else if (!throttleTimerRef.current) {
        const remaining = 250 - (now - lastUpdateRef.current);
        throttleTimerRef.current = window.setTimeout(() => {
          throttleTimerRef.current = null;
          lastUpdateRef.current = Date.now();
          if (pendingDataRef.current) {
            processTelemetryData(pendingDataRef.current);
          }
        }, remaining);
      }
    };
  }, [cleanupSocket, wsUrl, processTelemetryData]);

  useEffect(() => {
    connect();
    return () => {
      cleanupSocket();
    };
  }, [connect, cleanupSocket]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  return {
    connected,
    connecting,
    error,
    paused,
    timestamp,
    totalDlMbps,
    totalUlKbps,
    activeUeCount,
    ueList,
    ueDiagnostics,
    cellMetrics,
    macMetrics,
    pdschSlotPrbs,
    puschSlotPrbs,
    togglePause,
    reconnect,
    setWsUrl,
    wsUrl,
  };
}
