import { ethers } from "hardhat";

async function deployHelloWorld() {
  const HellowWorld3 = await ethers.getContractFactory("HelloWorldThree");

  const hw3 = await HellowWorld3.deploy();

  console.log(`Contract deployed to ${hw3.address}`);
}

deployHelloWorld()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
