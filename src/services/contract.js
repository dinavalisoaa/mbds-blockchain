import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0x0A620E8C2a9540Ca219A6d4A04279D327a571EE8';

export const ABI = [
  // ── State variables (public mappings / counters) ──────────
  'function campaignCount() view returns (uint256)',
  'function campaigns(uint256 id) view returns (address creator, string title, string description, uint256 goal, uint256 deadline, uint256 amountRaised, bool withdrawn, bool exists)',
  'function contributions(uint256 id, address contributor) view returns (uint256)',

  // ── Write functions ───────────────────────────────────────
  'function createCampaign(string title, string description, uint256 goal, uint256 duration) returns (uint256 id)',
  'function contribute(uint256 id) payable',
  'function withdraw(uint256 id)',
  'function refund(uint256 id)',
  'function cancelCampaign(uint256 id)',

  // ── View helpers ──────────────────────────────────────────
  'function getCampaign(uint256 id) view returns (tuple(address creator, string title, string description, uint256 goal, uint256 deadline, uint256 amountRaised, bool withdrawn, bool exists))',
  'function getContribution(uint256 id, address contributor) view returns (uint256)',
  'function getContributorCount(uint256 id) view returns (uint256)',
  'function getProgress(uint256 id) view returns (uint256)',
  'function getStatus(uint256 id) view returns (string status)',
  'function getTimeLeft(uint256 id) view returns (uint256)',
  'function getAllCampaignIds() view returns (uint256[])',
  'function getActiveCampaignIds() view returns (uint256[])',

  // ── Events ────────────────────────────────────────────────
  'event CampaignCreated(uint256 indexed id, address indexed creator, string title, uint256 goal, uint256 deadline)',
  'event ContributionReceived(uint256 indexed id, address indexed contributor, uint256 amount, uint256 totalRaised)',
  'event FundsWithdrawn(uint256 indexed id, address indexed creator, uint256 amount)',
  'event RefundIssued(uint256 indexed id, address indexed contributor, uint256 amount)',
  'event CampaignCancelled(uint256 indexed id, address indexed creator)',
];

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

export const readProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
export const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider);
