import { useEffect, useRef, useCallback, useState } from 'react';
import { WSMessage } from '../types';

interface UseWebSocketOptions {
  token: string | null;
  onMessage: (msg: WSMessage) => void;
  enabled?: boolean;
}

function getWebSocketUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${proto}//${host}/ws`;
}

const MAX_BACKOFF = 30_000;
const INITIAL_BACKOFF = 1_000;

export function useWebSocket({ token, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Keep onMessage ref current
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!enabled || !token || !mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = getWebSocketUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (ws !== wsRef.current) { ws.close(); return; }
      if (!mountedRef.current) { ws.close(); return; }
      backoffRef.current = INITIAL_BACKOFF;
      setIsConnected(true);
      setIsReconnecting(false);
      // Identify immediately on connection
      ws.send(JSON.stringify({ type: 'identify', token }));
    };

    ws.onmessage = (event) => {
      if (ws !== wsRef.current) return;
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        onMessageRef.current(msg);
      } catch {}
    };

    ws.onclose = () => {
      if (ws !== wsRef.current) return;
      if (!mountedRef.current) return;
      setIsConnected(false);
      setIsReconnecting(true);

      // Exponential backoff reconnect
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF);

      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      if (ws !== wsRef.current) return;
      ws.close();
    };
  }, [enabled, token]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, isReconnecting, send };
}
