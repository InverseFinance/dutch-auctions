// SPDX-License-Identifier: MIT

pragma solidity ^0.7.3;

interface IFungibleAuction {
    /// @dev Buy `amount` tokens. Will buy whatever is left if `amount` is not available in its entirety.
    function buy(uint256 amount) external;

    /// @dev Withdraw the tokens that were bid.
    function withdraw() external;

    /// VIEWS
    /// @dev Get price per token.
    function getPrice() external view returns (uint256);

    /// @dev Check whether auction is still active, i.e. still running and with tokens remaining.
    function isActive() external view returns (bool);

    /// EVENTS
    event Buy(address indexed sellTokenAddress, uint256 indexed amount, uint256 indexed buyPrice);
}
