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

        // unchecked because it would have otherwise caused an error preventing the attack test from passing
        // safemath is inbuilt into Solidity v0.8 onwards, so it would prevent underflow, etc
        // To get around this to show reentrancy attacks, withdrawAll function below would be a better example
        unchecked {
            balances[msg.sender] -= _weiToWithdraw;
        }
        lastWithdrawTime[msg.sender] = block.timestamp;
    }

    function withdrawAll() public {
        require(balances[msg.sender] > 0);

        // limit the time allowed to withdraw
        require(block.timestamp >= lastWithdrawTime[msg.sender] + 1 weeks);

        uint256 amount = balances[msg.sender];

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent);

        balances[msg.sender] = 0;
    }
}
