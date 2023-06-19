// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// Ref: https://github.com/authereum/is-valid-signature/blob/f55e2e8a1e1b1adcbaec0add00a724f33a66f40a/contracts/AccountMock.sol

interface IERC1271 {
    function isValidSignature(
        bytes32 _messageHash,
        bytes memory _signature
    ) external view returns (bytes4 magicValue);
}

contract MockERC1271 is IERC1271 {
    using ECDSA for bytes32;

    address public owner;

    // bytes4(keccak256("isValidSignature(bytes,bytes)")
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;
    bytes4 internal constant INVALID_SIGNATURE = 0xffffffff;

    constructor(address _owner) {
        owner = _owner;
    }

    function isValidSignature(
        bytes32 _messageHash,
        bytes memory _signature
    ) public view override returns (bytes4 magicValue) {
        address signer = _messageHash.recover(_signature);
        if (signer == owner) {
            return MAGICVALUE;
        } else {
            return INVALID_SIGNATURE;
        }
    }
}
