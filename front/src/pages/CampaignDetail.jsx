import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCampaignById, fetchCampaignEvents, fetchContributions } from '../services/campaigns.js';
import { txContribute, txWithdraw, txRefund } from '../services/transactions.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { ipfsUrl } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Badge, ProgressBar, Spinner, EmptyState, Card } from '../components/ui/index.js';

// ── Countdown widget ─────────────────────────────────────────
function Countdown({ deadline, status }) {
  const { display, isUrgent, done } = useCountdown(deadline);
  if (status !== 'active') return null;
  return (
    <div className={`countdown${isUrgent ? ' urgent' : ''}`}>
      <span className="countdown-label"><i className="ti ti-clock" /> TIME_REMAINING</span>
      <span className="countdown-value">{done ? 'EXPIRED' : display}</span>
    </div>
  );
}

// ── Transaction row ──────────────────────────────────────────
const TX_CONFIG = {
  contribution:  { icon: 'ti-heart',         label: 'CONTRIBUTION',  color: 'var(--green)',      sign: '+' },
  withdrawal:    { icon: 'ti-download',       label: 'WITHDRAWAL',    color: 'var(--blue)',       sign: '' },
  refund:        { icon: 'ti-receipt-refund', label: 'REFUND',        color: 'var(--text-muted)', sign: '' },
  excess_refund: { icon: 'ti-refresh',        label: 'EXCESS_REFUND', color: 'var(--text-dim)',   sign: '' },
  cancelled:     { icon: 'ti-x',             label: 'CANCELLED',     color: 'var(--red)',        sign: '' },
};

