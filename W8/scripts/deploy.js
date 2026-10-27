const fs = require("node:fs");
const path = require("node:path");
const { ethers, network, artifacts } = require("hardhat");

async function main() {
  const [, wallet1] = await ethers.getSigners();

  const nft = await ethers.deployContract("MonkeyNFT", [wallet1.address], wallet1);
  await nft.waitForDeployment();
  const address = await nft.getAddress();

  const market = await ethers.deployContract("NFTMarketplace", [address], wallet1);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const nftArtifact = await artifacts.readArtifact("MonkeyNFT");
  const marketArtifact = await artifacts.readArtifact("NFTMarketplace");

  fs.writeFileSync(
    path.join(dir, "contract.json"),
    JSON.stringify(
      {
        network: network.name,
        chainId: Number(network.config.chainId),
        address,
        abi: nftArtifact.abi,
        marketAddress,
        marketAbi: marketArtifact.abi,
      },
      null,
      2
    )
  );

  console.log(`MonkeyNFT:      ${address} (owner: ${wallet1.address})`);
  console.log(`NFTMarketplace: ${marketAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
