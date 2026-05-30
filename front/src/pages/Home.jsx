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
        <span className="tx-feed-title">LIVE_TRANSACTION_FEED_SEPOLIA</span>
        <span className="tx-feed-syncing">SYNCING...</span>
      </div>
      {recent.map((c) => (
        <div key={c.id} className="tx-feed-row">
          <span className="tx-feed-addr">{c.creatorShort}</span>
          <span className="tx-feed-action">CAMPAIGN_CREATED: {c.title}</span>
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
      if (!addr) return;
      setLoading(true);
      try {
        setCampaigns(await fetchAllCampaigns(addr));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [wallet.address]
  );

  useEffect(() => {
    if (wallet.connected) loadCampaigns();
    else setCampaigns([]);
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
            NETWORK_STATUS: SEPOLIA_TESTNET_STABLE
          </div>
          <h1 className="hero-heading">
            IMMUTABLE FUNDRAISING FOR THE{" "}
            <span className="accent">NEXT GENERATION</span> OF DAPPS.
          </h1>
          <p className="hero-subtext">
            DEPLOY TRANSPARENT, TRUSTLESS CROWDFUNDING CAMPAIGNS ON ETHEREUM
            SEPOLIA. FUNDS LOCKED IN SMART CONTRACTS — RELEASED ONLY ON SUCCESS.
          </p>
          <div className="hero-ctas">
            <Button
              variant="primary"
              icon="ti-rocket"
              onClick={() => navigate("/create")}
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
            <i
              className="ti ti-cpu-2"
              style={{ fontSize: 56, opacity: 0.15 }}
            />
          </div>
        </div>
      </section>

      {/* ── Search + filter bar ── */}
      <div className="search-bar">
        <span className="search-bar-label">SEARCH_REGISTRY</span>

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
              <option value="all">ALL_STATUS</option>
              <option value="active">ACTIVE</option>
              <option value="success">SUCCESS</option>
              <option value="failed">FAILED</option>
              <option value="cancelled">CANCELLED</option>
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
            REFRESH
          </Button>
        </div>

        {/* Row 2: category chips */}
        <div className="filter-row">
          <button
            className={`filter-chip${catFilter === null ? " active" : ""}`}
            onClick={() => setCatFilter(null)}
          >
            ALL
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
        <Spinner label="LOADING_CAMPAIGNS..." />
      ) : !wallet.connected ? (
        diagnostic ? (
          <Alert type={diagnostic.ok ? "success" : "error"}>
            {diagnostic.msg}
          </Alert>
        ) : (
          <EmptyState title="CONNECT_WALLET_TO_VIEW_CAMPAIGNS." />
        )
      ) : !filtered.length ? (
        <EmptyState
          icon="ti-terminal"
          title="NO_CAMPAIGNS_FOUND"
          subtitle={
            statusFilter !== "all"
              ? `NO_${statusFilter.toUpperCase()}_CAMPAIGNS.`
              : catFilter !== null
              ? "NO_CAMPAIGNS_IN_CATEGORY."
              : "CREATE_THE_FIRST_ONE."
          }
        />
      ) : (
        <div className="campaigns-grid">
          {filtered.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              wallet={wallet}
              onAction={loadCampaigns}
            />
          ))}
        </div>
      )}

      {/* ── Live TX Feed ── */}
      {wallet.connected && <LiveTxFeed campaigns={campaigns} />}
    </>
  );
}
