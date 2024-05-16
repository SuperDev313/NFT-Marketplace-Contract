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

    struct Bid {
        bool hasBid;
        uint256 tokenIndex;
        address bidder;
        uint256 value;
    }

    struct Collection {
        bool status;
        bool erc1155;
        address royaltyPercent;
        string metadataURL;
    }
    // Nested mapping for each collection's offers and bids

    mapping(address => mapping(uint256 => Offer)) public tokenOffers;
    mapping(address => mapping(uint256 => Bid)) public tokenBids;

    mapping(address => Collection) public collectionState;

    mapping(address => uint256) public pendingBalance;

    // Log events
    event TokenTransfer(
        address indexed collectionAddress,
        address indexed from,
        address indexed to,
        uint256 tokenIndex
    );
    event TokenOffered(
        address indexed collectionAddress,
        uint256 indexed tokenIndex,
        uint256 minValue,
        address indexed toAddress
    );
    event TokenBidEntered(
        address indexed collectionAddress,
        uint256 indexed tokenIndex,
        uint256 value,
        address indexed fromAddress
    );
    event TokenBidWithdrawn(
        address indexed collectionAddress,
        uint256 indexed tokenIndex,
        uint256 value,
        address indexed fromAddress
    );
    event TokenBought(
        address indexed collectionAddress,
        uint256 indexed tokenIndex,
        uint256 value,
        address fromAddress,
        address toAddress
    );
    event TokenNoLongerForSale(
        address indexed collectionAddress,
        uint256 indexed tokenIndex
    );
    event CollectionUpdated(address indexed collectionAddress);
    event CollectionDisabled(address indexed collectionAddress);

    constructor() {}

    modifier onlyIfTokenOwner(address contractAddress, uint256 tokenIndex) {
        if (collectionState[contractAddress].erc1155) {
            require(
                IERC1155(contractAddress).balanceOf(msg.sender, tokenIndex) > 0,
                "You must own the token."
            );
        } else {
            require(
                msg.sender == IERC721(contractAddress).ownerOf(tokenIndex),
                "You must own the token."
            );
        }
        _;
    }

    modifier notIfTokenOwner(address contractAddress, uint256 tokenIndex) {
        if (collectionState[contractAddress].erc1155) {
            require(
                IERC1155(contractAddress).balanceOf(msg.sender, tokenIndex) ==
                    0,
                "Token owner cannot enter bid to self."
            );
        } else {
            require(
                msg.sender != IERC721(contractAddress).ownerOf(tokenIndex),
                "Token owner cannot enter bid to self."
            );
        }
        _;
    }

    modifier onlyIfContractOwner(address contractAddress) {
        require(
            msg.sender == Ownable(contractAddress).owner(),
            "You must own the contract"
        );
        _;
    }
}
