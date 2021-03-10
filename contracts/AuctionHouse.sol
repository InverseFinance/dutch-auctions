// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;

// TODO: Use interface. The current version of @openZeppelin/contracts lib has none that fits.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./auctions/FungibleAuction.sol";


/// @title Auction House
contract AuctionHouse {
    /// @dev All fungible auctions that are either starting in the future, already active,
    /// or haven't had their tokens withdrawn yet after finishing.
    address[] public fungibleAuctions;

    /// @dev Create new auction for a fungible token.
    function createFungible(
        ERC20 sellTokenAddress,
        ERC20 buyTokenAddress,
        uint256 amount,
        uint256 startTimestamp,
        uint256 duration,
        uint256 maxPrice,
        uint256 minPrice
    ) external {
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
        fungibleAuctions.push(address(auction));

        // Can be safely called thanks to the `balanceOf` and `allowance` checks.
        sellTokenAddress.transferFrom(msg.sender, address(auction), amount);

        emit FungibleAuctionCreated(
            address(auction),
            address(sellTokenAddress),
            address(buyTokenAddress),
            amount,
            startTimestamp,
            maxPrice
        );
    }

    ///@dev Close auction and remove from state. Called by auction contract.
    function closeFungible(
        address buyTokenAddress,
        address sellTokenAddress,
        uint256 tokensSold,
        uint256 minPrice
    ) external {
        // Acts as guard, reverts if msg.sender is not a contract created via
        // this auction house.
        uint256 index = _isFungibleAuction(msg.sender);

        // We swap out the closed fungible auction with the last auction in the
        // array to keep the array compact.
        if (fungibleAuctions.length > 1) {
            fungibleAuctions[index] = fungibleAuctions[fungibleAuctions.length - 1];
        }

        // Remove the last auction as it's now a duplicate.
        fungibleAuctions.pop();

        emit FungibleAuctionClosed(
            msg.sender,
            address(sellTokenAddress),
            address(buyTokenAddress),
            tokensSold,
            minPrice
        );
    }

    // VIEWS
    function getActiveAuctionCount() external view returns (uint256) {
        uint256 active = 0;

        for (uint256 i = 0; i < fungibleAuctions.length; i++) {
            if (FungibleAuction(fungibleAuctions[i]).isActive()) {
                active++;
            }
        }

        return active;
    }

    function _isFungibleAuction(address auctionAddress) internal view returns (uint256) {
        for (uint256 i = 0; i < fungibleAuctions.length; i++) {
            if (address(fungibleAuctions[i]) == auctionAddress) {
                return i;
            }
        }

        revert("AuctionHouse: Not called by fungible auction");
    }

    // EVENTS
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
