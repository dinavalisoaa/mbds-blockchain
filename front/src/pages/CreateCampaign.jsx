import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { txCreateCampaign } from '../services/transactions.js';
import { uploadToPinata } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Badge } from '../components/ui/index.js';
import '../styles/CreateCampaign.css';

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const EMPTY = { title: '', desc: '', category: '0', goal: '', days: '' };

const todayFormatted = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const getDeadlineISO = days => {
  const d = new Date();
  d.setDate(d.getDate() + (parseInt(days) || 30));
  return d.toISOString().split('T')[0];
};

/* ─────────────────────────────────────────────────────────────
   Image upload sub-component
───────────────────────────────────────────────────────────── */
function ImageUpload({ preview, onFile, onClear }) {
  const ref = useRef();

  const handleDrop = useCallback(e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onFile(file);
  }, [onFile]);

  if (preview) {
    return (
      <div className="upload-preview-wrap">
        <img src={preview} alt="Campaign preview" />
        <button className="upload-remove-btn" onClick={onClear} type="button">
          <i className="ti ti-x" /> REMOVE
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
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && ref.current.click()}
    >
      <i className="ti ti-photo-up" />
      <span>Drop image or <strong>BROWSE_FILE</strong></span>
      <input ref={ref} type="file" accept="image/*"
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CreateCampaign page
───────────────────────────────────────────────────────────── */
export default function CreateCampaign({ wallet }) {
  const runTx = useTx();
  const { add: addToast } = useToast();
  const navigate = useNavigate();

  const [fields,     setFields]     = useState(EMPTY);
  const [imageFile,  setImageFile]  = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [copied,     setCopied]     = useState(false);

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleFile = useCallback(file => {
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleClearImage = useCallback(() => {
    setImageFile(null);
    setPreview(null);
  }, []);

  const handleSubmit = async () => {
    if (!wallet.connected) return;
    setLoading(true);
    try {
      let cid = '';
      if (imageFile) {
        setLoadingMsg('UPLOADING_ASSET...');
        cid = await uploadToPinata(imageFile);
      }
      setLoadingMsg('DEPLOYING_CONTRACT...');
      const receipt = await runTx(
        () => txCreateCampaign(
          fields.title, fields.desc, cid,
          fields.category, fields.goal,
          getDeadlineISO(fields.days)
        ),
        TX_LABELS.createCampaign
      );
      const newId = receipt?.campaignId;
      navigate(newId != null ? `/campaign/${newId}` : '/');
    } catch (e) {
      addToast({
        type: 'error',
        message: e?.reason || e?.shortMessage || e?.message || 'Unexpected error',
      });
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('sepolia.ethfund.io/new-campaign');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Live preview values ── */
  const previewTitle = fields.title  || 'UNNAMED_PROJECT';
  const previewDesc  = fields.desc   || 'Awaiting deployment parameters...';
  const previewGoal  = fields.goal   || '0.00';
  const previewDays  = fields.days   || '30';
  const previewCat   = CATEGORIES[parseInt(fields.category)] ?? 'TECHNOLOGY';

  const canDeploy = wallet.connected && fields.title.trim() && fields.goal.trim() && !loading;

  return (
    <div className="campaign-detail">
      <Link to="/" className="back-link">
        <i className="ti ti-arrow-left" /> ALL_CAMPAIGNS
      </Link>

      <div className="detail-page">

        {/* ════════════════════════════════════════
            LEFT — Form
        ════════════════════════════════════════ */}
        <div className="detail-left">

          <div className="detail-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <h1 className="detail-panel-title">INITIALIZE_CAMPAIGN</h1>
              <Badge status="active">NEW</Badge>
            </div>
            <p className="detail-panel-subtitle">
              Deploy new crowdfunding smart contract on Sepolia Testnet.
            </p>
          </div>

          {/* Row 1 — title + category */}
          <div className="detail-field-grid">
            <div className="detail-field">
              <label>CAMPAIGN_TITLE</label>
              <input
                type="text"
                placeholder="ENTER_PROJECT_NAME_"
                value={fields.title}
                onChange={set('title')}
              />
            </div>
            <div className="detail-field">
              <label>SECTOR_CLASSIFICATION</label>
              <div className="select-wrap">
                <select value={fields.category} onChange={set('category')}>
                  {CATEGORIES.map((cat, i) => (
                    <option key={i} value={i}>{cat}</option>
                  ))}
                </select>
                <i className="ti ti-chevron-down select-chevron" />
              </div>
            </div>
          </div>

          {/* Row 2 — description */}
          <div className="detail-field">
            <label>MANIFESTO_DESCRIPTION</label>
            <textarea
              rows={5}
              placeholder="DESCRIBE_THE_UTILITY_OF_THIS_DEPLOYMENT_"
              value={fields.desc}
              onChange={set('desc')}
            />
          </div>

          {/* Row 3 — goal + duration */}
          <div className="detail-field-grid">
            <div className="detail-field">
              <label>TARGET_GOAL (ETH)</label>
              <div className="input-suffix-wrap">
                <input
                  type="number" min="0.01" step="0.01"
                  placeholder="0.00"
                  value={fields.goal}
                  onChange={set('goal')}
                />
                <span className="input-suffix">SEPOLIA_ETH</span>
              </div>
            </div>
            <div className="detail-field">
              <label>STAKING_PERIOD (DAYS)</label>
              <input
                type="number" min="1" step="1"
                placeholder="30"
                value={fields.days}
                onChange={set('days')}
              />
            </div>
          </div>

          {/* Row 4 — image */}
          <div className="detail-field">
            <label>VISUAL_ASSET</label>
            <ImageUpload
              preview={preview}
              onFile={handleFile}
              onClear={handleClearImage}
            />
          </div>

          {/* CTA */}
          <div className="detail-action-section">
            <button
              className="detail-cta-btn"
              disabled={!canDeploy}
              onClick={handleSubmit}
            >
              {loading
                ? <i className="ti ti-loader-2 spinning" />
                : <i className="ti ti-rocket" />}
              {loading
                ? (loadingMsg || 'LOADING...')
                : wallet.connected
                  ? 'DECODE_AND_DEPLOY_CONTRACT'
                  : 'CONNECT_WALLET_TO_DEPLOY'}
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — Live preview
        ════════════════════════════════════════ */}
        <div className="detail-right">

          <div className="preview-label-row">
            <span className="preview-label-dot" />
            LIVE_CONTRACT_PREVIEW
          </div>

          {/* Preview card */}
          <div className="detail-preview-card">
            <div style={{ position: 'relative' }}>
              {preview
                ? <img src={preview} alt="preview" className="campaign-card-img" />
                : (
                  <div className="campaign-card-img-placeholder">
                    <i className="ti ti-photo-off" />
                  </div>
                )
              }
              <span className="campaign-card-cat-badge">CAT: {previewCat}</span>
              <div className="preview-img-progress-track">
                <div className="preview-img-progress-fill" style={{ width: '0%' }} />
              </div>
            </div>

            <div className="campaign-card-body">
              <div className="campaign-top">
                <span className="campaign-title">{previewTitle}</span>
                <Badge status="active" />
              </div>
              <p className="campaign-hash">ID: 0x71C…8E2</p>
              <p className="campaign-desc" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                {previewDesc}
              </p>

              <div className="preview-card-divider" />

              <div className="preview-card-stats">
                <div>
                  <div className="preview-stat-label">GOAL_THRESHOLD</div>
                  <div className="preview-stat-value teal">{previewGoal} ETH</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="preview-stat-label">TIME_REMAINING</div>
                  <div className="preview-stat-value">{previewDays} DAYS</div>
                </div>
              </div>

              <div className="preview-card-footer-bar">
                <span style={{ color: 'var(--green)', fontSize: 10, letterSpacing: '0.06em' }}>
                  0.0% FUNDED
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                  CREATED: {todayFormatted()}
                </span>
              </div>
            </div>
          </div>

          {/* Deployment link */}
          <div className="contract-link-box">
            <div className="contract-link-label">DEPLOYMENT_LINK</div>
            <div className="contract-link-row">
              <i className="ti ti-link" style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="contract-link-url">sepolia.ethfund.io/new-campaign</span>
              <button className="contract-copy-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`}
                  style={{ color: copied ? 'var(--green)' : undefined }} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}