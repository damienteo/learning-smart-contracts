import { expect } from "chai";
import { ethers } from "hardhat";

import {
  MultiSigWallet,
  TestContract,
} from "../../typechain-types/contracts/Utility";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("MultiSigWallet", () => {
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
    multiSigOwners: string[],
    MultiSigWalletContract: MultiSigWallet,
    TestContract: TestContract,
    TestContractAddress: string;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9] =
      await ethers.getSigners();
    multiSigOwners = [
      owner.address,
      addr1.address,
      addr2.address,
      addr3.address,
      addr4.address,
    ];

    const MultiSigWalletFactory = await ethers.getContractFactory(
      "MultiSigWallet"
    );
    MultiSigWalletContract = await MultiSigWalletFactory.deploy(
      multiSigOwners,
      multiSigOwners.length - 2
    );

    const TestContractFactory = await ethers.getContractFactory("TestContract");
    TestContract = await TestContractFactory.deploy();

    TestContractAddress = TestContract.address;
  });

  describe("Deployment", async () => {
    it("reverts if zero owner addressed are passed", async () => {
      const nextMultiSigWalletFactory = await ethers.getContractFactory(
        "MultiSigWallet"
      );

      await expect(
        nextMultiSigWalletFactory.deploy([], multiSigOwners.length)
      ).to.be.revertedWithCustomError(
        nextMultiSigWalletFactory,
        "OwnersRequired"
      );
    });

    it("reverts if _numConfirmationsRequired is less than number of owners", async () => {
      const nextNumOfConfirmations = multiSigOwners.length + 1;
      const nextMultiSigWalletFactory = await ethers.getContractFactory(
        "MultiSigWallet"
      );

      await expect(
        nextMultiSigWalletFactory.deploy(multiSigOwners, nextNumOfConfirmations)
      ).to.be.revertedWithCustomError(
        nextMultiSigWalletFactory,
        "InvalidNumberOfRequiredConfirmations"
      );
    });

    it("reverts if _numConfirmationsRequired is zero", async () => {
      const nextMultiSigWalletFactory = await ethers.getContractFactory(
        "MultiSigWallet"
      );

      await expect(
        nextMultiSigWalletFactory.deploy(multiSigOwners, 0)
      ).to.be.revertedWithCustomError(
        nextMultiSigWalletFactory,
        "InvalidNumberOfRequiredConfirmations"
      );
    });
  });

  describe("Submit Transaction", async () => {
    it("allows one owner to submit a transaction", async () => {
      const nextValue = 0;
      const data = await TestContract.getData(2);

      await expect(
        MultiSigWalletContract.connect(addr1).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      ).not.to.be.reverted;
    });

    it("stores input data in the contract", async () => {
      const data = await TestContract.getData(2);
      const nextValue = 0;

      await MultiSigWalletContract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      const submittedTx = await MultiSigWalletContract.getTransaction(0);
      expect(submittedTx[0]).to.equal(TestContractAddress); // tx.to
      expect(submittedTx[1]).to.equal(nextValue); // tx.value
      expect(submittedTx[2]).to.equal(data); // tx.data
    });

    it("shows the correct status data", async () => {
      const data = await TestContract.getData(2);

      const nextValue = 0;

      await MultiSigWalletContract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      const submittedTx = await MultiSigWalletContract.getTransaction(0);
      expect(submittedTx[3]).to.equal(false); // tx.executed
      expect(submittedTx[4]).to.equal(0); // tx.numConfirmations
    });

    it("prevents non-owners from submitting transactions", async () => {
      const data = await TestContract.getData(2);

      const nextValue = 0;

      await expect(
        MultiSigWalletContract.connect(addr5).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "NotOwner");
    });

    it("emits an event upon successful submission of transaction", async () => {
      const data = await TestContract.getData(2);
      const nextValue = 0;
      const nextTxIndex = 0;

      await expect(
        MultiSigWalletContract.connect(addr1).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      )
        .to.emit(MultiSigWalletContract, "SubmitTransaction")
        .withArgs(
          addr1.address,
          nextTxIndex,
          TestContractAddress,
          nextValue,
          data
        );

      await expect(
        MultiSigWalletContract.connect(addr1).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      )
        .to.emit(MultiSigWalletContract, "SubmitTransaction")
        .withArgs(
          addr1.address,
          nextTxIndex + 1,
          TestContractAddress,
          nextValue,
          data
        );
    });
  });

  describe("Confirm Transaction", async () => {
    const nextValue = 0;
    const nextTxIndex = 0;

    beforeEach(async () => {
      const data = await TestContract.getData(2);

      await MultiSigWalletContract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );
    });

    it("allows one owner to confirm a transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(nextTxIndex)
      ).not.to.be.reverted;
    });

    it("stores input data in the contract", async () => {
      await MultiSigWalletContract.connect(addr2).confirmTransaction(
        nextTxIndex
      );

      const submittedTx = await MultiSigWalletContract.getTransaction(
        nextTxIndex
      );
      expect(submittedTx[4]).to.equal(1); // tx.numConfirmations

      await MultiSigWalletContract.connect(addr3).confirmTransaction(
        nextTxIndex
      );

      const submittedTxNextInfo = await MultiSigWalletContract.getTransaction(
        nextTxIndex
      );
      expect(submittedTxNextInfo[4]).to.equal(2); // tx.numConfirmations
    });

    it("reverts if the user had already confirmed the tx before", async () => {
      await MultiSigWalletContract.connect(addr2).confirmTransaction(
        nextTxIndex
      );

      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "TxAlreadyConfirmed"
      );
    });

    it("prevents non-owners from submitting transactions", async () => {
      await expect(
        MultiSigWalletContract.connect(addr6).confirmTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "NotOwner");
    });

    it("prevents confirmation of non-existing transactions", async () => {
      await expect(
        MultiSigWalletContract.connect(addr4).confirmTransaction(
          nextTxIndex + 1
        )
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "TxDoesNotExist");
    });

    it("emits an event upon successful submission of transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(nextTxIndex)
      )
        .to.emit(MultiSigWalletContract, "ConfirmTransaction")
        .withArgs(addr2.address, nextTxIndex);
    });
  });
});
