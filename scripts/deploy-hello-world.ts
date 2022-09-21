const { ethers } = require("hardhat");

async function deployHelloWorld() {
  const HellowWorld = await ethers.getContractFactory("HelloWorld");

  const hw = await HellowWorld.deploy("Hello World!");

  console.log(`Contract deployed to ${hw.address}`);
}

deployHelloWorld()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
