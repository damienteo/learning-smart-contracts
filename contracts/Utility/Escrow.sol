// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Escrow {
    address public arbiter;
    address payable public beneficiary;
    address public depositor;

    bool public isApproved;

    constructor(
        address _arbiter,
        address payable _beneficiary,
        address _depositor
    ) payable {
        arbiter = _arbiter;
        beneficiary = _beneficiary;
        depositor = _depositor;
    }

    event Approved(uint);

    function releaseFunds() external {
        require(msg.sender == arbiter, "NOT_ARBITER");
        uint balance = address(this).balance;
        beneficiary.transfer(balance);
        emit Approved(balance);
        isApproved = true;
    }

    receive() external payable {}
}
