// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ContractChecker.sol";

contract NormalContract {
    ContractChecker public contractChecker;

    constructor(address _contractChecker) {
        contractChecker = ContractChecker(_contractChecker);
    }

    function getChecked(uint256 _balance) public {
        return contractChecker.interact(_balance);
    }
}
