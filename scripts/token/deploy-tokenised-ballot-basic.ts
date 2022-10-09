import { ethers } from "hardhat";

import convertStringArrayToBytes32 from "../../utils/helpers/convertStringArrayToBytes32";

export const PROPOSALS = ["Do homework", "Don't do homework", "No comment"];

export const nextProposals = convertStringArrayToBytes32(PROPOSALS);

export const TOKENS_ADDRESS = "0xdefE3Eb7407f22c6be1bd668C79f5a5874b79D27";
export const REFERENCE_BLOCK = "7736797";

const testAddresses = [
  "0xd6e9b48D59D780F28a6BEEbe8098f3b095c003d7",
  "0xdE3fb8d56CB213dEf9212723fF017C6c3538598a",
  "0x17E1EbC1d6BCFDa760Af68e1eE7ab0dD7f577cF4",
  "0xeffA5ea57556Fa4d26f229201F11bF19204217dD",
  "0x3027952928cfE46b8d46BaF094Bf9dfD2E3f127a",
  "0xAe18A61043c34bD938Ce4927d0AF7c67016a6DAf",
];

async function deployTokenisedBallot() {
  const TokenisedBallot = await ethers.getContractFactory("TokenisedBallot");

  const tokenisedBallot = await TokenisedBallot.deploy(
    nextProposals,
    TOKENS_ADDRESS,
    REFERENCE_BLOCK
  );

  console.log(`Contract deployed to ${tokenisedBallot.address}`);

  const votePowers = await Promise.all(
    testAddresses.map((address) => tokenisedBallot.votePower(address))
  );
  console.log({ votePowers });
}

deployTokenisedBallot()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
