const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("hardhat");

async function main() {
  const { address } = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "contract.json"), "utf8"));
  const tokenId = BigInt(process.env.TOKEN_ID ?? 0);
  const signers = await ethers.getSigners();
  const to = process.env.TO ?? signers[2].address;

  const nft = await ethers.getContractAt("MonkeyNFT", address);
  const from = await nft.ownerOf(tokenId);
  const sender = signers.find((s) => s.address === from);
  if (!sender) throw new Error(`No local signer controls token ${tokenId} (owner ${from})`);

  await (await nft.connect(sender).transferFrom(from, to, tokenId)).wait();
  console.log(`Token ${tokenId}: ${from} -> ${await nft.ownerOf(tokenId)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

