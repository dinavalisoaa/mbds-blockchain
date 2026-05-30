import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllCampaigns } from '../services/campaigns.js';
import { txRefundAll } from '../services/transactions.js';
import { useTx } from '../hooks/useTx.js';
import { TX_LABELS, CATEGORIES } from '../constants.js';
import CampaignCard from '../components/CampaignCard.jsx';
import { Alert, Spinner, EmptyState, Button } from '../components/ui/index.js';

// ── Live TX Feed ──────────────────────────────────────────
const TX_PAGE_SIZE = 5;

function LiveTxFeed({ campaigns }) {
  const [titleFilter, setTitleFilter] = useState('');
  const [txPage,      setTxPage]      = useState(1);

  if (!campaigns.length) return null;

  const timeAgo = ts => {
    const diff = Math.floor(Date.now() / 1000) - Number(ts);
    if (diff < 60)    return `il y a ${diff}s`;
    if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)}j`;
  };

  const sorted     = [...campaigns].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  const isFiltered = titleFilter.trim() !== '';
  const filtered   = isFiltered
    ? sorted.filter(c => c.title.toLowerCase().includes(titleFilter.toLowerCase()))
    : sorted;

  const totalPages = Math.ceil(filtered.length / TX_PAGE_SIZE);
  const displayed  = isFiltered
    ? filtered
    : filtered.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE);

  const handleTitleFilter = val => { setTitleFilter(val); setTxPage(1); };

  return (
    <div className="tx-feed">
      <div className="tx-feed-header">
        <span className="tx-feed-title">Flux de transactions en direct · Sepolia</span>
        <span className="tx-feed-syncing">Synchronisation...</span>
        <span className="tx-feed-total">Total : {campaigns.length} tx</span>
      </div>

      <div className="tx-feed-filter">
        <div className="search-input-wrap" style={{ flex: 1, maxWidth: 320 }}>
          <i className="ti ti-search search-input-icon" />
          <input
            type="text"
            placeholder="Filtrer par titre de campagne..."
            value={titleFilter}
            onChange={e => handleTitleFilter(e.target.value)}
          />
        </div>
        {isFiltered && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="tx-feed-empty">Aucune transaction trouvée</div>
      ) : (
        displayed.map(c => (
          <div key={c.id} className="tx-feed-row">
            <span className="tx-feed-addr">{c.creatorShort}</span>
            <span className="tx-feed-action">Campagne créée : {c.title}</span>
            <span className="tx-feed-time">{timeAgo(c.createdAt)}</span>
          </div>
        ))
      )}

      {!isFiltered && totalPages > 1 && (
        <div className="tx-feed-pagination">
          <button className="pagination-btn" disabled={txPage === 1}
            onClick={() => setTxPage(p => p - 1)}>
            <i className="ti ti-chevron-left" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p}
              className={`pagination-btn${p === txPage ? ' active' : ''}`}
              onClick={() => setTxPage(p)}>
              {p}
            </button>
          ))}
          <button className="pagination-btn" disabled={txPage === totalPages}
            onClick={() => setTxPage(p => p + 1)}>
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

// ── Home Page ─────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function Home({ wallet, diagnostic }) {
  const navigate    = useNavigate();
  const runTx       = useTx();
  const refundedIds = useRef(new Set());

  const [campaigns,    setCampaigns]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [catFilter,    setCatFilter]    = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createdFrom,  setCreatedFrom]  = useState('');
  const [createdTo,    setCreatedTo]    = useState('');
  const [deadlineFrom, setDeadlineFrom] = useState('');
  const [deadlineTo,   setDeadlineTo]   = useState('');
  const [page,         setPage]         = useState(1);

  const loadCampaigns = useCallback(async (addr = wallet.address) => {
    setLoading(true);
    try   { setCampaigns(await fetchAllCampaigns(addr || null)); }
    catch (e) { console.error(e); }
    finally   { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => {
    loadCampaigns();
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

  // Convert "YYYY-MM-DD" to unix seconds (start / end of day)
  const toStartSec = iso => iso ? Math.floor(new Date(iso + 'T00:00:00').getTime() / 1000) : null;
  const toEndSec   = iso => iso ? Math.floor(new Date(iso + 'T23:59:59').getTime() / 1000) : null;

  const hasDateFilter = createdFrom || createdTo || deadlineFrom || deadlineTo;
  const isFiltered    = statusFilter !== 'all' || catFilter !== null || searchQuery !== '' || hasDateFilter;

  const filtered = campaigns
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => catFilter === null || c.category === catFilter)
    .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(c => !toStartSec(createdFrom)  || Number(c.createdAt) >= toStartSec(createdFrom))
    .filter(c => !toEndSec(createdTo)      || Number(c.createdAt) <= toEndSec(createdTo))
    .filter(c => !toStartSec(deadlineFrom) || Number(c.deadline)  >= toStartSec(deadlineFrom))
    .filter(c => !toEndSec(deadlineTo)     || Number(c.deadline)  <= toEndSec(deadlineTo));

  const sorted     = isFiltered
    ? filtered
    : [...filtered].sort((a, b) => Number(a.deadline) - Number(b.deadline));
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const displayed  = isFiltered ? sorted : sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = val => { setStatusFilter(val); setPage(1); };
  const handleCatChange    = val => { setCatFilter(val);    setPage(1); };
  const handleSearch       = val => { setSearchQuery(val);  setPage(1); };
  const handleCreatedFrom  = val => { setCreatedFrom(val);  setPage(1); };
  const handleCreatedTo    = val => { setCreatedTo(val);    setPage(1); };
  const handleDeadlineFrom = val => { setDeadlineFrom(val); setPage(1); };
  const handleDeadlineTo   = val => { setDeadlineTo(val);   setPage(1); };
  const clearDates         = ()  => { setCreatedFrom(''); setCreatedTo(''); setDeadlineFrom(''); setDeadlineTo(''); setPage(1); };

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-status-badge">
            <span className="hero-status-dot" />
            Réseau actif · Sepolia Testnet
          </div>
          <h1 className="hero-heading">
            Financez vos projets avec la{' '}
            <span className="accent">puissance de la blockchain</span>
            {' '}— sans intermédiaire.
          </h1>
          <p className="hero-subtext">
            Lancez votre campagne en quelques clics. Vos fonds sont sécurisés par un smart contract Ethereum :
            chaque contributeur est protégé, chaque euro est tracé, et les fonds ne sont débloqués qu'en cas de succès.
            La transparence absolue, par design.
          </p>
          <div className="hero-ctas">
            <Button variant="primary" icon="ti-rocket" onClick={() => navigate('/create')}>
              Lancer ma campagne
            </Button>
            <Button variant="outline" icon="ti-chart-bar">
              Voir les statistiques
            </Button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-image-placeholder">
            <i className="ti ti-cpu-2" style={{ fontSize: 56, opacity: 0.15 }} />
          </div>
        </div>
      </section>

      {diagnostic && !diagnostic.ok && (
        <Alert type="error">{diagnostic.msg}</Alert>
      )}

      {/* ── Filter panel ── */}
      <div className="filter-panel">

        {/* Row 1 : search + status + refresh */}
        <div className="filter-row-main">
          <div className="search-input-wrap" style={{ flex: 1 }}>
            <i className="ti ti-search search-input-icon" />
            <input
              type="text"
              placeholder="Rechercher une campagne..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <div className="select-wrap" style={{ minWidth: 150 }}>
            <select value={statusFilter} onChange={e => handleStatusChange(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="success">Succès</option>
              <option value="failed">Échoué</option>
              <option value="cancelled">Annulé</option>
            </select>
            <i className="ti ti-chevron-down select-chevron" />
          </div>
          <Button variant="ghost" icon="ti-refresh" loading={loading}
            onClick={() => loadCampaigns()}>
            Actualiser
          </Button>
        </div>

        {/* Row 2 : date ranges side by side */}
        <div className="filter-row-dates">
          <div className="date-filter-group">
            <span className="date-filter-group-label">Créé entre</span>
            <input type="date" className="date-filter-input"
              value={createdFrom} onChange={e => handleCreatedFrom(e.target.value)} />
            <span className="date-filter-sep">→</span>
            <input type="date" className="date-filter-input"
              value={createdTo} onChange={e => handleCreatedTo(e.target.value)} />
          </div>
          <div className="date-filter-divider" />
          <div className="date-filter-group">
            <span className="date-filter-group-label">Échéance entre</span>
            <input type="date" className="date-filter-input"
              value={deadlineFrom} onChange={e => handleDeadlineFrom(e.target.value)} />
            <span className="date-filter-sep">→</span>
            <input type="date" className="date-filter-input"
              value={deadlineTo} onChange={e => handleDeadlineTo(e.target.value)} />
          </div>
          {hasDateFilter && (
            <button className="date-filter-clear" onClick={clearDates}>
              <i className="ti ti-x" /> Effacer les dates
            </button>
          )}
        </div>

        {/* Row 3 : category chips */}
        <div className="filter-row-cats">
          <button
            className={`filter-chip${catFilter === null ? ' active' : ''}`}
            onClick={() => handleCatChange(null)}
          >Tous</button>
          {CATEGORIES.map((cat, i) => (
            <button key={i}
              className={`filter-chip${catFilter === i ? ' active' : ''}`}
              onClick={() => handleCatChange(i)}
            >{cat}</button>
          ))}
        </div>

      </div>

      {/* ── Campaign grid ── */}
      {loading ? (
        <Spinner label="Chargement des campagnes..." />
      ) : !filtered.length ? (
        <EmptyState icon="ti-terminal" title="Aucune campagne trouvée" subtitle={
          statusFilter !== 'all'  ? `Aucune campagne avec ce statut pour l'instant.`
          : catFilter !== null    ? 'Aucune campagne dans cette catégorie.'
          : hasDateFilter         ? 'Aucune campagne sur cet intervalle de dates.'
          : 'Soyez le premier à lancer une campagne !'
        } />
      ) : (
        <>
          <div className="campaigns-grid">
            {displayed.map(c => (
              <CampaignCard key={c.id} campaign={c} wallet={wallet} onAction={loadCampaigns} />
            ))}
          </div>

          {!isFiltered && totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={page === 1}
                onClick={() => setPage(p => p - 1)}>
                <i className="ti ti-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p}
                  className={`pagination-btn${p === page ? ' active' : ''}`}
                  onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button className="pagination-btn" disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}>
                <i className="ti ti-chevron-right" />
              </button>
              <span className="pagination-info">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} / {sorted.length} campagnes
              </span>
            </div>
          )}
        </>
      )}

      {wallet.connected && <LiveTxFeed campaigns={campaigns} />}
    </>
  );
}
