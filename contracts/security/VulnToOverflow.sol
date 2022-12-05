// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

contract VulnToOverflow {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lockTime;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
        lockTime[msg.sender] = block.timestamp + 1 weeks;
    }

    function increaseLockTime(uint256 _secondsToIncrease) public {
        unchecked {
            lockTime[msg.sender] += _secondsToIncrease;
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
