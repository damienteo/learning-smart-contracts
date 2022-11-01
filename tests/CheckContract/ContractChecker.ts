import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ContractChecker } from "../../typechain-types/contracts/CheckContract";

const NEXT_BALANCE = 123;

describe("ContractChecker", () => {
  let ContractChecker,
    contractCheckerContract: ContractChecker,
    owner: SignerWithAddress;

  beforeEach(async () => {
    ContractChecker = await ethers.getContractFactory("ContractChecker");
    contractCheckerContract = await ContractChecker.deploy();
    [owner] = await ethers.getSigners();
  });

  it("should have initial balance of zero", async () => {
    expect(await contractCheckerContract.balance()).to.equal(0);
  });

  it("accepts non-contract wallet addresses", async () => {
    const txn = await contractCheckerContract.interact(NEXT_BALANCE);
    const response = await txn.wait();

    expect(await contractCheckerContract.balance()).to.equal(NEXT_BALANCE);
  });

  it("rejects Normal Contracts", async () => {
    const NormalContract = await ethers.getContractFactory("NormalContract");
    const normalContract = await NormalContract.deploy(
      contractCheckerContract.address
    );

    await expect(normalContract.getChecked(NEXT_BALANCE)).to.be.revertedWith(
      "Contract found!"
    );
  });

  it("accepts ActuallyAContract, which is meant to bypass isNotContract modifier", async () => {
    const ActuallyAContract = await ethers.getContractFactory(
      "ActuallyAContract"
    );
    const actuallyAContract = await ActuallyAContract.deploy(
      contractCheckerContract.address,
      NEXT_BALANCE
    );

    await actuallyAContract.deployed();

    expect(await contractCheckerContract.balance()).to.equal(NEXT_BALANCE);
  });
});
