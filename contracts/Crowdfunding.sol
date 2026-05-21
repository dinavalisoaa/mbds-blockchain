// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {

    struct Campaign {
        address creator;
        uint256 goal;
        uint256 deadline;
        uint256 amountRaised;
        bool claimed;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(uint256 indexed id, address indexed creator, uint256 goal, uint256 deadline);
    event ContributionReceived(uint256 indexed id, address indexed contributor, uint256 amount);
    event FundsWithdrawn(uint256 indexed id, uint256 amount);
    event RefundIssued(uint256 indexed id, address indexed contributor, uint256 amount);
}

