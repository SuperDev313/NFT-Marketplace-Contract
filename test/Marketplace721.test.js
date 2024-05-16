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
    this.mp = await Marketplace.new({ from: accounts[0] });
    this.sample721 = await SampleProject721.new({ from: accounts[0] });
    await this.sample721.mint(10, { from: accounts[0] });
  });
});
