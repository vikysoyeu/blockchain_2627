const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken & TokenVault", () => {
  let token, vault, owner, alice;
  const amt = ethers.parseUnits("100", 18);

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();
    token = await (await ethers.getContractFactory("MyToken")).deploy(1_000_000);
    vault = await (await ethers.getContractFactory("TokenVault")).deploy(await token.getAddress());
  });

  it("mints supply to deployer", async () => {
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000000", 18));
  });

  it("transfers between users", async () => {
    await token.transfer(alice.address, amt);
    expect(await token.balanceOf(alice.address)).to.equal(amt);
  });

  it("deposits and withdraws via vault", async () => {
    await token.approve(await vault.getAddress(), amt);
    await vault.deposit(amt);
    expect(await vault.balances(owner.address)).to.equal(amt);
    await vault.withdraw(amt);
    expect(await vault.balances(owner.address)).to.equal(0);
  });

  it("rejects over-withdraw", async () => {
    await expect(vault.withdraw(1)).to.be.revertedWith("Insufficient vault balance");
  });
});

