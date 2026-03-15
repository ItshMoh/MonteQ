import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Trade } from './pages/Trade';
import { History } from './pages/History';
import { Portfolio } from './pages/Portfolio';
import { Login } from './pages/Login';
import { ToastProvider } from './components/Toast';
import { DialogProvider } from './components/ConfirmationDialog';
import { AuthProvider } from './lib/auth';
import { WsProvider } from './lib/ws';

export default function App() {
  return (
    <AuthProvider>
      <WsProvider>
        <ToastProvider>
          <DialogProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route element={<Layout />}>
                  <Route path="/trade" element={<Trade />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                </Route>
              </Routes>
            </Router>
          </DialogProvider>
        </ToastProvider>
      </WsProvider>
    </AuthProvider>
  );
}
