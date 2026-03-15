import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Navbar({ isBotRunning }: { isBotRunning: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navLinks = [
    { name: 'Trade', path: '/trade' },
    { name: 'History', path: '/history' },
    { name: 'Portfolio', path: '/portfolio' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#141414] text-[#EBE8E1] border-b border-[#2A2A2A] px-4 sm:px-8 lg:px-12 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-5 h-5 bg-accent clip-card"></div>
          <span className="font-serif text-2xl font-bold">MonteQ AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-mono text-sm">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`relative hover:text-accent transition-colors ${
                  isActive ? 'text-accent font-bold' : 'text-gray-400'
                }`}
              >
                {link.name}
                {link.name === 'Trade' && isBotRunning && (
                  <span className="absolute -right-3 top-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button className="relative hover:text-accent transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="relative group cursor-pointer">
          <div className="w-8 h-8 bg-[#2A2A2A] rounded-full flex items-center justify-center hover:bg-[#333] transition-colors">
            <User className="w-4 h-4" />
          </div>
          <div className="absolute right-0 mt-2 w-48 bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="py-2 font-mono text-xs">
              <Link to="/portfolio" className="block px-4 py-2 hover:bg-[#2A2A2A] transition-colors">Settings</Link>
              <Link to="/portfolio" className="block px-4 py-2 hover:bg-[#2A2A2A] transition-colors">API Keys</Link>
              <div onClick={handleLogout} className="px-4 py-2 hover:bg-[#2A2A2A] transition-colors text-red-400 border-t border-[#2A2A2A] mt-2 pt-2">Logout</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
