import { ethers } from "hardhat";

async function deployGreeters() {
  const HellowWorld5 = await ethers.getContractFactory("HelloWorldFive");

  const hw5 = await HellowWorld5.deploy();

  console.log(`HelloWorldFive Contract deployed to ${hw5.address}`);

  const GreetingReader = await ethers.getContractFactory("GreetingReader");

  const greetingReader = await GreetingReader.deploy();

  console.log(`GreetingReader Contract deployed to ${greetingReader.address}`);

  const NotHelloWorld = await ethers.getContractFactory("NotHelloWorld");

  const notHelloWorld = await NotHelloWorld.deploy();

  console.log(`NotHelloWorld Contract deployed to ${notHelloWorld.address}`);
}

deployGreeters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
