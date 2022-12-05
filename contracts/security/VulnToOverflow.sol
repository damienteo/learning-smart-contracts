// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract VulnToOverflow {
    mapping(address => uint256) public balances;
    mapping(address => uint32) public lockTime; // HOTFIX: Uses uint32 to prevent out-of-bounds error from test side)

    function deposit() public payable {
        balances[msg.sender] += msg.value;
        lockTime[msg.sender] = uint32(block.timestamp + 1 weeks);
    }

    function increaseLockTime(address _address, uint32 _secondsToIncrease)
        public
    {
        unchecked {
            lockTime[_address] += _secondsToIncrease;
        }
    }

    function withdraw(address _address) public {
        require(balances[_address] > 0, "INSUFFICIENT_BALANCE");
        require(block.timestamp > lockTime[_address], "TIMELOCK_ACTIVE");

        uint256 balance = balances[_address];
        balances[_address] = 0;
        payable(msg.sender).transfer(balance);
    }
}
