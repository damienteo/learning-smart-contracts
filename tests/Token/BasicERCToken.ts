import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const INITIAL_SUPPLY = 10000;

describe("BasicERC20Token", function () {
  async function deployBasicERC20TokenLoadFixture() {
    const BasicERC20Token = await ethers.getContractFactory("BasicERC20Token");
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const basicERC20TokenContract = await BasicERC20Token.deploy(
      INITIAL_SUPPLY
    );

    return { basicERC20TokenContract, owner, addr1, addr2, addr3, addr4 };
  }

  describe("Deployment", function () {
    it("should have zero total supply at deployment", async function () {
      const { basicERC20TokenContract } = await loadFixture(
        deployBasicERC20TokenLoadFixture
      );

      const supply = await basicERC20TokenContract.totalSupply();
      const decimals = await basicERC20TokenContract.decimals();
      const nextSupply = parseFloat(ethers.utils.formatUnits(supply, decimals));

      expect(nextSupply).to.equal(INITIAL_SUPPLY);
    });
  });

  describe("Transfer", async function () {
    it("Should emit a Transfer event upon transfer", async function () {
      const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
        deployBasicERC20TokenLoadFixture
      );

      const from = owner.address;
      const to = addr1.address;
      const amount = 1000;

      await expect(basicERC20TokenContract.transfer(to, amount))
        .to.emit(basicERC20TokenContract, "Transfer")
        .withArgs(from, to, amount);
    });
  });
});
