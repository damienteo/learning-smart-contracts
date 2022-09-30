// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Box3V2 is Initializable {
    uint256 private _value;
    address private _admin;

    // Emitted when the stored value changes
    event ValueChanged(uint256 value);

    function initialize(address admin) public initializer {
        _admin = admin;
    }

    // constructor(address admin) initializer {
    //     _admin = admin;
    // }

    // Stores a new value in the contract
    function store(uint256 value) public {
        _value = value;
        emit ValueChanged(value);
    }

    // Reads the last stored value
    function retrieve() public view returns (uint256) {
        return _value;
    }

    function increment() public {
        _value = _value + 1;
        emit ValueChanged(_value);
    }

    function retrieveAdmin() public view returns (address) {
        return _admin;
    }
}

// const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
// https://docs.openzeppelin.com/upgrades-plugins/1.x/

// deployProxy does the following
// - Checks that implementation is upgrade-safe
// cannot have a constructor, and should not use the selfdestruct or delegatecall operations for security reasons
// (https://docs.openzeppelin.com/upgrades-plugins/1.x/faq#what-does-it-mean-for-a-contract-to-be-upgrade-safe)
// - Deploy proxy admin if needed
// - Deploys implementation contract
// Proxy contract is the instance users interact with, while implementation is the contract that holds the code
// There can be several proxies, but only one implementation contract will be used
// A proxy is a contract that delegates all the calls to a second contract (the implementation contract)
// All state and funds are held in the proxy, but the code executed is in the implementation
// - Create and initialise the proxy contract

// upgradeProxy
// - Validate that implementation is upgrade-safe and compatible with previous implementation
// - Checks if there is an implementation contract deployed with the same bytecode, and deploy one if not
// - Upgrades the proxy to use the new implementation contract
