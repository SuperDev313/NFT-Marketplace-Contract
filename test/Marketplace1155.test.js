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
    
}