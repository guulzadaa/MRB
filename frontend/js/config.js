
window.APP_CONFIG = {
  CHAIN_ID_DEC: 11155111,
  CHAIN_NAME: "Sepolia",
  OWNER_ADDRESS: "0xA0c7fbDD4d9636Cca54E7728a5aC16438133e20c",
  PLATFORM_ADDRESS: "0x7Ea1034040826706bD2Be08B48c42211EAafac0B",
  REWARD_TOKEN_ADDRESS: "0x1d434AE87359eF0b52A428381A89c60Fc6Ef6d88",
};

window.ABIS = {
  PLATFORM: [
    "function nextCampaignId() view returns (uint256)",
    "function createRecipeCampaign(string title,uint256 goalWei,uint256 durationSeconds)",
    "function contribute(uint256 id) payable",
    "function finalize(uint256 id)",
    "function ownerWithdraw(uint256 id)",
    "function refund(uint256 id)",
    "function getCampaign(uint256 id) view returns (tuple(uint256 id,string title,uint256 goalWei,uint256 deadline,uint256 totalRaised,bool finalized,bool successful,bool withdrawn,bool exists))",
    "function contributions(uint256 id,address user) view returns (uint256)",
    "function getUserCampaigns(address user) view returns (uint256[])",
  ],
  ERC20: [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ],
};
