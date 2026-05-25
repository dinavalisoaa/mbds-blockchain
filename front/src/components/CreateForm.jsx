import { useState, useRef } from 'react';
import { txCreateCampaign } from '../services/transactions.js';
import { uploadToPinata } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Button, Alert, Card, Input } from './ui/index.js';

const EMPTY = { title: '', desc: '', category: '0', goal: '', deadline: '' };

const todayISO = () => new Date().toISOString().split('T')[0];

export default function CreateForm({ wallet, onCreated }) {
  const runTx = useTx();
  const [fields,    setFields]    = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [ipfsMsg,   setIpfsMsg]   = useState(null);
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
    if (!wallet.connected) return;
    setLoading(true);
    setIpfsMsg(null);
    try {
      let cid = '';
      if (imageFile) {
        setIpfsMsg('Upload image sur IPFS…');
        cid = await uploadToPinata(imageFile);
        setIpfsMsg(null);
      }
      await runTx(
        () => txCreateCampaign(fields.title, fields.desc, cid, fields.category, fields.goal, fields.deadline),
        TX_LABELS.createCampaign
      );
      setFields(EMPTY);
      setImageFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      await onCreated();
    } catch {
      /* toast affiche l'erreur */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Créer une campagne" icon="ti-rocket" className="form-create">
      <div className="form-grid">
        <div className="col-full">
          <Input label="Titre" required type="text"
            placeholder="Ex : Station météo pour le village"
            value={fields.title} onChange={set('title')} />
        </div>

        <div className="col-full">
          <Input label="Description" type="text"
            placeholder="Courte description du projet"
            value={fields.desc} onChange={set('desc')} />
        </div>

        <div className="col-full">
          <label>Image de campagne</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
          {preview && (
            <img src={preview} alt="preview"
              style={{ marginTop: '0.5rem', maxHeight: 160, borderRadius: 8, objectFit: 'cover' }} />
          )}
        </div>

        <div>
          <label>Catégorie</label>
          <select value={fields.category} onChange={set('category')}>
            {CATEGORIES.map((cat, i) => <option key={i} value={i}>{cat}</option>)}
          </select>
        </div>

        <div>
          <Input label="Objectif (ETH)" required type="number" min="0.01" step="0.01"
            placeholder="0.5" value={fields.goal} onChange={set('goal')} />
        </div>

        <div>
          <Input label="Date de fin" required type="date" min={todayISO()}
            value={fields.deadline} onChange={set('deadline')} />
        </div>
      </div>

      {ipfsMsg && <Alert type="info">{ipfsMsg}</Alert>}

      <Button variant="primary" block icon="ti-rocket" loading={loading} onClick={handleSubmit}
        disabled={!wallet.connected}>
        {wallet.connected ? 'Créer la campagne' : 'Connectez MetaMask pour créer'}
      </Button>
    </Card>
  );
}
