import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { AccessControlToken } from "../../typechain-types/contracts/Token";

const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const MINTER_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("MINTER_ROLE")
);
const ASST_ADMIN_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("ASST_ADMIN_ROLE")
);

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

  describe("revoking", () => {
    it("cannot revoke roles that were not granted", async () => {
      expect(
        await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
      ).to.equal(false);

      await expect(
        accessControlTokenContract.grantRole(MINTER_ROLE, addr1.address)
      ).to.not.emit(accessControlTokenContract, "RoleRevoked");
    });

    context("with granted role", async () => {
      beforeEach(async () => {
        await accessControlTokenContract.grantRole(MINTER_ROLE, addr1.address);
      });

      it("allows admin to revoke the role", async () => {
        await expect(
          accessControlTokenContract.revokeRole(MINTER_ROLE, addr1.address)
        )
          .to.emit(accessControlTokenContract, "RoleRevoked")
          .withArgs(MINTER_ROLE, addr1.address, owner.address);

        expect(
          await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
        ).to.equal(false);
      });

      it("does not allow non-admin to revoke the role", async () => {
        await expect(
          accessControlTokenContract
            .connect(addr2)
            .revokeRole(MINTER_ROLE, addr1.address)
        ).to.be.revertedWith(
          `AccessControl: account ${addr2.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
        );

        expect(
          await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
        ).to.equal(true);
      });

      it("allows admin to revoke the role multiple times", async () => {
        await expect(
          accessControlTokenContract.revokeRole(MINTER_ROLE, addr1.address)
        )
          .to.emit(accessControlTokenContract, "RoleRevoked")
          .withArgs(MINTER_ROLE, addr1.address, owner.address);

        await expect(
          accessControlTokenContract.revokeRole(MINTER_ROLE, addr1.address)
        ).not.to.emit(accessControlTokenContract, "RoleRevoked");
      });
    });
  });

  describe("renouncing", async () => {
    it("does not allow wallets without roles to renounce", async () => {
      expect(
        await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
      ).to.equal(false);

      await expect(
        accessControlTokenContract
          .connect(addr1)
          .renounceRole(MINTER_ROLE, addr1.address)
      ).to.not.emit(accessControlTokenContract, "RoleRevoked");
    });

    context("with granted role", async () => {
      beforeEach(async () => {
        await accessControlTokenContract.grantRole(MINTER_ROLE, addr1.address);
      });

      it("allows the bearer to renounce role", async () => {
        expect(
          await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
        ).to.equal(true);

        await expect(
          accessControlTokenContract
            .connect(addr1)
            .renounceRole(MINTER_ROLE, addr1.address)
        )
          .to.emit(accessControlTokenContract, "RoleRevoked")
          .withArgs(MINTER_ROLE, addr1.address, addr1.address);

        expect(
          await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
        ).to.equal(false);
      });

      it("only allows bearers to renounce roles", async () => {
        await expect(
          accessControlTokenContract.renounceRole(MINTER_ROLE, addr1.address)
        ).to.be.revertedWith("AccessControl: can only renounce roles for self");
      });

      it("allows roles to be renounced multiple times", async () => {
        await accessControlTokenContract
          .connect(addr1)
          .renounceRole(MINTER_ROLE, addr1.address);

        await expect(
          accessControlTokenContract
            .connect(addr1)
            .renounceRole(MINTER_ROLE, addr1.address)
        ).to.not.emit(accessControlTokenContract, "RoleRevoked");
      });
    });
  });

  describe("setting role admin", () => {
    beforeEach(async () => {
      await expect(
        accessControlTokenContract.setRoleAdmin(MINTER_ROLE, ASST_ADMIN_ROLE)
      )
        .to.emit(accessControlTokenContract, "RoleAdminChanged")
        .withArgs(MINTER_ROLE, DEFAULT_ADMIN_ROLE, ASST_ADMIN_ROLE);

      await accessControlTokenContract.grantRole(
        ASST_ADMIN_ROLE,
        addr1.address
      );
    });

    it("can change the admin role", async () => {
      expect(
        await accessControlTokenContract.getRoleAdmin(MINTER_ROLE)
      ).to.equal(ASST_ADMIN_ROLE);
    });

    it("allows new admin to grant role", async () => {
      await expect(
        accessControlTokenContract
          .connect(addr1)
          .grantRole(MINTER_ROLE, addr2.address)
      )
        .to.emit(accessControlTokenContract, "RoleGranted")
        .withArgs(MINTER_ROLE, addr2.address, addr1.address);

      expect(
        await accessControlTokenContract.hasRole(MINTER_ROLE, addr2.address)
      ).to.equal(true);
    });

    it("allows new admin to revoke roles", async () => {
      await accessControlTokenContract
        .connect(addr1)
        .grantRole(MINTER_ROLE, addr2.address);

      await expect(
        accessControlTokenContract
          .connect(addr1)
          .revokeRole(MINTER_ROLE, addr2.address)
      )
        .to.emit(accessControlTokenContract, "RoleRevoked")
        .withArgs(MINTER_ROLE, addr2.address, addr1.address);
    });

    it("does not allow previous admin to grant role", async () => {
      await expect(
        accessControlTokenContract.grantRole(MINTER_ROLE, addr2.address)
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${ASST_ADMIN_ROLE}`
      );
    });

    it("does not allow previous admin to revoke role", async () => {
      await expect(
        accessControlTokenContract.revokeRole(MINTER_ROLE, addr2.address)
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${ASST_ADMIN_ROLE}`
      );
    });
  });

  describe("onlyRole modifier", async () => {
    beforeEach(async () => {
      await accessControlTokenContract.grantRole(MINTER_ROLE, addr1.address);
    });

    it("does not revert if address has role", async () => {
      expect(
        await accessControlTokenContract.hasRole(MINTER_ROLE, addr1.address)
      ).to.equal(true);

      await expect(
        accessControlTokenContract.connect(addr1).mint(addr2.address, 100)
      ).to.not.be.reverted;
    });

    it("does not allow addresses without roles to call the modified method", async () => {
      await expect(
        accessControlTokenContract.connect(addr2).mint(addr2.address, 100)
      ).to.be.revertedWith(
        `AccessControl: account ${addr2.address.toLowerCase()} is missing role ${MINTER_ROLE}`
      );
    });
  });
});
