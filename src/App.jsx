import { useState, useEffect, useCallback } from 'react';
import { connectWallet, disconnectWallet } from './services/wallet.js';
import { fetchAllCampaigns, checkContract } from './services/campaigns.js';
import WalletBar    from './components/WalletBar.jsx';
import CreateForm   from './components/CreateForm.jsx';
import CampaignCard from './components/CampaignCard.jsx';

export default function App() {
  const [wallet,     setWallet]     = useState({ connected: false, address: null, network: null });
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);

  // Verify contract on-chain at startup (no wallet needed)
  useEffect(() => {
    checkContract()
      .then(({ exists, count }) => setDiagnostic(
        exists
          ? { ok: true,  msg: `Contrat trouvé · ${count} campagne(s) · Connecte MetaMask pour continuer.` }
          : { ok: false, msg: 'Aucun contrat sur Sepolia. Redéploie et mets à jour CONTRACT_ADDRESS.' }
      ))
      .catch(e => setDiagnostic({ ok: false, msg: `Erreur RPC : ${e.message}` }));
  }, []);

  const loadCampaigns = useCallback(async (addr = wallet.address) => {
    if (!addr) return;
    setLoading(true);
    try { setCampaigns(await fetchAllCampaigns(addr)); }
    catch (e) { console.error(e); }
    finally   { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.connected) loadCampaigns();
    else setCampaigns([]);
  }, [wallet.connected]);

  // Reset on MetaMask account/network change
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
    const { address, network } = await connectWallet();
    setWallet({ connected: true, address, network });
    await loadCampaigns(address);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setWallet({ connected: false, address: null, network: null });
    setCampaigns([]);
  };

  const renderList = () => {
    if (loading)
      return <div className="loading">Chargement…</div>;

    if (!wallet.connected)
      return diagnostic
        ? <div className={`diagnostic ${diagnostic.ok ? 'ok' : 'err'}`}>
            <i className={`ti ti-${diagnostic.ok ? 'circle-check' : 'alert-circle'}`} />
            {' '}{diagnostic.msg}
          </div>
        : <div className="empty-state">Connectez MetaMask pour voir les campagnes.</div>;

    if (campaigns.length === 0)
      return <div className="empty-state">Aucune campagne — créez la première !</div>;

    return campaigns.map(c => (
      <CampaignCard key={c.id} campaign={c} wallet={wallet} onAction={loadCampaigns} />
    ));
  };

  return (
    <div className="app">
      <WalletBar wallet={wallet} onConnect={handleConnect} onDisconnect={handleDisconnect} />
      <CreateForm wallet={wallet} onCreated={loadCampaigns} />

      <div className="section-header">
        <span className="section-title">Campagnes</span>
        <button className="btn-ghost" onClick={() => loadCampaigns()}
          disabled={loading || !wallet.connected}>
          <i className={`ti ti-refresh ${loading ? 'spinning' : ''}`} /> Actualiser
        </button>
      </div>

      <div id="campaigns-list">{renderList()}</div>
    </div>
  );
}
