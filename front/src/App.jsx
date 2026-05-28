import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { connectWallet, disconnectWallet } from './services/wallet.js';
import { checkContract } from './services/campaigns.js';
import { useToast } from './context/ToastContext.jsx';
import Navbar          from './components/Navbar.jsx';
import Footer          from './components/Footer.jsx';
import ToastContainer  from './components/ToastContainer.jsx';
import Home            from './pages/Home.jsx';
import Dashboard       from './pages/Dashboard.jsx';
import CampaignDetail  from './pages/CampaignDetail.jsx';
import CreateCampaign  from './pages/CreateCampaign.jsx';

export default function App() {
  const { add } = useToast();

  const [wallet,         setWallet]         = useState({ connected: false, address: null, network: null });
  const [connecting,     setConnecting]     = useState(false);
  const [diagnostic,     setDiagnostic]     = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    checkContract()
      .then(({ exists, count }) => setDiagnostic(
        exists
          ? { ok: true,  msg: `CONTRACT_FOUND · ${count} CAMPAIGN(S) · CONNECT_METAMASK_TO_CONTINUE.` }
          : { ok: false, msg: 'NO_CONTRACT_ON_SEPOLIA. REDEPLOY_AND_UPDATE_CONTRACT_ADDRESS.' }
      ))
      .catch(e => setDiagnostic({ ok: false, msg: `RPC_ERROR: ${e.message}` }));
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const reset = () => {
      disconnectWallet();
      setWallet({ connected: false, address: null, network: null });
    };
    window.ethereum.on('accountsChanged', reset);
    window.ethereum.on('chainChanged',    reset);
    return () => {
      window.ethereum.removeListener('accountsChanged', reset);
      window.ethereum.removeListener('chainChanged',    reset);
    };
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { address, network } = await connectWallet();
      setWallet({ connected: true, address, network });
    } catch (e) {
      add({ type: 'error', message: e.reason || e.message });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWallet({ connected: false, address: null, network: null });
  };

  return (
    <HashRouter>
      <div className="app">
        <Navbar
          wallet={wallet}
          connecting={connecting}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
        <Routes>
          <Route path="/"          element={<Home      wallet={wallet} diagnostic={diagnostic} />} />
          <Route path="/dashboard"   element={<Dashboard wallet={wallet} />} />
          <Route path="/campaign/:id" element={<CampaignDetail wallet={wallet} />} />
          <Route path="/create"       element={<CreateCampaign wallet={wallet} />} />
        </Routes>
        <Footer />
      </div>
      <ToastContainer />
    </HashRouter>
  );
}