import { ethers } from "hardhat";

async function deployHelloWorld() {
  const HellowWorld4 = await ethers.getContractFactory("HelloWorldFour");

  const hw4 = await HellowWorld4.deploy();

  console.log(`Contract deployed to ${hw4.address}`);
}

deployHelloWorld()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
