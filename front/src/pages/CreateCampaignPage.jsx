import { useState, useRef, useCallback } from 'react';
import { txCreateCampaign } from '../services/transactions.js';
import { uploadToPinata } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Button, Alert, Input } from '../components/ui/index.js';
import '../styles/CreateCampaignPage.css';

/* ── helpers ──────────────────────────────────────────────── */
const EMPTY = { title: '', desc: '', category: '0', goal: '', deadline: '' };
const todayISO = () => new Date().toISOString().split('T')[0];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - Date.now()) / 86_400_000);
  return diff > 0 ? diff : null;
}

function missingFields(fields) {
  const missing = [];
  if (!fields.title.trim())    missing.push('title');
  if (!fields.goal.trim())     missing.push('goal');
  if (!fields.deadline.trim()) missing.push('deadline');
  return missing;
}

/* ── Step indicator ───────────────────────────────────────── */
const STEPS = [
  { label: 'Details',  icon: 'ti-pencil' },
  { label: 'Prévisualisation',  icon: 'ti-eye' },
];

function StepBar({ current }) {
  return (
    <div className="step-bar">
      {STEPS.map((s, i) => (
        <>
          <div
            key={s.label}
            className={`step-item ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}`}
          >
            <span className="step-num">
              {i < current ? <i className="ti ti-check" /> : i + 1}
            </span>
            <span>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div key={`conn-${i}`} className={`step-connector ${i < current ? 'done' : ''}`} />
          )}
        </>
      ))}
    </div>
  );
}

/* ── Image upload zone ────────────────────────────────────── */
function ImageUpload({ preview, onFile, onClear }) {
  const ref = useRef();
  const handleDrop = useCallback(e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  }, [onFile]);

  if (preview) {
    return (
      <div className="upload-preview">
        <img src={preview} alt="Campaign preview" />
        <button className="upload-preview-remove" onClick={onClear} type="button">
          <i className="ti ti-x" /> Retirer l'image
        </button>
      </div>
    );
  }

  return (
    <div
      className="upload-zone"
      onClick={() => ref.current.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && ref.current.click()}
    >
      <i className="ti ti-photo-up" />
      <span>Déposer une image: <strong>Parcourir les fichiers</strong></span>
      <input ref={ref} type="file" accept="image/*" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  );
}

