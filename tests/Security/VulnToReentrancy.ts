import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import {
  VulnToReentrancy,
  ReentrancyAttack,
} from "../../typechain-types/contracts/Security";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("VulnToReentrancy", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    VulnToReentrancyContract: VulnToReentrancy,
    ReentrancyAttackContract: ReentrancyAttack;

  const { provider } = ethers;

  beforeEach(async () => {
    const VulnToReentrancyFactory = await ethers.getContractFactory(
      "VulnToReentrancy"
    );
    VulnToReentrancyContract = await VulnToReentrancyFactory.deploy();

    const ReentrancyAttackFactory = await ethers.getContractFactory(
      "ReentrancyAttack"
    );
    ReentrancyAttackContract = await ReentrancyAttackFactory.deploy(
      VulnToReentrancyContract.address
    );

    [owner, addr1, addr2] = await ethers.getSigners();

    await VulnToReentrancyContract.depositFunds({
      value: ethers.utils.parseEther("10.0"),
    });
  });

  it("has initial balance of 10 eth", async function () {
    expect(
      await provider.getBalance(VulnToReentrancyContract.address)
    ).to.equal(ethers.utils.parseEther("10.0"));
  });

  it("allows normal withdrawal", async function () {
    await time.increase(3600 * 24 * 7); // Pass time by a week to bypass time limit

    await VulnToReentrancyContract.withdrawFunds(
      ethers.utils.parseEther("1.0")
    );

    expect(
      await provider.getBalance(VulnToReentrancyContract.address)
    ).to.equal(ethers.utils.parseEther("9.0"));
  });

  it("gets successfully drained by ReentrancyAttackContract via attackContract", async function () {
    await ReentrancyAttackContract.connect(addr1).fundContract({
      value: ethers.utils.parseEther("1.0"),
    });

    expect(
      await provider.getBalance(VulnToReentrancyContract.address)
    ).to.equal(ethers.utils.parseEther("11.0"));

    await time.increase(3600 * 24 * 7); // Pass time by a week to bypass time limit

    await ReentrancyAttackContract.connect(addr1).attackContract();

    expect(
      await provider.getBalance(VulnToReentrancyContract.address)
    ).to.equal(ethers.utils.parseEther("0"));
  });

  it("gets successfully drained by ReentrancyAttackContract via attackContractV2", async function () {
    await ReentrancyAttackContract.connect(addr1).fundContract({
      value: ethers.utils.parseEther("1.0"),
    });

    expect(
      await provider.getBalance(VulnToReentrancyContract.address)
    ).to.equal(ethers.utils.parseEther("11.0"));

    await time.increase(3600 * 24 * 7); // Pass time by a week to bypass time limit

    await ReentrancyAttackContract.connect(addr1).attackContractV2();

    expect(
      await provider.getBalance(VulnToReentrancyContract.address)
    ).to.equal(ethers.utils.parseEther("0"));
  });
});
