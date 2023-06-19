// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EscrowProxyFactory is Ownable {
    address public implementationContract;
    address[] public allClones;

    event NewClone(address _clone);

    constructor(address _implementation) {
        implementationContract = _implementation;
    }

    function createNewEscrow(
        address _arbiter,
        address payable _beneficiary,
        address _depositor
    ) external payable returns (address instance) {
        instance = Clones.clone(implementationContract);
        (bool success, ) = instance.call{value: msg.value}(
            abi.encodeWithSignature(
                "initialize(address,address,address)",
                _arbiter,
                _beneficiary,
                _depositor
            )
        );
        require(success, "Clone Failure");
        allClones.push(instance);
        emit NewClone(instance);
        return instance;
    }
}