/* ── Step 1 — Form ────────────────────────────────────────── */
function FormStep({ fields, set, imageFile, preview, onFile, onClearImage, onNext, wallet }) {
  const missing = missingFields(fields);
  const canNext = wallet.connected && missing.length === 0;

  return (
    <div className="step-panel">
      <div className="card">
        <div className="card-title">
          <i className="ti ti-rocket" /> Nouvelle campagne
        </div>

        <div className="form-grid">
          {/* Title */}
          <div className="col-full">
            <Input
              label={<>Titre <span className="required">*</span></>}
              type="text"
              placeholder="e.g. Panneau solaire pour l'école du village"
              value={fields.title}
              onChange={set('title')}
            />
          </div>

          {/* Description */}
          <div className="col-full">
            <Input
              label="Description"
              type="text"
              placeholder="Courte description du projet"
              value={fields.desc}
              onChange={set('desc')}
            />
          </div>

          {/* Image */}
          <div className="col-full">
            <label>Image</label>
            <ImageUpload preview={preview} onFile={onFile} onClear={onClearImage} />
          </div>

          <div className="form-section-sep" />

          {/* Category */}
          <div>
            <label>Categorie</label>
            <div className="category-select-wrap">
              <select value={fields.category} onChange={set('category')}>
                {CATEGORIES.map((cat, i) => (
                  <option key={i} value={i}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Goal */}
          <div>
            <Input
              label={<>Objectif (ETH) <span className="required">*</span></>}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.5"
              value={fields.goal}
              onChange={set('goal')}
            />
          </div>

          {/* Deadline */}
          <div>
            <Input
              label={<>Echéance <span className="required">*</span></>}
              type="date"
              min={todayISO()}
              value={fields.deadline}
              onChange={set('deadline')}
            />
          </div>
        </div>

        <div className="form-actions">
          {!wallet.connected && (
            <span className="form-missing">Se connecter à MetaMask pour créer une campagne</span>
          )}
          {wallet.connected && missing.length > 0 && (
            <span className="form-missing">
              Required: {missing.join(', ')}
            </span>
          )}
          <button
            className="btn-primary"
            onClick={onNext}
            disabled={!canNext}
          >
            <i className="ti ti-eye" /> Prévisualiser la campagne
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Step 2 — Preview ─────────────────────────────────────── */
function PreviewStep({ fields, preview, loading, ipfsMsg, onBack, onConfirm, wallet }) {
  const days = daysUntil(fields.deadline);
  const dateFormat = new Date(fields.deadline).toLocaleDateString();

  return (
    <div className="step-panel">
      {/* Live preview */}
      <p className="preview-section-label">Confirmation de la campagne</p>

      <div className="preview-card">
        {preview
          ? <img src={preview} alt="Campaign" className="preview-card-image" />
          : (
            <div className="preview-card-image-placeholder">
              <i className="ti ti-photo-off" /> Aucune image
            </div>
          )
        }
        <div className="preview-card-body">
          <div className="preview-card-top">
            <span className="preview-card-title">
              {fields.title || <em style={{ color: 'var(--text-dim)' }}>No title</em>}
            </span>
            <span className="badge active">{CATEGORIES[Number(fields.category)]}</span>
          </div>

          {fields.desc && (
            <p className="preview-card-desc">{fields.desc}</p>
          )}

          <div className="preview-meta-grid">
            <div className="preview-meta-item">
              <div className="preview-meta-label">Objectif</div>
              <div className="preview-meta-value">{fields.goal || '—'} ETH</div>
            </div>
            <div className="preview-meta-item">
              <div className="preview-meta-label">Echéance</div>
              <div className="preview-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {dateFormat}
                {days && (
                  <span className="days-chip">
                    <i className="ti ti-clock" /> {days}j
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="preview-progress-bar">
            <div className="preview-progress-fill" />
          </div>
          <div className="preview-progress-hint">
            0 / {fields.goal || '?'} ETH
          </div>
        </div>
      </div>

      {/* On-chain notice */}
      <div className="onchain-notice">
        <i className="ti ti-info-circle" />
        <span>
          Confirmer enverra une transaction sur la blockchain.
          {preview && ' L\'image sera d\'abord téléchargée sur IPFS, puis le contrat de la campagne sera déployé.'}
          {' '}Les frais de gaz s'appliquent assurez-vous que votre portefeuille a suffisamment d'ETH.
        </span>
      </div>

      {ipfsMsg && <Alert type="info">{ipfsMsg}</Alert>}

      <div className="confirm-row">
        <button className="btn-ghost" onClick={onBack} disabled={loading}>
          <i className="ti ti-arrow-left" /> Retour
        </button>
        <button
          className="btn-primary"
          onClick={onConfirm}
          disabled={loading || !wallet.connected}
        >
          {loading
            ? <><i className="ti ti-loader-2 spinning" /> {ipfsMsg ? 'Uploading…' : 'Broadcasting…'}</>
            : <><i className="ti ti-rocket" /> Confirmer </>
          }
        </button>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function CreateCampaignPage({ wallet, onCreated }) {
  const runTx    = useTx();
  const [step,      setStep]      = useState(0);           // 0 = form, 1 = preview
  const [fields,    setFields]    = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [ipfsMsg,   setIpfsMsg]   = useState(null);
  const [loading,   setLoading]   = useState(false);

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleFile = useCallback(file => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleClearImage = useCallback(() => {
    setImageFile(null);
    setPreview(null);
  }, []);

  const handleConfirm = async () => {
    if (!wallet.connected) return;
    setLoading(true);
    setIpfsMsg(null);
    try {
      let cid = '';
      if (imageFile) {
        setIpfsMsg('Uploading image to IPFS…');
        cid = await uploadToPinata(imageFile);
        setIpfsMsg(null);
      }
      await runTx(
        () => txCreateCampaign(
          fields.title, fields.desc, cid,
          fields.category, fields.goal, fields.deadline
        ),
        TX_LABELS.createCampaign
      );
      // Reset everything on success
      setFields(EMPTY);
      setImageFile(null);
      setPreview(null);
      setStep(0);
      await onCreated();
    } catch {
      /* toast already handles the error */
    } finally {
      setLoading(false);
      setIpfsMsg(null);
    }
  };

  return (
    <div className="create-page">
      <StepBar current={step} />

      {step === 0 && (
        <FormStep
          fields={fields}
          set={set}
          imageFile={imageFile}
          preview={preview}
          onFile={handleFile}
          onClearImage={handleClearImage}
          onNext={() => setStep(1)}
          wallet={wallet}
        />
      )}

      {step === 1 && (
        <PreviewStep
          fields={fields}
          preview={preview}
          loading={loading}
          ipfsMsg={ipfsMsg}
          onBack={() => setStep(0)}
          onConfirm={handleConfirm}
          wallet={wallet}
        />
      )}
    </div>
  );
}