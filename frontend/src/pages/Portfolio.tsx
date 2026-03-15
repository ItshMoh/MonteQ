import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Eye, EyeOff, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useDialog } from '../components/ConfirmationDialog';
import { portfolio as portfolioApi, settings as settingsApi, keys as keysApi, deribit } from '../lib/api';

const COLORS = ['#F05023', '#A03010', '#602005', '#2A2A2A'];

export function Portfolio() {
  const { showToast } = useToast();
  const { showDialog } = useDialog();

  const [showApiKey, setShowApiKey] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [apiEnv, setApiEnv] = useState('testnet');
  const [isApiConnected, setIsApiConnected] = useState(false);

  const [maxPositions, setMaxPositions] = useState('3');
  const [defaultBudget, setDefaultBudget] = useState('10');
  const [signalThreshold, setSignalThreshold] = useState('65');

  const [riskData, setRiskData] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [risk, sets] = await Promise.all([
        portfolioApi.risk().catch(() => null),
        settingsApi.get().catch(() => null),
      ]);
      if (risk) setRiskData(risk);
      if (sets) {
        setMaxPositions(String(sets.max_open_positions || 3));
        setDefaultBudget(String(sets.default_budget || 10));
        setSignalThreshold(String(Math.round((sets.signal_threshold || 0.65) * 100)));
      }
      // Check if keys exist
      const keysCheck = await keysApi.check();
      setIsApiConnected(!!keysCheck);
    } catch {}

    // Try to load positions from Deribit
    try {
      const pos = await deribit.positions();
      setPositions(Array.isArray(pos) ? pos : []);
    } catch {
      setPositions([]);
    }
    setLoading(false);
  };

  const handleSaveKeys = async () => {
    if (!clientId || !clientSecret) {
      showToast('error', 'Error', 'Please enter both Client ID and Client Secret');
      return;
    }
    try {
      await keysApi.save(clientId, clientSecret);
      setIsApiConnected(true);
      showToast('success', 'Keys Saved', 'Deribit API keys have been encrypted and stored.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await settingsApi.update({
        max_open_positions: parseInt(maxPositions),
        default_budget: parseFloat(defaultBudget),
        signal_threshold: parseInt(signalThreshold) / 100,
      });
      showToast('success', 'Settings Saved', 'Your portfolio settings have been updated.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleClosePosition = (tradeId: string, instrument: string) => {
    showDialog({
      title: 'CLOSE POSITION',
      message: `Are you sure you want to close the position for ${instrument}?`,
      confirmLabel: 'CLOSE POSITION',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deribit.close(tradeId);
          showToast('success', 'Position Closed', `Successfully closed position for ${instrument}.`);
          loadData();
        } catch (err: any) {
          showToast('error', 'Error', err.message);
        }
      }
    });
  };

  // Build exposure data from risk
  const exposureData = riskData?.per_asset_exposure
    ? Object.entries(riskData.per_asset_exposure).map(([name, value], i) => ({
        name,
        value: value as number,
        color: COLORS[i % COLORS.length],
      }))
    : [];

  const openTrades = riskData?.open_trades || [];

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 border-t border-[#2A2A2A] overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="font-mono text-xs font-bold text-gray-500 tracking-widest">PORTFOLIO & SETTINGS</div>

        {/* Risk Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Open Positions', value: `${riskData?.open_positions || 0} / ${riskData?.max_open_positions || 3}` },
            { label: 'Budget Deployed', value: `$${(riskData?.total_budget_deployed || 0).toFixed(2)}` },
            { label: 'Realized P&L', value: `${(riskData?.total_realized_pnl || 0) >= 0 ? '+' : ''}$${(riskData?.total_realized_pnl || 0).toFixed(2)}`, color: (riskData?.total_realized_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500' },
            { label: 'Max Drawdown', value: `$${(riskData?.max_drawdown || 0).toFixed(2)}` },
            { label: 'Closed Trades', value: String(riskData?.total_closed_trades || 0) },
          ].map(stat => (
            <div key={stat.label} className="border border-[#2A2A2A] bg-[#141414] p-4 flex flex-col justify-center items-center text-center">
              <div className="font-mono text-[10px] text-gray-500 mb-2 uppercase">{stat.label}</div>
              <div className={`font-mono text-xl ${stat.color || 'text-[#EBE8E1]'}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Asset Exposure */}
          <div className="lg:col-span-1 border border-[#2A2A2A] bg-[#1A1A1A] p-6">
            <div className="font-mono text-xs text-gray-500 mb-6">ASSET EXPOSURE</div>
            <div className="h-64 relative">
              {exposureData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exposureData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {exposureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#2A2A2A', fontFamily: 'monospace', fontSize: '12px' }}
                      itemStyle={{ color: '#EBE8E1' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-sm text-gray-500">No exposure data</div>
              )}
            </div>
            {exposureData.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                {exposureData.map(asset => (
                  <div key={asset.name} className="flex items-center gap-2 font-mono text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }}></div>
                    <span className="text-gray-400">{asset.name}</span>
                    <span className="text-[#EBE8E1]">${asset.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Positions */}
          <div className="lg:col-span-2 border border-[#2A2A2A] bg-[#1A1A1A] p-6 flex flex-col">
            <div className="font-mono text-xs text-gray-500 mb-6">OPEN POSITIONS</div>
            <div className="flex-1 space-y-4 overflow-y-auto">
              {openTrades.map((t: any) => (
                <div key={t.id} className="border border-[#2A2A2A] bg-[#141414] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="font-mono text-sm font-bold text-[#EBE8E1] mb-1">{t.asset} — {t.direction}</div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className={`flex items-center gap-1 ${t.direction === 'call' ? 'text-green-500' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.direction === 'call' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {t.direction === 'call' ? 'Call' : 'Put'}
                      </span>
                      <span className="text-gray-500">Entry: ${t.entry_price}</span>
                      <span className="text-gray-400">Strike: ${t.strike_price}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-gray-400">
                        Budget: ${t.budget}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClosePosition(t.id, `${t.asset}-${t.direction}`)}
                      className="border border-red-500/50 text-red-500 hover:bg-red-500/10 px-4 py-2 font-mono text-xs transition-colors"
                    >
                      CLOSE
                    </button>
                  </div>
                </div>
              ))}
              {openTrades.length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-500 font-mono text-sm py-8">
                  No open positions
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <div className="flex items-center gap-2 font-mono text-xs text-gray-500 mb-6">
            <Settings className="w-4 h-4" /> SETTINGS
          </div>

          {!isApiConnected && (
            <div className="mb-8 p-4 border border-accent/50 bg-accent/5 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-sm font-bold text-accent mb-1">Connect Deribit API Key</div>
                <div className="font-mono text-xs text-gray-400 mb-4">
                  MonteQ AI requires a Deribit API key to execute trades and fetch portfolio data.
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-mono text-xs text-gray-400">Deribit Client ID</label>
                  {isApiConnected ? (
                    <span className="font-mono text-[10px] text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</span>
                  ) : (
                    <span className="font-mono text-[10px] text-red-500">Not Configured</span>
                  )}
                </div>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Your Deribit Client ID"
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 font-mono text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-gray-400 mb-2">Deribit Client Secret</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Your Deribit Client Secret"
                    className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 pr-10 font-mono text-sm outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#EBE8E1] transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveKeys}
                className="w-full bg-accent text-[#141414] p-3 font-mono text-sm font-bold hover:bg-[#F05023]/90 transition-colors"
              >
                SAVE API KEYS
              </button>

              <div>
                <label className="block font-mono text-xs text-gray-400 mb-2">Environment</label>
                <div className="flex border border-[#2A2A2A] font-mono text-xs">
                  <button
                    onClick={() => setApiEnv('testnet')}
                    className={`flex-1 py-3 transition-colors ${apiEnv === 'testnet' ? 'bg-[#2A2A2A] text-[#EBE8E1]' : 'bg-[#141414] text-gray-500 hover:bg-[#1A1A1A]'}`}
                  >
                    Testnet
                  </button>
                  <button
                    onClick={() => setApiEnv('mainnet')}
                    className={`flex-1 py-3 transition-colors ${apiEnv === 'mainnet' ? 'bg-[#2A2A2A] text-[#EBE8E1]' : 'bg-[#141414] text-gray-500 hover:bg-[#1A1A1A]'}`}
                  >
                    Mainnet
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-2">Max Positions</label>
                <input
                  type="number"
                  value={maxPositions}
                  onChange={(e) => setMaxPositions(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 font-mono text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-2">Default Budget ($)</label>
                <input
                  type="number"
                  value={defaultBudget}
                  onChange={(e) => setDefaultBudget(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 font-mono text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-2">Signal Threshold (%)</label>
                <input
                  type="number"
                  value={signalThreshold}
                  onChange={(e) => setSignalThreshold(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 font-mono text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="bg-[#EBE8E1] text-[#141414] px-6 py-3 font-mono text-sm font-bold hover:bg-white transition-colors"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
