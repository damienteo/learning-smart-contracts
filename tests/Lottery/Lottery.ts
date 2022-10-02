import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Lottery", function () {
  async function deployLotteryLoadFixture() {
    const Lottery = await ethers.getContractFactory("Lottery");
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const lotteryContract = await Lottery.deploy();

    return { lotteryContract, owner, addr1, addr2, addr3, addr4 };
  }

  describe("Deployment", function () {
    it("should set the owner as the manager", async function () {
      const { lotteryContract, owner } = await loadFixture(
        deployLotteryLoadFixture
      );

      expect(await lotteryContract.manager()).to.equal(owner.address);
    });
  });

  describe("Entering Lottery", function () {
    it("should not allow a account to enter if funds are not sent in the transaction", async function () {
      const { lotteryContract, addr1 } = await loadFixture(
        deployLotteryLoadFixture
      );

      await expect(lotteryContract.connect(addr1).enter()).to.revertedWith(
        "0.01 ether required"
      );
    });

    it("should not allow a account to enter if insufficient funds are sent in the transaction", async function () {
      const { lotteryContract, owner, addr1 } = await loadFixture(
        deployLotteryLoadFixture
      );

      await expect(
        lotteryContract
          .connect(addr1)
          .enter({ value: ethers.utils.parseEther("0.009") })
      ).to.revertedWith("0.01 ether required");
    });

    it("should allow one account to enter", async function () {
      const { lotteryContract, addr1 } = await loadFixture(
        deployLotteryLoadFixture
      );

      expect((await lotteryContract.getPlayers()).length).to.equal(0);

      await lotteryContract
        .connect(addr1)
        .enter({ value: ethers.utils.parseEther("0.01") });

      expect((await lotteryContract.getPlayers()).length).to.equal(1);
    });

    it("should allow multiple accounts to enter", async function () {
      const { lotteryContract, addr1, addr2, addr3, addr4 } = await loadFixture(
        deployLotteryLoadFixture
      );

      expect((await lotteryContract.getPlayers()).length).to.equal(0);

      await lotteryContract
        .connect(addr1)
        .enter({ value: ethers.utils.parseEther("0.01") });

      await lotteryContract
        .connect(addr2)
        .enter({ value: ethers.utils.parseEther("0.01") });

      await lotteryContract
        .connect(addr3)
        .enter({ value: ethers.utils.parseEther("0.01") });

      await lotteryContract
        .connect(addr4)
        .enter({ value: ethers.utils.parseEther("0.01") });

      expect((await lotteryContract.getPlayers()).length).to.equal(4);
    });
  });

  describe("Pick Winner", function () {
    it("Should allow only the manager to pick the winner", async function () {
      const { lotteryContract, addr1 } = await loadFixture(
        deployLotteryLoadFixture
      );

      await expect(lotteryContract.connect(addr1).pickWinner()).to.revertedWith(
        "Only manager can pick winner"
      );
    });

    it("Should send winnings to the winner", async function () {
      const { lotteryContract, addr1 } = await loadFixture(
        deployLotteryLoadFixture
      );

      const initialBalance = parseInt(
        ethers.utils.formatEther(await addr1.getBalance())
      );
      const sentValue = "1000";

      await lotteryContract
        .connect(addr1)
        .enter({ value: ethers.utils.parseEther(sentValue) });

      const nextBalance = parseInt(
        ethers.utils.formatEther(await addr1.getBalance())
      );

      expect(initialBalance).to.be.greaterThan(nextBalance);

      await lotteryContract.pickWinner();
      const winningBalance = parseInt(
        ethers.utils.formatEther(await addr1.getBalance())
      );
      const nextDifference = initialBalance - winningBalance;

      expect(nextDifference).to.be.lessThan(parseInt(sentValue));
    });
  });
});
