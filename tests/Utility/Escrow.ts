import { expect } from "chai";
import { ethers } from "hardhat";

import { Escrow } from "../../typechain-types/contracts/Utility/Escrow";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const sentValue = ethers.utils.parseEther("1");

describe("Escrow", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    EscrowContract: Escrow;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    EscrowContract = await EscrowFactory.deploy(
      addr1.address,
      addr2.address,
      addr3.address
    );
  });

  it("has the correct addresses", async () => {
    const arbiter = await EscrowContract.arbiter();
    expect(arbiter).to.equal(addr1.address);

    const beneficiary = await EscrowContract.beneficiary();
    expect(beneficiary).to.equal(addr2.address);

    const depositor = await EscrowContract.depositor();
    expect(depositor).to.equal(addr3.address);
  });

  describe("Release Funds", () => {
    it("allows the arbiter to call releaseFunds", async () => {
      await expect(EscrowContract.connect(addr1).releaseFunds()).not.to.be
        .reverted;
    });

    it("does not allow non-arbiter to call releaseFunds", async () => {
      await expect(
        EscrowContract.connect(owner).releaseFunds()
      ).to.be.revertedWith("NOT_ARBITER");
      await expect(
        EscrowContract.connect(addr2).releaseFunds()
      ).to.be.revertedWith("NOT_ARBITER");
      await expect(
        EscrowContract.connect(addr3).releaseFunds()
      ).to.be.revertedWith("NOT_ARBITER");
    });

    it("transfers the balance of the contract", async () => {
      await owner.sendTransaction({
        to: EscrowContract.address,
        value: sentValue,
      });

      const escrowBalance = await ethers.provider.getBalance(
        EscrowContract.address
      );

      expect(escrowBalance).to.equal(sentValue);

      const prevBeneficiaryBalance = await ethers.provider.getBalance(
        addr2.address
      );

      await EscrowContract.connect(addr1).releaseFunds();

      const nextBeneficiaryBalance = await ethers.provider.getBalance(
        addr2.address
      );

      expect(nextBeneficiaryBalance).to.equal(
        prevBeneficiaryBalance.add(sentValue)
      );
    });

    it("emits Approved event", async () => {
      await expect(EscrowContract.connect(addr1).releaseFunds())
        .to.emit(EscrowContract, "Approved")
        .withArgs(0);
    });

    it("updates isApproved variable", async () => {
      expect(await EscrowContract.isApproved()).to.equal(false);
      await EscrowContract.connect(addr1).releaseFunds();
      expect(await EscrowContract.isApproved()).to.equal(true);
    });
  });
});
