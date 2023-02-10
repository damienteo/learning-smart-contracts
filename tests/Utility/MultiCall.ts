import { expect } from "chai";
import { ethers } from "hardhat";

import {
  MultiCall,
  TestMultiCall,
} from "../../typechain-types/contracts/Utility//MultiCall.sol";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const testContractJson = require("../../artifacts/contracts/Utility/MultiCall.sol/TestMultiCall");

describe("MultiCall", () => {
  let owner: SignerWithAddress,
    MultiCallContract: MultiCall,
    TestMultiCall: TestMultiCall,
    TestMultiCallAddress: string;

  const txIndex = 0;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    const MultiCallFactory = await ethers.getContractFactory("MultiCall");
    MultiCallContract = await MultiCallFactory.deploy();

    const TestMultiCallFactory = await ethers.getContractFactory(
      "TestMultiCall"
    );
    TestMultiCall = await TestMultiCallFactory.deploy();

    TestMultiCallAddress = TestMultiCall.address;
  });

  it("gets the correct data in an array", async () => {
    const values = Array.from(Array(10).keys());
    const addresses = values.map(() => TestMultiCallAddress);
    const requests = await Promise.all(
      values.map((value) => TestMultiCall.getData(value))
    );

    const results = await MultiCallContract.multiCall(addresses, requests);
    const nextResults = results.map((result) => Number(result));

    expect(JSON.stringify(values)).to.equal(JSON.stringify(nextResults));
  });
});
