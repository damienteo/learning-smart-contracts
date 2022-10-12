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
    it("should initialise contracts", async () => {
      expect(await rewardToken).to.be.ok;
      expect(await stakingToken).to.be.ok;
      expect(await tokenFarm).to.be.ok;
    });

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
    });

    it("should accept the staking token", async () => {
      await expect(tokenFarm.connect(addr1).stake(MINTING_AMOUNT)).not.to
        .reverted;
    });

    it("should update user's staking balance after staking", async () => {
      await tokenFarm.connect(addr1).stake(MINTING_AMOUNT);
      expect(await tokenFarm.stakingBalance(addr1.address)).to.equal(
        MINTING_AMOUNT
      );
    });

    it("should update user's isStaking to true after staking", async () => {
      await tokenFarm.connect(addr1).stake(MINTING_AMOUNT);
      expect(await tokenFarm.isStaking(addr1.address)).to.equal(true);
    });

    it("should not accept staking from addresses without tokens", async () => {
      await expect(
        tokenFarm.connect(addr2).stake(MINTING_AMOUNT)
      ).to.be.revertedWith("You have insufficient tokens to stake");
    });

    it("should not accept staking from addresses without allowance approval", async () => {
      await stakingToken.mint(addr2.address, MINTING_AMOUNT);

      await expect(
        tokenFarm.connect(addr2).stake(MINTING_AMOUNT)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("should not revert if staking amount is 0", async () => {
      await expect(tokenFarm.connect(addr1).stake(0)).to.be.revertedWith(
        "Amount must be more than zero."
      );
    });
  });
});
