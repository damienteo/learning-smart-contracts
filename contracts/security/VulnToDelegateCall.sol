// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract FibonacciLib {
    uint256 public start;
    uint256 public calculatedFibNumber;

    function setStart(uint256 _start) public {
        start = _start;
    }

    function setFibonacci(uint256 n) public {
        calculatedFibNumber = fibonacci(n);
    }

    function fibonacci(uint256 n) internal returns (uint256) {
        if (n == 0) {
            return start;
        } else if (n == 1) {
            return start + 1;
        } else {
            return fibonacci(n - 1) + fibonacci(n - 2);
        }
    }
}

contract VulnToDelegateCall {
    address public fibonacciLibrary;
    uint256 public calculatedFibNumber;
    uint256 public start = 3;
    uint256 public withdrawalCounter;

    // bytes4 constant fibSig = bytes4(keccak256("setFibonacci(uint256)"));

    constructor(address _fibonacciLibrary) payable {
        fibonacciLibrary = _fibonacciLibrary;
    }

    function withdraw() public {
        withdrawalCounter += 1;

        (bool success, ) = fibonacciLibrary.delegatecall(
            abi.encodeWithSignature("setFibonacci(uint256)", withdrawalCounter)
        );

        require(success, "DELEGATE_CALL_FAILURE");

        payable(msg.sender).transfer(calculatedFibNumber * 1 ether);
    }

    function publicCall() public {
        (bool success, ) = fibonacciLibrary.delegatecall(msg.data);

        require(success, "DELEGATE_CALL_FAILURE");
    }
}
