// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
contract Crowdfunding is ReentrancyGuard {

    struct Campaign {
        address creator;
        address payable creator;
        uint256 goal;
        uint256 deadline;
        uint256 amountRaised;
        bool claimed;
        bool withdrawn;
        bool exists;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public campaignCount;

    event CampaignCreated(uint256 indexed id, address indexed creator, uint256 goal, uint256 deadline);
    event ContributionReceived(uint256 indexed id, address indexed contributor, uint256 amount);
    event FundsWithdrawn(uint256 indexed id, address indexed creator, uint256 amount);
    event RefundIssued(uint256 indexed id, address indexed contributor, uint256 amount);

    /// @notice Crée une nouvelle campagne
    /// @param goal Objectif en wei (ex: 1 ETH = 1e18)
    /// @param duration Durée en secondes (ex: 7 jours = 604800)
    function createCampaign(uint256 goal, uint256 duration) external {
        // TODO — à implémenter par l'équipe
    }

    /// @notice Contribuer à une campagne
    /// @param id Identifiant de la campagne
    function contribute(uint256 id) external payable {
        // TODO — à implémenter par l'équipe
    }

    /// @notice Retirer les fonds si objectif atteint (créateur seulement)
    /// @param id Identifiant de la campagne
    function withdraw(uint256 id) external nonReentrant {
        // CHECKS
        Campaign storage c = campaigns[id];
        require(c.exists, "Campagne inexistante");
        require(msg.sender == c.creator, "Seul le createur peut retirer");
        require(block.timestamp >= c.deadline, "Deadline non atteinte");
        require(c.amountRaised >= c.goal, "Objectif non atteint");
        require(!c.withdrawn, "Fonds deja retires");

        uint256 amount = c.amountRaised;

        // EFFECTS
        c.withdrawn = true;
        c.amountRaised = 0;

        // INTERACTIONS
        (bool success, ) = c.creator.call{value: amount}("");
        require(success, "Retrait echoue");

        emit FundsWithdrawn(id, c.creator, amount);
    }

    /// @notice Se faire rembourser si objectif non atteint
    /// @param id Identifiant de la campagne
    function refund(uint256 id) external nonReentrant {
        // CHECKS
        Campaign storage c = campaigns[id];
        require(c.exists, "Campagne inexistante");
        require(block.timestamp >= c.deadline, "Campagne en cours");
        require(c.amountRaised < c.goal, "Objectif atteint, pas de remboursement");
        uint256 amount = contributions[id][msg.sender];
        require(amount > 0, "Aucune contribution a rembourser");

        // EFFECTS — zero AVANT le transfert (pattern CEI)
        contributions[id][msg.sender] = 0;

        // INTERACTIONS
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Remboursement echoue");

        emit RefundIssued(id, msg.sender, amount);
    }

    /// @notice Retourne les données d'une campagne
    function getCampaign(uint256 id) external view returns (Campaign memory) {
        return campaigns[id];
    }

    /// @notice Retourne le montant contribué par une adresse
    function getContribution(uint256 id, address contributor) external view returns (uint256) {
        return contributions[id][contributor];
    }
}