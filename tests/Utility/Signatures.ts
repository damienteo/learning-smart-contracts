import { expect } from "chai";
import { ethers } from "hardhat";
import { SigningKey } from "@ethersproject/signing-key";

import { config } from "hardhat";

import { Signatures } from "../../typechain-types/contracts/Utility/Signatures";
import { MockERC1271 } from "../../typechain-types/contracts/Utility/MockERC1271.sol";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const email = "test@email.com";

describe("Signatures", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress,
    addr5: SignerWithAddress,
    SignaturesContract: Signatures,
    MockERC1271Contract: MockERC1271,
    signerAddress: string,
    signerPrivateKey: string,
    signingKey: SigningKey,
    mockERC1271Signature: string;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

    const addr2Wallet = ethers.Wallet.fromMnemonic(
      "test test test test test test test test test test test junk",
      "m/44'/60'/0'/0" + `/2`
    );

    signerAddress = addr2.address;
    signerPrivateKey = addr2Wallet.privateKey;
    signingKey = new ethers.utils.SigningKey(signerPrivateKey);

    const SignaturesFactory = await ethers.getContractFactory("Signatures");
    SignaturesContract = await SignaturesFactory.deploy();

    const MockERC1271Factory = await ethers.getContractFactory("MockERC1271");
    MockERC1271Contract = await MockERC1271Factory.deploy(signerAddress);
  });

  describe("Verification of Signature", async () => {
    let hash, signature: any;

    beforeEach(async () => {
      hash = await SignaturesContract.getMessageHash(email, signerAddress);

      signature = await addr2.signMessage(ethers.utils.arrayify(hash));
    });

    describe("verifies signatures for EOA Accounts", async () => {
      it("verifies the signature", async () => {
        expect(
          await SignaturesContract.verify(email, signerAddress, signature)
        ).to.equal(true);
      });

      it("returns false if another user address is given", async () => {
        expect(
          await SignaturesContract.verify(email, addr3.address, signature)
        ).to.equal(false);
      });

      it("returns false if another email address is given", async () => {
        expect(
          await SignaturesContract.verify(
            "test2@email.com",
            addr3.address,
            signature
          )
        ).to.equal(false);
      });

      it("returns false if signer is incompatible with address in message hash", async () => {
        const nextHash = await SignaturesContract.getMessageHash(
          email,
          signerAddress
        );

        const nextSignature = await addr1.signMessage(
          ethers.utils.arrayify(nextHash)
        );

        expect(
          await SignaturesContract.verify(email, signerAddress, nextSignature)
        ).to.equal(false);
      });
    });
  });

  describe("MockERC1271 Account", async () => {
    let hash: any;

    beforeEach(async () => {
      hash = await SignaturesContract.getMessageHash(email, signerAddress);

      mockERC1271Signature = ethers.utils.joinSignature(
        signingKey.signDigest(hash)
      );
    });

    it("has the owner address", async () => {
      const owner = await MockERC1271Contract.owner();
      expect(owner).to.equal(signerAddress);
    });

    it("returns magic value for valid signature", async () => {
      const value = await MockERC1271Contract.isValidSignature(
        hash,
        mockERC1271Signature
      );
      expect(value).to.equal("0x1626ba7e");
    });

    it("returns invalid value for signature by another wallet", async () => {
      const nextSignature = await addr1.signMessage(
        ethers.utils.arrayify(hash)
      );
      const value = await MockERC1271Contract.isValidSignature(
        hash,
        nextSignature
      );
      expect(value).to.equal("0xffffffff");
    });

    it("returns magic value for signature by EOA wallet", async () => {
      const nextSignature = await addr2.signMessage(
        ethers.utils.arrayify(hash)
      );
      const value = await MockERC1271Contract.isValidSignature(
        hash,
        nextSignature
      );
      expect(value).to.equal("0xffffffff");
    });
  });

  describe("verification of signature via ERC1271", async () => {
    let hash: any;

    beforeEach(async () => {
      hash = await SignaturesContract.getMessageHash(email, signerAddress);

      mockERC1271Signature = ethers.utils.joinSignature(
        signingKey.signDigest(hash)
      );
    });

    it("returns true for valid signature", async () => {
      const value = await SignaturesContract.isValidSignature(
        email,
        signerAddress,
        mockERC1271Signature
      );
      expect(value).to.equal(true);
    });

    it("returns false if wrong address given", async () => {
      const value = await SignaturesContract.isValidSignature(
        email,
        addr1.address,
        mockERC1271Signature
      );
      expect(value).to.equal(false);
    });

    it("returns false if wrong email given", async () => {
      const value = await SignaturesContract.isValidSignature(
        "test2@email.com",
        signerAddress,
        mockERC1271Signature
      );
      expect(value).to.equal(false);
    });

    it("returns false if wrong signature given", async () => {
      const nextHash = await SignaturesContract.getMessageHash(
        email,
        addr1.address
      );

      const nextSignature = ethers.utils.joinSignature(
        signingKey.signDigest(nextHash)
      );

      const value = await SignaturesContract.isValidSignature(
        email,
        signerAddress,
        nextSignature
      );
      expect(value).to.equal(false);
    });
  });
});
