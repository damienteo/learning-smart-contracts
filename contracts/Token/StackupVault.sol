// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {sToken} from "./sToken.sol";

contract StackupVault {
    // mapping of token address to underlying tokens and claim tokens
    mapping(address => IERC20) public tokens;
    mapping(address => sToken) public claimTokens;

    constructor(address uniAddr, address linkAddr) {
        // tokens[]
        // initialize mapping of underlying token address => claim tokens
        sToken uniToken = new sToken("Claim Uni", "sUNI");
        sToken linkToken = new sToken("Claim Link", "sLINK");
        claimTokens[uniAddr] = uniToken;
        claimTokens[linkAddr] = linkToken;
        // initialize mapping of underlying token address => underlying tokens
        tokens[uniAddr] = IERC20(uniAddr);
        tokens[linkAddr] = IERC20(linkAddr);
    }

    function deposit(address tokenAddr, uint256 amount) external {
        // Transfer underlying tokens from the user to vault
        IERC20 underlyingToken = IERC20(tokenAddr);
        bool success = underlyingToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        require(success, "transferFrom failed");

        // Mint sTokens
        sToken claimToken = claimTokens[tokenAddr];
        claimToken.mint(msg.sender, amount);
    }

    function withdraw(address tokenAddr, uint256 amount) external {
        // burn sTokens
        sToken claimToken = claimTokens[tokenAddr];
        claimToken.burn(msg.sender, amount);
        // transfer underlying tokens from vault to user
        IERC20 underlyingToken = IERC20(tokenAddr);
        bool success = underlyingToken.transfer(msg.sender, amount);
        require(success, "transfer failed");
    }
}
