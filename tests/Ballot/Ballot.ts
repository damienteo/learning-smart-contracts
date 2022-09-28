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

console.log(nextProposals);

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
  });

  //     it("has zero votes for all proposals", async function () {
  //       // TODO
  //       throw Error("Not implemented");
  //     });
  //     it("sets the deployer address as chairperson", async function () {
  //       // TODO
  //       throw Error("Not implemented");
  //     });
  //     it("sets the voting weight for the chairperson as 1", async function () {
  //       // TODO
  //       throw Error("Not implemented");
  //     });
  //   });

  //   describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
  //     it("gives right to vote for another address", async function () {
  //       // TODO
  //       throw Error("Not implemented");
  //     });
  //     it("can not give right to vote for someone that has voted", async function () {
  //       // TODO
  //       throw Error("Not implemented");
  //     });
  //     it("can not give right to vote for someone that has already voting rights", async function () {
  //       // TODO
  //       throw Error("Not implemented");
  //     });
  //   });

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
