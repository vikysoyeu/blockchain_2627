const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("hardhat");

async function main() {
  const { address, marketAddress } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "contract.json"), "utf8")
  );
  const tokenId = BigInt(process.env.TOKEN_ID ?? 0);
  const priceEth = process.env.PRICE ?? "5";
  const price = ethers.parseEther(priceEth);

  const signers = await ethers.getSigners();
  const nft = await ethers.getContractAt("MonkeyNFT", address);
  const ownerAddr = await nft.ownerOf(tokenId);
  const seller = signers.find((s) => s.address === ownerAddr);
  if (!seller) throw new Error(`No local signer owns token ${tokenId} (owner: ${ownerAddr})`);

  const market = await ethers.getContractAt("NFTMarketplace", marketAddress, seller);
  if (!(await nft.isApprovedForAll(seller.address, marketAddress))) {
    await (await nft.connect(seller).setApprovalForAll(marketAddress, true)).wait();
  }

  await (await market.list(tokenId, price)).wait();
  console.log(`Listed tokenId ${tokenId} by ${seller.address} for ${priceEth} ETH`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

