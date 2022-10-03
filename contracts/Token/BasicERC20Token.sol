// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BasicERC20Token is ERC20 {
    constructor(uint256 amount) ERC20("BasicERC20Token", "BET") {
        _mint(msg.sender, amount * 10**decimals());
    }
}
