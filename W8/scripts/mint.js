const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("hardhat");

const load = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", file), "utf8"));

async function main() {
  const { address } = load("contract.json");
  const { tokenURI } = load("ipfs.json");
  const recipient = process.env.RECIPIENT;

  const [, wallet1] = await ethers.getSigners();
  const nft = await ethers.getContractAt("MonkeyNFT", address, wallet1);
  const to = recipient ?? wallet1.address;

  const tx = await nft.mint(to, tokenURI);
  const receipt = await tx.wait();
  const minted = receipt.logs.map((l) => nft.interface.parseLog(l)).find((e) => e?.name === "Minted");
  const { tokenId } = minted.args;

  console.log(`Minted tokenId ${tokenId} to ${to}`);
  console.log(`tokenURI: ${await nft.tokenURI(tokenId)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
