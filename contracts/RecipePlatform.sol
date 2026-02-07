// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RewardToken.sol";

contract RecipePlatform {
    struct Campaign {
        uint256 id;
        string title;
        string imageURI;
        uint256 goalWei;
        uint256 deadline;
        uint256 totalRaised;
        bool finalized;
        bool successful;
        bool withdrawn;
        bool exists;
    }

    uint256 public nextCampaignId;
    address public owner;
    RewardToken public rewardToken;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
    constructor(address tokenAddress, address owner_) {
        rewardToken = RewardToken(tokenAddress);
        owner = owner_;
    }
    function createRecipeCampaign(
        string calldata title,
        string calldata imageURI,
        uint256 goalWei,
        uint256 durationSeconds
    ) external onlyOwner {
        uint256 id = nextCampaignId++;
        campaigns[id] = Campaign({
            id: id,
            title: title,
            imageURI: imageURI,
            goalWei: goalWei,
            deadline: block.timestamp + durationSeconds,
            totalRaised: 0,
            finalized: false,
            successful: false,
            withdrawn: false,
            exists: true
        });
    }

    function contribute(uint256 id) external payable {
        Campaign storage c = campaigns[id];
        require(c.exists, "not exists");
        require(block.timestamp < c.deadline, "ended");
        require(msg.value > 0, "zero value");

        c.totalRaised += msg.value;
        contributions[id][msg.sender] += msg.value;

        uint256 rewardAmount = (msg.value * 100);
        rewardToken.mint(msg.sender, rewardAmount);
    }

    function finalize(uint256 id) external onlyOwner {
        Campaign storage c = campaigns[id];
        require(block.timestamp >= c.deadline, "not ended");
        require(!c.finalized, "finalized");

        c.finalized = true;
        c.successful = c.totalRaised >= c.goalWei;
    }

    function ownerWithdraw(uint256 id) external onlyOwner {
        Campaign storage c = campaigns[id];
        require(c.finalized && c.successful, "not allowed");
        require(!c.withdrawn, "withdrawn");

        c.withdrawn = true;
        payable(owner).transfer(c.totalRaised);
    }

    function refund(uint256 id) external {
        Campaign storage c = campaigns[id];
        require(c.finalized && !c.successful, "not refundable");

        uint256 amt = contributions[id][msg.sender];
        require(amt > 0, "nothing to refund");

        contributions[id][msg.sender] = 0;
        payable(msg.sender).transfer(amt);
    }

    function getCampaign(uint256 id) external view returns (Campaign memory) {
        return campaigns[id];
    }
}
