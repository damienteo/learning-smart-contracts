import { ethers } from "hardhat";

async function deployTxOrigin() {
  const txOriginVictimContract = await ethers.getContractFactory(
    "TxOriginVictim"
  );

  const txOriginVictim = await txOriginVictimContract.deploy();

  console.log(`txOriginVictim Contract deployed to ${txOriginVictim.address}`);

  const txOriginAttackContract = await ethers.getContractFactory(
    "TxOriginAttack"
  );

  const txOriginAttack = await txOriginAttackContract.deploy();

  console.log(`txOriginAttack Contract deployed to ${txOriginAttack.address}`);
}

deployTxOrigin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
