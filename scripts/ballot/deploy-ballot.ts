import { ethers } from "hardhat";

import convertStringArrayToBytes32 from "../../utils/helpers/convertStringArrayToBytes32";

// NOTE: Verification
// hh verify --network goerli --constructor-args scripts/ballot/arguments.ts 0xD6fe23805b131a37129Aa42896B71a53Fe5B3d3e
// https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan#complex-arguments

export const PROPOSALS = ["Do homework", "Don't do homework", "No comment"];

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

// const eventFilter = ballotContract.filters.NewVoter();
// provider.on(eventFilter, (log) => {
//   console.log("New voter");
//   console.log({ log });
// });
// const eventFilter2 = ballotContract.filters.Voted();
// provider.on(eventFilter2, (log) => {
//   console.log("New vote cast");
//   console.log({ log });
// });
// const eventFilter3 = ballotContract.filters.Delegated();
// provider.on(eventFilter3, (log) => {
//   console.log("New vote delegation");
//   console.log({ log });
// });
