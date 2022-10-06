import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const ERC20_TOKEN_RATIO = 5;
const NFT_TOKEN_PRICE = 5;
const TOKEN_ID = 1;

describe("NewTokenSale", () => {
  async function deployNewTokenSaleLoadFixture() {
    const NewERC20Token = await ethers.getContractFactory("NewERC20Token");
    const newERC20Contract = await NewERC20Token.deploy();

    const NewERC721Token = await ethers.getContractFactory("NewERC721Token");
    const newERC721Contract = await NewERC721Token.deploy();

    const NewTokenSale = await ethers.getContractFactory("NewTokenSale");
    const newTokenSaleContract = await NewTokenSale.deploy(
      ERC20_TOKEN_RATIO,
      NFT_TOKEN_PRICE,
      newERC20Contract.address,
      newERC721Contract.address
    );

    const TOKEN_MINTER_ROLE = await newERC20Contract.MINTER_ROLE();
    const grantTokenRoleTx = await newERC20Contract.grantRole(
      TOKEN_MINTER_ROLE,
      newTokenSaleContract.address
    );
    await grantTokenRoleTx.wait();

    const NFT_MINTER_ROLE = await newERC721Contract.MINTER_ROLE();
    const grantNFToleTx = await newERC721Contract.grantRole(
      NFT_MINTER_ROLE,
      newTokenSaleContract.address
    );
    await grantNFToleTx.wait();

    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    return {
      newTokenSaleContract,
      newERC20Contract,
      newERC721Contract,
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
    const amountToBeReceived = amountToBeSent.div(ERC20_TOKEN_RATIO);
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
      amountToBeReceived,
    };
  }

  async function deployNewTokenSaleWithPurchaseAndAllowLoadFixture() {
    const {
      newTokenSaleContract,
      newERC20Contract,
      addr1,
      amountToBeSent,
      ...rest
    } = await loadFixture(deployNewTokenSaleWithPurchaseLoadFixture);

    const allowTransaction = await newERC20Contract
      .connect(addr1)
      .approve(newTokenSaleContract.address, amountToBeSent);
    const allowTransactionReceipt = await allowTransaction.wait();
    const allowGasUnitsUsed = allowTransactionReceipt.gasUsed;
    const allowGasPrice = allowTransactionReceipt.effectiveGasPrice;
    const allowGasCost = allowGasUnitsUsed.mul(allowGasPrice);

    return {
      newTokenSaleContract,
      newERC20Contract,
      addr1,
      amountToBeSent,
      ...rest,
      allowGasCost,
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
        deployNewTokenSaleWithPurchaseLoadFixture
      );

      const prevBalance = await addr1.getBalance();

      const purchaseAmount = 2.5;

      const amountToBeSent = ethers.utils.parseEther(purchaseAmount.toString());
      const purchaseTokensTx = await newTokenSaleContract
        .connect(addr1)
        .purchaseTokens({
          value: amountToBeSent,
        });
      const purchaseTokensReceipt = await purchaseTokensTx.wait();
      const gasUnitsUsed = purchaseTokensReceipt.gasUsed;
      const gasPrice = purchaseTokensReceipt.effectiveGasPrice;
      const gasCost = gasUnitsUsed.mul(gasPrice);

      const nextBalance = await addr1.getBalance();

      const diff = prevBalance.sub(nextBalance);

      expect(diff).to.be.equal(gasCost.add(amountToBeSent));

      // const difference =
      //   parseFloat(ethers.utils.formatUnits(prevBalance)) -
      //   parseFloat(ethers.utils.formatUnits(nextBalance));

      // expect(difference).to.be.greaterThan(purchaseAmount);
      // expect(difference).to.be.lessThan(purchaseAmount + 0.0002);
    });

    it("gives the correct amount of tokens", async () => {
      const { newERC20Contract, addr1, amountToBeReceived } = await loadFixture(
        deployNewTokenSaleWithPurchaseLoadFixture
      );

      const balance = await newERC20Contract.balanceOf(addr1.address);
      expect(balance).to.equal(amountToBeReceived);
    });

    it("updates total supply with the correct amount of tokens", async () => {
      const { newERC20Contract, amountToBeSent } = await loadFixture(
        deployNewTokenSaleWithPurchaseLoadFixture
      );

      const supply = await newERC20Contract.totalSupply();
      expect(supply).to.equal(amountToBeSent.div(ERC20_TOKEN_RATIO));
    });

    it("increases the balance of Eth in the contract", async () => {
      const { newTokenSaleContract, amountToBeSent } = await loadFixture(
        deployNewTokenSaleWithPurchaseLoadFixture
      );

      const balance = await ethers.provider.getBalance(
        newTokenSaleContract.address
      );

      expect(balance).to.equal(amountToBeSent);
    });
  });

  describe("When a user burns an ERC20 at the Token contract", async () => {
    it("gives the correct amount of ETH", async () => {
      const {
        newTokenSaleContract,
        addr1,
        amountToBeSent, // This is in Eth
        amountToBeReceived, // This is in NET
      } = await loadFixture(deployNewTokenSaleWithPurchaseAndAllowLoadFixture);

      const balance = await addr1.getBalance();

      const burnTokensTx = await newTokenSaleContract
        .connect(addr1)
        .burnTokens(amountToBeReceived);
      const burnTokensReceipt = await burnTokensTx.wait();
      const burnGasUnitsUsed = burnTokensReceipt.gasUsed;
      const burnGasPrice = burnTokensReceipt.effectiveGasPrice;
      const burnGasCost = burnGasUnitsUsed.mul(burnGasPrice);

      const nextBalance = await addr1.getBalance();

      const diff = nextBalance.sub(balance);
      const diffWithoutGasCost = diff.add(burnGasCost);

      expect(diffWithoutGasCost).to.equal(amountToBeSent);
    });

    it("burns the correct amount of tokens", async () => {
      const {
        newTokenSaleContract,
        newERC20Contract,
        addr1,
        amountToBeReceived,
      } = await loadFixture(deployNewTokenSaleWithPurchaseAndAllowLoadFixture);
      const burnTokensTx = await newTokenSaleContract
        .connect(addr1)
        .burnTokens(amountToBeReceived);
      await burnTokensTx.wait();

      const balance = await newERC20Contract.balanceOf(addr1.address);
      expect(balance).to.equal(0);
    });

    it("should return an error if the user does not have sufficient tokens to burn", async () => {
      const { newTokenSaleContract, addr1, amountToBeReceived } =
        await loadFixture(deployNewTokenSaleWithPurchaseAndAllowLoadFixture);
      await expect(
        newTokenSaleContract
          .connect(addr1)
          .burnTokens(amountToBeReceived.add(1))
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("should return an error if the user did not give approval", async () => {
      const { newTokenSaleContract, addr1, amountToBeReceived } =
        await loadFixture(deployNewTokenSaleWithPurchaseLoadFixture);

      await expect(
        newTokenSaleContract.connect(addr1).burnTokens(amountToBeReceived)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("When a user purchase a NFT from the Shop contract", async () => {
    it("charges the correct amount of NET Tokens", async () => {
      const { newTokenSaleContract, newERC20Contract, addr1, amountToBeSent } =
        await loadFixture(deployNewTokenSaleWithPurchaseLoadFixture);

      const allowTransaction = await newERC20Contract
        .connect(addr1)
        .approve(newTokenSaleContract.address, amountToBeSent);
      await allowTransaction.wait();

      const prevBalance = await newERC20Contract.balanceOf(addr1.address);
      const purchaseNFTTx = await newTokenSaleContract
        .connect(addr1)
        .purchaseNFT(TOKEN_ID);
      await purchaseNFTTx.wait();
      const nextBalance = await newERC20Contract.balanceOf(addr1.address);
      const diff = prevBalance.sub(nextBalance);

      expect(diff).to.equal(NFT_TOKEN_PRICE);
    });
    it("updates the owner account correctly", async () => {
      const {
        newTokenSaleContract,
        newERC20Contract,
        newERC721Contract,
        addr1,
        amountToBeSent,
      } = await loadFixture(deployNewTokenSaleWithPurchaseLoadFixture);

      const allowTransaction = await newERC20Contract
        .connect(addr1)
        .approve(newTokenSaleContract.address, amountToBeSent);
      await allowTransaction.wait();

      const purchaseNFTTx = await newTokenSaleContract
        .connect(addr1)
        .purchaseNFT(TOKEN_ID);
      await purchaseNFTTx.wait();

      const owner = await newERC721Contract.ownerOf(TOKEN_ID);
      expect(owner).to.equal(addr1.address);

      const ownerBalance = await newERC721Contract.balanceOf(addr1.address);
      expect(ownerBalance).to.equal(1);
    });

    it("update the pool accounts correctly", async () => {
      const { newTokenSaleContract, newERC20Contract, addr1, amountToBeSent } =
        await loadFixture(deployNewTokenSaleWithPurchaseLoadFixture);

      const prevAdminPool = await newTokenSaleContract.adminPool();
      const prevPublicPool = await newTokenSaleContract.publicPool();

      expect(prevAdminPool).to.equal(0);
      expect(prevPublicPool).to.equal(0);

      const allowTransaction = await newERC20Contract
        .connect(addr1)
        .approve(newTokenSaleContract.address, amountToBeSent);
      await allowTransaction.wait();

      const purchaseNFTTx = await newTokenSaleContract
        .connect(addr1)
        .purchaseNFT(TOKEN_ID);
      await purchaseNFTTx.wait();

      const nextAdminPool = await newTokenSaleContract.adminPool();
      const nextPublicPool = await newTokenSaleContract.publicPool();

      const charge = Math.floor(NFT_TOKEN_PRICE / 2);

      expect(nextAdminPool).to.equal(NFT_TOKEN_PRICE - charge);
      expect(nextPublicPool).to.equal(charge);
    });

    it("favors the admin pool with the rounding", async () => {
      const { newTokenSaleContract, newERC20Contract, addr1, amountToBeSent } =
        await loadFixture(deployNewTokenSaleWithPurchaseLoadFixture);

      const allowTransaction = await newERC20Contract
        .connect(addr1)
        .approve(newTokenSaleContract.address, amountToBeSent);
      await allowTransaction.wait();

      const purchaseNFTTx = await newTokenSaleContract
        .connect(addr1)
        .purchaseNFT(TOKEN_ID);
      await purchaseNFTTx.wait();

      const publicPool = await newTokenSaleContract.publicPool();
      const adminPool = await newTokenSaleContract.adminPool();

      expect(adminPool).to.be.greaterThan(publicPool);
    });
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
