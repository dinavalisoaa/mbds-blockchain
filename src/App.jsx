import { useState, useEffect, useCallback, useRef } from 'react';
import { connectWallet, disconnectWallet } from './services/wallet.js';
import { fetchAllCampaigns, checkContract } from './services/campaigns.js';
import { txRefundAll } from './services/transactions.js';
import WalletBar    from './components/WalletBar.jsx';
import CreateForm   from './components/CreateForm.jsx';
import CampaignCard from './components/CampaignCard.jsx';

export default function App() {
  const [wallet,     setWallet]     = useState({ connected: false, address: null, network: null });
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [autoRefundMsg, setAutoRefundMsg] = useState(null); // { type, msg }
  // Track which campaign IDs we already attempted refundAll for (avoid re-firing on reload)
  const refundedIds = useRef(new Set());

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

  // Auto-refundAll: when creator connects, refund all failed campaigns automatically
  useEffect(() => {
    if (!wallet.connected || campaigns.length === 0) return;

    const addr = wallet.address?.toLowerCase();
    const toRefund = campaigns.filter(c =>
      c.status === 'failed' &&
      !c.withdrawn &&
      c.creator.toLowerCase() === addr &&
      !refundedIds.current.has(c.id)
    );

    if (toRefund.length === 0) return;

    // Mark as attempted immediately to prevent double-fire
    toRefund.forEach(c => refundedIds.current.add(c.id));

    setAutoRefundMsg({ type: 'info', msg: `Remboursement automatique en cours pour ${toRefund.length} campagne(s)…` });

    (async () => {
      let ok = 0;
      let fail = 0;
      for (const c of toRefund) {
        try {
          await txRefundAll(c.id);
          ok++;
        } catch (e) {
          fail++;
          console.error(`refundAll(${c.id}) failed:`, e.message);
        }
      }
      if (fail === 0) {
        setAutoRefundMsg({ type: 'success', msg: `✓ ${ok} campagne(s) remboursée(s) automatiquement.` });
      } else {
        setAutoRefundMsg({ type: 'error', msg: `${ok} réussie(s), ${fail} échouée(s) — vérifiez MetaMask.` });
      }
      // Reload to reflect new withdrawn state
      await loadCampaigns();
      setTimeout(() => setAutoRefundMsg(null), 6000);
    })();
  }, [campaigns, wallet.connected, wallet.address]);

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
    refundedIds.current.clear();
    setAutoRefundMsg(null);
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

      {autoRefundMsg && (
        <p className={`status-msg ${autoRefundMsg.type}`} style={{ margin: '0.5rem 0' }}>
          <i className="ti ti-refresh" /> {autoRefundMsg.msg}
        </p>
      )}

      <div id="campaigns-list">{renderList()}</div>
    </div>
  );
}
