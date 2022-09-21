const hre = require("hardhat");

const main = async () => {
  const [owner, randomPerson] = await hre.ethers.getSigners();
  const waveContractFactory = await hre.ethers.getContractFactory("WavePortal");
  const waveContract = await waveContractFactory.deploy({
    value: hre.ethers.utils.parseEther("0.1"),
  });
  await waveContract.deployed();

  console.log(`Contract deployed to: ${waveContract.address}`);
  console.log(`Contract deployed by: ${owner.address}`);

  let contractBalance = await hre.ethers.provider.getBalance(
    waveContract.address
  );
  console.log(
    "Contract Balance: ",
    hre.ethers.utils.formatEther(contractBalance)
  );

  let waveCount: number;
  waveCount = await waveContract.getTotalWaves();

  let waveTxn = await waveContract.wave("Message Number 1");
  await waveTxn.wait();

  let waveTxn2 = await waveContract.wave("Message Number 1");
  await waveTxn2.wait();

  waveTxn = await waveContract
    .connect(randomPerson)
    .wave("Message from a stranger");
  await waveTxn.wait();

  waveCount = await waveContract.getTotalWaves();

  const waves = await waveContract.getAllWaves();

  contractBalance = await hre.ethers.provider.getBalance(waveContract.address);
  console.log(
    "Contract Balance: ",
    hre.ethers.utils.formatEther(contractBalance)
  );
  console.log({ waves });
};

const runMain = async () => {
  try {
    await main();
    process.exit(0); // exit Node process without error
  } catch (error) {
    console.log(error);
    process.exit(1); // exit Node process while indicating 'Uncaught Fatal Exception'
  }
};

runMain();
