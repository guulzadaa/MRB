const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("OWNER:", owner.address);
  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const token = await RewardToken.deploy(
    "Recipe Reward Token",
    "RRT",
    owner.address
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("RewardToken:", tokenAddress);
  const RecipePlatform = await hre.ethers.getContractFactory("RecipePlatform");
  const platform = await RecipePlatform.deploy(
    tokenAddress,
    owner.address
  );
  await platform.waitForDeployment();
  const platformAddress = await platform.getAddress();
  console.log("RecipePlatform:", platformAddress);
  const tx = await token.setMinter(platformAddress);
  await tx.wait();
  console.log("Minter set");
  const cfgPath = path.join(__dirname, "..", "frontend", "js", "config.js");
  fs.writeFileSync(
    cfgPath,
`window.APP_CONFIG = {
  CHAIN_ID_DEC: 11155111,
  CHAIN_NAME: "Sepolia",
  OWNER_ADDRESS: "${owner.address}",
  PLATFORM_ADDRESS: "${platformAddress}",
  REWARD_TOKEN_ADDRESS: "${tokenAddress}"
};

window.ABIS = {
  PLATFORM: [
    "function nextCampaignId() view returns (uint256)",
    "function createRecipeCampaign(string title,string imageURI,uint256 goalWei,uint256 durationSeconds)",
    "function contribute(uint256 id) payable",
    "function finalize(uint256 id)",
    "function ownerWithdraw(uint256 id)",
    "function refund(uint256 id)",
    "function getCampaign(uint256 id) view returns (tuple(uint256 id,string title,string imageURI,uint256 goalWei,uint256 deadline,uint256 totalRaised,bool finalized,bool successful,bool withdrawn,bool exists))",
    "function contributions(uint256 id,address user) view returns (uint256)"
  ],
  ERC20: [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ]
};
`,
  "utf8"
);


  console.log("config.js saved");
  const seeds = [
    { title: "Pasta Carbonara", img: "/images/pasta.jpg", goal: "0.03", dur: 3600 },
    { title: "Chicken Teriyaki", img: "/images/teriyaki.jpg", goal: "0.05", dur: 5400 },
    { title: "Chocolate Brownies", img: "/images/brownies.jpg", goal: "0.02", dur: 2700 },
    { title: "Fresh Salad", img: "/images/salad.jpg", goal: "0.025", dur: 3000 }
  ];

  for (const r of seeds) {
    const tx = await platform.createRecipeCampaign(
      r.title,
      r.img,
      hre.ethers.parseEther(r.goal),
      r.dur
    );
    await tx.wait();
    console.log("Seeded:", r.title);
  }
  console.log("DEPLOY COMPLETE!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

