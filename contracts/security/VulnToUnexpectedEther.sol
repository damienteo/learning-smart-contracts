// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract VulnToUnexpectedEther {
    uint256 public payoutMileStone1 = 3 ether;
    uint256 public mileStone1Reward = 2 ether;
    uint256 public payoutMileStone2 = 5 ether;
    uint256 public mileStone2Reward = 3 ether;
    uint256 public finalMileStone = 10 ether;
    uint256 public finalReward = 5 ether;
    // Fix is by introducing a new variable, such as uint public depositedWei;
    // Instead of comparing against address(this).balance for milestones, comparisons can be made against depositedWei

    mapping(address => uint256) redeemableEther;

    function play() public payable {
        require(msg.value == 0.5 ether, "INCORRECT_SENT_VALUE");
        uint256 currentBalance = address(this).balance;
        require(currentBalance <= finalMileStone, "END_GAME_REACHED");
        if (currentBalance == payoutMileStone1) {
            redeemableEther[msg.sender] += mileStone1Reward;
        } else if (currentBalance == payoutMileStone2) {
            redeemableEther[msg.sender] += mileStone2Reward;
        } else if (currentBalance == finalMileStone) {
            redeemableEther[msg.sender] += finalReward;
        }
        return;
    }

    function claimReward() public {
        require(
            address(this).balance == finalMileStone,
            "NOT_AT_FINAL_MILESTONE"
        );
        require(redeemableEther[msg.sender] > 0, "NO_REWARD");

        uint256 transferValue = redeemableEther[msg.sender];
        redeemableEther[msg.sender] = 0;
        payable(msg.sender).transfer(transferValue);
    }
}
