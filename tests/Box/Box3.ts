import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const storedValue = 123;

describe("Box3", function () {
  async function deployBox3LoadFixture() {
    const Box3 = await ethers.getContractFactory("Box3");
    const [owner, addr1] = await ethers.getSigners();
    const Box3Instance = await upgrades.deployProxy(Box3, []);
    const box3Contract = await Box3Instance.deployed();

    return { box3Contract, owner, addr1 };
  }

  describe("when the Box3 store method is called", function () {
    it("should not return an error if the administrator makes a store transaction", async function () {
      const { box3Contract } = await loadFixture(deployBox3LoadFixture);
      await expect(box3Contract.store(1)).to.not.be.reverted;
    });

    it("should emit ValueChanged when store value is called", async function () {
      const { box3Contract } = await loadFixture(deployBox3LoadFixture);
      await expect(box3Contract.store(storedValue))
        .to.emit(box3Contract, "ValueChanged")
        .withArgs(storedValue);
    });

    // it("should return an error if a non-administrator makes a store transaction", async function () {
    //   const { box3Contract, addr1 } = await loadFixture(deployBox3LoadFixture);
    //   await expect(box3Contract.connect(addr1).store(1)).to.be.revertedWith(
    //     "Ownable: caller is not the owner"
    //   );
    // });
  });

  describe("when the Box3 retrieve method is called", function () {
    it("should return 0 when contract has just been deployed without any interaction", async function () {
      const { box3Contract } = await loadFixture(deployBox3LoadFixture);
      expect(await box3Contract.retrieve()).to.equal(0);
    });

    it("should return the correct value after the store method is called", async function () {
      const { box3Contract } = await loadFixture(deployBox3LoadFixture);

      await box3Contract.store(storedValue);
      // Note that we need to use strings to compare the 256 bit integers
      expect((await box3Contract.retrieve()).toString()).to.equal(
        storedValue.toString()
      );
    });
  });

  describe("Upgrades", function () {
    it("works before and after upgrading", async function () {
      const { box3Contract, owner } = await loadFixture(deployBox3LoadFixture);
      await box3Contract.store(storedValue);
      expect((await box3Contract.retrieve()).toString()).to.equal(
        storedValue.toString()
      );

      const Box3 = await ethers.getContractFactory("Box3");
      await upgrades.upgradeProxy(box3Contract.address, Box3);
      await box3Contract.increment();
      expect((await box3Contract.retrieve()).toString()).to.equal(
        (storedValue + 1).toString()
      );

      // Error: types/values length mismatch
      // When passing args into upgradeProxy
      // TODO: Figure out issue
      // const Box3V2 = await ethers.getContractFactory("Box3V2");
      // await upgrades.upgradeProxy(box3Contract.address, Box3V2, {
      //   constructorArgs: [owner.address],
      // });
      // await box3Contract.increment();
      // expect((await box3Contract.retrieve()).toString()).to.equal(
      //   (storedValue + 2).toString()
      // );
      // expect(await box3Contract.retrieveAdmin()).to.equal(storedValue + 2);
    });
  });
});
