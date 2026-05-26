import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { txCreateCampaign } from '../services/transactions.js';
import { uploadToPinata } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Badge } from '../components/ui/index.js';

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

export default function CreateCampaign({ wallet }) {
  const runTx = useTx();
  const { add: addToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [fields,     setFields]     = useState(EMPTY);
  const [imageFile,  setImageFile]  = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [copied,     setCopied]     = useState(false);

  const set = key => e => setFields(f => ({ ...f, [key]: e.target.value }));

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    console.log('[CREATE] File selected:', file.name, file.type, file.size, 'bytes');
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    console.log('[CREATE] Submit clicked — wallet:', wallet?.connected, 'fields:', fields);
    if (!wallet.connected) { console.warn('[CREATE] Wallet not connected'); return; }
    setLoading(true);
    try {
      let cid = '';
      if (imageFile) {
        console.log('[CREATE] Uploading to Pinata...', imageFile.name);
        setLoadingMsg('UPLOADING_PHOTO...');
        cid = await uploadToPinata(imageFile);
        console.log('[CREATE] Pinata upload OK — CID:', cid);
      } else {
        console.log('[CREATE] No image — skipping upload');
      }
      console.log('[CREATE] Sending tx — title:', fields.title, 'goal:', fields.goal, 'days:', fields.days, 'cid:', cid);
      setLoadingMsg('CREATING_CAMPAIGN...');
      const receipt = await runTx(
        () => txCreateCampaign(
          fields.title, fields.desc, cid,
          fields.category, fields.goal,
          getDeadlineISO(fields.days)
        ),
        TX_LABELS.createCampaign
      );
      console.log('[CREATE] Tx receipt:', receipt);
      console.log('[CREATE] Campaign ID:', receipt?.campaignId);
      const newId = receipt?.campaignId;
      navigate(newId != null ? `/campaign/${newId}` : '/');
    } catch (e) {
      console.error('[CREATE] Error:', e);
      addToast({ type: 'error', message: e?.reason || e?.shortMessage || e?.message || 'Erreur inattendue' });
    } finally { setLoading(false); setLoadingMsg(''); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('sepolia.ethfund.io/new-campaign');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live preview values
  const previewTitle = fields.title  || 'UNNAMED_PROJECT';
  const previewDesc  = fields.desc   || 'Awaiting deployment parameters...';
  const previewGoal  = fields.goal   || '0.00';
  const previewDays  = fields.days   || '30';
  const previewCat   = CATEGORIES[parseInt(fields.category)] ?? 'TECHNOLOGY';

  return (
    <div className="campaign-detail">
      <Link to="/" className="back-link">
        <i className="ti ti-arrow-left" /> ALL_CAMPAIGNS
      </Link>

      <div className="detail-page">

        {/* ── LEFT PANEL — Form ── */}
        <div className="detail-left">
          <div className="detail-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h1 className="detail-panel-title">INITIALIZE_CAMPAIGN</h1>
              <span className="badge active">NEW</span>
            </div>
            <p className="detail-panel-subtitle">
              Deploy new crowdfunding smart contract on Sepolia Testnet.
            </p>
          </div>

          {/* Row 1: title + category */}
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

          {/* Row 2: description textarea */}
          <div className="detail-field" style={{ marginBottom: '1rem' }}>
            <label>MANIFESTO_DESCRIPTION</label>
            <textarea
              rows={5}
              placeholder="DESCRIBE_THE_UTILITY_OF_THIS_DEPLOYMENT_"
              value={fields.desc}
              onChange={set('desc')}
            />
          </div>

          {/* Row 3: goal + staking period */}
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

          {/* Row 4: image upload */}
          <div className="detail-field" style={{ marginBottom: '1.25rem' }}>
            <label>VISUAL_ASSET</label>
            <input
              ref={fileRef} type="file" accept="image/*"
              onChange={handleFile}
              style={{ cursor: 'pointer' }}
            />
            {preview && (
              <img
                src={preview} alt="preview"
                style={{
                  marginTop: '0.5rem', width: '100%', maxHeight: 120,
                  objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)',
                }}
              />
            )}
          </div>

          {/* CTA */}
          <div className="detail-action-section" style={{ marginTop: 0 }}>
            <button
              className="detail-cta-btn"
              disabled={!wallet.connected || loading || !fields.title || !fields.goal}
              onClick={handleSubmit}
            >
              {loading
                ? <i className="ti ti-loader-2 spinning" />
                : <i className="ti ti-rocket" />
              }
              {loading
                ? loadingMsg || 'LOADING...'
                : wallet.connected ? 'DECODE_AND_DEPLOY_CONTRACT' : 'CONNECT_WALLET_TO_DEPLOY'
              }
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL — Live preview ── */}
        <div className="detail-right">
          <div className="preview-label-row">
            <span className="preview-label-dot" />
            LIVE_CONTRACT_PREVIEW
          </div>

          {/* Preview card — mirrors CampaignCard layout */}
          <div className="detail-preview-card">
            <div style={{ position: 'relative' }}>
              {preview ? (
                <img src={preview} alt="preview" className="campaign-card-img" />
              ) : (
                <div className="campaign-card-img-placeholder">
                  <i className="ti ti-photo-off" />
                </div>
              )}
              <span className="campaign-card-cat-badge">CAT: {previewCat}</span>
              {/* 0% funded progress bar */}
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

          {/* Deployment link box */}
          <div className="contract-link-box">
            <div className="contract-link-label">DEPLOYMENT_LINK</div>
            <div className="contract-link-row">
              <i className="ti ti-link" style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="contract-link-url">
                sepolia.ethfund.io/new-campaign
              </span>
              <button className="contract-copy-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
