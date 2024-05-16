const Marketplace = artifacts.require("Marketplace");
const SampleProject721 = artifacts.require("SampleProject721");
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

contract("Marketplace ERC-721", function (accounts) {
  const nullAddress = "0x0000000000000000000000000000000000000000";

  function getPrice(amtEth) {
    return web3.utils.toWei(amtEth.toString());
  }

  beforeEach(async function () {
    // deploy a new instance of Marketplace contract
    this.mp = await Marketplace.new({ from: accounts[0] });
    this.sample721 = await SampleProject721.new({ from: accounts[0] });
    await this.sample721.mint(10, { from: accounts[0] });
  });

  it("updateCollection requires contract ownership", async function () {
    await expectRevert(
      this.mp.updateCollection(this.sample721.address, false, 1, "", {
        from: accounts[1],
      }),
      "You must own the contract."
    );
    await expectEvent(
      await this.mp.updateCollection(
        this.sample721.address,
        false,
        5,
        "ipfs://ok",
        { from: accounts[0] }
      ),
      "CollectionUpdated"
    );
  });

  // disableCollection

  it("disableCollection requires active contract", async function () {
    // try disableCollection when not enabled, should fail
    await expectRevert(
      this.mp.disableCollection(this.sample721.address, { from: accounts[0] }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("disableCollection requires contract ownership", async function () {
    // enable/update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      1,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try disableCollection as wrong owner, should fail
    await expectRevert(
      this.mp.disableCollection(this.sample721.address, { from: accounts[1] }),
      "You must own the contract."
    );
  });

  it("disableCollection zeroes and disables collections", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      1,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try disableCollection as contract owner, should succeed
    await expectEvent(
      await this.mp.disableCollection(this.sample721.address, {
        from: accounts[0],
      }),
      "CollectionDisabled"
    );
    // should be zeroed out
    let collectionDetails = await this.mp.collectionState(
      this.sample721.address
    );
    await expect(collectionDetails.status).to.equal(false);
    await expect(collectionDetails.royaltyPercent).to.be.bignumber.equal("0");
    await expect(collectionDetails.metadataURL).to.equal("");
  });
  it("offerTokenForSale requires active contract", async function () {
    // try offerTokenForSale when not enabled, should fail
    await expectRevert(
      this.mp.offerTokenForSale(this.sample721.address, 1, getPrice(5), {
        from: accounts[0],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });
});
