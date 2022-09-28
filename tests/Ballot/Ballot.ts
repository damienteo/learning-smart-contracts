import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

export const PROPOSALS = ["Do homework", "Don't do homework", "No comment"];
const INITIAL_PROPOSAL_VOTED = 0;

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

    console.log({ gas: ballotContract.deployTransaction.gasPrice });

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

      expect(voter.weight).to.equal(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      // Voter weight is initially 0 (no right to vote)
      const nextVoter = await ballotContract.voters(addr1.address);
      expect(nextVoter.weight).to.equal(0);

      await ballotContract.giveRightToVote(addr1.address);

      const delegatedVoter = await ballotContract.voters(addr1.address);
      expect(delegatedVoter.weight).to.equal(1);
    });

    it("can not give right to vote for someone that has voted", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      await ballotContract.giveRightToVote(addr1.address);

      await ballotContract.connect(addr1).vote(INITIAL_PROPOSAL_VOTED);

      const voter = await ballotContract.voters(addr1.address);
      expect(voter.vote).to.equal(INITIAL_PROPOSAL_VOTED);

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

    it("Should emit NewVoter events", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      await expect(ballotContract.giveRightToVote(addr1.address))
        .to.emit(ballotContract, "NewVoter")
        .withArgs(addr1.address);
    });
  });

  describe("when the voter interact with the vote function in the contract", function () {
    it("should reflect changes in user vote upon voting", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      await ballotContract.giveRightToVote(addr1.address);

      await ballotContract.connect(addr1).vote(INITIAL_PROPOSAL_VOTED);

      const voter = await ballotContract.voters(addr1.address);
      expect(voter.vote).to.equal(INITIAL_PROPOSAL_VOTED);
    });

    it("should reflect changes in proposal vote count upon voting", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      const INITIAL_PROPOSAL_VOTED = 0;

      await ballotContract.vote(INITIAL_PROPOSAL_VOTED);

      expect(
        (await ballotContract.proposals(INITIAL_PROPOSAL_VOTED)).voteCount
      ).to.equal(1);

      await ballotContract.giveRightToVote(addr1.address);
      await ballotContract.connect(addr1).vote(INITIAL_PROPOSAL_VOTED);

      expect(
        (await ballotContract.proposals(INITIAL_PROPOSAL_VOTED)).voteCount
      ).to.equal(2);
    });

    it("Should emit Voted events", async function () {
      const { ballotContract, owner } = await loadFixture(
        deployBallotLoadFixture
      );

      const voter = await ballotContract.voters(owner.address);

      await expect(ballotContract.vote(INITIAL_PROPOSAL_VOTED))
        .to.emit(ballotContract, "Voted")
        .withArgs(owner.address, INITIAL_PROPOSAL_VOTED, voter.weight);
    });
  });

  describe("when the voter interact with the delegate function in the contract", function () {
    it("Can delegate to another address", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      const delegatedAddress = addr1.address;

      await ballotContract.giveRightToVote(delegatedAddress);

      await ballotContract.delegate(delegatedAddress);

      const voter = await ballotContract.voters(delegatedAddress);

      expect(voter.weight).to.equal(2);
    });

    it("Should update proposal vote count if delegated addres already voted", async function () {
      const { ballotContract, addr1 } = await loadFixture(
        deployBallotLoadFixture
      );

      const delegatedAddress = addr1.address;

      await ballotContract.giveRightToVote(delegatedAddress);

      await ballotContract.connect(addr1).vote(INITIAL_PROPOSAL_VOTED);

      // First Vote
      expect(
        (await ballotContract.proposals(INITIAL_PROPOSAL_VOTED)).voteCount
      ).to.equal(1);

      await ballotContract.delegate(delegatedAddress);

      const voter = await ballotContract.voters(delegatedAddress);

      // Second Vote due to owner delegation
      expect(
        (await ballotContract.proposals(INITIAL_PROPOSAL_VOTED)).voteCount
      ).to.equal(2);
    });

    it("Should emit Delegated event", async function () {
      const { ballotContract, addr1, owner } = await loadFixture(
        deployBallotLoadFixture
      );

      const delegatedAddress = addr1.address;

      await ballotContract.giveRightToVote(delegatedAddress);

      await expect(ballotContract.delegate(delegatedAddress))
        .to.emit(ballotContract, "Delegated")
        .withArgs(owner.address, delegatedAddress, 2, false, 0, 0);
    });

    it("can not delegate if delegator does not have right to vote", async function () {
      const { ballotContract, addr1, addr2 } = await loadFixture(
        deployBallotLoadFixture
      );

      await expect(
        ballotContract.connect(addr1).delegate(addr2.address)
      ).to.be.revertedWith("You have no right to vote");
    });

    it("can not delegate if delegator has already voted", async function () {
      const { ballotContract, addr1, addr2 } = await loadFixture(
        deployBallotLoadFixture
      );

      await ballotContract.giveRightToVote(addr1.address);

      await ballotContract.connect(addr1).vote(INITIAL_PROPOSAL_VOTED);

      await expect(
        ballotContract.connect(addr1).delegate(addr2.address)
      ).to.be.revertedWith("You already voted.");
    });

    it("can not delegate if delegatee does not have right to vote", async function () {
      const { ballotContract, addr1, addr2 } = await loadFixture(
        deployBallotLoadFixture
      );

      await ballotContract.giveRightToVote(addr1.address);

      await expect(
        ballotContract.connect(addr1).delegate(addr2.address)
      ).to.be.revertedWith("Delegate does not have right to vote");
    });

    it("should stop self-delegation", async function () {
      const { ballotContract, owner } = await loadFixture(
        deployBallotLoadFixture
      );

      await expect(ballotContract.delegate(owner.address)).to.be.revertedWith(
        "Self-delegation is disallowed."
      );
    });
  });

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
});
