import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchAllCampaigns } from '../services/campaigns.js';
import { txWithdraw, txRefund, txCancelCampaign } from '../services/transactions.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Spinner, Alert } from '../components/ui/index.js';
import '../styles/Dashboard.css';

const SEGS = 12;

function SegBar({ percent, status }) {
  const filled = Math.round((Math.min(percent, 100) / 100) * SEGS);
  return (
    <div className="dash2-segs">
      {Array.from({ length: SEGS }).map((_, i) => (
        <div
          key={i}
          className={`dash2-seg ${i < filled ? 'dash2-seg--on' : 'dash2-seg--off'}`}
          style={i < filled && status === 'failed' ? { background: 'var(--red)' } : undefined}
        />
      ))}
    </div>
  );
}

function StatusCell({ status }) {
  const labels = {
    active:    'ACTIF',
    success:   'SUCCÈS',
    failed:    'ÉCHOUÉ',
    cancelled: 'ANNULÉ',
    closed:    'FERMÉ',
  };
  return (
    <div className="dash2-status">
      <div className={`dash2-dot dash2-dot--${status}`} />
      <span className={`dash2-status-txt--${status}`}>{labels[status] ?? status.toUpperCase()}</span>
    </div>
  );
}

function ContribBadge({ status }) {
  const map = {
    failed:    ['dash2-cbadge--failed',    'ÉCHOUÉ'],
    success:   ['dash2-cbadge--verified',  'VÉRIFIÉ'],
    active:    ['dash2-cbadge--pending',   'EN COURS'],
    cancelled: ['dash2-cbadge--cancelled', 'ANNULÉ'],
    closed:    ['dash2-cbadge--cancelled', 'FERMÉ'],
  };
  const [cls, label] = map[status] ?? ['dash2-cbadge--cancelled', status.toUpperCase()];
  return <span className={`dash2-cbadge ${cls}`}>{label}</span>;
}

function CampaignRow({ campaign: c, onAction }) {
  const runTx = useTx();
  const [loading, setLoading] = useState(false);

  const run = async (fn, labels) => {
    setLoading(true);
    try { await runTx(fn, labels); await onAction(); }
    catch { /* toast */ }
    finally { setLoading(false); }
  };

  const shortAddr = `${c.creator.slice(0, 5)}...${c.creator.slice(-3)}`;

  return (
    <tr>
      <td>
        <div className="dash2-camp-name">{c.title}</div>
        <div className="dash2-camp-addr">{shortAddr}</div>
      </td>
      <td>
        <div className="dash2-prog-pct" style={{ color: c.status === 'failed' ? 'var(--red)' : 'var(--green)' }}>
          {c.progress}%
        </div>
        <SegBar percent={c.progress} status={c.status} />
      </td>
      <td>
        <span className="dash2-goal">{c.goalEth}</span>
        <span className="dash2-goal-unit">ETH</span>
      </td>
      <td><StatusCell status={c.status} /></td>
      <td>
        {c.status === 'success' && !c.withdrawn && (
          <button className="dash2-btn-withdraw" disabled={loading}
            onClick={() => run(() => txWithdraw(c.id), TX_LABELS.withdraw)}>
            {loading ? <i className="ti ti-loader-2 spinning" /> : 'RETIRER'}
          </button>
        )}
        {c.status === 'active' && c.amountRaised === 0n && (
          <button className="dash2-btn-cancel" disabled={loading}
            onClick={() => run(() => txCancelCampaign(c.id), TX_LABELS.cancelCampaign)}>
            {loading ? <i className="ti ti-loader-2 spinning" /> : 'ANNULER'}
          </button>
        )}
        {c.status === 'success' && c.withdrawn && (
          <span className="dash2-withdrawn-txt">
            <i className="ti ti-circle-check" /> RETIRÉ
          </span>
        )}
      </td>
    </tr>
  );
}

