import { expect } from "chai";
import { ethers } from "hardhat";
import { contracts } from "../../typechain-types";

describe("VerifySignature", () => {
  it("Checks Signature", async function () {
    const VerifySignature = await ethers.getContractFactory("VerifySignature");
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const verifySignatureContract = await VerifySignature.deploy();

    const to = addr1.address;
    const amount = 123;
    const message = "Secret Message";
    const nonce = 123;

    const hash = await verifySignatureContract.getMessageHash(
      to,
      amount,
      message,
      nonce
    );

    const sig = await owner.signMessage(ethers.utils.arrayify(hash));

    const ethHash = await verifySignatureContract.getEthSignedMessageHash(hash);

    console.log({ owner: owner.address });

    const signer = await verifySignatureContract.recoverSigner(ethHash, sig);

    console.log({ recovered: signer });

    // correct signature and message returns true

    expect(
      await verifySignatureContract.verify(
        owner.address,
        to,
        amount,
        message,
        nonce,
        sig
      )
    ).to.equal(true);

    expect(
      await verifySignatureContract.verify(
        owner.address,
        to,
        amount + 1,
        message,
        nonce,
        sig
      )
    ).to.equal(false);
  });
});
