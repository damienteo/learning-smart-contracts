import { expect } from "chai";
import { ethers } from "hardhat";
import MerkleTree from "merkletreejs";

import { SingleUseMerkleAirdrop } from "../../typechain-types/contracts/Utility/SingleUseMerkleAirdrop";
import { BasicERC20Token } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ZERO_BYTES32 } from "../../constants/constants";
import {
  IAirDropDetails,
  getParsedValue,
  generateMerkleTree,
  getMerkleProof,
} from "../../utils/merkleAirdrop";

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

describe("SingleUseMerkleAirdrop", () => {
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
    SingleUseMerkleAirdropContract: SingleUseMerkleAirdrop,
    BasicERC20TokenContract: BasicERC20Token;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9] =
      await ethers.getSigners();

    // Token Contract
    const BasicERC20Token = await ethers.getContractFactory("BasicERC20Token");
    BasicERC20TokenContract = await BasicERC20Token.deploy(0);

    // Airdrop details
    const decimals = await BasicERC20TokenContract.decimals();
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
    const SingleUseMerkleAirdropFactory = await ethers.getContractFactory(
      "SingleUseMerkleAirdrop"
    );
    SingleUseMerkleAirdropContract = await SingleUseMerkleAirdropFactory.deploy(
      merkleRoot,
      BasicERC20TokenContract.address
    );

    await BasicERC20TokenContract.mint(
      SingleUseMerkleAirdropContract.address,
      10000
    );
  });

  describe("Deployment", async () => {
    it("has the treasury amount ready to be airdropped", async () => {
      expect(
        await BasicERC20TokenContract.balanceOf(
          SingleUseMerkleAirdropContract.address
        )
      ).to.equal(treasuryAmt);
    });
  });

  describe("Claim", async () => {
    it("allows a claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await expect(
        SingleUseMerkleAirdropContract.claim(
          addr1.address,
          getParsedValue(amounts[2], airdropDetails.decimals),
          proof
        )
      ).not.to.be.reverted;
    });

    it("updates balance of address after claim", async () => {
      expect(await BasicERC20TokenContract.balanceOf(addr1.address)).to.equal(
        0
      );

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const claimAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      await SingleUseMerkleAirdropContract.claim(
        addr1.address,
        claimAmt,
        proof
      );

      expect(await BasicERC20TokenContract.balanceOf(addr1.address)).to.equal(
        claimAmt
      );
    });

    it("updates balance of airdrop contract after claim", async () => {
      expect(
        await BasicERC20TokenContract.balanceOf(
          SingleUseMerkleAirdropContract.address
        )
      ).to.equal(treasuryAmt);

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      await SingleUseMerkleAirdropContract.claim(addr1.address, mintAmt, proof);

      expect(
        await BasicERC20TokenContract.balanceOf(
          SingleUseMerkleAirdropContract.address
        )
      ).to.equal(BigInt(Number(treasuryAmt)) - BigInt(mintAmt));
    });

    it("updates Claimed mapping after claim", async () => {
      expect(
        await SingleUseMerkleAirdropContract.hasClaimed(addr1.address)
      ).to.equal(false);

      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      await SingleUseMerkleAirdropContract.claim(addr1.address, mintAmt, proof);

      expect(
        await SingleUseMerkleAirdropContract.hasClaimed(addr1.address)
      ).to.equal(true);
    });

    it("emits Claimed event after claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);
      const mintAmt = getParsedValue(amounts[2], airdropDetails.decimals);

      await expect(
        SingleUseMerkleAirdropContract.claim(addr1.address, mintAmt, proof)
      )
        .to.emit(SingleUseMerkleAirdropContract, "Claimed")
        .withArgs(addr1.address, mintAmt);
    });

    it("dis-allows a claim if neither address nor amount exists", async () => {
      const proof = getMerkleProof(addr9.address, 0, airdropDetails);

      await expect(
        SingleUseMerkleAirdropContract.claim(
          addr9.address,
          getParsedValue(0, airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        SingleUseMerkleAirdropContract,
        "NotInMerkle"
      );
    });

    it("dis-allows a claim if address/amount combi does not exist", async () => {
      const proof = getMerkleProof(addr1.address, amounts[3], airdropDetails);

      await expect(
        SingleUseMerkleAirdropContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        SingleUseMerkleAirdropContract,
        "NotInMerkle"
      );
    });

    it("dis-allows a claim if the proof is wrong", async () => {
      await expect(
        SingleUseMerkleAirdropContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          [ZERO_BYTES32]
        )
      ).to.be.revertedWithCustomError(
        SingleUseMerkleAirdropContract,
        "NotInMerkle"
      );
    });

    it("dis-allows a claim if wrong claim amt is used", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await expect(
        SingleUseMerkleAirdropContract.claim(
          addr1.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        SingleUseMerkleAirdropContract,
        "NotInMerkle"
      );
    });

    it("dis-allows a claim if wrong address is used", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await expect(
        SingleUseMerkleAirdropContract.claim(
          addr2.address,
          getParsedValue(amounts[3], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        SingleUseMerkleAirdropContract,
        "NotInMerkle"
      );
    });

    it("dis-allows a double-claim", async () => {
      const proof = getMerkleProof(addr1.address, amounts[2], airdropDetails);

      await SingleUseMerkleAirdropContract.claim(
        addr1.address,
        getParsedValue(amounts[2], airdropDetails.decimals),
        proof
      );

      await expect(
        SingleUseMerkleAirdropContract.claim(
          addr1.address,
          getParsedValue(amounts[2], airdropDetails.decimals),
          proof
        )
      ).to.be.revertedWithCustomError(
        SingleUseMerkleAirdropContract,
        "AlreadyClaimed"
      );
    });
  });
});
