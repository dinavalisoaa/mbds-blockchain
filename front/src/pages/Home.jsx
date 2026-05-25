import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllCampaigns } from '../services/campaigns.js';
import { txRefundAll } from '../services/transactions.js';
import CreateForm   from '../components/CreateForm.jsx';
import CampaignCard from '../components/CampaignCard.jsx';
import { Alert, Spinner, EmptyState, Button } from '../components/ui/index.js';

export default function Home({ wallet, diagnostic }) {
  const [campaigns,     setCampaigns]     = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [autoRefundMsg, setAutoRefundMsg] = useState(null);
  const refundedIds = useRef(new Set());

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
  }, [wallet.connected, wallet.address]);

  useEffect(() => {
    if (!wallet.connected || campaigns.length === 0) return;

    const addr = wallet.address?.toLowerCase();
    const toRefund = campaigns.filter(c =>
      c.status === 'failed' && !c.withdrawn &&
      c.creator.toLowerCase() === addr &&
      !refundedIds.current.has(c.id)
    );
    if (toRefund.length === 0) return;

    toRefund.forEach(c => refundedIds.current.add(c.id));
    setAutoRefundMsg({ type: 'info', msg: `Remboursement automatique en cours pour ${toRefund.length} campagne(s)…` });

    (async () => {
      let ok = 0; let fail = 0;
      for (const c of toRefund) {
        try { await txRefundAll(c.id); ok++; }
        catch (e) { fail++; console.error(`refundAll(${c.id}):`, e.message); }
      }
      setAutoRefundMsg(
        fail === 0
          ? { type: 'success', msg: `✓ ${ok} campagne(s) remboursée(s) automatiquement.` }
          : { type: 'error',   msg: `${ok} réussie(s), ${fail} échouée(s) — vérifiez MetaMask.` }
      );
      await loadCampaigns();
      setTimeout(() => setAutoRefundMsg(null), 6000);
    })();
  }, [campaigns, wallet.connected, wallet.address]);

  const renderList = () => {
    if (loading) return <Spinner label="Chargement des campagnes…" />;

    if (!wallet.connected)
      return diagnostic
        ? <Alert type={diagnostic.ok ? 'success' : 'error'}>{diagnostic.msg}</Alert>
        : <EmptyState title="Connectez MetaMask pour voir les campagnes." />;

    if (campaigns.length === 0)
      return <EmptyState icon="ti-rocket" title="Aucune campagne" subtitle="Créez la première via le formulaire ci-dessus !" />;

    return campaigns.map(c => (
      <CampaignCard key={c.id} campaign={c} wallet={wallet} onAction={loadCampaigns} />
    ));
  };

  return (
    <>
      <CreateForm wallet={wallet} onCreated={loadCampaigns} />

      <div className="section-header">
        <span className="section-title">Campagnes</span>
        <Button variant="ghost" icon="ti-refresh" loading={loading}
          disabled={!wallet.connected} onClick={() => loadCampaigns()}>
          Actualiser
        </Button>
      </div>

      {autoRefundMsg && (
        <Alert type={autoRefundMsg.type} onClose={() => setAutoRefundMsg(null)}>
          {autoRefundMsg.msg}
        </Alert>
      )}

      <div id="campaigns-list">{renderList()}</div>
    </>
  );
}
