// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
    }

    IERC721 public immutable nft;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Cancelled(uint256 indexed tokenId, address indexed seller);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);

    error InvalidPrice();
    error NotOwner();
    error NotApproved();
    error NotListed();
    error WrongValue();
    error SellerCannotBuy();
    error EthTransferFailed();

    constructor(address nftAddress) {
        nft = IERC721(nftAddress);
    }

    function list(uint256 tokenId, uint256 price) external {
        if (price == 0) revert InvalidPrice();
        if (nft.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (nft.getApproved(tokenId) != address(this) && !nft.isApprovedForAll(msg.sender, address(this))) {
            revert NotApproved();
        }
        listings[tokenId] = Listing({seller: msg.sender, price: price});
        emit Listed(tokenId, msg.sender, price);
    }

    function cancel(uint256 tokenId) external {
        Listing memory item = listings[tokenId];
        if (item.seller != msg.sender) revert NotOwner();
        delete listings[tokenId];
        emit Cancelled(tokenId, msg.sender);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory item = listings[tokenId];
        if (item.price == 0 || nft.ownerOf(tokenId) != item.seller) revert NotListed();
        if (msg.value != item.price) revert WrongValue();
        if (msg.sender == item.seller) revert SellerCannotBuy();

        delete listings[tokenId];
        nft.safeTransferFrom(item.seller, msg.sender, tokenId);

        (bool ok, ) = payable(item.seller).call{value: msg.value}("");
        if (!ok) revert EthTransferFailed();

        emit Sold(tokenId, item.seller, msg.sender, item.price);
    }
}

