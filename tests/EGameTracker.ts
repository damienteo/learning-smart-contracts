import { expect } from "chai";
import { ethers } from "hardhat";

import { EGameTracker, EGame } from "../typechain-types/contracts/Prize";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const amount = 123;
const MINTER_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("MINTER_ROLE")
);
const NEXT_SCORE = 10;

describe("EGameTracker", () => {
  let EGameTracker,
    to: string,
    owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    eGameTrackerContract: EGameTracker,
    eGameContract: EGame;

  beforeEach(async () => {
    const EGameFactory = await ethers.getContractFactory("EGame");
    eGameContract = await EGameFactory.deploy();

    EGameTracker = await ethers.getContractFactory("EGameTracker");

    [owner, addr1, addr2] = await ethers.getSigners();
    to = addr1.address;
    eGameTrackerContract = await EGameTracker.deploy(eGameContract.address);

    await eGameContract.grantRole(MINTER_ROLE, eGameTrackerContract.address);
  });

  it("Checks Signature", async function () {
    const hash = await eGameTrackerContract.getMessageHash(to, amount);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    expect(await eGameTrackerContract.verify(to, amount, sig)).to.equal(true);
  });

  it("Rejects verification with incorrect amount", async function () {
    const hash = await eGameTrackerContract.getMessageHash(to, amount);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    expect(await eGameTrackerContract.verify(to, amount + 1, sig)).to.equal(
      false
    );
  });

  it("Rejects external wallets generating signatures to give amounts to themselves", async function () {
    const hash = await eGameTrackerContract.getMessageHash(to, amount);

    const sig = await addr1.signMessage(ethers.utils.arrayify(hash));

    expect(await eGameTrackerContract.verify(to, amount, sig)).to.equal(false);
  });

  it("Rejects external wallets generating signatures to give amounts to others", async function () {
    const hash = await eGameTrackerContract.getMessageHash(
      addr2.address,
      amount
    );

    const sig = await addr1.signMessage(ethers.utils.arrayify(hash));

    // correct signature and message returns true

    expect(await eGameTrackerContract.verify(to, amount, sig)).to.equal(false);
  });

  it("Logs UserScores", async () => {
    await expect(eGameTrackerContract.gameScores(to, 0)).to.be.reverted;

    await eGameTrackerContract.logGameScore(addr1.address, NEXT_SCORE);

    expect(await eGameTrackerContract.gameScores(to, 0)).to.equal(NEXT_SCORE);
  });

  it("Allows claiming of Prize", async () => {
    await eGameTrackerContract.logGameScore(to, NEXT_SCORE);

    const hash = await eGameTrackerContract.getMessageHash(to, NEXT_SCORE);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    await expect(eGameTrackerContract.claimPrize(to, NEXT_SCORE, sig)).to.not.be
      .reverted;
  });

  it("Prevents claiming of prize by invalid signature", async () => {
    await eGameTrackerContract.logGameScore(to, NEXT_SCORE);

    const hash = await eGameTrackerContract.getMessageHash(to, NEXT_SCORE);

    const sig = await addr1.signMessage(ethers.utils.arrayify(hash));

    await expect(
      eGameTrackerContract.claimPrize(to, NEXT_SCORE, sig)
    ).to.be.revertedWith("Invalid Signature");
  });

  it("Prevents claiming of wrong prize amount", async () => {
    await eGameTrackerContract.logGameScore(to, NEXT_SCORE);

    const hash = await eGameTrackerContract.getMessageHash(to, NEXT_SCORE);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    await expect(
      eGameTrackerContract.claimPrize(to, NEXT_SCORE + 1, sig)
    ).to.be.revertedWith("Invalid Signature");
  });

  it("Prevents claiming of prize amount for value not in first game score", async () => {
    await eGameTrackerContract.logGameScore(to, NEXT_SCORE);

    const wrongScore = NEXT_SCORE + 1;

    const hash = await eGameTrackerContract.getMessageHash(to, wrongScore);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    await expect(
      eGameTrackerContract.claimPrize(to, wrongScore, sig)
    ).to.be.revertedWith("Score does not match");
  });

  it("Prevents claiming when there is no game score logged", async () => {
    const hash = await eGameTrackerContract.getMessageHash(to, NEXT_SCORE);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    await expect(eGameTrackerContract.claimPrize(to, NEXT_SCORE, sig)).to.be
      .reverted;
  });

  it("Prevents claiming when already previously claimed", async () => {
    await eGameTrackerContract.logGameScore(to, NEXT_SCORE);

    const hash = await eGameTrackerContract.getMessageHash(to, NEXT_SCORE);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    await expect(eGameTrackerContract.claimPrize(to, NEXT_SCORE, sig)).to.not.be
      .reverted;

    await expect(
      eGameTrackerContract.claimPrize(to, NEXT_SCORE, sig)
    ).to.be.revertedWith("Already Claimed");
  });

  it("Mints EGame tokens upon claiming", async () => {
    expect(await eGameContract.balanceOf(to)).to.equal(0);

    await eGameTrackerContract.logGameScore(to, NEXT_SCORE);

    const hash = await eGameTrackerContract.getMessageHash(to, NEXT_SCORE);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    await expect(eGameTrackerContract.claimPrize(to, NEXT_SCORE, sig)).to.not.be
      .reverted;

    expect(await eGameContract.balanceOf(to)).to.equal(NEXT_SCORE);
  });
});
