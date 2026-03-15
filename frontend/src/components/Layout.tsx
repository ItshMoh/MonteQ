import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { bot as botApi } from '../lib/api';

export function Layout() {
  const { isAuthenticated } = useAuth();
  const [isBotRunning, setIsBotRunning] = useState(false);

  // Check bot status on mount
  useEffect(() => {
    if (isAuthenticated) {
      botApi.status().then((s) => setIsBotRunning(s.running)).catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#141414] text-[#EBE8E1] font-sans selection:bg-accent selection:text-[#141414] flex flex-col">
      <Navbar isBotRunning={isBotRunning} />
      <main className="flex-1 flex flex-col">
        <Outlet context={{ isBotRunning, setIsBotRunning }} />
      </main>
    </div>
  );
}
