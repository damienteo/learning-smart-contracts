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

    return { basic721Token, owner, addr1, addr2, addr3, addr4 };
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
      basic721Token.safeMint(owner.address, firstTokenId);
      basic721Token.safeMint(owner.address, secondTokenId);

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
      basic721Token.safeMint(addr1.address, uri);

      expect(await basic721Token.ownerOf(firstTokenId)).to.equal(addr1.address);
    });

    it("reverts an error when tokenId is invalid/untracked", async function () {
      basic721Token.safeMint(addr1.address, uri);

      await expect(basic721Token.ownerOf(secondTokenId)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
    });
  });

  describe("transfers", async () => {});
});
