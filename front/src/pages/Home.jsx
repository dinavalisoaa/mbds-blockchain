import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllCampaigns } from '../services/campaigns.js';
import { txRefundAll } from '../services/transactions.js';
import { useTx } from '../hooks/useTx.js';
import { TX_LABELS } from '../constants.js';
import CreateForm   from '../components/CreateForm.jsx';
import CampaignCard from '../components/CampaignCard.jsx';
import { Alert, Spinner, EmptyState, Button } from '../components/ui/index.js';

export default function Home({ wallet, diagnostic, activeCategory }) {
  const runTx = useTx();
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(false);
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
    if (!toRefund.length) return;
    toRefund.forEach(c => refundedIds.current.add(c.id));
    (async () => {
      for (const c of toRefund) {
        try { await runTx(() => txRefundAll(c.id), TX_LABELS.refundAll); }
        catch { /* toast already shown */ }
      }
      loadCampaigns();
    })();
  }, [campaigns, wallet.connected, wallet.address]);

  const filtered = activeCategory === null
    ? campaigns
    : campaigns.filter(c => c.category === activeCategory);

  const renderList = () => {
    if (loading) return <Spinner label="Chargement des campagnes…" />;
    if (!wallet.connected)
      return diagnostic
        ? <Alert type={diagnostic.ok ? 'success' : 'error'}>{diagnostic.msg}</Alert>
        : <EmptyState title="Connectez MetaMask pour voir les campagnes." />;
    if (!filtered.length)
      return <EmptyState icon="ti-rocket" title="Aucune campagne" subtitle={
        activeCategory !== null ? 'Aucune campagne dans cette catégorie.' : 'Créez la première !'
      } />;
    return filtered.map(c => (
      <CampaignCard key={c.id} campaign={c} wallet={wallet} onAction={loadCampaigns} />
    ));
  };

  return (
    <>
      <CreateForm wallet={wallet} onCreated={loadCampaigns} />

      <div className="section-header">
        <span className="section-title">
          Campagnes
          {filtered.length > 0 && <span className="section-count">{filtered.length}</span>}
        </span>
        <Button variant="ghost" icon="ti-refresh" loading={loading}
          disabled={!wallet.connected} onClick={() => loadCampaigns()}>
          Actualiser
        </Button>
      </div>

      <div id="campaigns-list">{renderList()}</div>
    </>
  );
}
