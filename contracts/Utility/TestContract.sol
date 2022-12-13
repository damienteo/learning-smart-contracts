// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

contract TestContract {
    uint256 public i;

    function callMe(uint256 j) public {
        i += j;
    }

    function getData(uint256 _number) public pure returns (bytes memory) {
        return abi.encodeWithSignature("callMe(uint256)", _number);
    }
}
