import { expect } from "chai";
import { ethers } from "hardhat";

import { VerifySignatureV2 } from "../../typechain-types/contracts/Signature";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const amount = 123;

describe("VerifySignatureV2", () => {
  let VerifySignatureV2,
    to: string,
    owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    verifySignatureContract: VerifySignatureV2;

  beforeEach(async () => {
    VerifySignatureV2 = await ethers.getContractFactory("VerifySignatureV2");
    [owner, addr1, addr2] = await ethers.getSigners();
    to = addr1.address;
    verifySignatureContract = await VerifySignatureV2.deploy();
  });

  it("Checks Signature", async function () {
    const hash = await verifySignatureContract.getMessageHash(to, amount);

    console.log({ hash });

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    console.log({ sig });

    const ethHash = await verifySignatureContract.getEthSignedMessageHash(hash);

    console.log({ owner: owner.address });

    const signer = await verifySignatureContract.recoverSigner(ethHash, sig);

    console.log({ recovered: signer });

    // correct signature and message returns true

    expect(await verifySignatureContract.verify(to, amount, sig)).to.equal(
      true
    );
  });

  it("Rejects verification with incorrect amount", async function () {
    const hash = await verifySignatureContract.getMessageHash(to, amount);

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    expect(await verifySignatureContract.verify(to, amount + 1, sig)).to.equal(
      false
    );
  });

  it("Rejects external wallets generating signatures to give amounts to themselves", async function () {
    const hash = await verifySignatureContract.getMessageHash(to, amount);

    const sig = await addr1.signMessage(ethers.utils.arrayify(hash));

    // correct signature and message returns true

    expect(await verifySignatureContract.verify(to, amount, sig)).to.equal(
      false
    );
  });

  it("Rejects external wallets generating signatures to give amounts to others", async function () {
    const hash = await verifySignatureContract.getMessageHash(
      addr2.address,
      amount
    );

    const sig = await addr1.signMessage(ethers.utils.arrayify(hash));

    // correct signature and message returns true

    expect(await verifySignatureContract.verify(to, amount, sig)).to.equal(
      false
    );
  });
});
