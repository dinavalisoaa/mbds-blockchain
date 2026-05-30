import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCampaignById, fetchContributions } from '../services/campaigns.js';
import { txContribute, txWithdraw, txRefund, txCancelCampaign, txUpdateCampaignMeta, txExtendDeadline } from '../services/transactions.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { ipfsUrl, uploadToPinata } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
import { CATEGORIES, TX_LABELS } from '../constants.js';
import { Badge, Spinner, EmptyState } from '../components/ui/index.js';
import '../styles/CampaignDetail.css';
import '../index.css';


const SEGMENTS = 20;
function SegmentedBar({ percent, status }) {
  const filled = Math.round((Math.min(percent, 100) / 100) * SEGMENTS);
  const color = status === 'failed' ? 'var(--red)' : 'var(--green)';
  return (
    <div className="seg-bar">
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className="seg-bar-block"
          style={{ background: i < filled ? color : 'var(--surface-3)' }}
        />
      ))}
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────
export default function CampaignDetail({ wallet }) {
  const { id } = useParams();
  const runTx = useTx();

  const [campaign,        setCampaign]        = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [amount,          setAmount]          = useState('');
  const [loadingContrib,  setLoadingContrib]  = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [loadingRefund,   setLoadingRefund]   = useState(false);
  const [loadingCancel,   setLoadingCancel]   = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [copiedShare,     setCopiedShare]     = useState(false);
  const [contributors,    setContributors]    = useState([]);
  const [contribLoading,  setContribLoading]  = useState(false);
  const [editOpen,        setEditOpen]        = useState(false);
  const [editDesc,        setEditDesc]        = useState('');
  const [editImageFile,   setEditImageFile]   = useState(null);
  const [editPreview,     setEditPreview]     = useState(null);
  const [editExtraDays,   setEditExtraDays]   = useState('');
  const [loadingMeta,     setLoadingMeta]     = useState(false);
  const [loadingDeadline, setLoadingDeadline] = useState(false);
  const editFileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fetchCampaignById(id)
      .then(c  => { if (alive) setCampaign(c); })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!campaign) return;
    let alive = true;
    setContribLoading(true);
    fetchContributions(id)
      .then(contribs => { if (alive) setContributors(contribs); })
      .catch(() => {})
      .finally(() => { if (alive) setContribLoading(false); });
    return () => { alive = false; };
  }, [id, campaign]);

  const run = async (fn, labels, setLoader) => {
    setLoader(true);
    try {
      await runTx(fn, labels);
      const c = await fetchCampaignById(id);
      setCampaign(c);
    } catch { /* toast */ }
    finally { setLoader(false); }
  };

  const handleCopy = text => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShare = (title, progress) => {
    const url = `${window.location.origin}/mbds-blockchain/#/campaign/${id}`;
    const text = `${url}`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const backLink = (
    <Link to="/" className="back-link">
      <i className="ti ti-arrow-left" /> ALL_CAMPAIGNS
    </Link>
  );

  if (loading) return <>{backLink}<Spinner label="LOADING_CAMPAIGN..." /></>;
  if (error)   return (
    <div>
      {backLink}
      <div style={{ marginTop: '1.5rem', color: 'var(--red)', fontSize: 12 }}>
        <i className="ti ti-alert-circle" /> {error}
      </div>
    </div>
  );

  const c = campaign;
  const imgUrl      = ipfsUrl(c.imageIPFS);
  const isCreator   = !!(wallet?.connected && wallet?.address &&
                        wallet.address.toLowerCase() === c.creator.toLowerCase());
  const etherscanCreator = `https://sepolia.etherscan.io/address/${c.creator}`;

  // Contribute cap logic
  const remaining      = Math.max(0, parseFloat(c.goalEth) - parseFloat(c.amountRaisedEth));
  const parsedAmount   = parseFloat(amount);
  const hasAmount      = amount !== '' && !isNaN(parsedAmount) && parsedAmount > 0;
  const effectiveAmt   = hasAmount ? Math.round(Math.min(parsedAmount, remaining) * 1e6) / 1e6 : 0;
  const isCapped       = hasAmount && parsedAmount > remaining;

  const dd = new Date(Number(c.createdAt) * 1000);
  const createdDate = `${String(dd.getDate()).padStart(2,'0')}/${String(dd.getMonth()+1).padStart(2,'0')}/${dd.getFullYear()}`;

  const dl = new Date(Number(c.deadline) * 1000);
  const deadlineDateTime = `${String(dl.getDate()).padStart(2,'0')}/${String(dl.getMonth()+1).padStart(2,'0')}/${dl.getFullYear()} ${String(dl.getHours()).padStart(2,'0')}:${String(dl.getMinutes()).padStart(2,'0')}`;

  const statusLabel = c.status === 'active'    ? 'LIVE_ON_SEPOLIA'
                    : c.status === 'success'   ? 'FUNDED'
                    : c.status === 'closed'    ? 'CLOSED'
                    : c.status === 'failed'    ? 'FAILED'
                    : 'CANCELLED';
  const nodeLabel = `${c.status.toUpperCase()}_NODE_V1`;

  return (
    <div className="campaign-detail">
      {backLink}

      {/* ── HERO ──────────────────────────────────────────── */}
      <div className="fiche-hero">

        {/* LEFT: image */}
        <div className="fiche-hero-img-wrap">
          {imgUrl
            ? <img src={imgUrl} alt={c.title} className="fiche-hero-img"
                onError={e => { e.target.style.display='none'; }} />
            : <div className="fiche-hero-img-placeholder">
                <i className="ti ti-photo-off" />
              </div>
          }
          <span className="fiche-node-badge">{nodeLabel}</span>
        </div>

        {/* RIGHT: status + funding + action */}
        <div className="fiche-hero-panel">

          {/* Status row */}
          <div className="fiche-status-row">
            <div className="fiche-status-left">
              <span className="fiche-status-label">CURRENT_STATUS</span>
              <span className="fiche-status-live">
                <span className="fiche-live-dot" />
                {statusLabel}
              </span>
            </div>
            <div className="fiche-status-right">
              <span className="fiche-status-label">URGENCY_COUNTDOWN</span>
              <CountdownVal deadline={c.deadline} status={c.status} />
            </div>
          </div>

          <div className="fiche-divider" />

          {/* Funded */}
          <div className="fiche-funded-label">TOTAL_FUNDED</div>
          <div className="fiche-funded-row">
            <span className="fiche-funded-val">{c.amountRaisedEth} <span className="fiche-funded-unit">ETH</span></span>
            <span className="fiche-goal-label">GOAL: {c.goalEth} ETH</span>
          </div>

          {/* Segmented bar */}
          <SegmentedBar percent={c.progress} status={c.status} />

          <div className="fiche-bar-meta">
            <span className="fiche-pct" style={{ color: c.status === 'failed' ? 'var(--red)' : 'var(--green)' }}>
              {c.progress}% COMPLETED
            </span>
            <span className="fiche-contrib-count">{c.contributorCount} CONTRIBUTORS</span>
          </div>

          <div className="fiche-divider" />

          {/* My stake */}
          {c.myContrib > 0n && (
            <div className="fiche-stake-box">
              <i className="ti ti-info-circle" style={{ color: 'var(--green)', fontSize: 13 }} />
              <span>YOUR_STAKE: <strong style={{ color: 'var(--green)' }}>{c.myContribEth} ETH</strong></span>
            </div>
          )}

          {/* Contribute — active + connected */}
          {c.status === 'active' && wallet?.connected && (
            <div className="fiche-contribute">
              <label className="fiche-contribute-label">CONTRIBUTE_AMOUNT</label>
              <div className="fiche-contribute-row">
                <div className="input-suffix-wrap" style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="number" min="0.000001" step="0.001" placeholder="0.00"
                    value={amount}
                    onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v); }}
                    disabled={loadingContrib}
                  />
                  <span className="input-suffix">ETH</span>
                  <button
                    className="fiche-max-btn"
                    type="button"
                    onClick={() => setAmount(String(remaining))}
                    disabled={loadingContrib}
                  >MAX</button>
                </div>
                <button
                  className="fiche-contribute-btn"
                  disabled={loadingContrib || !hasAmount}
                  onClick={() => run(() => txContribute(c.id, effectiveAmt), TX_LABELS.contribute, setLoadingContrib)}
                >
                  {loadingContrib ? <i className="ti ti-loader-2 spinning" /> : null}
                  CONTRIBUTE_ETH
                </button>
              </div>
              {isCapped && (
                <p className="fiche-cap-notice">
                  <i className="ti ti-arrows-minimize" />
                  Capped to <strong>{effectiveAmt} ETH</strong> — remaining goal.
                </p>
              )}
            </div>
          )}

          {/* Contribute — active + not connected */}
          {c.status === 'active' && !wallet?.connected && (
            <button className="detail-cta-btn" disabled style={{ marginTop: '1rem' }}>
              CONNECT_WALLET_TO_CONTRIBUTE
            </button>
          )}

          {/* Edit — active + creator */}
          {c.status === 'active' && isCreator && (
            <button
              className="detail-cta-btn detail-cta-btn--ghost"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                if (!editOpen) setEditDesc(c.description);
                setEditOpen(true);
                setTimeout(() => document.getElementById('edit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
            >
              <i className="ti ti-edit" /> EDIT_CAMPAIGN
            </button>
          )}

          {/* Cancel — active + creator + nothing raised yet */}
          {c.status === 'active' && isCreator && c.amountRaised === 0n && (
            <div style={{ marginTop: '1rem' }}>
              <p className="fiche-cancel-notice">
                <i className="ti ti-alert-triangle" /> No contributions yet — cancellation is permanent.
              </p>
              <button
                className="detail-cta-btn detail-cta-btn--danger"
                disabled={loadingCancel}
                onClick={() => run(() => txCancelCampaign(c.id), TX_LABELS.cancelCampaign, setLoadingCancel)}
              >
                {loadingCancel ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-x" />}
                CANCEL_CAMPAIGN
              </button>
            </div>
          )}

          {/* Withdraw — success + creator + not yet withdrawn */}
          {c.status === 'success' && isCreator && !c.withdrawn && (
            <button
              className="detail-cta-btn" style={{ marginTop: '1rem' }}
              disabled={loadingWithdraw}
              onClick={() => run(() => txWithdraw(c.id), TX_LABELS.withdraw, setLoadingWithdraw)}
            >
              {loadingWithdraw ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-download" />}
              WITHDRAW_FUNDS ({c.amountRaisedEth} ETH)
            </button>
          )}

          {/* Refund — failed OR cancelled + contributor */}
          {(c.status === 'failed' || c.status === 'cancelled') && c.myContrib > 0n && (
            <button
              className="detail-cta-btn detail-cta-btn--ghost" style={{ marginTop: '1rem' }}
              disabled={loadingRefund}
              onClick={() => run(() => txRefund(c.id), TX_LABELS.refund, setLoadingRefund)}
            >
              {loadingRefund ? <i className="ti ti-loader-2 spinning" /> : <i className="ti ti-receipt-refund" />}
              CLAIM_REFUND ({c.myContribEth} ETH)
            </button>
          )}

          {/* Already withdrawn */}
          {c.status === 'success' && c.withdrawn && (
            <div className="detail-withdrawn-note" style={{ marginTop: '1rem' }}>
              <i className="ti ti-circle-check" /> FUNDS_WITHDRAWN
            </div>
          )}
        </div>
      </div>

      {/* ── INFO ──────────────────────────────────────────── */}
      <div className="fiche-info">

        {/* LEFT: title + desc */}
        <div className="fiche-info-left">
          <h1 className="fiche-title">{c.title}</h1>
          {c.description
            ? <p className="fiche-desc">{c.description}</p>
            : <p className="fiche-desc" style={{ opacity: 0.4, fontStyle: 'italic' }}>No description provided.</p>
          }
        </div>

        {/* RIGHT: metadata */}
        <div className="fiche-meta-grid">
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CATEGORY</span>
            <span className="fiche-meta-val fiche-meta-val--green">{CATEGORIES[c.category] ?? '—'}</span>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CREATED</span>
            <span className="fiche-meta-val">{createdDate}</span>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">DEADLINE</span>
            <span className={`fiche-meta-val ${c.status === 'active' ? 'fiche-meta-val--green' : ''}`}>
              {deadlineDateTime}
            </span>
          </div>
          <div className="fiche-meta-item fiche-meta-item--full">
            <span className="fiche-meta-label">CREATOR_ADDRESS</span>
            <div className="fiche-meta-addr-row">
              <a href={etherscanCreator} target="_blank" rel="noopener noreferrer"
                className="fiche-meta-val fiche-meta-val--addr">
                {c.creatorShort}
              </a>
              <button className="contract-copy-btn" onClick={() => handleCopy(c.creator)}
                title={copied ? 'Copied!' : 'Copy'}>
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
              </button>
            </div>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CONTRIBUTORS</span>
            <span className="fiche-meta-val fiche-meta-val--green">{c.contributorCount}_NODES</span>
          </div>
          <div className="fiche-meta-item">
            <span className="fiche-meta-label">CHAIN</span>
            <span className="fiche-meta-val fiche-meta-val--green">SEPOLIA_ETH</span>
          </div>
        </div>

        {/* Share link */}
        <div className="fiche-share-row">
          <i className="ti ti-link" style={{ color: 'var(--green)', flexShrink: 0 }} />
          <span className="fiche-share-url">
            sepolia.ethfund.io/campaign/{id} · <em>{c.title}</em> · {c.progress}% funded
          </span>
          <button
            className="contract-copy-btn"
            onClick={() => handleCopyShare(c.title, c.progress)}
            title={copiedShare ? 'Copied!' : 'Copy share link'}
          >
            <i className={`ti ${copiedShare ? 'ti-check' : 'ti-copy'}`}
              style={{ color: copiedShare ? 'var(--green)' : undefined }} />
          </button>
        </div>
      </div>

      {/* ── EDIT PANEL (creator + active only) ───────────── */}
      {isCreator && c.status === 'active' && (
        <div className="fiche-edit-panel" id="edit-panel">
          <button className="fiche-edit-toggle" onClick={() => {
            if (!editOpen) { setEditDesc(c.description); setEditPreview(ipfsUrl(c.imageIPFS)); }
            setEditOpen(o => !o);
          }}>
            <i className={`ti ${editOpen ? 'ti-chevron-up' : 'ti-edit'}`} />
            {editOpen ? 'CLOSE_EDITOR' : 'EDIT_CAMPAIGN'}
          </button>

          {editOpen && (
            <div className="fiche-edit-body">

              {/* ── Meta edit — locked once contributions exist ── */}
              {c.amountRaised === 0n ? (
                <>
                  <div className="fiche-edit-section-label">CAMPAIGN_INFO</div>

                  <div className="detail-field">
                    <label>DESCRIPTION</label>
                    <textarea
                      value={editDesc}
                      maxLength={1000}
                      onChange={e => setEditDesc(e.target.value)}
                      rows={4}
                      placeholder="Description de la campagne..."
                    />
                  </div>

                  <div className="detail-field">
                    <label>IMAGE</label>
                    {editPreview ? (
                      <div className="upload-preview-wrap">
                        <img src={editPreview} alt="preview" />
                        <button className="upload-remove-btn" onClick={() => {
                          setEditPreview(null);
                          setEditImageFile(null);
                          if (editFileRef.current) editFileRef.current.value = '';
                        }}>
                          <i className="ti ti-x" /> REMOVE
                        </button>
                      </div>
                    ) : (
                      <label className="upload-zone">
                        <i className="ti ti-photo-up" />
                        <span><strong>Choisir une image</strong> ou glisser-déposer</span>
                        <span style={{ fontSize: 10 }}>PNG, JPG, GIF — max 10 MB</span>
                        <input
                          ref={editFileRef} type="file" accept="image/*"
                          onChange={e => {
                            const f = e.target.files[0];
                            if (f) { setEditImageFile(f); setEditPreview(URL.createObjectURL(f)); }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <button
                    className="detail-cta-btn"
                    disabled={loadingMeta}
                    onClick={async () => {
                      setLoadingMeta(true);
                      try {
                        let cid = c.imageIPFS;
                        if (editImageFile) cid = await uploadToPinata(editImageFile);
                        await runTx(
                          () => txUpdateCampaignMeta(c.id, editDesc, cid),
                          { pending: 'UPDATING_CAMPAIGN...', success: 'CAMPAIGN_UPDATED' }
                        );
                        const updated = await fetchCampaignById(id);
                        setCampaign(updated);
                        setEditImageFile(null);
                        setEditOpen(false);
                        if (editFileRef.current) editFileRef.current.value = '';
                      } catch { /* toast */ }
                      finally { setLoadingMeta(false); }
                    }}
                  >
                    {loadingMeta
                      ? <><i className="ti ti-loader-2 spinning" /> SAVING...</>
                      : <><i className="ti ti-device-floppy" /> SAVE_CHANGES</>
                    }
                  </button>
                </>
              ) : (
                <div className="fiche-edit-meta-locked">
                  <i className="ti ti-lock" />
                  DESCRIPTION &amp; IMAGE verrouillés — des contributions ont été reçues.
                </div>
              )}

              {/* ── Extend deadline ─────────────────────────────── */}
              <div className="fiche-edit-divider" />
              <div className="fiche-edit-section-label">EXTEND_DEADLINE</div>

              <div className="detail-field">
                <label>JOURS SUPPLÉMENTAIRES (max 30)</label>
                <div className="input-suffix-wrap">
                  <input
                    type="number" min="1" max="30" step="1"
                    placeholder="7"
                    value={editExtraDays}
                    onChange={e => setEditExtraDays(e.target.value)}
                  />
                  <span className="input-suffix">DAYS</span>
                </div>
              </div>

              <button
                className="detail-cta-btn detail-cta-btn--ghost"
                disabled={loadingDeadline || !editExtraDays}
                onClick={async () => {
                  setLoadingDeadline(true);
                  try {
                    await runTx(
                      () => txExtendDeadline(c.id, editExtraDays),
                      { pending: 'EXTENDING_DEADLINE...', success: 'DEADLINE_EXTENDED' }
                    );
                    const updated = await fetchCampaignById(id);
                    setCampaign(updated);
                    setEditExtraDays('');
                  } catch { /* toast */ }
                  finally { setLoadingDeadline(false); }
                }}
              >
                {loadingDeadline
                  ? <><i className="ti ti-loader-2 spinning" /> EXTENDING...</>
                  : <><i className="ti ti-clock-plus" /> EXTEND_DEADLINE</>
                }
              </button>

            </div>
          )}
        </div>
      )}

      {/* ── CONTRIBUTORS ──────────────────────────────────── */}
      <div className="fiche-log">
        <div className="fiche-log-header">
          <span className="fiche-log-title">CONTRIBUTORS</span>
          {contributors.length > 0 && (
            <span className="fiche-log-tab-count">{contributors.length}</span>
          )}
          <span className="fiche-log-realtime">
            <span className="fiche-live-dot" /> REAL-TIME
          </span>
        </div>

        <div className="fiche-tx-header">
          <span>RANK</span>
          <span>ADDRESS</span>
          <span>AMOUNT_ETH</span>
          <span>SHARE_%</span>
        </div>

        {contribLoading
          ? <div style={{ padding: '2rem 1rem' }}><Spinner label="LOADING_CONTRIBUTORS..." /></div>
          : contributors.length === 0
            ? <EmptyState icon="ti-users" title="NO_CONTRIBUTORS" subtitle="NO_CONTRIBUTIONS_YET." />
            : [...contributors]
                .sort((a, b) => (b.amount > a.amount ? 1 : -1))
                .map((contrib, i) => (
                  <ContribRow
                    key={contrib.address}
                    rank={i + 1}
                    contrib={contrib}
                    totalRaised={c.amountRaised}
                  />
                ))
        }
      </div>
    </div>
  );
}

// Contributor row
function ContribRow({ rank, contrib, totalRaised }) {
  const share = totalRaised > 0n
    ? ((Number(contrib.amount) / Number(totalRaised)) * 100).toFixed(1)
    : '0.0';
  return (
    <div className="fiche-tx-row">
      <span className="fiche-tx-type">
        <span className="fiche-tx-dot" style={{ background: 'var(--green)' }} />
        #{rank}
      </span>
      <span className="fiche-tx-addr">{contrib.shortAddr}</span>
      <span className="fiche-tx-amount" style={{ color: 'var(--green)' }}>
        +{contrib.amountEth}
      </span>
      <span className="fiche-tx-time">{share}%</span>
    </div>
  );
}

// Inline countdown value component (no wrapper div)
function CountdownVal({ deadline, status }) {
  const { display, isUrgent, done } = useCountdown(deadline);
  if (status !== 'active') return <span className="fiche-countdown-val fiche-countdown-val--dim">--:--:--:--</span>;
  return (
    <span className={`fiche-countdown-val${isUrgent ? ' fiche-countdown-val--urgent' : ''}`}>
      {done ? 'EXPIRED' : display}
    </span>
  );
}