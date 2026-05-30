import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllCampaigns } from "../services/campaigns.js";
import { txRefundAll } from "../services/transactions.js";
import { useTx } from "../hooks/useTx.js";
import { TX_LABELS, CATEGORIES } from "../constants.js";
import CampaignCard from "../components/CampaignCard.jsx";
import { Alert, Spinner, EmptyState, Button } from "../components/ui/index.js";

// ── Live TX Feed ─────────────────────────────────────────
function LiveTxFeed({ campaigns }) {
  if (!campaigns.length) return null;

  const recent = [...campaigns]
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 6);

  const timeAgo = (ts) => {
    const diff = Math.floor(Date.now() / 1000) - Number(ts);
    if (diff < 60) return `${diff}S_AGO`;
    if (diff < 3600) return `${Math.floor(diff / 60)}M_AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H_AGO`;
    return `${Math.floor(diff / 86400)}D_AGO`;
  };

  return (
    <div className="tx-feed">
      <div className="tx-feed-header">
        <span className="tx-feed-title">FLUX TRANSACTIONS EN DIRECT</span>
        <span className="tx-feed-syncing">SYNCHRONISATION...</span>
      </div>
      {recent.map((c) => (
        <div key={c.id} className="tx-feed-row">
          <span className="tx-feed-addr">{c.creatorShort}</span>
          <span className="tx-feed-action">CAMPAGNE CRÉÉE: {c.title}</span>
          <span className="tx-feed-time">{timeAgo(c.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Home Page ────────────────────────────────────────────
export default function Home({ wallet, diagnostic }) {
  const navigate = useNavigate();
  const runTx = useTx();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catFilter, setCatFilter] = useState(null); // null = ALL, number = category index
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'success' | 'failed' | 'cancelled'
  const refundedIds = useRef(new Set());

  const loadCampaigns = useCallback(
    async (addr = wallet.address) => {
      setLoading(true);
      try {
        setCampaigns(await fetchAllCampaigns(addr || null));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [wallet.address]
  );

  useEffect(() => {
    loadCampaigns();
  }, [wallet.connected, wallet.address]);

  useEffect(() => {
    if (!wallet.connected || campaigns.length === 0) return;
    const addr = wallet.address?.toLowerCase();
    const toRefund = campaigns.filter(
      (c) =>
        c.status === "failed" &&
        !c.withdrawn &&
        c.creator.toLowerCase() === addr &&
        !refundedIds.current.has(c.id)
    );
    if (!toRefund.length) return;
    toRefund.forEach((c) => refundedIds.current.add(c.id));
    (async () => {
      for (const c of toRefund) {
        try {
          await runTx(() => txRefundAll(c.id), TX_LABELS.refundAll);
        } catch {
          /* toast already shown */
        }
      }
      loadCampaigns();
    })();
  }, [campaigns, wallet.connected, wallet.address]);

  const filtered = campaigns
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter((c) => catFilter === null || c.category === catFilter)
    .filter(
      (c) =>
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-status-badge">
            <span className="hero-status-dot" />
            RÉSEAU: SEPOLIA_TESTNET_STABLE
          </div>
          <h1 className="hero-heading">
            FINANCEMENT IMMUABLE POUR LA{" "}
            <span className="accent">PROCHAINE GÉNÉRATION</span> DE DAPPS.
          </h1>
          <p className="hero-subtext">
            DÉPLOYEZ DES CAMPAGNES DE FINANCEMENT TRANSPARENTES SUR ETHEREUM
            SEPOLIA. FONDS BLOQUÉS DANS DES CONTRATS INTELLIGENTS — LIBÉRÉS UNIQUEMENT EN CAS DE SUCCÈS.
          </p>
          <div className="hero-ctas">
            <Button
              variant="primary"
              icon="ti-rocket"
              onClick={() => navigate("/create")}
            >
              LANCER UNE CAMPAGNE
            </Button>
            <Button variant="outline" icon="ti-chart-bar">
              VOIR LES STATISTIQUES
            </Button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-image-placeholder">
            <i
              className="ti ti-cpu-2"
              style={{ fontSize: 56, opacity: 0.15 }}
            />
          </div>
        </div>
      </section>

      {/* ── Contract diagnostic (only when error) ── */}
      {diagnostic && !diagnostic.ok && (
        <Alert type="error">{diagnostic.msg}</Alert>
      )}

      {/* ── Search + filter bar ── */}
      <div className="search-bar">
        <span className="search-bar-label">RECHERCHER</span>

        {/* Row 1: input + sort + refresh */}
        <div className="search-row">
          <div className="search-input-wrap">
            <i className="ti ti-search search-input-icon" />
            <input
              type="text"
              placeholder="  Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="select-wrap search-sort-select">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">TOUS LES STATUTS</option>
              <option value="active">ACTIF</option>
              <option value="success">FINANCÉ</option>
              <option value="closed">FERMÉ</option>
              <option value="failed">ÉCHOUÉ</option>
              <option value="cancelled">ANNULÉ</option>
            </select>
            <i className="ti ti-chevron-down select-chevron" />
          </div>
          <Button
            variant="ghost"
            icon="ti-refresh"
            loading={loading}
            disabled={!wallet.connected}
            onClick={() => loadCampaigns()}
          >
            ACTUALISER
          </Button>
        </div>

        {/* Row 2: category chips */}
        <div className="filter-row">
          <button
            className={`filter-chip${catFilter === null ? " active" : ""}`}
            onClick={() => setCatFilter(null)}
          >
            TOUS
          </button>
          {CATEGORIES.map((cat, i) => (
            <button
              key={i}
              className={`filter-chip${catFilter === i ? " active" : ""}`}
              onClick={() => setCatFilter(i)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Campaign grid ── */}
      {loading ? (
        <Spinner label="CHARGEMENT..." />
      ) : !filtered.length ? (
        <EmptyState
          icon="ti-terminal"
          title="AUCUNE CAMPAGNE"
          subtitle={
            statusFilter !== "all"
              ? `AUCUNE CAMPAGNE ${statusFilter.toUpperCase()}.`
              : catFilter !== null
              ? "AUCUNE CAMPAGNE DANS CETTE CATÉGORIE."
              : "CRÉEZ LA PREMIÈRE."
          }
        />
      ) : (
        <div className="campaigns-grid">
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c} wallet={wallet} onAction={loadCampaigns} />
          ))}
        </div>
      )}

      {/* ── Live TX Feed ── */}
      {wallet.connected && <LiveTxFeed campaigns={campaigns} />}
    </>
  );
}