function ContribCard({ campaign: c, onAction }) {
  const runTx = useTx();
  const [loading, setLoading] = useState(false);

  const run = async (fn, labels) => {
    setLoading(true);
    try { await runTx(fn, labels); await onAction(); }
    catch { /* toast */ }
    finally { setLoading(false); }
  };

  const shortId = `CAMP #${c.id}`;

  return (
    <div className="dash2-contrib-card">
      <div className="dash2-contrib-top">
        <span className="dash2-contrib-name">{c.title}</span>
        <ContribBadge status={c.status} />
      </div>
      <div className="dash2-contrib-tx">ID: {shortId}</div>
      <div className="dash2-contrib-bottom">
        <div>
          <span className="dash2-contrib-amt">{c.myContribEth}</span>
          <span className="dash2-contrib-amt-unit">ETH</span>
        </div>
        {c.status === 'failed' && c.myContrib > 0n && (
          <button className="dash2-btn-refund" disabled={loading}
            onClick={() => run(() => txRefund(c.id), TX_LABELS.refund)}>
            {loading ? <i className="ti ti-loader-2 spinning" /> : 'REMBOURSER'}
          </button>
        )}
        {c.status === 'success' && (
          <i className="ti ti-circle-check dash2-check" />
        )}
        {c.status === 'active' && (
          <i className="ti ti-loader-2 dash2-spin" />
        )}
        {(c.status === 'cancelled' || c.status === 'closed') && (
          <i className="ti ti-ban" style={{ color: 'var(--text-muted)', fontSize: 16 }} />
        )}
      </div>
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
  const short = wallet.address
    ? `${wallet.address.slice(0, 5)}...${wallet.address.slice(-4)}_ROOT`
    : '';

  const myCampaigns  = campaigns.filter(c => c.creator.toLowerCase() === addr);
  const myContribs   = campaigns.filter(c => c.myContrib > 0n && c.creator.toLowerCase() !== addr);
  const allMyContribs = campaigns.filter(c => c.myContrib > 0n);

  const pendingWithdraw = myCampaigns.filter(c => c.status === 'success' && !c.withdrawn).length;
  const pendingRefund   = myContribs.filter(c => c.status === 'failed' && c.myContrib > 0n).length;
  const totalContrib    = allMyContribs.reduce((sum, c) => sum + Number(c.myContribEth), 0).toFixed(4);
  const withdrawableEth = myCampaigns
    .filter(c => c.status === 'success' && !c.withdrawn)
    .reduce((s, c) => s + Number(c.amountRaisedEth), 0).toFixed(4);
  const refundableEth   = myContribs
    .filter(c => c.status === 'failed' && c.myContrib > 0n)
    .reduce((s, c) => s + Number(c.myContribEth), 0).toFixed(4);

  const activeCampaigns = myCampaigns.filter(c => c.status === 'active').length;

  if (loading) return <Spinner label="CHARGEMENT..." />;

  return (
    <div>
      {/* ── Stats ── */}
      <div className="dash2-stats">
        <div className="dash2-stat">
          <div className="dash2-stat-label">CAMPAGNES CRÉÉES</div>
          <div className="dash2-stat-value">
            <span className="dash2-stat-num dash2-stat-num--white">
              {String(myCampaigns.length).padStart(2, '0')}
            </span>
          </div>
          <div className="dash2-stat-sub">/ {activeCampaigns} ACTIF{activeCampaigns !== 1 ? 'S' : ''}</div>
        </div>

        <div className="dash2-stat dash2-stat--highlight">
          <div className="dash2-stat-label">TOTAL CONTRIBUÉ</div>
          <div className="dash2-stat-value">
            <span className="dash2-stat-num dash2-stat-num--green">{totalContrib}</span>
            <span className="dash2-stat-unit">ETH</span>
          </div>
        </div>

        <div className={`dash2-stat${pendingWithdraw > 0 ? ' dash2-stat--green' : ''}`}>
          <div className="dash2-stat-label">RETRAITS DISPONIBLES</div>
          <div className="dash2-stat-value">
            <span className="dash2-stat-num dash2-stat-num--green">{withdrawableEth}</span>
            <span className="dash2-stat-unit">ETH</span>
          </div>
        </div>

        <div className={`dash2-stat${pendingRefund > 0 ? ' dash2-stat--red' : ''}`}>
          <div className="dash2-stat-label">REMBOURSEMENTS DISPONIBLES</div>
          <div className="dash2-stat-value">
            <span className="dash2-stat-num dash2-stat-num--red">{refundableEth}</span>
            <span className="dash2-stat-unit">ETH</span>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {pendingWithdraw > 0 && (
        <Alert type="success" style={{ marginBottom: 12 }}>
          <strong>{pendingWithdraw} CAMPAGNE{pendingWithdraw > 1 ? 'S' : ''}</strong> PRÊTE{pendingWithdraw > 1 ? 'S' : ''} POUR RETRAIT.
        </Alert>
      )}
      {pendingRefund > 0 && (
        <Alert type="info" style={{ marginBottom: 12 }}>
          <strong>{pendingRefund} REMBOURSEMENT{pendingRefund > 1 ? 'S' : ''}</strong> DISPONIBLE{pendingRefund > 1 ? 'S' : ''}.
        </Alert>
      )}

      {/* ── Body: two columns ── */}
      <div className="dash2-body">

        {/* LEFT: My Campaigns table */}
        <div>
          <div className="dash2-sec-header">
            <span className="dash2-sec-title">MES CAMPAGNES</span>
            <span className="dash2-sec-addr">{short}</span>
          </div>
          <div className="dash2-table-wrap">
            {myCampaigns.length === 0 ? (
              <div className="dash2-empty">AUCUNE CAMPAGNE CRÉÉE</div>
            ) : (
              <table className="dash2-table">
                <thead>
                  <tr>
                    <th>CAMPAGNE</th>
                    <th>PROGRESSION</th>
                    <th>OBJECTIF</th>
                    <th>STATUT</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {myCampaigns.map(c => (
                    <CampaignRow key={c.id} campaign={c} onAction={load} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Contributions */}
        <div>
          <div className="dash2-sec-header">
            <span className="dash2-sec-title">CONTRIBUTIONS</span>
            <span className="dash2-sec-link">HISTORIQUE</span>
          </div>
          <div className="dash2-contribs-wrap">
            {allMyContribs.length === 0 ? (
              <div className="dash2-empty">AUCUNE CONTRIBUTION</div>
            ) : (
              allMyContribs.map(c => (
                <ContribCard key={c.id} campaign={c} onAction={load} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
