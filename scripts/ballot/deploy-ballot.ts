import { ethers } from "hardhat";

// NOTE: Verification
// hh verify --network goerli --constructor-args scripts/ballot/arguments.ts 0xD6fe23805b131a37129Aa42896B71a53Fe5B3d3e
// https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan#complex-arguments

export const PROPOSALS = ["Do homework", "Don't do homework", "No comment"];

const convertStringArrayToBytes32 = (array: string[]) =>
  array.map((element) => ethers.utils.formatBytes32String(element));

export const nextProposals = convertStringArrayToBytes32(PROPOSALS);

async function deployGreeters() {
  const Ballot = await ethers.getContractFactory("Ballot");

  const ballot = await Ballot.deploy(nextProposals);

  console.log(`Ballot Contract deployed to ${ballot.address}`);
}

deployGreeters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
