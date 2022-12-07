import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import {
  VulnToUnexpectedEther,
  UnexpectedEtherAttack,
} from "../../typechain-types/contracts/Security";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("VulnToUnexpectedEther", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    VulnToUnexpectedEtherContract: VulnToUnexpectedEther,
    UnexpectedEtherAttackContract: UnexpectedEtherAttack;

  const { provider } = ethers;

  beforeEach(async () => {
    const VulnToUnexpectedEtherFactory = await ethers.getContractFactory(
      "VulnToUnexpectedEther"
    );
    VulnToUnexpectedEtherContract = await VulnToUnexpectedEtherFactory.deploy();

    const UnexpectedEtherAttackFactory = await ethers.getContractFactory(
      "UnexpectedEtherAttack"
    );
    UnexpectedEtherAttackContract = await UnexpectedEtherAttackFactory.deploy(
      VulnToUnexpectedEtherContract.address
    );

    [owner, addr1, addr2] = await ethers.getSigners();
  });

  it("has initial balance of 0 eth", async function () {
    expect(
      await provider.getBalance(VulnToUnexpectedEtherContract.address)
    ).to.equal(ethers.utils.parseEther("0"));
  });

  it("reverts when user tries to send eth to wallet", async function () {
    // Contract does not have a payable function other than pay so normal sendTransaction will revert
    await expect(
      owner.sendTransaction({
        to: VulnToUnexpectedEtherContract.address,
        value: 10,
      })
    ).to.be.reverted;
  });

  it("does not accepts values which are not 0.5 ether", async function () {
    await expect(
      VulnToUnexpectedEtherContract.play({
        value: ethers.utils.parseEther("1.0"),
      })
    ).to.be.revertedWith("INCORRECT_SENT_VALUE");

    await expect(
      VulnToUnexpectedEtherContract.play({
        value: ethers.utils.parseEther("0.1"),
      })
    ).to.be.revertedWith("INCORRECT_SENT_VALUE");

    await expect(
      VulnToUnexpectedEtherContract.play({
        value: ethers.utils.parseEther("0.51"),
      })
    ).to.be.revertedWith("INCORRECT_SENT_VALUE");
  });

  it("accepts 0.5 ether", async function () {
    await expect(
      VulnToUnexpectedEtherContract.play({
        value: ethers.utils.parseEther("0.5"),
      })
    ).not.to.be.reverted;

    const nextBalance = await provider.getBalance(
      VulnToUnexpectedEtherContract.address
    );

    expect(nextBalance).to.equal(ethers.utils.parseEther("0.5"));
  });

  it("cannot be played after attack", async function () {
    await expect(
      UnexpectedEtherAttackContract.attack({
        value: ethers.utils.parseEther("10.0"),
      })
    ).not.to.be.reverted;

    await expect(
      VulnToUnexpectedEtherContract.play({
        value: ethers.utils.parseEther("0.5"),
      })
    ).to.be.revertedWith("END_GAME_REACHED");
  });

  describe("milestone", async function () {
    beforeEach(async function () {
      await Promise.all(
        Array.from(Array(20).keys()).map(
          async () =>
            await VulnToUnexpectedEtherContract.play({
              value: ethers.utils.parseEther("0.5"),
            })
        )
      );

      const nextBalance = await provider.getBalance(
        VulnToUnexpectedEtherContract.address
      );

      expect(nextBalance).to.equal(ethers.utils.parseEther("10.0"));
    });

    it("reverts if player attempts play after milestone", async function () {
      await expect(
        VulnToUnexpectedEtherContract.play({
          value: ethers.utils.parseEther("0.5"),
        })
      ).to.be.revertedWith("END_GAME_REACHED");
    });

    it("allows player to redeem ether", async function () {
      await expect(VulnToUnexpectedEtherContract.claimReward()).not.to.be
        .reverted;

      const nextBalance = await provider.getBalance(
        VulnToUnexpectedEtherContract.address
      );

      expect(nextBalance).to.equal(0);
    });

    it("gets ether from the UnexpectedEtherAttackContract", async function () {
      await expect(
        UnexpectedEtherAttackContract.attack({
          value: ethers.utils.parseEther("1.0"),
        })
      ).not.to.be.reverted;

      const nextBalance = await provider.getBalance(
        VulnToUnexpectedEtherContract.address
      );

      expect(nextBalance).to.equal(ethers.utils.parseEther("11.0"));
    });

    it("prevents redemption after the attack", async function () {
      await expect(
        UnexpectedEtherAttackContract.attack({
          value: ethers.utils.parseEther("1.0"),
        })
      ).not.to.be.reverted;

      await expect(
        VulnToUnexpectedEtherContract.claimReward()
      ).to.be.revertedWith("NOT_AT_FINAL_MILESTONE");
    });
  });
});
