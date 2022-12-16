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

  const txIndex = 0;

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

    it("returns the owners of the contract", async () => {
      const owners = await MultiSigWalletContract.getOwners();

      expect(JSON.stringify(owners)).to.equal(JSON.stringify(multiSigOwners));
    });

    it("returns the transactionCount of the contract", async () => {
      const transactionCount =
        await MultiSigWalletContract.getTransactionCount();

      expect(transactionCount).to.equal(0);
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

    it("has confirmation status as initially false after transaction is newly submitted", async () => {
      const confirmation = await MultiSigWalletContract.isConfirmed(
        txIndex,
        addr1.address
      );
      expect(confirmation).to.equal(false);
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

      await expect(
        MultiSigWalletContract.connect(addr1).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      )
        .to.emit(MultiSigWalletContract, "SubmitTransaction")
        .withArgs(addr1.address, txIndex, TestContractAddress, nextValue, data);

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
          txIndex + 1,
          TestContractAddress,
          nextValue,
          data
        );
    });
  });

  describe("Confirm Transaction", async () => {
    const nextValue = 0;
    const calledValue = 2;

    beforeEach(async () => {
      const data = await TestContract.getData(calledValue);

      await MultiSigWalletContract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );
    });

    it("allows one owner to confirm a transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex)
      ).not.to.be.reverted;
    });

    it("changes confirmation status accordingly after user confirms a transaction", async () => {
      await MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex);

      const confirmation = await MultiSigWalletContract.isConfirmed(
        txIndex,
        addr2.address
      );
      expect(confirmation).to.equal(true);
    });

    it("increases transaction's number of confirmations accordingly after user revokes a transaction", async () => {
      const prevTx = await MultiSigWalletContract.getTransaction(txIndex);
      const prevNumOfConfirmations = prevTx.numConfirmations;

      await MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex);

      const tx = await MultiSigWalletContract.getTransaction(txIndex);
      const numOfConfirmations = tx.numConfirmations;

      expect(numOfConfirmations).to.equal(prevNumOfConfirmations.add(1));
    });

    it("stores input data in the contract", async () => {
      await MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex);

      const submittedTx = await MultiSigWalletContract.getTransaction(txIndex);
      expect(submittedTx[4]).to.equal(1); // tx.numConfirmations

      await MultiSigWalletContract.connect(addr3).confirmTransaction(txIndex);

      const submittedTxNextInfo = await MultiSigWalletContract.getTransaction(
        txIndex
      );
      expect(submittedTxNextInfo[4]).to.equal(2); // tx.numConfirmations
    });

    it("reverts if the user had already confirmed the tx before", async () => {
      await MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex);

      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "TxAlreadyConfirmed"
      );
    });

    it("prevents non-owners from confirming transactions", async () => {
      await expect(
        MultiSigWalletContract.connect(addr6).confirmTransaction(txIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "NotOwner");
    });

    it("prevents confirmation of non-existing transactions", async () => {
      await expect(
        MultiSigWalletContract.connect(addr4).confirmTransaction(txIndex + 1)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "TxDoesNotExist");
    });

    it("emits an event upon successful confirmation of transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex)
      )
        .to.emit(MultiSigWalletContract, "ConfirmTransaction")
        .withArgs(addr2.address, txIndex);
    });
  });

  describe("Revoke Transaction", async () => {
    const nextValue = 0;
    const calledValue = 2;

    beforeEach(async () => {
      const data = await TestContract.getData(calledValue);

      await MultiSigWalletContract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      await MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex);
    });

    it("allows one owner to revoke a transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(addr2).revokeConfirmation(txIndex)
      ).not.to.be.reverted;
    });

    it("changes confirmation status accordingly after user revokes a transaction", async () => {
      await MultiSigWalletContract.connect(addr2).revokeConfirmation(txIndex);

      const confirmation = await MultiSigWalletContract.isConfirmed(
        txIndex,
        addr2.address
      );
      expect(confirmation).to.equal(false);
    });

    it("decreases transaction's number of confirmations accordingly after user revokes a transaction", async () => {
      const prevTx = await MultiSigWalletContract.getTransaction(txIndex);
      const prevNumOfConfirmations = prevTx.numConfirmations;

      await MultiSigWalletContract.connect(addr2).revokeConfirmation(txIndex);

      const tx = await MultiSigWalletContract.getTransaction(txIndex);
      const numOfConfirmations = tx.numConfirmations;

      expect(numOfConfirmations).to.equal(prevNumOfConfirmations.sub(1));
    });

    it("prevents non-owners from revoking transactions", async () => {
      await expect(
        MultiSigWalletContract.connect(addr6).revokeConfirmation(txIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "NotOwner");
    });

    it("prevents revoking of confirmations from non-exisitng transactions", async () => {
      await expect(
        MultiSigWalletContract.connect(addr2).revokeConfirmation(txIndex + 1)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "TxDoesNotExist");
    });

    it("prevents revoking of confirmations if confirmations had not previously been made", async () => {
      await expect(
        MultiSigWalletContract.connect(addr1).revokeConfirmation(txIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "TxNotConfirmed");
    });

    it("emits an event upon successful confirmation of transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(addr2).revokeConfirmation(txIndex)
      )
        .to.emit(MultiSigWalletContract, "RevokeConfirmation")
        .withArgs(addr2.address, txIndex);
    });
  });

  describe("Execute Transaction", async () => {
    const nextValue = 0;
    const calledValue = 2;

    beforeEach(async () => {
      const data = await TestContract.getData(calledValue);

      await MultiSigWalletContract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      await expect(
        MultiSigWalletContract.connect(addr1).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletContract.connect(addr3).confirmTransaction(txIndex)
      );
    });

    it("allows one owner to execute a transaction", async () => {
      const prevTestValue = await TestContract.i();

      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(txIndex)
      ).not.to.be.reverted;

      const nextTestValue = await TestContract.i();

      expect(nextTestValue).to.equal(prevTestValue.add(calledValue));
    });

    it("emits an event upon successful execution of transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(txIndex)
      )
        .to.emit(MultiSigWalletContract, "ExecuteTransaction")
        .withArgs(owner.address, txIndex);
    });

    it("prevents non-owner from executing a transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(addr5).executeTransaction(txIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "NotOwner");
    });

    it("prevents execution of non-existent transaction", async () => {
      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(txIndex + 1)
      ).to.be.revertedWithCustomError(MultiSigWalletContract, "TxDoesNotExist");
    });

    it("prevents execution of transaction which has already executed", async () => {
      await MultiSigWalletContract.connect(owner).executeTransaction(txIndex);

      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "TxAlreadyExecuted"
      );
    });

    it("prevents confirmation of a transaction which has already executed", async () => {
      await MultiSigWalletContract.connect(owner).executeTransaction(txIndex);

      await expect(
        MultiSigWalletContract.connect(addr4).confirmTransaction(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "TxAlreadyExecuted"
      );
    });

    it("prevents revoking of the confirmation of a transaction which has already executed", async () => {
      await MultiSigWalletContract.connect(owner).executeTransaction(txIndex);

      await expect(
        MultiSigWalletContract.connect(addr1).revokeConfirmation(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "TxAlreadyExecuted"
      );
    });

    it("prevents execution of transaction which does not have enough confirmations", async () => {
      const data = await TestContract.getData(2);
      const nextTxIndex = txIndex + 1;

      await MultiSigWalletContract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "NotEnoughConfirmations"
      );

      // First Confirmation

      await expect(
        MultiSigWalletContract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "NotEnoughConfirmations"
      );

      // Second Confirmation

      await expect(
        MultiSigWalletContract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletContract,
        "NotEnoughConfirmations"
      );

      // Third Confirmation

      await expect(
        MultiSigWalletContract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletContract.connect(owner).executeTransaction(nextTxIndex)
      ).not.to.be.reverted;
    });
  });
});
