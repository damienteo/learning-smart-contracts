import { ethers } from "hardhat";

import convertStringArrayToBytes32 from "../../utils/helpers/convertStringArrayToBytes32";

export const PROPOSALS = ["Do homework", "Don't do homework", "No comment"];

export const nextProposals = convertStringArrayToBytes32(PROPOSALS);

const TOKENS_MINTED = "1";

async function deployTokenisedBallot() {
  // Basic Contract
  const BasicERC20Votes = await ethers.getContractFactory("BasicERC20Votes");
  const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
  const userArray = [owner, addr1, addr2, addr3, addr4];

  const basicERC20VotesToken = await BasicERC20Votes.deploy();
  await basicERC20VotesToken.deployed();
  const tokenVotesAddress = basicERC20VotesToken.address;

  console.log(`Contract deployed to ${basicERC20VotesToken.address}`);

  // Mint for everyone
  await Promise.all(
    userArray.map((user) =>
      basicERC20VotesToken.mint(
        user.address,
        ethers.utils.parseEther(TOKENS_MINTED)
      )
    )
  );

  // delegate for everyone
  await Promise.all(
    userArray.map((user) =>
      basicERC20VotesToken.connect(user).delegate(user.address)
    )
  );

  // dummy transaction to get to next blocknumber on testnet
  // Although minted number does not matter if the token is not delegated
  basicERC20VotesToken.mint(addr1.address, 0);

  const latestBlock = await ethers.provider.getBlock("latest");

  const pastVotes = await Promise.all(
    userArray.map((user) =>
      basicERC20VotesToken.getPastVotes(user.address, latestBlock.number)
    )
  );
  console.log({ pastVotes });

  // Tokenised Ballot
  const TokenisedBallot = await ethers.getContractFactory("TokenisedBallot");

  const tokenisedBallot = await TokenisedBallot.deploy(
    nextProposals,
    tokenVotesAddress,
    latestBlock.number
  );

  console.log(`Contract deployed to ${tokenisedBallot.address}`);

  const votePowers = await Promise.all(
    userArray.map((user) => tokenisedBallot.votePower(user.address))
  );
  console.log({ votePowers });
}

deployTokenisedBallot()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
