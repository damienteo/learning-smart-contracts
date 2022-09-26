// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./HelloWorldFive.sol";

interface GreetingReaderInterface {
    function read(address target) external view returns (string memory);

    function setText(address target, string calldata newText) external;
}

contract GreetingReader is GreetingReaderInterface {
    function read(address target) public view override returns (string memory) {
        HelloWorldFive referenceObject = HelloWorldFive(target);
        return referenceObject.helloWorld();
    }

    function setText(address target, string calldata newText) public override {
        HelloWorldFive referenceObject = HelloWorldFive(target);
        referenceObject.setText(newText);
    }
}
