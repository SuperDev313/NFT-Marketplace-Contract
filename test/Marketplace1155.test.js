const Marketplace = artifacts.require("Marketplace");
const SampleProject1155 = artifacts.require("SampleProject1155");
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

contract("Marketplace ERC-1155", function (accounts) {
  const nullAddress = "0x0000000000000000000000000000000000000000";

  function getPrice(amtEth) {
    return web3.utils.toWei(amtEth.toString());
  }

  beforeEach(async function () {
    this.mp = await Marketplace.new({ from: accounts[0] });
    this.sample1155 = await SampleProject1155.new({ from: accounts[0] });
    await this.sample1155.mint(1, 1, { from: accounts[0] });
    await this.sample1155.mint(2, 1, { from: accounts[0] });
    await this.sample1155.mint(3, 1, { from: accounts[0] });
  });

  // updateCollection

  it("updateCollection requires contract ownership", async function () {
    await expectRevert(
      this.mp.updateCollection(this.sample1155.address, true, 1, "", {
        from: accounts[1],
      }),
      "You must own the contract."
    );
    await expectEvent(
      await this.mp.updateCollection(
        this.sample1155.address,
        true,
        5,
        "ipfs://ok",
        { from: accounts[0] }
      ),
      "CollectionUpdated"
    );
  });

  it("updateCollection updates each time", async function () {
    // add/update collection as owner
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      1,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // settings should match
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).status
    ).to.equal(true);
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).erc1155
    ).to.equal(true);
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).royaltyPercent
    ).to.be.bignumber.equal("1");
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).metadataURL
    ).to.equal("ipfs://mynewhash");
    // Disable collection (zero it out)
    await this.mp.disableCollection(this.sample1155.address, {
      from: accounts[0],
    });
    // update collection again
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://anothernewhash",
      { from: accounts[0] }
    );
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).status
    ).to.equal(true);
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).erc1155
    ).to.equal(true);
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).royaltyPercent
    ).to.be.bignumber.equal("5");
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).metadataURL
    ).to.equal("ipfs://anothernewhash");
    // update again
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      8,
      "ipfs://round3",
      { from: accounts[0] }
    );
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).status
    ).to.equal(true);
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).erc1155
    ).to.equal(true);
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).royaltyPercent
    ).to.be.bignumber.equal("8");
    await expect(
      (
        await this.mp.collectionState(this.sample1155.address)
      ).metadataURL
    ).to.equal("ipfs://round3");
  });

  it("withdraw sends only allocated funds to msg.sender", async function () {
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      10,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.mp.enterBidForToken(this.sample1155.address, 1, {
      from: accounts[1],
      value: getPrice(0.5),
    });
    await this.mp.enterBidForToken(this.sample1155.address, 1, {
      from: accounts[2],
      value: getPrice(0.525),
    });
    await this.mp.enterBidForToken(this.sample1155.address, 1, {
      from: accounts[3],
      value: getPrice(0.55),
    });
    // bids beaten should be returned to accounts 1 and 2
    await expect(
      await this.mp.pendingBalance(accounts[1])
    ).to.be.bignumber.equal(getPrice(0.5));
    await expect(
      await this.mp.pendingBalance(accounts[2])
    ).to.be.bignumber.equal(getPrice(0.525));
    // withdraw from those accounts
    await this.mp.withdraw({ from: accounts[1] });
    await this.mp.withdraw({ from: accounts[2] });
    // balances should be 0
    await expect(
      await this.mp.pendingBalance(accounts[1])
    ).to.be.bignumber.equal(getPrice(0));
    await expect(
      await this.mp.pendingBalance(accounts[2])
    ).to.be.bignumber.equal(getPrice(0));
  });

  // disableCollection

  it("disableCollection requires active contract", async function () {
    // try disableCollection when not enabled, should fail
    await expectRevert(
      this.mp.disableCollection(this.sample1155.address, { from: accounts[0] }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("disableCollection requires contract ownership", async function () {
    // enable/update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      1,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try disableCollection as wrong owner, should fail
    await expectRevert(
      this.mp.disableCollection(this.sample1155.address, { from: accounts[1] }),
      "You must own the contract."
    );
  });

  it("disableCollection zeroes and disables collections", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      1,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try disableCollection as contract owner, should succeed
    await expectEvent(
      await this.mp.disableCollection(this.sample1155.address, {
        from: accounts[0],
      }),
      "CollectionDisabled"
    );
    // should be zeroed out
    let collectionDetails = await this.mp.collectionState(
      this.sample1155.address
    );
    await expect(collectionDetails.status).to.equal(false);
    await expect(collectionDetails.erc1155).to.equal(false);
    await expect(collectionDetails.royaltyPercent).to.be.bignumber.equal("0");
    await expect(collectionDetails.metadataURL).to.equal("");
  });

  it("offerTokenForSale requires active contract", async function () {
    // try offerTokenForSale when not enabled, should fail
    await expectRevert(
      this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(5), {
        from: accounts[0],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });
  it("offerTokenForSale requires marketplace contract token approval", async function () {
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await expectRevert(
      this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(5), {
        from: accounts[0],
      }),
      "Marketplace not approved to spend token on seller behalf."
    );
  });

  it("offerTokenForSale requires token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try offerTokenForSale as wrong owner, should fail
    await expectRevert(
      this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(5), {
        from: accounts[1],
      }),
      "You must own the token."
    );
  });

  it("offerTokenForSale puts new offer for token", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample1155.setApprovalForAll(this.mp.address, true, {
      from: accounts[0],
    });
    // try offering token as owner, should succeed
    await expectEvent(
      await this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(5), {
        from: accounts[0],
      }),
      "TokenOffered"
    );
    // token should have valid offer with same numbers
    let tokenDetails = await this.mp.tokenOffers(this.sample1155.address, 1);
    await expect(tokenDetails.isForSale).to.equal(true);
    await expect(tokenDetails.tokenIndex).to.be.bignumber.equal("1");
    await expect(tokenDetails.seller).to.equal(accounts[0]);
    await expect(tokenDetails.minValue).to.be.bignumber.equal(getPrice(5));
    await expect(tokenDetails.onlySellTo).to.equal(nullAddress);
  });

  it("tokenNoLongerForSale requires active contract", async function () {
    // try tokenNoLongerForSale when contract not enabled, should fail
    await expectRevert(
      this.mp.tokenNoLongerForSale(this.sample1155.address, 1, {
        from: accounts[0],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("tokenNoLongerForSale requires token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // offer token
    await this.sample1155.setApprovalForAll(this.mp.address, true, {
      from: accounts[0],
    });
    await this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(5), {
      from: accounts[0],
    });
    // try offerTokenForSale as wrong owner, should fail
    await expectRevert(
      this.mp.tokenNoLongerForSale(this.sample1155.address, 1, {
        from: accounts[1],
      }),
      "You must own the token."
    );
  });

  it("tokenNoLongerForSale revokes offer for token", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // offer token
    await this.sample1155.setApprovalForAll(this.mp.address, true, {
      from: accounts[0],
    });
    await this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(5), {
      from: accounts[0],
    });
    // try revoking offer
    await expectEvent(
      await this.mp.tokenNoLongerForSale(this.sample1155.address, 1, {
        from: accounts[0],
      }),
      "TokenNoLongerForSale"
    );
    // offer should be revoked, zeroed out
    let tokenDetails = await this.mp.tokenOffers(this.sample1155.address, 1);
    await expect(tokenDetails.isForSale).to.equal(false);
    await expect(tokenDetails.tokenIndex).to.be.bignumber.equal("1");
    await expect(tokenDetails.seller).to.equal(accounts[0]);
    await expect(tokenDetails.minValue).to.be.bignumber.equal(getPrice(0));
    await expect(tokenDetails.onlySellTo).to.equal(nullAddress);
  });

  it("enterBidForToken requires active contract", async function () {
    // try enterBidForToken when contract not enabled, should fail
    await expectRevert(
      this.mp.enterBidForToken(this.sample1155.address, 1, {
        from: accounts[1],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("enterBidForToken should not require token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // try enterBidForToken as token owner, should fail
    await expectRevert(
      this.mp.enterBidForToken(this.sample1155.address, 1, {
        from: accounts[0],
      }),
      "Token owner cannot enter bid to self."
    );
  });

  it("enterBidForToken creates bid for token", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // should be no bid
    await expect(
      (
        await this.mp.tokenBids(this.sample1155.address, 1)
      ).hasBid
    ).to.equal(false);
    // try revoking offer
    await expectEvent(
      await this.mp.enterBidForToken(this.sample1155.address, 1, {
        from: accounts[1],
        value: getPrice(1),
      }),
      "TokenBidEntered"
    );
    // bid should be in
    let bidDetails = await this.mp.tokenBids(this.sample1155.address, 1);
    await expect(bidDetails.hasBid).to.equal(true);
    await expect(bidDetails.tokenIndex).to.be.bignumber.equal("1");
    await expect(bidDetails.bidder).to.equal(accounts[1]);
    await expect(bidDetails.value).to.be.bignumber.equal(getPrice(1));
  });

  it("withdrawBidForToken requires active contract", async function () {
    // try enterBidForToken when contract not enabled, should fail
    await expectRevert(
      this.mp.withdrawBidForToken(this.sample1155.address, 1, {
        from: accounts[1],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("withdrawBidForToken cannot allow token ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // create bid
    await this.mp.enterBidForToken(this.sample1155.address, 1, {
      from: accounts[1],
      value: getPrice(1),
    });
    // try withdrawBidForToken as token owner, should fail
    await expectRevert(
      this.mp.withdrawBidForToken(this.sample1155.address, 1, {
        from: accounts[0],
      }),
      "Token owner cannot enter bid to self."
    );
  });

  it("withdrawBidForToken should require bid ownership", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // create bid
    await this.mp.enterBidForToken(this.sample1155.address, 1, {
      from: accounts[1],
      value: getPrice(1),
    });
    // try withdrawBidForToken as not bid owner, should fail
    await expectRevert(
      this.mp.withdrawBidForToken(this.sample1155.address, 1, {
        from: accounts[2],
      }),
      "Only original bidder can withdraw this bid."
    );
  });

  it("withdrawBidForToken removes bid for token", async function () {
    // update collection
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    // create bid
    await this.mp.enterBidForToken(this.sample1155.address, 1, {
      from: accounts[1],
      value: getPrice(1),
    });
    // try revoking offer
    await expectEvent(
      await this.mp.withdrawBidForToken(this.sample1155.address, 1, {
        from: accounts[1],
      }),
      "TokenBidWithdrawn"
    );
    // bid should be removed
    let bidDetails = await this.mp.tokenBids(this.sample1155.address, 1);
    await expect(bidDetails.hasBid).to.equal(false);
    await expect(bidDetails.tokenIndex).to.be.bignumber.equal("1");
    await expect(bidDetails.bidder).to.equal(nullAddress);
    await expect(bidDetails.value).to.be.bignumber.equal(getPrice(0));
  });

  it("acceptOfferForToken requires active contract", async function () {
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample1155.address, 1, {
        from: accounts[1],
      }),
      "Collection must be enabled on this contract by project owner."
    );
  });

  it("acceptOfferForToken cannot allow token ownership", async function () {
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample1155.setApprovalForAll(this.mp.address, true, {
      from: accounts[0],
    });
    await this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(1), {
      from: accounts[0],
    });
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample1155.address, 1, {
        from: accounts[0],
      }),
      "Token owner cannot enter bid to self."
    );
  });

  it("acceptOfferForToken requires marketplace contract token approval", async function () {
    await this.mp.updateCollection(
      this.sample1155.address,
      true,
      5,
      "ipfs://mynewhash",
      { from: accounts[0] }
    );
    await this.sample1155.setApprovalForAll(this.mp.address, true, {
      from: accounts[0],
    });
    await this.mp.offerTokenForSale(this.sample1155.address, 1, getPrice(1), {
      from: accounts[0],
    });
    await this.sample1155.setApprovalForAll(this.mp.address, false, {
      from: accounts[0],
    });
    await expectRevert(
      this.mp.acceptOfferForToken(this.sample1155.address, 1, {
        from: accounts[1],
        value: getPrice(1),
      }),
      "Marketplace not approved to spend token on seller behalf"
    );
  });
});
