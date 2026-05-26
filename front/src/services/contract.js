import { ethers } from "ethers";

export const CONTRACT_ADDRESS = "0xcb78c479cE2759980A2A8dC7B3c178368Def9656"; // '0xc47D195D322ab32856C45a3F7C20DEc618077d25';

export const ABI = [
  // ── State variables ───────────────────────────────────────
  "function campaignCount() view returns (uint256)",
  "function campaigns(uint256 id) view returns (address creator, string title, string description, string imageIPFS, uint8 category, uint256 goal, uint256 createdAt, uint256 deadline, uint256 amountRaised, bool withdrawn, bool exists)",
  "function contributions(uint256 id, address contributor) view returns (uint256)",

  // ── Write functions ───────────────────────────────────────
  "function createCampaign(string title, string description, string imageIPFS, uint8 category, uint256 goal, uint256 duration) returns (uint256 id)",
  "function contribute(uint256 id) payable",
  "function withdraw(uint256 id)",
  "function refund(uint256 id)",
  "function cancelCampaign(uint256 id)",
  "function refundAll(uint256 id)",
  "function postUpdate(uint256 id, string message)",
  "function extendDeadline(uint256 id, uint256 extraSeconds)",
  "function updateCampaignMeta(uint256 id, string description, string imageIPFS)",

  // ── View helpers ──────────────────────────────────────────
  "function getCampaign(uint256 id) view returns (tuple(address creator, string title, string description, string imageIPFS, uint8 category, uint256 goal, uint256 createdAt, uint256 deadline, uint256 amountRaised, bool withdrawn, bool exists))",
  "function getContribution(uint256 id, address contributor) view returns (uint256)",
  "function getContributions(uint256 id) view returns (address[] addrs, uint256[] amounts)",
  "function getContributorCount(uint256 id) view returns (uint256)",
  "function getProgress(uint256 id) view returns (uint256)",
  "function getStatus(uint256 id) view returns (string status)",
  "function getTimeLeft(uint256 id) view returns (uint256)",
  "function getDuration(uint256 id) view returns (uint256)",
  "function hasContributed(uint256 id, address addr) view returns (bool)",
  "function getCampaignsByCreator(address creator) view returns (uint256[])",
  "function getGlobalStats() view returns (uint256 total, uint256 active, uint256 totalRaised)",
  "function getCampaignBatch(uint256[] ids) view returns (tuple(address creator, string title, string description, string imageIPFS, uint8 category, uint256 goal, uint256 createdAt, uint256 deadline, uint256 amountRaised, bool withdrawn, bool exists)[])",
  "function getTopContributors(uint256 id, uint256 n) view returns (address[] addrs, uint256[] amounts)",
  "function getAllCampaignIds() view returns (uint256[])",
  "function getActiveCampaignIds() view returns (uint256[])",
  "function getCampaignsByCategory(uint8 category) view returns (uint256[])",
  "function getActiveCampaignsByCategory(uint8 category) view returns (uint256[])",

  // ── Events ────────────────────────────────────────────────
  "event CampaignCreated(uint256 indexed id, address indexed creator, string title, uint8 category, string imageIPFS, uint256 goal, uint256 createdAt, uint256 deadline)",
  "event ContributionReceived(uint256 indexed id, address indexed contributor, uint256 amount, uint256 totalRaised)",
  "event FundsWithdrawn(uint256 indexed id, address indexed creator, uint256 amount)",
  "event RefundIssued(uint256 indexed id, address indexed contributor, uint256 amount)",
  "event ExcessRefunded(uint256 indexed id, address indexed contributor, uint256 excess)",
  "event CampaignCancelled(uint256 indexed id, address indexed creator)",
  "event RefundFailed(uint256 indexed id, address indexed contributor, uint256 amount)",
  "event CampaignUpdate(uint256 indexed id, address indexed creator, string message, uint256 timestamp)",
  "event DeadlineExtended(uint256 indexed id, address indexed creator, uint256 newDeadline)",
  "event CampaignMetaUpdated(uint256 indexed id, address indexed creator)",
];

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

export const readProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
export const readContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  ABI,
  readProvider
);
