const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  // ── Deployer info ─────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "ETH");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (balance === 0n) {
    throw new Error("Deployer has 0 ETH — get Sepolia faucet funds first");
  }

  // ── Deploy ────────────────────────────────────────────────
  console.log("\nDeploying Crowdfunding...");
  const Factory  = await ethers.getContractFactory("Crowdfunding");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✓ Deployed to:", address);

  // ── Auto-update contract.js ───────────────────────────────
  const contractFile = path.resolve(
    __dirname,
    "../front/src/services/contract.js"
  );

  if (fs.existsSync(contractFile)) {
    let content = fs.readFileSync(contractFile, "utf8");
    content = content.replace(
      /export const CONTRACT_ADDRESS = '0x[a-fA-F0-9]*'/,
      `export const CONTRACT_ADDRESS = '${address}'`
    );
    fs.writeFileSync(contractFile, content, "utf8");
    console.log("✓ contract.js updated →", address);
  } else {
    console.warn("⚠ contract.js not found — update CONTRACT_ADDRESS manually");
    console.warn("  Path checked:", contractFile);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Done. New address:", address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
