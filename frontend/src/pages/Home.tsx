import { motion } from 'motion/react';
import { Gauge, LineChart, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="flex-1 flex flex-col">

      {/* Top Navigation Bars */}
      <div className="bg-[#EBE8E1] text-[#141414]">
        <div className="flex border-b border-[#D1CEC7] font-mono text-xs uppercase overflow-x-auto no-scrollbar">
          <div className="px-6 py-3 border-r border-[#D1CEC7] shrink-0">BTC</div>
          <div className="px-6 py-3 border-r border-[#D1CEC7] text-gray-400 shrink-0">ETH</div>
          <div className="px-6 py-3 border-r border-[#D1CEC7] font-bold shrink-0">SOL</div>
          <div className="px-6 py-3 border-r border-[#D1CEC7] text-gray-400 shrink-0">XAU</div>
          <div className="px-6 py-3 border-r border-[#D1CEC7] text-gray-400 shrink-0">SPY</div>
          <div className="px-6 py-3 border-r border-[#D1CEC7] text-gray-400 shrink-0">NVDA</div>
          <div className="px-6 py-3 border-r border-[#D1CEC7] text-gray-400 shrink-0">GOOGL</div>
          <div className="px-6 py-3 border-r border-[#D1CEC7] text-gray-400 shrink-0">TSLA</div>
          <div className="px-6 py-3 shrink-0">AAPL</div>
        </div>

        <div className="flex border-b border-[#D1CEC7] font-mono text-xs uppercase items-center">
          <div className="px-6 py-3 font-bold w-48 border-r border-[#D1CEC7] shrink-0">PERFORMANCE</div>
          <div className="flex-1 px-6 text-gray-400 tracking-widest overflow-hidden whitespace-nowrap">
            ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
          </div>
          <div className="px-6 py-3 border-l border-[#D1CEC7] flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 border border-[#141414] rotate-45"></span>
            PROBABILITY RATE
          </div>
          <div className="px-6 py-3 border-l border-[#D1CEC7] flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 bg-[#141414] rotate-45"></span>
            SHARPNESS SCORE
          </div>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">

        {/* Hero Section */}
        <div className="bg-[#EBE8E1] text-[#141414] p-8 md:p-16 clip-hero relative bg-grid-pattern">
          {/* Crosshairs */}
          <div className="absolute top-8 right-8 w-8 h-8 border-t border-l border-[#141414]"></div>
          <div className="absolute bottom-8 right-8 w-8 h-8 border-b border-r border-[#141414]"></div>

          <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
            <div className="w-full lg:w-1/2 relative z-10">
              <div className="text-accent font-mono text-xs mb-8 flex items-center">
                <span className="w-8 h-[1px] bg-accent mr-4"></span>
                AUTONOMOUS AGENT V1.0
              </div>
              <h1 className="font-serif text-6xl md:text-8xl leading-none tracking-tight mb-6">
                MonteQ<br/>AI
              </h1>
              <p className="font-sans text-lg max-w-md mb-10 text-gray-800">
                Autonomous options agent powered by 1,000+ AI-simulated price paths. High-frequency options trading on Deribit & Derive.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/portfolio?exchange=deribit" className="bg-[#141414] text-[#EBE8E1] px-8 py-4 font-mono text-sm hover:bg-accent transition-colors clip-button inline-block text-center">
                  CONNECT DERIBIT
                </Link>
                <Link to="/portfolio?exchange=derive" className="bg-[#141414] text-[#EBE8E1] px-8 py-4 font-mono text-sm hover:bg-purple-600 transition-colors clip-button inline-block text-center">
                  CONNECT DERIVE
                </Link>
                <Link to="/trade" className="border border-[#141414] px-8 py-4 font-mono text-sm hover:bg-[#141414] hover:text-[#EBE8E1] transition-colors clip-button bg-[#EBE8E1] inline-block text-center">
                  VIEW LIVE SIGNALS
                </Link>
              </div>
            </div>

            <div className="w-full lg:w-1/2 relative flex justify-center items-center h-[400px]">
              {/* Hero Graphic */}
              <div className="relative w-80 h-80 flex items-center justify-center">
                {/* Labels */}
                <div className="absolute top-0 right-12 border border-[#141414] px-2 py-1 font-mono text-[10px] bg-[#EBE8E1] z-20">SYNTH_SN50_FEED</div>
                <div className="absolute top-12 left-0 font-mono text-[10px] text-gray-500">CRPS: 0.42</div>
                <div className="absolute top-12 right-0 font-mono text-[10px] text-gray-500">PoP: 75.4%</div>
                <div className="absolute bottom-12 left-0 font-mono text-[10px] text-gray-500">HORIZON: 1H</div>
                <div className="absolute bottom-12 right-0 font-mono text-[10px] text-gray-500">PATHS: 1,024</div>
                <div className="absolute bottom-0 right-24 border border-accent text-accent px-2 py-1 font-mono text-[10px] bg-[#EBE8E1] z-20">LIVE_FEED</div>

                {/* Outer dashed circle */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#D1CEC7" strokeWidth="0.5" strokeDasharray="2 2" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#D1CEC7" strokeWidth="0.5" strokeDasharray="2 2" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#D1CEC7" strokeWidth="0.5" strokeDasharray="2 2" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#D1CEC7" strokeWidth="0.5" strokeDasharray="2 2" />
                </svg>

                {/* Outer circle covering/uncovering */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <motion.circle
                    cx="50" cy="50" r="25"
                    fill="none"
                    stroke="rgba(209, 206, 199, 0.6)"
                    strokeWidth="50"
                    strokeDasharray="157"
                    animate={{ strokeDashoffset: [157, 0, 157] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>

                {/* Inner rotating circle */}
                <motion.svg
                  className="absolute w-48 h-48 z-10" viewBox="0 0 100 100"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                >
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#141414" strokeWidth="1" strokeDasharray="180 80" />
                </motion.svg>

                {/* 3D Stack */}
                <motion.div
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="relative z-20 flex flex-col items-center -space-y-3"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="w-12 h-6 bg-[#141414] rotate-45 skew-x-[20deg] skew-y-[20deg] border border-[#EBE8E1] shadow-lg"></div>
                  <div className="w-16 h-6 bg-accent rotate-45 skew-x-[20deg] skew-y-[20deg] border border-[#EBE8E1] shadow-lg"></div>
                  <div className="w-20 h-6 bg-[#141414] rotate-45 skew-x-[20deg] skew-y-[20deg] border border-[#EBE8E1] shadow-lg"></div>
                  <div className="w-16 h-6 bg-accent rotate-45 skew-x-[20deg] skew-y-[20deg] border border-[#EBE8E1] shadow-lg"></div>
                  <div className="w-12 h-6 bg-[#141414] rotate-45 skew-x-[20deg] skew-y-[20deg] border border-[#EBE8E1] shadow-lg"></div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Metrics Section */}
        <div className="py-24">
          <div className="mb-12 border-b border-[#2A2A2A] pb-8 flex justify-between items-end">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl mb-4">Trading Metrics</h2>
              <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                LIVE_READOUT // SYNTH_SN50_STREAM
              </div>
            </div>
            <div className="w-2 h-2 bg-accent rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#EBE8E1] text-[#141414] p-8 clip-card flex flex-col justify-between h-56">
              <div className="flex justify-between items-start font-mono text-xs font-bold">
                <span>PROBABILITY OF PROFIT</span>
                <Gauge className="text-accent w-5 h-5" />
              </div>
              <div>
                <div className="font-serif text-6xl mb-2">75.4<span className="text-3xl">%</span></div>
                <div className="font-sans text-sm text-gray-600">Average PoP for generated signals.</div>
              </div>
            </div>

            <div className="bg-[#EBE8E1] text-[#141414] p-8 clip-card flex flex-col justify-between h-56">
              <div className="flex justify-between items-start font-mono text-xs font-bold">
                <span>1-HOUR PATH ANALYSIS</span>
                <LineChart className="text-accent w-5 h-5" />
              </div>
              <div>
                <div className="font-serif text-6xl mb-2">1,000<span className="text-3xl">+</span></div>
                <div className="font-sans text-sm text-gray-600">Simulated price paths per minute.</div>
              </div>
            </div>

            <div className="bg-[#EBE8E1] text-[#141414] p-8 clip-card flex flex-col justify-between h-56">
              <div className="flex justify-between items-start font-mono text-xs font-bold">
                <span>TAIL-RISK SHIELD</span>
                <Shield className="text-accent w-5 h-5" />
              </div>
              <div>
                <div className="font-serif text-6xl mb-2">Active</div>
                <div className="font-sans text-sm text-gray-600">Black Swan event detection online.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="pb-24">
          <div className="flex items-center gap-4 mb-12 font-mono text-xs text-gray-500 border-y border-[#2A2A2A] py-4">
            <span className="w-2 h-2 border border-gray-500 rotate-45 shrink-0"></span>
            <span className="shrink-0">FEATURES</span>
            <span className="flex-1 tracking-widest overflow-hidden whitespace-nowrap opacity-20">
              ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-accent text-[#141414] p-8 clip-card h-96 flex flex-col relative overflow-hidden">
              <div className="flex justify-between font-mono text-xs font-bold mb-8 relative z-10">
                <span className="text-2xl font-sans tracking-tight font-bold">Directional Bias Engine</span>
                <span>001</span>
              </div>
              <div className="flex-1 flex items-center justify-center relative z-10">
                <div className="relative w-40 h-40">
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#141414]"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#141414]"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#141414]"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#141414]"></div>

                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#141414" strokeWidth="1" />
                    <circle cx="50" cy="50" r="25" fill="none" stroke="#141414" strokeWidth="1" />
                    <circle cx="50" cy="50" r="10" fill="none" stroke="#141414" strokeWidth="1" />
                    <line x1="45" y1="50" x2="55" y2="50" stroke="#141414" strokeWidth="1" />
                    <line x1="50" y1="45" x2="50" y2="55" stroke="#141414" strokeWidth="1" />
                    <line x1="45" y1="25" x2="55" y2="25" stroke="#141414" strokeWidth="1" />
                    <motion.g animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '50px 50px' }}>
                      <line x1="50" y1="10" x2="50" y2="25" stroke="#141414" strokeWidth="2" />
                    </motion.g>
                  </svg>
                </div>
              </div>
              <p className="text-sm text-[#141414]/80 mt-6 relative z-10 font-medium">Analyzes 1,000+ simulated price paths to determine Call vs Put bias.</p>
            </div>

            <div className="bg-[#EBE8E1] text-[#141414] p-8 clip-card h-96 flex flex-col bg-grid-pattern">
              <div className="flex justify-between font-mono text-xs font-bold mb-8">
                <span className="text-2xl font-sans tracking-tight font-bold">Smart Entry & Exit</span>
                <span className="text-gray-400">002</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-400"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gray-400"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gray-400"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gray-400"></div>

                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <polygon points="50,10 10,90 90,90" fill="none" stroke="#141414" strokeWidth="1.5" />
                    <line x1="50" y1="10" x2="50" y2="90" stroke="#141414" strokeWidth="1" />
                    <line x1="50" y1="10" x2="30" y2="90" stroke="#141414" strokeWidth="1" />
                    <line x1="50" y1="10" x2="70" y2="90" stroke="#141414" strokeWidth="1" />
                    <line x1="30" y1="50" x2="70" y2="50" stroke="#141414" strokeWidth="1" />
                    <line x1="20" y1="70" x2="80" y2="70" stroke="#141414" strokeWidth="1" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-6 font-medium">Limit orders at fair value with dynamic stop-loss and take-profit.</p>
            </div>

            <div className="bg-[#EBE8E1] text-[#141414] p-8 clip-card h-96 flex flex-col bg-grid-pattern">
              <div className="flex justify-between font-mono text-xs font-bold mb-8">
                <span className="text-2xl font-sans tracking-tight font-bold">$10 Scalping Mode</span>
                <span className="text-gray-400">003</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-400"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gray-400"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gray-400"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gray-400"></div>

                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="40" cy="40" r="25" fill="none" stroke="#141414" strokeWidth="1.5" />
                    <circle cx="60" cy="40" r="25" fill="none" stroke="#141414" strokeWidth="1.5" />
                    <circle cx="50" cy="65" r="25" fill="none" stroke="#141414" strokeWidth="1.5" />
                    <path d="M 45 45 L 55 55 M 55 45 L 45 55 M 50 40 L 50 60 M 40 50 L 60 50" stroke="#141414" strokeWidth="0.5" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-6 font-medium">High-frequency near-the-money options with trades as small as $10.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Infrastructure Section */}
      <div className="border-t border-[#2A2A2A] bg-grid-pattern-dark relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#141414] to-transparent opacity-80 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-24 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start mb-16 gap-12">
            <div className="w-full lg:w-1/2">
              <h2 className="font-serif text-5xl md:text-6xl mb-6 leading-tight">High-Frequency<br/>Probabilistic Intelligence</h2>
              <p className="font-sans text-gray-400 max-w-md text-lg">
                Fetches real-time simulations from Synth (SN50) with 1-minute granularity to detect short-term price "wicks" and reversals.
              </p>
            </div>
            <div className="font-mono text-xs border border-[#2A2A2A] p-6 rounded-sm bg-[#1A1A1A]">
              <div className="flex justify-between gap-12 mb-3"><span className="text-accent">STATUS:</span><span>OPERATIONAL</span></div>
              <div className="flex justify-between gap-12 mb-3"><span className="text-accent">CRPS_CHECK:</span><span>0.42</span></div>
              <div className="flex justify-between gap-12"><span className="text-accent">NETWORK:</span><span>MODE_MAINNET</span></div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 border border-[#2A2A2A] bg-[#1A1A1A] p-8 flex items-center justify-center relative overflow-hidden clip-card-dark min-h-[400px]">
              <div className="absolute top-6 left-6 font-mono text-xs text-gray-600 border border-[#2A2A2A] px-2 py-1">FIG 04.2 // SN50_MAP</div>
              <div className="absolute top-6 right-6 flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
              </div>
              <div className="w-80 h-80 relative">
                <motion.svg
                  className="w-full h-full" viewBox="0 0 100 100"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#444" strokeWidth="1" />
                  <line x1="5" y1="50" x2="95" y2="50" stroke="#555" strokeWidth="1" />
                  <line x1="50" y1="5" x2="50" y2="95" stroke="#555" strokeWidth="1" />
                  <circle cx="50" cy="5" r="3" fill="#1A1A1A" stroke="#F05023" strokeWidth="2" />
                  <circle cx="95" cy="50" r="3" fill="#1A1A1A" stroke="#F05023" strokeWidth="2" />
                  <circle cx="50" cy="95" r="3" fill="#1A1A1A" stroke="#F05023" strokeWidth="2" />
                  <circle cx="5" cy="50" r="3" fill="#1A1A1A" stroke="#F05023" strokeWidth="2" />
                  <polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="#333" strokeWidth="1" />
                </motion.svg>
              </div>
            </div>

            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              <div className="border border-[#2A2A2A] bg-[#1A1A1A] p-8 clip-card-dark flex-1 flex flex-col justify-center">
                <div className="flex justify-between font-mono text-xs text-gray-600 mb-6">
                  <span className="border border-[#2A2A2A] px-2 py-1">UNIT_01</span>
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                  </div>
                </div>
                <div className="font-serif text-5xl mb-2">&lt;1min</div>
                <div className="font-mono text-sm text-accent">- Granularity</div>
                <div className="font-sans text-xs text-gray-400 mt-4 leading-relaxed">Price path simulations refreshed every minute. Detects micro-volatility wicks and reversals in real-time.</div>
              </div>

              <div className="border border-[#2A2A2A] bg-[#1A1A1A] p-8 clip-card-dark flex-1 flex flex-col justify-center">
                <div className="flex justify-between font-mono text-xs text-gray-600 mb-6">
                  <span className="border border-[#2A2A2A] px-2 py-1">UNIT_02</span>
                  <div className="flex gap-1 items-end h-4">
                    <div className="w-1.5 h-1.5 bg-gray-500"></div>
                    <div className="w-1.5 h-2.5 bg-gray-500"></div>
                    <div className="w-1.5 h-4 bg-gray-500"></div>
                  </div>
                </div>
                <div className="font-serif text-4xl mb-2">CRPS Filter</div>
                <div className="font-mono text-sm text-gray-500">Sharpness Detection</div>
                <div className="font-sans text-xs text-gray-400 mt-4 leading-relaxed">Uses Continuous Ranked Probability Score to gauge miner consensus. Sharp CRPS = high conviction trades. Noisy CRPS = agent de-risks automatically.</div>
              </div>

              <div className="border border-[#2A2A2A] bg-[#1A1A1A] p-8 clip-card-dark flex-1 flex flex-col justify-center opacity-50">
                <div className="flex justify-between font-mono text-xs text-gray-600 mb-6">
                  <span className="border border-[#2A2A2A] px-2 py-1">UNIT_03</span>
                  <span className="border border-[#2A2A2A] px-2 py-1">LOCKED</span>
                </div>
                <div className="font-serif text-4xl mb-2">Testnet</div>
                <div className="font-mono text-sm text-gray-500">Zero-Risk Dry Run</div>
                <div className="font-sans text-xs text-gray-400 mt-4 leading-relaxed">Full support for test.deribit.com. Run the agent with paper money to validate strategies before committing real capital.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deploy Intelligence Section */}
      <div className="bg-accent text-[#141414] py-32 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
          <div className="font-mono text-[15vw] font-bold whitespace-nowrap">AGENT_ONLINE //</div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row justify-between items-center gap-16">
          <div className="w-full lg:w-1/2">
            <div className="font-mono text-xs font-bold mb-8 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#141414]"></div>
              SYSTEM_READY
            </div>
            <h2 className="font-serif text-6xl md:text-8xl leading-none tracking-tight mb-8">
              Deploy<br/>MonteQ
            </h2>
            <p className="font-sans text-xl max-w-md font-medium">
              Connect your Deribit or Derive keys, set your budget, and let MonteQ AI trade autonomously. Start on testnet with zero risk, go live when you're ready.
            </p>
          </div>

          <div className="w-full lg:w-1/3">
            <div className="font-mono text-xs font-bold mb-4">AWAITING COMMAND...</div>
            <Link to="/trade" className="w-full bg-[#141414] text-[#EBE8E1] p-8 flex justify-between items-center hover:bg-black transition-colors clip-button">
              <span className="font-mono text-2xl font-bold">LAUNCH AGENT</span>
              <span className="border border-[#EBE8E1] px-4 py-2 text-sm">&rarr;</span>
            </Link>
            <div className="flex justify-between mt-6 font-mono text-xs border-b border-[#141414] pb-3 font-bold">
              <span>TESTNET_AVAILABLE</span>
              <span>NON_CUSTODIAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#141414] text-[#EBE8E1] py-20 px-4 sm:px-8 lg:px-12 border-t border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between mb-20 gap-12">
            <div className="w-full lg:w-1/4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-5 h-5 bg-accent clip-card"></div>
                <span className="font-serif text-3xl font-bold">MonteQ AI</span>
              </div>
              <p className="font-sans text-gray-500 mb-12 max-w-xs">
                Building the operating layer for automated options trading.
              </p>
              <div className="font-mono text-xs text-gray-600 tracking-widest">
                DERIBIT // MODE // SN50
              </div>
            </div>

            <div className="w-full lg:w-1/4">
              <h4 className="font-mono text-xs text-accent mb-8 tracking-widest">PRODUCT</h4>
              <ul className="space-y-4 font-sans text-gray-400">
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">Features</li>
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">Integrations</li>
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">Security</li>
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">Changelog</li>
              </ul>
            </div>

            <div className="w-full lg:w-1/4">
              <h4 className="font-mono text-xs text-accent mb-8 tracking-widest">COMPANY</h4>
              <ul className="space-y-4 font-sans text-gray-400">
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">About</li>
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">Careers</li>
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">Blog</li>
                <li className="hover:text-[#EBE8E1] cursor-pointer transition-colors">Contact</li>
              </ul>
            </div>

            <div className="w-full lg:w-1/4">
              <h4 className="font-mono text-xs text-accent mb-8 tracking-widest">UPDATES</h4>
              <p className="font-sans text-gray-400 mb-6">Subscribe to the engineering log.</p>
              <div className="flex items-center border-b border-[#2A2A2A] pb-3 mb-6">
                <span className="text-accent mr-3 font-mono">&gt;</span>
                <input type="text" placeholder="enter_email" className="bg-transparent outline-none font-mono text-sm text-[#EBE8E1] w-full placeholder-gray-600" />
              </div>
              <button className="border border-[#2A2A2A] px-6 py-3 font-mono text-xs hover:bg-[#2A2A2A] transition-colors tracking-widest">SUBSCRIBE</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-[#2A2A2A] font-mono text-xs text-gray-600 gap-4">
            <div>&copy; 2026 MONTEQ AI.</div>
            <div className="flex flex-wrap gap-8 justify-center">
              <span className="hover:text-gray-400 cursor-pointer transition-colors">PRIVACY POLICY</span>
              <span className="hover:text-gray-400 cursor-pointer transition-colors">TERMS OF SERVICE</span>
              <span className="flex items-center gap-2">
                SYSTEM STATUS: <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span> <span className="text-accent">ONLINE</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
