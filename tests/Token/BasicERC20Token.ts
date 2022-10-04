import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const name = "BasicERC20Token";
const symbol = "BET";
const INITIAL_SUPPLY = 10000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("BasicERC20Token", function () {
  async function deployBasicERC20TokenLoadFixture() {
    const BasicERC20Token = await ethers.getContractFactory("BasicERC20Token");
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const basicERC20TokenContract = await BasicERC20Token.deploy(
      INITIAL_SUPPLY
    );

    return { basicERC20TokenContract, owner, addr1, addr2, addr3, addr4 };
  }

  //================================================================================
  // Deployment
  //================================================================================

  describe("Deployment", function () {
    it("should have deployed total supply at deployment", async function () {
      const { basicERC20TokenContract } = await loadFixture(
        deployBasicERC20TokenLoadFixture
      );

      const supply = await basicERC20TokenContract.totalSupply();
      const decimals = await basicERC20TokenContract.decimals();
      const nextSupply = parseFloat(ethers.utils.formatUnits(supply, decimals));

      expect(nextSupply).to.equal(INITIAL_SUPPLY);
    });

    it("should have a name", async function () {
      const { basicERC20TokenContract } = await loadFixture(
        deployBasicERC20TokenLoadFixture
      );

      expect(await basicERC20TokenContract.name()).to.equal(name);
    });

    it("should have a symbol", async function () {
      const { basicERC20TokenContract } = await loadFixture(
        deployBasicERC20TokenLoadFixture
      );

      expect(await basicERC20TokenContract.symbol()).to.equal(symbol);
    });

    it("should have decimals", async function () {
      const { basicERC20TokenContract } = await loadFixture(
        deployBasicERC20TokenLoadFixture
      );

      expect(await basicERC20TokenContract.decimals()).to.equal(18);
    });
  });

  describe("Approvals", function () {
    //================================================================================
    // Increasing Allowance
    //================================================================================

    describe("Increasing Allowance", function () {
      it("increases the approvee's balance by the requested amount when there was previously an approved amount", async function () {
        const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
          deployBasicERC20TokenLoadFixture
        );

        const prevAmount = 1;
        const nextAmount = 2;

        basicERC20TokenContract.approve(addr1.address, prevAmount, {
          from: owner.address,
        });

        await basicERC20TokenContract.increaseAllowance(
          addr1.address,
          nextAmount,
          {
            from: owner.address,
          }
        );

        expect(
          await basicERC20TokenContract.allowance(owner.address, addr1.address)
        ).to.equal(prevAmount + nextAmount);
      });

      it("increases the approvee's balance by the requested amount when there was no previous approved amount", async function () {
        const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
          deployBasicERC20TokenLoadFixture
        );

        const nextAmount = 2;

        await basicERC20TokenContract.increaseAllowance(
          addr1.address,
          nextAmount,
          {
            from: owner.address,
          }
        );

        expect(
          await basicERC20TokenContract.allowance(owner.address, addr1.address)
        ).to.equal(nextAmount);
      });

      it("emits an approval event", async function () {
        const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
          deployBasicERC20TokenLoadFixture
        );

        await expect(
          basicERC20TokenContract.increaseAllowance(
            addr1.address,
            INITIAL_SUPPLY,
            { from: owner.address }
          )
        )
          .to.emit(basicERC20TokenContract, "Approval")
          .withArgs(owner.address, addr1.address, INITIAL_SUPPLY);
      });
    });

    //================================================================================
    // Decreasing Allowance
    //================================================================================

    describe("Decreasing Allowance", function () {
      describe("When there was no previously approved amounts", function () {
        it("Should revert even if there is sufficient balance", async function () {
          const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
            deployBasicERC20TokenLoadFixture
          );

          await expect(
            basicERC20TokenContract.decreaseAllowance(
              addr1.address,
              INITIAL_SUPPLY,
              { from: owner.address }
            )
          ).to.be.revertedWith("ERC20: decreased allowance below zero");
        });

        it("Should revert when there is insufficient balance", async function () {
          const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
            deployBasicERC20TokenLoadFixture
          );

          await expect(
            basicERC20TokenContract.decreaseAllowance(
              addr1.address,
              INITIAL_SUPPLY + 1,
              { from: owner.address }
            )
          ).to.be.revertedWith("ERC20: decreased allowance below zero");
        });
      });

      describe("When there was an approved amount", function () {
        it("decreases the approvee's balance by the requested amount", async function () {
          const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
            deployBasicERC20TokenLoadFixture
          );

          basicERC20TokenContract.approve(addr1.address, INITIAL_SUPPLY, {
            from: owner.address,
          });

          const resultingAllowance = 1;

          await basicERC20TokenContract.decreaseAllowance(
            addr1.address,
            INITIAL_SUPPLY - resultingAllowance,
            { from: owner.address }
          );

          expect(
            await basicERC20TokenContract.allowance(
              owner.address,
              addr1.address
            )
          ).to.equal(resultingAllowance);
        });

        it("reverts if requested decrease is more than available allowance", async function () {
          const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
            deployBasicERC20TokenLoadFixture
          );

          basicERC20TokenContract.approve(addr1.address, INITIAL_SUPPLY, {
            from: owner.address,
          });

          await expect(
            basicERC20TokenContract.decreaseAllowance(
              addr1.address,
              INITIAL_SUPPLY + 1,
              { from: owner.address }
            )
          ).to.be.revertedWith("ERC20: decreased allowance below zero");
        });

        it("emits an approval event", async function () {
          const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
            deployBasicERC20TokenLoadFixture
          );

          basicERC20TokenContract.approve(addr1.address, INITIAL_SUPPLY, {
            from: owner.address,
          });

          await expect(
            basicERC20TokenContract.decreaseAllowance(
              addr1.address,
              INITIAL_SUPPLY,
              { from: owner.address }
            )
          )
            .to.emit(basicERC20TokenContract, "Approval")
            .withArgs(owner.address, addr1.address, 0);
        });

        it("reverts when approvee is zero address", async function () {
          const { basicERC20TokenContract, owner, addr1 } = await loadFixture(
            deployBasicERC20TokenLoadFixture
          );

          await expect(
            basicERC20TokenContract.decreaseAllowance(
              ZERO_ADDRESS,
              INITIAL_SUPPLY,
              { from: owner.address }
            )
          ).to.be.revertedWith("ERC20: decreased allowance below zero");
        });
      });
    });
  });

  //================================================================================
  // Transfer
  //================================================================================

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
