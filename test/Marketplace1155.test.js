const Marketplace = artifacts.require("Marketplace");
const SampleProject1155 = artifacts.require("SampleProject1155");
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');


contract('Marketplace ERC-1155', function(accounts) {
    const nullAddress = '0x0000000000000000000000000000000000000000';

    function getPrice(amtEth) {
        return web3.utils.toWei(amtEth.toString())
      }
    
      beforeEach(async function () {
        this.mp = await Marketplace.new({from: accounts[0]});
        this.sample1155 = await SampleProject1155.new({from: accounts[0]});
        await this.sample1155.mint(1, 1, {from: accounts[0]});
        await this.sample1155.mint(2, 1, {from: accounts[0]});
        await this.sample1155.mint(3, 1, {from: accounts[0]});
      });
    
      
  // updateCollection

  it('updateCollection requires contract ownership', async function () {
    await expectRevert(
      this.mp.updateCollection(this.sample1155.address, true, 1, "", {from: accounts[1]}),
      'You must own the contract.'
    );
    await expectEvent(
      await this.mp.updateCollection(this.sample1155.address, true, 5, "ipfs://ok", {from: accounts[0]}),
      'CollectionUpdated'
    );
  });

  it('updateCollection updates each time', async function () {
    // add/update collection as owner
    await this.mp.updateCollection(this.sample1155.address, true, 1, "ipfs://mynewhash", {from: accounts[0]});
    // settings should match
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).status
    ).to.equal(true);
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).erc1155
    ).to.equal(true);
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).royaltyPercent
    ).to.be.bignumber.equal('1');
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).metadataURL
    ).to.equal("ipfs://mynewhash");
    // Disable collection (zero it out)
    await this.mp.disableCollection(this.sample1155.address, {from: accounts[0]});
    // update collection again
    await this.mp.updateCollection(this.sample1155.address, true, 5, "ipfs://anothernewhash", {from: accounts[0]});
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).status
    ).to.equal(true);
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).erc1155
    ).to.equal(true);
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).royaltyPercent
    ).to.be.bignumber.equal('5');
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).metadataURL
    ).to.equal("ipfs://anothernewhash");
    // update again
    await this.mp.updateCollection(this.sample1155.address, true, 8, "ipfs://round3", {from: accounts[0]});
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).status
    ).to.equal(true);
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).erc1155
    ).to.equal(true);
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).royaltyPercent
    ).to.be.bignumber.equal('8');
    await expect(
      (await this.mp.collectionState(this.sample1155.address)).metadataURL
    ).to.equal("ipfs://round3");
  });
}