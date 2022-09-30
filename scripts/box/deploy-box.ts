import { ethers } from "hardhat";

async function deployBox() {
  const Box = await ethers.getContractFactory("Box");

  const box = await Box.deploy();

  console.log(`Contract deployed to ${box.address}`);
}

deployBox()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
