//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "./RewardToken.sol";
import "./StakingToken.sol";

import "hardhat/console.sol";

contract TokenFarm {
    mapping(address => uint256) public stakingBalance;
    mapping(address => bool) public isStaking;
    mapping(address => uint256) public startTime;
    mapping(address => uint256) public rewardTokenBalance;

    RewardToken public rewardToken;
    StakingToken public stakingToken;

    modifier moreThanZero(uint256 amount) {
        require(amount > 0, "Amount must be more than zero.");
        _;
    }

    event Staked(address indexed from, uint256 amount);
    event Unstaked(address indexed from, uint256 amount);
    event YieldWithdrawn(address indexed to, uint256 amount);

    constructor(RewardToken _rewardToken, StakingToken _stakingToken) {
        rewardToken = _rewardToken;
        stakingToken = _stakingToken;
    }

    function stake(uint256 _amount) public moreThanZero(_amount) {
        require(
            stakingToken.balanceOf(msg.sender) >= _amount,
            "You have insufficient tokens to stake"
        );

        if (isStaking[msg.sender] == true) {
            uint256 yieldToTransfer = calculateTotalYield(msg.sender);
            rewardTokenBalance[msg.sender] += yieldToTransfer;
        }

        stakingToken.transferFrom(msg.sender, address(this), _amount);
        stakingBalance[msg.sender] += _amount;
        startTime[msg.sender] = block.timestamp;
        isStaking[msg.sender] = true;

        emit Staked(msg.sender, _amount);
    }

    function unStake(uint256 _amount) public moreThanZero(_amount) {
        require(
            isStaking[msg.sender] == true &&
                stakingBalance[msg.sender] >= _amount,
            "You have insufficient tokens to un-stake"
        );

        uint256 yieldToTransfer = calculateTotalYield(msg.sender);
        startTime[msg.sender] = block.timestamp;

        uint256 balanceTransfer = _amount;
        _amount = 0;
        stakingBalance[msg.sender] -= balanceTransfer;
        stakingToken.transfer(msg.sender, balanceTransfer);

        rewardTokenBalance[msg.sender] += yieldToTransfer;

        if (stakingBalance[msg.sender] == 0) {
            isStaking[msg.sender] = false;
        }

        emit Unstaked(msg.sender, balanceTransfer);
    }

    function withdrawYield() public {
        uint256 yieldToTransfer = calculateTotalYield(msg.sender);

        require(
            yieldToTransfer > 0 || stakingBalance[msg.sender] > 0,
            "You have nothing to withdraw"
        );

        if (stakingBalance[msg.sender] > 0) {
            uint256 prevBalance = rewardTokenBalance[msg.sender];
            stakingBalance[msg.sender] = 0;
            yieldToTransfer += prevBalance;
        }

        startTime[msg.sender] = block.timestamp;
        rewardToken.mint(msg.sender, yieldToTransfer);

        emit YieldWithdrawn(msg.sender, yieldToTransfer);
    }

    function calculateYieldTime(address user)
        public
        view
        returns (uint256 totalTime)
    {
        uint256 end = block.timestamp;
        totalTime = end - startTime[user];
    }

    function calculateTotalYield(address user)
        public
        view
        returns (uint256 rawYield)
    {
        uint256 time = calculateYieldTime(user) * 10**18; // multiplication by 10 multipled by number of decimal because Solidity does not handle float
        uint256 rate = 86400; // number of seconds in a day
        uint256 timeRate = time / rate; // User receives 100% of their staked token every 24 hours
        rawYield = (stakingBalance[user] * timeRate) / 10**18;

        // TODO: Determine yield based on percentage of pool
        // TODO: Introduce other variables to determine yield rate
    }
}
