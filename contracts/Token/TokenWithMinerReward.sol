//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// https://docs.openzeppelin.com/contracts/4.x/erc20-supply
contract TokenWithMinerReward is ERC20 {
    constructor() ERC20("Reward", "RWD") {}

    // Triggered Manually if public
    function mintMinerReward() internal {
        _mint(block.coinbase, 1000);
    }

    // Triggered for every token transfer in the blockchain
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        if (!(from == address(0) && to == block.coinbase)) {
            mintMinerReward();
        }

        super._beforeTokenTransfer(from, to, value);
    }
}