function TxRow({ event: e }) {
  const cfg = TX_CONFIG[e.type] ?? TX_CONFIG.contribution;
  const date = new Date(e.timestamp * 1000).toLocaleDateString('en-US', {
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
export default function CampaignDetail({ wallet }) {
  const { id } = useParams();
  const runTx = useTx();

  const [campaign,      setCampaign]      = useState(null);
  const [events,        setEvents]        = useState([]);
  const [contributors,  setContributors]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [contribsLoading, setContribsLoading] = useState(true);
  const [error,         setError]         = useState(null);
  const [amount,        setAmount]        = useState('');
  const [txLoading,     setTxLoading]     = useState(false);
  const [copied,        setCopied]        = useState(false);

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

  // Fetch event history
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

  // Fetch contributors list
  useEffect(() => {
    if (!campaign) return;
    let alive = true;
    setContribsLoading(true);
    fetchContributions(id)
      .then(list => { if (alive) setContributors(list); })
      .catch(() => {})
      .finally(() => { if (alive) setContribsLoading(false); });
    return () => { alive = false; };
  }, [id, campaign]);

  const run = async (fn, labels) => {
    setTxLoading(true);
    try { await runTx(fn, labels); const c = await fetchCampaignById(id); setCampaign(c); }
    catch { /* toast shows error */ }
    finally { setTxLoading(false); }
  };

  const handleCopy = url => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const backLink = (
    <Link to="/" className="back-link">
      <i className="ti ti-arrow-left" /> ALL_CAMPAIGNS
    </Link>
  );

  if (loading) return <>{backLink}<Spinner label="LOADING_CAMPAIGN..." /></>;
  if (error)   return (
    <div>
      {backLink}
      <div style={{ marginTop: '1.5rem', color: 'var(--red)', fontSize: 12, letterSpacing: '0.04em' }}>
        <i className="ti ti-alert-circle" /> {error}
      </div>
    </div>
  );

  const c = campaign;
  const imgUrl = ipfsUrl(c.imageIPFS);
  const isCreator = wallet?.address?.toLowerCase() === c.creator.toLowerCase();

  const dd = new Date(Number(c.createdAt) * 1000);
  const createdDate = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
  const etherscanUrl = `https://sepolia.etherscan.io/address/${c.creator}`;

  return (
    <div className="campaign-detail">
      {backLink}

      {/* ── Two-column layout ── */}
      <div className="detail-page">

        {/* ── LEFT PANEL ── */}
        <div className="detail-left">
          {/* Header */}
          <div className="detail-panel-header">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <h1 className="detail-panel-title">{c.title}</h1>
              <Badge status={c.status} />
            </div>
            <p className="detail-panel-subtitle">
              Deploy new crowdfunding smart contract on Sepolia Testnet.
            </p>
          </div>

          {/* Description field */}
          {c.description && (
            <div className="detail-field col-full" style={{ marginBottom: '1rem' }}>
              <span className="detail-field-label">MANIFESTO_DESCRIPTION</span>
              <div className="detail-field-textarea">{c.description}</div>
            </div>
          )}

          {/* Meta grid — category / created / creator / contributors */}
          <div className="detail-field-grid">
            <div className="detail-field">
              <span className="detail-field-label">SECTOR_CLASSIFICATION</span>
              <span className="detail-field-value">{CATEGORIES[c.category] ?? '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">DEPLOYMENT_DATE</span>
              <span className="detail-field-value">{createdDate}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">DEPLOYER_ADDRESS</span>
              <span className="detail-field-value">{c.creatorShort}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">CONTRIBUTORS</span>
              <span className="detail-field-value">{c.contributorCount}</span>
            </div>
          </div>

          {/* Goal + raised */}
          <div className="detail-field-grid">
            <div className="detail-field">
              <span className="detail-field-label">TARGET_GOAL</span>
              <div className="detail-field-value-row">
                <span className="detail-field-value">{c.goalEth}</span>
                <span className="detail-field-suffix">SEPOLIA_ETH</span>
              </div>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">AMOUNT_RAISED</span>
              <div className="detail-field-value-row">
                <span className="detail-field-value teal">{c.amountRaisedEth}</span>
                <span className="detail-field-suffix">{c.progress}% FUNDED</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '1rem' }}>
            <ProgressBar value={c.amountRaisedEth} goal={c.goalEth} percent={c.progress} status={c.status} showLabels={false} />
          </div>

          {/* Countdown */}
          <Countdown deadline={c.deadline} status={c.status} />

          {/* My contribution indicator */}
          {c.myContrib > 0n && (
            <div className="detail-my-contrib">
              <i className="ti ti-circle-check" />
              MY_CONTRIBUTION: <strong>{c.myContribEth} ETH</strong>
            </div>
          )}

          {/* ── Action section ── */}
          {c.status === 'active' && wallet?.connected && (
            <div className="detail-action-section">
              <label>CONTRIBUTION_AMOUNT</label>
              <div className="detail-contribute-row">
                <div className="input-suffix-wrap">
                  <input
                    type="number" min="0.001" step="0.001" placeholder="0.00"
                    value={amount} onChange={e => setAmount(e.target.value)}
                  />
                  <span className="input-suffix">SEPOLIA_ETH</span>
                </div>
              </div>
              <button
                className="detail-cta-btn"
                disabled={txLoading || !amount}
                onClick={() => run(() => txContribute(c.id, amount), TX_LABELS.contribute)}
              >
                {txLoading ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-heart" />}
                CONTRIBUTE_ETH
              </button>
            </div>
          )}

          {c.status === 'active' && !wallet?.connected && (
            <div className="detail-action-section">
              <button className="detail-cta-btn" disabled>
                CONNECT_WALLET_TO_CONTRIBUTE
              </button>
            </div>
          )}

          {c.status === 'success' && isCreator && !c.withdrawn && (
            <div className="detail-action-section">
              <button
                className="detail-cta-btn"
                disabled={txLoading}
                onClick={() => run(() => txWithdraw(c.id), TX_LABELS.withdraw)}
              >
                {txLoading ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-download" />}
                WITHDRAW_FUNDS ({c.amountRaisedEth} ETH)
              </button>
            </div>
          )}

          {c.status === 'failed' && c.myContrib > 0n && (
            <div className="detail-action-section">
              <button
                className="detail-cta-btn detail-cta-btn--ghost"
                disabled={txLoading}
                onClick={() => run(() => txRefund(c.id), TX_LABELS.refund)}
              >
                {txLoading ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-receipt-refund" />}
                CLAIM_REFUND ({c.myContribEth} ETH)
              </button>
            </div>
          )}

          {c.status === 'success' && c.withdrawn && (
            <div className="detail-withdrawn-note">
              <i className="ti ti-circle-check" /> FUNDS_WITHDRAWN
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="detail-right">
          <div className="preview-label-row">
            <span className="preview-label-dot" />
            LIVE_CONTRACT_PREVIEW
          </div>

          {/* Mini preview card — reuses campaign card CSS */}
          <div className="detail-preview-card">
            <div style={{ position: 'relative' }}>
              {imgUrl ? (
                <img src={imgUrl} alt={c.title} className="campaign-card-img"
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="campaign-card-img-placeholder">
                  <i className="ti ti-photo-off" />
                </div>
              )}
              <span className="campaign-card-cat-badge">
                CAT: {CATEGORIES[c.category] ?? 'OTHER'}
              </span>
              {/* Thin progress bar at bottom of image */}
              <div className="preview-img-progress-track">
                <div
                  className="preview-img-progress-fill"
                  style={{ width: `${Math.min(c.progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="campaign-card-body">
              <div className="campaign-top">
                <span className="campaign-title">{c.title}</span>
                <Badge status={c.status} />
              </div>
              <p className="campaign-hash">ID: {c.creatorShort}</p>
              {c.description && <p className="campaign-desc">{c.description}</p>}

              <div className="preview-card-divider" />

              <div className="preview-card-stats">
                <div>
                  <div className="preview-stat-label">GOAL_THRESHOLD</div>
                  <div className="preview-stat-value teal">{c.goalEth} ETH</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="preview-stat-label">TIME_REMAINING</div>
                  <div className="preview-stat-value">{c.timeLeft}</div>
                </div>
              </div>

              <div className="preview-card-footer-bar">
                <span style={{ color: 'var(--green)', fontSize: 10, letterSpacing: '0.06em' }}>
                  {c.progress}% FUNDED
                </span>
                <i className="ti ti-arrows-exchange" style={{ color: 'var(--text-dim)', fontSize: 12 }} />
              </div>
            </div>
          </div>

          {/* Contract / Etherscan link box */}
          <div className="contract-link-box">
            <div className="contract-link-label">ETHERSCAN_LINK</div>
            <div className="contract-link-row">
              <i className="ti ti-link" style={{ color: 'var(--green)', flexShrink: 0 }} />
              <a
                href={etherscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="contract-link-url"
              >
                sepolia.etherscan.io/address/{c.creatorShort}
              </a>
              <button
                className="contract-copy-btn"
                onClick={() => handleCopy(etherscanUrl)}
                title={copied ? 'Copied!' : 'Copy link'}
              >
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contributors list — full width ── */}
      <div className="section-header" style={{ marginTop: '2.5rem' }}>
        <span className="section-title">
          CONTRIBUTORS
          {contributors.length > 0 && <span className="section-count">{contributors.length}</span>}
        </span>
      </div>

      <Card>
        {contribsLoading
          ? <Spinner label="LOADING_CONTRIBUTORS..." />
          : contributors.length === 0
            ? <EmptyState icon="ti-users" title="NO_CONTRIBUTORS" subtitle="NO_CONTRIBUTIONS_YET." />
            : (
              <div className="tx-list">
                {contributors.map((c, i) => (
                  <div className="tx-row" key={i}>
                    <span className="tx-type" style={{ color: 'var(--green)' }}>
                      <i className="ti ti-heart" /> CONTRIBUTOR
                    </span>
                    <span className="tx-actor">
                      <a
                        href={`https://sepolia.etherscan.io/address/${c.address}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                      >
                        {c.shortAddr}
                      </a>
                    </span>
                    <span className="tx-amount" style={{ color: 'var(--green)' }}>
                      +{c.amountEth} ETH
                    </span>
                    <span className="tx-date" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                      CURRENT_BALANCE
                    </span>
                    <a
                      className="tx-hash"
                      href={`https://sepolia.etherscan.io/address/${c.address}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <i className="ti ti-external-link" />
                    </a>
                  </div>
                ))}
              </div>
            )
        }
      </Card>

      {/* ── Transaction history — full width ── */}
      <div className="section-header" style={{ marginTop: '2.5rem' }}>
        <span className="section-title">
          TRANSACTION_HISTORY
          {events.length > 0 && <span className="section-count">{events.length}</span>}
        </span>
      </div>

      <Card>
        {eventsLoading
          ? <Spinner label="LOADING_HISTORY..." />
          : events.length === 0
            ? <EmptyState icon="ti-list" title="NO_TRANSACTIONS" subtitle="NO_CONTRIBUTIONS_YET." />
            : <div className="tx-list">{events.map((e, i) => <TxRow key={i} event={e} />)}</div>
        }
      </Card>
    </div>
  );
}
