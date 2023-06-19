import { expect } from "chai";
import { ethers } from "hardhat";
import MerkleTree from "merkletreejs";

import {
  MilestonePayments,
  MilestonePaymentsInitializable,
  MilestonePaymentsProxyFactory,
} from "../../typechain-types/contracts/Utility";
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
    MilestonePaymentsInitializableContract: MilestonePaymentsInitializable,
    MilestonePaymentsProxyFactoryContract: MilestonePaymentsProxyFactory,
    MilestonePaymentsCloneContract: MilestonePaymentsInitializable,
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

    const MilestonePaymentsFactory = await ethers.getContractFactory(
      "MilestonePayments"
    );
    MilestonePaymentsContract = await MilestonePaymentsFactory.deploy(
      merkleRoot,
      AccessControlTokenContract.address,
      PERIOD
    );

    const MilestonePaymentsInitializableFactory =
      await ethers.getContractFactory("MilestonePaymentsInitializable");
    MilestonePaymentsInitializableContract =
      await MilestonePaymentsInitializableFactory.deploy();

    const MilestonePaymentsProxyFactoryFactory =
      await ethers.getContractFactory("MilestonePaymentsProxyFactory");
    MilestonePaymentsProxyFactoryContract =
      await MilestonePaymentsProxyFactoryFactory.deploy(
        MilestonePaymentsInitializableContract.address
      );

    await MilestonePaymentsProxyFactoryContract.createNewAgreement(
      merkleRoot,
      AccessControlTokenContract.address,
      PERIOD,
      owner.address
    );
    const cloneAddress = await MilestonePaymentsProxyFactoryContract.allClones(
      0
    );
    MilestonePaymentsCloneContract = await ethers.getContractAt(
      "MilestonePaymentsInitializable",
      cloneAddress
    );
    await MilestonePaymentsCloneContract.setMilestone(FIRST_MILESTONE);

    // Grant minter role to owner to mint tokens for people to claim from Airdrop Contract
    const minterRole = await AccessControlTokenContract.MINTER_ROLE();
    await AccessControlTokenContract.grantRole(minterRole, owner.address);
    await AccessControlTokenContract.mint(
      MilestonePaymentsCloneContract.address,
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

  describe("Creating new Agreement", async () => {
    it("has the treasury amount ready to be airdropped", async () => {
      expect(
        await AccessControlTokenContract.balanceOf(
          MilestonePaymentsCloneContract.address
        )
      ).to.equal(treasuryAmt);
    });

    it("allows deployment with empty root", async () => {
      const MilestonePaymentsProxyFactoryFactory =
        await ethers.getContractFactory("MilestonePaymentsProxyFactory");
      const nextMilestonePaymentsCloneContract =
        await MilestonePaymentsProxyFactoryFactory.deploy(
          MilestonePaymentsInitializableContract.address
        );

      await expect(
        nextMilestonePaymentsCloneContract.createNewAgreement(
          ZERO_BYTES32,
          AccessControlTokenContract.address,
          PERIOD,
          owner.address
        )
      ).not.to.be.reverted;
    });

    it("reverts with error as Milestone is still at 0 after deployment", async () => {
      await MilestonePaymentsProxyFactoryContract.createNewAgreement(
        merkleRoot,
        AccessControlTokenContract.address,
        PERIOD,
        owner.address
      );

      const cloneAddress =
        await MilestonePaymentsProxyFactoryContract.allClones(1);
      const nextMilestonePaymentsCloneContract = await ethers.getContractAt(
        "MilestonePaymentsInitializable",
        cloneAddress
      );

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await expect(
        nextMilestonePaymentsCloneContract.claim(
          addr1.address,
          getParsedValue(amounts[2], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "InvalidMilestone"
      );
    });
  });

  describe("Claim", async () => {
    it("allows a claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsCloneContract.claim(
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

      await MilestonePaymentsCloneContract.claim(
        addr1.address,
        claimAmt,
        proof
      );
      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(claimableAmount);
    });
    it("updates balance of airdrop contract after claim", async () => {
      expect(
        await AccessControlTokenContract.balanceOf(
          MilestonePaymentsCloneContract.address
        )
      ).to.equal(treasuryAmt);
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);
      const claimableAmount = getClaimableAmt(
        Number(mintAmt),
        FIRST_MILESTONE,
        PERIOD
      );
      await MilestonePaymentsCloneContract.claim(addr1.address, mintAmt, proof);
      expect(
        await AccessControlTokenContract.balanceOf(
          MilestonePaymentsCloneContract.address
        )
      ).to.equal(BigInt(Number(treasuryAmt)) - BigInt(claimableAmount));
    });
    it("updates Claimed mapping after claim", async () => {
      expect(
        await MilestonePaymentsCloneContract.cumulativeClaimed(addr1.address)
      ).to.equal(0);
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);
      const claimableAmount = getClaimableAmt(
        Number(mintAmt),
        FIRST_MILESTONE,
        PERIOD
      );
      await MilestonePaymentsCloneContract.claim(addr1.address, mintAmt, proof);
      expect(
        await MilestonePaymentsCloneContract.cumulativeClaimed(addr1.address)
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
        MilestonePaymentsCloneContract.claim(addr1.address, mintAmt, proof)
      )
        .to.emit(MilestonePaymentsCloneContract, "Claimed")
        .withArgs(addr1.address, claimableAmount);
    });
    it("allows a full claim after final milestone is reached", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const fullClaimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      await MilestonePaymentsCloneContract.setMilestone(PERIOD);

      await MilestonePaymentsCloneContract.claim(
        addr1.address,
        fullClaimAmt,
        proof
      );
      expect(
        await AccessControlTokenContract.balanceOf(addr1.address)
      ).to.equal(fullClaimAmt);
    });
    it("rejects a claim if a claim amount smaller than the current claim is given", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsCloneContract.claim(
          addr1.address,
          getParsedValue(amounts[2] - 1, airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotInMerkle"
      );
    });
    it("rejects a claim if neither address nor amount exists", async () => {
      const proof = getMerkleProof(addr9.address, 0, airdropDetails);
      await expect(
        MilestonePaymentsCloneContract.claim(
          addr9.address,
          getParsedValue(0, airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "FullyClaimed"
      );
    });
    it("rejects a claim if address/amount combi does not exist", async () => {
      const proof = getMerkleProof(addr1.address, amounts[3], airdropDetails);
      await expect(
        MilestonePaymentsCloneContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotInMerkle"
      );
    });
    it("rejects a claim if the proof is wrong", async () => {
      await expect(
        MilestonePaymentsCloneContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          [ZERO_BYTES32]
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotInMerkle"
      );
    });
    it("rejects a claim if wrong claim amt is used", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsCloneContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotInMerkle"
      );
    });
    it("rejects a claim if wrong address is used", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await expect(
        MilestonePaymentsCloneContract.claim(
          addr2.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotInMerkle"
      );
    });
    it("rejects a double-claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await MilestonePaymentsCloneContract.claim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );
      await expect(
        MilestonePaymentsCloneContract.claim(
          addr1.address,
          getParsedValue(amounts[2], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "FullyClaimed"
      );
    });
  });

  describe("set new Merkle Root hash", async () => {
    it("updates the merkle root hash", async () => {
      expect(await MilestonePaymentsCloneContract.merkleRoot()).to.equal(
        merkleRoot
      );

      await MilestonePaymentsCloneContract.setMerkleRoot(nextMerkleRoot);

      expect(await MilestonePaymentsCloneContract.merkleRoot()).to.equal(
        nextMerkleRoot
      );
    });

    it("rejects request by non-owner to update Merkle Root", async () => {
      await expect(
        MilestonePaymentsCloneContract.connect(addr1).setMerkleRoot(
          nextMerkleRoot
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotMediator"
      );
    });

    it("allows a subsequent claim after the merkle root is updated", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await MilestonePaymentsCloneContract.claim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );

      await MilestonePaymentsCloneContract.setMerkleRoot(nextMerkleRoot);

      const nextProof = getMerkleProof(
        addr1.address,
        amounts[2] * 2,
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsCloneContract.claim(
          addr1.address,
          getParsedValue(amounts[2] * 2, nextAirdropDetails.decimals),
          nextProof
        )
      ).not.to.be.reverted;
    });

    it("allows a claim if claim was not previously made, and claim was not removed in a subsequent hash", async () => {
      await MilestonePaymentsCloneContract.setMerkleRoot(nextMerkleRoot);

      const nextProof = getMerkleProof(
        addr3.address,
        amounts[4],
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsCloneContract.claim(
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
      await MilestonePaymentsCloneContract.claim(
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

      await MilestonePaymentsCloneContract.setMerkleRoot(nextMerkleRoot);
      const nextProof = getMerkleProof(
        addr1.address,
        amounts[2] * 2,
        nextAirdropDetails
      );
      await MilestonePaymentsCloneContract.claim(
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
        await MilestonePaymentsCloneContract.cumulativeClaimed(addr1.address)
      ).to.equal(0);

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      await MilestonePaymentsCloneContract.claim(
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
        await MilestonePaymentsCloneContract.cumulativeClaimed(addr1.address)
      ).to.equal(claimableAmount);

      await MilestonePaymentsCloneContract.setMerkleRoot(nextMerkleRoot);
      const nextProof = getMerkleProof(
        addr1.address,
        amounts[2] * 2,
        nextAirdropDetails
      );
      await MilestonePaymentsCloneContract.claim(
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
        await MilestonePaymentsCloneContract.cumulativeClaimed(addr1.address)
      ).to.equal(nextClaimableAmount);
    });

    it("rejects claim if removed after the merkle root is updated", async () => {
      await MilestonePaymentsCloneContract.setMerkleRoot(nextMerkleRoot);

      const proof = getMerkleProof(
        addr2.address,
        amounts[3],
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsCloneContract.claim(
          addr2.address,
          getParsedValue(amounts[3], nextAirdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotInMerkle"
      );
    });

    it("rejects a subsequent claim if claim amount was not increased in the update", async () => {
      const proof = getMerkleProof(addr3.address, amounts[4], airdropDetails);

      await MilestonePaymentsCloneContract.claim(
        addr3.address,
        getParsedValue(amounts[4], airdropDetails.decimals),
        proof
      );

      await MilestonePaymentsCloneContract.setMerkleRoot(nextMerkleRoot);

      const nextProof = getMerkleProof(
        addr3.address,
        amounts[4],
        nextAirdropDetails
      );

      await expect(
        MilestonePaymentsCloneContract.claim(
          addr3.address,
          getParsedValue(amounts[4], nextAirdropDetails.decimals),
          nextProof
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "FullyClaimed"
      );
    });
  });

  describe("Milestones", () => {
    it("updates milestones", async () => {
      await expect(MilestonePaymentsCloneContract.setMilestone(nextMileStone))
        .not.to.be.reverted;

      expect(await MilestonePaymentsCloneContract.milestone()).to.equal(
        nextMileStone
      );
    });
    it("reverts if non-owners update milestones", async () => {
      await expect(
        MilestonePaymentsCloneContract.connect(addr1).setMilestone(
          nextMileStone
        )
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotMediator"
      );
    });
    it("reverts if milestone is after period", async () => {
      await expect(
        MilestonePaymentsCloneContract.setMilestone(PERIOD + 1)
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "InvalidMilestone"
      );
    });
  });

  describe("Periods", () => {
    const nextPeriod = PERIOD + 1;

    it("updates periods", async () => {
      await expect(MilestonePaymentsCloneContract.setPeriod(nextPeriod)).not.to
        .be.reverted;

      expect(await MilestonePaymentsCloneContract.period()).to.equal(
        nextPeriod
      );
    });
    it("reverts if non-owners update periods", async () => {
      await expect(
        MilestonePaymentsCloneContract.connect(addr1).setPeriod(nextPeriod)
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "NotMediator"
      );
    });
    it("reverts if period is before milestone", async () => {
      await MilestonePaymentsCloneContract.setMilestone(nextMileStone);

      await expect(
        MilestonePaymentsCloneContract.setPeriod(nextMileStone - 1)
      ).to.be.revertedWithCustomError(
        MilestonePaymentsCloneContract,
        "InvalidPeriod"
      );
    });
  });

  describe("gets next claimable amount via a read function", () => {
    it("returns claimable amount", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const nextAmount = await MilestonePaymentsCloneContract.getNextClaim(
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

      await MilestonePaymentsCloneContract.setMilestone(nextMileStone);

      const nextAmount = await MilestonePaymentsCloneContract.getNextClaim(
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
