// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TradeEscrow
/// @notice On-chain settlement gate for the Harbour proof-of-trade flow.
///         A buyer locks a stablecoin (MockUSDC) against a trade invoice. The
///         off-chain AI compliance oracle then either releases the funds to the
///         supplier (trade cleared) or blocks settlement and holds the funds in
///         escrow (trade refused). The AI verdict is enforced here on-chain —
///         it is load-bearing, not decorative.
contract TradeEscrow {
    /// @notice Lifecycle of a trade passport.
    ///         CLEARED is a UI-only sub-state and is intentionally never written
    ///         on-chain: a successful approval moves VERIFYING -> SETTLED directly.
    enum Status {
        VERIFYING, // 0 — funds locked, awaiting the compliance verdict
        CLEARED,   // 1 — (UI-only) verdict CLEAR, settlement in flight
        SETTLED,   // 2 — funds released to the supplier
        BLOCKED    // 3 — settlement refused, funds held in escrow
    }

    /// @notice The full record for a single trade, keyed by invoiceRef.
    struct Passport {
        bytes32 hsCode;        // Harmonized System code (encodeBytes32String)
        uint256 declaredValue; // declared trade value (informational, USDC base units)
        uint256 quantity;      // declared units
        address buyer;         // who locked the funds (msg.sender on deposit)
        address supplier;      // beneficiary paid on settlement
        uint256 amount;        // escrowed settlement amount (USDC base units, 6dp)
        Status status;         // lifecycle state
        bool exists;           // guards against re-using an invoiceRef
    }

    /// @notice The regulated stablecoin held in escrow.
    IERC20 public immutable usdc;

    /// @notice The compliance oracle wallet allowed to release or reject trades.
    address public immutable oracle;

    /// @notice invoiceRef => trade passport.
    mapping(bytes32 => Passport) public passports;

    /// @notice Funds locked for a new trade; passport opened in VERIFYING.
    event Locked(
        bytes32 indexed invoiceRef,
        bytes32 hsCode,
        uint256 declaredValue,
        uint256 quantity,
        address buyer,
        address supplier,
        uint256 amount
    );

    /// @notice Trade cleared compliance; funds released to the supplier.
    event Settled(bytes32 indexed invoiceRef, uint16 riskScore, uint256 amount);

    /// @notice Trade refused; funds held in escrow.
    event Blocked(bytes32 indexed invoiceRef, string reason);

    /// @notice Restricts settlement decisions to the compliance oracle wallet.
    modifier onlyOracle() {
        require(msg.sender == oracle, "TradeEscrow: caller is not the oracle");
        _;
    }

    /// @param _usdc   address of the stablecoin (MockUSDC) held in escrow
    /// @param _oracle compliance oracle wallet that releases / rejects trades
    constructor(address _usdc, address _oracle) {
        usdc = IERC20(_usdc);
        oracle = _oracle;
    }

    /// @notice Buyer locks `amount` of stablecoin against a trade invoice.
    /// @dev    Buyer must have approved this contract for `amount` first.
    /// @param invoiceRef    primary key for the trade (encodeBytes32String)
    /// @param hsCode        Harmonized System code (encodeBytes32String)
    /// @param declaredValue declared trade value (USDC base units, informational)
    /// @param quantity      declared units
    /// @param supplier      beneficiary to be paid on settlement
    /// @param amount        settlement amount to lock (USDC base units, 6dp)
    function deposit(
        bytes32 invoiceRef,
        bytes32 hsCode,
        uint256 declaredValue,
        uint256 quantity,
        address supplier,
        uint256 amount
    ) external {
        require(!passports[invoiceRef].exists, "TradeEscrow: invoiceRef already used");

        // Pull the funds in; buyer must have approved this contract beforehand.
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "TradeEscrow: USDC transferFrom failed"
        );

        passports[invoiceRef] = Passport({
            hsCode: hsCode,
            declaredValue: declaredValue,
            quantity: quantity,
            buyer: msg.sender,
            supplier: supplier,
            amount: amount,
            status: Status.VERIFYING,
            exists: true
        });

        emit Locked(invoiceRef, hsCode, declaredValue, quantity, msg.sender, supplier, amount);
    }

    /// @notice Oracle clears the trade and releases the escrow to the supplier.
    /// @dev    Moves VERIFYING -> SETTLED directly (CLEARED is UI-only).
    /// @param invoiceRef trade key
    /// @param riskScore  AI risk score 0-100 (recorded in the Settled event)
    function approveAndRelease(bytes32 invoiceRef, uint16 riskScore) external onlyOracle {
        Passport storage p = passports[invoiceRef];
        require(p.status == Status.VERIFYING, "TradeEscrow: not awaiting verification");

        p.status = Status.SETTLED;

        require(
            usdc.transfer(p.supplier, p.amount),
            "TradeEscrow: USDC transfer to supplier failed"
        );

        emit Settled(invoiceRef, riskScore, p.amount);
    }

    /// @notice Oracle refuses settlement; funds stay locked in escrow for review.
    /// @param invoiceRef trade key
    /// @param reason     human-readable reason (recorded in the Blocked event)
    function reject(bytes32 invoiceRef, string calldata reason) external onlyOracle {
        Passport storage p = passports[invoiceRef];
        require(p.status == Status.VERIFYING, "TradeEscrow: not awaiting verification");

        p.status = Status.BLOCKED;
        // No transfer: the funds remain held in this contract.

        emit Blocked(invoiceRef, reason);
    }

    /// @notice Read a trade passport.
    /// @return hsCode        Harmonized System code
    /// @return declaredValue declared trade value (USDC base units)
    /// @return quantity      declared units
    /// @return buyer         who locked the funds
    /// @return supplier      settlement beneficiary
    /// @return amount        escrowed amount (USDC base units)
    /// @return status        lifecycle state as uint8 (matches the Status enum)
    function getPassport(bytes32 invoiceRef)
        external
        view
        returns (
            bytes32 hsCode,
            uint256 declaredValue,
            uint256 quantity,
            address buyer,
            address supplier,
            uint256 amount,
            uint8 status
        )
    {
        Passport storage p = passports[invoiceRef];
        return (
            p.hsCode,
            p.declaredValue,
            p.quantity,
            p.buyer,
            p.supplier,
            p.amount,
            uint8(p.status)
        );
    }
}
