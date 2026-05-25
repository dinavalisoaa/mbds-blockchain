import { expect } from "chai";
import hre from "hardhat";
import helpers from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";

const { ethers } = hre;
const { time } = helpers;

// ─── Paramètres par défaut pour createCampaign v3 ──────────────────────────
const TITLE = "Test Campagne";
const DESC  = "Description de test pour la campagne";
const IMG   = "";
const CAT   = 0; // Tech

describe("Crowdfunding", function () {
  let cf, owner, contributor1, contributor2;

  beforeEach(async function () {
    [owner, contributor1, contributor2] = await ethers.getSigners();
    const CF = await ethers.getContractFactory("Crowdfunding");
    cf = await CF.deploy();
  });

  // ─── createCampaign ────────────────────────────────────────────────────────

  describe("createCampaign", function () {
    it("crée une campagne avec les bons paramètres", async function () {
      const goal     = ethers.parseEther("1");
      const duration = 7 * 24 * 3600; // 7 jours

      await cf.createCampaign(TITLE, DESC, IMG, CAT, goal, duration);

      const campaign = await cf.getCampaign(0);
      expect(campaign.creator).to.equal(owner.address);
      expect(campaign.title).to.equal(TITLE);
      expect(campaign.goal).to.equal(goal);
      expect(campaign.amountRaised).to.equal(0);
      expect(campaign.withdrawn).to.equal(false);
      expect(campaign.exists).to.equal(true);
    });

    it("incrémente campaignCount", async function () {
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("1"), 3600);
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("2"), 3600);
      expect(await cf.campaignCount()).to.equal(2);
    });

    it("émet CampaignCreated", async function () {
      const goal = ethers.parseEther("1");
      await expect(cf.createCampaign(TITLE, DESC, IMG, CAT, goal, 3600))
        .to.emit(cf, "CampaignCreated")
        .withArgs(0, owner.address, TITLE, CAT, IMG, goal, anyValue, anyValue);
    });

    it("revert si title vide", async function () {
      await expect(
        cf.createCampaign("", DESC, IMG, CAT, ethers.parseEther("1"), 3600)
      ).to.be.revertedWith("Le titre ne peut pas etre vide");
    });

    it("revert si goal = 0", async function () {
      await expect(
        cf.createCampaign(TITLE, DESC, IMG, CAT, 0, 3600)
      ).to.be.revertedWith("L'objectif doit etre superieur a zero");
    });

    it("revert si duration < 1 heure", async function () {
      await expect(
        cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("1"), 0)
      ).to.be.revertedWith("La duree minimale est 1 heure");
    });
  });

  // ─── contribute ────────────────────────────────────────────────────────────

  describe("contribute", function () {
    beforeEach(async function () {
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("5"), 3600);
    });

    it("met à jour amountRaised et contributions", async function () {
      const amount = ethers.parseEther("1");
      await cf.connect(contributor1).contribute(0, { value: amount });

      const campaign = await cf.getCampaign(0);
      expect(campaign.amountRaised).to.equal(amount);
      expect(await cf.getContribution(0, contributor1.address)).to.equal(amount);
    });

    it("accumule plusieurs contributions", async function () {
      await cf.connect(contributor1).contribute(0, { value: ethers.parseEther("1") });
      await cf.connect(contributor2).contribute(0, { value: ethers.parseEther("2") });

      const campaign = await cf.getCampaign(0);
      expect(campaign.amountRaised).to.equal(ethers.parseEther("3"));
    });

    it("émet ContributionReceived", async function () {
      const amount = ethers.parseEther("1");
      await expect(cf.connect(contributor1).contribute(0, { value: amount }))
        .to.emit(cf, "ContributionReceived")
        .withArgs(0, contributor1.address, amount, amount); // totalRaised = amount
    });

    it("revert après deadline", async function () {
      await time.increase(3601);
      await expect(
        cf.connect(contributor1).contribute(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("La campagne est terminee");
    });

    it("revert si msg.value = 0", async function () {
      await expect(
        cf.connect(contributor1).contribute(0, { value: 0 })
      ).to.be.revertedWith("La contribution doit etre superieure a zero");
    });

    it("revert si campagne inexistante", async function () {
      await expect(
        cf.connect(contributor1).contribute(99, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Campagne inexistante");
    });
  });

  // ─── withdraw ──────────────────────────────────────────────────────────────
  // En v3, withdraw ne nécessite PAS la deadline — il suffit que l'objectif soit atteint.

  describe("withdraw", function () {
    beforeEach(async function () {
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("2"), 3600);
      // Objectif atteint → withdrawal possible immédiatement
      await cf.connect(contributor1).contribute(0, { value: ethers.parseEther("2") });
    });

    it("créateur reçoit les fonds", async function () {
      await expect(cf.connect(owner).withdraw(0)).to.changeEtherBalance(
        owner,
        ethers.parseEther("2")
      );
    });

    it("émet FundsWithdrawn", async function () {
      await expect(cf.connect(owner).withdraw(0))
        .to.emit(cf, "FundsWithdrawn")
        .withArgs(0, owner.address, ethers.parseEther("2"));
    });

    it("revert double-retrait", async function () {
      await cf.connect(owner).withdraw(0);
      await expect(cf.connect(owner).withdraw(0)).to.be.revertedWith(
        "Les fonds ont deja ete retires"
      );
    });

    it("revert si pas le créateur", async function () {
      await expect(cf.connect(contributor1).withdraw(0)).to.be.revertedWith(
        "Seul le createur peut faire cette action"
      );
    });

    it("revert si objectif non atteint", async function () {
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("10"), 3600); // id=1
      await cf.connect(contributor1).contribute(1, { value: ethers.parseEther("1") });
      await expect(cf.connect(owner).withdraw(1)).to.be.revertedWith(
        "L'objectif n'est pas encore atteint"
      );
    });
  });

  // ─── refund ────────────────────────────────────────────────────────────────

  describe("refund", function () {
    beforeEach(async function () {
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("10"), 3600); // objectif 10 ETH
      await cf.connect(contributor1).contribute(0, { value: ethers.parseEther("1") });
      await time.increase(3601); // deadline passée, objectif NON atteint
    });

    it("rembourse le contributeur", async function () {
      await expect(cf.connect(contributor1).refund(0)).to.changeEtherBalance(
        contributor1,
        ethers.parseEther("1")
      );
    });

    it("remet contribution à zéro", async function () {
      await cf.connect(contributor1).refund(0);
      expect(await cf.getContribution(0, contributor1.address)).to.equal(0);
    });

    it("émet RefundIssued", async function () {
      await expect(cf.connect(contributor1).refund(0))
        .to.emit(cf, "RefundIssued")
        .withArgs(0, contributor1.address, ethers.parseEther("1"));
    });

    it("revert double-remboursement", async function () {
      await cf.connect(contributor1).refund(0);
      await expect(cf.connect(contributor1).refund(0)).to.be.revertedWith(
        "Aucune contribution a rembourser"
      );
    });

    it("revert si objectif atteint", async function () {
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("1"), 3600); // id=1
      await cf.connect(contributor1).contribute(1, { value: ethers.parseEther("1") });
      await time.increase(3601);
      await expect(cf.connect(contributor1).refund(1)).to.be.revertedWith(
        "L'objectif a ete atteint, pas de remboursement possible"
      );
    });

    it("revert avant deadline", async function () {
      await cf.createCampaign(TITLE, DESC, IMG, CAT, ethers.parseEther("10"), 7200); // id=1
      await cf.connect(contributor1).contribute(1, { value: ethers.parseEther("1") });
      await expect(cf.connect(contributor1).refund(1)).to.be.revertedWith(
        "La campagne est encore en cours"
      );
    });

    it("revert si aucune contribution", async function () {
      await expect(cf.connect(contributor2).refund(0)).to.be.revertedWith(
        "Aucune contribution a rembourser"
      );
    });
  });
});
