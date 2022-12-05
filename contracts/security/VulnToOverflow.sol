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

    function withdraw() public {
        require(balances[msg.sender] > 0);
        require(block.timestamp > lockTime[msg.sender]);

        uint256 balance = balances[msg.sender];
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(balance);
    }
}
