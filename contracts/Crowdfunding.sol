// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Crowdfunding on-chain
/// @notice Permet de créer des campagnes de financement participatif sur Ethereum.
///         Si l'objectif est atteint avant la deadline → le créateur retire les fonds.
///         Sinon → les contributeurs se font rembourser automatiquement.

contract Crowdfunding is ReentrancyGuard {
    struct Campaign {
        address payable creator; // Créateur de la campagne
        string title; // Titre (affiché dans le front)
        string description; // Description courte
        uint256 goal; // Objectif en wei (1 ETH = 1e18)
        uint256 deadline; // Timestamp Unix de fin
        uint256 amountRaised; // Montant collecté en wei
        bool withdrawn; // Fonds déjà retirés par le créateur
        bool exists; // Guard contre les IDs inexistants
    }

    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;

    mapping(uint256 => mapping(address => uint256)) public contributions;

    mapping(uint256 => address[]) private _contributors;

    mapping(uint256 => mapping(address => bool)) private _hasContributed;

    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );

    event ContributionReceived(
        uint256 indexed id,
        address indexed contributor,
        uint256 amount,
        uint256 totalRaised
    );

    event FundsWithdrawn(
        uint256 indexed id,
        address indexed creator,
        uint256 amount
    );

    event RefundIssued(
        uint256 indexed id,
        address indexed contributor,
        uint256 amount
    );

    event CampaignCancelled(uint256 indexed id, address indexed creator);

    modifier campaignExists(uint256 id) {
        require(campaigns[id].exists, "Campagne inexistante");
        _;
    }

    modifier onlyCreator(uint256 id) {
        require(
            msg.sender == campaigns[id].creator,
            "Seul le createur peut faire cette action"
        );
        _;
    }

    /// @notice Crée une nouvelle campagne de crowdfunding
    /// @param title Titre de la campagne (affiché dans l'interface)
    /// @param description Description courte du projet
    /// @param goal Objectif en wei (ex: 1 ETH = 1000000000000000000)
    /// @param duration Durée en secondes (ex: 7 jours = 604800)
    /// @return id L'identifiant de la campagne créée
    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goal,
        uint256 duration
    ) external returns (uint256 id) {
        require(bytes(title).length > 0, "Le titre ne peut pas etre vide");
        require(goal > 0, "L'objectif doit etre superieur a zero");
        require(duration >= 3600, "La duree minimale est 1 heure");
        require(duration <= 90 days, "La duree maximale est 90 jours");

        id = campaignCount++;

        campaigns[id] = Campaign({
            creator: payable(msg.sender),
            title: title,
            description: description,
            goal: goal,
            deadline: block.timestamp + duration,
            amountRaised: 0,
            withdrawn: false,
            exists: true
        });

        emit CampaignCreated(
            id,
            msg.sender,
            title,
            goal,
            block.timestamp + duration
        );
    }

    /// @notice Contribuer à une campagne en envoyant des ETH
    /// @param id Identifiant de la campagne
    function contribute(
        uint256 id
    ) external payable campaignExists(id) nonReentrant {
        Campaign storage c = campaigns[id];
        require(block.timestamp < c.deadline, "La campagne est terminee");
        require(msg.value > 0, "La contribution doit etre superieure a zero");
        require(!c.withdrawn, "Les fonds ont deja ete retires");
        require(c.amountRaised < c.goal, "L'objectif est deja atteint");

        c.amountRaised += msg.value;
        contributions[id][msg.sender] += msg.value;

        if (!_hasContributed[id][msg.sender]) {
            _hasContributed[id][msg.sender] = true;
            _contributors[id].push(msg.sender);
        }

        emit ContributionReceived(id, msg.sender, msg.value, c.amountRaised);
    }

    /// @notice Retirer les fonds si l'objectif est atteint (créateur uniquement)
    /// @param id Identifiant de la campagne
    function withdraw(
        uint256 id
    ) external nonReentrant campaignExists(id) onlyCreator(id) {
        Campaign storage c = campaigns[id];

        // CHECKS
        require(
            block.timestamp >= c.deadline,
            "La deadline n'est pas encore atteinte"
        );
        require(c.amountRaised >= c.goal, "L'objectif n'est pas atteint");
        require(!c.withdrawn, "Les fonds ont deja ete retires");

        uint256 amount = c.amountRaised;

        // EFFECTS
        c.withdrawn = true;
        c.amountRaised = 0;

        // INTERACTIONS
        (bool success, ) = c.creator.call{value: amount}("");
        require(success, "Le retrait a echoue");

        emit FundsWithdrawn(id, c.creator, amount);
    }

    /// @notice Se faire rembourser si l'objectif n'est pas atteint après la deadline
    /// @param id Identifiant de la campagne
    function refund(uint256 id) external nonReentrant campaignExists(id) {
        Campaign storage c = campaigns[id];

        // CHECKS
        require(
            block.timestamp >= c.deadline,
            "La campagne est encore en cours"
        );
        require(
            c.amountRaised < c.goal,
            "L'objectif a ete atteint, pas de remboursement"
        );

        uint256 amount = contributions[id][msg.sender];
        require(amount > 0, "Aucune contribution a rembourser");

        // EFFECTS — zéro AVANT le transfert (pattern CEI anti-reentrancy)
        contributions[id][msg.sender] = 0;

        // INTERACTIONS
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Le remboursement a echoue");

        emit RefundIssued(id, msg.sender, amount);
    }

    /// @notice Annuler une campagne avant qu'elle commence à recevoir des fonds
    /// @param id Identifiant de la campagne
    function cancelCampaign(
        uint256 id
    ) external campaignExists(id) onlyCreator(id) {
        Campaign storage c = campaigns[id];
        require(
            block.timestamp < c.deadline,
            "Campagne terminee, annulation impossible"
        );
        require(
            c.amountRaised == 0,
            "Des contributions existent, annulation impossible"
        );

        c.exists = false;

        emit CampaignCancelled(id, msg.sender);
    }

    /// @notice Retourne toutes les données d'une campagne
    function getCampaign(
        uint256 id
    ) external view campaignExists(id) returns (Campaign memory) {
        return campaigns[id];
    }

    /// @notice Retourne le montant contribué par une adresse sur une campagne
    function getContribution(
        uint256 id,
        address contributor
    ) external view returns (uint256) {
        return contributions[id][contributor];
    }

    /// @notice Retourne le pourcentage de progression d'une campagne (0-100)
    function getProgress(
        uint256 id
    ) external view campaignExists(id) returns (uint256) {
        Campaign storage c = campaigns[id];
        if (c.goal == 0) return 0;
        uint256 progress = (c.amountRaised * 100) / c.goal;
        return progress > 100 ? 100 : progress;
    }

    /// @notice Retourne le nombre de contributeurs uniques d'une campagne
    function getContributorCount(
        uint256 id
    ) external view campaignExists(id) returns (uint256) {
        return _contributors[id].length;
    }

    /// @notice Retourne le statut lisible d'une campagne
    /// @return status "active" | "success" | "failed" | "cancelled"
    function getStatus(
        uint256 id
    ) external view campaignExists(id) returns (string memory status) {
        Campaign storage c = campaigns[id];

        if (!c.exists) return "cancelled";
        if (block.timestamp < c.deadline) return "active";
        if (c.amountRaised >= c.goal) return "success";
        return "failed";
    }

    /// @notice Retourne le temps restant en secondes (0 si terminée)
    function getTimeLeft(
        uint256 id
    ) external view campaignExists(id) returns (uint256) {
        Campaign storage c = campaigns[id];
        if (block.timestamp >= c.deadline) return 0;
        return c.deadline - block.timestamp;
    }

    /// @notice Retourne toutes les campagnes actives (IDs)
    function getActiveCampaignIds() external view returns (uint256[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < campaignCount; i++) {
            if (
                campaigns[i].exists && block.timestamp < campaigns[i].deadline
            ) {
                count++;
            }
        }

        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < campaignCount; i++) {
            if (
                campaigns[i].exists && block.timestamp < campaigns[i].deadline
            ) {
                ids[index++] = i;
            }
        }

        return ids;
    }

    /// @notice Retourne tous les IDs de campagnes (actives + terminées)
    function getAllCampaignIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](campaignCount);
        for (uint256 i = 0; i < campaignCount; i++) {
            ids[i] = i;
        }
        return ids;
    }
}
