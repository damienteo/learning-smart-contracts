import { expect } from "chai";
import { ethers } from "hardhat";

import { BasicERC20Votes } from "../../typechain-types/contracts/Token";

import { ZERO_ADDRESS } from "../../constants/constants";

const name = "BasicERC20Votes";
const symbol = "BEV";
const INITIAL_SUPPLY = 10 * 10 ** 18;

describe("BasicERC20Votes", async () => {
  let BasicERC20Votes, basicERC20VotesContract: BasicERC20Votes;

  beforeEach(async () => {
    BasicERC20Votes = await ethers.getContractFactory("BasicERC20Votes");
    basicERC20VotesContract = await BasicERC20Votes.deploy();
  });

  describe("deployment", async () => {
    it("should have initial nonce of 0", async () => {
      const [owner] = await ethers.getSigners();
      expect(await basicERC20VotesContract.nonces(owner.address)).to.be.equal(
        0
      );
    });
    // it("throws an error", async () => {
    //   throw new Error("lol");
    // });
  });
});

// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/test/helpers/eip712.js
// Regarding: const domain = await basicERC20VotesContract.DOMAIN_SEPARATOR();
