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

  const status = !raw.exists              ? 'cancelled'
               : goalReached && raw.withdrawn ? 'closed'
               : goalReached               ? 'success'
               : expired                   ? 'failed'
               :                             'active';

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

export async function fetchCampaignById(id, userAddr = null) {
  const numId = Number(id);
  const [raw, contributorCount] = await Promise.all([
    readContract.campaigns(numId),
    readContract.getContributorCount(numId).catch(() => 0n),
  ]);
  if (raw.creator === '0x0000000000000000000000000000000000000000') {
    throw new Error('Campagne introuvable');
  }
  const campaign = { ...normalize(numId, raw), contributorCount: Number(contributorCount) };
  if (userAddr) {
    const contrib        = await readContract.getContribution(numId, userAddr);
    campaign.myContrib    = contrib;
    campaign.myContribEth = fmtEth(contrib);
  }
  return campaign;
}

export async function fetchContributions(id) {
  const numId = Number(id);
  const [addrs, amounts] = await readContract.getContributions(numId);
  return addrs.map((addr, i) => ({
    address:    addr,
    shortAddr:  shortAddr(addr),
    amount:     amounts[i],
    amountEth:  fmtEth(amounts[i]),
  })).filter(c => c.amount > 0n);
}

export async function fetchCampaignEvents(id) {
  const bigId = BigInt(id);

  const [contributions, withdrawals, refunds, excesses, cancellations] = await Promise.all([
    readContract.queryFilter(readContract.filters.ContributionReceived(bigId)),
    readContract.queryFilter(readContract.filters.FundsWithdrawn(bigId)),
    readContract.queryFilter(readContract.filters.RefundIssued(bigId)),
    readContract.queryFilter(readContract.filters.ExcessRefunded(bigId)),
    readContract.queryFilter(readContract.filters.CampaignCancelled(bigId)),
  ]);

  const allEvents = [
    ...contributions.map(e => ({
      type: 'contribution', actor: e.args.contributor,
      amountEth: fmtEth(e.args.amount), blockNumber: e.blockNumber, txHash: e.transactionHash,
    })),
    ...withdrawals.map(e => ({
      type: 'withdrawal', actor: e.args.creator,
      amountEth: fmtEth(e.args.amount), blockNumber: e.blockNumber, txHash: e.transactionHash,
    })),
    ...refunds.map(e => ({
      type: 'refund', actor: e.args.contributor,
      amountEth: fmtEth(e.args.amount), blockNumber: e.blockNumber, txHash: e.transactionHash,
    })),
    ...excesses.map(e => ({
      type: 'excess_refund', actor: e.args.contributor,
      amountEth: fmtEth(e.args.excess), blockNumber: e.blockNumber, txHash: e.transactionHash,
    })),
    ...cancellations.map(e => ({
      type: 'cancelled', actor: e.args.creator,
      amountEth: null, blockNumber: e.blockNumber, txHash: e.transactionHash,
    })),
  ];

  if (allEvents.length === 0) return [];

  // Batch-fetch timestamps for unique block numbers
  const uniqueBlocks = [...new Set(allEvents.map(e => e.blockNumber))];
  const blockMap = {};
  await Promise.all(
    uniqueBlocks.map(async bn => {
      const block = await readProvider.getBlock(bn);
      blockMap[bn] = block.timestamp;
    })
  );

  return allEvents
    .map(e => ({ ...e, timestamp: blockMap[e.blockNumber] }))
    .sort((a, b) => b.blockNumber - a.blockNumber);
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
