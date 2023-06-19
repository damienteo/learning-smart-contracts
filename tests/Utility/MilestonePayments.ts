import { expect } from "chai";
import { ethers } from "hardhat";
import MerkleTree from "merkletreejs";

import { MilestonePayments } from "../../typechain-types/contracts/Utility";
import { AccessControlToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ZERO_BYTES32 } from "../../constants/constants";
import {
  IAirDropDetails,
  getParsedValue,
  generateMerkleTree,
  getMerkleProof,
  multiplyBigNumbers,
  divideBigNumbers,
} from "../../utils/merkleAirdrop";

const getClaimableAmt = (
  totalAmt: number,
  milestone: number,
  period: number
) => {
  const numerator = multiplyBigNumbers(totalAmt, milestone);
  const amount = divideBigNumbers(Number(numerator), period);
  return amount.toString();
};

const amounts = {
  1: 100,
  2: 200,
  3: 300,
  4: 400,
  5: 500,
  6: 600,
  7: 700,
  8: 800,
  9: 900,
};
const treasuryAmt = ethers.utils.parseEther("10000");
const PERIOD = 12;
const FIRST_MILESTONE = 1;
const nextMileStone = FIRST_MILESTONE + 1;

describe("MilestonePayments", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress,
    addr5: SignerWithAddress,
    addr6: SignerWithAddress,
    addr7: SignerWithAddress,
    addr8: SignerWithAddress,
    addr9: SignerWithAddress,
    airdropDetails: IAirDropDetails,
    merkleRoot: string,
    merkleTree: MerkleTree,
    nextMerkleRoot: string,
    nextAirdropDetails: IAirDropDetails,
    MilestonePaymentsContract: MilestonePayments,
    AccessControlTokenContract: AccessControlToken;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9] =
      await ethers.getSigners();

    // Token Contract
    const AccessControlToken = await ethers.getContractFactory(
      "AccessControlToken"
    );
    AccessControlTokenContract = await AccessControlToken.deploy();

    // Airdrop details
    const decimals = await AccessControlTokenContract.decimals();
    airdropDetails = {
      decimals,
      airdrop: {
        [owner.address]: amounts[1],
        [addr1.address]: amounts[2],
        [addr2.address]: amounts[3],
        [addr3.address]: amounts[4],
        [addr4.address]: amounts[5],
        [addr5.address]: amounts[6],
        [addr6.address]: amounts[7],
        [addr7.address]: amounts[8],
        [addr8.address]: amounts[9],
      },
    };
    merkleTree = generateMerkleTree(airdropDetails);
    merkleRoot = merkleTree.getHexRoot();

    // Single Use Merkle Airdrop Contract
    const MilestonePaymentsFactory = await ethers.getContractFactory(
      "MilestonePayments"
    );
    MilestonePaymentsContract = await MilestonePaymentsFactory.deploy(
      merkleRoot,
      AccessControlTokenContract.address,
      PERIOD
    );
    await MilestonePaymentsContract.setMilestone(FIRST_MILESTONE);

    // Grant minter role to owner to mint tokens for people to claim from Airdrop Contract
    const minterRole = await AccessControlTokenContract.MINTER_ROLE();
    await AccessControlTokenContract.grantRole(minterRole, owner.address);
    await AccessControlTokenContract.mint(
      MilestonePaymentsContract.address,
      treasuryAmt
    );

    nextAirdropDetails = {
      decimals: airdropDetails.decimals,
      airdrop: {
        [owner.address]: amounts[1],
        // Other than multiplying addr1 claim by 2
        // remove the claim for addr2
        [addr1.address]: amounts[2] * 2,
        // [addr2.address]: amounts[3],
        [addr3.address]: amounts[4],
        [addr4.address]: amounts[5],
        [addr5.address]: amounts[6],
        [addr6.address]: amounts[7],
        [addr7.address]: amounts[8],
        [addr8.address]: amounts[9],
      },
    };

    const nextMerkleTree = generateMerkleTree(nextAirdropDetails);
    nextMerkleRoot = nextMerkleTree.getHexRoot();
  });

  describe("Deployment", async () => {
    it("has the treasury amount ready to be airdropped", async () => {
      expect(
        await AccessControlTokenContract.balanceOf(
          MilestonePaymentsContract.address
        )
      ).to.equal(treasuryAmt);
    });

    it("allows deployment with empty root", async () => {
      const MilestonePaymentsFactory = await ethers.getContractFactory(
        "MilestonePayments"
      );
      await expect(
        MilestonePaymentsFactory.deploy(
          ZERO_BYTES32,
          AccessControlTokenContract.address,
          PERIOD
        )
      ).not.to.be.reverted;
    });

    it("reverts with error as Milestone is still at 0 after deployment", async () => {
      const MilestonePaymentsFactory = await ethers.getContractFactory(
        "MilestonePayments"
      );
      const nextMilestonePaymentsContract =
        await MilestonePaymentsFactory.deploy(
          nextMerkleRoot,
          AccessControlTokenContract.address,
          PERIOD
        );

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await expect(
        nextMilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[2], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsContract,
        "InvalidMilestone"
      );
    });
  });

  describe("Claim", async () => {
    it("allows a claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[2], airdropDetails.decimals),
          proof
        )
      ).not.to.be.reverted;
    });
    it("updates balance of address after claim", async () => {
      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(0);
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const claimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      const claimableAmount = getClaimableAmt(
        Number(claimAmt),
        FIRST_MILESTONE,
        PERIOD
      );

      await MilestonePaymentsContract.claim(addr1.address, claimAmt, proof);
      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(claimableAmount);
    });
    it("updates balance of airdrop contract after claim", async () => {
      expect(
        await AccessControlTokenContract.balanceOf(
          MilestonePaymentsContract.address
        )
      ).to.equal(treasuryAmt);
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);
      const claimableAmount = getClaimableAmt(
        Number(mintAmt),
        FIRST_MILESTONE,
        PERIOD
      );
      await MilestonePaymentsContract.claim(addr1.address, mintAmt, proof);
      expect(
        await AccessControlTokenContract.balanceOf(
          MilestonePaymentsContract.address
        )
      ).to.equal(BigInt(Number(treasuryAmt)) - BigInt(claimableAmount));
    });
    it("updates Claimed mapping after claim", async () => {
      expect(
        await MilestonePaymentsContract.cumulativeClaimed(addr1.address)
      ).to.equal(0);
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);
      const claimableAmount = getClaimableAmt(
        Number(mintAmt),
        FIRST_MILESTONE,
        PERIOD
      );
      await MilestonePaymentsContract.claim(addr1.address, mintAmt, proof);
      expect(
        await MilestonePaymentsContract.cumulativeClaimed(addr1.address)
      ).to.equal(claimableAmount);
    });
    it("emits Claimed event after claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);
      const claimableAmount = getClaimableAmt(
        Number(mintAmt),
        FIRST_MILESTONE,
        PERIOD
      );
      await expect(
        MilestonePaymentsContract.claim(addr1.address, mintAmt, proof)
      )
        .to.emit(MilestonePaymentsContract, "Claimed")
        .withArgs(addr1.address, claimableAmount);
    });
    it("allows a full claim after final milestone is reached", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const fullClaimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      await MilestonePaymentsContract.setMilestone(PERIOD);

      await MilestonePaymentsContract.claim(addr1.address, fullClaimAmt, proof);
      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(fullClaimAmt);
    });
    it("rejects a claim if a claim amount smaller than the current claim is given", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[2] - 1, airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(MilestonePaymentsContract, "NotInMerkle");
    });
    it("rejects a claim if neither address nor amount exists", async () => {
      const proof = getMerkleProof(addr9.address, 0, airdropDetails);
      await expect(
        MilestonePaymentsContract.claim(
          addr9.address,
          getParsedValue(0, airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsContract,
        "FullyClaimed"
      );
    });
    it("rejects a claim if address/amount combi does not exist", async () => {
      const proof = getMerkleProof(addr1.address, amounts[3], airdropDetails);
      await expect(
        MilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(MilestonePaymentsContract, "NotInMerkle");
    });
    it("rejects a claim if the proof is wrong", async () => {
      await expect(
        MilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          [ZERO_BYTES32]
        )
      ).to.be.revertedWithCustomError(MilestonePaymentsContract, "NotInMerkle");
    });
    it("rejects a claim if wrong claim amt is used", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(MilestonePaymentsContract, "NotInMerkle");
    });
    it("rejects a claim if wrong address is used", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsContract.claim(
          addr2.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(MilestonePaymentsContract, "NotInMerkle");
    });
    it("rejects a double-claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await MilestonePaymentsContract.claim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );
      await expect(
        MilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[2], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsContract,
        "FullyClaimed"
      );
    });
  });

  describe("set new Merkle Root hash", async () => {
    it("updates the merkle root hash", async () => {
      expect(await MilestonePaymentsContract.merkleRoot()).to.equal(merkleRoot);

      await MilestonePaymentsContract.setMerkleRoot(nextMerkleRoot);

      expect(await MilestonePaymentsContract.merkleRoot()).to.equal(
        nextMerkleRoot
      );
    });

    it("rejects request by non-owner to update Merkle Root", async () => {
      await expect(
        MilestonePaymentsContract.connect(addr1).setMerkleRoot(nextMerkleRoot)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("allows a subsequent claim after the merkle root is updated", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await MilestonePaymentsContract.claim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );

      await MilestonePaymentsContract.setMerkleRoot(nextMerkleRoot);

      const nextProof = getMerkleProof(
        addr1.address,
        amounts[2] * 2,
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsContract.claim(
          addr1.address,
          getParsedValue(amounts[2] * 2, nextAirdropDetails.decimals),
          nextProof
        )
      ).not.to.be.reverted;
    });

    it("allows a claim if claim was not previously made, and claim was not removed in a subsequent hash", async () => {
      await MilestonePaymentsContract.setMerkleRoot(nextMerkleRoot);

      const nextProof = getMerkleProof(
        addr3.address,
        amounts[4],
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsContract.claim(
          addr3.address,
          getParsedValue(amounts[4], nextAirdropDetails.decimals),
          nextProof
        )
      ).not.to.be.reverted;
    });

    it("updates wallet balance for each claim", async () => {
      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(0);

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await MilestonePaymentsContract.claim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );

      const claimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      const claimableAmount = getClaimableAmt(
        Number(claimAmt),
        FIRST_MILESTONE,
        PERIOD
      );

      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(claimableAmount);

      await MilestonePaymentsContract.setMerkleRoot(nextMerkleRoot);
      const nextProof = getMerkleProof(
        addr1.address,
        amounts[2] * 2,
        nextAirdropDetails
      );
      await MilestonePaymentsContract.claim(
        addr1.address,
        getParsedValue(amounts[2] * 2, nextAirdropDetails.decimals),
        nextProof
      );

      const totalClaimAmount = getParsedValue(
        amounts[2] * 2,
        airdropDetails.decimals
      );

      const nextClaimableAmount = getClaimableAmt(
        Number(totalClaimAmount),
        FIRST_MILESTONE,
        PERIOD
      );

      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(nextClaimableAmount);
    });

    it("updates cumulativeClaimed for each claim", async () => {
      expect(
        await MilestonePaymentsContract.cumulativeClaimed(addr1.address)
      ).to.equal(0);

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await MilestonePaymentsContract.claim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );

      const claimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      const claimableAmount = getClaimableAmt(
        Number(claimAmt),
        FIRST_MILESTONE,
        PERIOD
      );

      expect(
        await MilestonePaymentsContract.cumulativeClaimed(addr1.address)
      ).to.equal(claimableAmount);

      await MilestonePaymentsContract.setMerkleRoot(nextMerkleRoot);
      const nextProof = getMerkleProof(
        addr1.address,
        amounts[2] * 2,
        nextAirdropDetails
      );
      await MilestonePaymentsContract.claim(
        addr1.address,
        getParsedValue(amounts[2] * 2, nextAirdropDetails.decimals),
        nextProof
      );

      const totalClaimAmount = getParsedValue(
        amounts[2] * 2,
        airdropDetails.decimals
      );

      const nextClaimableAmount = getClaimableAmt(
        Number(totalClaimAmount),
        FIRST_MILESTONE,
        PERIOD
      );

      expect(
        await MilestonePaymentsContract.cumulativeClaimed(addr1.address)
      ).to.equal(nextClaimableAmount);
    });

    it("rejects claim if removed after the merkle root is updated", async () => {
      await MilestonePaymentsContract.setMerkleRoot(nextMerkleRoot);

      const proof = getMerkleProof(
        addr2.address,
        amounts[3],
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsContract.claim(
          addr2.address,
          getParsedValue(amounts[3], nextAirdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(MilestonePaymentsContract, "NotInMerkle");
    });

    it("rejects a subsequent claim if claim amount was not increased in the update", async () => {
      const proof = getMerkleProof(addr3.address, amounts[4], airdropDetails);

      await MilestonePaymentsContract.claim(
        addr3.address,
        getParsedValue(amounts[4], airdropDetails.decimals),
        proof
      );

      await MilestonePaymentsContract.setMerkleRoot(nextMerkleRoot);

      const nextProof = getMerkleProof(
        addr3.address,
        amounts[4],
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsContract.claim(
          addr3.address,
          getParsedValue(amounts[4], nextAirdropDetails.decimals),
          nextProof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsContract,
        "FullyClaimed"
      );
    });
  });

  describe("Milestones", () => {
    it("updates milestones", async () => {
      await expect(MilestonePaymentsContract.setMilestone(nextMileStone)).not.to
        .be.reverted;

      expect(await MilestonePaymentsContract.milestone()).to.equal(
        nextMileStone
      );
    });
    it("reverts if non-owners update milestones", async () => {
      await expect(
        MilestonePaymentsContract.connect(addr1).setMilestone(nextMileStone)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("reverts if milestone is after period", async () => {
      await expect(
        MilestonePaymentsContract.setMilestone(PERIOD + 1)
      ).to.be.revertedWithCustomError(
        MilestonePaymentsContract,
        "InvalidMilestone"
      );
    });
  });

  describe("Periods", () => {
    const nextPeriod = PERIOD + 1;

    it("updates periods", async () => {
      await expect(MilestonePaymentsContract.setPeriod(nextPeriod)).not.to.be
        .reverted;

      expect(await MilestonePaymentsContract.period()).to.equal(nextPeriod);
    });
    it("reverts if non-owners update periods", async () => {
      await expect(
        MilestonePaymentsContract.connect(addr1).setPeriod(nextPeriod)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("reverts if period is before milestone", async () => {
      await MilestonePaymentsContract.setMilestone(nextMileStone);

      await expect(
        MilestonePaymentsContract.setPeriod(nextMileStone - 1)
      ).to.be.revertedWithCustomError(
        MilestonePaymentsContract,
        "InvalidPeriod"
      );
    });
  });

  describe("gets next claimable amount via a read function", () => {
    it("returns claimable amount", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const nextAmount = await MilestonePaymentsContract.getNextClaim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );

      const claimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      const claimableAmount = getClaimableAmt(
        Number(claimAmt),
        FIRST_MILESTONE,
        PERIOD
      );

      expect(nextAmount).to.equal(claimableAmount);
    });

    it("returns claimable amount after milestone is updated", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await MilestonePaymentsContract.setMilestone(nextMileStone);

      const nextAmount = await MilestonePaymentsContract.getNextClaim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );

      const claimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      const claimableAmount = getClaimableAmt(
        Number(claimAmt),
        nextMileStone,
        PERIOD
      );

      expect(nextAmount).to.equal(claimableAmount);
    });
  });
});
