import { ethers } from "hardhat";

async function deployBasic721Token() {
  const Basic721Token = await ethers.getContractFactory("Basic721Token");

  const basic721Token = await Basic721Token.deploy();

  console.log(`Contract deployed to ${basic721Token.address}`);
}

deployBasic721Token()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
