const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("hardhat");

async function main() {
  const { address, marketAddress } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "contract.json"), "utf8")
  );
  const tokenId = BigInt(process.env.TOKEN_ID ?? 0);
  const [, , wallet2] = await ethers.getSigners();

  const nft = await ethers.getContractAt("MonkeyNFT", address);
  const market = await ethers.getContractAt("NFTMarketplace", marketAddress, wallet2);
  const { seller, price } = await market.listings(tokenId);
  if (price === 0n) throw new Error(`Token ${tokenId} is not listed`);

  await (await market.buy(tokenId, { value: price })).wait();
  console.log(
    `Bought tokenId ${tokenId} from ${seller} by ${wallet2.address} for ${ethers.formatEther(price)} ETH`
  );
  console.log(`New owner of token ${tokenId}: ${await nft.ownerOf(tokenId)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

