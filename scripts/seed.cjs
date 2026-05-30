const { ethers } = require("hardhat");

const CAMPAIGNS = [
  {
    title: "SolarGrid Africa",
    description: "Deploy solar microgrids in rural Madagascar to provide clean energy to 500 households without grid access.",
    imageIPFS: "",
    category: 3, // ENVIRONMENT
    goalEth: "0.05",
    durationDays: 30,
  },
  {
    title: "Open Source EHR",
    description: "Build a free, open-source electronic health record system for community clinics in developing countries.",
    imageIPFS: "",
    category: 0, // TECHNOLOGY
    goalEth: "0.08",
    durationDays: 45,
  },
  {
    title: "Malagasy Street Art Festival",
    description: "Fund 20 local artists to transform Antananarivo's walls with murals celebrating Malagasy culture.",
    imageIPFS: "",
    category: 1, // ART
    goalEth: "0.03",
    durationDays: 20,
  },
  {
    title: "Women Code Madagascar",
    description: "12-week coding bootcamp for 50 young women in Antananarivo — full scholarship, mentorship, and job placement.",
    imageIPFS: "",
    category: 4, // EDUCATION
    goalEth: "0.06",
    durationDays: 60,
  },
  {
    title: "Ocean Plastic Drones",
    description: "Autonomous surface drones to collect plastic waste from the Mozambique Channel coastline.",
    imageIPFS: "",
    category: 3, // ENVIRONMENT
    goalEth: "0.1",
    durationDays: 50,
  },
  {
    title: "Indie Game: Vazimba",
    description: "2D action-RPG inspired by Malagasy mythology. Defeat the Kalanoro and restore the ancient kingdoms.",
    imageIPFS: "",
    category: 7, // GAMING
    goalEth: "0.04",
    durationDays: 40,
  },
  {
    title: "Community Food Hub",
    description: "Convert an abandoned warehouse into a food cooperative serving 200 families with local organic produce.",
    imageIPFS: "",
    category: 2, // SOCIAL
    goalEth: "0.07",
    durationDays: 35,
  },
  {
    title: "Blockchain Supply Chain",
    description: "Trace vanilla supply chains from Malagasy farmers to buyers using on-chain provenance certificates.",
    imageIPFS: "",
    category: 0, // TECHNOLOGY
    goalEth: "0.09",
    durationDays: 55,
  },
  {
    title: "Afro Jazz Album",
    description: "Record and release a 12-track fusion album blending traditional Malagasy rhythms with modern jazz.",
    imageIPFS: "",
    category: 5, // MUSIC
    goalEth: "0.025",
    durationDays: 25,
  },
  {
    title: "Rural School Library",
    description: "Build and stock libraries in 5 rural primary schools with books, tablets, and offline learning content.",
    imageIPFS: "",
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
  const match = src.match(/CONTRACT_ADDRESS\s*=\s*'(0x[a-fA-F0-9]+)'/);
  if (!match) throw new Error("CONTRACT_ADDRESS not found in contract.js");
  const address = match[1];

  const abiMatch = src.match(/export const ABI\s*=\s*(\[[\s\S]*?\]);/);
  if (!abiMatch) throw new Error("ABI not found in contract.js");
  const ABI = JSON.parse(abiMatch[1]);

  const contract = new ethers.Contract(address, ABI, deployer);

  const count = Number(await contract.campaignCount());
  if (count > 0) {
    console.log(`Contract already has ${count} campaign(s). Skipping seed.`);
    return;
  }

  console.log(`Seeding 10 campaigns on ${address}...`);

  for (const c of CAMPAIGNS) {
    const goalWei   = ethers.parseEther(c.goalEth);
    const duration  = BigInt(c.durationDays * 86400);
    const tx = await contract.createCampaign(
      c.title,
      c.description,
      c.imageIPFS,
      c.category,
      goalWei,
      duration,
    );
    await tx.wait();
    console.log(`✓ "${c.title}"`);
  }

  console.log("Done — 10 campaigns created.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
