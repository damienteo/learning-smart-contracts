import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { AccessControlToken } from "../../typechain-types/contracts/Token";

const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const MINTER_ROLE = ethers.utils.formatBytes32String("MINTER_ROLE");

describe("AccessControlToken", () => {
  let AccessControlToken,
    accessControlTokenContract: AccessControlToken,
    owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress;

  beforeEach(async () => {
    AccessControlToken = await ethers.getContractFactory("AccessControlToken");
    accessControlTokenContract = await AccessControlToken.deploy();
    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
  });

  describe("deployment", async () => {
    it("should set deployer as default admin role", async () => {
      expect(
        await accessControlTokenContract.hasRole(
          DEFAULT_ADMIN_ROLE,
          owner.address
        )
      ).to.equal(true);
    });

    it("should set default admin role as admin of other roles", async () => {
      expect(
        await accessControlTokenContract.getRoleAdmin(MINTER_ROLE)
      ).to.equal(DEFAULT_ADMIN_ROLE);
    });

    it("should set default role admin as itself", async () => {
      expect(
        await accessControlTokenContract.getRoleAdmin(DEFAULT_ADMIN_ROLE)
      ).to.equal(DEFAULT_ADMIN_ROLE);
    });
  });

  describe("granting role", async () => {
    beforeEach(async () => {
      await accessControlTokenContract.grantRole(MINTER_ROLE, addr1.address);
    });

    it("should have granted role to other address", async () => {
      expect(
        await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
      ).to.equal(true);
    });

    it("should not have granted roles to other addresses if it has not done so", async () => {
      expect(
        await accessControlTokenContract.hasRole(MINTER_ROLE, addr2.address)
      ).to.equal(false);
    });

    it("should not allow non-admin to grant role to other addresses", async () => {
      await expect(
        accessControlTokenContract
          .connect(addr1)
          .grantRole(MINTER_ROLE, addr2.address)
      ).to.be.revertedWith(
        `AccessControl: account ${addr1.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });

    it("should emit RoleGranted event", async () => {
      await expect(
        accessControlTokenContract.grantRole(MINTER_ROLE, addr2.address)
      )
        .to.emit(accessControlTokenContract, "RoleGranted")
        .withArgs(MINTER_ROLE, addr2.address, owner.address);
    });

    it("should allow role to be granted multiple times", async () => {
      await accessControlTokenContract.grantRole(MINTER_ROLE, addr3.address);

      await expect(
        accessControlTokenContract.grantRole(MINTER_ROLE, addr3.address)
      ).to.not.emit(accessControlTokenContract, "RoleGranted");
    });
  });
});
