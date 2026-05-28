import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchAllCampaigns } from '../services/campaigns.js';
import { txWithdraw, txRefund, txCancelCampaign } from '../services/transactions.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Button, Badge, Alert, ProgressBar, Spinner, EmptyState, Card } from '../components/ui/index.js';

function MyCampaignRow({ campaign: c, onAction }) {
  const runTx = useTx();
  const [loading, setLoading] = useState(false);

  const run = async (fn, labels) => {
    setLoading(true);
    try { await runTx(fn, labels); await onAction(); }
    catch { /* toast affiche l'erreur */ }
    finally { setLoading(false); }
  };

  return (
    <div className="dash-row">
      <div className="dash-row-info">
        <div className="dash-row-title">{c.title}</div>
        <div className="dash-row-meta">
          <span>{c.amountRaisedEth} / {c.goalEth} ETH</span>
          <span>· {c.progress}%</span>
          <span>· {c.timeLeft}</span>
          {c.category !== undefined && <span>· {CATEGORIES[c.category] ?? '—'}</span>}
        </div>
        <div style={{ marginTop: 6 }}>
          <ProgressBar percent={c.progress} status={c.status} showLabels={false} />
        </div>
      </div>

      <div className="dash-row-badge"><Badge status={c.status} /></div>

      <div className="dash-row-actions">
        {c.status === 'success' && !c.withdrawn && (
          <Button variant="primary" size="sm" icon="ti-download" loading={loading}
            onClick={() => run(() => txWithdraw(c.id), TX_LABELS.withdraw)}>
            WITHDRAW
          </Button>
        )}
        {c.status === 'active' && c.amountRaised === 0n && (
          <Button variant="danger" size="sm" icon="ti-x" loading={loading}
            onClick={() => run(() => txCancelCampaign(c.id), TX_LABELS.cancelCampaign)}>
            CANCEL
          </Button>
        )}
        {c.status === 'success' && c.withdrawn && (
          <span className="dash-withdrawn"><i className="ti ti-circle-check" /> WITHDRAWN</span>
        )}
      </div>
    </div>
  );
}

function MyContribRow({ campaign: c, onAction }) {
  const runTx = useTx();
  const [loading, setLoading] = useState(false);

  const run = async (fn, labels) => {
    setLoading(true);
    try { await runTx(fn, labels); await onAction(); }
    catch { /* toast affiche l'erreur */ }
    finally { setLoading(false); }
  };

  return (
    <div className="dash-row">
      <div className="dash-row-info">
        <div className="dash-row-title">{c.title}</div>
        <div className="dash-row-meta">
          <span><i className="ti ti-coin" /> MY_CONTRIBUTION: <strong>{c.myContribEth} ETH</strong></span>
          <span>· GOAL: {c.goalEth} ETH</span>
        </div>
      </div>

      <div className="dash-row-badge"><Badge status={c.status} /></div>

      <div className="dash-row-actions">
        {c.status === 'failed' && c.myContrib > 0n && (
          <Button variant="ghost" size="sm" icon="ti-receipt-refund" loading={loading}
            onClick={() => run(() => txRefund(c.id), TX_LABELS.refund)}>
            REFUND
          </Button>
        )}
        {c.status === 'success' && (
          <span className="dash-withdrawn"><i className="ti ti-circle-check" /> GOAL_REACHED</span>
        )}
        {c.status === 'active' && (
          <span style={{ fontSize: 11, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <i className="ti ti-clock" /> IN_PROGRESS
          </span>
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

  const load = useCallback(async () => {
    if (!wallet.address) return;
    setLoading(true);
    try { setCampaigns(await fetchAllCampaigns(wallet.address)); }
    catch (e) { console.error(e); }
    finally   { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => { load(); }, [wallet.address]);

  if (!wallet.connected) return <Navigate to="/" replace />;

  const addr = wallet.address?.toLowerCase();

  const myCampaigns = campaigns.filter(c => c.creator.toLowerCase() === addr);
  const myContribs  = campaigns.filter(c => c.myContrib > 0n && c.creator.toLowerCase() !== addr);

  const pendingWithdraw = myCampaigns.filter(c => c.status === 'success' && !c.withdrawn).length;
  const pendingRefund   = myContribs.filter(c  => c.status === 'failed'  && c.myContrib > 0n).length;
  const totalContrib    = myContribs.reduce((sum, c) => sum + Number(c.myContribEth), 0).toFixed(4);

  if (loading) return <Spinner label="LOADING_DASHBOARD..." />;

  return (
    <div>
      <h2 className="page-title">DASHBOARD</h2>

      <div className="stats-grid">
        <StatCard icon="ti-rocket"         value={myCampaigns.length}    label="CAMPAIGNS_CREATED" />
        <StatCard icon="ti-coin"           value={`${totalContrib} ETH`} label="TOTAL_CONTRIBUTED" />
        <StatCard icon="ti-download"       value={pendingWithdraw}       label="PENDING_WITHDRAWALS"
          color={pendingWithdraw > 0 ? 'var(--green)' : undefined} />
        <StatCard icon="ti-receipt-refund" value={pendingRefund}         label="PENDING_REFUNDS"
          color={pendingRefund > 0 ? 'var(--blue)' : undefined} />
      </div>

      {pendingWithdraw > 0 && (
        <Alert type="success">
          <strong>{pendingWithdraw} CAMPAIGN{pendingWithdraw > 1 ? 'S' : ''}</strong> READY_FOR_WITHDRAWAL.
        </Alert>
      )}
      {pendingRefund > 0 && (
        <Alert type="info">
          <strong>{pendingRefund} REFUND{pendingRefund > 1 ? 'S' : ''}</strong> AVAILABLE.
        </Alert>
      )}

      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <span className="section-title">
          MY_CAMPAIGNS
          <span className="section-count">{myCampaigns.length}</span>
        </span>
      </div>

      <Card>
        {myCampaigns.length === 0
          ? <EmptyState icon="ti-rocket" title="NO_CAMPAIGNS_CREATED"
              subtitle="GO_TO_HOME_TO_DEPLOY_YOUR_FIRST_CAMPAIGN." />
          : myCampaigns.map(c => <MyCampaignRow key={c.id} campaign={c} onAction={load} />)
        }
      </Card>

      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <span className="section-title">
          MY_CONTRIBUTIONS
          <span className="section-count">{myContribs.length}</span>
        </span>
      </div>

      <Card>
        {myContribs.length === 0
          ? <EmptyState icon="ti-heart" title="NO_CONTRIBUTIONS"
              subtitle="YOU_HAVE_NOT_CONTRIBUTED_TO_ANY_CAMPAIGN." />
          : myContribs.map(c => <MyContribRow key={c.id} campaign={c} onAction={load} />)
        }
      </Card>
    </div>
  );
}
