import { expect } from "chai";
import { ethers } from "hardhat";
import { Event } from "ethers";
import { TransactionResponse } from "@ethersproject/providers";

import { Escrow } from "../../typechain-types/contracts/Utility/Escrow";
import { EscrowInitializable } from "../../typechain-types/contracts/Utility/EscrowInitializable";
import { EscrowProxyFactory } from "../../typechain-types/contracts/Utility/EscrowProxyFactory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const sentValue = ethers.utils.parseEther("1");

const getGas = async (tx: TransactionResponse) => {
  const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

  // const { gasUsed, effectiveGasPrice } = receipt;
  return receipt.gasUsed.toString();
};

describe("Escrow", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    EscrowContract: Escrow,
    EscrowInitializableContract: EscrowInitializable,
    EscrowProxyFactoryContract: EscrowProxyFactory;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Normal Escrow Contract
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    EscrowContract = await EscrowFactory.deploy(
      addr1.address,
      addr2.address,
      addr3.address
    );

    // Escrow Logic for Clones
    const EscrowInitializableFactory = await ethers.getContractFactory(
      "EscrowInitializable"
    );
    EscrowInitializableContract = await EscrowInitializableFactory.deploy();

    //  Escrow Factory for Escrow Clones
    const EscrowProxyFactoryFactory = await ethers.getContractFactory(
      "EscrowProxyFactory"
    );
    EscrowProxyFactoryContract = await EscrowProxyFactoryFactory.deploy(
      EscrowInitializableContract.address
    );
  });

  it("allows creation of an escrow clone", async () => {
    await expect(
      EscrowProxyFactoryContract.createNewEscrow(
        addr1.address,
        addr2.address,
        addr3.address,
        { value: sentValue }
      )
    ).not.to.be.reverted;
  });

  describe("Escrow Clone", async () => {
    let EscrowCloneContract: EscrowInitializable;

    beforeEach(async () => {
      await EscrowProxyFactoryContract.createNewEscrow(
        addr1.address,
        addr2.address,
        addr3.address,
        { value: sentValue }
      );

      const cloneAddress = await EscrowProxyFactoryContract.allClones(0);

      EscrowCloneContract = await ethers.getContractAt(
        "EscrowInitializable",
        cloneAddress
      );
    });

    it("has the correct addresses", async () => {
      const arbiter = await EscrowCloneContract.arbiter();
      expect(arbiter).to.equal(addr1.address);

      const beneficiary = await EscrowCloneContract.beneficiary();
      expect(beneficiary).to.equal(addr2.address);

      const depositor = await EscrowCloneContract.depositor();
      expect(depositor).to.equal(addr3.address);
    });

    describe("Release Funds", () => {
      it("allows the arbiter to call releaseFunds", async () => {
        await expect(EscrowCloneContract.connect(addr1).releaseFunds()).not.to
          .be.reverted;
      });

      it("does not allow non-arbiter to call releaseFunds", async () => {
        await expect(
          EscrowCloneContract.connect(owner).releaseFunds()
        ).to.be.revertedWith("NOT_ARBITER");
        await expect(
          EscrowCloneContract.connect(addr2).releaseFunds()
        ).to.be.revertedWith("NOT_ARBITER");
        await expect(
          EscrowCloneContract.connect(addr3).releaseFunds()
        ).to.be.revertedWith("NOT_ARBITER");
      });

      it("transfers the balance of the contract", async () => {
        const escrowBalance = await ethers.provider.getBalance(
          EscrowCloneContract.address
        );

        expect(escrowBalance).to.equal(sentValue);

        const prevBeneficiaryBalance = await ethers.provider.getBalance(
          addr2.address
        );

        await EscrowCloneContract.connect(addr1).releaseFunds();

        const nextBeneficiaryBalance = await ethers.provider.getBalance(
          addr2.address
        );

        expect(nextBeneficiaryBalance).to.equal(
          prevBeneficiaryBalance.add(sentValue)
        );
      });

      it("emits Approved event", async () => {
        await expect(EscrowCloneContract.connect(addr1).releaseFunds())
          .to.emit(EscrowCloneContract, "Approved")
          .withArgs(sentValue);
      });

      it("updates isApproved variable", async () => {
        expect(await EscrowCloneContract.isApproved()).to.equal(false);
        await EscrowCloneContract.connect(addr1).releaseFunds();
        expect(await EscrowCloneContract.isApproved()).to.equal(true);
      });
    });
  });
});
