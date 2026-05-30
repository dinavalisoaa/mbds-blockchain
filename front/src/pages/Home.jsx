import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllCampaigns } from '../services/campaigns.js';
import { txRefundAll } from '../services/transactions.js';
import { useTx } from '../hooks/useTx.js';
import { TX_LABELS, CATEGORIES } from '../constants.js';
import CampaignCard from '../components/CampaignCard.jsx';
import { Alert, Spinner, EmptyState, Button } from '../components/ui/index.js';

// ── Live TX Feed ─────────────────────────────────────────
const TX_PAGE_SIZE = 5;

function LiveTxFeed({ campaigns }) {
  const [titleFilter, setTitleFilter] = useState('');
  const [txPage,      setTxPage]      = useState(1);

  if (!campaigns.length) return null;

  const timeAgo = ts => {
    const diff = Math.floor(Date.now() / 1000) - Number(ts);
    if (diff < 60)    return `${diff}S_AGO`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}M_AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H_AGO`;
    return `${Math.floor(diff / 86400)}D_AGO`;
  };

  const sorted = [...campaigns].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

  const isFiltered = titleFilter.trim() !== '';

  const filtered = isFiltered
    ? sorted.filter(c => c.title.toLowerCase().includes(titleFilter.toLowerCase()))
    : sorted;

  const totalPages = Math.ceil(filtered.length / TX_PAGE_SIZE);
  const displayed  = isFiltered
    ? filtered
    : filtered.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE);

  const handleTitleFilter = val => { setTitleFilter(val); setTxPage(1); };

  return (
    <div className="tx-feed">
      {/* Header */}
      <div className="tx-feed-header">
        <span className="tx-feed-title">LIVE_TRANSACTION_FEED_SEPOLIA</span>
        <span className="tx-feed-syncing">SYNCING...</span>
        <span className="tx-feed-total">TOTAL: {campaigns.length}_TX</span>
      </div>

      {/* Filter bar */}
      <div className="tx-feed-filter">
        <div className="search-input-wrap" style={{ flex: 1, maxWidth: 320 }}>
          <i className="ti ti-search search-input-icon" />
          <input
            type="text"
            placeholder="FILTER_BY_CAMPAIGN_TITLE_"
            value={titleFilter}
            onChange={e => handleTitleFilter(e.target.value)}
          />
        </div>
        {isFiltered && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            {filtered.length} RESULT{filtered.length !== 1 ? 'S' : ''}
          </span>
        )}
      </div>

      {/* Rows */}
      {displayed.length === 0 ? (
        <div className="tx-feed-empty">NO_TRANSACTIONS_FOUND</div>
      ) : (
        displayed.map(c => (
          <div key={c.id} className="tx-feed-row">
            <span className="tx-feed-addr">{c.creatorShort}</span>
            <span className="tx-feed-action">CAMPAIGN_CREATED: {c.title}</span>
            <span className="tx-feed-time">{timeAgo(c.createdAt)}</span>
          </div>
        ))
      )}

      {/* Pagination (hidden when filter active) */}
      {!isFiltered && totalPages > 1 && (
        <div className="tx-feed-pagination">
          <button
            className="pagination-btn"
            disabled={txPage === 1}
            onClick={() => setTxPage(p => p - 1)}
          >
            <i className="ti ti-chevron-left" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`pagination-btn${p === txPage ? ' active' : ''}`}
              onClick={() => setTxPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            className="pagination-btn"
            disabled={txPage === totalPages}
            onClick={() => setTxPage(p => p + 1)}
          >
            <i className="ti ti-chevron-right" />
          </button>

          <span className="pagination-info">
            {(txPage - 1) * TX_PAGE_SIZE + 1}–{Math.min(txPage * TX_PAGE_SIZE, filtered.length)} / {filtered.length} TX
          </span>
        </div>
      )}
    </div>
  );
}

// ── Home Page ────────────────────────────────────────────
export default function Home({ wallet, diagnostic }) {
  const navigate = useNavigate();
  const runTx = useTx();
  const [campaigns,   setCampaigns]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter,    setCatFilter]    = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createdFrom,  setCreatedFrom]  = useState('');
  const [createdTo,    setCreatedTo]    = useState('');
  const [deadlineFrom, setDeadlineFrom] = useState('');
  const [deadlineTo,   setDeadlineTo]   = useState('');
  const [page,         setPage]         = useState(1);

  const PAGE_SIZE = 10;
  const refundedIds = useRef(new Set());

  const loadCampaigns = useCallback(async (addr = wallet.address) => {
    if (!addr) return;
    setLoading(true);
    try { setCampaigns(await fetchAllCampaigns(addr)); }
    catch (e) { console.error(e); }
    finally   { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.connected) loadCampaigns();
    else setCampaigns([]);
  }, [wallet.connected, wallet.address]);

  useEffect(() => {
    if (!wallet.connected || campaigns.length === 0) return;
    const addr = wallet.address?.toLowerCase();
    const toRefund = campaigns.filter(c =>
      c.status === 'failed' && !c.withdrawn &&
      c.creator.toLowerCase() === addr &&
      !refundedIds.current.has(c.id)
    );
    if (!toRefund.length) return;
    toRefund.forEach(c => refundedIds.current.add(c.id));
    (async () => {
      for (const c of toRefund) {
        try { await runTx(() => txRefundAll(c.id), TX_LABELS.refundAll); }
        catch { /* toast already shown */ }
      }
      loadCampaigns();
    })();
  }, [campaigns, wallet.connected, wallet.address]);

  // Convert a date string "YYYY-MM-DD" to start/end of day in seconds
  const toStartSec = iso => iso ? Math.floor(new Date(iso + 'T00:00:00').getTime() / 1000) : null;
  const toEndSec   = iso => iso ? Math.floor(new Date(iso + 'T23:59:59').getTime() / 1000) : null;

  const isFiltered = statusFilter !== 'all' || catFilter !== null || searchQuery !== ''
    || createdFrom || createdTo || deadlineFrom || deadlineTo;

  const filtered = campaigns
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => catFilter === null || c.category === catFilter)
    .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(c => !toStartSec(createdFrom)  || Number(c.createdAt) >= toStartSec(createdFrom))
    .filter(c => !toEndSec(createdTo)      || Number(c.createdAt) <= toEndSec(createdTo))
    .filter(c => !toStartSec(deadlineFrom) || Number(c.deadline)  >= toStartSec(deadlineFrom))
    .filter(c => !toEndSec(deadlineTo)     || Number(c.deadline)  <= toEndSec(deadlineTo));

  // Sans filtre : tri par deadline la plus proche, pagination
  // Avec filtre  : tous les résultats, pas de pagination
  const sorted = isFiltered
    ? filtered
    : [...filtered].sort((a, b) => Number(a.deadline) - Number(b.deadline));

  const totalPages  = Math.ceil(sorted.length / PAGE_SIZE);
  const displayed   = isFiltered ? sorted : sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange  = val => { setStatusFilter(val); setPage(1); };
  const handleCatChange     = val => { setCatFilter(val);    setPage(1); };
  const handleSearch        = val => { setSearchQuery(val);  setPage(1); };
  const handleCreatedFrom   = val => { setCreatedFrom(val);  setPage(1); };
  const handleCreatedTo     = val => { setCreatedTo(val);    setPage(1); };
  const handleDeadlineFrom  = val => { setDeadlineFrom(val); setPage(1); };
  const handleDeadlineTo    = val => { setDeadlineTo(val);   setPage(1); };

  const hasDateFilter = createdFrom || createdTo || deadlineFrom || deadlineTo;
  const clearDates    = () => { setCreatedFrom(''); setCreatedTo(''); setDeadlineFrom(''); setDeadlineTo(''); setPage(1); };

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-status-badge">
            <span className="hero-status-dot" />
            NETWORK_STATUS: SEPOLIA_TESTNET_STABLE
          </div>
          <h1 className="hero-heading">
            IMMUTABLE FUNDRAISING FOR THE{' '}
            <span className="accent">NEXT GENERATION</span>
            {' '}OF DAPPS.
          </h1>
          <p className="hero-subtext">
            DEPLOY TRANSPARENT, TRUSTLESS CROWDFUNDING CAMPAIGNS ON ETHEREUM SEPOLIA.
            FUNDS LOCKED IN SMART CONTRACTS — RELEASED ONLY ON SUCCESS.
          </p>
          <div className="hero-ctas">
            <Button
              variant="primary"
              icon="ti-rocket"
              onClick={() => navigate('/create')}
            >
              START_CAMPAIGN_V1
            </Button>
            <Button variant="outline" icon="ti-chart-bar">
              VIEW_PROTOCOL_STATS
            </Button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-image-placeholder">
            <i className="ti ti-cpu-2" style={{ fontSize: 56, opacity: 0.15 }} />
          </div>
        </div>
      </section>

      {/* ── Search + category filter bar ── */}
      <div className="search-bar">
        <span className="search-bar-label">SEARCH_REGISTRY</span>
        <div className="search-input-wrap">
          <i className="ti ti-search search-input-icon" />
          <input
            type="text"
            placeholder="QUERY_CONTRACT_OR_NAME_"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {/* Status filter dropdown */}
        <div className="select-wrap" style={{ minWidth: 160 }}>
          <select value={statusFilter} onChange={e => handleStatusChange(e.target.value)}>
            <option value="all">ALL_STATUS</option>
            <option value="active">ACTIVE</option>
            <option value="success">SUCCESS</option>
            <option value="failed">FAILED</option>
            <option value="cancelled">CANCELLED</option>
          </select>
          <i className="ti ti-chevron-down select-chevron" />
        </div>

        {/* Category chips */}
        <button
          className={`filter-chip${catFilter === null ? ' active' : ''}`}
          onClick={() => handleCatChange(null)}
        >ALL</button>
        {CATEGORIES.map((cat, i) => (
          <button
            key={i}
            className={`filter-chip${catFilter === i ? ' active' : ''}`}
            onClick={() => handleCatChange(i)}
          >{cat}</button>
        ))}

        <button className="sort-btn">
          <i className="ti ti-sort-descending" />SORT_BY: RECENT_DEPLOYMENTS
        </button>
        <Button variant="ghost" icon="ti-refresh" loading={loading}
          disabled={!wallet.connected} onClick={() => loadCampaigns()}>
          REFRESH
        </Button>
      </div>

      {/* ── Date range filters ── */}
      <div className="date-filter-bar">
        <span className="date-filter-label">
          <i className="ti ti-calendar-search" /> DATE_FILTERS
        </span>

        <div className="date-filter-group">
          <span className="date-filter-group-label">CREATED_BETWEEN</span>
          <input type="date" className="date-filter-input"
            value={createdFrom} onChange={e => handleCreatedFrom(e.target.value)} />
          <span className="date-filter-sep">→</span>
          <input type="date" className="date-filter-input"
            value={createdTo} onChange={e => handleCreatedTo(e.target.value)} />
        </div>

        <div className="date-filter-divider" />

        <div className="date-filter-group">
          <span className="date-filter-group-label">DEADLINE_BETWEEN</span>
          <input type="date" className="date-filter-input"
            value={deadlineFrom} onChange={e => handleDeadlineFrom(e.target.value)} />
          <span className="date-filter-sep">→</span>
          <input type="date" className="date-filter-input"
            value={deadlineTo} onChange={e => handleDeadlineTo(e.target.value)} />
        </div>

        {hasDateFilter && (
          <button className="date-filter-clear" onClick={clearDates}>
            <i className="ti ti-x" /> CLEAR_DATES
          </button>
        )}
      </div>

      {/* ── Campaign grid ── */}
      {loading ? (
        <Spinner label="LOADING_CAMPAIGNS..." />
      ) : !wallet.connected ? (
        diagnostic
          ? <Alert type={diagnostic.ok ? 'success' : 'error'}>{diagnostic.msg}</Alert>
          : <EmptyState title="CONNECT_WALLET_TO_VIEW_CAMPAIGNS." />
      ) : !filtered.length ? (
        <EmptyState icon="ti-terminal" title="NO_CAMPAIGNS_FOUND" subtitle={
          statusFilter !== 'all' ? `NO_${statusFilter.toUpperCase()}_CAMPAIGNS.`
          : catFilter !== null   ? 'NO_CAMPAIGNS_IN_CATEGORY.'
          : 'CREATE_THE_FIRST_ONE.'
        } />
      ) : (
        <>
          <div className="campaigns-grid">
            {displayed.map(c => (
              <CampaignCard key={c.id} campaign={c} wallet={wallet} onAction={loadCampaigns} />
            ))}
          </div>

          {/* ── Pagination (hidden when filters are active) ── */}
          {!isFiltered && totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <i className="ti ti-chevron-left" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination-btn${p === page ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}

              <button
                className="pagination-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <i className="ti ti-chevron-right" />
              </button>

              <span className="pagination-info">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} / {sorted.length} CAMPAIGNS
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Live TX Feed ── */}
      {wallet.connected && <LiveTxFeed campaigns={campaigns} />}
    </>
  );
}
