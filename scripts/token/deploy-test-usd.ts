import { ethers } from "hardhat";

import verify from "../verify-contract";

async function deployTestUSD() {
  const TestUSDFactory = await ethers.getContractFactory("TestUSD");

  //================================================================================
  // Deploy Contract
  //================================================================================

  console.log("Deploying...");
  const TestUSDContract = await TestUSDFactory.deploy();

  await TestUSDContract.deployTransaction.wait(5);

  console.log(`Contract deployed to ${TestUSDContract.address}`);

  //================================================================================
  // Verify Contract
  //================================================================================

  await verify(TestUSDContract.address, [], ethers.provider.network.chainId);
}

deployTestUSD()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
