pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Marketplace is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    struct Offer {
        bool isForSale;
        uint256 tokenIndex;
        address seller;
        uint256 minValue;
        address onlySellTo;
    }
    
}