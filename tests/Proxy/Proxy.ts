import { expect } from "chai";
import { ethers } from "hardhat";

import {
  Proxy,
  Logic1,
  Logic2,
} from "../../typechain-types/contracts/Proxy/Proxy.sol";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Proxy", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    ProxyContract: Proxy,
    ProxyContractAddress: string,
    proxyAsLogic1: Logic1,
    proxyAsLogic2: Logic2,
    Logic1: Logic1,
    Logic1Address: string,
    Logic2: Logic2,
    Logic2Address: string;

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();

    const ProxyFactory = await ethers.getContractFactory("Proxy");
    ProxyContract = await ProxyFactory.deploy();
    ProxyContractAddress = ProxyContract.address;

    const Logic1Factory = await ethers.getContractFactory("Logic1");
    Logic1 = await Logic1Factory.deploy();
    Logic1Address = Logic1.address;

    const Logic2Factory = await ethers.getContractFactory("Logic2");
    Logic2 = await Logic2Factory.deploy();
    Logic2Address = Logic2.address;

    proxyAsLogic1 = (await ethers.getContractAt(
      "Logic1",
      ProxyContract.address
    )) as Logic1;
    proxyAsLogic2 = (await ethers.getContractAt(
      "Logic2",
      ProxyContract.address
    )) as Logic2;

    // new ethers.utils.Interface(["function changeX() external"]);
  });

  const lookUpUint = async (address: string, slot: string) => {
    return parseInt(await ethers.provider.getStorageAt(address, slot));
  };

  it("should work with logic1", async () => {
    await ProxyContract.changeImplementation(Logic1Address);
    expect(await lookUpUint(ProxyContractAddress, "0x0")).to.equal(0);

    await proxyAsLogic1.changeX(12);
    expect(await lookUpUint(ProxyContractAddress, "0x0")).to.equal(12);
  });

  it("should work with upgrades", async () => {
    await ProxyContract.changeImplementation(Logic1Address);

    await ProxyContract.changeImplementation(Logic2Address);

    await proxyAsLogic2.changeX(22);
    expect(await lookUpUint(ProxyContractAddress, "0x0")).to.equal(22);

    await proxyAsLogic2.tripleX();
    expect(await lookUpUint(ProxyContractAddress, "0x0")).to.equal(22 * 3);
  });
});
