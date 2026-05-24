import { ethers } from 'ethers';
import { readProvider, readContract, CONTRACT_ADDRESS } from './contract.js';

export async function checkContract() {
  const code = await readProvider.getCode(CONTRACT_ADDRESS);
  if (code === '0x') return { exists: false, count: 0 };
  const count = await readContract.campaignCount();
  return { exists: true, count: Number(count) };
}

export async function fetchAllCampaigns(userAddr = null) {
  const count = Number(await readContract.campaignCount());
  if (count === 0) return [];

  return Promise.all(
    Array.from({ length: count }, async (_, id) => {
      const raw      = await readContract.campaigns(id);
      const campaign = normalize(id, raw);

      if (userAddr) {
        const contrib         = await readContract.getContribution(id, userAddr);
        campaign.myContrib    = contrib;
        campaign.myContribEth = fmtEth(contrib);
      }

      return campaign;
    })
  );
}

function normalize(id, raw) {
  const now         = BigInt(Math.floor(Date.now() / 1000));
  const expired     = now >= raw.deadline;
  const goalReached = raw.amountRaised >= raw.goal;

  const status = !raw.exists ? 'cancelled'
               : !expired    ? 'active'
               : goalReached ? 'success'
               :               'failed';

  const progress = raw.goal > 0n
    ? Math.min(100, Number((raw.amountRaised * 100n) / raw.goal))
    : 0;

  return {
    id,
    creator:         raw.creator,
    creatorShort:    shortAddr(raw.creator),
    title:           raw.title,
    description:     raw.description,
    imageIPFS:       raw.imageIPFS || '',
    category:        Number(raw.category),
    createdAt:       raw.createdAt,
    goal:            raw.goal,
    goalEth:         fmtEth(raw.goal),
    deadline:        raw.deadline,
    amountRaised:    raw.amountRaised,
    amountRaisedEth: fmtEth(raw.amountRaised),
    withdrawn:       raw.withdrawn,
    exists:          raw.exists,
    status,
    progress,
    timeLeft:        calcTimeLeft(raw.deadline),
    myContrib:       0n,
    myContribEth:    '0.0000',
  };
}

// ── utils (kept internal to avoid circular imports) ─────────
function fmtEth(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(4);
}

function shortAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function calcTimeLeft(deadline) {
  const diff = Number(deadline) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'Terminée';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
