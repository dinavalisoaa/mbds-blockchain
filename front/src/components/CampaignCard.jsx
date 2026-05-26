import { useState } from 'react';
import { Link } from 'react-router-dom';
import { txContribute, txWithdraw, txRefund, txCancelCampaign } from '../services/transactions.js';
import { ipfsUrl } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { TX_LABELS } from '../constants.js';
import { Button, Badge, ProgressBar, Input } from './ui/index.js';

export default function CampaignCard({ campaign: c, wallet, onAction }) {
  const runTx = useTx();
  const [amount,  setAmount]  = useState('');
  const [loading, setLoading] = useState(false);

  const isCreator = wallet.address?.toLowerCase() === c.creator.toLowerCase();

  const run = async (fn, labels) => {
    setLoading(true);
    try { await runTx(fn, labels); await onAction(); }
    catch { /* toast affiche l'erreur */ }
    finally { setLoading(false); }
  };

  const imgUrl = ipfsUrl(c.imageIPFS);

  return (
    <article className="campaign-card">
      {imgUrl && (
        <img src={imgUrl} alt={c.title} className="campaign-img"
          style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      <div className="campaign-top">
        <span className="campaign-title">{c.title}</span>
        <Badge status={c.status} />
      </div>

      {c.description && <p className="campaign-desc">{c.description}</p>}

      <div className="meta-row">
        <span><i className="ti ti-user" /> {c.creatorShort}</span>
        <span><i className="ti ti-clock" /> {c.timeLeft}</span>
      </div>

      <ProgressBar value={c.amountRaisedEth} goal={c.goalEth} percent={c.progress} status={c.status} />

      {c.myContrib > 0n && (
        <p className="my-contrib">
          <i className="ti ti-circle-check" /> Votre contribution : {c.myContribEth} ETH
        </p>
      )}

      {c.status === 'active' && (
        <div className="contrib-row">
          <Input type="number" min="0.001" step="0.001" placeholder="Montant ETH"
            value={amount} onChange={e => setAmount(e.target.value)} />
          <Button variant="primary" icon="ti-heart" loading={loading}
            onClick={() => run(() => txContribute(c.id, amount), TX_LABELS.contribute)}>
            Contribuer
          </Button>
        </div>
      )}

      {c.status === 'active' && isCreator && c.amountRaised === 0n && (
        <Button variant="danger" icon="ti-x" block loading={loading}
          onClick={() => run(() => txCancelCampaign(c.id), TX_LABELS.cancelCampaign)}>
          Annuler la campagne
        </Button>
      )}

      {c.status === 'success' && isCreator && !c.withdrawn && (
        <Button variant="primary" icon="ti-download" block loading={loading}
          onClick={() => run(() => txWithdraw(c.id), TX_LABELS.withdraw)}>
          Retirer {c.amountRaisedEth} ETH
        </Button>
      )}

      {c.status === 'failed' && c.myContrib > 0n && (
        <Button variant="ghost" icon="ti-receipt-refund" block loading={loading}
          onClick={() => run(() => txRefund(c.id), TX_LABELS.refund)}>
          Récupérer {c.myContribEth} ETH
        </Button>
      )}
      <Link to={`/campaign/${c.id}`} className="card-detail-link">
        <i className="ti ti-arrow-right" /> Voir les détails
      </Link>
    </article>
  );
}
