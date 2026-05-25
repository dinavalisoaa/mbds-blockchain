import { useState, useRef } from 'react';
import { txCreateCampaign } from '../services/transactions.js';
import { uploadToPinata, ipfsUrl } from '../services/pinata.js';

const EMPTY = { title: '', desc: '', category: '0', goal: '', deadline: '' };

const CATEGORIES = [
  'Technologie',
  'Art',
  'Social',
  'Environnement',
  'Éducation',
  'Musique',
  'Film',
  'Jeux',
  'Alimentation',
  'Autre',
];

const todayISO = () => new Date().toISOString().split('T')[0];

export default function CreateForm({ wallet, onCreated }) {
  const [fields,    setFields]    = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);   // File object
  const [preview,   setPreview]   = useState(null);   // local object URL
  const [status,    setStatus]    = useState(null);   // { type, msg }
  const [loading,   setLoading]   = useState(false);
  const fileRef = useRef();

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!wallet.connected) {
      setStatus({ type: 'error', msg: "Connectez MetaMask d'abord" });
      return;
    }
    setLoading(true);
    try {
      // 1. Upload image → Pinata (optionnel)
      let cid = '';
      if (imageFile) {
        setStatus({ type: 'info', msg: 'Upload image sur IPFS…' });
        cid = await uploadToPinata(imageFile);
      }

      // 2. Envoyer la tx
      setStatus({ type: 'info', msg: 'En attente de confirmation MetaMask…' });
      await txCreateCampaign(
        fields.title,
        fields.desc,
        cid,
        fields.category,
        fields.goal,
        fields.deadline,
      );

      setStatus({ type: 'success', msg: 'Campagne créée avec succès !' });
      setFields(EMPTY);
      setImageFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
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

        {/* ── Image upload ── */}
        <div className="col-full">
          <label>Image de campagne</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
          />
          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{ marginTop: '0.5rem', maxHeight: 160, borderRadius: 8, objectFit: 'cover' }}
            />
          )}
        </div>

        <div>
          <label>Catégorie</label>
          <select value={fields.category} onChange={set('category')}>
            {CATEGORIES.map((c, i) => (
              <option key={i} value={i}>{c}</option>
            ))}
          </select>
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
