import { ethers, upgrades } from "hardhat";

async function deployBox() {
  const BoxV2 = await ethers.getContractFactory("Box3");

  await upgrades.upgradeProxy(
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    BoxV2
  );

  console.log(`Upgrade Success`);
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
// await box.increment();
// (await box.retrieve()).toString();
