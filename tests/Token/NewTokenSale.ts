import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const ERC20_TOKEN_RATIO = 5;

describe("NewTokenSale", () => {
  async function deployNewTokenSaleLoadFixture() {
    const NewERC20Token = await ethers.getContractFactory("NewERC20Token");
    const newERC20Contract = await NewERC20Token.deploy();

    const NewTokenSale = await ethers.getContractFactory("NewTokenSale");
    const newTokenSaleContract = await NewTokenSale.deploy(
      ERC20_TOKEN_RATIO,
      newERC20Contract.address
    );

    const MINTER_ROLE = await newERC20Contract.MINTER_ROLE();
    const grantRoleTx = await newERC20Contract.grantRole(
      MINTER_ROLE,
      newTokenSaleContract.address
    );
    await grantRoleTx.wait();

    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    return {
      newTokenSaleContract,
      newERC20Contract,
      owner,
      addr1,
      addr2,
      addr3,
      addr4,
    };
  }

  async function deployNewTokenSaleWithPurchaseLoadFixture() {
    const { newTokenSaleContract, newERC20Contract, addr1, ...rest } =
      await loadFixture(deployNewTokenSaleLoadFixture);

    const amountToBeSent = ethers.utils.parseEther("1");
    const purchaseTokensTx = await newTokenSaleContract
      .connect(addr1)
      .purchaseTokens({
        value: amountToBeSent,
      });
    await purchaseTokensTx.wait();

    return {
      newTokenSaleContract,
      newERC20Contract,
      addr1,
      ...rest,
      amountToBeSent,
    };
  }

  describe("When the Shop contract is deployed", async () => {
    it("defines the ratio as provided in parameters", async () => {
      const { newTokenSaleContract } = await loadFixture(
        deployNewTokenSaleLoadFixture
      );

      expect(await newTokenSaleContract.ratio()).to.equal(ERC20_TOKEN_RATIO);
    });

    it("uses a valid ERC20 as payment token", async () => {
      const { newTokenSaleContract, newERC20Contract, owner } =
        await loadFixture(deployNewTokenSaleLoadFixture);

      const NewERC20Token = await ethers.getContractFactory("NewERC20Token");
      const tokenAddress = await newTokenSaleContract.paymentToken();
      expect(tokenAddress).to.equal(newERC20Contract.address);

      const NewERC20TokenContract = NewERC20Token.attach(tokenAddress);

      const balance = await NewERC20TokenContract.balanceOf(owner.address);
      expect(balance).to.equal(0);

      const supply = await NewERC20TokenContract.totalSupply();
      expect(supply).to.equal(0);
    });
  });

  describe("When a user purchase an ERC20 from the Token contract", async () => {
    it("charges the correct amount of ETH", async () => {
      const { newTokenSaleContract, addr1 } = await loadFixture(
        deployNewTokenSaleLoadFixture
      );

      const prevBalance = await addr1.getBalance();

      const purchaseAmount = 2.5;

      const amountToBeSent = ethers.utils.parseEther(purchaseAmount.toString());
      const purchaseTokensTx = await newTokenSaleContract
        .connect(addr1)
        .purchaseTokens({
          value: amountToBeSent,
        });
      await purchaseTokensTx.wait();

      const nextBalance = await addr1.getBalance();

      const difference =
        parseFloat(ethers.utils.formatUnits(prevBalance)) -
        parseFloat(ethers.utils.formatUnits(nextBalance));

      expect(difference).to.be.greaterThan(purchaseAmount);
      expect(difference).to.be.lessThan(purchaseAmount + 0.0002);
    });

    it("gives the correct amount of tokens", async () => {
      const { newERC20Contract, addr1, amountToBeSent } = await loadFixture(
        deployNewTokenSaleWithPurchaseLoadFixture
      );

      const balance = await newERC20Contract.balanceOf(addr1.address);
      expect(balance).to.equal(amountToBeSent.div(ERC20_TOKEN_RATIO));
    });

    it("updates total supply with the correct amount of tokens", async () => {
      const { newERC20Contract, amountToBeSent } = await loadFixture(
        deployNewTokenSaleWithPurchaseLoadFixture
      );

      const supply = await newERC20Contract.totalSupply();
      expect(supply).to.equal(amountToBeSent.div(ERC20_TOKEN_RATIO));
    });
  });

  describe("When a user burns an ERC20 at the Token contract", async () => {
    it("gives the correct amount of ETH", async () => {
      // const { newERC20Contract, addr1, amountToBeSent } = await loadFixture(
      //   deployNewTokenSaleWithPurchaseLoadFixture
      // );
      // const balance = await newERC20Contract.balanceOf(addr1.address);
      // const balanceToBurn = parseFloat(ethers.utils.formatUnits(balance)) / 2;
      // await newERC20Contract.balanceOf(addr1.address);
    });

    it("burns the correct amount of tokens", async () => {
      // const { newERC20Contract, addr1, amountToBeSent } = await loadFixture(
      //   deployNewTokenSaleWithPurchaseLoadFixture
      // );
      // const balance = await newERC20Contract.balanceOf(addr1.address);
      // expect(balance).to.equal(amountToBeSent.div(ERC20_TOKEN_RATIO));
    });
  });

  describe("When a user purchase a NFT from the Shop contract", async () => {
    // it("charges the correct amount of ETH", async () => {
    //   throw new Error("Not implemented");
    // });
    // it("updates the owner account correctly", async () => {
    //   throw new Error("Not implemented");
    // });
    // it("update the pool account correctly", async () => {
    //   throw new Error("Not implemented");
    // });
    // it("favors the pool with the rounding", async () => {
    //   throw new Error("Not implemented");
    // });
  });

  describe("When a user burns their NFT at the Shop contract", async () => {
    // it("gives the correct amount of ERC20 tokens", async () => {
    //   throw new Error("Not implemented");
    // });
    // it("updates the pool correctly", async () => {
    //   throw new Error("Not implemented");
    // });
  });

  describe("When the owner withdraw from the Shop contract", async () => {
    // it("recovers the right amount of ERC20 tokens", async () => {
    //   throw new Error("Not implemented");
    // });
    // it("updates the owner account correctly", async () => {
    //   throw new Error("Not implemented");
    // });
  });
});
