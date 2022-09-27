import { expect } from "chai";
import { ethers } from "hardhat";

import { HelloWorldFour } from "../typechain-types/HelloWorld/HelloWorldFour.sol/HelloWorldFour";

const initialMsg = "Testing Hello World For the First Time ";
const onlyOwnerError = "Caller is not owner";
const newText = "New hello world text";

describe("HelloWorld", function () {
  let helloWorldContract: HelloWorldFour;

  this.beforeEach(async function () {
    const helloWorldFactory = await ethers.getContractFactory("HelloWorldFour");
    helloWorldContract = await helloWorldFactory.deploy();
    await helloWorldContract.deployed();
  });

  it(`Should return "${initialMsg}"`, async function () {
    expect(await helloWorldContract.helloWorld()).to.equal(initialMsg);
  });

  it("Should set owner to deployer account", async function () {
    const accounts = await ethers.getSigners();
    expect(await helloWorldContract.owner()).to.equal(accounts[0].address);
  });

  it("Should change text correctly", async function () {
    await helloWorldContract.setText(newText);
    expect(await helloWorldContract.helloWorld()).to.equal(newText);
  });

  it("Should restore text after changing text", async function () {
    await helloWorldContract.setText(newText);
    await helloWorldContract.restore();
    expect(await helloWorldContract.helloWorld()).to.equal(initialMsg);
  });

  it("Should not allow anyone other than owner to call transferOwnership", async function () {
    const accounts = await ethers.getSigners();
    await expect(
      helloWorldContract
        .connect(accounts[1])
        .transferOwnership(accounts[1].address)
    ).to.be.revertedWith(onlyOwnerError);
  });

  it("Should not allow anyone other than owner to change text", async function () {
    const accounts = await ethers.getSigners();
    await expect(
      helloWorldContract.connect(accounts[1]).setText(newText)
    ).to.be.revertedWith(onlyOwnerError);
  });

  it("Should not allow anyone other than owner to restore text", async function () {
    const accounts = await ethers.getSigners();
    await expect(
      helloWorldContract.connect(accounts[1]).restore()
    ).to.be.revertedWith(onlyOwnerError);
  });

  it("Should allow owner to transfer ownership", async function () {
    const accounts = await ethers.getSigners();
    await helloWorldContract.transferOwnership(accounts[1].address);
    expect(await helloWorldContract.owner()).to.equal(accounts[1].address);
  });

  it("Should allow new owner to set text", async function () {
    const accounts = await ethers.getSigners();
    const nextOwner = accounts[1];
    const nextOwnerAddress = nextOwner.address;

    await helloWorldContract.transferOwnership(nextOwnerAddress);

    await helloWorldContract.connect(nextOwner).setText(newText);

    expect(await helloWorldContract.helloWorld()).to.equal(newText);
  });

  it("Should allow new owner to restore after setting text", async function () {
    const accounts = await ethers.getSigners();
    const nextOwner = accounts[1];
    const nextOwnerAddress = nextOwner.address;

    await helloWorldContract.transferOwnership(nextOwnerAddress);

    await helloWorldContract.connect(nextOwner).setText(newText);

    expect(await helloWorldContract.helloWorld()).to.equal(newText);

    await helloWorldContract.connect(nextOwner).restore();

    expect(await helloWorldContract.helloWorld()).to.equal(initialMsg);
  });

  it("Should allow new owner to transfer ownership after receiving ownership", async function () {
    const accounts = await ethers.getSigners();
    const nextOwner = accounts[1];
    const nextOwnerAddress = nextOwner.address;
    const subsequentOwnerAddress = accounts[2].address;

    await helloWorldContract.transferOwnership(nextOwnerAddress);
    expect(await helloWorldContract.owner()).to.equal(nextOwnerAddress);

    await helloWorldContract
      .connect(nextOwner)
      .transferOwnership(subsequentOwnerAddress);
    expect(await helloWorldContract.owner()).to.equal(subsequentOwnerAddress);
  });
});
