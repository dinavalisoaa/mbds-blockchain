// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title  Crowdfunding on-chain — v3
/// @author IT University Madagascar
/// @notice Campagnes de financement participatif sur Ethereum.
///         Si l'objectif est atteint → le créateur retire immédiatement.
///         Sinon après deadline → les contributeurs appellent refund().
///

contract Crowdfunding is ReentrancyGuard {

    struct Campaign {
        address payable creator;   // Créateur de la campagne
        string  title;             // Titre affiché dans le front
        string  description;       // Description courte du projet
        string  imageIPFS;         // CID IPFS de l'image, ex: "QmXyz..."
        uint8   category;          // Index de catégorie (0-5)
        uint256 goal;              // Objectif en wei (1 ETH = 1e18)
        uint256 createdAt;
        uint256 deadline;          // Timestamp Unix de fin
        uint256 amountRaised;      // Montant collecté en wei
        bool    withdrawn;         // Fonds déjà retirés par le créateur
        bool    exists;            // Guard contre les IDs inexistants
    }

    // ─────────────────────────────────────────────────────────────
    // ÉTAT
    // ─────────────────────────────────────────────────────────────
    uint256 public campaignCount;

    mapping(uint256 => Campaign)                    public  campaigns;
    mapping(uint256 => mapping(address => uint256)) public  contributions;
    mapping(uint256 => address[])                   private _contributors;
    mapping(uint256 => mapping(address => bool))    private _hasContributed;

    // ─────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────
    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string  title,
        uint8   category,
        string  imageIPFS,
        uint256 goal,
        uint256 createdAt,
        uint256 deadline
    );

    event ContributionReceived(
        uint256 indexed id,
        address indexed contributor,
        uint256 amount,
        uint256 totalRaised
    );

    event ExcessRefunded(
        uint256 indexed id,
        address indexed contributor,
        uint256 excess
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

    /// @notice Émis quand un remboursement automatique échoue (destinataire non payable)
    event RefundFailed(uint256 indexed id, address indexed contributor, uint256 amount);

    /// @notice Émis quand le créateur publie une mise à jour
    event CampaignUpdate(
        uint256 indexed id,
        address indexed creator,
        string  message,
        uint256 timestamp
    );


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
    /// @param title       Titre de la campagne
    /// @param description Description courte du projet (max 1000 caractères)
    /// @param imageIPFS   CID IPFS de l'image (max 100 caractères). Passer "" si aucune image.
    /// @param category    0=Tech 1=Art 2=Social 3=Environnement 4=Education 5=Autre
    /// @param goal        Objectif en wei (ex: 1 ETH = 1000000000000000000)
    /// @param duration    Durée en secondes (min 1h, max 90 jours)
    /// @return id         Identifiant de la campagne créée
    function createCampaign(
        string  calldata title,
        string  calldata description,
        string  calldata imageIPFS,
        uint8            category,
        uint256          goal,
        uint256          duration
    ) external returns (uint256 id) {
        require(bytes(title).length > 0,           "Le titre ne peut pas etre vide");
        require(bytes(title).length <= 100,         "Titre trop long (100 caracteres max)");
        require(bytes(description).length <= 1000,  "Description trop longue (1000 caracteres max)");
        require(bytes(imageIPFS).length <= 100,     "CID IPFS invalide (100 caracteres max)");
        require(goal > 0,                           "L'objectif doit etre superieur a zero");
        require(duration >= 3600,                   "La duree minimale est 1 heure");
        require(duration <= 90 days,                "La duree maximale est 90 jours");

        id = campaignCount++;

        campaigns[id] = Campaign({
            creator:      payable(msg.sender),
            title:        title,
            description:  description,
            imageIPFS:    imageIPFS,
            category:     category,
            goal:         goal,
            createdAt:    block.timestamp,
            deadline:     block.timestamp + duration,
            amountRaised: 0,
            withdrawn:    false,
            exists:       true
        });

        emit CampaignCreated(
            id,
            msg.sender,
            title,
            category,
            imageIPFS,
            goal,
            block.timestamp,
            block.timestamp + duration
        );
    }

    /// @notice Contribuer à une campagne en envoyant des ETH
    ///         est remboursé immédiatement au contributeur.
    /// @param id Identifiant de la campagne
    function contribute(
        uint256 id
    ) external payable campaignExists(id) nonReentrant {
        Campaign storage c = campaigns[id];

        require(block.timestamp < c.deadline, "La campagne est terminee");
        require(msg.value > 0,                "La contribution doit etre superieure a zero");
        require(!c.withdrawn,                 "Les fonds ont deja ete retires");
        require(c.amountRaised < c.goal,      "L'objectif est deja atteint");

        uint256 remaining = c.goal - c.amountRaised;
        uint256 accepted  = msg.value > remaining ? remaining : msg.value;
        uint256 excess    = msg.value - accepted;

        // EFFECTS
        c.amountRaised += accepted;
        contributions[id][msg.sender] += accepted;

        if (!_hasContributed[id][msg.sender]) {
            _hasContributed[id][msg.sender] = true;
            _contributors[id].push(msg.sender);
        }

        emit ContributionReceived(id, msg.sender, accepted, c.amountRaised);

        // INTERACTIONS — rembourser l'excédent immédiatement
        if (excess > 0) {
            emit ExcessRefunded(id, msg.sender, excess);
            (bool ok, ) = msg.sender.call{value: excess}("");
            require(ok, "Remboursement de l'excedent echoue");
        }
    }

    /// @notice Retirer les fonds dès que l'objectif est atteint (créateur uniquement)
    /// @param id Identifiant de la campagne
    function withdraw(
        uint256 id
    ) external nonReentrant campaignExists(id) onlyCreator(id) {
        Campaign storage c = campaigns[id];

        require(c.amountRaised >= c.goal, "L'objectif n'est pas encore atteint");
        require(!c.withdrawn,             "Les fonds ont deja ete retires");

        uint256 amount = c.amountRaised;

        // EFFECTS
        c.withdrawn    = true;
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
        require(block.timestamp >= c.deadline, "La campagne est encore en cours");
        require(
            c.amountRaised < c.goal,
            "L'objectif a ete atteint, pas de remboursement possible"
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

    /// @notice Rembourse tous les contributeurs d'un coup (créateur uniquement)
    /// @dev    Acceptable pour un cas d'école (<50 contributeurs).
    ///         Ne PAS utiliser en production — préférer le pattern Pull (refund individuel).
    ///         Si un transfert échoue, le contributeur peut toujours appeler refund().
    /// @param id Identifiant de la campagne
    function refundAll(uint256 id)
        external
        nonReentrant
        campaignExists(id)
        onlyCreator(id)
    {
        Campaign storage c = campaigns[id];

        // CHECKS
        require(block.timestamp >= c.deadline,   "Campagne encore en cours");
        require(c.amountRaised < c.goal,         "Objectif atteint, pas de remboursement");
        require(!c.withdrawn,                    "Deja traite");

        // EFFECTS — flag avant toute interaction
        c.withdrawn = true;

        address[] memory contribs = _contributors[id];

        for (uint256 i = 0; i < contribs.length; i++) {
            address addr   = contribs[i];
            uint256 amount = contributions[id][addr];

            if (amount == 0) continue;

            // EFFECTS par contributeur — zéro avant le transfert
            contributions[id][addr] = 0;

            // INTERACTIONS
            (bool ok, ) = addr.call{value: amount}("");
            if (!ok) {
                // Transfert échoué : remettre le solde → récupérable via refund()
                contributions[id][addr] = amount;
                c.withdrawn = false; // au moins un en attente
                emit RefundFailed(id, addr, amount);
            } else {
                emit RefundIssued(id, addr, amount);
            }
        }
    }

    /// @notice Annuler une campagne avant qu'elle reçoive des contributions
    /// @param id Identifiant de la campagne
    function cancelCampaign(
        uint256 id
    ) external campaignExists(id) onlyCreator(id) {
        Campaign storage c = campaigns[id];
        require(block.timestamp < c.deadline, "Campagne terminee, annulation impossible");
        require(c.amountRaised == 0,          "Des contributions existent, annulation impossible");

        c.exists = false;

        emit CampaignCancelled(id, msg.sender);
    }

    /// @notice Publier une mise à jour de campagne (créateur uniquement)
    /// @param id      Identifiant de la campagne
    /// @param message Texte de la mise à jour (500 caractères max)
    function postUpdate(
        uint256 id,
        string calldata message
    ) external campaignExists(id) onlyCreator(id) {
        require(bytes(message).length > 0,    "Le message ne peut pas etre vide");
        require(bytes(message).length <= 500, "Message trop long (500 caracteres max)");

        emit CampaignUpdate(id, msg.sender, message, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // FONCTIONS DE LECTURE (view — gratuites si appel direct)
    // ─────────────────────────────────────────────────────────────

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
    ) external view returns (string memory status) {
        Campaign storage c = campaigns[id];

        if (!c.exists)                        return "cancelled";
        if (block.timestamp < c.deadline)     return "active";
        if (c.amountRaised >= c.goal)         return "success";
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

    /// @notice Retourne la durée initiale en secondes (deadline - createdAt)
    function getDuration(
        uint256 id
    ) external view campaignExists(id) returns (uint256) {
        Campaign storage c = campaigns[id];
        return c.deadline - c.createdAt;
    }

    /// @notice Retourne les IDs de toutes les campagnes actives
    function getActiveCampaignIds() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].exists && block.timestamp < campaigns[i].deadline) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].exists && block.timestamp < campaigns[i].deadline) {
                ids[index++] = i;
            }
        }
        return ids;
    }

    /// @notice Retourne tous les IDs de campagnes (actives + terminées + annulées)
    function getAllCampaignIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](campaignCount);
        for (uint256 i = 0; i < campaignCount; i++) {
            ids[i] = i;
        }
        return ids;
    }

    /// @notice Retourne les IDs filtrés par catégorie
    /// @param  category Index de catégorie (0-5)
    function getCampaignsByCategory(
        uint8 category
    ) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].exists && campaigns[i].category == category) {
                count++;
            }
        }
        uint256[] memory ids = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].exists && campaigns[i].category == category) {
                ids[index++] = i;
            }
        }
        return ids;
    }
}
