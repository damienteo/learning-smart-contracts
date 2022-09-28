import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

export const PROPOSALS = ["Do homework", "Don't do homework", "No comment"];

// function convertStringArrayToBytes32(array: string[]) {
//   const bytes32Array = [];
//   for (let index = 0; index < array.length; index++) {
//     bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
//   }
//   return bytes32Array;
// }

const convertStringArrayToBytes32 = (array: string[]) =>
  array.map((element) => ethers.utils.formatBytes32String(element));

export const nextProposals = convertStringArrayToBytes32(PROPOSALS);

describe("Ballot", function () {
  async function deployBallotLoadFixture() {
    const Ballot = await ethers.getContractFactory("Ballot");
    const [owner, addr1, addr2] = await ethers.getSigners();
    const ballotContract = await Ballot.deploy(nextProposals);

    return { ballotContract, owner, addr1, addr2 };
  }

  describe("when the contract is deployed", function () {
    it("has the provided proposals", async function () {
      const { ballotContract } = await loadFixture(deployBallotLoadFixture);

      for (let i = 0; i < PROPOSALS.length; i++) {
        const proposal = await ballotContract.proposals(i);
        expect(ethers.utils.parseBytes32String(proposal.name)).to.equal(
          PROPOSALS[i]
        );
      }
    });

    it("has zero votes for all proposals", async function () {
      const { ballotContract } = await loadFixture(deployBallotLoadFixture);

      for (let i = 0; i < PROPOSALS.length; i++) {
        const proposal = await ballotContract.proposals(i);
        expect(proposal.voteCount).to.equal(0);
      }
    });

    it("sets the deployer address as chairperson", async function () {
      const { ballotContract, owner } = await loadFixture(
        deployBallotLoadFixture
      );

      expect(await ballotContract.chairperson()).to.equal(owner.address);
    });

    it("sets the voting weight for the chairperson as 1", async function () {
      const { ballotContract, owner } = await loadFixture(
        deployBallotLoadFixture
      );

      const voter = await ballotContract.voters(owner.address);

      expect(voter[0]).to.equal(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      // Voter weight is initially 0 (no right to vote)
      const nextVoter = await ballotContract.voters(addr1.address);
      expect(nextVoter[0]).to.equal(0);

      await ballotContract.giveRightToVote(addr1.address);

      const delegatedVoter = await ballotContract.voters(addr1.address);
      expect(delegatedVoter[0]).to.equal(1);
    });

    it("can not give right to vote for someone that has voted", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      await ballotContract.giveRightToVote(addr1.address);

      const PROPOSAL_NUMBER = 0;

      await ballotContract.connect(addr1).vote(PROPOSAL_NUMBER);

      const voter = await ballotContract.voters(addr1.address);
      expect(voter[3]).to.equal(PROPOSAL_NUMBER);

      await expect(
        ballotContract.giveRightToVote(addr1.address)
      ).to.be.revertedWith("The voter already voted.");
    });

    it("can not give right to vote for someone that has already voting rights", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      await ballotContract.giveRightToVote(addr1.address);

      await expect(
        ballotContract.giveRightToVote(addr1.address)
      ).to.be.revertedWith("The voter already has the right to vote.");
    });
  });

  //   describe("when the voter interact with the vote function in the contract", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when the voter interact with the delegate function in the contract", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when the an attacker interact with the vote function in the contract", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when the an attacker interact with the delegate function in the contract", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when someone interact with the winningProposal function before any votes are cast", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when someone interact with the winnerName function before any votes are cast", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when someone interact with the winnerName function after one vote is cast for the first proposal", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });

  //   describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
  //     // TODO
  //     throw Error("Not implemented");
  //   });
});
