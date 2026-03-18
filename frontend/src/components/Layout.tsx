import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { bot as botApi, settings as settingsApi } from '../lib/api';

export interface LayoutContext {
  isBotRunning: boolean;
  setIsBotRunning: (v: boolean) => void;
  lastSignal: any;
  setLastSignal: (v: any) => void;
  lastSignalState: string;
  setLastSignalState: (v: string) => void;
  activeExchange: string;
  setActiveExchange: (v: string) => void;
}

export function Layout() {
  const { isAuthenticated } = useAuth();
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [lastSignal, setLastSignal] = useState<any>(null);
  const [lastSignalState, setLastSignalState] = useState('idle');
  const [activeExchange, setActiveExchange] = useState('deribit');

  // Load bot status and active exchange on mount
  useEffect(() => {
    if (isAuthenticated) {
      botApi.status().then((s) => setIsBotRunning(s.running)).catch(() => {});
      settingsApi.get().then((s) => {
        if (s.active_exchange) setActiveExchange(s.active_exchange);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#141414] text-[#EBE8E1] font-sans selection:bg-accent selection:text-[#141414] flex flex-col">
      <Navbar isBotRunning={isBotRunning} activeExchange={activeExchange} />
      <main className="flex-1 flex flex-col">
        <Outlet context={{ isBotRunning, setIsBotRunning, lastSignal, setLastSignal, lastSignalState, setLastSignalState, activeExchange, setActiveExchange }} />
      </main>
    </div>
  );
}
