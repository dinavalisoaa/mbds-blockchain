const { ethers } = require("hardhat");

const CAMPAIGNS = [
  {
    title: "SolarGrid Africa",
    description:
      "Deploy solar microgrids in rural Madagascar to provide clean energy to 500 households without grid access.",
    imageIPFS: "https://picsum.photos/id/110/800/450",
    category: 3, // ENVIRONMENT
    goalEth: "0.05",
    durationDays: 30,
  },
  {
    title: "Open Source EHR",
    description:
      "Build a free, open-source electronic health record system for community clinics in developing countries.",
    imageIPFS: "https://picsum.photos/id/160/800/450",
    category: 0, // TECHNOLOGY
    goalEth: "0.08",
    durationDays: 45,
  },
  {
    title: "Malagasy Street Art Festival",
    description:
      "Fund 20 local artists to transform Antananarivo's walls with murals celebrating Malagasy culture.",
    imageIPFS: "https://picsum.photos/id/325/800/450",
    category: 1, // ART
    goalEth: "0.03",
    durationDays: 20,
  },
  {
    title: "Women Code Madagascar",
    description:
      "12-week coding bootcamp for 50 young women in Antananarivo — full scholarship, mentorship, and job placement.",
    imageIPFS: "https://picsum.photos/id/1005/800/450",
    category: 4, // EDUCATION
    goalEth: "0.06",
    durationDays: 60,
  },
  {
    title: "Ocean Plastic Drones",
    description:
      "Autonomous surface drones to collect plastic waste from the Mozambique Channel coastline.",
    imageIPFS: "https://picsum.photos/id/1015/800/450",
    category: 3, // ENVIRONMENT
    goalEth: "0.1",
    durationDays: 50,
  },
  {
    title: "Indie Game: Vazimba",
    description:
      "2D action-RPG inspired by Malagasy mythology. Defeat the Kalanoro and restore the ancient kingdoms.",
    imageIPFS: "https://picsum.photos/id/96/800/450",
    category: 7, // GAMING
    goalEth: "0.04",
    durationDays: 40,
  },
  {
    title: "Community Food Hub",
    description:
      "Convert an abandoned warehouse into a food cooperative serving 200 families with local organic produce.",
    imageIPFS: "https://picsum.photos/id/292/800/450",
    category: 2, // SOCIAL
    goalEth: "0.07",
    durationDays: 35,
  },
  {
    title: "Blockchain Supply Chain",
    description:
      "Trace vanilla supply chains from Malagasy farmers to buyers using on-chain provenance certificates.",
    imageIPFS: "https://picsum.photos/id/430/800/450",
    category: 0, // TECHNOLOGY
    goalEth: "0.09",
    durationDays: 55,
  },
  {
    title: "Afro Jazz Album",
    description:
      "Record and release a 12-track fusion album blending traditional Malagasy rhythms with modern jazz.",
    imageIPFS: "https://picsum.photos/id/164/800/450",
    category: 5, // MUSIC
    goalEth: "0.025",
    durationDays: 25,
  },
  {
    title: "Rural School Library",
    description:
      "Build and stock libraries in 5 rural primary schools with books, tablets, and offline learning content.",
    imageIPFS: "https://picsum.photos/id/256/800/450",
    category: 4, // EDUCATION
    goalEth: "0.035",
    durationDays: 30,
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();

  const contractFile = require("../front/src/services/contract.js");
  // Read address from contract.js via regex since it's ESM
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(
    path.resolve(__dirname, "../front/src/services/contract.js"),
    "utf8"
  );
  const address = "0xbD419983facC52271419189eF287042e15EDCB69";

  const ABI = [
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
  const contract = new ethers.Contract(address, ABI, deployer);

  const count = Number(await contract.campaignCount());
  if (count > 0) {
    console.log(`Contract already has ${count} campaign(s). Skipping seed.`);
    return;
  }

  console.log(`Seeding 10 campaigns on ${address}...`);

  for (const c of CAMPAIGNS) {
    const goalWei = ethers.parseEther(c.goalEth);
    const duration = BigInt(c.durationDays * 86400);
    const tx = await contract.createCampaign(
      c.title,
      c.description,
      c.imageIPFS,
      c.category,
      goalWei,
      duration
    );
    await tx.wait();
    console.log(`✓ "${c.title}"`);
  }

  console.log("Done — 10 campaigns created.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
