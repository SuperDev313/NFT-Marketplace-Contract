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

  it("offerTokenForSale requires marketplace contract token approval", async function () {
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await expectRevert(
      this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(5), {
        from: accounts[0],
      }),
      "Marketplace not approved to spend token on seller behalf"
    );
  });

  it("offerTokenForSale requires token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try offerTokenForSale as wrong owner, should fail
    await expectRevert(
      this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(5), {
        from: accounts[1],
      }),
      "You must own the token."
    );
  });

  it("tokenNoLongerForSale requires active contract", async function () {
    // try tokenNoLongerForSale when contract not enabled, should fail
    await expectRevert(
      this.mp.tokenNoLongerForSale(this.sample721.address, 1, {
        from: accounts[0],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("tokenNoLongerForSale requires token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // offer token
    await this.sample721.approve(this.mp.address, 0, { from: accounts[0] });
    await this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(5), {
      from: accounts[0],
    });
    // try offerTokenForSale as wrong owner, should fail
    await expectRevert(
      this.mp.tokenNoLongerForSale(this.sample721.address, 0, {
        from: accounts[1],
      }),
      "You must own the token."
    );
  });

  it("tokenNoLongerForSale revokes offer for token", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample721.approve(this.mp.address, 0, { from: accounts[0] });
    await this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(5), {
      from: accounts[0],
    });

    await expectEvent(
      await this.mp.tokenNoLongerForSale(this.sample721.address, 0, {
        from: accounts[0],
      }),
      "TokenNoLongerForSale"
    );
    // offer should be revoked, zeroed out
    let tokenDetails = await this.mp.tokenOffers(this.sample721.address, 0);
    await expect(tokenDetails.isForSale).to.equal(false);
    await expect(tokenDetails.tokenIndex).to.be.bignumber.equal("0");
    await expect(tokenDetails.seller).to.equal(accounts[0]);
    await expect(tokenDetails.minValue).to.be.bignumber.equal(getPrice(0));
    await expect(tokenDetails.onlySellTo).to.equal(nullAddress);
  });

  it("enterBidForToken requires active contract", async function () {
    // try enterBidForToken when contract not enabled, should fail
    await expectRevert(
      this.mp.enterBidForToken(this.sample721.address, 0, {
        from: accounts[1],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("enterBidForToken should not require token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try enterBidForToken as token owner, should fail
    await expectRevert(
      this.mp.enterBidForToken(this.sample721.address, 0, {
        from: accounts[0],
      }),
      "Token owner cannot enter bid to self."
    );
  });

  it("enterBidForToken creates bid for token", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // should be no bid
    await expect(
      (
        await this.mp.tokenBids(this.sample721.address, 0)
      ).hasBid
    ).to.equal(false);
    // try revoking offer
    await expectEvent(
      await this.mp.enterBidForToken(this.sample721.address, 0, {
        from: accounts[1],
        value: getPrice(1),
      }),
      "TokenBidEntered"
    );
    // bid should be in
    let bidDetails = await this.mp.tokenBids(this.sample721.address, 0);
    await expect(bidDetails.hasBid).to.equal(true);
    await expect(bidDetails.tokenIndex).to.be.bignumber.equal("0");
    await expect(bidDetails.bidder).to.equal(accounts[1]);
    await expect(bidDetails.value).to.be.bignumber.equal(getPrice(1));
  });

  it("withdrawBidForToken requires active contract", async function () {
    // try enterBidForToken when contract not enabled, should fail
    await expectRevert(
      this.mp.withdrawBidForToken(this.sample721.address, 0, {
        from: accounts[1],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("withdrawBidForToken cannot allow token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // create bid
    await this.mp.enterBidForToken(this.sample721.address, 0, {
      from: accounts[1],
      value: getPrice(1),
    });
    // try withdrawBidForToken as token owner, should fail
    await expectRevert(
      this.mp.withdrawBidForToken(this.sample721.address, 0, {
        from: accounts[0],
      }),
      "Token owner cannot enter bid to self."
    );
  });

  it("withdrawBidForToken should require bid ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // create bid
    await this.mp.enterBidForToken(this.sample721.address, 0, {
      from: accounts[1],
      value: getPrice(1),
    });
    // try withdrawBidForToken as not bid owner, should fail
    await expectRevert(
      this.mp.withdrawBidForToken(this.sample721.address, 0, {
        from: accounts[2],
      }),
      "Only original bidder can withdraw this bid."
    );
  });

  it("withdrawBidForToken removes bid for token", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // create bid
    await this.mp.enterBidForToken(this.sample721.address, 0, {
      from: accounts[1],
      value: getPrice(1),
    });
    // try revoking offer
    await expectEvent(
      await this.mp.withdrawBidForToken(this.sample721.address, 0, {
        from: accounts[1],
      }),
      "TokenBidWithdrawn"
    );
    // bid should be removed
    let bidDetails = await this.mp.tokenBids(this.sample721.address, 0);
    await expect(bidDetails.hasBid).to.equal(false);
    await expect(bidDetails.tokenIndex).to.be.bignumber.equal("0");
    await expect(bidDetails.bidder).to.equal(nullAddress);
    await expect(bidDetails.value).to.be.bignumber.equal(getPrice(0));
  });

  it("acceptOfferForToken requires active contract", async function () {
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample721.address, 0, {
        from: accounts[1],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("acceptOfferForToken cannot allow token ownership", async function () {
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample721.approve(this.mp.address, 0, { from: accounts[0] });
    await this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(1), {
      from: accounts[0],
    });
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample721.address, 0, {
        from: accounts[0],
      }),
      "Token owner cannot enter bid to self."
    );
  });

  it("acceptOfferForToken requires marketplace contract token approval", async function () {
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample721.approve(this.mp.address, 0, { from: accounts[0] });
    await this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(1), {
      from: accounts[0],
    });
    await this.sample721.approve(nullAddress, 0, { from: accounts[0] });
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample721.address, 0, {
        from: accounts[1],
        value: getPrice(1),
      }),
      "Marketplace not approved to spend token on seller behalf"
    );
  });

  it("acceptOfferForToken requires an active sale/offer", async function () {
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample721.address, 0, {
        from: accounts[1],
      }),
      "Token must be for sale by owner."
    );
  });

  it("acceptOfferForToken requires enough Ether sent", async function () {
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample721.approve(this.mp.address, 0, { from: accounts[0] });
    await this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(1), {
      from: accounts[0],
    });
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample721.address, 0, {
        from: accounts[1],
        value: getPrice(0.9999),
      }),
      "Not enough Ether sent."
    );
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample721.address, 0, {
        from: accounts[1],
        value: getPrice(0.1),
      }),
      "Not enough Ether sent."
    );
  });

  it("acceptOfferForToken requires seller ownership of token", async function () {
    await this.mp.updateCollection(
      this.sample721.address,
      false,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample721.approve(this.mp.address, 0, { from: accounts[0] });
    await this.mp.offerTokenForSale(this.sample721.address, 0, getPrice(1), {
      from: accounts[0],
    });
    await this.sample721.safeTransferFrom(accounts[0], accounts[5], 0);
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample721.address, 0, {
        from: accounts[1],
        value: getPrice(1),
      }),
      "Seller is no longer the owner, cannot accept offer."
    );
  });
});
