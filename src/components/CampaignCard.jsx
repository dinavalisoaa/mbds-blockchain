import { useState } from 'react';
import { txContribute, txWithdraw, txRefund, txCancelCampaign } from '../services/transactions.js';

const BADGE = { active: 'En cours', success: 'Succès', failed: 'Échoué', cancelled: 'Annulée' };

export default function CampaignCard({ campaign: c, wallet, onAction }) {
  const [amount,  setAmount]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const isCreator = wallet.address?.toLowerCase() === c.creator.toLowerCase();

  const run = async (fn) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
      await onAction();
    } catch (e) {
      setError(e.reason || e.message);
      setLoading(false);
    }
  };

  return (
    <article className="campaign-card">
      <div className="campaign-top">
        <span className="campaign-title">{c.title}</span>
        <span className={`badge ${c.status}`}>{BADGE[c.status]}</span>
      </div>

      {c.description && <p className="campaign-desc">{c.description}</p>}

      <div className="meta-row">
        <span><i className="ti ti-user" /> {c.creatorShort}</span>
        <span><i className="ti ti-clock" /> {c.timeLeft}</span>
      </div>

      <div className="progress-bar">
        <div className={`progress-fill ${c.status}`} style={{ width: `${c.progress}%` }} />
      </div>
      <div className="progress-labels">
        <span>{c.amountRaisedEth} ETH levés</span>
        <span>{c.progress}% · objectif {c.goalEth} ETH</span>
      </div>

      {c.myContrib > 0n && (
        <p className="my-contrib">
          <i className="ti ti-circle-check" /> Votre contribution : {c.myContribEth} ETH
        </p>
      )}

      {error && <p className="status-msg error">{error}</p>}

      {c.status === 'active' && (
        <div className="contrib-row">
          <input type="number" min="0.001" step="0.001" placeholder="Montant ETH"
            value={amount} onChange={e => setAmount(e.target.value)} />
          <button className="btn-primary" disabled={loading}
            onClick={() => run(() => txContribute(c.id, amount))}>
            <i className="ti ti-heart" /> Contribuer
          </button>
        </div>
      )}

      {c.status === 'active' && isCreator && c.amountRaised === 0n && (
        <button className="btn-danger btn-block" disabled={loading}
          onClick={() => run(() => txCancelCampaign(c.id))}>
          <i className="ti ti-x" /> Annuler la campagne
        </button>
      )}

      {c.status === 'success' && isCreator && !c.withdrawn && (
        <button className="btn-primary btn-block" disabled={loading}
          onClick={() => run(() => txWithdraw(c.id))}>
          <i className="ti ti-download" /> Retirer {c.amountRaisedEth} ETH
        </button>
      )}

      {c.status === 'failed' && c.myContrib > 0n && (
        <button className="btn-ghost btn-block" disabled={loading}
          onClick={() => run(() => txRefund(c.id))}>
          <i className="ti ti-receipt-refund" /> Remboursement {c.myContribEth} ETH
        </button>
      )}
    </article>
  );
}
