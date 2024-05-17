const Marketplace = artifacts.require("Marketplace");
const SampleProject1155 = artifacts.require("SampleProject1155");
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');


contract('Marketplace ERC-1155', function(accounts) {
    const nullAddress = '0x0000000000000000000000000000000000000000';
}