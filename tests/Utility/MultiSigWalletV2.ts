import { expect } from "chai";
import { ethers } from "hardhat";

import {
  MultiSigWalletV2,
  TestContract,
} from "../../typechain-types/contracts/Utility";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ZERO_ADDRESS } from "../../constants/constants";

const multiSigWalletJson = require("../../artifacts/contracts/utility/MultiSigWalletV2.sol/MultiSigWalletV2.json");

const MultiSigWalletV2ContractInterface = new ethers.utils.Interface(
  multiSigWalletJson.abi
);

describe("MultiSigWalletV2", () => {
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
    MultiSigWalletV2Contract: MultiSigWalletV2,
    TestContract: TestContract,
    TestContractAddress: string;

  const txIndex = 0;
  const nextTxIndex = txIndex + 1;

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

    const MultiSigWalletV2Factory = await ethers.getContractFactory(
      "MultiSigWalletV2"
    );
    MultiSigWalletV2Contract = await MultiSigWalletV2Factory.deploy(
      multiSigOwners,
      multiSigOwners.length - 2
    );

    const TestContractFactory = await ethers.getContractFactory("TestContract");
    TestContract = await TestContractFactory.deploy();

    TestContractAddress = TestContract.address;
  });

  describe("Deployment", async () => {
    it("reverts if zero owner addressed are passed", async () => {
      const nextMultiSigWalletV2Factory = await ethers.getContractFactory(
        "MultiSigWalletV2"
      );

      await expect(
        nextMultiSigWalletV2Factory.deploy([], multiSigOwners.length)
      ).to.be.revertedWithCustomError(
        nextMultiSigWalletV2Factory,
        "OwnersRequired"
      );
    });

    it("reverts if _numConfirmationsRequired is less than number of owners", async () => {
      const nextNumOfConfirmations = multiSigOwners.length + 1;
      const nextMultiSigWalletV2Factory = await ethers.getContractFactory(
        "MultiSigWalletV2"
      );

      await expect(
        nextMultiSigWalletV2Factory.deploy(
          multiSigOwners,
          nextNumOfConfirmations
        )
      ).to.be.revertedWithCustomError(
        nextMultiSigWalletV2Factory,
        "InvalidRequiredConfirmations"
      );
    });

    it("reverts if _numConfirmationsRequired is zero", async () => {
      const nextMultiSigWalletV2Factory = await ethers.getContractFactory(
        "MultiSigWalletV2"
      );

      await expect(
        nextMultiSigWalletV2Factory.deploy(multiSigOwners, 0)
      ).to.be.revertedWithCustomError(
        nextMultiSigWalletV2Factory,
        "InvalidRequiredConfirmations"
      );
    });

    it("returns the owners of the contract", async () => {
      const owners = await MultiSigWalletV2Contract.getOwners();

      expect(JSON.stringify(owners)).to.equal(JSON.stringify(multiSigOwners));
    });

    it("returns the transactionCount of the contract", async () => {
      const transactionCount =
        await MultiSigWalletV2Contract.getTransactionCount();

      expect(transactionCount).to.equal(0);
    });
  });

  describe("Submit Transaction", async () => {
    it("allows one owner to submit a transaction", async () => {
      const nextValue = 0;
      const data = await TestContract.getData(2);

      await expect(
        MultiSigWalletV2Contract.connect(addr1).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      ).not.to.be.reverted;
    });

    it("stores input data in the contract", async () => {
      const data = await TestContract.getData(2);
      const nextValue = 0;

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      const submittedTx = await MultiSigWalletV2Contract.getTransaction(0);
      expect(submittedTx[0]).to.equal(TestContractAddress); // tx.to
      expect(submittedTx[1]).to.equal(nextValue); // tx.value
      expect(submittedTx[2]).to.equal(data); // tx.data
    });

    it("shows the correct status data", async () => {
      const data = await TestContract.getData(2);

      const nextValue = 0;

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      const submittedTx = await MultiSigWalletV2Contract.getTransaction(0);
      expect(submittedTx[3]).to.equal(false); // tx.executed
      expect(submittedTx[4]).to.equal(0); // tx.numConfirmations
    });

    it("has confirmation status as initially false after transaction is newly submitted", async () => {
      const confirmation = await MultiSigWalletV2Contract.isConfirmed(
        txIndex,
        addr1.address
      );
      expect(confirmation).to.equal(false);
    });

    it("prevents non-owners from submitting transactions", async () => {
      const data = await TestContract.getData(2);

      const nextValue = 0;

      await expect(
        MultiSigWalletV2Contract.connect(addr5).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotOwner");
    });

    it("emits an event upon successful submission of transaction", async () => {
      const data = await TestContract.getData(2);
      const nextValue = 0;

      await expect(
        MultiSigWalletV2Contract.connect(addr1).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      )
        .to.emit(MultiSigWalletV2Contract, "SubmitTransaction")
        .withArgs(addr1.address, txIndex, TestContractAddress, nextValue, data);

      await expect(
        MultiSigWalletV2Contract.connect(addr1).submitTransaction(
          TestContractAddress,
          nextValue,
          data
        )
      )
        .to.emit(MultiSigWalletV2Contract, "SubmitTransaction")
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

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );
    });

    it("allows one owner to confirm a transaction", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      ).not.to.be.reverted;
    });

    it("changes confirmation status accordingly after user confirms a transaction", async () => {
      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex);

      const confirmation = await MultiSigWalletV2Contract.isConfirmed(
        txIndex,
        addr2.address
      );
      expect(confirmation).to.equal(true);
    });

    it("increases transaction's number of confirmations accordingly after user revokes a transaction", async () => {
      const prevTx = await MultiSigWalletV2Contract.getTransaction(txIndex);
      const prevNumOfConfirmations = prevTx.numConfirmations;

      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex);

      const tx = await MultiSigWalletV2Contract.getTransaction(txIndex);
      const numOfConfirmations = tx.numConfirmations;

      expect(numOfConfirmations).to.equal(prevNumOfConfirmations.add(1));
    });

    it("stores input data in the contract", async () => {
      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex);

      const submittedTx = await MultiSigWalletV2Contract.getTransaction(
        txIndex
      );
      expect(submittedTx[4]).to.equal(1); // tx.numConfirmations

      await MultiSigWalletV2Contract.connect(addr3).confirmTransaction(txIndex);

      const submittedTxNextInfo = await MultiSigWalletV2Contract.getTransaction(
        txIndex
      );
      expect(submittedTxNextInfo[4]).to.equal(2); // tx.numConfirmations
    });

    it("reverts if the user had already confirmed the tx before", async () => {
      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex);

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxAlreadyConfirmed"
      );
    });

    it("prevents non-owners from confirming transactions", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr6).confirmTransaction(txIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotOwner");
    });

    it("prevents confirmation of non-existing transactions", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr4).confirmTransaction(txIndex + 1)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxDoesNotExist"
      );
    });

    it("emits an event upon successful confirmation of transaction", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "ConfirmTransaction")
        .withArgs(addr2.address, txIndex);
    });
  });

  describe("Revoke Transaction", async () => {
    const nextValue = 0;
    const calledValue = 2;

    beforeEach(async () => {
      const data = await TestContract.getData(calledValue);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex);
    });

    it("allows one owner to revoke a transaction", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr2).revokeConfirmation(txIndex)
      ).not.to.be.reverted;
    });

    it("changes confirmation status accordingly after user revokes a transaction", async () => {
      await MultiSigWalletV2Contract.connect(addr2).revokeConfirmation(txIndex);

      const confirmation = await MultiSigWalletV2Contract.isConfirmed(
        txIndex,
        addr2.address
      );
      expect(confirmation).to.equal(false);
    });

    it("decreases transaction's number of confirmations accordingly after user revokes a transaction", async () => {
      const prevTx = await MultiSigWalletV2Contract.getTransaction(txIndex);
      const prevNumOfConfirmations = prevTx.numConfirmations;

      await MultiSigWalletV2Contract.connect(addr2).revokeConfirmation(txIndex);

      const tx = await MultiSigWalletV2Contract.getTransaction(txIndex);
      const numOfConfirmations = tx.numConfirmations;

      expect(numOfConfirmations).to.equal(prevNumOfConfirmations.sub(1));
    });

    it("prevents non-owners from revoking transactions", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr6).revokeConfirmation(txIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotOwner");
    });

    it("prevents revoking of confirmations from non-exisitng transactions", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr2).revokeConfirmation(txIndex + 1)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxDoesNotExist"
      );
    });

    it("prevents revoking of confirmations if confirmations had not previously been made", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr1).revokeConfirmation(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxNotConfirmed"
      );
    });

    it("emits an event upon successful confirmation of transaction", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr2).revokeConfirmation(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "RevokeConfirmation")
        .withArgs(addr2.address, txIndex);
    });
  });

  describe("Execute Transaction", async () => {
    const nextValue = 0;
    const calledValue = 2;

    beforeEach(async () => {
      const data = await TestContract.getData(calledValue);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(txIndex)
      );
    });

    it("allows one owner to execute a transaction", async () => {
      const prevTestValue = await TestContract.i();

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      ).not.to.be.reverted;

      const nextTestValue = await TestContract.i();

      expect(nextTestValue).to.equal(prevTestValue.add(calledValue));
    });

    it("emits an event upon successful execution of transaction", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "ExecuteTransaction")
        .withArgs(owner.address, txIndex);
    });

    it("prevents non-owner from executing a transaction", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(addr5).executeTransaction(txIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotOwner");
    });

    it("prevents execution of non-existent transaction", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex + 1)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxDoesNotExist"
      );
    });

    it("prevents execution of transaction which has already executed", async () => {
      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxAlreadyExecuted"
      );
    });

    it("prevents confirmation of a transaction which has already executed", async () => {
      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      await expect(
        MultiSigWalletV2Contract.connect(addr4).confirmTransaction(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxAlreadyExecuted"
      );
    });

    it("prevents revoking of the confirmation of a transaction which has already executed", async () => {
      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      await expect(
        MultiSigWalletV2Contract.connect(addr1).revokeConfirmation(txIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "TxAlreadyExecuted"
      );
    });

    it("prevents execution of transaction which does not have enough confirmations", async () => {
      const data = await TestContract.getData(2);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        TestContractAddress,
        nextValue,
        data
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "NotEnoughConfirmations"
      );

      // First Confirmation

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "NotEnoughConfirmations"
      );

      // Second Confirmation

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(
        MultiSigWalletV2Contract,
        "NotEnoughConfirmations"
      );

      // Third Confirmation

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).not.to.be.reverted;
    });
  });

  describe("Deposit and Transfer of Network Token", async () => {
    const sentValue = ethers.utils.parseEther("1");

    it("Updates the balance of the Smart Contract when value is sent", async () => {
      const prevBalance = await ethers.provider.getBalance(
        MultiSigWalletV2Contract.address
      );

      await owner.sendTransaction({
        to: MultiSigWalletV2Contract.address,
        value: sentValue,
      });

      const nextBalance = await ethers.provider.getBalance(
        MultiSigWalletV2Contract.address
      );

      expect(nextBalance).to.equal(prevBalance.add(sentValue));
    });

    it("Emits Deposit event when value is transfered to the contract", async () => {
      await expect(
        addr1.sendTransaction({
          to: MultiSigWalletV2Contract.address,
          value: sentValue,
        })
      )
        .to.emit(MultiSigWalletV2Contract, "Deposit")
        .withArgs(addr1.address, sentValue, sentValue);
    });

    it("Emits Deposit event with updated balance when more value is transfered to the contract", async () => {
      await owner.sendTransaction({
        to: MultiSigWalletV2Contract.address,
        value: sentValue,
      });

      await expect(
        owner.sendTransaction({
          to: MultiSigWalletV2Contract.address,
          value: sentValue,
        })
      )
        .to.emit(MultiSigWalletV2Contract, "Deposit")
        .withArgs(owner.address, sentValue, ethers.utils.parseEther("2"));
    });

    it("Allows transactions in which value is dispersed to other contracts", async () => {
      await owner.sendTransaction({
        to: MultiSigWalletV2Contract.address,
        value: ethers.utils.parseEther("10"),
      });

      const scBalance = await ethers.provider.getBalance(
        MultiSigWalletV2Contract.address
      );

      await MultiSigWalletV2Contract.connect(owner).submitTransaction(
        addr1.address,
        sentValue,
        "0x" // the equivalent of empty data
      );

      await MultiSigWalletV2Contract.connect(addr1).confirmTransaction(txIndex);

      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex);

      await MultiSigWalletV2Contract.connect(addr3).confirmTransaction(txIndex);

      const prevBalance = await addr1.getBalance();

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      // Expects balance of Smart Contract to be updated
      const nextScBalance = await ethers.provider.getBalance(
        MultiSigWalletV2Contract.address
      );
      expect(nextScBalance).to.equal(scBalance.sub(sentValue));

      // Expects balance of Target Address to be updated
      const nextBalance = await addr1.getBalance();
      expect(nextBalance).to.equal(
        prevBalance.add(ethers.utils.parseEther("1"))
      );
    });
  });

  describe("Add Owner", async () => {
    beforeEach(async () => {
      const addOwnerData = MultiSigWalletV2ContractInterface.encodeFunctionData(
        "addOwner",
        [addr5.address]
      );

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        addOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(txIndex)
      );
    });

    it("allows addition of an owner", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      ).not.to.be.reverted;
    });

    it("updates owners array", async () => {
      const prevOwners = await MultiSigWalletV2Contract.getOwners();

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      const nextOwners = await MultiSigWalletV2Contract.getOwners();

      const nextOwnerLength = nextOwners.length;

      expect(nextOwnerLength).to.equal(prevOwners.length + 1);
      expect(nextOwners[nextOwnerLength - 1]).to.equal(addr5.address);
    });

    it("updates isOwner status for new address", async () => {
      expect(await MultiSigWalletV2Contract.isOwner(addr5.address)).to.equal(
        false
      );

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      expect(await MultiSigWalletV2Contract.isOwner(addr5.address)).to.equal(
        true
      );
    });

    it("emits OwnerAddition event when owner is added", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "OwnerAddition")
        .withArgs(addr5.address);
    });

    it("does not allow re-addition of existing owner", async () => {
      const addOwnerData = MultiSigWalletV2ContractInterface.encodeFunctionData(
        "addOwner",
        [addr4.address]
      );

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        addOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow addition of null address", async () => {
      const addOwnerData = MultiSigWalletV2ContractInterface.encodeFunctionData(
        "addOwner",
        [ZERO_ADDRESS]
      );

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        addOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow other wallets to directly call the addOwner method", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).addOwner(addr6.address)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotMultiSig");
    });
  });

  describe("Remove Owner", async () => {
    beforeEach(async () => {
      const removeOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("removeOwner", [
          addr3.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        removeOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(txIndex)
      );
    });

    it("allows removal of an owner", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      ).not.to.be.reverted;
    });

    it("updates owners array", async () => {
      const prevOwners = await MultiSigWalletV2Contract.getOwners();

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      const nextOwners = await MultiSigWalletV2Contract.getOwners();

      const nextOwnerLength = nextOwners.length;

      expect(nextOwnerLength).to.equal(prevOwners.length - 1);
      expect(nextOwners.includes(addr3.address)).to.equal(false);
    });

    it("updates isOwner status for removed address", async () => {
      expect(await MultiSigWalletV2Contract.isOwner(addr3.address)).to.equal(
        true
      );

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      expect(await MultiSigWalletV2Contract.isOwner(addr3.address)).to.equal(
        false
      );
    });

    it("emits OwnerRemoval event when owner is removed", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "OwnerRemoval")
        .withArgs(addr3.address);
    });

    it("automatically reduces numConfirmationsRequired if enough owners are removed ", async () => {
      // addr3 is removed in txIndex
      // addr4 and addr2 will be removed later
      // As such, there will only be 2 owners left in the contract
      // numConfirmationsRequired should decrease accordingly,
      // as remaining owner will otherwise be locked out of the contract

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      const removeOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("removeOwner", [
          addr4.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        removeOwnerData
      );

      await MultiSigWalletV2Contract.connect(addr1).confirmTransaction(
        nextTxIndex
      );

      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(
        nextTxIndex
      );

      await MultiSigWalletV2Contract.connect(owner).confirmTransaction(
        nextTxIndex
      );

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(
        nextTxIndex
      );

      const nextRemoveOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("removeOwner", [
          addr2.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        nextRemoveOwnerData
      );

      await MultiSigWalletV2Contract.connect(addr1).confirmTransaction(
        nextTxIndex + 1
      );

      await MultiSigWalletV2Contract.connect(addr2).confirmTransaction(
        nextTxIndex + 1
      );

      await MultiSigWalletV2Contract.connect(owner).confirmTransaction(
        nextTxIndex + 1
      );

      const prevOwners = await MultiSigWalletV2Contract.getOwners();
      const nextOwnerLength = prevOwners.length - 1;

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(
          nextTxIndex + 1
        )
      )
        .to.emit(MultiSigWalletV2Contract, "RequirementChange")
        .withArgs(nextOwnerLength);

      const nextNumConfirmationsRequired =
        await MultiSigWalletV2Contract.numConfirmationsRequired();

      expect(nextNumConfirmationsRequired).to.equal(nextOwnerLength);
    });

    it("does not allow removal of non-existing owner", async () => {
      const removeOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("removeOwner", [
          addr6.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        removeOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow removal of null address", async () => {
      const removeOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("removeOwner", [
          ZERO_ADDRESS,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        removeOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow other wallets to directly call the removeOwner method", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).removeOwner(owner.address)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotMultiSig");
    });
  });

  describe("Replace Owner", async () => {
    beforeEach(async () => {
      const replaceOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("replaceOwner", [
          addr2.address,
          addr5.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        replaceOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(txIndex)
      );
    });

    it("allows replacement of an owner", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      ).not.to.be.reverted;
    });

    it("updates owners array", async () => {
      const prevOwners = await MultiSigWalletV2Contract.getOwners();
      expect(prevOwners.includes(addr2.address)).to.equal(true);
      expect(prevOwners.includes(addr5.address)).to.equal(false);

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      const nextOwners = await MultiSigWalletV2Contract.getOwners();

      expect(nextOwners.length).to.equal(prevOwners.length);
      expect(nextOwners.includes(addr2.address)).to.equal(false);
      expect(nextOwners.includes(addr5.address)).to.equal(true);
    });

    it("updates isOwner status for previous address", async () => {
      expect(await MultiSigWalletV2Contract.isOwner(addr2.address)).to.equal(
        true
      );

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      expect(await MultiSigWalletV2Contract.isOwner(addr2.address)).to.equal(
        false
      );
    });

    it("updates isOwner status for new address", async () => {
      expect(await MultiSigWalletV2Contract.isOwner(addr5.address)).to.equal(
        false
      );

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      expect(await MultiSigWalletV2Contract.isOwner(addr5.address)).to.equal(
        true
      );
    });

    it("emits OwnerAddition event when new owner replaces the previous owner", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "OwnerAddition")
        .withArgs(addr5.address);
    });

    it("also emits OwnerRemoval event since previous owner is replaced", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "OwnerRemoval")
        .withArgs(addr2.address);
    });

    it("does not allow replacement with an existing owner", async () => {
      const replaceOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("replaceOwner", [
          addr3.address,
          addr1.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        replaceOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow replacement with a null address", async () => {
      const replaceOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("replaceOwner", [
          addr3.address,
          ZERO_ADDRESS,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        replaceOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow replacement of an non-existing owner", async () => {
      const replaceOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("replaceOwner", [
          addr7.address,
          addr8.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        replaceOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow replacement of a null address", async () => {
      const replaceOwnerData =
        MultiSigWalletV2ContractInterface.encodeFunctionData("replaceOwner", [
          ZERO_ADDRESS,
          addr8.address,
        ]);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        replaceOwnerData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });

    it("does not allow other wallets to directly call the addOwner method", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).replaceOwner(
          addr4.address,
          addr6.address
        )
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotMultiSig");
    });
  });

  describe("Change Requirements", async () => {
    const newRequirement = 2;

    beforeEach(async () => {
      const changeRequirementData =
        MultiSigWalletV2ContractInterface.encodeFunctionData(
          "changeRequirement",
          [newRequirement]
        );

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        changeRequirementData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(txIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(txIndex)
      );
    });

    it("allows requirement for number of confirmations to be changed", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      ).not.to.be.reverted;
    });

    it("updates numConfirmationsRequired", async () => {
      const prevNumConfirmationsRequired =
        await MultiSigWalletV2Contract.numConfirmationsRequired();
      expect(prevNumConfirmationsRequired).to.equal(3);

      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      const nextNumConfirmationsRequired =
        await MultiSigWalletV2Contract.numConfirmationsRequired();
      expect(nextNumConfirmationsRequired).to.equal(newRequirement);
    });

    it("requires only the new confirmation requirement to execute a transaction", async () => {
      await MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex);

      const data = await TestContract.getData(1);

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        TestContractAddress,
        0,
        data
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(nextTxIndex)
      ).not.to.be.reverted;
    });

    it("emits RequirementChange event when the requirement is changed", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).executeTransaction(txIndex)
      )
        .to.emit(MultiSigWalletV2Contract, "RequirementChange")
        .withArgs(newRequirement);
    });

    it("does not allow other wallets to directly call the changeRequirement method", async () => {
      await expect(
        MultiSigWalletV2Contract.connect(owner).changeRequirement(2)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "NotMultiSig");
    });

    it("does not allow requirement to increase above the number of owners", async () => {
      const owners = await MultiSigWalletV2Contract.getOwners();

      const changeRequirementData =
        MultiSigWalletV2ContractInterface.encodeFunctionData(
          "changeRequirement",
          [owners.length + 1]
        );

      await MultiSigWalletV2Contract.connect(addr1).submitTransaction(
        MultiSigWalletV2Contract.address,
        0,
        changeRequirementData
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr2).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr3).confirmTransaction(nextTxIndex)
      );

      await expect(
        MultiSigWalletV2Contract.connect(addr1).executeTransaction(nextTxIndex)
      ).to.be.revertedWithCustomError(MultiSigWalletV2Contract, "TxFailure");
    });
  });
});
