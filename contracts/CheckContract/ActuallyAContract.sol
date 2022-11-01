// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ContractChecker.sol";

contract ActuallyAContract {
    constructor(address _contractChecker, uint256 _balance) {
        ContractChecker contractChecker = ContractChecker(_contractChecker);
        contractChecker.interact(_balance);
    }
}
