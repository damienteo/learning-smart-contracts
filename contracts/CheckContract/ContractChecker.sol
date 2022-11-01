// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract ContractChecker {
    uint256 public balance;

    modifier isNotContract(address _a) {
        uint256 size;
        assembly {
            size := extcodesize(_a)
        }
        require(size == 0, "Contract found!");
        _;
    }

    function interact(uint256 _balance) public isNotContract(msg.sender) {
        balance = _balance;
    }
}
