const fs = require("fs");
const path = require("path");
const { ethers, artifacts } = require("hardhat");

async function main() {
  const [deployer, ...users] = await ethers.getSigners();

  const token = await (await ethers.getContractFactory("MyToken")).deploy(1_000_000);
  await token.waitForDeployment();
  const vault = await (await ethers.getContractFactory("TokenVault")).deploy(await token.getAddress());
  await vault.waitForDeployment();

  const share = ethers.parseUnits("1000", 18);
  for (const u of users.slice(0, 2)) await (await token.transfer(u.address, share)).wait();

  const config = {
    token: { address: await token.getAddress(), abi: (await artifacts.readArtifact("MyToken")).abi },
    vault: { address: await vault.getAddress(), abi: (await artifacts.readArtifact("TokenVault")).abi },
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "frontend", "config.js"),
    `window.CONFIG = ${JSON.stringify(config, null, 2)};\n`
  );

  console.log("MyToken   :", config.token.address);
  console.log("TokenVault:", config.vault.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

