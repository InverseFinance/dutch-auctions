// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IAuctionHouse {
    /// @dev Create new auction for a fungible token.
    function createFungible(
        ERC20 sellTokenAddress,
        ERC20 buyTokenAddress,
        uint256 amount,
        uint256 startTimestamp,
        uint256 duration,
        uint256 maxPrice,
        uint256 minPrice
    ) external;

    /// @dev Close auction and remove from state. Called by auction contract.
    function closeFungible(
        address buyTokenAddress,
        address sellTokenAddress,
        uint256 tokensSold,
        uint256 minPrice
    ) external;

    /// @dev Get fungible auction at given index.
    function getFungibleAuction(uint256 index) external view returns (address);

    /// @dev Get number of active auctions, i.e. auctions that are still running and have tokens remaining.
    function getActiveAuctionCount() external view returns (uint256);

    event FungibleAuctionCreated(
        address auctionAddress,
        address indexed sellTokenAddress,
        address buyTokenAddress,
        uint256 indexed amountAvailable,
        uint256 startTimestamp,
        uint256 maxPrice
    );
    event FungibleAuctionClosed(
        address auctionAddress,
        address indexed sellTokenAddress,
        address buyTokenAddress,
        uint256 indexed amountSold,
        uint256 minPrice
    );
}
