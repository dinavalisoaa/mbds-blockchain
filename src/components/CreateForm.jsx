import { useState } from 'react';
import { txCreateCampaign } from '../services/transactions.js';

const EMPTY = { title: '', desc: '', goal: '', deadline: '' };

const todayISO = () => new Date().toISOString().split('T')[0];

export default function CreateForm({ wallet, onCreated }) {
  const [fields,  setFields]  = useState(EMPTY);
  const [status,  setStatus]  = useState(null);   // { type, msg }
  const [loading, setLoading] = useState(false);

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!wallet.connected) {
      setStatus({ type: 'error', msg: "Connectez MetaMask d'abord" });
      return;
    }
    setLoading(true);
    setStatus({ type: 'info', msg: 'En attente de confirmation MetaMask…' });
    try {
      await txCreateCampaign(fields.title, fields.desc, fields.goal, fields.deadline);
      setStatus({ type: 'success', msg: 'Campagne créée avec succès !' });
      setFields(EMPTY);
      await onCreated();
    } catch (e) {
      setStatus({ type: 'error', msg: e.reason || e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card form-create">
      <p className="card-title">
        <i className="ti ti-rocket" /> Créer une campagne
      </p>

      <div className="form-grid">
        <div className="col-full">
          <label>Titre <span className="required">*</span></label>
          <input type="text" placeholder="Ex : Station météo pour le village"
            value={fields.title} onChange={set('title')} />
        </div>
        <div className="col-full">
          <label>Description</label>
          <input type="text" placeholder="Courte description du projet"
            value={fields.desc} onChange={set('desc')} />
        </div>
        <div>
          <label>Objectif (ETH) <span className="required">*</span></label>
          <input type="number" min="0.01" step="0.01" placeholder="0.5"
            value={fields.goal} onChange={set('goal')} />
        </div>
        <div>
          <label>Date de fin <span className="required">*</span></label>
          <input type="date" min={todayISO()}
            value={fields.deadline} onChange={set('deadline')} />
        </div>
      </div>

      {status && <p className={`status-msg ${status.type}`}>{status.msg}</p>}

      <button className="btn-primary btn-block" onClick={handleSubmit} disabled={loading}>
        <i className="ti ti-rocket" /> {loading ? 'Traitement…' : 'Créer la campagne'}
      </button>
    </section>
  );
}
