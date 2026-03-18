import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { Play, Square, AlertTriangle, CheckCircle2, Activity, Target } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useDialog } from '../components/ConfirmationDialog';
import { deribit, derive, bot as botApi, settings as settingsApi, getExchangeApi } from '../lib/api';
import { useWebSocket, WsEvent } from '../lib/ws';
import type { LayoutContext } from '../components/Layout';

const ASSETS = ['BTC', 'ETH'];

const ASSET_ICONS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
};

type SignalState = 'idle' | 'loading' | 'actionable' | 'hold' | 'tail_risk';

export function Trade() {
  const { isBotRunning, setIsBotRunning, lastSignal, setLastSignal, lastSignalState, setLastSignalState, activeExchange } = useOutletContext<LayoutContext>();
  const { showToast } = useToast();
  const { showDialog } = useDialog();
  const { events } = useWebSocket();

  // Manual Trade State
  const [asset, setAsset] = useState('BTC');
  const [budget, setBudget] = useState('10');
  const [threshold, setThreshold] = useState(65);

  // Local loading state (not persisted)
  const [loading, setLoading] = useState(false);

  // Use persisted signal state from Layout
  const signalState = lastSignalState as SignalState;
  const signalData = lastSignal;

  // Bot Config State
  const [botAsset, setBotAsset] = useState('BTC');
  const [scanInterval, setScanInterval] = useState('300');
  const [takeProfit, setTakeProfit] = useState('20');
  const [stopLoss, setStopLoss] = useState('10');

  // Load user settings on mount
  useEffect(() => {
    settingsApi.get().then((s) => {
      setThreshold(Math.round((s.signal_threshold || 0.65) * 100));
      setBudget(String(s.default_budget || 10));
      setBotAsset(s.default_asset || 'BTC');
      setScanInterval(String(s.scan_interval_sec || 300));
      setTakeProfit(String(Math.round((s.take_profit_pct || 0.20) * 100)));
      setStopLoss(String(Math.round((s.stop_loss_pct || 0.10) * 100)));
    }).catch(() => {});

    botApi.status().then((s) => setIsBotRunning(s.running)).catch(() => {});
  }, []);

  const handleGenerateSignal = async () => {
    setLoading(true);
    setLastSignalState('loading');
    setLastSignal(null);
    try {
      // Save threshold first
      await settingsApi.update({
        signal_threshold: threshold / 100,
        default_budget: parseFloat(budget),
      });

      const exchangeApi = getExchangeApi(activeExchange);
      const data = await exchangeApi.execute(asset);

      if (data.status === 'no_trade') {
        const signal = data.signal;
        setLastSignal(signal);
        if (signal.tail_risk?.detected) {
          setLastSignalState('tail_risk');
          showToast('error', 'Tail Risk Detected', signal.reason);
        } else {
          setLastSignalState('hold');
          showToast('warning', 'Hold Signal', signal.reason);
        }
      } else if (data.signal) {
        setLastSignal(data);
        setLastSignalState('actionable');
        showToast('success', 'Trade Executed', `${data.signal.action} — ${data.execution?.instrument || asset}`);
      } else {
        setLastSignal(data);
        setLastSignalState('actionable');
        showToast('success', 'Signal Generated', 'Actionable signal detected.');
      }
    } catch (err: any) {
      showToast('error', 'Error', err.message);
      setLastSignalState('idle');
    }
    setLoading(false);
  };

  const handleToggleBot = async () => {
    if (isBotRunning) {
      showDialog({
        title: 'STOP AUTONOMOUS BOT',
        message: 'Are you sure you want to stop the autonomous bot? It will no longer scan or execute trades.',
        confirmLabel: 'STOP BOT',
        isDestructive: true,
        onConfirm: async () => {
          try {
            await botApi.stop();
            setIsBotRunning(false);
            showToast('info', 'Bot Stopped', 'Autonomous trading bot has been stopped.');
          } catch (err: any) {
            showToast('error', 'Error', err.message);
          }
        }
      });
    } else {
      showDialog({
        title: 'START AUTONOMOUS BOT',
        message: `The bot will automatically scan ${botAsset} every ${scanInterval} seconds and execute trades based on your parameters. Do you want to proceed?`,
        confirmLabel: 'START BOT',
        onConfirm: async () => {
          try {
            // Save bot settings first
            await settingsApi.update({
              default_asset: botAsset,
              scan_interval_sec: parseInt(scanInterval),
              take_profit_pct: parseInt(takeProfit) / 100,
              stop_loss_pct: parseInt(stopLoss) / 100,
              signal_threshold: threshold / 100,
              default_budget: parseFloat(budget),
            });
            await botApi.start();
            setIsBotRunning(true);
            showToast('success', 'Bot Started', `Autonomous trading bot is now running for ${botAsset}.`);
          } catch (err: any) {
            showToast('error', 'Error', err.message);
          }
        }
      });
    }
  };

  // Format WebSocket events for the activity log
  const getEventIcon = (event: string) => {
    switch (event) {
      case 'trade_opened':
      case 'trade_closed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'monitor_check':
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'trade_stopped':
      case 'auto_exit':
      case 'bot_error':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
      case 'bot_scan':
        return <div className="w-2 h-2 rounded-full border-2 border-accent"></div>;
      default:
        return <Target className="w-3.5 h-3.5 text-accent" />;
    }
  };

  const formatEventMessage = (ev: WsEvent) => {
    const d = ev.data || {};
    switch (ev.event) {
      case 'bot_scan':
        return { title: `Scan: Bias ${((d.bias_pct || 0) * 100).toFixed(1)}% → ${d.action}`, detail: `Direction: ${d.direction || 'N/A'}` };
      case 'trade_opened':
        return { title: `Trade opened — ${d.instrument || d.direction}`, detail: `Price: $${d.limit_price || 'N/A'}` };
      case 'trade_closed':
        return { title: `Trade closed`, detail: `P&L: ${d.pnl != null ? '$' + d.pnl : 'N/A'}` };
      case 'monitor_check':
        return { title: `Monitor: Bias ${((d.bias_pct || 0) * 100).toFixed(1)}%`, detail: `P&L: ${d.pnl_pct != null ? (d.pnl_pct * 100).toFixed(1) + '%' : 'N/A'}` };
      case 'auto_exit':
        return { title: `Auto-exit: ${d.reason}`, detail: `Trade: ${d.trade_id?.slice(0, 8) || ''}` };
      case 'bot_started':
        return { title: 'Bot started', detail: '' };
      case 'bot_stopped':
        return { title: 'Bot stopped', detail: d.reason || '' };
      default:
        return { title: ev.event, detail: JSON.stringify(d).slice(0, 60) };
    }
  };

  // Extract signal display data
  const bias = signalData?.signal?.bias || signalData?.bias || {};
  const confidence = signalData?.signal?.confidence || signalData?.confidence || {};
  const tailRisk = signalData?.signal?.tail_risk || signalData?.tail_risk || {};
  const strike = signalData?.signal?.strike || signalData?.execution || {};

  const showSignal = signalState !== 'idle' && signalState !== 'loading';

  return (
    <div className="flex-1 flex flex-col lg:flex-row border-t border-[#2A2A2A]">
      {/* Left Panel - Manual Trade */}
      <div className="w-full lg:w-[60%] border-r border-[#2A2A2A] p-6 lg:p-12 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs font-bold text-gray-500 tracking-widest">TRADE</div>
          <div className={`font-mono text-xs px-3 py-1 border flex items-center gap-2 ${
            activeExchange === 'derive' ? 'border-purple-500/50 text-purple-400' : 'border-accent/50 text-accent'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activeExchange === 'derive' ? 'bg-purple-500' : 'bg-accent'}`}></span>
            {activeExchange === 'derive' ? 'DERIVE' : 'DERIBIT'}
          </div>
        </div>

        {/* Input Section */}
        <div className="border border-[#2A2A2A] bg-[#1A1A1A] p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <label className="block font-mono text-xs text-gray-400 mb-2">Asset</label>
              <div className="flex gap-2">
                {ASSETS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAsset(a)}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 font-mono text-sm border transition-colors ${
                      asset === a
                        ? 'border-accent bg-accent/10 text-[#EBE8E1]'
                        : 'border-[#2A2A2A] bg-[#141414] text-gray-500 hover:border-gray-500'
                    }`}
                  >
                    <img src={ASSET_ICONS[a]} alt={a} className="w-5 h-5 rounded-full" />
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block font-mono text-xs text-gray-400 mb-2">Budget</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gray-500">$</span>
                <input
                  type="number"
                  min="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 pl-8 font-mono text-sm outline-none focus:border-accent"
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-mono text-xs text-gray-400">Threshold</label>
              <span className="font-mono text-xs text-accent">{threshold}%</span>
            </div>
            <input
              type="range"
              min="10" max="95"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateSignal}
          disabled={loading}
          className="w-full bg-accent text-[#141414] p-4 font-mono text-sm font-bold hover:bg-[#F05023]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          {loading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-[#141414] border-t-transparent rounded-full" />
          ) : (
            'GENERATE SIGNAL'
          )}
        </button>

        {/* Signal Result Card */}
        {showSignal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border p-6 ${
              signalState === 'actionable' ? 'border-green-500/50 bg-green-500/5' :
              signalState === 'hold' ? 'border-gray-500/50 bg-gray-500/5' :
              'border-red-500/50 bg-red-500/5'
            }`}
          >
            <div className="flex justify-between items-center mb-6">
              <div className={`font-mono text-sm font-bold flex items-center gap-2 ${
                signalState === 'actionable' ? 'text-green-500' :
                signalState === 'hold' ? 'text-gray-400' :
                'text-red-500'
              }`}>
                {signalState === 'actionable' && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                {signalState === 'hold' && <AlertTriangle className="w-4 h-4" />}
                {signalState === 'tail_risk' && <span className="w-4 h-4 flex items-center justify-center bg-red-500 text-[#141414] rounded-full text-[10px] font-bold">!</span>}
                {signalState === 'actionable'
                  ? `BUY ${(bias.direction || 'CALL').toUpperCase()}`
                  : signalState === 'hold' ? 'HOLD — DO NOT TRADE' : 'TAIL RISK DETECTED'}
              </div>
              <div className="font-mono text-xs text-gray-500">{asset}</div>
            </div>

            <div className="space-y-4 mb-6 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Directional Bias</span>
                <div className="flex items-center gap-3">
                  <span>{((bias.bias_pct || 0) * 100).toFixed(1)}%</span>
                  <div className="w-24 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className={`h-full ${signalState === 'actionable' ? 'bg-green-500' : signalState === 'tail_risk' ? 'bg-red-500' : 'bg-gray-500'}`}
                      style={{ width: `${Math.min((bias.bias_pct || 0) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
              {confidence.score != null && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Confidence Score</span>
                  <span className="flex items-center gap-2">
                    {confidence.score}
                    <span className={`text-xs px-1 py-0.5 rounded-sm ${
                      confidence.label === 'HIGH' ? 'bg-green-500/20 text-green-500' :
                      confidence.label === 'MEDIUM' ? 'bg-accent/20 text-accent' :
                      'bg-red-500/20 text-red-500'
                    }`}>{confidence.label}</span>
                  </span>
                </div>
              )}
              {strike.strike_price != null && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Best Strike</span>
                  <span>${strike.strike_price?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Tail Risk</span>
                <span className={tailRisk.detected ? 'text-red-500' : 'text-gray-500'}>
                  {tailRisk.detected ? `ACTIVE — ${tailRisk.reason}` : 'None'}
                </span>
              </div>
            </div>

            {signalState === 'hold' && (
              <div className="p-4 bg-[#141414] border border-[#2A2A2A] text-gray-400 text-xs leading-relaxed font-mono mb-6">
                {signalData?.reason || signalData?.signal?.reason || 'Bias is below your threshold. Bot will auto-enter when bias rises.'}
              </div>
            )}

            {signalState === 'tail_risk' && (
              <div className="p-4 bg-[#141414] border border-[#2A2A2A] text-gray-400 text-xs leading-relaxed font-mono mb-6">
                Black swan conditions detected. Trading is blocked until volatility normalizes.
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Right Panel - Autonomous Bot */}
      <div className="w-full lg:w-[40%] bg-[#1A1A1A] flex flex-col h-[calc(100vh-73px)]">
        {/* Bot Config */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex justify-between items-center mb-8">
            <div className="font-mono text-xs font-bold text-gray-500 tracking-widest">AUTONOMOUS BOT</div>
            <div className={`font-mono text-xs font-bold flex items-center gap-2 ${isBotRunning ? 'text-green-500' : 'text-gray-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isBotRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
              {isBotRunning ? 'RUNNING' : 'STOPPED'}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <label className="font-mono text-xs text-gray-400">Asset</label>
              <div className="flex gap-1.5">
                {ASSETS.map(a => (
                  <button
                    key={a}
                    disabled={isBotRunning}
                    onClick={() => setBotAsset(a)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs border transition-colors disabled:opacity-50 ${
                      botAsset === a
                        ? 'border-accent bg-accent/10 text-[#EBE8E1]'
                        : 'border-[#2A2A2A] bg-[#141414] text-gray-500 hover:border-gray-500'
                    }`}
                  >
                    <img src={ASSET_ICONS[a]} alt={a} className="w-4 h-4 rounded-full" />
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <label className="font-mono text-xs text-gray-400">Scan Every</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={isBotRunning}
                  value={scanInterval}
                  onChange={(e) => setScanInterval(e.target.value)}
                  className="w-16 bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-2 font-mono text-xs outline-none focus:border-accent text-right disabled:opacity-50"
                />
                <span className="font-mono text-xs text-gray-500">sec</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <label className="font-mono text-xs text-gray-400">Take Profit</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={isBotRunning}
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-16 bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-2 font-mono text-xs outline-none focus:border-accent text-right disabled:opacity-50"
                />
                <span className="font-mono text-xs text-gray-500">%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <label className="font-mono text-xs text-gray-400">Stop Loss</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={isBotRunning}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-16 bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-2 font-mono text-xs outline-none focus:border-accent text-right disabled:opacity-50"
                />
                <span className="font-mono text-xs text-gray-500">%</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleBot}
            className={`w-full p-4 font-mono text-sm font-bold transition-colors flex justify-center items-center gap-2 ${
              isBotRunning
                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20'
                : 'bg-[#EBE8E1] text-[#141414] hover:bg-white'
            }`}
          >
            {isBotRunning ? (
              <><Square className="w-4 h-4 fill-current" /> STOP BOT</>
            ) : (
              <><Play className="w-4 h-4 fill-current" /> START BOT</>
            )}
          </button>
        </div>

        {/* Activity Log - Real WebSocket Events */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
            <div className="font-mono text-xs text-gray-500">ACTIVITY LOG</div>
            <div className="font-mono text-xs text-gray-500">{events.length} events</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono text-xs">
            {events.length === 0 && (
              <div className="text-gray-500 text-center py-8">
                No events yet. Start the bot or generate a signal.
              </div>
            )}
            {events.map((ev, i) => {
              const msg = formatEventMessage(ev);
              return (
                <div key={i} className="relative pl-6">
                  <div className="absolute left-0 top-1 w-4 flex justify-center">{getEventIcon(ev.event)}</div>
                  <div className="text-gray-500 mb-1">{ev.timestamp.toLocaleTimeString()}</div>
                  <div className="text-[#EBE8E1] mb-1">{msg.title}</div>
                  {msg.detail && <div className="text-gray-400">{msg.detail}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
