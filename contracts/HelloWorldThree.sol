// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

interface HelloWorldThreeInterface {
    function helloWorld() external view returns (string memory);

    function setText(string memory newText) external;
}

contract HelloWorldThree is HelloWorldThreeInterface {
    string private text;

    constructor() {
        text = pureText();
    }

    function pureText() public pure returns (string memory) {
        return "Testing Hello World For the First Time ";
    }

    function _isPure() internal view returns (bool _check) {
        _check = keccak256(bytes(text)) == keccak256(bytes(pureText()));
    }

    function isPure() public view returns (bool _returnValue) {
        _returnValue = _isPure();
    }

    function _restore() internal {
        text = pureText();
    }

    function restore() public returns (bool) {
        if (_isPure()) return false;
        _restore();
        return true;
    }

    function helloWorld() public view override returns (string memory) {
        return text;
    }

    function setText(string memory newText) public override {
        text = newText;
    }
}
