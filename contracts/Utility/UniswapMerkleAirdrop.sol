// Ref: https://github.com/Anish-Agnihotri/merkle-airdrop-starter/blob/master/contracts/src/MerkleClaimERC20.sol

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MerkleClaimERC20 is ERC20 {
    bytes32 public immutable merkleRoot;

    mapping(address => bool) public hasClaimed;

    error AlreadyClaimed();
    error NotInMerkle();

    constructor(
        string memory _name,
        string memory _symbol,
        bytes32 _merkleRoot
    ) ERC20(_name, _symbol) {
        merkleRoot = _merkleRoot;
    }

    event Claim(address indexed to, uint256 amount);

    function claim(
        address to,
        uint256 amount,
        bytes32[] calldata proof
    ) external {
        if (hasClaimed[to]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(abi.encodePacked(to, amount));
        bool isValidLeaf = MerkleProof.verify(proof, merkleRoot, leaf);

        if (!isValidLeaf) revert NotInMerkle();

        hasClaimed[to] = true;

        _mint(to, amount);

        emit Claim(to, amount);
    }
}
