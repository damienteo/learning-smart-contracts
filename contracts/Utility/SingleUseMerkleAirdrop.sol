// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// TODO: Confirm if burn after a year?

error AlreadyClaimed();
error NotInMerkle();

contract SingleUseMerkleAirdrop is Ownable {
    using SafeERC20 for IERC20;

    event Claimed(address claimant, uint256 balance);

    bytes32 public immutable merkleRoot;
    IERC20 public token;
    mapping(address => bool) public hasClaimed;

    constructor(bytes32 _merkleRoot, IERC20 _token) {
        merkleRoot = _merkleRoot;
        token = _token;
    }

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

        token.safeTransfer(to, amount);

        emit Claimed(to, amount);
    }
}
