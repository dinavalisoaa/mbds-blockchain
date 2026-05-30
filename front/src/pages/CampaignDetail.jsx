import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCampaignById, fetchCampaignEvents } from '../services/campaigns.js';
import { txContribute, txWithdraw, txRefund, txCancelCampaign } from '../services/transactions.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { ipfsUrl } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Badge, Spinner, EmptyState } from '../components/ui/index.js';
import '../styles/CampaignDetail.css';
import '../index.css';

// ── Helpers ───────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - Number(ts);
  if (diff < 60)    return `${diff}S_AGO`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}M_AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H_AGO`;
  return `${Math.floor(diff / 86400)}D_AGO`;
}

const SEGMENTS = 20;
function SegmentedBar({ percent, status }) {
  const filled = Math.round((Math.min(percent, 100) / 100) * SEGMENTS);
  const color = status === 'failed' ? 'var(--red)' : 'var(--green)';
  return (
    <div className="seg-bar">
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className="seg-bar-block"
          style={{ background: i < filled ? color : 'var(--surface-3)' }}
        />
      ))}
    </div>
  );
}

// ── TX row ────────────────────────────────────────────────
const TX_CONFIG = {
  contribution:  { label: 'CONTRIBUTION',  color: 'var(--green)',      sign: '+' },
  withdrawal:    { label: 'WITHDRAWAL',    color: 'var(--red)',        sign: '-' },
  refund:        { label: 'REFUND',        color: 'var(--text-muted)', sign: ''  },
  excess_refund: { label: 'EXCESS_REFUND', color: 'var(--text-dim)',   sign: ''  },
  cancelled:     { label: 'CANCELLED',     color: 'var(--red)',        sign: ''  },
};

function TxRow({ event: e }) {
  const cfg = TX_CONFIG[e.type] ?? TX_CONFIG.contribution;
  const short = a => `${a.slice(0, 6)}...${a.slice(-4)}`;
  return (
    <div className="fiche-tx-row">
      <span className="fiche-tx-type">
        <span className="fiche-tx-dot" style={{ background: cfg.color }} />
        {cfg.label}
      </span>
      <span className="fiche-tx-addr">{short(e.actor)}</span>
      <span className="fiche-tx-amount" style={{ color: cfg.color }}>
        {e.amountEth ? `${cfg.sign}${e.amountEth}` : '—'}
      </span>
      <span className="fiche-tx-time">{e.timestamp ? timeAgo(e.timestamp) : '—'}</span>
      <a
        className="fiche-tx-verify"
        href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
        target="_blank" rel="noopener noreferrer"
      >
        <i className="ti ti-external-link" />
      </a>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────
export default function CampaignDetail({ wallet }) {
  const { id } = useParams();
  const runTx = useTx();

  const [campaign,        setCampaign]        = useState(null);
  const [events,          setEvents]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [eventsLoading,   setEventsLoading]   = useState(true);
  const [error,           setError]           = useState(null);
  const [amount,          setAmount]          = useState('');
  const [loadingContrib,  setLoadingContrib]  = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [loadingRefund,   setLoadingRefund]   = useState(false);
  const [loadingCancel,   setLoadingCancel]   = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [copiedShare,     setCopiedShare]     = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fetchCampaignById(id)
      .then(c  => { if (alive) setCampaign(c); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

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

  const run = async (fn, labels, setLoader) => {
    setLoader(true);
    try {
      await runTx(fn, labels);
      const c = await fetchCampaignById(id);
      setCampaign(c);
    } catch { /* toast */ }
    finally { setLoader(false); }
  };

  const handleCopy = text => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShare = (title, progress) => {
    const url = `${window.location.origin}/mbds-blockchain/#/campaign/${id}`;
    const text = `${url}`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
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
      <div style={{ marginTop: '1.5rem', color: 'var(--red)', fontSize: 12 }}>
        <i className="ti ti-alert-circle" /> {error}
      </div>
    </div>
  );

  const c = campaign;
  const imgUrl      = ipfsUrl(c.imageIPFS);
  const isCreator   = wallet?.address?.toLowerCase() === c.creator.toLowerCase();
  const etherscanCreator = `https://sepolia.etherscan.io/address/${c.creator}`;

  // Contribute cap logic
  const remaining      = Math.max(0, parseFloat(c.goalEth) - parseFloat(c.amountRaisedEth));
  const parsedAmount   = parseFloat(amount);
  const hasAmount      = amount !== '' && !isNaN(parsedAmount) && parsedAmount > 0;
  const effectiveAmt   = hasAmount ? Math.round(Math.min(parsedAmount, remaining) * 1e6) / 1e6 : 0;
  const isCapped       = hasAmount && parsedAmount > remaining;

  const dd = new Date(Number(c.createdAt) * 1000);
  const createdDate = `${String(dd.getDate()).padStart(2,'0')}/${String(dd.getMonth()+1).padStart(2,'0')}/${dd.getFullYear()}`;

  const dl = new Date(Number(c.deadline) * 1000);
  const deadlineDateTime = `${String(dl.getDate()).padStart(2,'0')}/${String(dl.getMonth()+1).padStart(2,'0')}/${dl.getFullYear()} ${String(dl.getHours()).padStart(2,'0')}:${String(dl.getMinutes()).padStart(2,'0')}`;

  const statusLabel = c.status === 'active'    ? 'LIVE_ON_SEPOLIA'
                    : c.status === 'success'   ? 'FUNDED'
                    : c.status === 'failed'    ? 'FAILED'
                    : 'CANCELLED';
  const nodeLabel = `${c.status.toUpperCase()}_NODE_V1`;

  return (
    <div className="campaign-detail">
      {backLink}

      {/* ── HERO ──────────────────────────────────────────── */}
      <div className="fiche-hero">

        {/* LEFT: image */}
        <div className="fiche-hero-img-wrap">
          {imgUrl
            ? <img src={imgUrl} alt={c.title} className="fiche-hero-img"
                onError={e => { e.target.style.display='none'; }} />
            : <div className="fiche-hero-img-placeholder">
                <i className="ti ti-photo-off" />
              </div>
          }
          <span className="fiche-node-badge">{nodeLabel}</span>
        </div>

        {/* RIGHT: status + funding + action */}
        <div className="fiche-hero-panel">

          {/* Status row */}
          <div className="fiche-status-row">
            <div className="fiche-status-left">
              <span className="fiche-status-label">CURRENT_STATUS</span>
              <span className="fiche-status-live">
                <span className="fiche-live-dot" />
                {statusLabel}
              </span>
            </div>
            <div className="fiche-status-right">
              <span className="fiche-status-label">URGENCY_COUNTDOWN</span>
              <CountdownVal deadline={c.deadline} status={c.status} />
            </div>
          </div>

          <div className="fiche-divider" />

          {/* Funded */}
          <div className="fiche-funded-label">TOTAL_FUNDED</div>
          <div className="fiche-funded-row">
            <span className="fiche-funded-val">{c.amountRaisedEth} <span className="fiche-funded-unit">ETH</span></span>
            <span className="fiche-goal-label">GOAL: {c.goalEth} ETH</span>
          </div>

          {/* Segmented bar */}
          <SegmentedBar percent={c.progress} status={c.status} />

          <div className="fiche-bar-meta">
            <span className="fiche-pct" style={{ color: c.status === 'failed' ? 'var(--red)' : 'var(--green)' }}>
              {c.progress}% COMPLETED
            </span>
            <span className="fiche-contrib-count">{c.contributorCount} CONTRIBUTORS</span>
          </div>

          <div className="fiche-divider" />

          {/* My stake */}
          {c.myContrib > 0n && (
            <div className="fiche-stake-box">
              <i className="ti ti-info-circle" style={{ color: 'var(--green)', fontSize: 13 }} />
              <span>YOUR_STAKE: <strong style={{ color: 'var(--green)' }}>{c.myContribEth} ETH</strong></span>
            </div>
          )}

          {/* Contribute — active + connected */}
          {c.status === 'active' && wallet?.connected && !isCreator && (
            <div className="fiche-contribute">
              <label className="fiche-contribute-label">CONTRIBUTE_AMOUNT</label>
              <div className="fiche-contribute-row">
                <div className="input-suffix-wrap" style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="number" min="0.000001" step="0.001" placeholder="0.00"
                    value={amount}
                    onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v); }}
                    disabled={loadingContrib}
                  />
                  <span className="input-suffix">ETH</span>
                  <button
                    className="fiche-max-btn"
                    type="button"
                    onClick={() => setAmount(String(remaining))}
                    disabled={loadingContrib}
                  >MAX</button>
                </div>
                <button
                  className="fiche-contribute-btn"
                  disabled={loadingContrib || !hasAmount}
                  onClick={() => run(() => txContribute(c.id, effectiveAmt), TX_LABELS.contribute, setLoadingContrib)}
                >
                  {loadingContrib ? <i className="ti ti-loader-2 spinning" /> : null}
                  CONTRIBUTE_ETH
                </button>
              </div>
              {isCapped && (
                <p className="fiche-cap-notice">
                  <i className="ti ti-arrows-minimize" />
                  Capped to <strong>{effectiveAmt} ETH</strong> — remaining goal.
                </p>
              )}
            </div>
          )}

          {/* Contribute — active + not connected */}
          {c.status === 'active' && !wallet?.connected && (
            <button className="detail-cta-btn" disabled style={{ marginTop: '1rem' }}>
              CONNECT_WALLET_TO_CONTRIBUTE
            </button>
          )}

          {/* Cancel — active + creator + nothing raised yet */}
          {c.status === 'active' && isCreator && c.amountRaised === 0n && (
            <div style={{ marginTop: '1rem' }}>
              <p className="fiche-cancel-notice">
                <i className="ti ti-alert-triangle" /> No contributions yet — cancellation is permanent.
              </p>
              <button
                className="detail-cta-btn detail-cta-btn--danger"
                disabled={loadingCancel}
                onClick={() => run(() => txCancelCampaign(c.id), TX_LABELS.cancelCampaign, setLoadingCancel)}
              >
                {loadingCancel ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-x" />}
                CANCEL_CAMPAIGN
              </button>
            </div>
          )}

          {/* Withdraw — success + creator + not yet withdrawn */}
          {c.status === 'success' && isCreator && !c.withdrawn && (
            <button
              className="detail-cta-btn" style={{ marginTop: '1rem' }}
              disabled={loadingWithdraw}
              onClick={() => run(() => txWithdraw(c.id), TX_LABELS.withdraw, setLoadingWithdraw)}
            >
              {loadingWithdraw ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-download" />}
              WITHDRAW_FUNDS ({c.amountRaisedEth} ETH)
            </button>
          )}

          {/* Refund — failed OR cancelled + contributor */}
          {(c.status === 'failed' || c.status === 'cancelled') && c.myContrib > 0n && (
            <button
              className="detail-cta-btn detail-cta-btn--ghost" style={{ marginTop: '1rem' }}
              disabled={loadingRefund}
              onClick={() => run(() => txRefund(c.id), TX_LABELS.refund, setLoadingRefund)}
            >
              {loadingRefund ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-receipt-refund" />}
              CLAIM_REFUND ({c.myContribEth} ETH)
            </button>
          )}

          {/* Already withdrawn */}
          {c.status === 'success' && c.withdrawn && (
            <div className="detail-withdrawn-note" style={{ marginTop: '1rem' }}>
              <i className="ti ti-circle-check" /> FUNDS_WITHDRAWN
            </div>
          )}
        </div>
      </div>

      {/* ── INFO ──────────────────────────────────────────── */}
      <div className="fiche-info">

        {/* LEFT: title + desc */}
        <div className="fiche-info-left">
          <h1 className="fiche-title">{c.title}</h1>
          {c.description
            ? <p className="fiche-desc">{c.description}</p>
            : <p className="fiche-desc" style={{ opacity: 0.4, fontStyle: 'italic' }}>No description provided.</p>
          }
        </div>

        {/* RIGHT: metadata */}
        <div className="fiche-meta-grid">
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CATEGORY</span>
            <span className="fiche-meta-val fiche-meta-val--green">{CATEGORIES[c.category] ?? '—'}</span>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CREATED</span>
            <span className="fiche-meta-val">{createdDate}</span>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">DEADLINE</span>
            <span className={`fiche-meta-val ${c.status === 'active' ? 'fiche-meta-val--green' : ''}`}>
              {deadlineDateTime}
            </span>
          </div>
          <div className="fiche-meta-item fiche-meta-item--full">
            <span className="fiche-meta-label">CREATOR_ADDRESS</span>
            <div className="fiche-meta-addr-row">
              <a href={etherscanCreator} target="_blank" rel="noopener noreferrer"
                className="fiche-meta-val fiche-meta-val--addr">
                {c.creatorShort}
              </a>
              <button className="contract-copy-btn" onClick={() => handleCopy(c.creator)}
                title={copied ? 'Copied!' : 'Copy'}>
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
              </button>
            </div>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CONTRIBUTORS</span>
            <span className="fiche-meta-val fiche-meta-val--green">{c.contributorCount}_NODES</span>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CHAIN</span>
            <span className="fiche-meta-val fiche-meta-val--green">SEPOLIA_ETH</span>
          </div>
        </div>

        {/* Share link */}
        <div className="fiche-share-row">
          <i className="ti ti-link" style={{ color: 'var(--green)', flexShrink: 0 }} />
          <span className="fiche-share-url">
            sepolia.ethfund.io/campaign/{id} · <em>{c.title}</em> · {c.progress}% funded
          </span>
          <button
            className="contract-copy-btn"
            onClick={() => handleCopyShare(c.title, c.progress)}
            title={copiedShare ? 'Copied!' : 'Copy share link'}
          >
            <i className={`ti ${copiedShare ? 'ti-check' : 'ti-copy'}`}
              style={{ color: copiedShare ? 'var(--green)' : undefined }} />
          </button>
        </div>
      </div>

      {/* ── EVENT LOG ─────────────────────────────────────── */}
      <div className="fiche-log">
        <div className="fiche-log-header">
          <span className="fiche-log-title">ON-CHAIN_EVENT_LOG</span>
          <span className="fiche-log-realtime">
            <span className="fiche-live-dot" /> REAL-TIME
          </span>
        </div>

        {/* Column headers */}
        <div className="fiche-tx-header">
          <span>TX_TYPE</span>
          <span>ADDRESS</span>
          <span>AMOUNT_ETH</span>
          <span>TIMESTAMP</span>
          <span>VERIFY</span>
        </div>

        {eventsLoading
          ? <div style={{ padding: '2rem 1rem' }}><Spinner label="LOADING_EVENTS..." /></div>
          : events.length === 0
            ? <EmptyState icon="ti-list" title="NO_TRANSACTIONS" subtitle="NO_CONTRIBUTIONS_YET." />
            : events.map((e, i) => <TxRow key={i} event={e} />)
        }
      </div>
    </div>
  );
}

// Inline countdown value component (no wrapper div)
function CountdownVal({ deadline, status }) {
  const { display, isUrgent, done } = useCountdown(deadline);
  if (status !== 'active') return <span className="fiche-countdown-val fiche-countdown-val--dim">--:--:--:--</span>;
  return (
    <span className={`fiche-countdown-val${isUrgent ? ' fiche-countdown-val--urgent' : ''}`}>
      {done ? 'EXPIRED' : display}
    </span>
  );
}