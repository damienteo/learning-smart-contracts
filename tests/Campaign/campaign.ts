import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const campaignJson = require("../../artifacts/contracts/Campaign/Campaign.sol/Campaign.json");

describe("CampaignFactory", function () {
  async function deployCampaignFactoryLoadFixture() {
    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const campaignFactoryContract = await CampaignFactory.deploy();

    await campaignFactoryContract.createCampaign(500000000);
    const deployedCampaigns =
      await campaignFactoryContract.getDeployedCampaigns();
    const deployedCampaignAddress =
      deployedCampaigns[deployedCampaigns.length - 1];

    const deployedCampaignInstance = new ethers.Contract(
      deployedCampaignAddress,
      campaignJson.abi,
      owner
    );

    return {
      campaignFactoryContract,
      deployedCampaignInstance,
      owner,
      addr1,
      addr2,
      addr3,
      addr4,
    };
  }

  describe("Campaign Creation", function () {
    it("should update deployedCampaigns", async function () {
      const { campaignFactoryContract, addr2 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );

      expect(
        (await campaignFactoryContract.getDeployedCampaigns()).length
      ).to.equal(1);

      await campaignFactoryContract.connect(addr2).createCampaign("1000");

      expect(
        (await campaignFactoryContract.getDeployedCampaigns()).length
      ).to.equal(2);
    });

    it("should mark caller as manager", async function () {
      const { campaignFactoryContract, owner, addr1 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );

      await campaignFactoryContract.connect(addr1).createCampaign(1000);
      const deployedCampaigns =
        await campaignFactoryContract.getDeployedCampaigns();
      const deployedCampaignAddress =
        deployedCampaigns[deployedCampaigns.length - 1];

      const deployedCampaignInstance = new ethers.Contract(
        deployedCampaignAddress,
        campaignJson.abi,
        owner
      );

      expect(await deployedCampaignInstance.manager()).to.equal(addr1.address);
    });
  });

  describe("Contribution", function () {
    it("allows people to contribute value and marks them as approvers", async function () {
      const { deployedCampaignInstance, addr3 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );

      await deployedCampaignInstance
        .connect(addr3)
        .contribute({ value: ethers.utils.parseEther("0.0000000005") });

      expect(await deployedCampaignInstance.approvers(addr3.address)).to.be
        .true;
    });

    it("rejects the transaction is value is below minimum contribution", async function () {
      const { deployedCampaignInstance, addr3 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );

      await expect(
        deployedCampaignInstance
          .connect(addr3)
          .contribute({ value: ethers.utils.parseEther("0.00000000049") })
      ).to.be.revertedWith("Value is below minimum contribution");
    });
  });

  describe("Requests", function () {
    it("Allows manager to create requests", async function () {
      const { deployedCampaignInstance, addr1 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );
      await deployedCampaignInstance.createRequest(
        "Start new campaign",
        1000,
        addr1.address
      );
    });

    it("Should not allow non-manager to create requests", async function () {
      const { deployedCampaignInstance, addr1, addr4 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );
      await expect(
        deployedCampaignInstance
          .connect(addr4)
          .createRequest("Start new campaign", 12345, addr1.address)
      ).to.be.revertedWith("Only manager allowed");
    });

    it("Should allow approved accounts to approve requests", async function () {
      const { deployedCampaignInstance, addr1 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );

      await deployedCampaignInstance.createRequest(
        "Start new campaign",
        1000,
        addr1.address
      );

      const request = await deployedCampaignInstance.requests(0);

      expect(request.approvalCount).to.equal(0);

      await deployedCampaignInstance
        .connect(addr1)
        .contribute({ value: ethers.utils.parseEther("0.0000000005") });

      await deployedCampaignInstance.connect(addr1).approveRequest(0);

      const nextRequest = await deployedCampaignInstance.requests(0);

      expect(nextRequest.approvalCount).to.equal(1);
    });

    it("Should not allow un-approved accounts to approve requests", async function () {
      const { deployedCampaignInstance, addr1 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );

      await deployedCampaignInstance.createRequest(
        "Start new campaign",
        1000,
        addr1.address
      );

      await expect(
        deployedCampaignInstance.connect(addr1).approveRequest(0)
      ).to.be.revertedWith("User is not a contributor");
    });

    it("Should process requests", async function () {
      const { deployedCampaignInstance, addr1, addr2 } = await loadFixture(
        deployCampaignFactoryLoadFixture
      );

      await deployedCampaignInstance.contribute({
        value: ethers.utils.parseEther("10"),
      });

      await deployedCampaignInstance.createRequest(
        "Start new campaign",
        ethers.utils.parseEther("5"),
        addr1.address
      );

      let request = await deployedCampaignInstance.requests(0);
      expect(request.complete).to.be.equal(false);

      const prevBalance = parseInt(
        ethers.utils.formatEther(await addr1.getBalance())
      );

      await deployedCampaignInstance
        .connect(addr1)
        .contribute({ value: ethers.utils.parseEther("0.0000000005") });

      await deployedCampaignInstance.connect(addr1).approveRequest(0);

      await deployedCampaignInstance
        .connect(addr2)
        .contribute({ value: ethers.utils.parseEther("0.0000000005") });

      await deployedCampaignInstance.connect(addr2).approveRequest(0);

      await deployedCampaignInstance.finalizeRequest(0);

      const nextBalance = parseInt(
        ethers.utils.formatEther(await addr1.getBalance())
      );

      expect(nextBalance).to.be.greaterThan(prevBalance);

      request = await deployedCampaignInstance.requests(0);
      expect(request.complete).to.be.equal(true);
    });
  });

  it("Should fail when requests have insufficient value to send", async function () {
    const { deployedCampaignInstance, addr1 } = await loadFixture(
      deployCampaignFactoryLoadFixture
    );

    await deployedCampaignInstance.createRequest(
      "Start new campaign",
      ethers.utils.parseEther("5"),
      addr1.address
    );

    let request = await deployedCampaignInstance.requests(0);
    expect(request.complete).to.be.equal(false);

    await deployedCampaignInstance
      .connect(addr1)
      .contribute({ value: ethers.utils.parseEther("0.0000000005") });

    await deployedCampaignInstance.connect(addr1).approveRequest(0);

    await expect(
      deployedCampaignInstance.finalizeRequest(0)
    ).to.be.revertedWith("Failed to send Ether");

    request = await deployedCampaignInstance.requests(0);
    expect(request.complete).to.be.equal(false);
  });

  it("Should not process requests with insufficient approval", async function () {
    const { deployedCampaignInstance, addr1 } = await loadFixture(
      deployCampaignFactoryLoadFixture
    );

    await deployedCampaignInstance.contribute({
      value: ethers.utils.parseEther("10"),
    });

    await deployedCampaignInstance.createRequest(
      "Start new campaign",
      ethers.utils.parseEther("5"),
      addr1.address
    );

    await expect(
      deployedCampaignInstance.finalizeRequest(0)
    ).to.be.revertedWith("Not enough approvals");
  });

  it("Should not process requests which are already finalized", async function () {
    const { deployedCampaignInstance, addr1 } = await loadFixture(
      deployCampaignFactoryLoadFixture
    );

    await deployedCampaignInstance.createRequest(
      "Start new campaign",
      1000000,
      addr1.address
    );

    await deployedCampaignInstance
      .connect(addr1)
      .contribute({ value: ethers.utils.parseEther("0.000000001") });

    await deployedCampaignInstance.connect(addr1).approveRequest(0);

    await deployedCampaignInstance.finalizeRequest(0);

    await expect(
      deployedCampaignInstance.finalizeRequest(0)
    ).to.be.revertedWith("Request is already finalized");
  });
});
