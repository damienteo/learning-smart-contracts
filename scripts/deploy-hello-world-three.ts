import { ethers } from "hardhat";

async function deployHelloWorld() {
  const HellowWorld2 = await ethers.getContractFactory("HelloWorldThree");

  const hw2 = await HellowWorld2.deploy();

  console.log(`Contract deployed to ${hw2.address}`);
}

deployHelloWorld()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
