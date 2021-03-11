// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

import "./auctions/FungibleAuction.sol";
import "./IAuctionHouse.sol";

/// @title Auction House
contract AuctionHouse is IAuctionHouse {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    /// @dev All fungible auctions that are either starting in the future, already active,
    /// or haven't had their tokens withdrawn yet after finishing.
    EnumerableSet.AddressSet private fungibleAuctions;

    /// @dev Create new auction for a fungible token.
    function createFungible(
        IERC20 sellTokenAddress,
        IERC20 buyTokenAddress,
        uint256 amount,
        uint256 startTimestamp,
        uint256 duration,
        uint256 maxPrice,
        uint256 minPrice
    ) external override {
        //  liquidity checks
        require(sellTokenAddress.balanceOf(msg.sender) >= amount, "AuctionHouse: Creator not liquid enough");
        require(sellTokenAddress.allowance(msg.sender, address(this)) >= amount, "AuctionHouse: Not approved");

        FungibleAuction auction =
            new FungibleAuction(
                sellTokenAddress,
                buyTokenAddress,
                amount,
                msg.sender,
                startTimestamp,
                duration,
                maxPrice,
                minPrice,
                true
            );
        EnumerableSet.add(fungibleAuctions, address(auction));

        // Can be safely called thanks to the `balanceOf` and `allowance` checks.
        sellTokenAddress.safeTransferFrom(msg.sender, address(auction), amount);

        emit FungibleAuctionCreated(
            address(auction),
            address(sellTokenAddress),
            address(buyTokenAddress),
            amount,
            startTimestamp,
            maxPrice
        );
    }

    /// @dev Close auction and remove from state. Called by auction contract.
    function closeFungible(
        address buyTokenAddress,
        address sellTokenAddress,
        uint256 tokensSold,
        uint256 minPrice
    ) external override {
        // Returns false if the caller wasn't an address in the `fungibleAuctions` array,
        // in which case we revert.
        if (!EnumerableSet.remove(fungibleAuctions, msg.sender)) {
            revert("AuctionHouse: can only be closed by auction contract");
        }

        emit FungibleAuctionClosed(
            msg.sender,
            address(sellTokenAddress),
            address(buyTokenAddress),
            tokensSold,
            minPrice
        );
    }

    // VIEWS
    /// @dev Get fungible auction at given index.
    function getFungibleAuction(uint256 index) external view override returns (address) {
        return EnumerableSet.at(fungibleAuctions, index);
    }

    /// @dev Get number of active auctions, i.e. auctions that are still running and have tokens remaining.
    function getActiveAuctionCount() external view override returns (uint256) {
        uint256 active = 0;

        for (uint256 i = 0; i < EnumerableSet.length(fungibleAuctions); i++) {
            if (FungibleAuction(EnumerableSet.at(fungibleAuctions, i)).isActive()) {
                active++;
            }
        }

        return active;
    }
}
