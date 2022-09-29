import { ethers } from "hardhat";

async function main() {
  const nftContractFactory = await ethers.getContractFactory("NFT");
  const nftContract = await nftContractFactory.deploy();
  await nftContract.deployed();
  console.log("Contract deployed to:", nftContract.address);

  let txn = await nftContract.makeNFT();
  await txn.wait();

  txn = await nftContract.makeNFT();
  await txn.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
