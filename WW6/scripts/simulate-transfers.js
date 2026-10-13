const path = require("path");

async function main() {
  const [owner, addr1, addr2] = await ethers.getSigners();
  const addressJson = require("../frontend/src/contracts/contract-address.json");
  const token = await ethers.getContractAt("Token", addressJson.Token);

  console.log("Owner balance:", (await token.balanceOf(owner.address)).toString());
  console.log("Addr1 balance:", (await token.balanceOf(addr1.address)).toString());

  // addr1 sends 25 tokens to addr2
  console.log("\nSending 25 tokens from addr1 to addr2...");
  const tx = await token.connect(addr1).transfer(addr2.address, 25);
  await tx.wait();

  console.log("Addr1 new balance:", (await token.balanceOf(addr1.address)).toString());
  console.log("Addr2 new balance:", (await token.balanceOf(addr2.address)).toString());

  // Query transfer events for addr1
  console.log("\nQuerying Transfer events for addr1 (" + addr1.address + "):");
  const filter = token.filters.Transfer();
  const events = await token.queryFilter(filter, 0, "latest");
  const addr1Events = events.filter(e => 
    (e.args[0] || e.args._from).toLowerCase() === addr1.address.toLowerCase() ||
    (e.args[1] || e.args._to).toLowerCase() === addr1.address.toLowerCase()
  );

  addr1Events.forEach((e, idx) => {
    const from = e.args[0] || e.args._from;
    const to = e.args[1] || e.args._to;
    const val = (e.args[2] || e.args._value).toString();
    const isSent = from.toLowerCase() === addr1.address.toLowerCase();
    console.log(`[Event ${idx + 1}] Type: ${isSent ? "SENT" : "RECEIVED"}, From: ${from}, To: ${to}, Amount: ${val} MHT, Block: ${e.blockNumber}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

