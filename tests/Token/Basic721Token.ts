import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ZERO_ADDRESS } from "../../constants/constants";

import { Basic721Token } from "../../typechain-types/contracts/Token";

const name = "Basic721Token";
const symbol = "B7T";

const uri = "1234";
const firstTokenId = "0";
const secondTokenId = "1";

describe("Basic721Token", function () {
  let basic721Token: Basic721Token,
    owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress;

  beforeEach(async () => {
    const Basic721TokenFactory = await ethers.getContractFactory(
      "Basic721Token"
    );
    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    basic721Token = await Basic721TokenFactory.deploy();
  });

  describe("Deployment", function () {
    it("should have a name", async function () {
      expect(await basic721Token.name()).to.equal(name);
    });

    it("should have a symbol", async function () {
      expect(await basic721Token.symbol()).to.equal(symbol);
    });
  });

  describe("Minting", function () {
    it("should return balance of 0 if no tokens had been minted", async function () {
      expect(await basic721Token.balanceOf(owner.address)).to.equal(0);
    });
    it("should return correct balanceOf after minting tokens", async function () {
      await basic721Token.safeMint(owner.address, firstTokenId);
      await basic721Token.safeMint(owner.address, secondTokenId);

      expect(await basic721Token.balanceOf(owner.address)).to.equal(2);
    });

    it("should revert for a zero address", async function () {
      await expect(basic721Token.balanceOf(ZERO_ADDRESS)).to.be.revertedWith(
        "ERC721: address zero is not a valid owner"
      );
    });
  });

  describe("Owner", function () {
    it("returns the tokenId owner", async function () {
      await basic721Token.safeMint(addr1.address, uri);

      expect(await basic721Token.ownerOf(firstTokenId)).to.equal(addr1.address);
    });

    it("reverts an error when tokenId is invalid/untracked", async function () {
      await basic721Token.safeMint(addr1.address, uri);

      await expect(basic721Token.ownerOf(secondTokenId)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
    });
  });

  describe("approvals", async () => {
    beforeEach(async () => {
      await basic721Token.safeMint(owner.address, firstTokenId);
      await basic721Token.safeMint(owner.address, secondTokenId);
    });

    it("has no token prior approvals", async () => {
      expect(await basic721Token.getApproved(firstTokenId)).to.equal(
        ZERO_ADDRESS
      );
    });

    it("sets approval accordingly", async () => {
      await basic721Token.approve(addr1.address, firstTokenId);

      expect(await basic721Token.getApproved(firstTokenId)).to.equal(
        addr1.address
      );
    });

    it("emits an Approval event", async () => {
      await expect(basic721Token.approve(addr1.address, firstTokenId))
        .to.emit(basic721Token, "Approval")
        .withArgs(owner.address, addr1.address, firstTokenId);
    });

    it("reverts an error if transfer is un-approved", async () => {
      await expect(
        basic721Token
          .connect(addr1)
          .transferFrom(owner.address, addr1.address, firstTokenId)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");
    });

    it("allows transfers upon approval", async () => {
      await basic721Token.approve(addr1.address, firstTokenId);
      await expect(
        basic721Token
          .connect(addr1)
          .transferFrom(owner.address, addr1.address, firstTokenId)
      ).not.to.reverted;
    });

    it("clears the approval for the tokenId after transfer", async () => {
      await basic721Token.approve(addr1.address, firstTokenId);
      await basic721Token
        .connect(addr1)
        .transferFrom(owner.address, addr1.address, firstTokenId);

      expect(await basic721Token.getApproved(firstTokenId)).to.equal(
        ZERO_ADDRESS
      );
    });
  });

  describe("transfers", async () => {
    beforeEach(async () => {
      await basic721Token.safeMint(owner.address, firstTokenId);
      await basic721Token.safeMint(owner.address, secondTokenId);

      await basic721Token.approve(addr1.address, firstTokenId);
      await basic721Token.setApprovalForAll(basic721Token.address, true, {
        from: owner.address,
      });
    });

    it("transfers ownership of the token", async () => {
      await basic721Token.transferFrom(
        owner.address,
        addr1.address,
        firstTokenId
      );

      expect(await basic721Token.ownerOf(firstTokenId)).to.equal(addr1.address);
    });

    it("emits Transfer event upon transfer", async () => {
      await expect(
        basic721Token.transferFrom(owner.address, addr1.address, firstTokenId)
      )
        .to.emit(basic721Token, "Transfer")
        .withArgs(owner.address, addr1.address, firstTokenId);
    });

    it("adjusts the owner's balances", async () => {
      expect(await basic721Token.balanceOf(owner.address)).to.equal(2);
      expect(await basic721Token.balanceOf(addr1.address)).to.equal(0);

      await basic721Token.transferFrom(
        owner.address,
        addr1.address,
        firstTokenId
      );

      expect(await basic721Token.balanceOf(owner.address)).to.equal(1);
      expect(await basic721Token.balanceOf(addr1.address)).to.equal(1);
    });
  });
});
