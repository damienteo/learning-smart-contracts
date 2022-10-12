import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import {
  TokenFarm,
  RewardToken,
  StakingToken,
} from "../../typechain-types/contracts/Farming";

const MINTING_AMOUNT: BigNumber = ethers.utils.parseEther("100");
const DURATION_CHANGE: number = 86400; // number of seconds in a day

describe("TokenFarm", () => {
  let tokenFarm: TokenFarm,
    rewardToken: RewardToken,
    stakingToken: StakingToken,
    owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress;

  beforeEach(async () => {
    const RewardTokenFactory = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardTokenFactory.deploy();

    const StakingTokenFactory = await ethers.getContractFactory("StakingToken");
    stakingToken = await StakingTokenFactory.deploy();

    const TokenFarmFactory = await ethers.getContractFactory("TokenFarm");
    tokenFarm = await TokenFarmFactory.deploy(
      rewardToken.address,
      stakingToken.address
    );

    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
  });

  describe("deployment", async () => {
    it("should not have staking balances for addresses", async () => {
      expect(await tokenFarm.stakingBalance(addr1.address)).to.equal(0);
    });

    it("should not have rewardToken balances for addresses", async () => {
      expect(await tokenFarm.rewardTokenBalance(addr1.address)).to.equal(0);
    });

    it("should not set isStaking to true for addresses", async () => {
      expect(await tokenFarm.isStaking(addr1.address)).to.equal(false);
    });
  });

  describe("staking", async () => {
    beforeEach(async () => {
      await stakingToken.mint(addr1.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr1)
        .approve(tokenFarm.address, MINTING_AMOUNT);

      await expect(tokenFarm.connect(addr1).stake(MINTING_AMOUNT)).not.to
        .reverted;
    });

    it("should update user's staking balance after staking", async () => {
      expect(await tokenFarm.stakingBalance(addr1.address)).to.equal(
        MINTING_AMOUNT
      );
    });

    it("should update user's isStaking to true after staking", async () => {
      expect(await tokenFarm.isStaking(addr1.address)).to.equal(true);
    });

    it("should emit a Stake event after staking", async () => {
      await stakingToken.mint(addr2.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr2)
        .approve(tokenFarm.address, MINTING_AMOUNT);

      await expect(tokenFarm.connect(addr2).stake(MINTING_AMOUNT))
        .to.emit(tokenFarm, "Staked")
        .withArgs(addr2.address, MINTING_AMOUNT);
    });

    it("should not accept staking if stakingAmount is more than balance", async () => {
      await stakingToken.mint(addr2.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr2)
        .approve(tokenFarm.address, MINTING_AMOUNT);

      const nextStakingAmount = MINTING_AMOUNT.add(1);

      await expect(
        tokenFarm.connect(addr2).stake(nextStakingAmount)
      ).to.be.revertedWith("You have insufficient tokens to stake");
    });

    it("should not accept staking from addresses without tokens", async () => {
      await expect(
        tokenFarm.connect(addr3).stake(MINTING_AMOUNT)
      ).to.be.revertedWith("You have insufficient tokens to stake");
    });

    it("should not accept staking from addresses without allowance approval", async () => {
      await stakingToken.mint(addr3.address, MINTING_AMOUNT);

      await expect(
        tokenFarm.connect(addr3).stake(MINTING_AMOUNT)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("should revert if staking amount is 0", async () => {
      await expect(tokenFarm.connect(addr3).stake(0)).to.be.revertedWith(
        "Amount must be more than zero."
      );
    });
  });

  describe("unstaking", () => {
    beforeEach(async () => {
      await stakingToken.mint(addr1.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr1)
        .approve(tokenFarm.address, MINTING_AMOUNT);

      await expect(tokenFarm.connect(addr1).stake(MINTING_AMOUNT)).not.to
        .reverted;
      await expect(tokenFarm.connect(addr1).unStake(MINTING_AMOUNT)).not.to
        .reverted;
    });

    it("should update user's staking balance after unstaking", async () => {
      expect(await tokenFarm.stakingBalance(addr1.address)).to.equal(0);
    });

    it("should update user's isStaking to false after un-staking", async () => {
      expect(await tokenFarm.isStaking(addr1.address)).to.equal(false);
    });

    it("should emit an Unstaked event after staking", async () => {
      await stakingToken.mint(addr2.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr2)
        .approve(tokenFarm.address, MINTING_AMOUNT);
      await tokenFarm.connect(addr2).stake(MINTING_AMOUNT);

      await expect(tokenFarm.connect(addr2).unStake(MINTING_AMOUNT))
        .to.emit(tokenFarm, "Unstaked")
        .withArgs(addr2.address, MINTING_AMOUNT);
    });

    it("should not accept staking if un-stakingAmount is more than staked balance", async () => {
      await stakingToken.mint(addr2.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr2)
        .approve(tokenFarm.address, MINTING_AMOUNT);
      await tokenFarm.connect(addr2).stake(MINTING_AMOUNT);

      const nextUnStakingAmount = MINTING_AMOUNT.add(1);
      await expect(
        tokenFarm.connect(addr2).unStake(nextUnStakingAmount)
      ).to.be.revertedWith("You have insufficient tokens to un-stake");
    });

    it("should not accept staking from addresses without tokens", async () => {
      await expect(
        tokenFarm.connect(addr3).unStake(MINTING_AMOUNT)
      ).to.be.revertedWith("You have insufficient tokens to un-stake");
    });

    it("should revert if un-staking amount is 0", async () => {
      await expect(tokenFarm.connect(addr3).stake(0)).to.be.revertedWith(
        "Amount must be more than zero."
      );
    });
  });

  describe("Withdraw yield", () => {
    beforeEach(async () => {
      await rewardToken.transferOwnership(tokenFarm.address);
      await stakingToken.mint(addr1.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr1)
        .approve(tokenFarm.address, MINTING_AMOUNT);

      await expect(tokenFarm.connect(addr1).stake(MINTING_AMOUNT)).not.to
        .reverted;
    });

    it("should return correct yield time", async () => {
      const startTime = await tokenFarm.startTime(addr1.address);
      expect(Number(startTime)).to.be.greaterThan(0);

      await time.increase(DURATION_CHANGE);
      const yieldTime = await tokenFarm.calculateYieldTime(addr1.address);
      expect(yieldTime).to.equal(DURATION_CHANGE);
    });

    it("should return the correct total yield", async () => {
      const days = 3;
      const timeChange = DURATION_CHANGE * days;
      await time.increase(timeChange);

      expect(await tokenFarm.calculateTotalYield(addr1.address)).to.equal(
        MINTING_AMOUNT.mul(days)
      );
    });

    it("should not revert when withdrawing yield", async () => {
      await expect(tokenFarm.connect(addr1).withdrawYield()).not.to.reverted;
    });

    it("should revert if user has no staking balance", async () => {
      await expect(tokenFarm.connect(addr2).withdrawYield()).to.be.revertedWith(
        "You have nothing to withdraw"
      );
    });

    it("should revert if user does not have yield to withdraw", async () => {
      await tokenFarm.connect(addr1).unStake(MINTING_AMOUNT);

      await expect(tokenFarm.connect(addr1).withdrawYield()).to.be.revertedWith(
        "You have nothing to withdraw"
      );
    });

    describe("impact of yield withdrawn", () => {
      let expectedYield: number;

      beforeEach(async () => {
        const days = 5;
        const timeChange = DURATION_CHANGE * days;
        await time.increase(timeChange);

        const totalYield = await tokenFarm.calculateTotalYield(addr1.address);
        expectedYield = Number(ethers.utils.formatEther(totalYield));

        await tokenFarm.connect(addr1).withdrawYield();
      });

      it("should mint the correct amount of reward tokens when withdrawing yield", async () => {
        const supply = await rewardToken.totalSupply();
        const nextSupply = Number(ethers.utils.formatEther(supply));

        expect(nextSupply).to.be.approximately(expectedYield, 0.0012);
      });

      it("should transfer the correct amount of tokens to the user who withdrew the yield", async () => {
        const balance = await rewardToken.balanceOf(addr1.address);
        const nextBalance = Number(ethers.utils.formatEther(balance));

        expect(nextBalance).to.be.approximately(expectedYield, 0.0012);
      });

      it("should update rewardTokenBalance after yield is withdrawn", async () => {
        const balance = await tokenFarm.rewardTokenBalance(addr1.address);

        expect(balance).to.equal(0);
      });
    });

    it("should emit a YieldWithdrawn event after withdrawing yield", async () => {
      await stakingToken.mint(addr2.address, MINTING_AMOUNT);
      await stakingToken
        .connect(addr2)
        .approve(tokenFarm.address, MINTING_AMOUNT);
      await tokenFarm.connect(addr2).stake(MINTING_AMOUNT);

      await expect(tokenFarm.connect(addr2).withdrawYield()).to.emit(
        tokenFarm,
        "YieldWithdrawn"
      );
    });
  });
});
