import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ipfsUrl } from '../services/pinata.js';
import { txContribute } from '../services/transactions.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Badge } from './ui/index.js';

export default function CampaignCard({ campaign: c, wallet, onAction }) {
  const runTx   = useTx();
  const navigate = useNavigate();
  const [amount,  setAmount]  = useState('');
  const [loading, setLoading] = useState(false);
  const imgUrl = ipfsUrl(c.imageIPFS);

  const handleContribute = async e => {
    e.preventDefault();
    e.stopPropagation();
    if (!amount || +amount <= 0) return;
    setLoading(true);
    try {
      await runTx(() => txContribute(c.id, amount), TX_LABELS.contribute);
      setAmount('');
      if (onAction) await onAction();
    } catch { /* toast */ }
    finally { setLoading(false); }
  };

  return (
    <article className="campaign-card" onClick={() => navigate(`/campaign/${c.id}`)}>
      {/* Image */}
      <div className="card-img-wrap">
        {imgUrl ? (
          <img src={imgUrl} alt={c.title} className="campaign-card-img"
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="campaign-card-img-placeholder">
            <i className="ti ti-photo-off" />
          </div>
        )}
        <span className="campaign-card-cat-badge">{CATEGORIES[c.category] ?? 'OTHER'}</span>
        <div className="card-status-overlay"><Badge status={c.status} /></div>
      </div>

      {/* Body */}
      <div className="campaign-card-body">
        <Link
          to={`/campaign/${c.id}`}
          className="campaign-title-link"
          onClick={e => e.stopPropagation()}
        >
          {c.title}
        </Link>

        <p className="campaign-creator">
          <i className="ti ti-user" /> {c.creatorShort}
        </p>

        {/* Progress */}
        <div className="card-progress-section">
          <div className="card-amounts">
            <span className="card-raised">{c.amountRaisedEth} <em>ETH</em></span>
            <span className="card-goal">/ {c.goalEth} ETH</span>
          </div>
          <div className="card-bar-track">
            <div className={`card-bar-fill ${c.status}`} style={{ width: `${c.progress}%` }} />
          </div>
          <div className="card-bar-meta">
            <span className={`card-pct ${c.status === 'failed' ? 'red' : 'green'}`}>{c.progress}%</span>
            <span className="card-time">{c.status === 'active' ? c.timeLeft : c.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Contribute — active only */}
        {c.status === 'active' && (
          <form className="card-contribute" onSubmit={handleContribute} onClick={e => e.stopPropagation()}>
            <div className="card-contribute-input-wrap">
              <input
                type="number" min="0.000001" step="0.001" placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={loading || !wallet?.connected}
              />
              <span className="card-contribute-suffix">ETH</span>
            </div>
            <button
              type="submit"
              className="card-contribute-btn"
              disabled={loading || !wallet?.connected || !amount}
            >
              {loading
                ? <i className="ti ti-loader-2 spinning" />
                : <i className="ti ti-arrow-right" />
              }
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
