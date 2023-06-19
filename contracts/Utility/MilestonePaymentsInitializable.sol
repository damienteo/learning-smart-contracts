// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

error FullyClaimed();
error NotInMerkle();
error InvalidMilestone();
error InvalidPeriod();
error NotMediator();

contract MilestonePaymentsInitializable is Initializable {
    using SafeERC20 for IERC20;

    event Claimed(address claimant, uint256 balance);
    event MerkelRootUpdated(bytes32 oldMerkleRoot, bytes32 newMerkleRoot);
    event MilestoneUpdated(uint32 newMilestone);
    event PeriodUpdated(uint32 newPeriod);

    bytes32 public merkleRoot;
    uint32 public period; // in months (Largest value: 2^32 - 1 = 4,294,967,295)
    uint32 public milestone; // current month
    address public mediator;
    IERC20 public token;

    mapping(address => uint256) public cumulativeClaimed;

    function initialize(
        bytes32 _merkleRoot,
        IERC20 _token,
        uint32 _period,
        address _mediator
    ) public initializer {
        if (_period < 1) revert InvalidPeriod();

        merkleRoot = _merkleRoot;
        token = _token;
        period = _period;
        mediator = _mediator;
    }

    modifier onlyMediator() {
        if (msg.sender != mediator) revert NotMediator();
        _;
    }

    function getClaimableAmount(
        address to,
        uint256 totalClaim,
        bytes32[] calldata proof,
        uint256 prevClaimed
    ) internal view returns (uint256 toClaim) {
        if (prevClaimed >= totalClaim) revert FullyClaimed();

        if (milestone < 1) revert InvalidMilestone();

        bytes32 leaf = keccak256(abi.encodePacked(to, totalClaim));
        bool isValidLeaf = MerkleProof.verify(proof, merkleRoot, leaf);
        if (!isValidLeaf) revert NotInMerkle();

        unchecked {
            // https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/integer-division/
            uint256 nextClaim = (totalClaim * milestone) / period;

            if (nextClaim == prevClaimed) revert FullyClaimed();

            toClaim = nextClaim - prevClaimed;
        }
    }

    function claim(
        address to,
        uint256 totalClaim,
        bytes32[] calldata proof
    ) external {
        uint256 claimed = cumulativeClaimed[to];
        uint256 toClaim = getClaimableAmount(to, totalClaim, proof, claimed);

        unchecked {
            cumulativeClaimed[to] = claimed + toClaim;
        }

        token.safeTransfer(to, toClaim);
        emit Claimed(to, toClaim);
    }

    function getNextClaim(
        address to,
        uint256 totalClaim,
        bytes32[] calldata proof
    ) public view returns (uint256 nextClaim) {
        uint256 claimed = cumulativeClaimed[to];
        nextClaim = getClaimableAmount(to, totalClaim, proof, claimed);
    }

    function setMilestone(uint32 _milestone) external onlyMediator {
        if (_milestone > period) revert InvalidMilestone();

        emit MilestoneUpdated(_milestone);
        milestone = _milestone;
    }

    function setPeriod(uint32 _period) external onlyMediator {
        if (_period < milestone) revert InvalidPeriod();

        emit PeriodUpdated(_period);
        period = _period;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyMediator {
        emit MerkelRootUpdated(merkleRoot, _merkleRoot);
        merkleRoot = _merkleRoot;
    }
}
