import { useEffect, useRef, useState, useCallback } from 'react';

export interface WsEvent {
  event: string;
  data: any;
  timestamp: Date;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [events, setEvents] = useState([] as WsEvent[]);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      ws.send('ping');
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        if (parsed.event === 'pong') return;
        setEvents((prev) => [{ ...parsed, timestamp: new Date() }, ...prev].slice(0, 100));
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3 seconds
      reconnectTimer.current = window.setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { events, connected, connect, disconnect, clearEvents: () => setEvents([]) };
}
