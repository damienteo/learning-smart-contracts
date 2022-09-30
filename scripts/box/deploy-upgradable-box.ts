import { ethers, upgrades } from "hardhat";

async function deployBox() {
  const Box = await ethers.getContractFactory("Box3");

  const box = await upgrades.deployProxy(Box, [42], { initializer: "store" });

  await box.deployed();

  console.log(`Contract deployed to ${box.address}`);
}

deployBox()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
// hh console --network localhost
// const Box = await ethers.getContractFactory('Box3');
// const box = await Box.attach('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
// (await box.retrieve()).toString();
