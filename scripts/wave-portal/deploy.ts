import { ethers } from "hardhat";

// Deployed to: https://goerli.etherscan.io/address/0x2A12fed349920E842db487e50754ABB8099b107f

async function main() {
  // const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  // const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
  // const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

  // const lockedAmount = ethers.utils.parseEther("1");

  // const Lock = await ethers.getContractFactory("Lock");
  // const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  // await lock.deployed();

  // console.log(`Lock with 1 ETH and unlock timestamp ${unlockTime} deployed to ${lock.address}`);

  const [deployer] = await hre.ethers.getSigners();
  const accountBalance = await deployer.getBalance();

  console.log(`Deployed by: ${deployer.address}`);
  console.log(`Account Balance: ${accountBalance}`);

  const waveContractFactory = await hre.ethers.getContractFactory("WavePortal");
  const waveContract = await waveContractFactory.deploy({
    value: hre.ethers.utils.parseEther("0.001"),
  });
  await waveContract.deployed();

  console.log(`Contract deployed to: ${waveContract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
