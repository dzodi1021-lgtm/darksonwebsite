"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLanyardUserId,
  LANYARD_REST_URL,
  normalizePresence,
  type LanyardData,
  type RawLanyardData,
} from "@/libs/lanyard";

export {
  activityIcon,
  avatarUrl,
  getCustomStatus,
  getCustomStatusText,
  getLanyardUserId,
  parseFlags,
} from "@/libs/lanyard";

export type {
  LanyardActivity,
  LanyardClan,
  LanyardData,
  LanyardSpotify,
} from "@/libs/lanyard";

export function useLanyard(initialData: LanyardData | null = null) {
  const [data, setData] = useState<LanyardData | null>(() => initialData);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const userId = getLanyardUserId();

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const clearReconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${LANYARD_REST_URL}/${userId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        success: boolean;
        data: RawLanyardData;
      };

      if (payload.success) {
        setData(normalizePresence(payload.data));
      }
    } catch {
      // The socket usually catches up right after load.
    }
  }, [userId]);

  const connect = useCallback(() => {
    const state = wsRef.current?.readyState;

    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
      return;
    }

    clearReconnect();

    const ws = new WebSocket("wss://api.lanyard.rest/socket");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.op === 1) {
        ws.send(
          JSON.stringify({
            op: 2,
            d: {
              subscribe_to_id: userId,
            },
          }),
        );

        clearHeartbeat();
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 3 }));
          }
        }, message.d.heartbeat_interval);
      }

      if (
        message.op === 0 &&
        (message.t === "INIT_STATE" || message.t === "PRESENCE_UPDATE")
      ) {
        setData(normalizePresence(message.d as RawLanyardData));
      }
    };

    ws.onclose = () => {
      setConnected(false);
      clearHeartbeat();
      wsRef.current = null;

      if (shouldReconnectRef.current) {
        reconnectRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [clearHeartbeat, clearReconnect, userId]);

  useEffect(() => {
    shouldReconnectRef.current = true;

    if (!initialData) {
      void refresh();
    }

    connect();

    const pollTimer = setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      shouldReconnectRef.current = false;
      clearReconnect();
      clearHeartbeat();
      clearInterval(pollTimer);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearHeartbeat, clearReconnect, connect, initialData, refresh]);

  return { data, connected };
}
