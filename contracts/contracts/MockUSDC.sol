// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice A 6-decimal mintable ERC-20 that stands in for a regulated stablecoin
///         (USDC, or an HKMA-licensed HKD stablecoin) for the Harbour demo.
///         In production the escrow would hold the real regulated token; here we
///         mint freely so the local/Sepolia demo can fund a buyer and settle.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {}

    /// @notice Real USDC uses 6 decimals (not the ERC-20 default of 18); we match it
    ///         so settlement amounts line up with parseUnits(x, 6) on the frontend.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Open faucet — anyone can mint demo tokens to any address.
    /// @param to     recipient of the freshly minted tokens
    /// @param amount amount in base units (6 decimals)
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
