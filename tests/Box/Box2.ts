import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Box2", function () {
  async function deployBox2LoadFixture() {
    const Box2 = await ethers.getContractFactory("Box2");
    const [owner, addr1] = await ethers.getSigners();
    const box2Contract = await Box2.deploy();

    return { box2Contract, owner, addr1 };
  }

  describe("when the Box2 store method is called", function () {
    it("should not return an error if the administrator makes a store transaction", async function () {
      const { box2Contract } = await loadFixture(deployBox2LoadFixture);
      await expect(box2Contract.store(1)).to.not.be.reverted;
    });

    it("should return an error if a non-administrator makes a store transaction", async function () {
      const { box2Contract, addr1 } = await loadFixture(deployBox2LoadFixture);
      await expect(box2Contract.connect(addr1).store(1)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("when the Box2 retrieve method is called", function () {
    it("should return 0 when contract has just been deployed without any interaction", async function () {
      const { box2Contract } = await loadFixture(deployBox2LoadFixture);
      expect(await box2Contract.retrieve()).to.equal(0);
    });

    it("should return the correct value after the store method is called", async function () {
      const { box2Contract } = await loadFixture(deployBox2LoadFixture);

      const storedValue = 123;

      await box2Contract.store(storedValue);
      // Note that we need to use strings to compare the 256 bit integers
      expect((await box2Contract.retrieve()).toString()).to.equal(
        storedValue.toString()
      );
    });
  });
});
