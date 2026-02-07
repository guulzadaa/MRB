const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer/OWNER:", deployer.address);

  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const token = await RewardToken.deploy("Recipe Reward Token", "RRT", deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("RewardToken:", tokenAddress);

  const RecipePlatform = await hre.ethers.getContractFactory("RecipePlatform");
  const platform = await RecipePlatform.deploy(tokenAddress, deployer.address);
  await platform.waitForDeployment();
  const platformAddress = await platform.getAddress();
  console.log("RecipePlatform:", platformAddress);

  const tx = await token.setMinter(platformAddress);
  await tx.wait();
  console.log("Minter set");
  console.log("\n=== FRONTEND CONFIG ===");
  console.log("OWNER_ADDRESS =", deployer.address);
  console.log("PLATFORM_ADDRESS =", platformAddress);
  console.log("REWARD_TOKEN_ADDRESS =", tokenAddress);
  console.log("=======================\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
