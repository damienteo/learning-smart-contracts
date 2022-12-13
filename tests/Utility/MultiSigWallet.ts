import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { MultiSigWallet } from "../../typechain-types/contracts/Utility";
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
    MultiSigWalletContract: MultiSigWallet;

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
});
