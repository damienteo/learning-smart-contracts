import { ethers } from "hardhat";
import verify from "../verify-contract";

async function deployDynamicNFT() {
  const DynamicNFTFactory = await ethers.getContractFactory("DynamicNFT");

  const DynamicNFT = await DynamicNFTFactory.deploy(1000);
  // console.log("waiting");

  // setTimeout(() => {
  //   return;
  // }, 20000);

  // await DynamicNFT.deployTransaction.wait(1);

  console.log(`Contract deployed to ${DynamicNFT.address}`);

  await verify(DynamicNFT.address, [], ethers.provider.network.chainId);
}

deployDynamicNFT()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
