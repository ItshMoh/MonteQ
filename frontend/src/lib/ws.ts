import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import React from 'react';

export interface WsEvent {
  event: string;
  data: any;
  timestamp: Date;
}

interface WsContextType {
  events: WsEvent[];
  connected: boolean;
  clearEvents: () => void;
}

const WsContext = createContext<WsContextType>({ events: [], connected: false, clearEvents: () => {} });

export function WsProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [events, setEvents] = useState<WsEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    let wsUrl: string;
    if (apiUrl) {
      // Production: derive WS URL from API URL (https://x.com -> wss://x.com/ws)
      const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
      const host = apiUrl.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}//${host}/ws?token=${token}`;
    } else {
      // Dev: use Vite proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      ws.send('ping');
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        if (parsed.event === 'pong') return;
        setEvents((prev) => [{ ...parsed, timestamp: new Date() }, ...prev].slice(0, 200));
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = window.setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Reconnect when token changes (login)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') connect();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return React.createElement(WsContext.Provider, { value: { events, connected, clearEvents } }, children);
}

export function useWebSocket() {
  return useContext(WsContext);
}
