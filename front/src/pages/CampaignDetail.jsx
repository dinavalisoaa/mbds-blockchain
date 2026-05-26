import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCampaignById, fetchCampaignEvents } from '../services/campaigns.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { ipfsUrl } from '../services/pinata.js';
import { CATEGORIES } from '../constants.js';
import { Badge, ProgressBar, Spinner, EmptyState, Card } from '../components/ui/index.js';

// ── Countdown widget ─────────────────────────────────────────
function Countdown({ deadline, status }) {
  const { display, isUrgent, done } = useCountdown(deadline);
  if (status !== 'active') return null;
  return (
    <div className={`countdown${isUrgent ? ' urgent' : ''}`}>
      <span className="countdown-label"><i className="ti ti-clock" /> Temps restant</span>
      <span className="countdown-value">{done ? 'Terminée' : display}</span>
    </div>
  );
}

// ── Transaction row ──────────────────────────────────────────
const TX_CONFIG = {
  contribution:  { icon: 'ti-heart',         label: 'Contribution',  color: 'var(--green)',      sign: '+' },
  withdrawal:    { icon: 'ti-download',       label: 'Retrait',       color: 'var(--blue)',       sign: '' },
  refund:        { icon: 'ti-receipt-refund', label: 'Remboursement', color: 'var(--text-muted)', sign: '' },
  excess_refund: { icon: 'ti-refresh',        label: 'Excédent',      color: 'var(--text-dim)',   sign: '' },
  cancelled:     { icon: 'ti-x',             label: 'Annulée',       color: 'var(--red)',        sign: '' },
};

function TxRow({ event: e }) {
  const cfg = TX_CONFIG[e.type] ?? TX_CONFIG.contribution;
  const date = new Date(e.timestamp * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const short = a => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="tx-row">
      <span className="tx-type" style={{ color: cfg.color }}>
        <i className={`ti ${cfg.icon}`} /> {cfg.label}
      </span>
      <span className="tx-actor">{short(e.actor)}</span>
      <span className="tx-amount" style={{ color: cfg.color }}>
        {e.amountEth ? `${cfg.sign}${e.amountEth} ETH` : '—'}
      </span>
      <span className="tx-date">{date}</span>
      <a
        className="tx-hash"
        href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
        target="_blank" rel="noopener noreferrer"
        title={e.txHash}
      >
        <i className="ti ti-external-link" />
      </a>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign,      setCampaign]      = useState(null);
  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error,         setError]         = useState(null);

  // Fetch campaign data
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchCampaignById(id)
      .then(c  => { if (alive) setCampaign(c); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  // Fetch event history (after campaign loads)
  useEffect(() => {
    if (!campaign) return;
    let alive = true;
    setEventsLoading(true);
    fetchCampaignEvents(id)
      .then(evs => { if (alive) setEvents(evs); })
      .catch(() => {})
      .finally(() => { if (alive) setEventsLoading(false); });
    return () => { alive = false; };
  }, [id, campaign]);

  const backLink = (
    <Link to="/" className="back-link">
      <i className="ti ti-arrow-left" /> Toutes les campagnes
    </Link>
  );

  if (loading) return <>{backLink}<Spinner label="Chargement de la campagne…" /></>;
  if (error)   return (
    <div>
      {backLink}
      <div style={{ marginTop: '1.5rem', color: 'var(--red)' }}>
        <i className="ti ti-alert-circle" /> {error}
      </div>
    </div>
  );

  const c = campaign;
  const imgUrl = ipfsUrl(c.imageIPFS);
  const createdDate = new Date(Number(c.createdAt) * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="campaign-detail">
      {backLink}

      {imgUrl && (
        <img src={imgUrl} alt={c.title} className="detail-img"
          onError={e => { e.target.style.display = 'none'; }} />
      )}

      {/* Header */}
      <div className="detail-header">
        <h1 className="detail-title">{c.title}</h1>
        <Badge status={c.status} />
      </div>

      {c.description && <p className="detail-desc">{c.description}</p>}

      {/* Meta grid */}
      <div className="detail-meta-grid">
        <div className="detail-meta-item">
          <span className="detail-meta-label"><i className="ti ti-folder" /> Catégorie</span>
          <span className="detail-meta-value">{CATEGORIES[c.category] ?? '—'}</span>
        </div>
        <div className="detail-meta-item">
          <span className="detail-meta-label"><i className="ti ti-calendar" /> Créée le</span>
          <span className="detail-meta-value">{createdDate}</span>
        </div>
        <div className="detail-meta-item">
          <span className="detail-meta-label"><i className="ti ti-user" /> Créateur</span>
          <span className="detail-meta-value">{c.creatorShort}</span>
        </div>
        <div className="detail-meta-item">
          <span className="detail-meta-label"><i className="ti ti-users" /> Contributeurs</span>
          <span className="detail-meta-value">{c.contributorCount}</span>
        </div>
      </div>

      {/* Progress + countdown */}
      <div className="detail-progress-section">
        <ProgressBar value={c.amountRaisedEth} goal={c.goalEth} percent={c.progress} status={c.status} />
        <Countdown deadline={c.deadline} status={c.status} />
      </div>

      {/* Transaction history */}
      <div className="section-header" style={{ marginTop: '2rem' }}>
        <span className="section-title">
          <i className="ti ti-list" /> Historique des transactions
          {events.length > 0 && <span className="section-count">{events.length}</span>}
        </span>
      </div>

      <Card>
        {eventsLoading
          ? <Spinner label="Chargement de l'historique…" />
          : events.length === 0
            ? <EmptyState icon="ti-list" title="Aucune transaction" subtitle="Pas encore de contributions." />
            : <div className="tx-list">{events.map((e, i) => <TxRow key={i} event={e} />)}</div>
        }
      </Card>
    </div>
  );
}
