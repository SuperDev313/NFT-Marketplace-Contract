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

    modifier collectionMustBeEnabled(address contractAddress) {
        require(
            true == collectionState[contractAddress].status,
            "Collection must be enabled on this contract by project owner"
        );
        _;
    }

    //Allow owners of contracts to update their collection details

    function updateCollection(
        address contractAddress,
        bool erc1155,
        uint256 royaltyPercent,
        string memory metadataURL
    ) external onlyIfContractOwner(contractAddress) {
        require(royaltyPercent >= 0, "Must be greater than or equal to 0.");
        require(royaltyPercent <= 100, "Cannot exceed 100%");
        collectionState[contractAddress] = Collection(
            true,
            erc1155,
            royaltyPercent,
            metadataURL
        );
        emit CollectionUpdated(contractAddress);
    }

    // Allows the owner of contract to remove their collections
    function disableCollection(
        address contractAddres
    ) external collectionMustBeEnabled(contractAddress) {
        collectionState[contractAddres] = Collection(false, false, 0, "");
        emit CollectionDisabled(collectionAddress);
    }

    function offerTokenForSale(
        address contractAddress,
        uint256 tokenIndex,
        uint256 minSalePriceInWei
    )
        external
        collectionMustBeEnabled(contractAddress)
        onlyIfTokenOwner(contractAddress, tokenIndex)
        nonReentrant
    {
        if (collectionState[contractAddress].erc1155) {
            require(
                IERC1155(contractAddress).isApprovedForAll(
                    msg.sender,
                    address(this)
                ),
                "Marketplace not approved to spend token on seller behalf."
            );
        } else {
            require(
                IERC721(contractAddress).getApproved(tokenIndex) ==
                    address(this),
                "Marketplace not approved to spend token on seller behalf."
            );
        }
        tokenOffers[contractAddress][tokenIndex] = Offer(
            true,
            tokenIndex,
            msg.sender,
            minSalePriceInWei,
            address(0x0)
        );
        emit TokenOffered(
            contractAddress,
            tokenIndex,
            minSalePriceInWei,
            address(0x0)
        );
    }

    // Remove token listing (offer)
    function tokenNoLongerForSale(
        address contractAddress,
        uint256 tokenIndex
    )
        public
        collectionMustBeEnabled(contractAddress)
        onlyIfTokenOwner(contractAddress, tokenIndex)
        nonReentrant
    {
        tokenOffers[contractAddress][tokenIndex] = Offer(
            false,
            tokenIndex,
            msg.sender,
            0,
            address(0x0)
        );
        emit TokenNoLongerForSale(contractAddress, tokenIndex);
    }

    // Open bid on a token
    function enterBidForToken(
        address contractAddress,
        uint256 tokenIndex
    )
        external
        payable
        collectionMustBeEnabled(contractAddress)
        notIfTokenOwner(contractAddress, tokenIndex)
        nonReentrant
    {
        require(msg.value > 0, "Must bid some amount of Ether.");
        Bid memory existing = tokenBids[contractAddress][tokenIndex];
        require(
            msg.value > existing.value,
            "Must bid higher than current bid."
        );
        // Refund the failing bid
        pendingBalance[existing.bidder] = pendingBalance[existing.bidder].add(
            existing.value
        );
        tokenBids[contractAddress][tokenIndex] = Bid(
            true,
            tokenIndex,
            msg.sender,
            msg.value
        );
        emit TokenBidEntered(
            contractAddress,
            tokenIndex,
            msg.value,
            msg.sender
        );
    }
    // Remove an open bid on a token
    function withdrawBidForToken(
        address contractAddress,
        uint256 tokenIndex
    )
        external
        payable
        collectionMustBeEnabled(contractAddress)
        notIfTokenOwner(contractAddress, tokenIndex)
        nonReentrant
    {
        Bid memory bid = tokenBids[contractAddress][tokenIndex];
        require(
            msg.sender == bid.bidder,
            "Only original bidder can withdraw this bid."
        );
        emit TokenBidWithdrawn(
            contractAddress,
            tokenIndex,
            bid.value,
            msg.sender
        );
        uint256 amount = bid.value;
        tokenBids[contractAddress][tokenIndex] = Bid(
            false,
            tokenIndex,
            address(0x0),
            0
        );
        payable(msg.sender).transfer(amount);
    }
}
