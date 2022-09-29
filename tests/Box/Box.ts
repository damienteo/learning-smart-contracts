import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Box", function () {
  async function deployBoxLoadFixture() {
    const Box = await ethers.getContractFactory("Box");
    const [owner, addr1] = await ethers.getSigners();
    const boxContract = await Box.deploy();

    return { boxContract, owner, addr1 };
  }

  describe("when the Box store method is called", function () {
    it("should not return an error if the administrator makes a store transaction", async function () {
      const { boxContract } = await loadFixture(deployBoxLoadFixture);
      await expect(boxContract.store(1)).to.not.be.reverted;
    });

    it("should return an error if a non-administrator makes a store transaction", async function () {
      const { boxContract, addr1 } = await loadFixture(deployBoxLoadFixture);
      await expect(boxContract.connect(addr1).store(1)).to.be.revertedWith(
        "Unauthorised"
      );
    });
  });

  describe("when the Box retrieve method is called", function () {
    it("should return 0 when contract has just been deployed without any interaction", async function () {
      const { boxContract } = await loadFixture(deployBoxLoadFixture);
      expect(await boxContract.retrieve()).to.equal(0);
    });

    it("should return the correct value after the store method is called", async function () {
      const { boxContract } = await loadFixture(deployBoxLoadFixture);

      const storedValue = 123;

      await boxContract.store(storedValue);
      expect(await boxContract.retrieve()).to.equal(storedValue);
    });
  });
});
