import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { connectWallet, disconnectWallet } from './services/wallet.js';
import { checkContract } from './services/campaigns.js';
import Navbar    from './components/Navbar.jsx';
import Home      from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const [wallet,     setWallet]     = useState({ connected: false, address: null, network: null });
  const [connecting, setConnecting] = useState(false);
  const [connError,  setConnError]  = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);

  useEffect(() => {
    checkContract()
      .then(({ exists, count }) => setDiagnostic(
        exists
          ? { ok: true,  msg: `Contrat trouvé · ${count} campagne(s) · Connecte MetaMask pour continuer.` }
          : { ok: false, msg: 'Aucun contrat sur Sepolia. Redéploie et mets à jour CONTRACT_ADDRESS.' }
      ))
      .catch(e => setDiagnostic({ ok: false, msg: `Erreur RPC : ${e.message}` }));
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
    setConnError(null);
    try {
      const { address, network } = await connectWallet();
      setWallet({ connected: true, address, network });
    } catch (e) {
      setConnError(e.reason || e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWallet({ connected: false, address: null, network: null });
    setConnError(null);
  };

  return (
    <HashRouter>
      <div className="app">
        <Navbar
          wallet={wallet}
          connecting={connecting}
          connError={connError}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
        <Routes>
          <Route path="/"          element={<Home      wallet={wallet} diagnostic={diagnostic} />} />
          <Route path="/dashboard" element={<Dashboard wallet={wallet} />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
