import { ethers } from "hardhat";

const TOKENS_MINTED = "1";

async function deployBasicERC20Votes() {
  const BasicERC20Votes = await ethers.getContractFactory("BasicERC20Votes");
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();

  const basicERC20VotesToken = await BasicERC20Votes.deploy();
  await basicERC20VotesToken.deployed();

  console.log(`Contract deployed to ${basicERC20VotesToken.address}`);

  const totalSupply = await basicERC20VotesToken.totalSupply();
  console.log(
    `The initial total supply of contract after deployment is ${totalSupply}`
  );

  console.log("Minting new tokens for account 1");
  const mintTx = await basicERC20VotesToken.mint(
    addr1.address,
    ethers.utils.parseEther(TOKENS_MINTED)
  );
  await mintTx.wait();

  const nextSupply = await basicERC20VotesToken.totalSupply();
  console.log(
    `The initial total supply of contract after minting is ${nextSupply} in wei`
  );
  console.log(
    `The initial total supply of contract after minting is ${ethers.utils.formatEther(
      nextSupply
    )} in ETH`
  );

  console.log("What is the current balance of account 1?");
  const balance = await basicERC20VotesToken.balanceOf(addr1.address);
  console.log(`Balance: ${ethers.utils.formatEther(balance)} in ETH`);

  console.log("What is the current vote power of account 1?");
  const votingPower = await basicERC20VotesToken.getVotes(addr1.address);
  console.log(`Voting Power: ${votingPower}`);

  console.log("Delegating from Account 1 to Account 1...");
  const delegateTx = await basicERC20VotesToken
    .connect(addr1)
    .delegate(addr1.address);
  await delegateTx.wait();

  console.log("What is the next vote power of Account 1?");
  const nextVotingPower = await basicERC20VotesToken.getVotes(addr1.address);
  console.log(
    `Next Voting Power: ${ethers.utils.formatEther(nextVotingPower)} in ETH`
  );

  const block = await ethers.provider.getBlock("latest");
  console.log({ block });
  console.log(`The current blockNumber is ${block.number}`);

  const mintTx2 = await basicERC20VotesToken.mint(
    addr2.address,
    ethers.utils.parseEther(TOKENS_MINTED)
  );
  await mintTx2.wait();

  const mintTx3 = await basicERC20VotesToken.mint(
    addr3.address,
    ethers.utils.parseEther(TOKENS_MINTED)
  );
  await mintTx3.wait();

  const nextBlock = await ethers.provider.getBlock("latest");
  console.log({ nextBlock });
  console.log(`The current blockNumber is ${nextBlock.number}`);

  const pastVotes = await Promise.all([
    basicERC20VotesToken.getPastVotes(addr1.address, 4),
    basicERC20VotesToken.getPastVotes(addr1.address, 3),
    basicERC20VotesToken.getPastVotes(addr1.address, 2),
    basicERC20VotesToken.getPastVotes(addr1.address, 1),
    basicERC20VotesToken.getPastVotes(addr1.address, 0),
  ]);
  console.log({ pastVotes });
}

deployBasicERC20Votes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
