import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
const { expect } = require("chai");

const AMOUNT_TO_SEND = 50;
const NEXT_AMOUNT_TO_SEND = AMOUNT_TO_SEND + 1;
const TRANSFER_EVENT = "Transfer";

describe("Token contract", function () {
  async function deployTokenLoadFixture() {
    const Token = await ethers.getContractFactory("Token");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const hardhatToken = await Token.deploy();

    return { Token, hardhatToken, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenLoadFixture);
      expect(await hardhatToken.owner()).to.equal(owner.address);
    });

    it("Deployment should assign the total supply of tokens to the owner", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenLoadFixture);

      const ownerBalance = await hardhatToken.balanceOf(owner.address);

      expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const { hardhatToken, addr1, addr2 } = await loadFixture(
        deployTokenLoadFixture
      );

      await hardhatToken.transfer(addr1.address, AMOUNT_TO_SEND);
      expect(await hardhatToken.balanceOf(addr1.address)).to.equal(
        AMOUNT_TO_SEND
      );

      await hardhatToken.connect(addr1).transfer(addr2.address, AMOUNT_TO_SEND);
      expect(await hardhatToken.balanceOf(addr2.address)).to.equal(
        AMOUNT_TO_SEND
      );
      expect(await hardhatToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should update owner remaining supply after transfers", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenLoadFixture
      );

      await expect(
        hardhatToken.transfer(addr1.address, AMOUNT_TO_SEND)
      ).to.changeTokenBalances(
        hardhatToken,
        [owner, addr1],
        [-AMOUNT_TO_SEND, AMOUNT_TO_SEND]
      );

      await expect(
        hardhatToken.transfer(addr2.address, NEXT_AMOUNT_TO_SEND)
      ).to.changeTokenBalances(
        hardhatToken,
        [owner, addr2],
        [-NEXT_AMOUNT_TO_SEND, NEXT_AMOUNT_TO_SEND]
      );

      const resultingSupply =
        (await hardhatToken.totalSupply()) -
        AMOUNT_TO_SEND -
        NEXT_AMOUNT_TO_SEND;
      expect(await hardhatToken.balanceOf(owner.address)).to.equal(
        resultingSupply
      );
    });

    it("Should emit Transfer events", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenLoadFixture
      );

      await expect(hardhatToken.transfer(addr1.address, AMOUNT_TO_SEND))
        .to.emit(hardhatToken, TRANSFER_EVENT)
        .withArgs(owner.address, addr1.address, AMOUNT_TO_SEND);

      await expect(hardhatToken.transfer(addr2.address, NEXT_AMOUNT_TO_SEND))
        .to.emit(hardhatToken, TRANSFER_EVENT)
        .withArgs(owner.address, addr2.address, NEXT_AMOUNT_TO_SEND);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenLoadFixture
      );

      const initialOwnerBalance = await hardhatToken.balanceOf(owner.address);

      await expect(
        hardhatToken.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("Not enough tokens");

      expect(await hardhatToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });
  });
});
