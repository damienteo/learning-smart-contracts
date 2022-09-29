// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Auth {
    address private _administrator;

    constructor(address deployer) {
        _administrator = deployer;
    }

    function isAdministrator(address user) public view returns (bool) {
        return user == _administrator;
    }
}
