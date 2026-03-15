import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../lib/auth';
import { auth } from '../lib/api';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = isSignup ? auth.signup : auth.login;
      const data = await fn(email, password);
      login(data.access_token);
      navigate('/trade');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-12 justify-center">
          <div className="w-5 h-5 bg-accent clip-card"></div>
          <span className="font-serif text-3xl font-bold text-[#EBE8E1]">MonteQ AI</span>
        </div>

        <div className="border border-[#2A2A2A] bg-[#1A1A1A] p-8">
          <div className="h-1 w-full bg-accent -mt-8 mb-8 -mx-8" style={{ width: 'calc(100% + 64px)' }}></div>

          <h2 className="font-mono text-lg font-bold text-[#EBE8E1] mb-2">
            {isSignup ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}
          </h2>
          <p className="font-mono text-xs text-gray-400 mb-8">
            {isSignup ? 'Sign up to start trading' : 'Enter credentials to access the trading agent'}
          </p>

          {error && (
            <div className="mb-6 p-3 border border-red-500/50 bg-red-500/5 font-mono text-xs text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-mono text-xs text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 font-mono text-sm outline-none focus:border-accent"
                placeholder="agent@monteq.ai"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#141414] border border-[#2A2A2A] text-[#EBE8E1] p-3 font-mono text-sm outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#EBE8E1] text-[#141414] p-4 font-mono text-sm font-bold hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? 'CONNECTING...' : isSignup ? 'SIGN UP' : 'LOGIN'}
            </button>
          </form>

          <div className="mt-6 text-center font-mono text-xs text-gray-400">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-accent hover:underline"
            >
              {isSignup ? 'Login' : 'Sign up'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
