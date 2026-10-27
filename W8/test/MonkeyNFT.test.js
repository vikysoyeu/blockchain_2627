const { expect } = require("chai");
const { ethers } = require("hardhat");

const URI = "ipfs://bafytest/metadata.json";

describe("MonkeyNFT & NFTMarketplace", () => {
  let nft, market, owner, alice, bob;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    nft = await ethers.deployContract("MonkeyNFT", [owner.address]);
    market = await ethers.deployContract("NFTMarketplace", [await nft.getAddress()]);
  });

  it("mints with tokenURI and emits Minted", async () => {
    await expect(nft.mint(alice.address, URI)).to.emit(nft, "Minted").withArgs(alice.address, 0, URI);
    expect(await nft.ownerOf(0)).to.equal(alice.address);
    expect(await nft.tokenURI(0)).to.equal(URI);
  });

  it("only the owner can mint", async () => {
    await expect(nft.connect(alice).mint(alice.address, URI)).to.be.revertedWithCustomError(
      nft,
      "OwnableUnauthorizedAccount"
    );
  });

  it("transfers a token and updates enumeration", async () => {
    await nft.mint(alice.address, URI);
    await nft.connect(alice).transferFrom(alice.address, bob.address, 0);
    expect(await nft.ownerOf(0)).to.equal(bob.address);
    expect(await nft.balanceOf(alice.address)).to.equal(0);
    expect(await nft.tokenOfOwnerByIndex(bob.address, 0)).to.equal(0);
  });

  it("lists and buys an NFT for ETH", async () => {
    const price = ethers.parseEther("2.5");
    await nft.mint(alice.address, URI);
    await nft.connect(alice).approve(await market.getAddress(), 0);

    await expect(market.connect(alice).list(0, price))
      .to.emit(market, "Listed")
      .withArgs(0, alice.address, price);

    await expect(market.connect(bob).buy(0, { value: price }))
      .to.changeEtherBalances([alice, bob], [price, -price]);

    expect(await nft.ownerOf(0)).to.equal(bob.address);
    expect((await market.listings(0)).price).to.equal(0);
  });

  it("allows seller to cancel listing", async () => {
    const price = ethers.parseEther("1");
    await nft.mint(alice.address, URI);
    await nft.connect(alice).approve(await market.getAddress(), 0);
    await market.connect(alice).list(0, price);

    await expect(market.connect(alice).cancel(0))
      .to.emit(market, "Cancelled")
      .withArgs(0, alice.address);
    expect((await market.listings(0)).price).to.equal(0);
  });
});
