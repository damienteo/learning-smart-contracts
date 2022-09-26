// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "hardhat/console.sol";

// https://medium.com/coinmonks/solidity-tx-origin-attacks-58211ad95514
contract TxOriginVictim {
    address owner;

    constructor() {
        owner = msg.sender;
    }

    function getBalance() public view returns (uint256 balance) {
        balance = address(this).balance;
    }

    function transferTo(address to, uint256 amount) public returns (bool) {
        console.log(
            "Owner is %o and Transaction Origin is %t",
            owner,
            tx.origin
        );

        require(tx.origin == owner);
        (bool success, bytes memory data) = (
            address(to).call{value: amount}("")
        );

        return success;
    }

    receive() external payable {}
}
