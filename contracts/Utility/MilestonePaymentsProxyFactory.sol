// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// https://eips.ethereum.org/EIPS/eip-1167

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error CloneFailure();

contract MilestonePaymentsProxyFactory is Ownable {
    address public implementationContract;
    address[] public allClones;

    event NewClone(address _clone);

    constructor(address _implementation) {
        implementationContract = _implementation;
    }

    function createNewAgreement(
        bytes32 _merkleRoot,
        address _token,
        uint32 _period,
        address _mediator
    ) external returns (address instance) {
        instance = Clones.clone(implementationContract);
        (bool success, ) = instance.call(
            abi.encodeWithSignature(
                "initialize(bytes32,address,uint32,address)",
                _merkleRoot,
                _token,
                _period,
                _mediator
            )
        );
        if (!success) revert CloneFailure();

        allClones.push(instance);
        emit NewClone(instance);
        return instance;
    }
}
