// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

library Signatures {
    using ECDSA for bytes32;

    function getMessageHash(string calldata _email, address _account)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_email, _account));
    }

    // Signatures for EOA
    function getEthSignedMessageHash(bytes32 _messageHash)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes calldata _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function verify(
        string calldata _email,
        address _account,
        bytes calldata signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_email, _account);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address signer = recoverSigner(ethSignedMessageHash, signature);

        return signer == _account;
    }

    // Signatures for MultiSigs
    // https://eips.ethereum.org/EIPS/eip-1271

    function isValidSignature(
        string calldata _email,
        address _account,
        bytes memory _signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_email, _account);
        address signer = messageHash.recover(_signature);
        return (signer == _account);
        // ERC1271-compliant multisigs will return MAGICVALUE if valid
        // // bytes4(keccak256("isValidSignature(bytes32,bytes)")
        // bytes4 internal constant MAGICVALUE = 0x1626ba7e;
    }
}
