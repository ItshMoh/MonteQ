import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { trades as tradesApi } from '../lib/api';

export function History() {
  const [timeRange, setTimeRange] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [tradesList, setTradesList] = useState<any[]>([]);
  const [tradeEvents, setTradeEvents] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadTrades();
  }, [statusFilter]);

  const loadTrades = async () => {
    setLoading(true);
    try {
      const data = await tradesApi.list(statusFilter || undefined, 50);
      setTradesList(data);
    } catch {
      setTradesList([]);
    }
    setLoading(false);
  };

  const loadEvents = async (tradeId: string) => {
    if (tradeEvents[tradeId]) return;
    try {
      const evts = await tradesApi.events(tradeId);
      setTradeEvents((prev) => ({ ...prev, [tradeId]: evts }));
    } catch {}
  };

  const toggleRow = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
      loadEvents(id);
    }
  };

  // Build P&L chart from closed trades
  const closedTrades = tradesList.filter(t => t.status === 'closed' && t.pnl != null);
  const pnlData = closedTrades.reverse().reduce((acc: any[], trade, i) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
    acc.push({
      date: new Date(trade.closed_at || trade.opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: prev + (trade.pnl || 0),
    });
    return acc;
  }, []);

  // Stats
  const totalTrades = tradesList.length;
  const wins = tradesList.filter(t => (t.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';
  const avgPnl = totalTrades > 0 ? (tradesList.reduce((s, t) => s + (t.pnl || 0), 0) / totalTrades).toFixed(2) : '0';
  const bestTrade = tradesList.length > 0 ? Math.max(...tradesList.map(t => t.pnl || 0)) : 0;
  const worstTrade = tradesList.length > 0 ? Math.min(...tradesList.map(t => t.pnl || 0)) : 0;

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 border-t border-[#2A2A2A] overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="font-mono text-xs font-bold text-gray-500 tracking-widest">TRADE HISTORY</div>

        {/* P&L Chart */}
        <div className="border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="font-mono text-xs text-gray-500">CUMULATIVE P&L</div>
            <div className="flex border border-[#2A2A2A] font-mono text-xs">
              {['7D', '30D', 'ALL'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 hover:bg-[#2A2A2A] transition-colors ${timeRange === range ? 'bg-[#2A2A2A] text-[#EBE8E1]' : 'text-gray-500'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            {pnlData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pnlData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                  <XAxis dataKey="date" stroke="#555" tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#555" tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#2A2A2A', fontFamily: 'monospace', fontSize: '12px' }}
                    itemStyle={{ color: '#EBE8E1' }}
                  />
                  <Line type="monotone" dataKey="pnl" stroke="#F05023" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-mono text-sm text-gray-500">No closed trades yet</div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Trades', value: String(totalTrades) },
            { label: 'Win Rate', value: `${winRate}%` },
            { label: 'Avg P&L', value: `${Number(avgPnl) >= 0 ? '+' : ''}$${avgPnl}`, color: Number(avgPnl) >= 0 ? 'text-green-500' : 'text-red-500' },
            { label: 'Best', value: `+$${bestTrade.toFixed(2)}`, color: 'text-green-500' },
            { label: 'Worst', value: `$${worstTrade.toFixed(2)}`, color: 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className="border border-[#2A2A2A] bg-[#1A1A1A] p-4 flex flex-col justify-center items-center text-center">
              <div className="font-mono text-[10px] text-gray-500 mb-2 uppercase">{stat.label}</div>
              <div className={`font-serif text-2xl ${stat.color || 'text-[#EBE8E1]'}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 border border-[#2A2A2A] bg-[#1A1A1A] p-4">
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-2 font-mono text-xs outline-none focus:border-accent"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>
        </div>

        {/* Trade Table */}
        <div className="border border-[#2A2A2A] bg-[#1A1A1A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-gray-500 text-xs">
                  <th className="p-4 font-normal">Date</th>
                  <th className="p-4 font-normal">Asset</th>
                  <th className="p-4 font-normal">Dir</th>
                  <th className="p-4 font-normal">Entry</th>
                  <th className="p-4 font-normal">Exit</th>
                  <th className="p-4 font-normal">P&L</th>
                  <th className="p-4 font-normal">Status</th>
                  <th className="p-4 font-normal w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500">Loading...</td></tr>
                )}
                {!loading && tradesList.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500">No trades yet</td></tr>
                )}
                {tradesList.map((trade) => (
                  <React.Fragment key={trade.id}>
                    <tr
                      onClick={() => toggleRow(trade.id)}
                      className={`border-b border-[#2A2A2A] cursor-pointer hover:bg-[#222] transition-colors ${expandedRow === trade.id ? 'bg-[#222]' : ''}`}
                    >
                      <td className="p-4">{new Date(trade.opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="p-4">{trade.asset}</td>
                      <td className="p-4 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${trade.direction === 'call' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {trade.direction === 'call' ? 'Call' : 'Put'}
                      </td>
                      <td className="p-4">${trade.entry_price}</td>
                      <td className="p-4">{trade.exit_price != null ? `$${trade.exit_price}` : '—'}</td>
                      <td className={`p-4 ${(trade.pnl || 0) > 0 ? 'text-green-500' : (trade.pnl || 0) < 0 ? 'text-red-500' : ''}`}>
                        {trade.pnl != null ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(4)}` : '—'}
                      </td>
                      <td className="p-4 text-gray-400">{trade.status}</td>
                      <td className="p-4 text-gray-500">
                        {expandedRow === trade.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedRow === trade.id && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-[#141414] border-b border-[#2A2A2A]"
                        >
                          <td colSpan={8} className="p-6">
                            <div className="font-mono text-xs text-gray-500 mb-4">
                              Trade {trade.id.slice(0, 8)} — {trade.asset} {trade.direction}
                            </div>
                            <div className="space-y-3 font-mono text-xs">
                              {(tradeEvents[trade.id] || []).map((evt, i) => (
                                <div key={i} className="grid grid-cols-[100px_150px_1fr] gap-4">
                                  <span className="text-gray-500">{new Date(evt.created_at).toLocaleTimeString()}</span>
                                  <span className="text-accent">{evt.event_type}</span>
                                  <span className="text-gray-400">{typeof evt.detail === 'object' ? JSON.stringify(evt.detail) : evt.detail}</span>
                                </div>
                              ))}
                              {!(tradeEvents[trade.id]?.length) && (
                                <div className="text-gray-500">No events recorded for this trade.</div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
