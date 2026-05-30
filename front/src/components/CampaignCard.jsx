import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { txContribute, txWithdraw, txRefund, txCancelCampaign } from '../services/transactions.js';
import { ipfsUrl } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { TX_LABELS, CATEGORIES } from '../constants.js';
import { Button, Badge, ProgressBar, Input } from './ui/index.js';

const formatDate = ts => {
  const d = new Date(Number(ts) * 1000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTime = ts => {
  const d = new Date(Number(ts) * 1000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function CampaignCard({ campaign: c, wallet, onAction }) {
  const runTx = useTx();
  const navigate = useNavigate();
  const [amount,  setAmount]  = useState('');
  const [loading, setLoading] = useState(false);

  const isCreator = wallet.address?.toLowerCase() === c.creator.toLowerCase();

  const run = async (fn, labels) => {
    setLoading(true);
    try { await runTx(fn, labels); await onAction(); }
    catch { /* toast shows error */ }
    finally { setLoading(false); }
  };

  const imgUrl = ipfsUrl(c.imageIPFS);

  return (
    <article className="campaign-card">
      {/* Image area */}
      <div style={{ position: 'relative' }}>
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={c.title}
            className="campaign-card-img"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="campaign-card-img-placeholder">
            <i className="ti ti-photo-off" />
          </div>
        )}
        <span className="campaign-card-cat-badge">
          CAT: {CATEGORIES[c.category] ?? 'OTHER'}
        </span>
      </div>

      {/* Body */}
      <div className="campaign-card-body">
        <div className="campaign-top">
          <span className="campaign-title">{c.title}</span>
          <Badge status={c.status} />
        </div>

        <p className="campaign-hash">HASH: {c.creatorShort}</p>

        {c.description && <p className="campaign-desc">{c.description}</p>}

        <div className="campaign-progress-row">
          <span>{c.amountRaisedEth} ETH / {c.goalEth} ETH</span>
          <span className="pct">{c.progress}%</span>
        </div>

        <ProgressBar value={c.amountRaisedEth} goal={c.goalEth} percent={c.progress} status={c.status} />

        <div className="campaign-meta-row">
          <span style={{ color: c.status !== 'active' ? 'var(--text-dim)' : undefined }}>
            {c.status === 'active' ? `ENDS_IN: ${c.timeLeft}` : 'ENDED'}
          </span>
          <span>CREATED: {formatDate(c.createdAt)}</span>
        </div>
        <div className="campaign-meta-row" style={{ marginTop: 2 }}>
          <span style={{ color: c.status === 'active' ? 'var(--green)' : 'var(--text-dim)', fontSize: 10 }}>
            <i className="ti ti-calendar-event" style={{ marginRight: 3 }} />
            DEADLINE: {formatDateTime(c.deadline)}
          </span>
        </div>

        {c.myContrib > 0n && (
          <p className="my-contrib">
            MY_CONTRIBUTION: {c.myContribEth} ETH
          </p>
        )}

        {c.status === 'active' && (
          <div className="contrib-row">
            <Input type="number" min="0.001" step="0.001" placeholder="AMOUNT_ETH_"
              value={amount} onChange={e => setAmount(e.target.value)} />
            <Button variant="primary" loading={loading}
              onClick={() => run(() => txContribute(c.id, amount), TX_LABELS.contribute)}>
              CONTRIBUTE_ETH
            </Button>
          </div>
        )}

        {c.status === 'active' && isCreator && c.amountRaised === 0n && (
          <Button variant="danger" icon="ti-x" block loading={loading}
            onClick={() => run(() => txCancelCampaign(c.id), TX_LABELS.cancelCampaign)}>
            CANCEL_CAMPAIGN
          </Button>
        )}

        {c.status === 'success' && isCreator && !c.withdrawn && (
          <Button variant="primary" icon="ti-download" block loading={loading}
            onClick={() => run(() => txWithdraw(c.id), TX_LABELS.withdraw)}>
            WITHDRAW_FUNDS
          </Button>
        )}

        {c.status === 'failed' && c.myContrib > 0n && (
          <Button variant="ghost" icon="ti-receipt-refund" block loading={loading}
            onClick={() => run(() => txRefund(c.id), TX_LABELS.refund)}>
            CLAIM_REFUND
          </Button>
        )}

        {c.status === 'cancelled' && isCreator && (
          <Button
            variant="outline"
            icon="ti-edit"
            block
            onClick={() => navigate('/create', {
              state: {
                prefill: {
                  title:    c.title,
                  desc:     c.description,
                  category: String(c.category),
                  goal:     c.goalEth,
                },
              },
            })}
          >
            EDIT_AND_REDEPLOY
          </Button>
        )}
      </div>

      {/* Footer CTA */}
      <div className="campaign-card-footer">
        <Link to={`/campaign/${c.id}`} className="btn-contribute">
          VIEW_DETAILS <i className="ti ti-arrow-right" />
        </Link>
      </div>
    </article>
  );
}
