// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICumulativeMerkleDrop {
    event MerkelRootUpdated(bytes32 oldMerkleRoot, bytes32 newMerkleRoor);
    event Claimed(address indexed account, uint256 amount);

    function token() external view returns (address);

    function merkleRoot() external view returns (bytes32);

    function setMerkleRoot(bytes32 merkleRoot_) external;

    function claim(
        address account,
        uint256 cumulativeAmount,
        bytes32 expectedMerkleRoot,
        bytes32[] calldata merkleProof
    ) external;
}

contract CumulativeMerkleDrop is Ownable, ICumulativeMerkleDrop {
    using SafeERC20 for IERC20;

    address public immutable override token;

    bytes32 public override merkleRoot;

    mapping(address => uint256) public cumulativeClaimed;

    constructor(address token_) {
        token = token_;
    }

    function setMerkleRoot(bytes32 merkleRoot_) external override onlyOwner {
        emit MerkelRootUpdated(merkleRoot, merkleRoot_);
        merkleRoot = merkleRoot_;
    }

    function claim(
        address account,
        uint256 cumulativeAmount,
        bytes32 expectedMerkleRoot,
        bytes32[] calldata merkleProof
    ) external override {
        require(merkleRoot == expectedMerkleRoot, "INCORRECT_MERKLE_ROOT");

        bytes32 leaf = keccak256(abi.encodePacked(account, cumulativeAmount));

        require(
            _verifyAsm(merkleProof, expectedMerkleRoot, leaf),
            "INVALID_PROOF"
        );

        uint256 preclaimed = cumulativeClaimed[account];
        require(preclaimed < cumulativeAmount, "NOTHING_TO_CLAIM");
        cumulativeClaimed[account] = cumulativeAmount;

        unchecked {
            uint256 amount = cumulativeAmount - preclaimed;
            IERC20(token).safeTransfer(account, amount);
            emit Claimed(account, amount);
        }
    }

    function _verifyAsm(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) private pure returns (bool valid) {
        assembly {
            let ptr := proof.offset

            for {
                let end := add(ptr, mul(0x20, proof.length))
            } lt(ptr, end) {
                ptr := add(ptr, 0x20)
            } {
                let node := calldataload(ptr)

                switch lt(leaf, node)
                case 1 {
                    mstore(0x00, leaf)
                    mstore(0x20, node)
                }
                default {
                    mstore(0x00, node)
                    mstore(0x20, leaf)
                }

                leaf := keccak256(0x00, 0x40)
            }

            valid := eq(root, leaf)
        }
    }
}
