// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

// Start of a series of security related learnings
// https://cypherpunks-core.github.io/ethereumbook/09smart-contracts-security.html

contract VulnToReentrancy {
    uint256 public withdrawalLimit = 1 ether;
    mapping(address => uint256) public lastWithdrawTime;
    mapping(address => uint256) public balances;

    function depositFunds() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdrawFunds(uint256 _weiToWithdraw) public {
        require(balances[msg.sender] >= _weiToWithdraw);
        // limit the withdrawal
        require(_weiToWithdraw <= withdrawalLimit);
        // limit the time allowed to withdraw
        require(block.timestamp >= lastWithdrawTime[msg.sender] + 1 weeks);

        (bool sent, ) = msg.sender.call{value: _weiToWithdraw}("");
        require(sent);

        balances[msg.sender] -= _weiToWithdraw;
        lastWithdrawTime[msg.sender] = block.timestamp;
    }
}
