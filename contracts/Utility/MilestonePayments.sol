// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error FullyClaimed();
error NotInMerkle();

contract MilestonePayments is Ownable {
    using SafeERC20 for IERC20;

    event Claimed(address claimant, uint256 balance);
    event MerkelRootUpdated(bytes32 oldMerkleRoot, bytes32 newMerkleRoot);

    bytes32 public merkleRoot;
    IERC20 public token;
    mapping(address => uint256) public cumulativeClaimed;

    constructor(bytes32 _merkleRoot, IERC20 _token) {
        merkleRoot = _merkleRoot;
        token = _token;
    }

    function setMerkleRoot(bytes32 merkleRoot_) external onlyOwner {
        emit MerkelRootUpdated(merkleRoot, merkleRoot_);
        merkleRoot = merkleRoot_;
    }

    function claim(
        address to,
        uint256 totalClaim,
        bytes32[] calldata proof
    ) external {
        bytes32 leaf = keccak256(abi.encodePacked(to, totalClaim));
        bool isValidLeaf = MerkleProof.verify(proof, merkleRoot, leaf);
        if (!isValidLeaf) revert NotInMerkle();

        uint256 claimed = cumulativeClaimed[to];
        if (claimed >= totalClaim) revert FullyClaimed();

        cumulativeClaimed[to] = totalClaim;

        unchecked {
            uint256 toClaim = totalClaim - claimed;
            token.safeTransfer(to, toClaim);
            emit Claimed(to, toClaim);
        }
    }
}
