import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { ZERO_ADDRESS } from "../../constants/constants";

const name = "Basic721Token";
const symbol = "B7T";

const uri = "1234";
const firstTokenId = "0";
const secondTokenId = "1";

describe("Basic721Token", function () {
  async function deployBasic721TokenLoadFixture() {
    const Basic721Token = await ethers.getContractFactory("Basic721Token");
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const basic721TokenContract = await Basic721Token.deploy();

    return { basic721TokenContract, owner, addr1, addr2, addr3, addr4 };
  }

  describe("Deployment", function () {
    it("should have a name", async function () {
      const { basic721TokenContract } = await loadFixture(
        deployBasic721TokenLoadFixture
      );

      expect(await basic721TokenContract.name()).to.equal(name);
    });

    it("should have a symbol", async function () {
      const { basic721TokenContract } = await loadFixture(
        deployBasic721TokenLoadFixture
      );

      expect(await basic721TokenContract.symbol()).to.equal(symbol);
    });
  });

  describe("Minting", function () {
    it("should return balance of 0 if no tokens had been minted", async function () {
      const { basic721TokenContract, owner } = await loadFixture(
        deployBasic721TokenLoadFixture
      );

      expect(await basic721TokenContract.balanceOf(owner.address)).to.equal(0);
    });
    it("should return correct balanceOf after minting tokens", async function () {
      const { basic721TokenContract, owner } = await loadFixture(
        deployBasic721TokenLoadFixture
      );

      basic721TokenContract.safeMint(owner.address, firstTokenId);
      basic721TokenContract.safeMint(owner.address, secondTokenId);

      expect(await basic721TokenContract.balanceOf(owner.address)).to.equal(2);
    });

    it("should revert for a zero address", async function () {
      const { basic721TokenContract } = await loadFixture(
        deployBasic721TokenLoadFixture
      );

      await expect(
        basic721TokenContract.balanceOf(ZERO_ADDRESS)
      ).to.be.revertedWith("ERC721: address zero is not a valid owner");
    });
  });

  describe("Owner", function () {
    it("returns the tokenId owner", async function () {
      const { basic721TokenContract, addr1 } = await loadFixture(
        deployBasic721TokenLoadFixture
      );

      basic721TokenContract.safeMint(addr1.address, uri);

      expect(await basic721TokenContract.ownerOf(firstTokenId)).to.equal(
        addr1.address
      );
    });

    it("reverts an error when tokenId is invalid/untracked", async function () {
      const { basic721TokenContract, addr1 } = await loadFixture(
        deployBasic721TokenLoadFixture
      );

      basic721TokenContract.safeMint(addr1.address, uri);

      await expect(
        basic721TokenContract.ownerOf(secondTokenId)
      ).to.be.revertedWith("ERC721: invalid token ID");
    });
  });
});
