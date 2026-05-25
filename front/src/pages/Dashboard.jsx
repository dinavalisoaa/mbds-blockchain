import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchAllCampaigns } from '../services/campaigns.js';
import { txWithdraw, txRefund, txCancelCampaign } from '../services/transactions.js';
import { Button, Badge, Alert, ProgressBar, Spinner, EmptyState, Card } from '../components/ui/index.js';

const CATEGORY_LABELS = [
  'Technologie', 'Art', 'Social', 'Environnement',
  'Éducation', 'Musique', 'Film', 'Jeux', 'Alimentation', 'Autre',
];

function MyCampaignRow({ campaign: c, onAction }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const run = async (fn) => {
    setLoading(true); setError(null);
    try { await fn(); await onAction(); }
    catch (e) { setError(e.reason || e.message); }
    finally   { setLoading(false); }
  };

  return (
    <div className="dash-row">
      <div className="dash-row-info">
        <div className="dash-row-title">{c.title}</div>
        <div className="dash-row-meta">
          <span>{c.amountRaisedEth} / {c.goalEth} ETH</span>
          <span>· {c.progress}%</span>
          <span>· {c.timeLeft}</span>
          {c.category !== undefined && <span>· {CATEGORY_LABELS[c.category] ?? '—'}</span>}
        </div>
        <div style={{ marginTop: 6 }}>
          <ProgressBar percent={c.progress} status={c.status} showLabels={false} />
        </div>
        <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
      </div>

      <div className="dash-row-badge"><Badge status={c.status} /></div>

      <div className="dash-row-actions">
        {c.status === 'success' && !c.withdrawn && (
          <Button variant="primary" size="sm" icon="ti-download" loading={loading}
            onClick={() => run(() => txWithdraw(c.id))}>
            Retirer {c.amountRaisedEth} ETH
          </Button>
        )}
        {c.status === 'active' && c.amountRaised === 0n && (
          <Button variant="danger" size="sm" icon="ti-x" loading={loading}
            onClick={() => run(() => txCancelCampaign(c.id))}>
            Annuler
          </Button>
        )}
        {c.status === 'success' && c.withdrawn && (
          <span className="dash-withdrawn"><i className="ti ti-circle-check" /> Retiré</span>
        )}
      </div>
    </div>
  );
}

function MyContribRow({ campaign: c, onAction }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const run = async (fn) => {
    setLoading(true); setError(null);
    try { await fn(); await onAction(); }
    catch (e) { setError(e.reason || e.message); }
    finally   { setLoading(false); }
  };

  return (
    <div className="dash-row">
      <div className="dash-row-info">
        <div className="dash-row-title">{c.title}</div>
        <div className="dash-row-meta">
          <span><i className="ti ti-coin" /> Ma contribution : <strong>{c.myContribEth} ETH</strong></span>
          <span>· Objectif : {c.goalEth} ETH</span>
        </div>
        <Alert type="error" onClose={() => setError(null)}>{error}</Alert>
      </div>

      <div className="dash-row-badge"><Badge status={c.status} /></div>

      <div className="dash-row-actions">
        {c.status === 'failed' && c.myContrib > 0n && (
          <Button variant="ghost" size="sm" icon="ti-receipt-refund" loading={loading}
            onClick={() => run(() => txRefund(c.id))}>
            Récupérer {c.myContribEth} ETH
          </Button>
        )}
        {c.status === 'success' && (
          <span className="dash-withdrawn"><i className="ti ti-circle-check" /> Objectif atteint</span>
        )}
        {c.status === 'active' && (
          <span style={{ fontSize: 11, color: 'var(--blue)' }}><i className="ti ti-clock" /> En cours</span>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color = 'var(--text)' }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, marginRight: 6, opacity: 0.7 }} />
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Dashboard({ wallet }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);

  if (!wallet.connected) return <Navigate to="/" replace />;

  const load = useCallback(async () => {
    setLoading(true);
    try { setCampaigns(await fetchAllCampaigns(wallet.address)); }
    catch (e) { console.error(e); }
    finally   { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => { load(); }, [wallet.address]);

  const addr = wallet.address?.toLowerCase();

  const myCampaigns = campaigns.filter(c => c.creator.toLowerCase() === addr);
  const myContribs  = campaigns.filter(c => c.myContrib > 0n && c.creator.toLowerCase() !== addr);

  const pendingWithdraw = myCampaigns.filter(c => c.status === 'success' && !c.withdrawn).length;
  const pendingRefund   = myContribs.filter(c  => c.status === 'failed'  && c.myContrib > 0n).length;
  const totalContrib    = myContribs.reduce((sum, c) => sum + Number(c.myContribEth), 0).toFixed(4);

  if (loading) return <Spinner label="Chargement du dashboard…" />;

  return (
    <div>
      <h2 className="page-title">
        <i className="ti ti-layout-dashboard" /> Dashboard
      </h2>

      <div className="stats-grid">
        <StatCard icon="ti-rocket"         value={myCampaigns.length}    label="Campagnes créées" />
        <StatCard icon="ti-coin"           value={`${totalContrib} ETH`} label="Total contribué" />
        <StatCard icon="ti-download"       value={pendingWithdraw}       label="Retraits disponibles"
          color={pendingWithdraw > 0 ? 'var(--green)' : undefined} />
        <StatCard icon="ti-receipt-refund" value={pendingRefund}         label="Remboursements dispo."
          color={pendingRefund > 0 ? 'var(--blue)' : undefined} />
      </div>

      {pendingWithdraw > 0 && (
        <Alert type="success">
          <strong>{pendingWithdraw} campagne{pendingWithdraw > 1 ? 's' : ''}</strong> prête{pendingWithdraw > 1 ? 's' : ''} pour retrait.
        </Alert>
      )}
      {pendingRefund > 0 && (
        <Alert type="info">
          <strong>{pendingRefund} remboursement{pendingRefund > 1 ? 's' : ''}</strong> disponible{pendingRefund > 1 ? 's' : ''}.
        </Alert>
      )}

      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <span className="section-title">
          <i className="ti ti-rocket" /> Mes campagnes
          <span className="section-count">{myCampaigns.length}</span>
        </span>
      </div>

      <Card>
        {myCampaigns.length === 0
          ? <EmptyState icon="ti-rocket" title="Aucune campagne créée"
              subtitle="Retournez sur l'accueil pour créer votre première campagne." />
          : myCampaigns.map(c => <MyCampaignRow key={c.id} campaign={c} onAction={load} />)
        }
      </Card>

      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <span className="section-title">
          <i className="ti ti-heart" /> Mes contributions
          <span className="section-count">{myContribs.length}</span>
        </span>
      </div>

      <Card>
        {myContribs.length === 0
          ? <EmptyState icon="ti-heart" title="Aucune contribution"
              subtitle="Vous n'avez pas encore contribué à une campagne." />
          : myContribs.map(c => <MyContribRow key={c.id} campaign={c} onAction={load} />)
        }
      </Card>
    </div>
  );
}
